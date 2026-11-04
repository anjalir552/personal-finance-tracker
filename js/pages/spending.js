/* Spending Analysis: answers "Where did my money go, and is that changing?" */
SW.pages = SW.pages || {};
(function () {
  const F = SW.fmt, S = SW.store, ui = SW.ui, I = SW.icon, C = SW.charts;
  let month = null;

  const monthLabel = k => `${S.monthName(k, true)}${k === S.CUR_MONTH ? ' so far' : ''}`;

  function patterns(key) {
    const list = S.inMonth(key, 'expense');
    const out = [];
    if (!list.length) return out;
    // Most frequent place
    const by = {};
    list.filter(t => S.cat(t.category).kind !== 'bill').forEach(t => { const k = t.desc; by[k] = by[k] || { n: 0, v: 0 }; by[k].n++; by[k].v += t.amount; });
    const top = Object.entries(by).sort((a, b) => b[1].n - a[1].n || b[1].v - a[1].v)[0];
    if (top && top[1].n >= 3) out.push({ k: 'Most frequent', t: `${top[0]}, ${top[1].n} times`, d: `${F.inr(top[1].v)} in total, about ${F.inr(top[1].v / top[1].n)} each time.` });
    // Small purchases
    const small = list.filter(t => t.amount < 300);
    if (small.length >= 5) out.push({ k: 'Small purchases', t: `${small.length} payments under ₹300`, d: `Together they came to ${F.inr(small.reduce((a, t) => a + t.amount, 0))}. Coffee, snacks and short rides add up quietly.` });
    // Weekend share of flexible spending
    const flex = list.filter(t => S.cat(t.category).kind === 'flexible');
    const we = flex.filter(t => [0, 6].includes(F.d(t.date).getDay())).reduce((a, t) => a + t.amount, 0);
    const fx = flex.reduce((a, t) => a + t.amount, 0);
    if (fx > 0) out.push({ k: 'Weekends', t: `${F.pct(we / fx)} of flexible spending`, d: `${F.inr(we)} of ${F.inr(fx)} on eating out, shopping and plans happened on a Saturday or Sunday.` });
    // Biggest one-off
    const big = list.filter(t => S.cat(t.category).kind !== 'bill').sort((a, b) => b.amount - a.amount)[0];
    if (big) out.push({ k: 'Largest one-off', t: `${big.desc}, ${F.inr(big.amount)}`, d: `${big.category} on ${F.date(big.date, false)}. Rent and regular bills are left out here.` });
    return out;
  }

  function render() {
    const months = S.months().filter(k => S.inMonth(k, 'expense').length);
    if (!months.length) {
      return `${ui.pageHeader({ title: 'Spending Analysis', sub: 'See where your money goes and how it changes month to month.' })}
        <section class="panel">${ui.empty({ icon: 'spending', title: 'No spending recorded yet', text: 'Add a few expenses and this page will break them down by category and month.', action: `<a class="btn btn-primary btn-sm" href="#/transactions">${I('plus', 15)}Add transactions</a>` })}</section>`;
    }
    const full = S.fullMonths(6);
    if (!month || !months.includes(month)) month = full.length ? full[full.length - 1] : months[months.length - 1];
    const idx = months.indexOf(month);
    const prev = idx > 0 ? months[idx - 1] : null;
    const cur = S.byCategory(month), was = prev ? S.byCategory(prev) : {};
    const total = S.spent(month), prevTotal = prev ? S.spent(prev) : 0;
    const cats = Object.keys(Object.assign({}, cur, was)).map(c => ({ c, v: cur[c] || 0, p: was[c] || 0 })).filter(x => x.v || x.p).sort((a, b) => b.v - a.v);
    const max = Math.max(1, ...cats.map(x => Math.max(x.v, x.p)));
    const mover = cats.slice().sort((a, b) => (b.v - b.p) - (a.v - a.p))[0];
    const split = S.essentialSplit(month);
    const partial = month === S.CUR_MONTH;

    let sub = `You spent <b>${F.inr(total)}</b> in ${monthLabel(month)}.`;
    if (prev && !partial && prevTotal) {
      const d = total / prevTotal - 1;
      sub = `You spent <b>${F.inr(total)}</b> in ${S.monthName(month, true)}, ${Math.abs(d) < 0.01 ? 'about the same as' : `${F.pct(Math.abs(d))} ${d > 0 ? 'more' : 'less'} than`} ${S.monthName(prev, true)}.`;
      if (mover && mover.v - mover.p > 500) sub += ` The biggest change was ${mover.c.toLowerCase()} (+${F.inr(mover.v - mover.p)}).`;
    }
    const segMonths = months.slice(-5);

    return `
      ${ui.pageHeader({ title: 'Spending Analysis', sub, actions: ui.segmented('smonth', segMonths.map(k => ({ value: k, label: S.monthName(k) + (k === S.CUR_MONTH ? ' (so far)' : '') })), month, 'Month') })}

      <div class="grid grid-main">
        <section class="panel" aria-labelledby="cat-h">
          <div class="panel-head"><div><h2 class="panel-title" id="cat-h">Where it went</h2><div class="panel-desc">By category, ${monthLabel(month)}${prev ? ` against ${S.monthName(prev, true)}` : ''}</div></div>
            <div class="panel-figure">${F.inr(total)}</div></div>
          <div class="panel-body">
            ${prev ? `<div class="legend" style="margin-bottom:18px"><span><i style="background:var(--data);height:6px;border-radius:99px"></i>${S.monthName(month, true)}</span><span><i style="background:var(--data-prev);height:3px;border-radius:99px"></i>${S.monthName(prev, true)}</span><span><i style="background:var(--ess);border-radius:99px;width:7px;height:7px"></i>Essential</span></div>` : ''}
            <div class="cat-list">${cats.map(x => {
              const d = x.v - x.p;
              const dTxt = !prev ? '' : !x.p ? 'new' : Math.abs(d) < 100 ? 'about the same' : `${d > 0 ? '+' : '−'}${F.inr(Math.abs(d))}`;
              // More spending is shown in lilac only for non-essentials that rose by more than 25%
              const cls = prev && x.p && d > 0 && d / x.p > 0.25 && !S.cat(x.c).essential ? 'up' : prev && d < -100 ? 'down' : '';
              return `<div class="cat-row">
                <div class="name"><i class="ess${S.cat(x.c).essential ? '' : ' no'}" aria-label="${S.cat(x.c).essential ? 'Essential' : 'Non-essential'}"></i><span>${F.esc(x.c)}</span></div>
                <div class="cat-track"><b style="width:${(x.v / max) * 100}%"></b>${prev ? `<b class="prev" style="width:${(x.p / max) * 100}%"></b>` : ''}</div>
                <div class="fig"><div class="v">${F.inr(x.v)}</div>${prev ? `<div class="d ${cls}">${dTxt}</div>` : ''}</div>
              </div>`;
            }).join('')}</div>
          </div>
        </section>

        <div class="stack">
          <section class="panel" aria-labelledby="ess-h">
            <div class="panel-head"><div><h2 class="panel-title" id="ess-h">Essentials vs non-essentials</h2><div class="panel-desc">${monthLabel(month)}</div></div></div>
            <div class="panel-body">
              <div class="money-bar" aria-hidden="true" style="height:20px">
                <span class="seg seg-bills" style="flex:${split.essential || 0.0001}"></span><span class="seg seg-goals" style="flex:${split.nonEssential || 0.0001};border-radius:0 8px 8px 0"></span>
              </div>
              <div class="before-after" style="grid-template-columns:1fr 1fr">
                <div><div class="k"><span class="legend"><span><i class="key-bills"></i>Essentials</span></span></div><div class="v num">${F.inr(split.essential)}</div><div class="s">${F.pct(split.total ? split.essential / split.total : 0)} · rent, bills, groceries, transport</div></div>
                <div><div class="k"><span class="legend"><span><i class="key-goals"></i>Non-essentials</span></span></div><div class="v num">${F.inr(split.nonEssential)}</div><div class="s">${F.pct(split.total ? split.nonEssential / split.total : 0)} · eating out, shopping, fun</div></div>
              </div>
              ${prev ? (() => {
                const ps = S.essentialSplit(prev);
                const dn = split.nonEssential - ps.nonEssential;
                return `<p class="callout" style="margin-top:18px">${I('info', 16)}<span>${partial ? `So far this month. Last month, non-essentials were ${F.inr(ps.nonEssential)} in total.` : Math.abs(dn) < 300 ? `Non-essential spending was about the same as in ${S.monthName(prev, true)}.` : `Non-essentials were <b>${F.inr(Math.abs(dn))} ${dn > 0 ? 'higher' : 'lower'}</b> than in ${S.monthName(prev, true)}, while essentials ${Math.abs(split.essential - ps.essential) < 500 ? 'stayed about the same' : `changed by ${F.inr(split.essential - ps.essential)}`}.`}</span></p>`;
              })() : ''}
            </div>
          </section>

          <section class="panel" aria-labelledby="pat-h">
            <div class="panel-head"><div><h2 class="panel-title" id="pat-h">Patterns</h2><div class="panel-desc">What stands out in ${monthLabel(month)}</div></div></div>
            <ul class="list">${patterns(month).map(p => `<li class="list-item" style="align-items:flex-start"><div class="grow">
              <div class="li-sub">${p.k}</div><div class="li-title" style="margin-top:2px">${F.esc(p.t)}</div><div class="li-sub" style="margin-top:2px">${p.d}</div></div></li>`).join('')}</ul>
          </section>
        </div>
      </div>

      <section class="panel section" aria-labelledby="mm-h">
        <div class="panel-head"><div><h2 class="panel-title" id="mm-h">Month by month</h2><div class="panel-desc">Essential and non-essential spending for complete months</div></div>
          <div class="legend" style="margin-top:6px"><span><i style="background:var(--chart-1)"></i>Essentials</span><span><i style="background:var(--chart-2)"></i>Non-essentials</span></div></div>
        <div class="panel-body"><div id="mm-chart"></div></div>
      </section>`;
  }

  function draw(root) {
    const el = root.querySelector('#mm-chart');
    if (!el) return;
    const keys = S.fullMonths(6);
    if (keys.length < 2) { el.innerHTML = '<p class="field-hint">The chart appears once you have two complete months.</p>'; return; }
    const sp = keys.map(k => S.essentialSplit(k));
    C.bars(el, {
      labels: keys.map(k => S.monthName(k)), height: 240, maxBar: 30,
      highlight: keys.indexOf(month),
      ariaLabel: 'Essential and non-essential spending by month',
      series: [
        { name: 'Essentials', color: 'var(--chart-1)', colors: keys.map(k => k === month ? 'var(--navy-300)' : 'var(--chart-1)'), values: sp.map(s => s.essential) },
        { name: 'Non-essentials', color: 'var(--chart-2)', colors: keys.map(k => k === month ? 'var(--chart-2)' : 'var(--data-soft)'), values: sp.map(s => s.nonEssential) }
      ],
      tooltip: i => `<div class="tt-title">${S.monthName(keys[i], true)} ${keys[i].slice(0, 4)}</div>` +
        C.row('var(--chart-1)', 'Essentials', F.inr(sp[i].essential)) + C.row('var(--data-soft)', 'Non-essentials', F.inr(sp[i].nonEssential)) +
        `<div class="tt-note">Total ${F.inr(sp[i].total)}</div>`
    });
  }

  function mount(root) {
    draw(root);
    ui.on(root, 'click', '[data-seg="smonth"] button', (e, b) => { month = b.dataset.value; SW.refresh(); });
  }

  SW.pages.spending = { render, mount };
})();
