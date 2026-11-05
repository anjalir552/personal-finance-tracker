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

  let catsAll = false, notesAll = false;   // progressive disclosure
  const CATS_SHOWN = 7, NOTES_SHOWN = 3;

  /** "₹6,200 (13%) more than September": the one change line under the headline figure */
  function changeLine(total, prevTotal, prevKey) {
    const d = total - prevTotal;
    if (Math.abs(d / prevTotal) < 0.01) return `<span class="sa-chg flat">About the same as ${S.monthName(prevKey, true)}</span>`;
    return `<span class="sa-chg ${d > 0 ? 'up' : 'down'}">${I(d > 0 ? 'arrowUp' : 'arrowDown', 14)}${F.inr(Math.abs(d))} (${F.pct(Math.abs(d / prevTotal))}) ${d > 0 ? 'more' : 'less'} than ${S.monthName(prevKey, true)}</span>`;
  }

  function leadHTML({ month, prev, total, prevTotal, partial, split, mover }) {
    const mLong = S.monthName(month, true);
    const change = !prev || !prevTotal ? `<span class="sa-chg flat">No earlier month to compare with</span>`
      : partial ? `<span class="sa-chg flat">Month in progress. ${S.monthName(prev, true)} came to ${F.inr(prevTotal)}.</span>`
      : changeLine(total, prevTotal, prev);
    const pe = prev ? S.essentialSplit(prev) : null;
    let note = '';
    if (pe) {
      const dn = split.nonEssential - pe.nonEssential;
      note = partial ? `So far this month. Last month, non-essentials were ${F.inr(pe.nonEssential)} in total.`
        : Math.abs(dn) < 300 ? `Non-essentials were about the same as in ${S.monthName(prev, true)}.`
        : `Non-essentials were <b>${F.inr(Math.abs(dn))} ${dn > 0 ? 'higher' : 'lower'}</b> than in ${S.monthName(prev, true)}, while essentials ${Math.abs(split.essential - pe.essential) < 500 ? 'stayed about the same' : `changed by ${F.inr(split.essential - pe.essential)}`}.`;
    }
    const share = v => F.pct(split.total ? v / split.total : 0);
    return `<section class="sa-lead" aria-labelledby="sa-lead-h">
      <div class="sa-total">
        <h2 class="sa-eyebrow" id="sa-lead-h">${partial ? `Spent so far in ${mLong}` : `Spent in ${mLong}`}</h2>
        <div class="sa-big num">${F.inr(total)}</div>
        ${change}
      </div>
      <div class="sa-split">
        <h3 class="sa-eyebrow">Essentials and the rest</h3>
        <div class="sa-splitbar" role="img" aria-label="Essentials ${F.inr(split.essential)}, non-essentials ${F.inr(split.nonEssential)}">
          <span class="e" style="flex:${split.essential || 0.0001}"></span><span class="n" style="flex:${split.nonEssential || 0.0001}"></span>
        </div>
        <dl class="sa-splitfigs">
          <div><dt><i class="e"></i>Essentials</dt><dd class="num">${F.inr(split.essential)}</dd><dd class="s">${share(split.essential)} · rent, bills, groceries, transport</dd></div>
          <div><dt><i class="n"></i>Non-essentials</dt><dd class="num">${F.inr(split.nonEssential)}</dd><dd class="s">${share(split.nonEssential)} · eating out, shopping, fun</dd></div>
        </dl>
        ${note ? `<p class="sa-note">${note}</p>` : ''}
      </div>
    </section>`;
  }

  function categoriesHTML(cats, prev, month) {
    const max = Math.max(1, ...cats.map(x => Math.max(x.v, x.p)));
    const shown = catsAll ? cats : cats.slice(0, CATS_SHOWN);
    return `<div class="sa-cats">
      <div class="sa-cats-head"><h3 class="sa-sub-title">By category</h3>
        ${prev ? `<span class="sa-key"><i class="bar"></i>${S.monthName(month, true)}<i class="tick"></i>${S.monthName(prev, true)}</span>` : ''}</div>
      <ol class="sa-catlist">${shown.map(x => {
        const d = x.v - x.p, ess = S.cat(x.c).essential;
        const flag = prev && x.p && d > 0 && d / x.p > 0.25 && d >= 100 && !ess;
        const dTxt = !prev ? '' : !x.p ? 'New' : Math.abs(d) < 100 ? 'Steady' : `${d > 0 ? '+' : '−'}${F.inr(Math.abs(d))}`;
        const cls = flag ? 'flag' : prev && d < -100 ? 'down' : '';
        return `<li class="sa-cat">
          <span class="sa-cname"><i class="ess${ess ? '' : ' no'}"></i><span>${F.esc(x.c)}</span><span class="sr-only">${ess ? ', essential' : ', non-essential'}</span></span>
          <span class="sa-track" aria-hidden="true"><b class="${flag ? 'flag' : ''}" style="width:${(x.v / max) * 100}%"></b>${prev && x.p ? `<u style="left:${(x.p / max) * 100}%"></u>` : ''}</span>
          <span class="sa-amt num">${F.inr(x.v)}</span>
          ${prev ? `<span class="sa-d num ${cls}">${dTxt}</span>` : ''}
        </li>`;
      }).join('')}</ol>
      <div class="sa-foot"><p class="sa-key"><i class="ess"></i>Essential <i class="ess no"></i>Non-essential</p>
        ${cats.length > CATS_SHOWN ? `<button type="button" class="link sa-more" data-cats-more aria-expanded="${catsAll}">${catsAll ? 'Show fewer' : `Show all ${cats.length} categories`}</button>` : ''}</div>
    </div>`;
  }

  function notesHTML(notes) {
    const shown = notesAll ? notes : notes.slice(0, NOTES_SHOWN);
    return `<div class="sa-notes">
      <h3 class="sa-sub-title">Worth a look</h3>
      <ul class="sa-notelist">${shown.map(p => `<li class="${p.tone || ''}"><div class="k">${p.k}</div><div class="t">${F.esc(p.t)}</div><div class="d">${p.d}</div></li>`).join('')}</ul>
      ${notes.length > NOTES_SHOWN ? `<button type="button" class="link sa-more" data-notes-more aria-expanded="${notesAll}">${notesAll ? 'Show fewer' : `Show ${notes.length - NOTES_SHOWN} more`}</button>` : ''}
    </div>`;
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
    const mover = cats.slice().sort((a, b) => (b.v - b.p) - (a.v - a.p))[0];
    const split = S.essentialSplit(month);
    const partial = month === S.CUR_MONTH;

    // What to look at: the biggest rise first (complete months only), then the patterns in the transactions
    const notes = patterns(month);
    if (prev && !partial && prevTotal && mover && mover.v - mover.p > 500) {
      notes.unshift({ k: 'Biggest rise', tone: 'attention', t: `${mover.c}, +${F.inr(mover.v - mover.p)}`, d: `${F.inr(mover.v)} in ${S.monthName(month, true)}, up from ${F.inr(mover.p)} in ${S.monthName(prev, true)}.` });
    }
    const segMonths = months.slice(-5);

    return `
      ${ui.pageHeader({ title: 'Spending Analysis', sub: `Where your money went in ${monthLabel(month)}${prev ? ` and what changed since ${S.monthName(prev, true)}` : ''}.` })}

      <div class="sa-bar">
        ${ui.segmented('smonth', segMonths.map(k => ({ value: k, label: S.monthName(k) + (k === S.CUR_MONTH ? ' (so far)' : '') })), month, 'Month')}
        <span class="sa-vs">${prev ? `Compared with ${S.monthName(prev, true)}` : 'First month on record'}</span>
      </div>

      ${leadHTML({ month, prev, total, prevTotal, partial, split, mover })}

      <div class="fi-board sa-board">
        <section class="fi-band" aria-labelledby="cat-h">
          <h2 class="fi-sec-title" id="cat-h">Where it went</h2>
          <p class="fi-sec-desc">${F.inr(total)} across ${cats.filter(x => x.v).length} categories${prev ? `. Lilac bars are non-essentials that rose by more than a quarter.` : '.'}</p>
          <div class="fi-duo sa-duo">
            <div class="fi-chart">${categoriesHTML(cats, prev, month)}</div>
            <div class="fi-chart">${notesHTML(notes)}</div>
          </div>
        </section>
        <section class="fi-band" aria-labelledby="mm-h">
          <div class="sa-sec-row"><div><h2 class="fi-sec-title" id="mm-h">Month by month</h2>
            <p class="fi-sec-desc">Essential and non-essential spending for complete months</p></div>
            <div class="legend"><span><i style="background:var(--chart-1)"></i>Essentials</span><span><i style="background:var(--chart-2)"></i>Non-essentials</span></div></div>
          <div id="mm-chart" class="sa-chart"></div>
        </section>
      </div>`;
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
        { name: 'Essentials', color: 'var(--chart-1)', colors: keys.map(k => k === month ? 'var(--chart-1)' : 'var(--navy-300)'), values: sp.map(s => s.essential) },
        { name: 'Non-essentials', color: 'var(--chart-2)', colors: keys.map(k => k === month ? 'var(--chart-2)' : 'var(--data-soft)'), values: sp.map(s => s.nonEssential) }
      ],
      tooltip: i => `<div class="tt-title">${S.monthName(keys[i], true)} ${keys[i].slice(0, 4)}</div>` +
        C.row('var(--chart-1)', 'Essentials', F.inr(sp[i].essential)) + C.row('var(--data-soft)', 'Non-essentials', F.inr(sp[i].nonEssential)) +
        `<div class="tt-note">Total ${F.inr(sp[i].total)}</div>`
    });
  }

  function mount(root) {
    draw(root);
    ui.on(root, 'click', '[data-seg="smonth"] button', (e, b) => { month = b.dataset.value; catsAll = notesAll = false; SW.refresh(); });
    ui.on(root, 'click', '[data-cats-more]', () => { catsAll = !catsAll; SW.refresh(); });
    ui.on(root, 'click', '[data-notes-more]', () => { notesAll = !notesAll; SW.refresh(); });
  }

  SW.pages.spending = { render, mount };
})();
