/* Overview: answers "How much of my money is actually free until payday?" */
SW.pages = SW.pages || {};
(function () {
  const F = SW.fmt, S = SW.store, ui = SW.ui, I = SW.icon;

  function welcome() {
    const s = S.state.settings;
    const steps = [
      { done: s.monthlyIncome > 0 && S.balance() !== 0, t: 'Add your balance and income', p: 'Your bank balance today, what you earn or receive each month and when it arrives.', href: '#/settings', cta: 'Open settings' },
      { done: S.state.upcoming.length > 0, t: 'List what’s coming up', p: 'Rent, fees, subscriptions and anything you’ve already planned to pay for.', href: '#/upcoming', cta: 'Add an expense' },
      { done: S.state.goals.length > 0, t: 'Set a savings goal', p: 'A trip, a laptop or an emergency fund, so purchases can be checked against it.', href: '#/goals', cta: 'Create a goal' }
    ];
    const n = steps.filter(x => x.done).length;
    return `${ui.pageHeader({ title: 'Overview', sub: 'Three quick steps and Scopewise can tell you what you can really afford.' })}
      <section class="panel welcome" aria-labelledby="w-h">
        <div class="row-between wrap">
          <div><h2 class="section-title" id="w-h">Set up your money picture</h2><p class="section-desc" style="margin-top:4px">${n} of 3 done. Everything stays in this browser.</p></div>
          <div style="width:min(240px,100%)">${ui.progress(n / 3)}</div>
        </div>
        <ol class="welcome-steps">
          ${steps.map(x => `<li><span class="t">${x.t}</span><p>${x.p}</p>
            ${x.done ? `<span class="done">${I('checkCircle', 16)}Done</span>` : `<a class="link" href="${x.href}">${x.cta}${I('arrowRight', 14)}</a>`}</li>`).join('')}
        </ol>
      </section>`;
  }

  function render() {
    const st = S.state;
    if (st.isNew && !st.transactions.length && !st.goals.length && !st.upcoming.length) return welcome();

    const m = S.moneyMap();
    const payday = F.date(m.payday, false);
    const short = m.free < 0;
    const week = F.addDays(S.TODAY, 7);
    const next7 = m.billsList.filter(u => u.due <= week);
    const next7Sum = next7.reduce((a, u) => a + u.amount, 0);
    const sub = short
      ? `<b>Your plans need ${F.inr(-m.free)} more than you have</b> before payday on ${payday}. Check upcoming expenses before spending on extras.`
      : next7.length
        ? `<b>${F.inr(next7Sum)} goes out in the next 7 days</b>, including ${next7.slice().sort((a, b) => b.amount - a.amount).slice(0, 2).map(u => { const n = u.name.split(' · ')[0]; return /^(Diwali|Netflix|Spotify|Jio|iCloud|MSEDCL|Cult|Aai)/.test(n) ? n : n.charAt(0).toLowerCase() + n.slice(1); }).join(' and ')}. The figure below already allows for it.`
        : `Nothing is due in the next 7 days. Here’s what’s free once your plans are covered.`;

    // Coming up
    const ROWS = 5;
    const soon = S.upcomingSorted().slice(0, ROWS);
    const goals = S.activeGoals();
    const full = S.fullMonths(2);
    const last = full[full.length - 1], prev = full[full.length - 2];
    const insights = S.insights().filter(x => x.id !== 'pressure').slice(0, 3);

    const upcomingHTML = soon.length ? `<ul class="list">${soon.map(u => {
      const d = F.d(u.due);
      const isSoon = u.due <= F.addDays(S.TODAY, 3);
      return `<li class="list-item">
        <div class="date-chip${isSoon ? ' soon' : ''}" aria-hidden="true"><div class="d">${d.getDate()}</div><div class="m">${F.MONTHS[d.getMonth()]}</div></div>
        <div class="grow"><div class="li-title">${F.esc(u.name)}</div>
          <div class="li-sub">${S.isOverdue(u) ? '<span class="warn">Overdue</span>' : F.rel(u.due, S.TODAY).replace(/^in /, 'In ')}${u.estimate ? ' · estimate' : ''}</div></div>
        <div class="li-amt">${u.estimate ? '~' : ''}${F.inr(u.amount)}</div>
      </li>`;
    }).join('')}</ul>` : ui.empty({ icon: 'upcoming', title: 'Nothing planned yet', text: 'Add rent, fees and subscriptions to see what your balance is already needed for.', action: `<a class="btn btn-secondary btn-sm" href="#/upcoming">${I('plus', 15)}Add an expense</a>` });

    const goalsHTML = goals.length ? `<div class="panel-body goal-mini">${goals.slice(0, 3).map(g => {
      const s = S.goalStatus(g);
      return `<div>
        <div class="top"><b>${F.esc(g.name)}</b><span>${F.inrc(s.saved)} of ${F.inrc(g.target)}</span></div>
        ${ui.progress(s.pct)}
        <div class="li-sub" style="margin-top:6px">${s.onTrack ? `On track for ${F.date(g.deadline)}` : `<span class="warn">Needs ${F.inr(Math.ceil((s.suggested - g.monthly) / 100) * 100)} more a month</span> to reach it by ${F.date(g.deadline, false)}`}</div>
      </div>`;
    }).join('')}
      <p class="callout" style="margin-top:2px">${I('wallet', 16)}<span>This month: <b>${F.inr(goals.reduce((a, g) => a + S.goalStatus(g).thisCycle, 0))}</b> moved to savings, <b>${F.inr(m.goals)}</b> still to set aside.</span></p></div>` : ui.empty({ icon: 'goals', title: 'No savings goals yet', text: 'Goals let Scopewise protect the money you’re saving when you check a purchase.', action: `<a class="btn btn-secondary btn-sm" href="#/goals">${I('plus', 15)}Create a goal</a>` });

    let monthHTML = ui.empty({ icon: 'spending', title: 'Not enough history yet', text: 'Once you’ve recorded a full month of transactions, you’ll see it summarised here.' });
    if (last) {
      const inc = S.income(last), out = S.spent(last), sav = S.saved(last);
      const cats = Object.entries(S.byCategory(last)).sort((a, b) => b[1] - a[1]).slice(0, 7);
      const max = cats.length ? cats[0][1] : 1;
      const fig = (k, v, p, invert) => `<div><div class="stat-label">${k}</div><div class="stat-value num">${F.inr(v)}</div>${prev ? `<div class="stat-meta">${ui.delta(v, p, invert) || '<span class="delta flat">—</span>'}<span class="hide-sm">vs ${S.monthName(prev)}</span></div>` : ''}</div>`;
      monthHTML = `<div class="panel-body">
        <div class="month-figs">
          ${fig('Money in', inc, prev && S.income(prev))}
          ${fig('Spent', out, prev && S.spent(prev), true)}
          ${fig('Saved', sav, prev && S.saved(prev))}
        </div>
        <div class="cat-list">${cats.map(([c, v]) => `<div class="cat-row">
          <div class="name"><i class="ess${S.cat(c).essential ? '' : ' no'}" aria-hidden="true"></i><span>${F.esc(c)}</span></div>
          <div class="cat-track"><b style="width:${(v / max) * 100}%"></b></div>
          <div class="fig"><div class="v">${F.inr(v)}</div></div></div>`).join('')}</div>
        <div class="legend" style="margin-top:16px"><span><i style="background:var(--ess);border-radius:99px;width:7px;height:7px"></i>Essential</span><span><i style="box-shadow:inset 0 0 0 1.5px var(--gray-400);border-radius:99px;width:7px;height:7px"></i>Non-essential</span></div>
      </div>`;
    }
    const curSpent = S.spent(S.CUR_MONTH);
    const curDays = F.d(S.TODAY).getDate();

    return `
      ${ui.pageHeader({
        title: 'Overview', sub,
        actions: `<button class="btn btn-secondary" data-action="add">${I('plus', 16)}Add transaction</button>
                  <a class="btn btn-primary" href="#/decisions">${I('decisions', 16)}Can I afford this?</a>`
      })}

      <section class="panel hero-card" aria-labelledby="map-h">
        <div class="hero-top">
          <div class="hero-free">
            <h2 class="stat-label" id="map-h" style="font-weight:600;color:var(--text)">Free to spend until ${payday}</h2>
            <div class="stat-value lead num${short ? ' neg' : ''}">${F.inr(m.free)}</div>
            <div class="stat-meta">${short ? 'Committed money is more than your balance' : `About ${F.inr(m.perDay)} a day for the next ${m.daysLeft} days`}</div>
          </div>
          <div class="hero-balance">
            <div class="stat-label">Available balance</div>
            <div class="stat-value num">${F.inr(m.balance)}</div>
            <div class="stat-meta">In your bank account today</div>
          </div>
        </div>
        ${ui.moneyBar(m)}
        <div class="money-keys">
          <div class="money-key"><div class="k"><i class="key-bills"></i>Upcoming expenses</div><div class="v num">${F.inr(m.bills)}</div><div class="s">${m.billsList.length} due before payday</div></div>
          <div class="money-key"><div class="k"><i class="key-everyday"></i>Everyday essentials</div><div class="v num">~${F.inr(m.everyday)}</div><div class="s">Estimate: groceries, transport, health</div></div>
          <div class="money-key"><div class="k"><i class="key-goals"></i>Savings to set aside</div><div class="v num">${F.inr(m.goals)}</div><div class="s">${goals.filter(g => S.goalStatus(g).setAside > 0).length} goals still to fund this month</div></div>
          <div class="money-key free"><div class="k"><i class="key-free"></i>Free to spend</div><div class="v num">${short ? '—' : F.inr(m.perDay)}<span class="unit">/ day</span></div><div class="s">For food, fun, shopping</div></div>
        </div>
        <p class="hero-note">${I('info', 15)}<span>Everyday essentials is an estimate from your last 3 months. Free to spend is what’s left of your balance after everything above.</span></p>
      </section>

      <div class="grid grid-2 section">
        <section class="panel" aria-labelledby="up-h" style="display:flex;flex-direction:column">
          <div class="panel-head"><div><h2 class="panel-title" id="up-h">Coming up</h2><div class="panel-desc">Next payments, soonest first</div></div>
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

      <div class="grid grid-main section">
        <section class="panel" aria-labelledby="mo-h" style="display:flex;flex-direction:column">
          <div class="panel-head"><div><h2 class="panel-title" id="mo-h">${last ? `${S.monthName(last, true)} at a glance` : 'Your month'}</h2>
            <div class="panel-desc">${S.monthName(S.CUR_MONTH, true)} so far: ${F.inr(curSpent)} spent in ${curDays} day${curDays === 1 ? '' : 's'}</div></div></div>
          <div style="flex:1">${monthHTML}</div>
          <div class="panel-foot"><span>Top categories</span><a class="link" href="#/spending">Spending analysis${I('arrowRight', 14)}</a></div>
        </section>

        <section class="panel" aria-labelledby="in-h" style="display:flex;flex-direction:column">
          <div class="panel-head"><div><h2 class="panel-title" id="in-h">Worth knowing</h2><div class="panel-desc">From your own numbers</div></div></div>
          <div style="flex:1">${insights.length ? insights.map(x => `
            <div class="insight">
              <span class="insight-dot ${x.tone}" aria-hidden="true"></span>
              <div><div class="insight-title">${x.title}</div><p class="insight-text clamp-2">${x.text}</p><a class="link" href="${x.link[0]}">${x.link[1]}${I('arrowRight', 14)}</a></div>
            </div>`).join('') : ui.empty({ icon: 'insights', title: 'Insights appear after a month', text: 'Keep adding transactions and Scopewise will point out patterns worth knowing.' })}</div>
          <div class="panel-foot"><span>${insights.length ? `${S.insights().length} insights in total` : ''}</span><a class="link" href="#/insights">All insights${I('arrowRight', 14)}</a></div>
        </section>
      </div>`;
  }

  function mount(root) {
    ui.on(root, 'click', '[data-action="add"]', () => SW.pages.transactions.openForm());
  }

  SW.pages.overview = { render, mount };
})();
