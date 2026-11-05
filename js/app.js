/* App shell: sidebar, routing */
(function () {
  const I = SW.icon;
  const S = SW.store;
  const F = SW.fmt;

  const NAV = [
    { id: 'overview', label: 'Overview', icon: 'overview' },
    { id: 'transactions', label: 'Transactions', icon: 'transactions' },
    { id: 'spending', label: 'Spending Analysis', icon: 'spending' },
    { id: 'decisions', label: 'Purchase Decisions', icon: 'decisions' },
    { id: 'goals', label: 'Savings Goals', icon: 'goals' },
    { id: 'upcoming', label: 'Upcoming Expenses', icon: 'upcoming' },
    { id: 'insights', label: 'Financial Insights', icon: 'insights' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];
  const STAGE = { student: 'College student', 'first-job': 'First job', working: 'Working' };

  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  const menuBtn = document.getElementById('menuBtn');
  const main = document.getElementById('main');

  function renderSidebar(active) {
    const s = S.state.settings;
    // A count only where something needs action: expenses due in the next 3 days
    const soon = S.upcomingSorted().filter(u => u.due <= F.addDays(S.TODAY, 3)).length;
    const count = n => (n.id === 'upcoming' && soon ? `<span class="nav-count" aria-label="${soon} due in the next 3 days">${soon}</span>` : '');
    const item = n => `<a href="#/${n.id}" class="nav-item${active === n.id ? ' active' : ''}" data-label="${n.label}" ${active === n.id ? 'aria-current="page"' : ''}>
        ${I(n.icon, 20)}<span class="nav-text">${n.label}</span>${count(n)}</a>`;
    const name = s.name || 'Your name';
    sidebar.innerHTML = `
      <div class="sidebar-head">
        <button type="button" class="sidebar-toggle" id="sidebarToggle" aria-controls="sidebar"><span class="ico-panel">${I('panelLeft', 18)}</span><span class="ico-close">${I('close', 22)}</span></button>
      </div>
      <nav class="nav" aria-label="Main">
        ${NAV.slice(0, 1).map(item).join('')}
        <div class="nav-label">Track</div>
        ${NAV.slice(1, 3).map(item).join('')}
        <div class="nav-label">Plan & decide</div>
        ${NAV.slice(3, 7).map(item).join('')}
      </nav>
      <div class="sidebar-foot">
        ${NAV.slice(7).map(item).join('')}
        <a href="#/settings" class="account" data-label="${F.esc(name)}">
          <span class="avatar">${s.name ? F.initials(s.name) : I('user', 15)}</span>
          <span class="account-meta"><span class="account-name">${F.esc(name)}</span><span class="account-org">${STAGE[s.stage] || ''}${s.city ? ' · ' + F.esc(s.city) : ''}</span></span>
        </a>
      </div>`;
  }

  /* Collapsible sidebar: desktop preference is remembered; tablet is always the rail; phone uses the drawer */
  const app = document.getElementById('app');
  const SIDEBAR_KEY = 'scopewise:sidebar';
  const mqTablet = window.matchMedia('(min-width: 761px) and (max-width: 1080px)');
  const mqPhone = window.matchMedia('(max-width: 760px)');
  let pref = 'expanded';
  try { pref = localStorage.getItem(SIDEBAR_KEY) === 'collapsed' ? 'collapsed' : 'expanded'; } catch (e) { /* storage unavailable */ }
  const isCollapsed = () => !mqPhone.matches && (mqTablet.matches || pref === 'collapsed');
  function applySidebar() {
    const c = isCollapsed();
    app.classList.toggle('collapsed', c);
    const btn = document.getElementById('sidebarToggle');
    if (!btn) return;
    const phone = mqPhone.matches;
    const label = phone ? 'Close navigation' : c ? 'Expand sidebar' : 'Collapse sidebar';
    btn.setAttribute('aria-label', label);
    btn.dataset.label = label;
    if (phone) btn.removeAttribute('aria-expanded'); else btn.setAttribute('aria-expanded', String(!c));
  }
  const tip = document.createElement('div');
  tip.className = 'sidebar-tip'; tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  function showTip(el) {
    const text = el.dataset.label;
    const needs = el.id === 'sidebarToggle' ? !mqPhone.matches : el.closest('.app.collapsed');
    if (!text || !needs) return hideTip();
    const r = el.getBoundingClientRect();
    tip.textContent = text;
    tip.style.left = (r.right + 12) + 'px';
    tip.style.top = (r.top + r.height / 2) + 'px';
    tip.classList.add('show');
  }
  function hideTip() { tip.classList.remove('show'); }
  sidebar.addEventListener('mouseover', e => { const el = e.target.closest('[data-label]'); if (el) showTip(el); });
  sidebar.addEventListener('mouseout', e => { if (e.target.closest('[data-label]')) hideTip(); });
  sidebar.addEventListener('focusin', e => { const el = e.target.closest('[data-label]'); if (el && e.target.matches(':focus-visible')) showTip(el); });
  sidebar.addEventListener('focusout', hideTip);
  sidebar.addEventListener('scroll', hideTip);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
  sidebar.addEventListener('click', e => {
    const btn = e.target.closest('#sidebarToggle');
    if (!btn) return;
    if (mqPhone.matches) return;            // drawer close is handled below
    pref = isCollapsed() ? 'expanded' : 'collapsed';
    try { localStorage.setItem(SIDEBAR_KEY, pref); } catch (err) { /* keep in memory */ }
    applySidebar();
    showTip(btn);
  });
  mqTablet.addEventListener('change', applySidebar);
  mqPhone.addEventListener('change', () => { setDrawer(false); applySidebar(); });
  app.classList.toggle('collapsed', isCollapsed());

  document.querySelector('.topbar-brand').innerHTML = `<span class="brand-mark">${SW.logo(20)}</span>Scopewise`;
  menuBtn.innerHTML = I('menu', 22);

  function setDrawer(open) {
    sidebar.classList.toggle('open', open);
    scrim.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.addEventListener('click', () => setDrawer(!sidebar.classList.contains('open')));
  scrim.addEventListener('click', () => setDrawer(false));
  sidebar.addEventListener('click', e => { if (mqPhone.matches && e.target.closest('a, #sidebarToggle')) setDrawer(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sidebar.classList.contains('open')) setDrawer(false); });

  function parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, ...rest] = h.split('/');
    return { page: page || 'overview', params: rest.map(decodeURIComponent) };
  }

  let current = null;
  function route() {
    const { page, params } = parse();
    const def = SW.pages[page] || SW.pages.overview;
    const id = SW.pages[page] ? page : 'overview';
    SW.charts.cleanup();
    if (current && current.unmount) current.unmount();
    renderSidebar(id);
    applySidebar();
    document.body.dataset.page = id;
    main.innerHTML = `<div class="page page-${id}">${def.render(params)}</div>`;
    const root = main.firstElementChild;
    current = def;
    def.mount && def.mount(root, params);
    const pageTitle = NAV.find(n => n.id === id)?.label || 'Scopewise';
    document.title = `${pageTitle} · Scopewise`;
    if (!route.keepScroll) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
    route.keepScroll = false;
  }
  SW.route = route;
  SW.go = hash => { if (location.hash === hash) route(); else location.hash = hash; };
  /** Re-render current page in place (after state changes) */
  SW.refresh = () => { route.keepScroll = true; route(); };

  window.addEventListener('hashchange', route);
  if (!location.hash) history.replaceState(null, '', '#/overview');
  route();
})();
