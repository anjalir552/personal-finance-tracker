/* Transactions: record money in and out, then find anything again */
SW.pages = SW.pages || {};
(function () {
  const F = SW.fmt, S = SW.store, ui = SW.ui, I = SW.icon;
  const SEED = SW.seed;
  const PAGE = 40;
  let f = { type: 'all', cat: 'all', method: 'all', month: S.CUR_MONTH, q: '' };
  let shown = PAGE;

  function filtered() {
    const q = f.q.trim().toLowerCase();
    return S.state.transactions
      .filter(t => f.month === 'all' || t.date.slice(0, 7) === f.month)
      .filter(t => f.type === 'all' || t.type === f.type)
      .filter(t => f.cat === 'all' || t.category === f.cat)
      .filter(t => f.method === 'all' || t.method === f.method)
      .filter(t => !q || `${t.desc} ${t.category} ${t.method} ${t.note || ''}`.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }

  const activeCount = () => ['cat', 'method'].filter(k => f[k] !== 'all').length + (f.month !== S.CUR_MONTH ? 1 : 0);

  function summaryHTML(list) {
    const sum = type => list.filter(t => t.type === type).reduce((a, t) => a + t.amount, 0);
    const label = f.month === 'all' ? 'All time' : `${S.monthName(f.month, true)} ${f.month.slice(0, 4)}`;
    return `<div class="stat-strip" style="--cols:3">
      <div class="stat"><div class="stat-label">Money in · ${label}</div><div class="stat-value num pos">+${F.inr(sum('income'))}</div></div>
      <div class="stat"><div class="stat-label">Money out</div><div class="stat-value num">${F.inr(sum('expense'))}</div></div>
      <div class="stat"><div class="stat-label">Moved to savings</div><div class="stat-value num">${F.inr(sum('transfer'))}</div></div>
    </div>`;
  }

  function amountHTML(t) {
    if (t.type === 'income') return `<span class="amt in">+${F.inr(t.amount)}</span>`;
    if (t.type === 'transfer') return `<span class="amt move">${F.inr(t.amount)}</span>`;
    return `<span class="amt">−${F.inr(t.amount)}</span>`;
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
        group = `<tr class="group-row"><td colspan="5">${rel}${F.WEEKDAYS[F.d(t.date).getDay()]}, ${F.date(t.date)}</td></tr>`;
      }
      const sub = t.type === 'transfer' ? 'To savings goal' : t.category;
      return `${group}<tr>
        <td><div class="cell-title">${F.esc(t.desc)}</div><div class="cell-sub">${F.esc(sub)}<span class="show-on-sm"> · ${F.esc(t.method)}</span></div></td>
        <td class="hide-sm">${t.type === 'expense' ? ui.catChip(t.category) : t.type === 'income' ? `<span class="chip">${F.esc(t.category)}</span>` : '<span class="chip">Savings</span>'}</td>
        <td class="hide-sm muted">${F.esc(t.method)}</td>
        <td class="r">${amountHTML(t)}</td>
        <td style="width:84px"><div class="row-actions">
          ${t.type === 'transfer' ? '' : `<button class="icon-btn sm" data-edit="${t.id}" aria-label="Edit ${F.esc(t.desc)}">${I('edit', 16)}</button>`}
          <button class="icon-btn sm" data-del="${t.id}" aria-label="Delete ${F.esc(t.desc)}">${I('trash', 16)}</button></div></td>
      </tr>`;
    }).join('');
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>Description</th><th class="hide-sm">Category</th><th class="hide-sm">Paid with</th><th class="r">Amount</th><th><span class="sr-only">Actions</span></th></tr></thead>
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
        sub: 'Everything that came in and went out. Your balance and every figure in Scopewise are worked out from this list.',
        actions: `<button class="btn btn-secondary" data-action="export">${I('download', 16)}Export CSV</button>
          <button class="btn btn-primary" data-action="add">${I('plus', 16)}Add transaction</button>`
      })}
      <section class="panel" aria-label="Transaction history">
        <div data-summary>${summaryHTML(filtered())}</div>
        <div class="toolbar" style="border-top:1px solid var(--rule)">
          <label class="search"><span class="sr-only">Search transactions</span>${I('search', 16)}<input type="search" placeholder="Search, e.g. Swiggy" value="${F.esc(f.q)}" data-q /></label>
          ${ui.segmented('ttype', [{ value: 'all', label: 'All' }, { value: 'income', label: 'Money in' }, { value: 'expense', label: 'Money out' }, { value: 'transfer', label: 'Savings' }], f.type, 'Transaction type')}
          <span class="grow hide-sm"></span>
          <button type="button" class="btn btn-secondary btn-sm filters-toggle" data-action="filters" aria-expanded="false">${I('filter', 15)}Filters${activeCount() ? ` · ${activeCount()}` : ''}</button>
          <select class="select sm" data-f="month" aria-label="Month">${opt('all', 'All months', f.month)}${months.map(k => opt(k, `${S.monthName(k, true)} ${k.slice(0, 4)}`, f.month)).join('')}</select>
          <select class="select sm" data-f="cat" aria-label="Category">${opt('all', 'All categories', f.cat)}${cats.map(c => opt(c, c, f.cat)).join('')}</select>
          <select class="select sm" data-f="method" aria-label="Payment method">${opt('all', 'Any payment method', f.method)}${SEED.METHODS.map(x => opt(x, x, f.method)).join('')}</select>
        </div>
        <div data-list>${listHTML()}</div>
      </section>`;
  }

  /** Add or edit form, shared with Overview */
  function openForm(existing) {
    const t = existing || { type: 'expense', date: S.TODAY, method: 'UPI', category: 'Food & dining', desc: '', amount: '' };
    const catOptions = type => (type === 'income' ? SEED.INCOME_CATEGORIES : SEED.CATEGORIES.map(c => c.id))
      .map(c => `<option ${c === t.category ? 'selected' : ''}>${F.esc(c)}</option>`).join('');
    if (t.type === 'transfer') { ui.toast('Savings transfers are managed from Savings Goals', 'info'); return; }
    ui.open({
      title: existing ? 'Edit transaction' : 'Add transaction',
      desc: existing ? '' : 'Your balance and spending figures update straight away.',
      body: `<form class="form-grid" data-form autocomplete="off" novalidate>
        <div class="type-toggle span-2" role="radiogroup" aria-label="Type">
          <label><input type="radio" name="type" value="expense" ${t.type === 'expense' ? 'checked' : ''} /><span>${I('arrowUp', 16)}Money out</span></label>
          <label><input type="radio" name="type" value="income" ${t.type === 'income' ? 'checked' : ''} /><span>${I('arrowDown', 16)}Money in</span></label>
        </div>
        <label class="field span-2"><span class="field-label">Description</span><input class="input" name="desc" value="${F.esc(t.desc)}" placeholder="e.g. Swiggy dinner" aria-describedby="e-desc" /><span class="field-error" id="e-desc" hidden>Add a short description.</span></label>
        <label class="field"><span class="field-label">Amount</span>${ui.moneyInput('amount', t.amount, 'placeholder="0" aria-describedby="e-amt"')}<span class="field-error" id="e-amt" hidden>Enter an amount above zero.</span></label>
        <label class="field"><span class="field-label">Date</span><input class="input" type="date" name="date" value="${t.date}" max="${S.TODAY}" /></label>
        <label class="field"><span class="field-label">Category</span><select class="select" name="category" data-cats>${catOptions(t.type)}</select></label>
        <label class="field"><span class="field-label">Paid with</span><select class="select" name="method">${SEED.METHODS.map(x => `<option ${x === t.method ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field span-2"><span class="field-label">Note <span class="opt">Optional</span></span><input class="input" name="note" value="${F.esc(t.note || '')}" placeholder="Anything to remember about it" /></label>
      </form>`,
      foot: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" data-ok>${existing ? 'Save changes' : 'Add transaction'}</button>`,
      onMount: (panel, close) => {
        const form = panel.querySelector('[data-form]');
        ui.bindMoney(form);
        form.addEventListener('change', e => {
          if (e.target.name !== 'type') return;
          const isInc = e.target.value === 'income';
          t.category = isInc ? 'Salary' : 'Food & dining';
          form.querySelector('[data-cats]').innerHTML = catOptions(isInc ? 'income' : 'expense');
        });
        const submit = () => {
          const d = ui.formData(form);
          const amount = ui.money(d.amount);
          const bad = { desc: !d.desc.trim(), amt: !amount };
          panel.querySelector('#e-desc').hidden = !bad.desc; form.desc.classList.toggle('invalid', bad.desc);
          panel.querySelector('#e-amt').hidden = !bad.amt; form.amount.classList.toggle('invalid', bad.amt);
          if (bad.desc || bad.amt) { (bad.desc ? form.desc : form.amount).focus(); return; }
          const row = { date: d.date || S.TODAY, type: d.type, desc: d.desc.trim(), category: d.category, amount, method: d.method, note: d.note.trim() };
          if (existing) Object.assign(S.state.transactions.find(x => x.id === existing.id), row);
          else S.state.transactions.push(Object.assign({ id: S.nextId('T', S.state.transactions) }, row));
          S.state.isNew = false;
          S.save(); close();
          ui.toast(existing ? 'Transaction updated' : `${d.type === 'income' ? 'Income' : 'Expense'} of ${F.inr(amount)} added`);
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
    const update = () => { listEl.innerHTML = listHTML(); sumEl.innerHTML = summaryHTML(filtered()); };
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
    ui.on(root, 'click', '[data-action="clear"]', () => { f = { type: 'all', cat: 'all', method: 'all', month: 'all', q: '' }; shown = PAGE; SW.refresh(); });
    ui.on(root, 'click', '[data-action="add"]', () => openForm());
    ui.on(root, 'click', '[data-edit]', (e, b) => openForm(S.state.transactions.find(x => x.id === b.dataset.edit)));
    ui.on(root, 'click', '[data-del]', async (e, b) => {
      const t = S.state.transactions.find(x => x.id === b.dataset.del);
      const ok = await ui.confirm({ title: 'Delete this transaction?', text: `“${F.esc(t.desc)}” (${F.inr(t.amount)}) on ${F.date(t.date)} will be removed, and your balance will change.`, confirmLabel: 'Delete', danger: true });
      if (!ok) return;
      S.state.transactions = S.state.transactions.filter(x => x.id !== t.id);
      S.save(); SW.refresh(); ui.toast('Transaction deleted');
    });
    ui.on(root, 'click', '[data-action="export"]', () => {
      ui.downloadCSV('scopewise-transactions.csv', [['Date', 'Type', 'Description', 'Category', 'Payment method', 'Amount (INR)', 'Note'],
        ...filtered().map(t => [t.date, t.type, t.desc, t.category, t.method, t.type === 'income' ? t.amount : -t.amount, t.note || ''])]);
    });
  }

  SW.pages.transactions = { render, mount, openForm };
})();
