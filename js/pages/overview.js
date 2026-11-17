/* Overview: answers "After my responsibilities, how much can I safely spend?"
   The Safe-to-Spend figure leads; the bar and the breakdown show what is already spoken for;
   then the month against plan, what's coming up, savings, recent transactions and what's worth knowing. */
SW.pages = SW.pages || {};
(function () {
  const F = SW.fmt, S = SW.store, ui = SW.ui, I = SW.icon;
  const short = n => n.split(' · ')[0].replace(/\s*\(.*\)$/, '');

  function welcome() {
    const s = S.state.settings;
    const steps = [
      { done: s.monthlyIncome > 0 && S.balance() !== 0, t: 'Add your balance and income', p: 'Your bank balance today, what you earn each month and when it arrives.', href: '#/settings', cta: 'Open settings' },
      { done: S.plan().lines > 0, t: 'Set a monthly budget', p: 'How much goes to rent, family, bills, essentials and the things you enjoy.', href: '#/spending', cta: 'Set a budget', budget: true },
      { done: S.state.upcoming.length > 0, t: 'List what’s coming up', p: 'Rent, bills, subscriptions and anything you’ve already planned to pay for.', href: '#/upcoming', cta: 'Add an expense' },
      { done: S.state.goals.length > 0, t: 'Set a savings goal', p: 'A trip, a phone or an emergency fund, so purchases can be checked against it.', href: '#/goals', cta: 'Create a goal' }
    ];
    const n = steps.filter(x => x.done).length;
    return `${ui.pageHeader({ title: 'Overview', sub: 'A few quick steps and Scopewise can tell you what you can safely spend.' })}
      <section class="panel welcome" aria-labelledby="w-h">
        <div class="row-between wrap">
          <div><h2 class="section-title" id="w-h">Set up your money picture</h2><p class="section-desc" style="margin-top:4px">${n} of ${steps.length} done. Everything stays in this browser. You can bring back the demo from Settings.</p></div>
          <div style="width:min(240px,100%)">${ui.progress(n / steps.length)}</div>
        </div>
        <ol class="welcome-steps">
          ${steps.map(x => `<li><span class="t">${x.t}</span><p>${x.p}</p>
            ${x.done ? `<span class="done">${I('checkCircle', 16)}Done</span>` : x.budget ? `<button type="button" class="link" data-edit-budget>${x.cta}${I('arrowRight', 14)}</button>` : `<a class="link" href="${x.href}">${x.cta}${I('arrowRight', 14)}</a>`}</li>`).join('')}
        </ol>
      </section>`;
  }

  /* ---------- Safe-to-Spend: the figure, the bar, and the sum written out ---------- */
  function heroHTML(m) {
    const payday = F.date(m.payday, false);
    const isShort = m.free < 0;
    const extraLine = m.extra >= 0
      ? `Your budget has <b>${F.inr(m.flexRemaining)}</b> left for food, shopping and plans${m.extra >= 50 ? `, plus <b>${F.inr(m.extra)}</b> more you haven’t planned, mostly carried over from last month` : ''}.`
      : `Your budget still plans <b>${F.inr(m.flexRemaining)}</b> for food, shopping and plans, but only <b>${F.inr(Math.max(0, m.free))}</b> is safe to spend: <b class="warn">${F.inr(-m.extra)}</b> of planned spending isn’t covered.`;
    return `<section class="panel hero-card" aria-labelledby="map-h">
      <div class="hero-top">
        <div class="hero-free">
          <h2 class="stat-label" id="map-h" style="font-weight:650;color:var(--text)">Safe to spend until ${payday}</h2>
          <div class="stat-value lead num${isShort ? ' neg' : ''}">${F.inr(m.free)}</div>
          <div class="stat-meta">${isShort ? `Your commitments, essentials, savings and buffer need ${F.inr(-m.free)} more than you have` : `About ${F.inr(m.perDay)} a day for the next ${m.daysLeft} days`}</div>
        </div>
        <div class="hero-balance">
          <div class="stat-label">Balance today</div>
          <div class="stat-value num">${F.inr(m.balance)}</div>
          <div class="stat-meta">Not all of it is yours to spend</div>
        </div>
      </div>
      ${ui.moneyBar(m)}
      <div class="money-keys five">
        <div class="money-key"><div class="k"><i class="key-bills"></i>Commitments due</div><div class="v num">${F.inr(m.bills)}</div><div class="s">${m.billsList.length ? `${m.billsList.length} before payday` : 'All paid for this month'}</div></div>
        <div class="money-key"><div class="k"><i class="key-everyday"></i>Essentials to buy</div><div class="v num">${F.inr(m.everyday)}</div><div class="s">Left of groceries and transport budgets</div></div>
        <div class="money-key"><div class="k"><i class="key-goals"></i>Savings to move</div><div class="v num">${F.inr(m.goals)}</div><div class="s">${m.goals ? 'Goal transfers still due' : 'All moved this month'}</div></div>
        <div class="money-key"><div class="k"><i class="key-buffer"></i>Buffer kept</div><div class="v num">${F.inr(m.buffer)}</div><div class="s">${m.bufferUsed ? `${F.inr(m.bufferUsed)} of ${F.inr(m.bufferPlan)} used` : 'For anything unexpected'}</div></div>
        <div class="money-key free"><div class="k"><i class="key-free"></i>Safe to spend</div><div class="v num">${isShort ? F.inr(m.free) : F.inr(m.perDay)}<span class="unit">${isShort ? '' : '/ day'}</span></div><div class="s">Food, shopping, plans</div></div>
      </div>
      <details class="hero-how">
        <summary><span>How Safe-to-Spend is worked out</span>${I('chevronDown', 16)}</summary>
        <div class="hero-how-body">
          <dl class="how-sum">
            <div><dt>Balance in your account today</dt><dd class="num">${F.inr(m.balance)}</dd></div>
            <div><dt>Commitments still due before ${payday}${m.billsList.length ? `<span class="s">${m.billsList.map(u => `${F.esc(short(u.name))} ${F.short(u.due)}`).join(' · ')}</span>` : ''}</dt><dd class="num">−${F.inr(m.bills)}</dd></div>
            <div><dt>Essentials still to buy<span class="s">${m.everydayRows.filter(r => r.budget).map(r => `${r.cat} ${F.inr(r.left)} of ${F.inr(r.budget)}`).join(' · ')}</span></dt><dd class="num">−${F.inr(m.everyday)}</dd></div>
            <div><dt>Savings still to move this month</dt><dd class="num">−${F.inr(m.goals)}</dd></div>
            <div><dt>Monthly buffer, unused part</dt><dd class="num">−${F.inr(m.buffer)}</dd></div>
            <div class="tot"><dt>Safe to spend</dt><dd class="num">${F.inr(m.free)}</dd></div>
          </dl>
          <p>Only what’s still ahead is taken out. Rent and family support already paid, groceries already bought and savings already moved have left your balance, so they aren’t counted again. ${extraLine}</p>
        </div>
      </details>
    </section>`;
  }

  function render(params) {
    const st = S.state;
    if (st.isNew && !st.transactions.length && !st.goals.length && !st.upcoming.length) return welcome();

    const m = S.moneyMap();
    const mon = S.CUR_MONTH;
    const monName = S.monthName(mon, true);
    const sum = S.monthSummary(mon);
    const week = F.addDays(S.TODAY, 7);
    const next7 = m.billsList.filter(u => u.due <= week);
    const is = S.issues();
    const sub = m.free < 0
      ? `<b class="warn">Your plans for ${monName} need ${F.inr(-m.free)} more than you have.</b> A recovery plan can close the gap without touching rent, family or bills.`
      : is.needsRecovery ? `<b>${F.inr(m.free)} is safe to spend</b>, but that’s ${F.inr(is.gap)} less than you’d planned for the rest of ${monName}.`
      : next7.length ? `<b>${F.inr(m.free)} is safe to spend</b> after everything you’re responsible for. ${short(next7[0].name)} is due ${F.rel(next7[0].due, S.TODAY)} and is already set aside.`
      : `<b>${F.inr(m.free)} is safe to spend</b> after everything you’re responsible for this month.`;

    const soon = S.upcomingSorted().slice(0, 5);
    const goals = S.activeGoals();
    const insights = S.insights().filter(x => x.id !== 'pressure').slice(0, 3);
    const rows = S.monthBudget(mon).filter(r => r.budget || r.spent || r.scheduled);
    const bills = S.monthBudget(mon).filter(r => r.kind === 'bill');
    const recent = st.transactions.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 6);

    const upcomingHTML = soon.length ? `<ul class="list">${soon.map(u => {
      const d = F.d(u.due);
      const isSoon = u.due <= F.addDays(S.TODAY, 3);
      return `<li class="list-item">
        <div class="date-chip${isSoon ? ' soon' : ''}" aria-hidden="true"><div class="d">${d.getDate()}</div><div class="m">${F.MONTHS[d.getMonth()]}</div></div>
        <div class="grow"><div class="li-title">${F.esc(u.name)}</div>
          <div class="li-sub">${S.isOverdue(u) ? '<span class="warn">Overdue</span>' : F.rel(u.due, S.TODAY).replace(/^in /, 'In ')} · ${F.esc(u.category)}${u.estimate ? ' · estimate' : ''}</div></div>
        <div class="li-amt">${u.estimate ? '~' : ''}${F.inr(u.amount)}</div>
      </li>`;
    }).join('')}</ul>` : ui.empty({ icon: 'upcoming', title: 'Nothing planned yet', text: 'Add rent, bills and subscriptions so they’re kept aside from what you can spend.', action: `<a class="btn btn-secondary btn-sm" href="#/upcoming">${I('plus', 15)}Add an expense</a>` });

    const goalsHTML = goals.length ? `<div class="panel-body goal-mini">${goals.slice(0, 3).map(g => {
      const s = S.goalStatus(g);
      return `<div>
        <div class="top"><b>${F.esc(g.name)}</b><span>${F.inrc(s.saved)} of ${F.inrc(g.target)}</span></div>
        ${ui.progress(s.pct)}
        <div class="li-sub" style="margin-top:6px">${s.onTrack ? `On track, reaches it ${s.projected ? `${S.monthName(s.projected)} ${s.projected.slice(0, 4)}` : ''}` : `<span class="warn">Lands ${s.projected ? `${S.monthName(s.projected)} ${s.projected.slice(0, 4)}` : 'with no set date'}</span>, after its ${F.date(g.deadline, true)} deadline`}</div>
      </div>`;
    }).join('')}
      <p class="callout" style="margin-top:2px">${I('wallet', 16)}<span>${monName}: <b>${F.inr(goals.reduce((a, g) => a + S.goalStatus(g).thisCycle, 0))}</b> moved to savings, <b>${F.inr(m.goals)}</b> still to move.</span></p></div>` : ui.empty({ icon: 'goals', title: 'No savings goals yet', text: 'Goals let Scopewise protect the money you’re saving when you check a purchase.', action: `<a class="btn btn-secondary btn-sm" href="#/goals">${I('plus', 15)}Create a goal</a>` });

    const recentHTML = recent.length ? `<ul class="list">${recent.map(t => {
      const sign = t.type === 'income' || t.type === 'withdrawal' ? '+' : t.type === 'expense' ? '−' : '';
      const tag = t.emergency ? '<span class="badge warn">Emergency</span>' : t.unplanned ? '<span class="badge info">Unplanned</span>' : '';
      return `<li class="list-item">
        <div class="grow"><div class="li-title">${F.esc(t.desc)} ${tag}</div>
          <div class="li-sub">${t.date === S.TODAY ? 'Today' : F.short(t.date)} · ${t.type === 'transfer' ? 'To savings' : t.type === 'withdrawal' ? 'From savings' : F.esc(t.category)}</div></div>
        <div class="li-amt${sign === '+' ? ' pos' : ''}">${sign}${F.inr(t.amount)}</div></li>`;
    }).join('')}</ul>` : ui.empty({ icon: 'transactions', title: 'No transactions yet', text: 'Add what comes in and goes out.' });

    const billsPaid = bills.reduce((a, r) => a + r.spent, 0), billsDue = bills.reduce((a, r) => a + r.scheduled, 0);

    return `
      ${ui.pageHeader({
        title: 'Overview', sub,
        actions: `<button class="btn btn-secondary" data-action="add">${I('plus', 16)}Add transaction</button>
                  <a class="btn btn-primary" href="#/decisions">${I('decisions', 16)}Can I afford this?</a>`
      })}
      ${SW.flows.alertHTML('overview')}
      ${heroHTML(m)}

      <section class="panel section ov-month plain-strip" aria-labelledby="mo-h">
        <div class="panel-head"><div><h2 class="panel-title" id="mo-h">${monName} so far</h2><div class="panel-desc">Day ${F.d(S.TODAY).getDate()} of ${S.daysInMonth(mon)} · plan ${F.inr(S.plan().income)}</div></div>
          <button type="button" class="btn btn-ghost btn-sm" data-emergency>${I('alert', 15)}Record unexpected expense</button></div>
        <div class="stat-strip" style="--cols:4">
          <div class="stat"><div class="stat-label">Income</div><div class="stat-value num">${F.inr(sum.income)}</div><div class="stat-meta">Salary on the ${S.state.settings.payday}${S.state.settings.payday === 1 ? 'st' : 'th'}</div></div>
          <div class="stat"><div class="stat-label">Spent</div><div class="stat-value num">${F.inr(sum.spent)}</div><div class="stat-meta">${F.inr(sum.essential)} on essentials</div></div>
          <div class="stat"><div class="stat-label">Moved to savings</div><div class="stat-value num">${F.inr(sum.saved)}</div><div class="stat-meta">of ${F.inr(S.goalsMonthly())} planned</div></div>
          <div class="stat"><div class="stat-label">Remaining balance</div><div class="stat-value num">${F.inr(m.balance)}</div><div class="stat-meta">${F.inr(m.committed)} of it is spoken for</div></div>
        </div>
      </section>

      <div class="grid grid-main section">
        <section class="panel" aria-labelledby="pl-h" style="display:flex;flex-direction:column">
          <div class="panel-head"><div><h2 class="panel-title" id="pl-h">Spending against plan</h2>
            <div class="panel-desc">Commitments ${F.inr(billsPaid)} paid${billsDue ? `, ${F.inr(billsDue)} still due` : ''}; day-to-day spending against its budget</div></div></div>
          <div class="panel-body" style="flex:1">${rows.length ? ui.budgetRows(rows) : '<p class="muted">No budget yet.</p>'}
            <div class="legend bva-legend"><span><i class="lg-bar"></i>Spent</span><span><i class="lg-tick"></i>Budget</span><span><i class="lg-over"></i>Over budget</span><span><i style="background:var(--ess);border-radius:99px;width:7px;height:7px"></i>Essential</span></div></div>
          <div class="panel-foot"><button type="button" class="link" data-edit-budget>${I('sliders', 14)}Edit budget</button><a class="link" href="#/spending">Spending analysis${I('arrowRight', 14)}</a></div>
        </section>

        <section class="panel" aria-labelledby="in-h" style="display:flex;flex-direction:column">
          <div class="panel-head"><div><h2 class="panel-title" id="in-h">Worth knowing</h2><div class="panel-desc">From your own transactions</div></div></div>
          <div style="flex:1">${insights.length ? insights.map(x => `
            <div class="insight">
              <span class="insight-dot ${x.tone}" aria-hidden="true"></span>
              <div><div class="insight-title">${x.title}</div><p class="insight-text clamp-2">${x.text}</p><a class="link" href="${x.link[0]}">${x.link[1]}${I('arrowRight', 14)}</a></div>
            </div>`).join('') : ui.empty({ icon: 'insights', title: 'Insights appear after a month', text: 'Keep adding transactions and Scopewise will point out patterns worth knowing.' })}</div>
          <div class="panel-foot"><span></span><a class="link" href="#/insights">All personal insights${I('arrowRight', 14)}</a></div>
        </section>
      </div>

      <div class="grid grid-2 section">
        <section class="panel" aria-labelledby="up-h" style="display:flex;flex-direction:column">
          <div class="panel-head"><div><h2 class="panel-title" id="up-h">Coming up</h2><div class="panel-desc">Already kept aside, soonest first</div></div>
            ${m.bills ? `<div class="panel-figure">${F.inr(m.bills)}</div>` : ''}</div>
          <div style="flex:1">${upcomingHTML}</div>
          <div class="panel-foot"><span>${m.bills ? 'Due before payday' : ''}</span><a class="link" href="#/upcoming">All upcoming expenses${I('arrowRight', 14)}</a></div>
        </section>

        <section class="panel tone-lilac" aria-labelledby="goal-h" style="display:flex;flex-direction:column">
          <div class="panel-head"><div><h2 class="panel-title" id="goal-h">Savings progress</h2><div class="panel-desc">${goals.length ? `${F.inr(S.goalsMonthly())} planned each month` : 'What you’re saving towards'}</div></div>
            ${goals.length ? `<div class="panel-figure">${F.inr(goals.reduce((a, g) => a + S.goalStatus(g).saved, 0))}</div>` : ''}</div>
          <div style="flex:1">${goalsHTML}</div>
          <div class="panel-foot"><span>${goals.length ? 'Saved so far' : ''}</span><a class="link" href="#/goals">All savings goals${I('arrowRight', 14)}</a></div>
        </section>
      </div>

      <section class="panel section" aria-labelledby="rt-h">
        <div class="panel-head"><div><h2 class="panel-title" id="rt-h">Recent transactions</h2><div class="panel-desc">Fictional demonstration records, not a connected bank account</div></div></div>
        ${recentHTML}
        <div class="panel-foot"><span></span><a class="link" href="#/transactions">All transactions${I('arrowRight', 14)}</a></div>
      </section>`;
  }

  function mount(root, params) {
    ui.on(root, 'click', '[data-action="add"]', () => SW.pages.transactions.openForm());
    if (params && params[0] === 'recover') {
      history.replaceState(null, '', '#/overview');
      setTimeout(() => SW.flows.openRecovery(), 60);
    }
  }

  SW.pages.overview = { render, mount };
})();
