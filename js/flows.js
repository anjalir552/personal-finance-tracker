/* Shared workflows, opened from several pages:
   - Smart Financial Recovery: detect → explain → review → options → revised budget → goal impact → approve or reject
   - Emergency Expense Manager: record an unexpected expense and see its effect before saving it
   - Adaptive Budgeting: compare the current plan with one that matches how money is really spent
   - Budget editor: change the monthly allocation directly
   Nothing here changes the plan until the user approves; every figure comes from SW.store. */
(function () {
  const F = SW.fmt, S = SW.store, ui = SW.ui, I = SW.icon;
  const SEED = SW.seed;
  const short = n => n.split(' · ')[0].replace(/\s*\(.*\)$/, '');
  const monthYear = k => (k ? `${S.monthName(k)} ${k.slice(0, 4)}` : 'No date');
  const delayText = r => {
    if (r.delay === 0) return '<span class="rc-delay same">No change</span>';
    if (r.delay == null || r.delay === Infinity) return '<span class="rc-delay late">No finish date</span>';
    if (r.delay < 0) return `<span class="rc-delay early">${-r.delay} month${r.delay === -1 ? '' : 's'} sooner</span>`;
    return `<span class="rc-delay late">${r.delay} month${r.delay === 1 ? '' : 's'} later</span>`;
  };

  /** Goal impact table, shared by recovery, adaptive budgeting and purchase decisions */
  function goalTable(rows, { caption = 'Effect on your savings goals', showTransfer = true, showSaved = false } = {}) {
    if (!rows.length) return '';
    return `<div class="table-wrap"><table class="table rc-goals">
      <caption class="sr-only">${caption}</caption>
      <thead><tr><th scope="col">Goal</th>${showTransfer ? '<th scope="col" class="r">This month’s transfer</th>' : ''}${showSaved ? '<th scope="col" class="r">Saved</th>' : ''}<th scope="col" class="r">Reaches target</th><th scope="col" class="r">Change</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <th scope="row" class="cell-title">${F.esc(r.g.name)}<span class="cell-sub">${F.inr(r.saved)} of ${F.inr(r.target)} · deadline ${F.date(r.deadline, true)}</span></th>
        ${showTransfer ? `<td class="r num">${r.monthlyAfter !== r.monthly ? `<s class="subtle">${F.inr(Math.max(0, r.monthly - S.goalTransferredThisMonth(r.g)))}</s> ${F.inr(Math.max(0, r.monthlyAfter - S.goalTransferredThisMonth(r.g)))}` : F.inr(Math.max(0, r.monthly - S.goalTransferredThisMonth(r.g)))}</td>` : ''}
        ${showSaved ? `<td class="r num">${r.savedAfter !== r.saved ? `<s class="subtle">${F.inr(r.saved)}</s> ${F.inr(r.savedAfter)}` : F.inr(r.saved)}</td>` : ''}
        <td class="r num">${r.after !== r.before ? `<s class="subtle">${monthYear(r.before)}</s> <b class="${r.lateAfter ? 'warn' : ''}">${monthYear(r.after)}</b>` : monthYear(r.before)}${r.lateAfter && !r.lateBefore ? '<span class="cell-sub warn">After the deadline</span>' : ''}</td>
        <td class="r">${delayText(r)}</td></tr>`).join('')}</tbody></table></div>`;
  }


  /* ==========================================================================
     Smart Financial Recovery
     ========================================================================== */
  const LEVER = {
    buffer: { t: 'Use the monthly buffer', d: m => `${F.inr(m.buffer)} left of your ${F.inr(m.bufferPlan)} buffer.`, trade: 'Leaves less for anything else unexpected this month. It resets on payday.' },
    trim: { t: 'Spend less on flexible categories for the rest of the month', d: () => 'Up to half of what’s left in food, shopping and plans.', trade: 'No effect on goals or commitments. The rest of the month is leaner, not empty.' },
    savings: { t: 'Move less into savings this month', d: () => 'From transfers still due on the 25th, lowest-priority goal first.', trade: 'The goals affected finish later, as shown below.' },
    fund: { t: 'Use money from your emergency fund', d: (m, L) => `${F.inr(L.levers.fund.saved)} saved there.`, trade: 'Spending stays as planned, but the fund is rebuilt over the next few months from flexible spending.' }
  };

  function whatHappened(is) {
    const lines = [];
    if (is.emergencies.length) {
      lines.push(`<li><b>${F.inr(is.emergencyTotal)} unexpected</b>: ${is.emergencies.map(t => `${F.esc(short(t.desc))} on ${F.short(t.date)}`).join(', ')}. Your ${F.inr(is.m.bufferPlan)} buffer covered ${F.inr(is.m.bufferUsed)}${is.beyondBuffer ? `; <b>${F.inr(is.beyondBuffer)}</b> came from your other money` : ''}.</li>`);
    }
    is.over.forEach(r => lines.push(`<li><b>${F.esc(r.cat)}</b>: ${F.inr(r.spent)} spent against a ${F.inr(r.budget)} plan, <b>${F.inr(r.over)} over</b>.</li>`));
    if (!lines.length) lines.push('<li>Your remaining money is less than the spending you’ve planned for the rest of the month.</li>');
    return `<ul class="rc-what">${lines.join('')}</ul>`;
  }

  function standHTML(m) {
    const row = (k, v, s = '', cls = '') => `<div class="rc-row ${cls}"><dt>${k}${s ? `<span class="s">${s}</span>` : ''}</dt><dd class="num">${v}</dd></div>`;
    const due = m.billsList.map(u => `${short(u.name)} ${F.short(u.due)}`).join(', ');
    return `<dl class="rc-ledger">
      ${row('Balance today', F.inr(m.balance))}
      ${row('Commitments still due', '−' + F.inr(m.bills), due || 'Nothing else due before payday')}
      ${row('Essentials still to buy', '−' + F.inr(m.everyday), 'Groceries and transport, from what’s left of their budgets')}
      ${row('Savings still to move', '−' + F.inr(m.goals), 'Goal transfers due later this month')}
      ${row('Monthly buffer kept', '−' + F.inr(m.buffer))}
      ${row('Safe to spend', F.inr(m.free), `For the next ${m.daysLeft} days`, 'total' + (m.free < 0 ? ' neg' : ''))}
      ${row('Planned flexible spending still ahead', F.inr(m.flexRemaining), 'Food, shopping and plans you’ve budgeted')}
      ${row('Gap to close', F.inr(m.gap), '', 'gap')}
    </dl>`;
  }

  function leversHTML(context, L, en, plan) {
    const given = Object.fromEntries(plan.parts.map(p => [p.lever, p.amount]));
    return `<div class="rc-levers" role="group" aria-label="Recovery options">${L.order.map(k => {
      const max = L.levers[k].max;
      const disabled = !max;
      const why = k === 'fund' && context !== 'emergency' ? 'Kept for genuine emergencies, so it isn’t offered for overspending.'
        : k === 'buffer' && !max ? 'Your buffer is already used this month.'
        : k === 'savings' && !max ? 'This month’s transfers have already gone in.'
        : k === 'trim' && !max ? 'Nothing is left in flexible budgets to trim.' : '';
      return `<label class="rc-lever${disabled ? ' off' : ''}${en[k] && !disabled ? ' on' : ''}">
        <input type="checkbox" data-lever="${k}" ${en[k] && !disabled ? 'checked' : ''} ${disabled ? 'disabled' : ''} />
        <span class="rc-lever-body"><span class="t">${LEVER[k].t}</span>
          <span class="d">${disabled ? why : LEVER[k].d(L.m, L)}</span>
          ${disabled ? '' : `<span class="trade">${LEVER[k].trade}</span>`}</span>
        <span class="rc-lever-amt num">${en[k] && given[k] ? F.inr(given[k]) : disabled ? '' : `up to ${F.inr(max)}`}</span>
      </label>
      ${k === 'savings' && !disabled && en.savings && given.savings ? `<label class="switch rc-catch"><input type="checkbox" data-lever="catchUp" ${en.catchUp ? 'checked' : ''} /><span class="track"></span>Catch up next month instead, by spending ${F.inr(given.savings)} less in ${S.monthName(S.addMonths(S.CUR_MONTH, 1), true)}</label>` : ''}`;
    }).join('')}
      <p class="rc-protect">${I('shield', 15)}<span>Rent, family support, bills, groceries and transport are protected. Cutting them would mean missing a payment or going without basics, so they aren’t offered.</span></p>
    </div>`;
  }

  function revisedHTML(plan) {
    const rows = plan.rows.filter(r => r.budget || r.spent);
    return `<div class="table-wrap"><table class="table rc-rev">
      <caption class="sr-only">Revised budget for the rest of the month</caption>
      <thead><tr><th scope="col">Category</th><th scope="col" class="r">Budget</th><th scope="col" class="r hide-sm">Spent</th><th scope="col" class="r">Left now</th><th scope="col" class="r">Left after plan</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <th scope="row" class="cell-title">${F.esc(r.cat)}${r.kind === 'everyday' ? '<span class="cell-sub">Essential, protected</span>' : ''}</th>
        <td class="r num">${r.newBudget !== r.budget ? `<s class="subtle">${F.inr(r.budget)}</s> ${F.inr(r.newBudget)}` : F.inr(r.budget)}</td>
        <td class="r num hide-sm${r.spent > r.budget ? ' warn' : ''}">${F.inr(r.spent)}</td>
        <td class="r num">${F.inr(r.left)}</td>
        <td class="r num"><b>${F.inr(r.newLeft)}</b></td></tr>`).join('')}
        <tr class="rc-sub"><th scope="row" class="cell-title">Monthly buffer</th><td class="r num">—</td><td class="hide-sm"></td><td class="r num">${F.inr(plan.bufferBefore)}</td><td class="r num"><b>${F.inr(plan.bufferAfter)}</b></td></tr>
      </tbody></table></div>
      <p class="rc-after">After this plan your Safe-to-Spend is <b class="num">${F.inr(plan.freeAfter)}</b>, enough for the <b class="num">${F.inr(plan.flexAfter)}</b> of flexible spending left, about <b class="num">${F.inr(plan.perDayAfter)}</b> a day.${Object.keys(plan.nextMonth).length ? ` In ${S.monthName(S.addMonths(S.CUR_MONTH, 1), true)}: ${Object.entries(plan.nextMonth).map(([c, v]) => `${c} −${F.inr(v)}`).join(', ')}.` : ''}${plan.replenish ? ` The emergency fund is rebuilt at ${F.inr(plan.replenish.monthly)} a month for ${plan.replenish.months} months, from flexible spending.` : ''}</p>`;
  }

  function openRecovery(forceContext) {
    const is = S.issues();
    if (!is.needsRecovery) {
      ui.toast(is.over.length ? 'Your extra money already covers it. No plan needed.' : 'Nothing needs recovering this month', 'checkCircle');
      return;
    }
    const context = forceContext || is.context;
    const L = S.recoveryLevers(context);
    const en = Object.assign({}, L.defaults);
    const monthName = S.monthName(S.CUR_MONTH, true);
    const title = context === 'emergency' ? `Manage the rest of ${monthName}` : `Rebalance ${monthName}`;
    const step = (n, h, body, id) => `<section class="rc-step" aria-labelledby="${id}"><h3 class="rc-step-h" id="${id}"><span class="rc-n" aria-hidden="true">${n}</span>${h}</h3>${body}</section>`;
    const body = plan => `
      <p class="rc-intro">${context === 'emergency' ? 'Something unexpected came up. Here’s how to get through the month without missing a commitment.' : 'Some spending has run ahead of plan. Here’s how to finish the month without touching your commitments.'} Nothing changes until you approve.</p>
      ${step(1, 'What happened', whatHappened(is), 'rc1')}
      ${step(2, 'Where you stand', standHTML(L.m), 'rc2')}
      ${step(3, 'Ways to close the gap', `<p class="rc-hint">Scopewise fills the ${F.inr(plan.gap)} gap in this order, using only the options you tick.</p>${leversHTML(context, L, en, plan)}`, 'rc3')}
      ${step(4, 'Your revised budget', revisedHTML(plan), 'rc4')}
      ${step(5, 'Effect on your goals', plan.goals.length ? goalTable(plan.goals) : `<p class="rc-none">${I('checkCircle', 16)}<span>Your savings goals are untouched by this plan.</span></p>`, 'rc5')}
      <p class="rc-cover ${plan.uncovered ? 'short' : ''}" aria-live="polite">${plan.uncovered ? `${I('alert', 16)}<span>This covers ${F.inr(plan.covered)} of ${F.inr(plan.gap)}. Tick another option to cover the remaining <b>${F.inr(plan.uncovered)}</b>.</span>` : `${I('checkCircle', 16)}<span>This plan covers the full ${F.inr(plan.gap)}: ${S.planSummary(plan)}.</span>`}</p>`;
    let plan = S.recoveryPlan(context, en);
    ui.open({
      title, wide: true,
      desc: 'Based on what you’ve recorded this month',
      body: `<div data-rc>${body(plan)}</div>`,
      foot: `<button class="btn btn-ghost" data-reject>Not now</button><button class="btn btn-primary" data-approve ${plan.covered ? '' : 'disabled'}>Approve plan</button>`,
      onMount: (panel, close) => {
        const box = panel.querySelector('[data-rc]');
        const approve = panel.querySelector('[data-approve]');
        box.addEventListener('change', e => {
          const k = e.target.dataset.lever;
          if (!k) return;
          en[k] = e.target.checked;
          plan = S.recoveryPlan(context, en);
          const sc = panel.querySelector('.modal-body').scrollTop;
          box.innerHTML = body(plan);
          panel.querySelector('.modal-body').scrollTop = sc;
          box.querySelector(`[data-lever="${k}"]`)?.focus();
          approve.disabled = !plan.covered;
        });
        approve.addEventListener('click', () => {
          S.applyRecovery(plan, title);
          close();
          ui.toast(plan.uncovered ? `Plan approved. ${F.inr(plan.uncovered)} is still uncovered.` : 'Recovery plan approved. Your budget and goals are updated.');
        });
        panel.querySelector('[data-reject]').addEventListener('click', () => {
          S.rejectPlan('recovery', title, plan.gap, context);
          close();
          ui.toast('Plan not applied. Nothing changed.', 'info');
        });
      },
      onClose: () => SW.refresh()
    });
  }


  /* ---------- The alert shown on Overview, Transactions and Spending ---------- */
  function alertHTML(where) {
    const is = S.issues();
    const approved = is.approved.filter(p => p.kind === 'recovery').slice(-1)[0];
    if (!is.needsRecovery) {
      if (approved) return `<div class="rc-alert done" role="status">${I('checkCircle', 18)}<div class="grow"><b>Recovery plan in place.</b> <span>${F.esc(approved.summary)}.</span></div><a class="link" href="#/goals">See goals${I('arrowRight', 14)}</a></div>`;
      if (is.over.length && where !== 'spending') return `<div class="rc-alert info" role="status">${I('info', 18)}<div class="grow"><b>${is.over.map(r => r.cat).join(' and ')} ${is.over.length > 1 ? 'are' : 'is'} over budget</b> by ${F.inr(is.overTotal)}, but the rest of your month still fits.</div></div>`;
      return '';
    }
    const declined = is.declined.length && !approved;
    const what = is.context === 'emergency'
      ? `An unexpected ${F.inr(is.emergencyTotal)} has left <b>${F.inr(is.gap)}</b> of your planned spending uncovered.`
      : `${is.over.map(r => `${r.cat} is ${F.inr(r.over)} over`).join(', ')}. <b>${F.inr(is.gap)}</b> of your planned spending is no longer covered.`;
    return `<div class="rc-alert" role="region" aria-label="Needs attention">${I('alert', 18)}
      <div class="grow"><b>${is.context === 'emergency' ? 'Unexpected expense this month' : 'Spending has run ahead of plan'}</b><span> ${what}${declined ? ' You chose not to adjust earlier.' : ''}</span></div>
      <button type="button" class="btn btn-primary btn-sm" data-recover>${declined ? 'Review again' : 'Review a recovery plan'}</button></div>`;
  }
  // One delegated listener for every page

  // One delegated listener for every page
  document.addEventListener('click', e => {
    if (e.target.closest('[data-recover]')) openRecovery();
  });


  SW.flows = { openRecovery, alertHTML, goalTable, delayText };
})();
