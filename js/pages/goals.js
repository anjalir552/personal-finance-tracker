/* Savings Goals: "Am I saving enough, soon enough?"
   Each goal is drawn as its trajectory: what's been saved month by month (solid), where the
   monthly plan takes it (dashed, lilac when it lands after the deadline), the target and the
   deadline. Below, the planner edits every goal's monthly amount against a typical month, and
   the milestone timeline lists what lands when. */
SW.pages = SW.pages || {};
(function () {
  const F = SW.fmt, S = SW.store, ui = SW.ui, I = SW.icon, C = SW.charts;

  const round100 = v => Math.ceil(v / 100) * 100;
  const monthYear = key => key ? `${S.monthName(key)} ${key.slice(0, 4)}` : '—';
  let draft = {};   // planner edits before they're saved: goalId -> monthly

  const finishWords = (g, s, monthly) => {
    if (s.reached) return 'Reached';
    const f = S.goalFinish(g, monthly);
    return f ? monthYear(f) : 'Never at ₹0';
  };
  const isLate = (g, monthly) => { const f = S.goalFinish(g, monthly); return !f || f > g.deadline.slice(0, 7); };

  /* ---------- One goal: name, money and progress first; plan and deadline beside it;
     the trajectory chart and milestones behind a disclosure ---------- */
  function statusWord(s) {
    if (s.reached) return ['Reached', ''];
    if (s.overdue) return ['Past deadline', 'warn'];
    return s.onTrack ? ['On track', ''] : ['Behind plan', 'warn'];
  }

  function goalHTML(g) {
    const s = S.goalStatus(g);
    const [word, wcls] = statusWord(s);
    const late = !s.reached && isLate(g, g.monthly);
    const ms = S.goalMilestones(g).filter(m => !m.reached && m.eta && m.p < 1).slice(0, 3);
    const gap = round100(s.suggested) - g.monthly;
    const pct = Math.max(0, Math.min(1, s.pct));
    const left = s.reached ? '' : s.overdue ? 'Deadline passed' : `${s.monthsLeft} month${s.monthsLeft === 1 ? '' : 's'} left`;
    const line = s.reached ? `Reached ${F.inr(g.target)}.`
      : `At ${F.inr(g.monthly)} a month it lands ${finishWords(g, s, g.monthly)}, ${late ? 'after' : 'before'} the ${F.date(g.deadline)} deadline.`;
    return `<article class="sg-goal${late ? ' late' : ''}${s.reached ? ' done' : ''}" aria-labelledby="g-${g.id}">
      <div class="sg-goal-head"><h3 id="g-${g.id}">${F.esc(g.name)}</h3><span class="sg-status ${wcls}">${word}</span></div>
      <p class="sg-goal-amt"><b class="num">${F.inr(s.saved)}</b><span class="num">of ${F.inr(g.target)}</span></p>
      <div class="sg-prog" role="progressbar" aria-label="${F.esc(g.name)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}"><span style="width:${pct * 100}%"></span></div>
      <dl class="sg-facts">
        <div><dt>Deadline</dt><dd>${F.date(g.deadline)}<span class="u">${left}</span></dd></div>
        <div><dt>Monthly</dt><dd class="num">${g.monthly ? F.inr(g.monthly) : '—'}<span class="u">${s.reached ? '' : `${F.pct(s.pct)} saved`}</span></dd></div>
      </dl>
      <div class="sg-goal-foot">
        <details class="sg-more" data-more="${g.id}">
          <summary><span>Details</span>${I('chevronDown', 16)}</summary>
          <div class="sg-more-body">
            ${g.note ? `<p class="sg-note">${F.esc(g.note)}</p>` : ''}
            <p class="sg-traj-line">${line}${late ? ` To finish on time, add about <b>${F.inr(Math.max(100, gap))} a month</b>.` : ''}</p>
            ${ms.length ? `<ol class="sg-ms" aria-label="Next milestones for ${F.esc(g.name)}">${ms.map(m => `<li><span class="p">${F.pct(m.p)}</span><span class="a num">${F.inr(m.amount)}</span><span class="w num">${monthYear(m.eta)}</span></li>`).join('')}</ol>` : ''}
            <figure class="sg-traj"><div data-traj="${g.id}"></div></figure>
          </div>
        </details>
        <div class="sg-goal-actions">
          ${s.reached ? '' : `<button type="button" class="btn btn-secondary btn-sm" data-add="${g.id}">${I('plus', 14)}Add money</button>`}
          <button type="button" class="icon-btn sm" data-edit="${g.id}" aria-label="Edit ${F.esc(g.name)}">${I('edit', 16)}</button>
          <button type="button" class="icon-btn sm" data-del="${g.id}" aria-label="Delete ${F.esc(g.name)}">${I('trash', 16)}</button>
        </div>
      </div>
    </article>`;
  }

  function drawTrajectories(root, only) {
    const css = getComputedStyle(root);
    const v = n => css.getPropertyValue(n).trim();
    root.querySelectorAll(only ? `[data-traj="${only}"]` : 'details[open] [data-traj]').forEach(el => {
      const g = S.state.goals.find(x => x.id === el.dataset.traj);
      if (!g) return;
      const s = S.goalStatus(g);
      const hist = S.goalHistory(g);
      const proj = S.goalProjection(g, g.monthly);
      const late = !s.reached && isLate(g, g.monthly);
      const dlKey = g.deadline.slice(0, 7);
      let endKey = proj[proj.length - 1].key;
      if (endKey < dlKey) endKey = dlKey;
      const keys = [];
      for (let k = hist[0].key; k <= endKey && keys.length < 72; k = S.addMonths(k, 1)) keys.push(k);
      const cur = keys.indexOf(S.CUR_MONTH);
      const saved = keys.map((k, i) => (i <= cur ? (hist.find(h => h.key === k) || {}).saved ?? null : null));
      const ahead = keys.map((k, i) => (i >= cur ? (proj.find(p => p.key === k) || {}).saved ?? null : null));
      const dl = keys.indexOf(dlKey);
      C.line(el, {
        labels: keys.map(k => `${S.monthName(k)} ${k.slice(2, 4)}`),
        height: 180, zero: true, ticks: 3, xEvery: Math.max(1, Math.ceil(keys.length / 6)),
        ariaLabel: `${g.name}: ${F.inr(s.saved)} saved of ${F.inr(g.target)}; at the current plan it finishes ${finishWords(g, s, g.monthly)}; deadline ${F.date(g.deadline)}`,
        reference: { value: g.target, label: `Target ${F.inrc(g.target)}`, align: 'start' },
        markers: dl >= 0 ? [{ index: dl, label: 'Deadline', color: late ? v('--alert') : v('--line-strong') }] : [],
        series: [
          { name: 'Saved', color: v('--data'), values: saved, width: 2.25, endDot: true },
          { name: 'At your plan', color: late ? v('--alert') : v('--data'), values: ahead, width: 1.75, dashed: true }
        ],
        tooltip: i => `<div class="tt-title">${S.monthName(keys[i], true)} ${keys[i].slice(0, 4)}</div>
          ${saved[i] != null ? C.row(v('--data'), i === cur ? 'Saved so far' : 'Saved', F.inr(saved[i])) : ''}
          ${ahead[i] != null && i > cur ? C.row(late ? v('--alert') : v('--data'), 'At your plan', F.inr(ahead[i]), true) : ''}`
      });
    });
  }

  /* ---------- The overall position, as type ---------- */
  function summaryHTML(active) {
    const rows = active.map(g => ({ g, s: S.goalStatus(g) }));
    const saved = rows.reduce((a, x) => a + x.s.saved, 0);
    const target = rows.reduce((a, x) => a + x.g.target, 0);
    const toAdd = S.goalsThisCycle();
    const planned = S.goalsMonthly();
    const pct = target ? saved / target : 0;
    return `<section class="sg-summary" aria-label="All goals">
      <div class="sg-sum-lead">
        <span class="k">Saved across ${active.length} goal${active.length === 1 ? '' : 's'}</span>
        <span class="v num">${F.inr(saved)}</span>
        <span class="s num">${F.pct(pct)} of ${F.inr(target)}</span>
      </div>
      <dl class="sg-sum-figs">
        <div><dt>Saving each month</dt><dd class="num">${F.inr(planned)}</dd></div>
        <div><dt>Still to add this month</dt><dd class="num">${toAdd ? F.inr(toAdd) : 'Done'}</dd></div>
      </dl>
    </section>`;
  }

  /* ---------- Monthly planner: one row per goal ---------- */
  function plannerTotals(active) {
    const room = S.savingsRoom();
    const planned = active.reduce((a, g) => a + (draft[g.id] != null ? draft[g.id] : g.monthly), 0);
    const left = room.room - planned;
    const share = room.room > 0 ? Math.max(0, Math.min(1, planned / room.room)) : 1;
    const tight = left < room.flexible;
    return `<div class="sg-left"><span class="k">Left for everything else</span><b class="num${tight ? ' warn' : ''}">${F.inr(left)}</b><span class="s">of ${F.inr(room.room)} a typical month after bills and essentials</span></div>
      <div class="sg-split" aria-hidden="true"><span style="width:${share * 100}%"></span></div>
      <p class="sg-pt-note">${tight ? `You usually spend ${F.inr(room.flexible)} on eating out, shopping and plans, so this plan needs about <b>${F.inr(room.flexible - left)} a month less</b> of that.` : `Enough to cover your usual ${F.inr(room.flexible)} of eating out, shopping and plans.`}</p>`;
  }

  function planRowSub(g, m) {
    const s = S.goalStatus(g);
    const late = isLate(g, m);
    return `<span class="${late ? 'warn' : ''}">${late ? `Lands ${finishWords(g, s, m)}, after the deadline` : `On time, lands ${finishWords(g, s, m)}`}</span>`;
  }

  function plannerHTML(active) {
    if (!active.length) return '';
    const dirty = active.some(g => draft[g.id] != null && draft[g.id] !== g.monthly);
    return `<div class="sg-sec-head"><div><h2 class="sg-sec-title" id="pl-h">Monthly plan</h2>
        <p class="sg-sec-desc">How much goes into each goal every month.</p></div>
        <div class="sg-plan-btns">
          <button type="button" class="btn btn-ghost btn-sm" data-action="plan-reset" ${dirty ? '' : 'disabled'}>Reset</button>
          <button type="button" class="btn btn-primary btn-sm" data-action="plan-save" ${dirty ? '' : 'disabled'}>Save plan</button>
        </div></div>
      <div class="sg-plan">${active.map(g => {
        const s = S.goalStatus(g);
        const m = draft[g.id] != null ? draft[g.id] : g.monthly;
        return `<div class="sg-plan-row">
          <div class="sg-plan-name"><label for="pm-${g.id}">${F.esc(g.name)}</label>
            <span class="sg-plan-sub" data-finish="${g.id}">${planRowSub(g, m)}</span>
            <span class="sg-plan-need">Needs about ${F.inr(round100(s.suggested))} a month</span></div>
          <div class="input-affix has-pre sg-plan-in"><span class="affix pre">₹</span><input class="input num" id="pm-${g.id}" name="plan-${g.id}" data-plan="${g.id}" inputmode="numeric" autocomplete="off" value="${m ? F.num(m) : ''}" placeholder="0" data-money /></div>
        </div>`;
      }).join('')}</div>
      <div class="sg-plan-totals" data-totals aria-live="polite">${plannerTotals(active)}</div>`;
  }

  /* ---------- Milestones ahead: the next three; the rest on request ---------- */
  function milestonesHTML(active) {
    const next = active.flatMap(g => S.goalMilestones(g).filter(m => !m.reached && m.eta).map(m => ({ g, m })))
      .sort((a, b) => a.m.eta.localeCompare(b.m.eta) || a.m.p - b.m.p);
    if (!next.length) return '';
    const row = x => `<li><span class="m num">${monthYear(x.m.eta)}</span><span class="n">${F.esc(x.g.name)} <span class="subtle">${x.m.p === 1 ? 'reaches its target' : `hits ${F.pct(x.m.p)}`}</span></span></li>`;
    return `<div class="sg-sec-head"><div><h2 class="sg-sec-title" id="ms-h">Coming up</h2></div></div>
      <ol class="sg-next">${next.slice(0, 3).map(row).join('')}</ol>
      ${next.length > 3 ? `<details class="sg-more sg-next-more"><summary><span>Show ${next.length - 3} more</span>${I('chevronDown', 16)}</summary><ol class="sg-next">${next.slice(3, 9).map(row).join('')}</ol></details>` : ''}`;
  }

  function render() {
    draft = {};
    const goals = S.state.goals;
    const active = S.activeGoals();
    const reached = goals.filter(g => S.goalStatus(g).reached);
    const planned = S.goalsMonthly();
    const needed = active.reduce((a, g) => a + round100(S.goalStatus(g).suggested), 0);
    const behind = active.filter(g => !S.goalStatus(g).onTrack);
    const sub = !active.length ? 'Give your savings a purpose. Goals are protected when you check a purchase.'
      : behind.length ? `<b class="warn">${behind.length} of ${active.length} goals ${behind.length > 1 ? 'are' : 'is'} behind.</b> Every deadline needs about ${F.inr(needed)} a month; you plan ${F.inr(planned)}.`
      : `<b>Every goal is on track.</b> Your plan covers each deadline.`;

    return `
      ${ui.pageHeader({ title: 'Savings Goals', sub, actions: `<button class="btn btn-primary" data-action="new">${I('plus', 16)}New goal</button>` })}
      ${active.length ? summaryHTML(active) : ''}
      <section class="sg-goals" aria-labelledby="goals-h">
        <h2 class="sr-only" id="goals-h">Your goals</h2>
        ${active.length ? `<div class="sg-list">${active.map(goalHTML).join('')}</div>`
          : `<div class="sg-empty">${ui.empty({ icon: 'goals', title: 'No active goals', text: 'An emergency fund, a trip, a laptop: set a target and a date and Scopewise will suggest how much to put aside each month.', action: `<button class="btn btn-primary btn-sm" data-action="new">${I('plus', 15)}Create your first goal</button>` })}</div>`}
        ${reached.length ? `<details class="disclosure sg-reached"><summary><span>Reached goals<span class="sum-sub">${reached.length}</span></span>${I('chevronDown', 18)}</summary>
          <div class="disc-body"><div class="sg-list">${reached.map(goalHTML).join('')}</div></div></details>` : ''}
      </section>
      ${active.length ? `<div class="sg-lower">
        <section class="sg-planner" aria-labelledby="pl-h">${plannerHTML(active)}</section>
        <section class="sg-milestones" aria-labelledby="ms-h">${milestonesHTML(active)}</section>
      </div>` : ''}
      ${active.length ? `<details class="sg-more sg-how"><summary><span>How these numbers are worked out</span>${I('chevronDown', 16)}</summary><p>“Needs” is what’s left divided by the months to the deadline, rounded up to the nearest ₹100. Money you add is recorded as a transfer, so your available balance goes down by the same amount.</p></details>` : ''}`;
  }

  function openForm(existing) {
    const isEdit = existing && existing.id;
    const g = Object.assign({ name: '', target: '', start: 0, deadline: F.addDays(S.TODAY, 180), monthly: '', note: '' }, existing || {});
    ui.open({
      title: isEdit ? 'Edit goal' : 'New savings goal',
      desc: isEdit ? '' : 'Name it, set a target and a date. We’ll suggest a monthly amount.',
      body: `<form class="form-grid" data-form autocomplete="off" novalidate>
        <label class="field span-2"><span class="field-label">What are you saving for?</span><input class="input" name="name" value="${F.esc(g.name)}" placeholder="e.g. Trip to Manali" aria-describedby="e-name" /><span class="field-error" id="e-name" hidden>Give the goal a name.</span></label>
        <label class="field"><span class="field-label">Target amount</span>${ui.moneyInput('target', g.target, 'placeholder="0" aria-describedby="e-target"')}<span class="field-error" id="e-target" hidden>Enter a target above zero.</span></label>
        <label class="field"><span class="field-label">Target date</span><input class="input" type="date" name="deadline" value="${g.deadline}" min="${F.addDays(S.TODAY, 1)}" /></label>
        <label class="field"><span class="field-label">Already saved <span class="opt">Optional</span></span>${ui.moneyInput('start', isEdit ? S.goalSaved(g) : g.start, 'placeholder="0"')}<span class="field-hint">Money you’ve already put aside for it.</span></label>
        <label class="field"><span class="field-label">Plan to save each month</span>${ui.moneyInput('monthly', g.monthly, 'placeholder="0"')}</label>
        <p class="callout span-2" data-suggest></p>
        <label class="field span-2"><span class="field-label">Note <span class="opt">Optional</span></span><input class="input" name="note" value="${F.esc(g.note || '')}" placeholder="Why it matters, or what it covers" /></label>
      </form>`,
      foot: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" data-ok>${isEdit ? 'Save changes' : 'Create goal'}</button>`,
      onMount: (panel, close) => {
        const form = panel.querySelector('[data-form]');
        const box = panel.querySelector('[data-suggest]');
        ui.bindMoney(form);
        const suggest = () => {
          const d = ui.formData(form);
          const target = ui.money(d.target), start = ui.money(d.start), monthly = ui.money(d.monthly);
          const dl = d.deadline || g.deadline;
          const months = Math.max(1, (F.d(dl).getFullYear() - F.d(S.TODAY).getFullYear()) * 12 + F.d(dl).getMonth() - F.d(S.TODAY).getMonth());
          const need = Math.max(0, target - start);
          if (!target) { box.innerHTML = `${I('info', 16)}<span>Enter a target to see a suggested monthly amount.</span>`; return; }
          if (!need) { box.innerHTML = `${I('checkCircle', 16)}<span>You’ve already saved enough for this.</span>`; return; }
          const sug = round100(need / months);
          const tm = S.typicalMonth();
          const roomy = tm.income ? sug <= Math.max(0, tm.surplus) : null;
          box.className = 'callout span-2' + (monthly && monthly < sug ? ' alert' : '');
          box.innerHTML = `${I('info', 16)}<span>To reach ${F.inr(target)} by ${F.date(dl)}, save about <b>${F.inr(sug)} a month</b> for ${months} month${months === 1 ? '' : 's'}.
            ${monthly && monthly < sug ? ` At ${F.inr(monthly)} it would take until ${S.monthName(S.addMonths(S.CUR_MONTH, Math.ceil(need / monthly)), true)} ${S.addMonths(S.CUR_MONTH, Math.ceil(need / monthly)).slice(0, 4)}.` : ''}
            ${roomy === false ? ' That’s more than a typical month currently leaves spare, so it may mean spending less elsewhere.' : ''}
            ${monthly !== sug ? ` <button type="button" class="link" data-use="${sug}">Use ${F.inr(sug)}</button>` : ''}</span>`;
        };
        form.addEventListener('input', suggest);
        box.addEventListener('click', e => {
          const b = e.target.closest('[data-use]');
          if (!b) return;
          form.monthly.value = F.num(+b.dataset.use); suggest();
        });
        suggest();
        panel.querySelector('[data-ok]').addEventListener('click', () => {
          const d = ui.formData(form);
          const target = ui.money(d.target);
          const bad = { name: !d.name.trim(), target: !target };
          panel.querySelector('#e-name').hidden = !bad.name; form.name.classList.toggle('invalid', bad.name);
          panel.querySelector('#e-target').hidden = !bad.target; form.target.classList.toggle('invalid', bad.target);
          if (bad.name || bad.target) { (bad.name ? form.name : form.target).focus(); return; }
          const row = { name: d.name.trim(), target, deadline: d.deadline || g.deadline, monthly: ui.money(d.monthly), note: d.note.trim() };
          if (isEdit) {
            const goal = S.state.goals.find(x => x.id === g.id);
            // "Already saved" edits the starting amount so transfers stay intact
            const transfers = S.goalSaved(goal) - goal.start;
            Object.assign(goal, row, { start: Math.max(0, ui.money(d.start) - transfers) });
          } else {
            S.state.goals.push(Object.assign({ id: S.nextId('g', S.state.goals), start: ui.money(d.start), created: S.TODAY }, row));
          }
          S.state.isNew = false;
          S.save(); close();
          ui.toast(isEdit ? 'Goal updated' : `Goal “${row.name}” created`);
          if (location.hash !== '#/goals') SW.go('#/goals');
        });
      },
      onClose: () => SW.refresh()
    });
  }

  function openAdd(g) {
    const s = S.goalStatus(g);
    const suggested = Math.min(s.remaining, s.setAside || g.monthly || 1000);
    const bal = S.balance();
    ui.open({
      title: `Add money to ${F.esc(g.name)}`,
      desc: `${F.inr(s.remaining)} left to reach ${F.inr(g.target)}.`,
      body: `<form class="form-grid" data-form autocomplete="off" novalidate>
        <label class="field"><span class="field-label">Amount</span>${ui.moneyInput('amount', suggested, 'aria-describedby="e-amt"')}<span class="field-error" id="e-amt" hidden></span></label>
        <label class="field"><span class="field-label">Date</span><input class="input" type="date" name="date" value="${S.TODAY}" max="${S.TODAY}" /></label>
        <p class="field-hint span-2">This is recorded as a transfer from your bank balance (${F.inr(bal)} today) to this goal.</p>
      </form>`,
      foot: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" data-ok>Add money</button>`,
      onMount: (panel, close) => {
        const form = panel.querySelector('[data-form]');
        ui.bindMoney(form);
        panel.querySelector('[data-ok]').addEventListener('click', () => {
          const d = ui.formData(form);
          const amount = ui.money(d.amount);
          const err = panel.querySelector('#e-amt');
          const msg = !amount ? 'Enter an amount above zero.' : amount > bal ? `That’s more than your balance of ${F.inr(bal)}.` : '';
          err.textContent = msg; err.hidden = !msg; form.amount.classList.toggle('invalid', !!msg);
          if (msg) { form.amount.focus(); return; }
          S.contribute(g.id, amount, d.date || S.TODAY);
          close();
          const after = S.goalStatus(g);
          ui.toast(after.reached ? `${g.name} reached. Well done.` : `${F.inr(amount)} added to ${g.name}`);
        });
      },
      onClose: () => SW.refresh()
    });
  }

  function mount(root) {
    const active = () => S.activeGoals();
    root.querySelectorAll('[data-more]').forEach(d => d.addEventListener('toggle', () => { if (d.open) drawTrajectories(root, d.dataset.more); }));
    const planner = root.querySelector('.sg-planner');
    if (planner) {
      ui.bindMoney(planner);
      planner.addEventListener('input', e => {
        const inpEl = e.target.closest('[data-plan]');
        if (!inpEl) return;
        const g = S.state.goals.find(x => x.id === inpEl.dataset.plan);
        const m = ui.money(inpEl.value);
        draft[g.id] = m;
        planner.querySelector(`[data-finish="${g.id}"]`).innerHTML = planRowSub(g, m);
        planner.querySelector('[data-totals]').innerHTML = plannerTotals(active());
        const dirty = active().some(x => draft[x.id] != null && draft[x.id] !== x.monthly);
        planner.querySelectorAll('[data-action^="plan-"]').forEach(b => (b.disabled = !dirty));
      });
    }
    ui.on(root, 'click', '[data-action="plan-reset"]', () => { SW.refresh(); });
    ui.on(root, 'click', '[data-action="plan-save"]', () => {
      let n = 0;
      active().forEach(g => { if (draft[g.id] != null && draft[g.id] !== g.monthly) { g.monthly = draft[g.id]; n++; } });
      S.save(); SW.refresh();
      ui.toast(`Plan saved for ${n} goal${n === 1 ? '' : 's'}`);
    });
    ui.on(root, 'click', '[data-action="new"]', () => openForm());
    ui.on(root, 'click', '[data-edit]', (e, b) => openForm(S.state.goals.find(g => g.id === b.dataset.edit)));
    ui.on(root, 'click', '[data-add]', (e, b) => openAdd(S.state.goals.find(g => g.id === b.dataset.add)));
    ui.on(root, 'click', '[data-del]', async (e, b) => {
      const g = S.state.goals.find(x => x.id === b.dataset.del);
      const ok = await ui.confirm({ title: `Delete “${F.esc(g.name)}”?`, text: 'The goal will be removed. Money you moved to it stays in your transactions as past transfers.', confirmLabel: 'Delete goal', danger: true });
      if (!ok) return;
      S.state.goals = S.state.goals.filter(x => x.id !== g.id);
      S.save(); SW.refresh(); ui.toast('Goal deleted');
    });
  }

  SW.pages.goals = { render, mount, openForm };
})();
