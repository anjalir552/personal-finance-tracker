/* Transactions: record money in and out, then find anything again.
   Every figure in Scopewise is worked out from this list, so a change here updates every page. */
SW.pages = SW.pages || {};
(function () {
  const F = SW.fmt, S = SW.store, ui = SW.ui, I = SW.icon;
  const SEED = SW.seed;
  const PAGE = 40;
  const DEFAULT = () => ({ type: 'all', cat: 'all', method: 'all', kind: 'all', month: S.CUR_MONTH, q: '' });
  let f = DEFAULT();
  let shown = PAGE;

  const KIND = { essential: 'Essential', flexible: 'Non-essential', unexpected: 'Unexpected' };
  const kindOf = t => t.type !== 'expense' ? null : t.emergency || t.unplanned ? 'unexpected' : S.cat(t.category).essential ? 'essential' : 'flexible';

  function filtered() {
    const q = f.q.trim().toLowerCase();
    return S.state.transactions
      .filter(t => f.month === 'all' || t.date.slice(0, 7) === f.month)
      .filter(t => f.type === 'all' || t.type === f.type || (f.type === 'transfer' && t.type === 'withdrawal'))
      .filter(t => f.cat === 'all' || t.category === f.cat)
      .filter(t => f.method === 'all' || t.method === f.method)
      .filter(t => f.kind === 'all' || kindOf(t) === f.kind)
      .filter(t => !q || `${t.desc} ${t.category} ${t.method} ${t.note || ''} ${F.num(t.amount)} ${t.amount}`.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }

  const activeCount = () => ['cat', 'method', 'kind'].filter(k => f[k] !== 'all').length + (f.month !== S.CUR_MONTH ? 1 : 0);

  function summaryHTML(list) {
    const sum = fn => list.filter(fn).reduce((a, t) => a + t.amount, 0);
    const label = f.month === 'all' ? 'All time' : `${S.monthName(f.month, true)} ${f.month.slice(0, 4)}`;
    const unexpected = sum(t => t.type === 'expense' && (t.unplanned || t.emergency));
    return `<div class="stat-strip" style="--cols:4">
      <div class="stat"><div class="stat-label">Money in · ${label}</div><div class="stat-value num pos">+${F.inr(sum(t => t.type === 'income'))}</div></div>
      <div class="stat"><div class="stat-label">Money out</div><div class="stat-value num">${F.inr(sum(t => t.type === 'expense'))}</div><div class="stat-meta">${F.inr(sum(t => t.type === 'expense' && S.cat(t.category).essential && !t.emergency))} essential</div></div>
      <div class="stat"><div class="stat-label">Unexpected</div><div class="stat-value num">${F.inr(unexpected)}</div><div class="stat-meta">Emergencies and unplanned</div></div>
      <div class="stat"><div class="stat-label">Moved to savings</div><div class="stat-value num">${F.inr(sum(t => t.type === 'transfer') - sum(t => t.type === 'withdrawal'))}</div></div>
    </div>`;
  }

  function amountHTML(t) {
    if (t.type === 'income') return `<span class="amt in">+${F.inr(t.amount)}</span>`;
    if (t.type === 'withdrawal') return `<span class="amt in">+${F.inr(t.amount)}</span>`;
    if (t.type === 'transfer') return `<span class="amt move">${F.inr(t.amount)}</span>`;
    return `<span class="amt">−${F.inr(t.amount)}</span>`;
  }
  function kindHTML(t) {
    if (t.type === 'income') return '<span class="tx-kind">Income</span>';
    if (t.type === 'transfer') return '<span class="tx-kind">To savings</span>';
    if (t.type === 'withdrawal') return '<span class="tx-kind">From savings</span>';
    if (t.emergency) return '<span class="badge warn">Emergency</span>';
    if (t.unplanned) return '<span class="badge info">Unplanned</span>';
    return `<span class="tx-kind${S.cat(t.category).essential ? ' ess' : ''}">${S.cat(t.category).essential ? 'Essential' : 'Non-essential'}</span>`;
  }

  function listHTML() {
    const list = filtered();
    if (!S.state.transactions.length) return ui.empty({ icon: 'transactions', title: 'No transactions yet', text: 'Add your income and what you spend. Even a week of entries is enough to start seeing patterns.', action: `<button class="btn btn-primary btn-sm" data-action="add">${I('plus', 15)}Add your first transaction</button>` });
    if (!list.length) return ui.empty({ icon: 'search', title: 'Nothing matches these filters', text: 'Try another month, category or search term.', action: `<button class="btn btn-secondary btn-sm" data-action="clear">Clear filters</button>` });
    const page = list.slice(0, shown);
    let lastDate = '';
    const rows = page.map(t => {
      let group = '';
      if (t.date !== lastDate) {
        lastDate = t.date;
        const rel = t.date === S.TODAY ? 'Today · ' : F.daysBetween(t.date, S.TODAY) === 1 ? 'Yesterday · ' : '';
        group = `<tr class="group-row"><td colspan="6">${rel}${F.WEEKDAYS[F.d(t.date).getDay()]}, ${F.date(t.date)}</td></tr>`;
      }
      const sub = t.type === 'transfer' ? 'To savings goal' : t.type === 'withdrawal' ? 'From savings goal' : t.category;
      return `${group}<tr>
        <td><div class="cell-title">${F.esc(t.desc)}</div><div class="cell-sub">${F.esc(sub)}<span class="show-on-sm"> · ${F.esc(t.method)}</span>${t.note ? ` · ${F.esc(t.note)}` : ''}</div></td>
        <td class="hide-sm">${t.type === 'expense' ? ui.catChip(t.category) : `<span class="chip">${F.esc(t.type === 'income' ? t.category : 'Savings')}</span>`}</td>
        <td class="hide-sm">${kindHTML(t)}</td>
        <td class="hide-sm muted">${F.esc(t.method)}</td>
        <td class="r">${amountHTML(t)}</td>
        <td style="width:84px"><div class="row-actions">
          ${t.type === 'transfer' || t.type === 'withdrawal' ? '' : `<button class="icon-btn sm" data-edit="${t.id}" aria-label="Edit ${F.esc(t.desc)}">${I('edit', 16)}</button>`}
          <button class="icon-btn sm" data-del="${t.id}" aria-label="Delete ${F.esc(t.desc)}">${I('trash', 16)}</button></div></td>
      </tr>`;
    }).join('');
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>Description</th><th class="hide-sm">Category</th><th class="hide-sm">Type</th><th class="hide-sm">Paid with</th><th class="r">Amount</th><th><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      <div class="panel-foot"><span>Showing ${page.length} of ${list.length} transaction${list.length === 1 ? '' : 's'}</span>
        ${list.length > shown ? `<button class="btn btn-secondary btn-sm" data-action="more">Show ${Math.min(PAGE, list.length - shown)} more</button>` : ''}</div>`;
  }

  function render() {
    const months = S.months().slice().reverse();
    const cats = [...SEED.CATEGORIES.map(c => c.id), ...SEED.INCOME_CATEGORIES];
    const opt = (v, l, cur) => `<option value="${F.esc(v)}" ${cur === v ? 'selected' : ''}>${F.esc(l)}</option>`;
    return `
      ${ui.pageHeader({
        title: 'Transactions',
        sub: 'Everything that came in and went out. Your balance, Safe-to-Spend and every chart in Scopewise are worked out from this list.',
        actions: `<button class="btn btn-secondary" data-action="export">${I('download', 16)}Export CSV</button>
          <button class="btn btn-secondary" data-emergency>${I('alert', 16)}Unexpected expense</button>
          <button class="btn btn-primary" data-action="add">${I('plus', 16)}Add transaction</button>`
      })}
      ${SW.flows.alertHTML('transactions')}
      <section class="panel" aria-label="Transaction history">
        <div data-summary>${summaryHTML(filtered())}</div>
        <div class="toolbar" style="border-top:1px solid var(--rule)">
          <label class="search"><span class="sr-only">Search transactions</span>${I('search', 16)}<input type="search" placeholder="Search, e.g. Swiggy or 3,000" value="${F.esc(f.q)}" data-q /></label>
          ${ui.segmented('ttype', [{ value: 'all', label: 'All' }, { value: 'income', label: 'Money in' }, { value: 'expense', label: 'Money out' }, { value: 'transfer', label: 'Savings' }], f.type, 'Transaction type')}
          <span class="grow hide-sm"></span>
          <button type="button" class="btn btn-secondary btn-sm filters-toggle" data-action="filters" aria-expanded="false">${I('filter', 15)}Filters${activeCount() ? ` · ${activeCount()}` : ''}</button>
          <select class="select sm" data-f="month" aria-label="Month">${opt('all', 'All months', f.month)}${months.map(k => opt(k, `${S.monthName(k, true)} ${k.slice(0, 4)}`, f.month)).join('')}</select>
          <select class="select sm" data-f="kind" aria-label="Essential or not">${opt('all', 'Any type', f.kind)}${Object.entries(KIND).map(([k, l]) => opt(k, l, f.kind)).join('')}</select>
          <select class="select sm" data-f="cat" aria-label="Category">${opt('all', 'All categories', f.cat)}${cats.map(c => opt(c, c, f.cat)).join('')}</select>
          <select class="select sm" data-f="method" aria-label="Payment method">${opt('all', 'Any payment method', f.method)}${SEED.METHODS.map(x => opt(x, x, f.method)).join('')}</select>
        </div>
        <div data-list>${listHTML()}</div>
      </section>
      <p class="hero-note">${I('shield', 15)}<span>Aditi and her transactions are fictional demonstration data. No bank account is connected; entries you add are saved in this browser only.</span></p>`;
  }

  /** Add or edit form, shared with Overview */
  function openForm(existing) {
    const t = existing ? Object.assign({}, existing) : { type: 'expense', date: S.TODAY, method: 'UPI', category: 'Food & dining', desc: '', amount: '' };
    const catOptions = type => (type === 'income' ? SEED.INCOME_CATEGORIES : SEED.CATEGORIES.map(c => c.id))
      .map(c => `<option ${c === t.category ? 'selected' : ''}>${F.esc(c)}</option>`).join('');
    if (t.type === 'transfer' || t.type === 'withdrawal') { ui.toast('Savings transfers are managed from Savings Goals', 'info'); return; }
    const kind = t.emergency ? 'emergency' : t.unplanned ? 'unplanned' : 'planned';
    ui.open({
      title: existing ? 'Edit transaction' : 'Add transaction',
      desc: existing ? 'Every figure updates when you save.' : 'Your balance, Safe-to-Spend and spending figures update straight away.',
      body: `<form class="form-grid" data-form autocomplete="off" novalidate>
        <div class="type-toggle span-2" role="radiogroup" aria-label="Type">
          <label><input type="radio" name="type" value="expense" ${t.type === 'expense' ? 'checked' : ''} /><span>${I('arrowUp', 16)}Money out</span></label>
          <label><input type="radio" name="type" value="income" ${t.type === 'income' ? 'checked' : ''} /><span>${I('arrowDown', 16)}Money in</span></label>
        </div>
        <label class="field span-2"><span class="field-label">Description</span><input class="input" name="desc" value="${F.esc(t.desc)}" placeholder="e.g. Swiggy dinner" aria-describedby="e-desc" /><span class="field-error" id="e-desc" hidden></span></label>
        <label class="field"><span class="field-label">Amount</span>${ui.moneyInput('amount', t.amount, 'placeholder="0" aria-describedby="e-amount"')}<span class="field-error" id="e-amount" hidden></span></label>
        <label class="field"><span class="field-label">Date</span><input class="input" type="date" name="date" value="${t.date}" max="${S.TODAY}" aria-describedby="e-date" /><span class="field-error" id="e-date" hidden></span></label>
        <label class="field"><span class="field-label">Category</span><select class="select" name="category" data-cats>${catOptions(t.type)}</select></label>
        <label class="field"><span class="field-label">Paid with</span><select class="select" name="method">${SEED.METHODS.map(x => `<option ${x === t.method ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <fieldset class="field span-2 tx-class" data-class ${t.type === 'income' ? 'hidden' : ''}><legend class="field-label">Was it planned?</legend>
          <div class="type-toggle three">
            <label><input type="radio" name="kind" value="planned" ${kind === 'planned' ? 'checked' : ''} /><span>Planned</span></label>
            <label><input type="radio" name="kind" value="unplanned" ${kind === 'unplanned' ? 'checked' : ''} /><span>Unplanned</span></label>
            <label><input type="radio" name="kind" value="emergency" ${kind === 'emergency' ? 'checked' : ''} /><span>Emergency</span></label>
          </div>
          <span class="field-hint" data-class-hint></span></fieldset>
        <p class="callout span-2 tx-impact" data-impact aria-live="polite" hidden></p>
        <label class="field span-2"><span class="field-label">Note <span class="opt">Optional</span></span><input class="input" name="note" value="${F.esc(t.note || '')}" placeholder="Anything to remember about it" /></label>
      </form>`,
      foot: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" data-ok>${existing ? 'Save changes' : 'Add transaction'}</button>`,
      onMount: (panel, close) => {
        const form = panel.querySelector('[data-form]');
        const impact = panel.querySelector('[data-impact]');
        ui.bindMoney(form);
        const HINT = { planned: 'Counts against its category’s budget.', unplanned: 'Still counts against its category, and is flagged so you can spot surprises.', emergency: 'Paid from your monthly buffer first, kept apart from lifestyle spending.' };
        const live = () => {
          const d = ui.formData(form);
          const amount = ui.money(d.amount);
          panel.querySelector('[data-class]').hidden = d.type === 'income';
          panel.querySelector('[data-class-hint]').textContent = HINT[d.kind || 'planned'];
          if (d.type !== 'expense' || !amount) { impact.hidden = true; return; }
          const m = S.moneyMap();
          // what the transaction changes, ignoring the existing version when editing
          const prev = existing && existing.type === 'expense' && existing.date.slice(0, 7) === S.CUR_MONTH ? existing.amount : 0;
          const thisMonth = (d.date || S.TODAY).slice(0, 7) === S.CUR_MONTH;
          const r = S.monthBudget().find(x => x.cat === d.category);
          const lines = [];
          if (thisMonth && d.kind !== 'emergency' && r && S.cat(d.category).kind !== 'bill') {
            const after = r.spent - (existing && existing.category === d.category && !existing.emergency ? prev : 0) + amount;
            lines.push(after > r.budget ? `<b class="warn">${F.esc(d.category)} would be ${F.inr(after - r.budget)} over</b> its ${F.inr(r.budget)} budget (${F.inr(after)} spent).` : `${F.esc(d.category)}: ${F.inr(after)} of ${F.inr(r.budget)}, ${F.inr(r.budget - after)} left.`);
          }
          if (thisMonth) {
            const delta = amount - prev;
            const fromBuffer = d.kind === 'emergency' ? Math.min(m.buffer, delta) : 0;
            const catLeft = r && d.kind !== 'emergency' && S.cat(d.category).kind !== 'bill' ? Math.max(0, r.left + (existing && existing.category === d.category ? prev : 0)) : 0;
            // Safe-to-Spend changes by the part not already reserved for this category
            const reserved = r && r.kind === 'everyday' && d.kind !== 'emergency' ? Math.min(catLeft, delta) : 0;
            const sts = m.free - (delta - fromBuffer - reserved);
            lines.push(`Safe to spend: ${F.inr(m.free)} → <b class="${sts < 0 ? 'warn' : ''}">${F.inr(sts)}</b>${fromBuffer ? `, with ${F.inr(fromBuffer)} from the buffer` : ''}.`);
          }
          if (amount > S.balance() + (prev || 0)) lines.push(`<span class="warn">That’s more than your balance of ${F.inr(S.balance())}.</span> Fine if it went on a credit card.`);
          impact.hidden = !lines.length;
          impact.innerHTML = `${I('info', 16)}<span>${lines.join(' ')}</span>`;
        };
        form.addEventListener('change', e => {
          if (e.target.name === 'type') {
            const isInc = e.target.value === 'income';
            t.category = isInc ? 'Salary' : 'Food & dining';
            form.querySelector('[data-cats]').innerHTML = catOptions(isInc ? 'income' : 'expense');
          }
          live();
        });
        form.addEventListener('input', live);
        live();
        const err = (name, msg) => { const el = panel.querySelector('#e-' + name); el.textContent = msg || ''; el.hidden = !msg; form[name].classList.toggle('invalid', !!msg); };
        const submit = async () => {
          const d = ui.formData(form);
          const row = { date: d.date, type: d.type, desc: d.desc.trim(), category: d.category, amount: ui.money(d.amount), method: d.method, note: d.note.trim() };
          if (d.type === 'expense' && d.kind !== 'planned') row.unplanned = true;
          if (d.type === 'expense' && d.kind === 'emergency') row.emergency = true;
          const errors = S.validateTx(row);
          ['desc', 'amount', 'date'].forEach(k => err(k, errors[k]));
          if (Object.keys(errors).length) { form[Object.keys(errors)[0]]?.focus(); return; }
          const dup = S.findDuplicate(row, existing && existing.id);
          if (dup && !(await ui.confirm({ title: 'This looks like a duplicate', text: `“${F.esc(dup.desc)}” for ${F.inr(dup.amount)} is already recorded on ${F.date(dup.date)}. Add it again?`, confirmLabel: 'Add anyway' }))) return;
          const before = S.issues();
          if (existing) S.updateTransaction(existing.id, row); else S.addTransaction(row);
          close();
          const after = S.issues();
          const r = S.monthBudget().find(x => x.cat === row.category);
          const over = row.type === 'expense' && !row.emergency && row.date.slice(0, 7) === S.CUR_MONTH && r && r.kind !== 'bill' && r.over > 0;
          const label = row.emergency ? 'Emergency' : row.unplanned ? 'Unplanned expense' : row.type === 'income' ? 'Income' : 'Expense';
          ui.toast(existing ? 'Transaction updated' : `${label} of ${F.inr(row.amount)} added${over ? `. ${row.category} is now ${F.inr(r.over)} over budget` : ''}`, over || row.emergency ? 'alert' : 'checkCircle');
          // Recovery is offered when this entry is what opened a gap, or an emergency made it bigger.
          // Otherwise the alert on Overview, Transactions and Spending stays available.
          const thisMonth = row.date.slice(0, 7) === S.CUR_MONTH && row.type === 'expense';
          if (thisMonth && after.needsRecovery && (!before.needsRecovery || (row.emergency && after.gap > before.gap))) {
            setTimeout(() => SW.flows.openRecovery(row.emergency ? 'emergency' : undefined), 250);
          }
        };
        panel.querySelector('[data-ok]').addEventListener('click', submit);
        form.addEventListener('submit', e => { e.preventDefault(); submit(); });
      },
      onClose: () => SW.refresh()
    });
  }

  function mount(root) {
    const listEl = root.querySelector('[data-list]');
    const sumEl = root.querySelector('[data-summary]');
    const update = () => { listEl.innerHTML = listHTML(); sumEl.innerHTML = summaryHTML(filtered()); const b = root.querySelector('[data-action="filters"]'); if (b) b.lastChild.textContent = `Filters${activeCount() ? ` · ${activeCount()}` : ''}`; };
    ui.on(root, 'click', '[data-seg="ttype"] button', (e, b) => {
      f.type = b.dataset.value; shown = PAGE;
      root.querySelectorAll('[data-seg="ttype"] button').forEach(x => x.setAttribute('aria-selected', x === b));
      update();
    });
    root.querySelectorAll('[data-f]').forEach(sel => sel.addEventListener('change', e => { f[sel.dataset.f] = e.target.value; shown = PAGE; update(); }));
    root.querySelector('[data-q]').addEventListener('input', e => { f.q = e.target.value; shown = PAGE; update(); });
    ui.on(root, 'click', '[data-action="filters"]', (e, b) => {
      const tb = b.closest('.toolbar');
      tb.classList.toggle('open');
      b.setAttribute('aria-expanded', tb.classList.contains('open'));
    });
    ui.on(root, 'click', '[data-action="more"]', () => { shown += PAGE; update(); });
    ui.on(root, 'click', '[data-action="clear"]', () => { f = Object.assign(DEFAULT(), { month: 'all' }); shown = PAGE; SW.refresh(); });
    ui.on(root, 'click', '[data-action="add"]', () => openForm());
    ui.on(root, 'click', '[data-edit]', (e, b) => openForm(S.state.transactions.find(x => x.id === b.dataset.edit)));
    ui.on(root, 'click', '[data-del]', async (e, b) => {
      const t = S.state.transactions.find(x => x.id === b.dataset.del);
      const goal = t.goalId && S.state.goals.find(g => g.id === t.goalId);
      const ok = await ui.confirm({ title: 'Delete this transaction?', text: `“${F.esc(t.desc)}” (${F.inr(t.amount)}) on ${F.date(t.date)} will be removed. Your balance${goal ? `, ${F.esc(goal.name)}` : ''} and Safe-to-Spend will change.`, confirmLabel: 'Delete', danger: true });
      if (!ok) return;
      S.deleteTransaction(t.id);
      SW.refresh(); ui.toast('Transaction deleted');
    });
    ui.on(root, 'click', '[data-action="export"]', () => {
      ui.downloadCSV('scopewise-transactions.csv', [['Date', 'Type', 'Description', 'Category', 'Classification', 'Payment method', 'Amount (INR)', 'Note'],
        ...filtered().map(t => [t.date, t.type, t.desc, t.category, kindOf(t) ? KIND[kindOf(t)] : '', t.method, t.type === 'income' || t.type === 'withdrawal' ? t.amount : -t.amount, t.note || ''])]);
    });
  }

  SW.pages.transactions = { render, mount, openForm };
})();
