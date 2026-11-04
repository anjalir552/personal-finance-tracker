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
        ${I(n.icon, 18)}<span class="nav-text">${n.label}</span>${count(n)}</a>`;
    const name = s.name || 'Your name';
    sidebar.innerHTML = `
      <a href="#/overview" class="brand" aria-label="Scopewise home"><span class="brand-mark">${SW.logo(22)}</span><span class="brand-name">Scopewise</span></a>
      <nav class="nav" aria-label="Main">
        ${NAV.slice(0, 1).map(item).join('')}
        <div class="nav-label">Track</div>
        ${NAV.slice(1, 3).map(item).join('')}
        <div class="nav-label">Plan & decide</div>
        ${NAV.slice(3, 7).map(item).join('')}
      </nav>
      <div class="sidebar-foot">
        ${NAV.slice(7).map(item).join('')}
        <a href="#/settings" class="account">
          <span class="avatar">${s.name ? F.initials(s.name) : I('user', 15)}</span>
          <span class="account-meta"><span class="account-name">${F.esc(name)}</span><span class="account-org">${STAGE[s.stage] || ''}${s.city ? ' · ' + F.esc(s.city) : ''}</span></span>
        </a>
      </div>`;
  }

  document.querySelector('.topbar-brand').innerHTML = `<span class="brand-mark">${SW.logo(20)}</span>Scopewise`;
  menuBtn.innerHTML = I('menu', 22);

  function setDrawer(open) {
    sidebar.classList.toggle('open', open);
    scrim.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.addEventListener('click', () => setDrawer(!sidebar.classList.contains('open')));
  scrim.addEventListener('click', () => setDrawer(false));
  sidebar.addEventListener('click', e => { if (e.target.closest('a')) setDrawer(false); });
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
