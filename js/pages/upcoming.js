/* Upcoming Expenses: "What is my money already needed for, and when?"
   The month calendar is the page: summary, a seven-column month, the selected day beneath it. Every figure comes from S.schedule(), which merges bills
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

  /* ---------- Summary: the month in four figures and one bar ----------
     The lead figure answers the page's question (what is still to pay this month). Each label
     carries the same mark the calendar uses, so the summary is also the calendar's key. The bar
     is the whole month: paid (grey), overdue (lilac), then what is still ahead (periwinkle). */
  function summaryHTML(sum) {
    const monthName = S.monthName(view, true);
    const n = c => `${c} payment${c === 1 ? '' : 's'}`;
    const pct = v => sum.total ? Math.max(v ? 1.5 : 0, (v / sum.total) * 100).toFixed(2) : 0;
    const bar = `${F.inr(sum.paid.amount)} paid, ${F.inr(sum.overdue.amount)} overdue and ${F.inr(sum.upcoming.amount)} still to pay, of ${F.inr(sum.total)} in ${monthName}`;
    return `<div class="cal-summary" aria-label="${monthName} payment summary">
      <dl class="cal-figs">
        <div class="cal-fig lead"><dt>${mark('upcoming')}Still to pay in ${monthName}</dt><dd class="v num">${F.inr(sum.upcoming.amount)}</dd><dd class="s">${sum.upcoming.count ? n(sum.upcoming.count) : 'Nothing left this month'}${sum.overdue.count ? ', not counting overdue' : ''}</dd></div>
        <div class="cal-fig"><dt>${mark('paid')}Paid</dt><dd class="v num">${F.inr(sum.paid.amount)}</dd><dd class="s">${sum.paid.count ? n(sum.paid.count) : 'None yet'}</dd></div>
        <div class="cal-fig${sum.overdue.count ? ' alert' : ''}"><dt>${mark('overdue')}Overdue</dt><dd class="v num">${F.inr(sum.overdue.amount)}</dd><dd class="s">${sum.overdue.count ? `${n(sum.overdue.count)}${sum.carried ? `, ${sum.carried} carried over` : ''}` : 'Nothing late'}</dd></div>
        <div class="cal-fig"><dt>Total for ${monthName}</dt><dd class="v num">${F.inr(sum.total)}</dd><dd class="s">across ${n(sum.count)}</dd></div>
      </dl>
      <div class="cal-track" role="img" aria-label="${bar}">
        <i class="is-paid" style="width:${pct(sum.paid.amount)}%"></i><i class="is-overdue" style="width:${pct(sum.overdue.amount)}%"></i><i class="is-upcoming" style="width:${pct(sum.upcoming.amount)}%"></i>
      </div>
    </div>`;
  }

  /* ---------- The calendar ----------
     A real month grid: seven equal columns, hairline cell edges, weekends a step darker.
     A day carries its date and, when something is due, that day's total beside it and a chip
     per payment under it (edge colour and shape say paid / still to pay / overdue). Days with
     nothing due stay empty. On a phone the chips fold into small marks.
     The selected day opens in a sheet at the foot of the same panel, so the grid never shifts. */
  const cellAmt = v => v >= 1e5 ? F.inrc(v, 1) : F.inr(v);
  let lastSel = null;       // the day the sheet last showed, so only a new day animates

  function gridHTML(list) {
    const [y, m] = view.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const prevDays = new Date(y, m - 1, 0).getDate();
    const byDay = {};
    list.forEach(x => (byDay[x.date] = byDay[x.date] || []).push(x));
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(`<span class="cal-pad" aria-hidden="true">${prevDays - lead + 1 + i}</span>`);
    for (let d = 1; d <= days; d++) {
      const iso = `${view}-${String(d).padStart(2, '0')}`;
      const items = byDay[iso] || [];
      const wd = (lead + d - 1) % 7;
      const total = items.reduce((a, x) => a + x.amount, 0);
      const due = items.filter(x => x.status !== 'paid').reduce((a, x) => a + x.amount, 0);
      const state = !items.length ? '' : items.some(x => x.status === 'overdue') ? 'overdue' : items.every(x => x.status === 'paid') ? 'paid' : 'upcoming';
      const cls = ['cal-day'];
      if (wd >= 5) cls.push('weekend');
      if (iso === S.TODAY) cls.push('today');
      if (iso < S.TODAY) cls.push('past');
      if (iso === sel) cls.push('selected');
      if (state) cls.push(`has-items is-${state}`);
      const label = `${longDay(iso)}${iso === S.TODAY ? ', today' : ''}. ${items.length ? `${items.length} payment${items.length > 1 ? 's' : ''}, ${F.inr(total)}: ${items.map(x => `${x.name}, ${STATUS[x.status]}`).join('; ')}` : 'No payments'}`;
      // Order marks by urgency so a late payment is never hidden behind the "+n"
      const order = { overdue: 0, upcoming: 1, paid: 2 };
      const marks = items.slice().sort((a, b) => order[a.status] - order[b.status]);
      const shown = marks.slice(0, items.length > 2 ? 1 : 2);
      const rest = items.length - shown.length;
      cells.push(`<button type="button" class="${cls.join(' ')}" data-day="${iso}" tabindex="${iso === sel ? 0 : -1}" aria-pressed="${iso === sel}" aria-label="${F.esc(label)}">
          <span class="cal-top"><span class="cal-num">${d}</span>${items.length ? `<span class="cal-amt num" aria-hidden="true">${cellAmt(due || total)}</span>` : ''}</span>
          ${items.length ? `<span class="cal-info" aria-hidden="true">
            <span class="cal-marks">${marks.slice(0, 3).map(x => mark(x.status)).join('')}${items.length > 3 ? `<span class="cal-more">+${items.length - 3}</span>` : ''}</span>
            <span class="cal-chips">${shown.map(x => `<span class="cal-chip is-${x.status}">${F.esc(shortName(x.name))}</span>`).join('')}${rest > 0 ? `<span class="cal-rest">+${rest} more</span>` : ''}</span>
          </span>` : ''}
        </button>`);
    }
    const tail = (7 - (cells.length % 7)) % 7;
    for (let i = 0; i < tail; i++) cells.push(`<span class="cal-pad" aria-hidden="true">${i + 1}</span>`);
    const enter = lastSel !== null && lastSel !== sel;
    lastSel = sel;
    return `<div class="cal-plate">
        <div class="cal-head" aria-hidden="true">${WEEK.map((w, i) => `<span class="${i >= 5 ? 'weekend' : ''}">${w}</span>`).join('')}</div>
        <div class="cal-days" role="group" aria-label="${S.monthName(view, true)} ${y} payments" style="--rows:${cells.length / 7}">${cells.join('')}</div>
        ${monthOf(sel) === view ? `<section class="cal-sheet${enter ? ' enter' : ''}" aria-labelledby="day-h">${dayHTML(list)}</section>` : ''}
      </div>`;
  }

  /* ---------- The selected day ---------- */
  function entryHTML(x) {
    const meta = [x.category, REPEAT[x.repeat] || 'One-time'];
    let state = '';
    if (x.status === 'paid') state = x.paidOn && x.paidOn !== x.date ? `Paid on ${F.short(x.paidOn)}` : 'Paid';
    else if (x.status === 'overdue') state = `${F.daysBetween(x.date, S.TODAY)} day${F.daysBetween(x.date, S.TODAY) === 1 ? '' : 's'} late`;
    else state = F.rel(x.date, S.TODAY).replace(/^./, c => c.toUpperCase());
    const primary = x.status === 'paid' ? `<a class="btn btn-ghost btn-sm" href="#/transactions">View in Transactions</a>`
      : x.next ? `<button type="button" class="btn ${x.status === 'overdue' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-paid="${x.upId}">${I('check', 14)}Mark paid</button>`
      : `<span class="cal-later">Pay the ${F.short(S.state.upcoming.find(u => u.id === x.upId).due)} one first</span>`;
    const tools = x.status === 'paid' ? '' : `<span class="cal-tools">
         <button type="button" class="icon-btn sm" data-edit="${x.upId}" aria-label="Edit ${F.esc(x.name)}">${I('edit', 16)}</button>
         <button type="button" class="icon-btn sm" data-del="${x.upId}" aria-label="Delete ${F.esc(x.name)}">${I('trash', 16)}</button></span>`;
    return `<li class="cal-entry is-${x.status}">
      ${mark(x.status)}
      <div class="cal-entry-main"><div class="li-title">${F.esc(x.name)}</div>
        <div class="li-sub"><span class="cal-state">${state}</span> · ${meta.map(F.esc).join(' · ')}</div></div>
      <div class="li-amt">${x.estimate ? '~' : ''}${F.inr(x.amount)}</div>
      <div class="cal-entry-actions">${primary}${tools}</div>
    </li>`;
  }

  function dayHTML(list) {
    const items = list.filter(x => x.date === sel);
    const total = items.reduce((a, x) => a + x.amount, 0);
    const due = items.filter(x => x.status !== 'paid').reduce((a, x) => a + x.amount, 0);
    const when = sel === S.TODAY ? 'Today' : F.rel(sel, S.TODAY).replace(/^./, c => c.toUpperCase());
    const add = `<button type="button" class="link cal-add" data-action="new-day">${I('plus', 14)}Add an expense on ${F.short(sel)}</button>`;
    return `<div class="cal-dayhead">
        <div class="grow"><h3 class="cal-day-title" id="day-h">${longDay(sel)}</h3>
          <p class="cal-day-desc">${when}${items.length ? ` · ${items.length} payment${items.length > 1 ? 's' : ''}` : ' · Nothing is due'}</p></div>
        ${items.length ? `<div class="cal-daytotal"><span class="v num">${F.inr(total)}</span><span class="s">${due ? (due === total ? 'to pay' : `${F.inr(due)} to pay`) : 'all paid'}</span></div>` : add}
      </div>
      ${items.length ? `<ul class="list cal-entries">${items.map(entryHTML).join('')}</ul>${add}` : ''}`;
  }

  /* ---------- What's next, whatever month is on screen ---------- */
  function nextHTML() {
    const list = S.upcomingSorted();
    const shown = list.slice(0, 5);
    const m = S.moneyMap();
    if (!list.length) return '';
    return `<div class="cal-sec-head"><div><h2 class="cal-sec-title" id="next-h">Next payments</h2>
        <p class="cal-sec-desc"><b>${F.inr(m.bills)}</b> is due before payday on ${F.short(m.payday)}</p></div></div>
      <ul class="list cal-next">${shown.map(u => {
        const st = S.isOverdue(u) ? 'overdue' : 'upcoming';
        const d = F.d(u.due);
        return `<li><button type="button" class="cal-next-row${st === 'overdue' ? ' late' : ''}" data-jump="${u.due}">
          <span class="cal-next-date"><b>${d.getDate()}</b>${F.MONTHS[d.getMonth()]}</span>
          <span class="cal-next-name"><span class="li-title">${F.esc(u.name)}</span><span class="li-sub">${st === 'overdue' ? `Overdue since ${F.short(u.due)}` : F.rel(u.due, S.TODAY).replace(/^./, c => c.toUpperCase())}</span></span>
          <span class="cal-next-cat">${F.esc(u.category)}</span>
          <span class="cal-next-rep">${REPEAT[u.repeat] || 'One-time'}</span>
          <span class="li-amt">${u.estimate ? '~' : ''}${F.inr(u.amount)}</span></button></li>`;
      }).join('')}</ul>
      ${list.length > shown.length ? `<p class="cal-next-more">${list.length - shown.length} more scheduled after ${F.short(shown[shown.length - 1].due)}, all listed below.</p>` : ''}`;
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
        <thead><tr><th scope="col">Expense</th><th scope="col" class="hide-sm">Repeats</th><th scope="col" class="r">Next due</th><th scope="col" class="r">Amount</th><th scope="col" class="r hide-sm">Per month</th><th scope="col" class="hide-sm"><span class="sr-only">Actions</span></th></tr></thead>
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
      <section class="cal-panel" aria-labelledby="cal-h">
        <div class="cal-bar">
          <h2 class="cal-month" id="cal-h" aria-live="polite">${S.monthName(view, true)} <span>${y}</span></h2>
          <div class="cal-nav">
            <button type="button" class="btn btn-secondary btn-sm" data-nav="today" ${view === S.CUR_MONTH && sel === S.TODAY ? 'disabled' : ''}>Today</button>
            <button type="button" class="icon-btn" data-nav="-1" aria-label="Previous month">${I('chevronLeft', 18)}</button>
            <button type="button" class="icon-btn" data-nav="1" aria-label="Next month">${I('chevronRight', 18)}</button>
          </div>
        </div>
        <div data-summary>${summaryHTML(sum)}</div>
        <div data-grid>${gridHTML(list)}</div>
        <p class="sr-only" aria-live="polite" data-announce></p>
      </section>
      <section class="cal-upnext" aria-labelledby="next-h">${nextHTML()}</section>
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
    const items = list.filter(x => x.date === iso);
    const say = root.querySelector('[data-announce]');
    if (say) say.textContent = `${longDay(iso)}: ${items.length ? `${items.length} payment${items.length > 1 ? 's' : ''}, ${F.inr(items.reduce((a, x) => a + x.amount, 0))}` : 'nothing due'}`;
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
      // The calendar sits above both lists: bring the opened day into view
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      root.querySelector('.cal-sheet')?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
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
