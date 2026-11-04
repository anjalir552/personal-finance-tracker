/* Shared UI components: badges, overlays, toasts, empty states, helpers */
(function () {
  const F = SW.fmt;
  const I = SW.icon;

  const STATUS = {
    // goals
    ontrack: ['pos', 'On track'], behind: ['warn', 'Behind plan'], reached: ['pos', 'Reached'],
    // upcoming
    overdue: ['warn', 'Overdue'], estimate: ['neutral', 'Estimate'], monthly: ['neutral', 'Monthly'], yearly: ['neutral', 'Yearly'], once: ['neutral', 'One-time'],
    // decisions
    bought: ['neutral', 'Bought'], waiting: ['info', 'Waiting'], saving: ['info', 'Saving for it'], skipped: ['neutral', 'Skipped']
  };

  const ui = {
    badge(key, label) {
      const [cls, text] = STATUS[key] || ['neutral', key];
      return `<span class="badge ${cls}">${F.esc(label || text)}</span>`;
    },

    pageHeader({ title, sub, actions = '', stamp = '' }) {
      return `<div class="page-header">
        <div><h1 class="page-title">${title}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ''}</div>
        ${actions || stamp ? `<div class="page-actions">${stamp ? `<span class="page-stamp">${stamp}</span>` : ''}${actions}</div>` : ''}
      </div>`;
    },

    segmented(name, options, value, label) {
      return `<div class="segmented" role="tablist" aria-label="${F.esc(label || name)}" data-seg="${name}">
        ${options.map(o => `<button type="button" role="tab" data-value="${o.value}" aria-selected="${o.value === value}">${o.label}${o.count != null ? `<span class="count">${o.count}</span>` : ''}</button>`).join('')}
      </div>`;
    },

    tabs(name, options, value) {
      return `<div class="tabs" role="tablist" data-tabs="${name}">
        ${options.map(o => `<button type="button" role="tab" data-value="${o.value}" aria-selected="${o.value === value}">${o.label}</button>`).join('')}
      </div>`;
    },

    empty({ icon = 'search', title, text, action = '' }) {
      return `<div class="empty"><div class="empty-icon">${I(icon, 20)}</div>
        <div class="empty-title">${title}</div><p class="empty-text">${text}</p>${action}</div>`;
    },

    delta(curr, prev, invert) {
      if (!prev) return '';
      const d = (curr - prev) / Math.abs(prev);
      if (Math.abs(d) < 0.005) return `<span class="delta flat">No change</span>`;
      const good = invert ? d < 0 : d > 0;
      return `<span class="delta ${good ? 'up' : 'down'}">${I(d > 0 ? 'arrowUp' : 'arrowDown', 13)}${F.pct(Math.abs(d))}</span>`;
    },

    dateChip(iso) {
      const d = F.d(iso);
      return `<div class="date-chip" aria-hidden="true"><div class="d">${d.getDate()}</div><div class="m">${F.MONTHS[d.getMonth()]}</div></div>`;
    },

    /** Delegated events within a root */
    on(root, type, selector, fn) {
      root.addEventListener(type, e => {
        const t = e.target.closest(selector);
        if (t && root.contains(t)) fn(e, t);
      });
    },

    /* ---------- Overlays ---------- */
    _stack: [],
    open({ title, desc = '', body, foot = '', wide = false, drawer = false, onMount, onClose }) {
      const root = document.getElementById('overlay-root');
      const prevFocus = document.activeElement;
      const ov = document.createElement('div');
      ov.className = 'overlay' + (drawer ? ' drawer-overlay' : '');
      const id = 'dlg-' + Math.random().toString(36).slice(2, 7);
      ov.innerHTML = `<div class="${drawer ? 'drawer' : 'modal' + (wide ? ' wide' : '')}" role="dialog" aria-modal="true" aria-labelledby="${id}">
        <div class="modal-head"><div><h2 class="modal-title" id="${id}">${title}</h2>${desc ? `<p class="modal-desc">${desc}</p>` : ''}</div>
          <button class="icon-btn" data-close aria-label="Close">${I('close', 18)}</button></div>
        <div class="modal-body">${body}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
      </div>`;
      root.appendChild(ov);
      document.body.style.overflow = 'hidden';
      const close = () => {
        if (!ov.isConnected) return;
        ov.classList.add('closing');
        setTimeout(() => {
          ov.remove();
          ui._stack = ui._stack.filter(x => x !== entry);
          if (!ui._stack.length) document.body.style.overflow = '';
          prevFocus && prevFocus.focus && prevFocus.focus();
          onClose && onClose();
        }, 130);
      };
      const entry = { ov, close };
      ui._stack.push(entry);
      ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
      ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
      const panel = ov.firstElementChild;
      onMount && onMount(panel, close);
      const focusable = panel.querySelector('input:not([type=hidden]), select, textarea, .btn-primary') || panel.querySelector('[data-close]');
      setTimeout(() => focusable && focusable.focus(), 30);
      return close;
    },

    confirm({ title, text, confirmLabel = 'Confirm', danger = false }) {
      return new Promise(resolve => {
        let ok = false;
        ui.open({
          title, body: `<p class="muted">${text}</p>`,
          foot: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${confirmLabel}</button>`,
          onMount: (p, close) => p.querySelector('[data-ok]').addEventListener('click', () => { ok = true; close(); }),
          onClose: () => resolve(ok)
        });
      });
    },

    toast(msg, icon = 'checkCircle') {
      const region = document.getElementById('toasts');
      const t = document.createElement('div');
      t.className = 'toast';
      t.innerHTML = `${I(icon, 16)}<span>${msg}</span>`;
      region.appendChild(t);
      setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 220); }, 2800);
    },

    downloadCSV(filename, rows) {
      const csv = rows.map(r => r.map(c => {
        const s = String(c ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
      ui.toast(`Exported ${filename}`, 'download');
    },

    /** Category chip: essential categories carry the navy-grey dot */
    catChip(id) {
      const c = SW.store.cat(id);
      return `<span class="chip${c.essential ? ' essential' : ''}">${F.esc(id)}</span>`;
    },

    progress(pct, tone = '') {
      return `<div class="bar ${tone}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}"><span style="width:${Math.max(0, Math.min(100, pct * 100))}%"></span></div>`;
    },

    /**
     * The money map bar: bills | everyday | goals | free, with an optional purchase laid over it
     * from the right (it uses free money first, then goals, everyday and bills).
     */
    moneyBar(m, purchase = 0) {
      const total = Math.max(m.balance, 1);
      const parts = [
        ['bills', Math.max(0, m.bills)], ['everyday', Math.max(0, m.everyday)], ['goals', Math.max(0, m.goals)], ['free', Math.max(0, m.free)]
      ];
      const committed = parts.slice(0, 3).reduce((a, p) => a + p[1], 0);
      const short = committed > m.balance;
      const scale = short ? committed : total;
      const p = Math.min(purchase, scale);
      return `<div class="money-bar${short ? ' short' : ''}" aria-hidden="true">
        ${parts.map(([k, v]) => v > 0 ? `<span class="seg seg-${k}" style="flex:${v / scale}"></span>` : '').join('')}
        ${purchase > 0 ? `<span class="seg-purchase${purchase > m.balance ? ' over' : ''}" style="width:${(p / scale) * 100}%"></span>` : ''}
      </div>`;
    },

    /** Read a form into a plain object */
    formData(form) {
      const o = {};
      new FormData(form).forEach((v, k) => (o[k] = v));
      form.querySelectorAll('input[type=checkbox]').forEach(c => (o[c.name] = c.checked));
      return o;
    },

    moneyInput(name, value, attrs = '') {
      return `<div class="input-affix has-pre"><span class="affix pre">₹</span>
        <input class="input num" name="${name}" inputmode="numeric" value="${value != null && value !== '' ? F.num(value) : ''}" data-money ${attrs} /></div>`;
    },

    /** Keeps ₹ inputs formatted with Indian digit grouping as the user types */
    bindMoney(root) {
      root.addEventListener('input', e => {
        const inp = e.target.closest('[data-money]');
        if (!inp) return;
        const raw = inp.value.replace(/[^\d]/g, '');
        const pos = inp.value.length - inp.selectionStart;
        inp.value = raw ? F.num(+raw) : '';
        const np = Math.max(0, inp.value.length - pos);
        try { inp.setSelectionRange(np, np); } catch (err) { /* noop */ }
      });
    },
    money(v) { return +String(v || '').replace(/[^\d.]/g, '') || 0; }
  };

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && ui._stack.length) ui._stack[ui._stack.length - 1].close();
  });

  SW.ui = ui;
})();
