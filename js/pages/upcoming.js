/* Upcoming Expenses: "What is my money already needed for, and when?"
   The month calendar is the page. Every figure comes from S.schedule(), which merges bills
   already paid (transactions) with scheduled ones, recurring expenses projected forward. */
SW.pages = SW.pages || {};
(function () {
  const F = SW.fmt, S = SW.store, ui = SW.ui, I = SW.icon;
  const SEED = SW.seed;
  const REPEAT = { none: 'One-time', monthly: 'Every month', yearly: 'Every year' };
  const STATUS = { paid: 'Paid', upcoming: 'Upcoming', overdue: 'Overdue' };
  const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  let view = S.CUR_MONTH;   // month shown, 'YYYY-MM'
  let sel = S.TODAY;        // selected day, ISO
  let root = null;

  const monthOf = iso => iso.slice(0, 7);
  const longDay = iso => { const d = F.d(iso); return `${F.WEEKDAYS[d.getDay()]}, ${d.getDate()} ${F.MONTHS_LONG[d.getMonth()]}`; };
  const shortName = n => n.split(' · ')[0].replace(/\s*\(.*\)$/, '');
  const mark = st => `<i class="cal-mark is-${st}" aria-hidden="true"></i>`;

  /* ---------- Summary: only what still needs money, what's late, what's done ---------- */
  function summaryHTML(sum) {
    const monthName = S.monthName(view, true);
    const n = c => `${c} payment${c === 1 ? '' : 's'}`;
    return `<section class="cal-summary" aria-label="${monthName} payment summary">
      <div class="cal-fig lead"><div class="k">Still to pay in ${monthName}</div><div class="v num">${F.inr(sum.upcoming.amount)}</div>
        <div class="s">${n(sum.upcoming.count)}${sum.overdue.count ? ', not counting overdue' : ''}</div></div>
      <div class="cal-fig${sum.overdue.count ? ' alert' : ''}"><div class="k">${mark('overdue')}Overdue</div><div class="v num">${F.inr(sum.overdue.amount)}</div>
        <div class="s">${sum.overdue.count ? `${n(sum.overdue.count)}${sum.carried ? `, ${sum.carried} carried over` : ''}` : 'Nothing late'}</div></div>
      <div class="cal-fig"><div class="k">${mark('paid')}Paid</div><div class="v num">${F.inr(sum.paid.amount)}</div>
        <div class="s">${n(sum.paid.count)}</div></div>
    </section>`;
  }

  /* ---------- The calendar ---------- */
  function gridHTML(list) {
    const [y, m] = view.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const byDay = {};
    list.forEach(x => (byDay[x.date] = byDay[x.date] || []).push(x));
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div class="cal-cell cal-pad" role="gridcell" aria-hidden="true"></div>');
    for (let d = 1; d <= days; d++) {
      const iso = `${view}-${String(d).padStart(2, '0')}`;
      const items = byDay[iso] || [];
      const wd = (lead + d - 1) % 7;
      const total = items.reduce((a, x) => a + x.amount, 0);
      const cls = ['cal-cell', 'cal-day'];
      if (wd >= 5) cls.push('weekend');
      if (iso === S.TODAY) cls.push('today');
      if (iso === sel) cls.push('selected');
      if (items.some(x => x.status === 'overdue')) cls.push('has-overdue');
      else if (items.length && items.every(x => x.status === 'paid')) cls.push('all-paid');
      const label = `${longDay(iso)}${iso === S.TODAY ? ', today' : ''}. ${items.length ? `${items.length} payment${items.length > 1 ? 's' : ''}, ${F.inr(total)}: ${items.map(x => `${x.name}, ${STATUS[x.status]}`).join('; ')}` : 'No payments'}`;
      const shown = items.slice(0, 2);
      cells.push(`<div class="cal-cell-wrap" role="gridcell">
        <button type="button" class="${cls.join(' ')}" data-day="${iso}" tabindex="${iso === sel ? 0 : -1}" aria-pressed="${iso === sel}" aria-label="${F.esc(label)}">
          <span class="cal-num">${d}</span>
          ${total ? `<span class="cal-total num">${F.inrc(total, total < 1e4 ? 1 : 0)}</span>` : ''}
          ${items.length ? `<span class="cal-items">${shown.map(x => `<span class="cal-item is-${x.status}">${mark(x.status)}<span class="t">${F.esc(shortName(x.name))}</span></span>`).join('')}${items.length > 2 ? `<span class="cal-more">+${items.length - 2} more</span>` : ''}</span>
          <span class="cal-dots" aria-hidden="true">${items.slice(0, 4).map(x => mark(x.status)).join('')}</span>` : ''}
        </button></div>`);
    }
    const tail = (7 - (cells.length % 7)) % 7;
    for (let i = 0; i < tail; i++) cells.push('<div class="cal-cell cal-pad" role="gridcell" aria-hidden="true"></div>');
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      // Week total: the days of this month in the row
      const first = i - lead + 1, last = Math.min(days, first + 6);
      const inWeek = list.filter(x => { const d = +x.date.slice(8); return x.date.slice(0, 7) === view && d >= Math.max(1, first) && d <= last; });
      const due = inWeek.filter(x => x.status !== 'paid').reduce((a, x) => a + x.amount, 0);
      const paid = inWeek.filter(x => x.status === 'paid').reduce((a, x) => a + x.amount, 0);
      const late = inWeek.some(x => x.status === 'overdue');
      const wk = `<div class="cal-wk${late ? ' late' : ''}${!due && paid ? ' done' : ''}" role="gridcell">${due || paid ? `<span class="v num">${F.inrc(due || paid, (due || paid) < 1e4 ? 1 : 0)}</span><span class="s">${due ? (late ? 'incl. overdue' : 'to pay') : 'paid'}</span>` : '<span class="s">—</span>'}</div>`;
      rows.push(`<div class="cal-row" role="row">${cells.slice(i, i + 7).join('')}${wk}</div>`);
    }
    return `<div class="cal-grid" role="grid" aria-label="${S.monthName(view, true)} ${y} payments">
      <div class="cal-row cal-week" role="row">${WEEK.map(w => `<div class="cal-wd" role="columnheader"><span aria-hidden="true">${w}</span><span class="sr-only">${w}</span></div>`).join('')}<div class="cal-wd cal-wk-h" role="columnheader">Week</div></div>
      ${rows.join('')}
    </div>`;
  }

  /* ---------- The selected day ---------- */
  function entryHTML(x) {
    const meta = [x.category, REPEAT[x.repeat] || 'One-time'];
    let state = '';
    if (x.status === 'paid') state = x.paidOn && x.paidOn !== x.date ? `Paid on ${F.short(x.paidOn)}` : 'Paid';
    else if (x.status === 'overdue') state = `${F.daysBetween(x.date, S.TODAY)} day${F.daysBetween(x.date, S.TODAY) === 1 ? '' : 's'} late`;
    else state = F.rel(x.date, S.TODAY).replace(/^./, c => c.toUpperCase());
    const actions = x.status === 'paid' ? `<a class="btn btn-ghost btn-sm" href="#/transactions">View</a>`
      : `${x.next ? `<button type="button" class="btn btn-secondary btn-sm" data-paid="${x.upId}">${I('check', 14)}Mark paid</button>` : `<span class="cal-later">Pay the ${F.short(S.state.upcoming.find(u => u.id === x.upId).due)} one first</span>`}
         <button type="button" class="icon-btn sm" data-edit="${x.upId}" aria-label="Edit ${F.esc(x.name)}">${I('edit', 16)}</button>
         <button type="button" class="icon-btn sm" data-del="${x.upId}" aria-label="Delete ${F.esc(x.name)}">${I('trash', 16)}</button>`;
    return `<li class="cal-entry is-${x.status}">
      ${mark(x.status)}
      <div class="grow"><div class="li-title">${F.esc(x.name)}</div>
        <div class="li-sub"><span class="cal-state">${state}</span> · ${meta.map(F.esc).join(' · ')}</div></div>
      <div class="li-amt">${x.estimate ? '~' : ''}${F.inr(x.amount)}</div>
      <div class="cal-entry-actions">${actions}</div>
    </li>`;
  }

  function dayHTML(list) {
    const items = list.filter(x => x.date === sel);
    const total = items.reduce((a, x) => a + x.amount, 0);
    const d = F.d(sel);
    const due = items.filter(x => x.status !== 'paid').reduce((a, x) => a + x.amount, 0);
    return `<div class="cal-dayhead">
        <div class="cal-daynum num" aria-hidden="true">${d.getDate()}</div>
        <div class="cal-dayttl"><h2 class="cal-side-title" id="day-h">${longDay(sel)}</h2>
          <div class="cal-side-desc">${sel === S.TODAY ? 'Today' : F.rel(sel, S.TODAY).replace(/^./, c => c.toUpperCase())}${items.length ? ` · ${items.length} payment${items.length > 1 ? 's' : ''}` : ''}</div></div>
        ${items.length ? `<div class="cal-daytotal"><span class="v num">${F.inr(total)}</span><span class="s">${due ? (due === total ? 'to pay' : `${F.inr(due)} to pay`) : 'all paid'}</span></div>` : ''}
      </div>
      ${items.length ? `<ul class="list cal-entries">${items.map(entryHTML).join('')}</ul>`
        : `<p class="cal-none">Nothing is due on this day.</p>`}
      <div class="cal-dayfoot"><button type="button" class="link" data-action="new-day">${I('plus', 14)}Add an expense on ${F.short(sel)}</button></div>`;
  }

  /* ---------- What's next, whatever month is on screen ---------- */
  function nextHTML() {
    const list = S.upcomingSorted();
    const shown = list.slice(0, 5);
    const m = S.moneyMap();
    if (!list.length) return '';
    return `<div class="cal-side-head"><h2 class="cal-side-title" id="next-h">Next payments</h2>
        <p class="cal-side-desc">${F.inr(m.bills)} due before payday on ${F.short(m.payday)}</p></div>
      <ul class="list cal-next">${shown.map(u => {
        const st = S.isOverdue(u) ? 'overdue' : 'upcoming';
        const d = F.d(u.due);
        return `<li><button type="button" class="cal-next-row" data-jump="${u.due}">
          <span class="cal-next-date${st === 'overdue' ? ' late' : ''}"><b>${d.getDate()}</b>${F.MONTHS[d.getMonth()]}</span>
          <span class="grow"><span class="li-title">${F.esc(u.name)}</span><span class="li-sub">${st === 'overdue' ? `Overdue since ${F.short(u.due)}` : F.rel(u.due, S.TODAY).replace(/^./, c => c.toUpperCase())}</span></span>
          <span class="li-amt">${u.estimate ? '~' : ''}${F.inr(u.amount)}</span></button></li>`;
      }).join('')}</ul>
      ${list.length > shown.length ? `<div class="cal-next-more">${list.length - shown.length} more scheduled after ${F.short(shown[shown.length - 1].due)}</div>` : ''}`;
  }

  /* ---------- Everything that repeats ---------- */
  function recurringHTML() {
    const list = S.upcomingSorted().filter(u => u.repeat !== 'none');
    const once = S.upcomingSorted().filter(u => u.repeat === 'none');
    if (!list.length && !once.length) return '';
    const per = u => u.repeat === 'yearly' ? u.amount / 12 : u.amount;
    const row = u => {
      const late = S.isOverdue(u);
      return `<tr>
        <th scope="row" class="cell-title"><button type="button" class="cal-rec-name" data-jump="${u.due}">${F.esc(u.name)}</button><span class="cell-sub">${F.esc(u.category)}${u.estimate ? ' · estimate' : ''}</span></th>
        <td class="hide-sm">${REPEAT[u.repeat]}</td>
        <td class="r num${late ? ' warn' : ''}">${late ? `Overdue, ${F.short(u.due)}` : F.date(u.due, u.due.slice(0, 4) !== S.TODAY.slice(0, 4))}</td>
        <td class="r amt">${u.estimate ? '~' : ''}${F.inr(u.amount)}</td>
        <td class="r num subtle hide-sm">${u.repeat === 'none' ? '—' : F.inr(per(u))}</td>
        <td class="r hide-sm"><div class="cal-rec-act">
          <button type="button" class="icon-btn sm" data-edit="${u.id}" aria-label="Edit ${F.esc(u.name)}">${I('edit', 16)}</button>
          <button type="button" class="icon-btn sm" data-del="${u.id}" aria-label="Delete ${F.esc(u.name)}">${I('trash', 16)}</button></div></td></tr>`;
    };
    return `<div class="cal-sec-head"><div><h2 class="cal-sec-title" id="rec-h">Scheduled and recurring</h2>
        <p class="cal-sec-desc">${list.length} recurring, averaging <b>${F.inr(S.recurringMonthly())} a month</b>${once.length ? ` · ${once.length} one-time` : ''}</p></div></div>
      <div class="table-wrap cal-rec"><table class="table">
        <thead><tr><th scope="col">Expense</th><th scope="col" class="hide-sm">Repeats</th><th scope="col" class="r">Next due</th><th scope="col" class="r">Amount</th><th scope="col" class="r hide-sm">A month</th><th scope="col" class="hide-sm"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${list.map(row).join('')}${once.length ? `<tr class="group-row"><td colspan="6">One-time</td></tr>${once.map(row).join('')}` : ''}</tbody>
      </table></div>`;
  }

  function headline() {
    const list = S.upcomingSorted();
    const late = list.filter(u => S.isOverdue(u));
    const week = list.filter(u => u.due >= S.TODAY && u.due <= F.addDays(S.TODAY, 7));
    const sum = a => a.reduce((s, u) => s + u.amount, 0);
    if (late.length) return `<b class="warn">${F.inr(sum(late))} is overdue</b>: ${late.map(u => `${F.esc(shortName(u.name))} was due ${F.short(u.due)}`).join(', ')}. ${week.length ? `Another ${F.inr(sum(week))} is due in the next 7 days.` : ''}`;
    if (week.length) return `<b>${F.inr(sum(week))} is due in the next 7 days</b> across ${week.length} payment${week.length > 1 ? 's' : ''}. Money for these isn’t counted as free to spend.`;
    return 'Nothing is due in the next 7 days. Money for scheduled payments isn’t counted as free to spend.';
  }

  function render() {
    const list = S.schedule(view);
    const sum = S.scheduleSummary(view);
    const [y] = view.split('-');
    return `
      ${ui.pageHeader({ title: 'Upcoming Expenses', sub: headline(), actions: `<button class="btn btn-primary" data-action="new">${I('plus', 16)}Add expense</button>` })}
      <div data-summary>${summaryHTML(sum)}</div>
      <div class="cal-layout">
        <section class="cal-panel" aria-labelledby="cal-h">
          <div class="cal-bar">
            <h2 class="cal-month" id="cal-h" aria-live="polite">${S.monthName(view, true)} <span>${y}</span></h2>
            <span class="cal-month-total num">${F.inr(sum.total)} across ${sum.count} payment${sum.count === 1 ? '' : 's'}</span>
            <div class="cal-nav">
              <button type="button" class="btn btn-ghost btn-sm" data-nav="today" ${view === S.CUR_MONTH && sel === S.TODAY ? 'disabled' : ''}>Today</button>
              <button type="button" class="icon-btn" data-nav="-1" aria-label="Previous month">${I('chevronLeft', 18)}</button>
              <button type="button" class="icon-btn" data-nav="1" aria-label="Next month">${I('chevronRight', 18)}</button>
            </div>
          </div>
          <div data-grid>${gridHTML(list)}</div>
          <div class="cal-key" aria-hidden="true">
            <span>${mark('paid')}Paid</span><span>${mark('upcoming')}Upcoming</span><span>${mark('overdue')}Overdue</span><span><i class="cal-mark is-today"></i>Today</span>
          </div>
        </section>
        <aside class="cal-side">
          <section class="cal-daypanel" aria-labelledby="day-h" data-daypanel aria-live="polite">${dayHTML(list)}</section>
          <section class="cal-upnext" aria-labelledby="next-h">${nextHTML()}</section>
        </aside>
      </div>
      <section class="cal-recurring" aria-labelledby="rec-h">${recurringHTML()}</section>
      <p class="hero-note">${I('info', 15)}<span>Recurring expenses are projected into future months from their next due date. Marking one paid records it in Transactions and rolls it to the next month or year.</span></p>`;
  }

  /* ---------- Form ---------- */
  function openForm(existing, presetDue) {
    const u = Object.assign({ name: '', amount: '', due: presetDue || F.addDays(S.TODAY, 7), category: 'Utilities & bills', repeat: 'monthly', estimate: false, remind: S.state.settings.remindDays, method: 'UPI' }, existing || {});
    ui.open({
      title: existing ? 'Edit expense' : 'Add expense',
      desc: existing ? (u.repeat !== 'none' ? 'Changes apply to this and every future repeat.' : '') : 'Money for it is kept aside from what’s free to spend.',
      body: `<form class="form-grid" data-form autocomplete="off" novalidate>
        <label class="field span-2"><span class="field-label">Title</span><input class="input" name="name" value="${F.esc(u.name)}" placeholder="e.g. Semester fees, Rent, Netflix" aria-describedby="e-name" /><span class="field-error" id="e-name" hidden>Add a title.</span></label>
        <label class="field"><span class="field-label">Amount</span>${ui.moneyInput('amount', u.amount, 'placeholder="0" aria-describedby="e-amt"')}<span class="field-error" id="e-amt" hidden>Enter an amount above zero.</span></label>
        <label class="field"><span class="field-label">Due date</span><input class="input" type="date" name="due" value="${u.due}" required /></label>
        <label class="field"><span class="field-label">Category</span><select class="select" name="category">${SEED.CATEGORIES.map(c => `<option ${c.id === u.category ? 'selected' : ''}>${c.id}</option>`).join('')}</select></label>
        <fieldset class="field cal-repeat"><legend class="field-label">Repeats</legend>
          <div class="type-toggle three">${Object.entries(REPEAT).map(([k, l]) => `<label><input type="radio" name="repeat" value="${k}" ${u.repeat === k ? 'checked' : ''} /><span>${l.replace('Every ', '')}</span></label>`).join('')}</div></fieldset>
        <details class="disclosure span-2"><summary><span>More options<span class="sum-sub">Reminder, payment method, estimate</span></span>${I('chevronDown', 18)}</summary>
          <div class="disc-body form-grid">
            <label class="field"><span class="field-label">Remind me</span><select class="select" name="remind">${[['', 'No reminder'], [0, 'On the day'], [1, '1 day before'], [2, '2 days before'], [3, '3 days before'], [7, 'A week before']].map(([v, l]) => `<option value="${v}" ${String(u.remind ?? '') === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <label class="field"><span class="field-label">Pay with</span><select class="select" name="method">${SEED.METHODS.map(x => `<option ${x === u.method ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
            <label class="switch span-2"><input type="checkbox" name="estimate" ${u.estimate ? 'checked' : ''} /><span class="track"></span>The amount is an estimate</label>
          </div></details>
      </form>`,
      foot: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" data-ok>${existing ? 'Save changes' : 'Add expense'}</button>`,
      onMount: (panel, close) => {
        const form = panel.querySelector('[data-form]');
        ui.bindMoney(form);
        panel.querySelector('[data-ok]').addEventListener('click', () => {
          const d = ui.formData(form);
          const amount = ui.money(d.amount);
          const bad = { name: !d.name.trim(), amt: !amount };
          panel.querySelector('#e-name').hidden = !bad.name; form.name.classList.toggle('invalid', bad.name);
          panel.querySelector('#e-amt').hidden = !bad.amt; form.amount.classList.toggle('invalid', bad.amt);
          if (bad.name || bad.amt) { (bad.name ? form.name : form.amount).focus(); return; }
          const row = { name: d.name.trim(), amount, due: d.due || u.due, repeat: d.repeat || 'none', category: d.category, estimate: !!d.estimate, remind: d.remind === '' || d.remind == null ? null : +d.remind, method: d.method || u.method };
          if (existing) Object.assign(S.state.upcoming.find(x => x.id === existing.id), row);
          else S.state.upcoming.push(Object.assign({ id: S.nextId('u', S.state.upcoming) }, row));
          S.state.isNew = false;
          S.save();
          sel = row.due; view = monthOf(row.due);
          close();
          ui.toast(existing ? 'Expense updated' : `${row.name} added for ${F.short(row.due)}`);
        });
      },
      onClose: () => { if (location.hash.startsWith('#/upcoming')) SW.refresh(); }
    });
  }

  /* ---------- Partial updates: selection changes don't rebuild the page ---------- */
  function select(iso, focus) {
    sel = iso;
    const m = monthOf(iso);
    if (m !== view) { view = m; SW.refresh(); if (focus) root.querySelector(`[data-day="${iso}"]`)?.focus(); return; }
    const list = S.schedule(view);
    root.querySelector('[data-grid]').innerHTML = gridHTML(list);
    root.querySelector('[data-daypanel]').innerHTML = dayHTML(list);
    const t = root.querySelector('[data-nav="today"]');
    if (t) t.disabled = view === S.CUR_MONTH && sel === S.TODAY;
    if (focus) root.querySelector(`[data-day="${iso}"]`)?.focus();
  }

  function mount(r) {
    root = r;
    ui.on(root, 'click', '[data-action="new"]', () => openForm(null, sel >= S.TODAY ? sel : undefined));
    ui.on(root, 'click', '[data-action="new-day"]', () => openForm(null, sel));
    ui.on(root, 'click', '[data-day]', (e, b) => select(b.dataset.day));
    ui.on(root, 'click', '[data-jump]', (e, b) => {
      select(b.dataset.jump, true);
      if (b.classList.contains('cal-rec-name')) {
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        root.querySelector('.cal-panel')?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      }
    });
    ui.on(root, 'click', '[data-nav]', (e, b) => {
      const n = b.dataset.nav;
      if (n === 'today') { view = S.CUR_MONTH; sel = S.TODAY; }
      else {
        view = S.addMonths(view, +n);
        // keep the same day number where the month has it
        const [y, m] = view.split('-').map(Number);
        const day = Math.min(F.d(sel).getDate(), new Date(y, m, 0).getDate());
        sel = `${view}-${String(day).padStart(2, '0')}`;
      }
      SW.refresh();
      root.querySelector(`[data-nav="${n === 'today' ? '1' : n}"]`)?.focus();
    });
    root.addEventListener('keydown', e => {
      const b = e.target.closest('[data-day]');
      if (!b) return;
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (step) { e.preventDefault(); select(F.addDays(sel, step), true); }
      else if (e.key === 'Home') { e.preventDefault(); select(`${view}-01`, true); }
      else if (e.key === 'End') { e.preventDefault(); const [y, m] = view.split('-').map(Number); select(`${view}-${new Date(y, m, 0).getDate()}`, true); }
      else if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); root.querySelector(`[data-nav="${e.key === 'PageUp' ? -1 : 1}"]`).click(); }
    });
    ui.on(root, 'click', '[data-edit]', (e, b) => openForm(S.state.upcoming.find(u => u.id === b.dataset.edit)));
    ui.on(root, 'click', '[data-paid]', async (e, b) => {
      const u = S.state.upcoming.find(x => x.id === b.dataset.paid);
      const next = S.advance(u);
      const ok = await ui.confirm({ title: `Mark “${F.esc(u.name)}” as paid?`, text: `${F.inr(u.amount)} will be recorded in Transactions for today${u.estimate ? ' (edit it there if the final amount was different)' : ''}. ${next ? `The next one will be due on ${F.date(next)}.` : 'It will move to your paid payments.'}`, confirmLabel: 'Mark paid' });
      if (!ok) return;
      S.markPaid(u.id); SW.refresh(); ui.toast(`${u.name} marked as paid`);
    });
    ui.on(root, 'click', '[data-del]', async (e, b) => {
      const u = S.state.upcoming.find(x => x.id === b.dataset.del);
      const ok = await ui.confirm({ title: `Delete “${F.esc(u.name)}”?`, text: u.repeat === 'none' ? 'It will be removed from your planned expenses.' : 'This removes the expense and all its future repeats. Past payments stay in Transactions.', confirmLabel: 'Delete', danger: true });
      if (!ok) return;
      S.state.upcoming = S.state.upcoming.filter(x => x.id !== u.id);
      S.save(); SW.refresh(); ui.toast('Expense deleted');
    });
  }

  SW.pages.upcoming = { render, mount, openForm };
})();
