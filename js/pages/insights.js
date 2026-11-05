/* Financial Insights: "How did this month go, and what changed?"
   A monthly report. A strip of months picks the report; under it the statement (income,
   spending, savings, what was left) and where the money went, four charts that each answer
   one question (spending by month, its pace, the savings rate, essentials against the rest),
   each category against last month, then the findings S.insights(month) computes for it. */
SW.pages = SW.pages || {};
(function () {
  const F = SW.fmt, S = SW.store, ui = SW.ui, I = SW.icon, C = SW.charts;
  let month = null;   // selected month
  let type = 'all';   // observation filter
  let catsAll = false, obsAll = false, rateOpen = false;   // progressive disclosure
  const CATS_SHOWN = 6, OBS_SHOWN = 4;

  const months = () => S.months().filter(k => S.inMonth(k).length);
  const mLong = k => S.monthName(k, true);
  const isCur = k => k === S.CUR_MONTH;

  /** "+₹2,300 vs Sep": the difference of the two values shown, in words with a good/bad colour */
  function change(now, prev, prevKey, goodWhenUp) {
    if (prev == null) return `<span class="fi-chg flat">No earlier month</span>`;
    const d = Math.round(now) - Math.round(prev);
    if (!d) return `<span class="fi-chg flat">Same as ${S.monthName(prevKey)}</span>`;
    const good = goodWhenUp ? d > 0 : d < 0;
    return `<span class="fi-chg ${good ? 'good' : 'bad'}">${I(d > 0 ? 'arrowUp' : 'arrowDown', 12)}${F.inr(Math.abs(d))} vs ${S.monthName(prevKey)}</span>`;
  }

  function statementHTML(cur, prev, prevKey) {
    const fig = (label, v, chg, cls = '') => `<div class="fi-fig ${cls}"><dt class="k">${label}</dt><dd><span class="v num">${F.inr(v)}</span>${chg}</dd></div>`;
    const flowTotal = Math.max(cur.income, cur.essential + cur.nonEssential + cur.saved, 1);
    const parts = [
      ['ess', 'Essentials', cur.essential], ['non', 'Non-essentials', cur.nonEssential], ['sav', 'Saved to goals', cur.saved],
      cur.left >= 0 ? ['left', 'Left over', cur.left] : ['over', 'Taken from balance', -cur.left]
    ].filter(p => p[2] > 0);
    return `<section class="fi-statement" aria-labelledby="st-h">
      <h2 class="sr-only" id="st-h">${mLong(cur.key)} ${cur.key.slice(0, 4)} summary</h2>
      <dl class="fi-figs">
        ${fig('Income', cur.income, change(cur.income, prev && prev.income, prevKey, true))}
        ${fig('Spent', cur.spent, change(cur.spent, prev && prev.spent, prevKey, false))}
        ${fig('Saved to goals', cur.saved, change(cur.saved, prev && prev.saved, prevKey, true), 'saved')}
        ${fig(cur.left >= 0 ? 'Left over' : 'Overspent', Math.abs(cur.left), cur.left >= 0 ? change(cur.left, prev && prev.left, prevKey, true) : change(-cur.left, prev && -prev.left, prevKey, false), cur.left < 0 ? 'neg' : '')}
      </dl>
      <div class="fi-flow">
        <div class="fi-flow-head"><h3 class="fi-flow-title">Where ${F.inr(cur.income)} went</h3>${isCur(cur.key) ? `<span class="fi-flow-note">So far, to ${F.short(S.TODAY)}</span>` : ''}</div>
        <div class="fi-flowbar" role="img" aria-label="${parts.map(p => `${p[1]} ${F.inr(p[2])}`).join(', ')}">${parts.map(p => `<span class="f-${p[0]}" style="flex:${p[2] / flowTotal}"></span>`).join('')}</div>
        <ul class="fi-flowkey">${parts.map(p => `<li><i class="f-${p[0]}"></i><span>${p[1]}</span><b class="num">${F.inr(p[2])}</b></li>`).join('')}</ul>
      </div>
    </section>`;
  }

  /* ---------- The month strip: every month as a button, its savings rate under it ---------- */
  function monthsHTML(list) {
    return `<div class="fi-months" role="group" aria-label="Choose a month">
      <button type="button" class="icon-btn fi-mnav" data-mon="-1" aria-label="Previous month" ${list.indexOf(month) <= 0 ? 'disabled' : ''}>${I('chevronLeft', 18)}</button>
      <div class="fi-mlist" data-mlist>${list.map(k => {
        const m = S.monthSummary(k);
        return `<button type="button" class="fi-mbtn" data-month="${k}" aria-pressed="${k === month}" tabindex="${k === month ? 0 : -1}">
          <span class="n">${S.monthName(k)} <span class="y">${k.slice(0, 4)}</span></span>
          <span class="r num">${isCur(k) ? 'So far' : `${F.pct(m.rate)} saved`}</span></button>`;
      }).join('')}</div>
      <button type="button" class="icon-btn fi-mnav" data-mon="1" aria-label="Next month" ${list.indexOf(month) >= list.length - 1 ? 'disabled' : ''}>${I('chevronRight', 18)}</button>
    </div>`;
  }

  /* ---------- Essentials against non-essentials, against the usual ---------- */
  function splitHTML(key) {
    const cur = S.monthSummary(key);
    const base = [1, 2, 3].map(i => S.addMonths(key, -i)).filter(k => S.inMonth(k).length);
    const avg = f => base.length ? base.reduce((a, k) => a + f(S.monthSummary(k)), 0) / base.length : null;
    const rows = [
      ['Essentials', 'Rent, bills, groceries, transport, health', cur.essential, avg(m => m.essential), 'ess'],
      ['Non-essentials', 'Eating out, shopping, plans, subscriptions', cur.nonEssential, avg(m => m.nonEssential), 'non']
    ];
    const max = Math.max(...rows.flatMap(r => [r[2], r[3] || 0]), 1);
    return `<div class="fi-split">
      ${rows.map(([n, d, v, a, cls]) => {
        const diff = a != null ? v - a : null;
        const bad = cls === 'non' && diff > 500;
        const note = a == null ? 'No earlier months to compare' : Math.abs(diff) < 1 ? 'Same as usual' : `${F.inr(Math.abs(diff))} ${diff > 0 ? 'above' : 'below'} usual`;
        return `<div class="fi-split-row" title="${d}">
          <div class="fi-split-top"><span class="n">${n}</span><span class="v num">${F.inr(v)}</span></div>
          <div class="fi-pair-bars" aria-hidden="true"><b class="f-${cls}" style="width:${(v / max) * 100}%"></b>${a != null ? `<i style="width:${(a / max) * 100}%"></i>` : ''}</div>
          <div class="fi-split-sub"><span class="${bad ? 'warn' : diff < -500 ? 'pos' : ''}">${note}</span></div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function categoriesHTML(key, prevKey) {
    const rows = S.categoryCompare(key).filter(r => r.now || r.prev);
    if (!rows.length) return '';
    const max = Math.max(...rows.map(r => Math.max(r.now, r.prev)), 1);
    const total = rows.reduce((a, r) => a + r.now, 0);
    const shown = catsAll ? rows : rows.slice(0, CATS_SHOWN);
    return `<section class="fi-section fi-cats" aria-labelledby="cat-h">
      <div class="fi-sec-head"><div><h2 class="fi-sec-title" id="cat-h">Categories against ${mLong(prevKey)}</h2>
        <p class="fi-sec-desc">The bar is ${mLong(key)}${isCur(key) ? ' so far' : ''}; the thin line under it is ${mLong(prevKey)}.</p></div>
        <a class="link" href="#/spending">Full spending analysis${I('arrowRight', 14)}</a></div>
      <div class="table-wrap"><table class="table fi-table">
        <thead><tr><th scope="col">Category</th><th scope="col" class="fi-bar-col"><span class="sr-only">Comparison</span></th><th scope="col" class="r">${S.monthName(key)}</th><th scope="col" class="r">Change</th><th scope="col" class="r hide-sm">3-month avg</th><th scope="col" class="r hide-sm">Share</th></tr></thead>
        <tbody>${shown.map(r => {
          const d = r.now - r.prev;
          const big = Math.abs(d) >= 500 && r.prev && Math.abs(d / r.prev) >= 0.2;
          return `<tr>
            <th scope="row" class="cell-title"><span class="fi-catname">${r.essential ? '<i class="ess" title="Essential"></i>' : '<i class="ess no"></i>'}${F.esc(r.cat)}</span></th>
            <td class="fi-bar-col"><div class="fi-cbar"><b style="width:${(r.now / max) * 100}%"></b><b class="prev" style="width:${(r.prev / max) * 100}%"></b></div></td>
            <td class="r amt">${F.inr(r.now)}</td>
            <td class="r num fi-d ${!d ? 'flat' : d > 0 ? (big ? 'bad' : 'up') : 'good'}">${!d ? '—' : (d > 0 ? '+' : '−') + F.inr(Math.abs(d))}</td>
            <td class="r num hide-sm subtle">${r.avg ? F.inr(r.avg) : '—'}</td>
            <td class="r num hide-sm subtle">${total ? F.pct(r.now / total) : '—'}</td></tr>`;
        }).join('')}</tbody>
      </table></div>
      <div class="fi-cats-foot"><p class="fi-cats-key"><i class="ess"></i> Essential category</p>${rows.length > CATS_SHOWN ? `<button type="button" class="link fi-more-btn" data-cats-more aria-expanded="${catsAll}">${catsAll ? 'Show fewer' : `Show all ${rows.length} categories`}</button>` : ''}</div>
    </section>`;
  }

  const obsFor = () => S.insights(isCur(month) ? undefined : month);
  function obsHTML(all) {
    const list = all.filter(x => type === 'all' || x.type === type);
    const latest = S.fullMonths(1)[0];
    const desc = isCur(month) ? `${mLong(month)} isn’t over yet. These are from ${mLong(latest)}, your latest complete month`
      : month === latest ? `${mLong(month)} against the months before it, plus your goals and what’s due now`
      : `${mLong(month)} against the three months before it`;
    return `<div class="fi-sec-head fi-obs-head">
        <div><h2 class="fi-sec-title" id="obs-h">What stands out</h2><p class="fi-sec-desc">${desc}</p></div>
        ${ui.segmented('itype', [
          { value: 'all', label: 'All', count: all.length },
          { value: 'spending', label: 'Spending', count: all.filter(x => x.type === 'spending').length },
          { value: 'savings', label: 'Savings', count: all.filter(x => x.type === 'savings').length },
          { value: 'upcoming', label: 'Upcoming', count: all.filter(x => x.type === 'upcoming').length }
        ], type, 'Observation type')}
      </div>
      <div class="fi-obs" data-obs>${list.length ? (obsAll ? list : list.slice(0, OBS_SHOWN)).map(x => `<article class="fi-ob ${x.tone}">
          <div class="fi-ob-fig"><span class="num">${x.figure || ''}</span><span class="n">${x.figureNote || ''}</span></div>
          <div class="fi-ob-body"><h3>${x.title}</h3><p>${x.text}</p>${x.detail ? `<p class="d">${x.detail}</p>` : ''}</div>
          <a class="link" href="${x.link[0]}">${x.link[1]}${I('arrowRight', 14)}</a>
        </article>`).join('') : ui.empty({ icon: 'insights', title: 'Nothing to flag here', text: 'No observations of this kind right now. That’s usually a good sign.' })}</div>
      ${list.length > OBS_SHOWN ? `<button type="button" class="link fi-more-btn fi-obs-more" data-obs-more aria-expanded="${obsAll}">${obsAll ? 'Show fewer' : `Show ${list.length - OBS_SHOWN} more`}</button>` : ''}`;
  }

  function render() {
    const list = months();
    if (S.fullMonths(4).length < 1 || !list.length) {
      return `${ui.pageHeader({ title: 'Financial Insights', sub: 'Your month in figures: income, spending, savings and what changed.' })}
        <section class="panel">${ui.empty({ icon: 'insights', title: 'Insights need a little history', text: 'Once you’ve recorded about a month of transactions, this page will report on it and compare it with the next.', action: `<a class="btn btn-primary btn-sm" href="#/transactions">${I('plus', 15)}Add transactions</a>` })}</section>`;
    }
    if (!month || !list.includes(month)) month = S.fullMonths(1)[0] || list[list.length - 1];
    const idx = list.indexOf(month);
    const prevKey = S.addMonths(month, -1);
    const hasPrev = list.includes(prevKey);
    const cur = S.monthSummary(month);
    const prev = hasPrev ? S.monthSummary(prevKey) : null;
    const top = obsFor().find(x => x.tone === 'attention');
    const sub = `${mLong(month)} ${month.slice(0, 4)}${isCur(month) ? ', so far' : ''}: you saved <b>${F.pct(cur.rate)} of income</b>${cur.left < 0 ? ` and spent <b class="warn">${F.inr(-cur.left)} more than came in</b>` : ''}.${top && !isCur(month) ? ` ${top.title}.` : ''}`;

    return `
      ${ui.pageHeader({ title: 'Financial Insights', sub })}
      ${monthsHTML(list)}
      ${statementHTML(cur, prev, prevKey)}
      <div class="fi-board">
        <section class="fi-band" aria-labelledby="sp-sec">
          <h2 class="fi-sec-title" id="sp-sec">Spending</h2>
          <p class="fi-take" data-trend-desc></p>
          <div class="fi-duo">
            <div class="fi-chart">
              <h3 class="fi-chart-title" id="tr-h">Month by month</h3>
              <p class="fi-cap">Select a bar to open that month.</p>
              <div data-trend></div>
            </div>
            <div class="fi-chart">
              <h3 class="fi-chart-title" id="pace-h">Pace through the month</h3>
              <p class="fi-cap" data-pace-desc></p>
              <div data-pace></div>
            </div>
          </div>
        </section>
        <section class="fi-band" aria-labelledby="sv-sec">
          <h2 class="fi-sec-title" id="sv-sec">Savings</h2>
          <div class="fi-duo">
            <div class="fi-chart fi-hero">
              <h3 class="fi-chart-title" id="sr-h">Share of income saved</h3>
              <div data-rate-hero></div>
              <details class="fi-more" data-rate-more ${rateOpen ? 'open' : ''}>
                <summary><span data-rate-sum>By month</span>${I('chevronDown', 16)}</summary>
                <div data-rate></div>
              </details>
            </div>
            <div class="fi-chart">
              <h3 class="fi-chart-title" id="sp-h">Essentials and the rest</h3>
              <p class="fi-cap">${mLong(month)}${isCur(month) ? ' so far' : ''}. The thin line is your usual.</p>
              ${splitHTML(month)}
            </div>
          </div>
        </section>
      </div>
      ${hasPrev ? categoriesHTML(month, prevKey) : ''}
      <section class="fi-section fi-obs-wrap" aria-labelledby="obs-h">${obsHTML(obsFor())}</section>
      <p class="hero-note">${I('shield', 15)}<span>Every figure comes from your own transactions, goals and upcoming expenses. It describes your numbers and isn’t financial advice.</span></p>`;
  }

  function drawCharts(root) {
    const list = months();
    const sums = list.map(k => S.monthSummary(k));
    const sel = list.indexOf(month);
    const css = getComputedStyle(root);
    const v = n => css.getPropertyValue(n).trim();
    const dim = (base, faded) => list.map((k, i) => (i === sel ? base : faded));
    const pick = i => { month = list[i]; SW.refresh(); root = document.querySelector('.page-insights'); root?.querySelector(`[data-month="${month}"]`)?.focus(); };
    const c = sums[sel];
    const done = sums.filter(x => !isCur(x.key));

    // 1. Spending by month: one bar per month against your average; the split and income are in the tooltip
    const avgSpent = done.length ? done.reduce((a, x) => a + x.spent, 0) / done.length : 0;
    C.bars(root.querySelector('[data-trend]'), {
      labels: list.map(k => S.monthName(k)), minimal: true,
      series: [{ name: 'Spent', colors: dim(v('--c-spent'), v('--lav-150')), values: sums.map(x => x.spent) }],
      reference: done.length ? { value: avgSpent, label: `Average ${F.inrc(avgSpent, 0)}`, align: sel > list.length / 2 ? 'start' : 'end' } : null,
      valueLabel: x => F.inr(x),
      highlight: sel, height: 210, maxBar: 44, onSelect: pick,
      ariaLabel: 'Total spending by month against the average',
      tooltip: i => `<div class="tt-title">${mLong(list[i])}${isCur(list[i]) ? ' (so far)' : ''}</div>
        ${C.row(v('--navy-700'), 'Essentials', F.inr(sums[i].essential))}${C.row(v('--c-spent'), 'Non-essentials', F.inr(sums[i].nonEssential))}
        ${C.row('#fff', 'Income', F.inr(sums[i].income))}
        <div class="tt-note">Spent ${F.pct(sums[i].income ? sums[i].spent / sums[i].income : 0)} of income</div>`
    });
    const up = c.spent > avgSpent;
    root.querySelector('[data-trend-desc]').innerHTML = isCur(month) ? `<b>${F.inr(c.spent)}</b> so far this month` :
      `<b class="${c.spent > avgSpent * 1.03 ? 'warn' : c.spent < avgSpent * 0.97 ? 'pos' : ''}">${I(up ? 'arrowUp' : 'arrowDown', 22)}${F.inr(Math.abs(c.spent - avgSpent))} ${up ? 'above' : 'below'}</b> your ${done.length}-month average`;

    // 2. Savings: the rate against the 20% guide, then the months behind it
    const TARGET = 0.2;
    const avgRate = done.length ? done.reduce((a, x) => a + x.rate, 0) / done.length : 0;
    const scale = Math.max(0.3, c.rate * 1.15);
    const ok = c.rate >= TARGET;
    root.querySelector('[data-rate-hero]').innerHTML = `
      <div class="fi-rate-fig"><span class="v num">${F.pct(c.rate)}</span><span class="n">of income saved${isCur(month) ? ' so far' : ''}</span></div>
      <div class="fi-gauge" role="img" aria-label="${F.pct(c.rate)} saved; the guide is ${F.pct(TARGET)}">
        <span class="fill" style="width:${Math.max(0, Math.min(1, c.rate / scale)) * 100}%"></span>
        <i style="left:${(TARGET / scale) * 100}%"><em>20% guide</em></i></div>
      <p class="fi-rate-note"><b class="${ok ? 'pos' : 'warn'}">${ok ? 'At or above' : `${F.pct(TARGET - c.rate)} below`}</b> the 20% guide</p>`;
    root.querySelector('[data-rate-sum]').textContent = done.length ? `By month · ${F.pct(avgRate)} on average` : 'By month';
    C.bars(root.querySelector('[data-rate]'), {
      labels: list.map(k => S.monthName(k)), minimal: true,
      series: [{ name: 'Savings rate', colors: dim(v('--c-spent'), v('--lav-150')), values: sums.map(x => Math.round(x.rate * 1000) / 10) }],
      reference: { value: TARGET * 100, label: '20% guide', align: sel > list.length / 2 ? 'start' : 'end' },
      valueLabel: x => x + '%',
      highlight: sel, height: 170, maxBar: 36, onSelect: pick,
      ariaLabel: 'Share of income saved to goals by month',
      tooltip: i => `<div class="tt-title">${mLong(list[i])}${isCur(list[i]) ? ' (so far)' : ''}</div>
        ${C.row(v('--c-spent'), 'Saved', F.inr(sums[i].saved))}${C.row(v('--gray-400'), 'Of income', F.pct(sums[i].rate))}`
    });

    // 3. Spending pace against the month before; each line is named where it ends
    const prevKey = S.addMonths(month, -1);
    const cur = S.dailyCumulative(month);
    const prev = list.includes(prevKey) ? S.dailyCumulative(prevKey) : null;
    const n = Math.max(cur.length, prev ? prev.length : 0);
    const pad = a => a ? Array.from({ length: n }, (_, i) => (i < a.length ? a[i] : null)) : null;
    const last = a => a.reduce((r, x, i) => (x != null ? i : r), -1);
    const lastIdx = Math.max(0, last(cur));
    const series = [];
    if (prev) series.push({ name: S.monthName(prevKey), label: `${S.monthName(prevKey)} ${F.inrc(prev[last(prev)], 1)}`, labelColor: v('--text-3'), color: v('--gray-400'), values: pad(prev), dashed: true, width: 1.75 });
    series.push({ name: S.monthName(month), label: `${S.monthName(month)} ${F.inrc(cur[lastIdx] ?? 0, 1)}`, labelColor: v('--text'), color: v('--c-spent'), values: pad(cur), width: 2.5, endDot: true });
    C.line(root.querySelector('[data-pace]'), {
      labels: Array.from({ length: n }, (_, i) => String(i + 1)),
      series, height: 210, zero: true, xEvery: 10, minimal: true, endLabels: true,
      ariaLabel: 'Running total of spending by day of month',
      tooltip: i => `<div class="tt-title">Day ${i + 1}</div>
        ${cur[i] != null ? C.row(v('--c-spent'), S.monthName(month), F.inr(cur[i])) : ''}
        ${prev && prev[i] != null ? C.row(v('--gray-400'), S.monthName(prevKey), F.inr(prev[i]), true) : ''}`
    });
    const desc = root.querySelector('[data-pace-desc]');
    // compare at the last day both months have (the 31st has no counterpart in a 30-day month)
    const at = prev ? Math.min(lastIdx, last(prev)) : -1;
    if (prev && at >= 0 && cur[at] != null) {
      const d = cur[at] - prev[at];
      desc.innerHTML = `<b class="${d > 0 ? 'warn' : 'pos'}">${F.inr(Math.abs(d))} ${d > 0 ? 'more' : 'less'}</b> than ${S.monthName(prevKey)} by day ${at + 1}`;
    } else desc.textContent = `Running total through ${mLong(month)}`;
  }

  function mount(r) {
    if (!r.querySelector('[data-trend]')) return;
    drawCharts(r);
    const go = (k, focusSel) => {
      month = k; SW.refresh();
      const page = document.querySelector('.page-insights');
      page?.querySelector(focusSel || `[data-month="${month}"]`)?.focus();
    };
    ui.on(r, 'click', '[data-month]', (e, b) => go(b.dataset.month));
    ui.on(r, 'click', '[data-mon]', (e, b) => {
      const list = months();
      const i = Math.max(0, Math.min(list.length - 1, list.indexOf(month) + +b.dataset.mon));
      const sel = `[data-mon="${b.dataset.mon}"]`;
      go(list[i], i > 0 && i < list.length - 1 ? sel : `[data-month="${list[i]}"]`);
    });
    r.addEventListener('keydown', e => {
      const b = e.target.closest('[data-month]');
      if (!b) return;
      const list = months();
      const i = list.indexOf(b.dataset.month);
      const j = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: list.length - 1 }[e.key];
      if (j == null || j < 0 || j >= list.length) return;
      e.preventDefault();
      go(list[j]);
    });
    const ml = r.querySelector('[data-mlist] [aria-pressed="true"]');
    if (ml) ml.parentElement.scrollLeft = ml.offsetLeft - ml.parentElement.clientWidth / 2 + ml.clientWidth / 2;
    r.addEventListener('toggle', e => { if (e.target.matches('[data-rate-more]')) rateOpen = e.target.open; }, true);
    ui.on(r, 'click', '[data-cats-more]', () => {
      catsAll = !catsAll;
      const sec = r.querySelector('.fi-cats'), tmp = document.createElement('div');
      tmp.innerHTML = categoriesHTML(month, S.addMonths(month, -1));
      sec.replaceWith(tmp.firstElementChild);
      r.querySelector('[data-cats-more]')?.focus();
    });
    ui.on(r, 'click', '[data-obs-more]', () => {
      obsAll = !obsAll;
      r.querySelector('.fi-obs-wrap').innerHTML = obsHTML(obsFor());
      r.querySelector('[data-obs-more]')?.focus();
    });
    ui.on(r, 'click', '[data-seg="itype"] button', (e, b) => {
      type = b.dataset.value;
      r.querySelector('.fi-obs-wrap').innerHTML = obsHTML(obsFor());
      r.querySelector(`[data-seg="itype"] [data-value="${type}"]`)?.focus();
    });
  }

  SW.pages.insights = { render, mount };
})();
