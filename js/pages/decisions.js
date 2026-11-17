/* Purchase Decisions: "Can I afford this without affecting my other goals?"
   A workbench. The purchase is described on the left (name, category, price, the date you'd
   like it); everything on the right answers from the user's own numbers and redraws on every
   keystroke: the verdict, a snapshot of today's money, the running sum as a waterfall, and the
   balance path of buying now, buying later or saving first.
   All money comes from SW.store: evaluatePurchase, purchasePlans and projectBalance. */
SW.pages = SW.pages || {};
(function () {
  const F = SW.fmt, S = SW.store, ui = SW.ui, I = SW.icon, C = SW.charts;
  const SEED = SW.seed;
  let inp = null;
  let ov = {};            // what-if fields the user typed over; the rest follow live numbers
  let plan = null;        // 'now' | 'later' | 'save'; null = follow the recommendation
  let saveMonthly = null; // the save-first amount; null = suggested
  let lastSaved = null;
  let projOpen = false;   // balance-path chart toggle
  let payFrom = 'spend';  // goal impact: 'spend' (the normal order) or 'savings' (pay it from savings)
  let root = null;

  const PLAN_NAMES = { now: 'Buy now', later: 'Delay', save: 'Save first' };
  const TITLE = {
    comfortable: () => `Yes, it fits comfortably.`,
    tight: () => `It fits, but it’s tight until payday.`,
    buffer: () => `Only by using your emergency buffer.`,
    goals: () => `Only by cutting this month’s savings.`,
    everyday: () => `It cuts into money for essentials.`,
    bills: () => `It leaves you short for bills.`,
    over: () => `It’s more than your whole balance.`
  };
  const TAG_ICON = { good: 'checkCircle', caution: 'info', alert: 'alert' };
  const OUTCOME = { bought: 'Bought', waiting: 'Waiting', saving: 'Saving for it', skipped: 'Skipped' };
  const PRIORITY = { '': 'Not set', need: 'Need', want: 'Want', nice: 'Nice to have' };
  const VERDICT_SHORT = { comfortable: 'Fitted comfortably', tight: 'Fitted, but tight', buffer: 'Needed the buffer', goals: 'Needed savings', everyday: 'Cut into essentials', bills: 'Short for bills', over: 'Over balance' };

  function mine() {
    const m = S.moneyMap();
    const st = S.state.settings;
    return { balance: m.balance, bills: m.bills, goals: m.goals, everyday: m.everyday, income: st.monthlyIncome, cushion: m.buffer, daysLeft: m.daysLeft, flexRemaining: m.flexRemaining };
  }
  const defaults = () => Object.assign({ name: 'Kurta set for a cousin’s wedding', category: 'Shopping & grooming', price: 3000, date: S.TODAY, priority: 'want' }, mine());
  const changed = () => { const m = mine(); return ['balance', 'bills', 'goals', 'everyday', 'cushion', 'daysLeft'].some(k => +inp[k] !== +m[k]); };
  const catRoom = () => { const r = S.monthBudget().find(x => x.cat === inp.category); return r && r.kind === 'flexible' ? r.left : 0; };
  const evaluate = () => S.evaluatePurchase(Object.assign({}, inp, { catRoom: catRoom() }));
  const cap = s => s.replace(/^./, c => c.toUpperCase());
  const days = n => `${n} day${n === 1 ? '' : 's'}`;
  const fill = (v, min, max) => `${Math.max(0, Math.min(100, ((v - min) / ((max - min) || 1)) * 100)).toFixed(1)}%`;   // the filled part of a slider track
  const ordinal = n => n + ([11, 12, 13].includes(n % 100) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));

  /* ---------- The three plans, with their balance paths ---------- */
  function plans(r) {
    const p = S.purchasePlans(r, saveMonthly);
    const payday = S.nextPayday();
    const laterOn = inp.date > S.TODAY ? inp.date : payday;
    const probe = S.projectBalance({ start: r.balance, price: r.price, saveMonthly: p.save.monthly, days: 400 });
    const horizon = Math.max(92, Math.min(400, probe.readyOn ? F.daysBetween(S.TODAY, probe.readyOn) + 21 : 92));
    const base = S.projectBalance({ start: r.balance, days: horizon });
    const path = {
      now: S.projectBalance({ start: r.balance, price: r.price, buyOn: S.TODAY, days: horizon }),
      later: S.projectBalance({ start: r.balance, price: r.price, buyOn: laterOn, days: horizon }),
      save: S.projectBalance({ start: r.balance, price: r.price, saveMonthly: p.save.monthly, days: horizon })
    };
    const untilPay = F.daysBetween(S.TODAY, payday);
    const lowBefore = pp => Math.min(...pp.values.slice(0, untilPay));
    let rec;
    if (r.key === 'comfortable') rec = 'now';
    else if (r.key === 'tight') rec = p.wait.ok || laterOn > payday || (lowBefore(path.now) < r.cushion && lowBefore(path.later) >= r.cushion) ? 'later' : 'now';
    else rec = p.wait.ok ? 'later' : 'save';
    const names = { now: PLAN_NAMES.now, later: laterOn === payday ? 'Wait until payday' : `Buy on ${F.short(laterOn)}`, save: PLAN_NAMES.save };
    return { p, payday, laterOn, horizon, base, path, lowBefore, rec, names, cur: plan || rec };
  }

  function priorityLine(r) {
    if (inp.priority === 'nice' && r.key !== 'comfortable') return ' As a nice-to-have, waiting costs you nothing.';
    if (inp.priority === 'need' && r.tone === 'alert') return ' If it’s a real need, the options below show the least painful way to pay for it.';
    if (inp.priority === 'want' && r.key === 'tight') return ' It’s a want, so it’s worth asking whether it can wait until payday.';
    return '';
  }

  /* ---------- The answer ---------- */
  function answerHTML(r, P) {
    const avg = S.categoryAverage(inp.category);
    const catLine = r.price && avg > 0 ? `You usually spend ${F.inr(avg)} a month on ${inp.category.toLowerCase()}; this is ${r.price >= avg * 1.95 ? `${(r.price / avg).toFixed(1).replace(/\.0$/, '')}× that` : F.pct(r.price / avg) + ' of it'}.`
      : r.price ? `You haven’t spent on ${inp.category.toLowerCase()} in the last three months${S.cat(inp.category).essential ? ', and it counts as essential' : ''}.` : '';
    if (!r.price) return `<div class="pd-answer-text"><h2 class="pd-verdict-title" id="ans-h">Enter a price to see how it fits.</h2>
        <p class="pd-verdict-sub">Your Safe-to-Spend is ${F.inr(r.free)} until payday, after commitments, essentials, this month’s savings and your buffer.</p></div>
      <div class="pd-answer-fig"><span class="k">Safe to spend</span><span class="v num">${F.inr(r.free)}</span><span class="s">for ${days(r.daysLeft)}</span></div>`;
    const short = r.after < 0;
    return `<div class="pd-answer-text">
        <span class="verdict-tag ${r.tone}">${I(TAG_ICON[r.tone], 15)}${r.label}</span>
        <h2 class="pd-verdict-title" id="ans-h">${TITLE[r.key](r)}</h2>
        <p class="pd-verdict-sub">${r.reasons[0]}${catLine ? ` ${catLine}` : ''}${priorityLine(r)}</p>
        <div class="pd-answer-cta"><button type="button" class="btn btn-primary" data-jump="cmp-h">Choose how to buy it</button><span class="pd-answer-best">Best fit: <b>${P.names[P.rec]}</b></span></div>
      </div>
      <div class="pd-answer-fig${short ? ' short' : ''}">
        <span class="k">Safe to spend after buying it today</span>
        <span class="v num">${F.inr(r.after)}</span>
        <span class="s">${r.after > 0 ? `${F.inr(r.after / r.daysLeft)} a day for ${days(r.daysLeft)}` : 'Taken from money already set aside'}</span>
      </div>`;
  }

  /* ---------- How it fits: one bar, and the sum written out beneath it ---------- */
  function barHTML(r) {
    return ui.moneyBar({ balance: r.balance, bills: r.bills, everyday: r.everyday, goals: r.goals, buffer: r.cushion, free: r.free }, r.price);
  }
  function ledgerHTML(r) {
    const committed = r.bills + r.everyday + r.goals + r.cushion;
    const sub = (cls, k, v) => `<div class="lg-sub"><dt><i class="${cls}"></i>${k}</dt><dd class="num">${F.inr(v)}</dd></div>`;
    return `<dl class="pd-ledger">
        <div class="lg-row"><dt><i class="sp"></i>Current balance${ov.balance ? '<span class="s">Your what-if figure</span>' : ''}</dt><dd class="num">${F.inr(r.balance)}</dd></div>
        <div class="lg-row"><dt><i class="sp"></i>Committed before payday</dt><dd class="num"><span aria-hidden="true">−</span><span class="sr-only">minus </span>${F.inr(committed)}</dd></div>
        ${sub('key-bills', 'Commitments', r.bills)}${sub('key-everyday', 'Essentials still to buy', r.everyday)}${sub('key-goals', 'Savings still to move', r.goals)}${sub('key-buffer', 'Monthly buffer', r.cushion)}
        <div class="lg-row lg-total"><dt><i class="key-free"></i>Safe to spend<span class="s">Until payday on ${F.short(S.nextPayday())}; ${F.inr(r.flexRemaining)} of it is already planned for food, shopping and plans</span></dt><dd class="num">${F.inr(r.free)}</dd></div>
        <div class="lg-row lg-buy"><dt><i class="key-purchase"></i>${F.esc(inp.name.trim() || 'This purchase')}<span class="s">${r.price && r.free > 0 ? `${r.share >= 10 ? '10×+' : F.pct(r.share)} of your Safe-to-Spend` : r.price ? 'Nothing is safe to spend until payday' : 'Enter a price'}</span></dt><dd class="num">${F.inr(r.price)}</dd></div>
      </dl>`;
  }

  /* ---------- What changes until payday ---------- */
  function impactHTML(r) {
    if (!r.price) return '';
    const perBefore = r.free / r.daysLeft, perAfter = r.after / r.daysLeft;
    const rows = [
      ['Daily spending money', F.inr(Math.max(0, perBefore)), F.inr(Math.max(0, perAfter)), perAfter < perBefore * 0.5],
      ['Other planned spending', F.inr(r.flexibleUntil), r.after >= r.flexibleUntil ? 'Still covered' : `${F.inr(Math.max(0, r.after))} left for it`, r.after < r.flexibleUntil],
      ['Monthly buffer', F.inr(r.cushion), r.usesBuffer ? F.inr(r.cushion - r.usesBuffer) : 'Untouched', r.usesBuffer > 0],
      ['Savings this month', F.inr(r.goals), r.usesGoals ? `${F.inr(r.goals - r.usesGoals)}` : 'Untouched', r.usesGoals > 0],
      ['Essentials and commitments', F.inr(r.everyday + r.bills), r.usesEveryday + r.usesBills ? `${F.inr(r.everyday + r.bills - r.usesEveryday - r.usesBills)}` : 'Untouched', r.usesEveryday + r.usesBills > 0]
    ];
    return `<table class="pd-impact">
        <caption class="sr-only">What changes until payday if you buy it today</caption>
        <thead><tr><th scope="col">Until payday</th><th scope="col" class="r">Now</th><th scope="col" class="r">If you buy it</th></tr></thead>
        <tbody>${rows.map(([k, a, b, bad]) => `<tr><th scope="row">${k}</th><td class="r num">${a}</td><td class="r num${bad ? ' warn' : ''}">${b}</td></tr>`).join('')}</tbody>
      </table>
      <details class="disclosure pd-why"><summary><span>Why this answer</span>${I('chevronDown', 18)}</summary>
        <ul class="disc-body reasons">${r.reasons.map(x => `<li>${x}</li>`).join('')}</ul></details>`;
  }

  function drawWaterfall(r) {
    const el = root.querySelector('[data-waterfall]');
    if (!el) return;
    const note = root.querySelector('[data-wf-note]');
    if (note) note.textContent = 'Each step takes out money already spoken for';
    C.waterfall(el, {
      height: 230,
      ariaLabel: `Balance ${F.inr(r.balance)}, minus commitments ${F.inr(r.bills)}, essentials ${F.inr(r.everyday)}, savings ${F.inr(r.goals)} and buffer ${F.inr(r.cushion)}, leaves ${F.inr(r.free)} safe to spend; minus the purchase ${F.inr(r.price)} leaves ${F.inr(r.after)}.`,
      steps: [
        { label: 'Balance', kind: 'start', value: r.balance, cls: 'start' },
        { label: 'Due', kind: 'minus', value: r.bills, cls: 'bills' },
        { label: 'Essentials', short: 'Ess.', kind: 'minus', value: r.everyday, cls: 'everyday' },
        { label: 'Savings', short: 'Save', kind: 'minus', value: r.goals, cls: 'goals' },
        { label: 'Buffer', short: 'Buf.', kind: 'minus', value: r.cushion, cls: 'buffer' },
        { label: 'Safe', short: 'Safe', kind: 'total', cls: 'free' },
        { label: 'Purchase', short: 'Buy', kind: 'minus', value: r.price, cls: 'buy' },
        { label: 'Left', kind: 'total', cls: r.after < 0 ? 'left short' : 'left' }
      ],
      reference: null
    });
  }

  /* ---------- Goal Impact Analyzer ---------- */
  function goalImpactHTML(r) {
    if (!r.price) return '';
    if (!S.activeGoals().length) return `<p class="pd-gi-none">${I('info', 16)}<span>You have no active savings goals, so nothing to protect here. <a class="link" href="#/goals">Create a goal</a></span></p>`;
    const gi = S.goalImpact(r.price, payFrom, r.usesGoals);
    const touched = gi.touched;
    const late = touched.filter(x => x.lateAfter && !x.lateBefore);
    const lead = payFrom === 'spend'
      ? (r.usesGoals ? `Buying it today takes <b>${F.inr(r.usesGoals)}</b> from this month’s goal transfers. ${touched.map(x => `${F.esc(x.g.name)} moves ${x.delay === 0 ? 'no later' : x.delay === Infinity || x.delay == null ? 'out of reach' : `${x.delay} month${x.delay === 1 ? '' : 's'} later`}`).join('; ')}.`
        : `Paid from your spending money, it leaves every goal where it is: this month’s ${F.inr(S.goalsThisCycle())} of transfers still goes in.${r.usesBuffer ? ` It does use ${F.inr(r.usesBuffer)} of your buffer.` : ''}`)
      : `If you paid for it from savings instead, ${touched.map(x => `${F.inr(x.fromTransfer + x.fromSaved)} would come out of ${F.esc(x.g.name)}`).join(' and ')}${touched.length ? ', lowest priority first.' : '.'}${late.length ? ` <b class="warn">${late.map(x => F.esc(x.g.name)).join(' and ')} would miss ${late.length > 1 ? 'their deadlines' : 'its deadline'}.</b>` : ''}`;
    return `<div class="pd-gi-bar">
        <p class="pd-gi-lead">${lead}</p>
        ${ui.segmented('payfrom', [{ value: 'spend', label: 'Pay from spending money' }, { value: 'savings', label: 'Pay from savings' }], payFrom, 'How it is paid for')}
      </div>
      ${SW.flows.goalTable(gi.rows, { showSaved: payFrom === 'savings' })}
      ${gi.uncovered ? `<p class="pd-gi-none warn">${I('alert', 16)}<span>Your savings can’t cover ${F.inr(gi.uncovered)} of it.</span></p>` : ''}`;
  }

  /* ---------- Buy now, delay, save first ---------- */
  function compareHTML(r, P) {
    if (!r.price) return '';
    const { p, payday, laterOn, path, lowBefore, rec, cur, names } = P;
    const later = laterOn > payday;
    const laterLabel = names.later;
    const saveReady = path.save.readyOn || (p.save.when + '-01');
    const maxMonthly = Math.max(1000, Math.ceil(r.price / 100) * 100);
    const low = pp => lowBefore(pp);
    const col = (id, title, when, whenSub, lines) => `<div class="pd-plan${cur === id ? ' on' : ''}">
      <button type="button" class="pd-plan-pick" role="radio" aria-checked="${cur === id}" tabindex="${cur === id ? 0 : -1}" data-pick="${id}">
        <span class="pd-radio" aria-hidden="true"></span><span>${title}</span>${rec === id ? '<span class="pd-best">Best fit</span>' : ''}</button>
      <div class="pd-when"><span class="num">${when}</span><span class="s">${whenSub}</span></div>
      <dl class="pd-lines">${lines.map(([k, v, bad]) => `<div><dt>${k}</dt><dd class="num${bad ? ' warn' : ''}">${v}</dd></div>`).join('')}</dl>
    </div>`;
    const sel = path[cur];
    const below = sel.values.findIndex(x => x < r.cushion);
    const commitLabel = { now: 'I’ll buy it now', later: laterOn === payday ? `I’ll wait until ${F.short(payday)}` : `I’ll buy it on ${F.short(laterOn)}`, save: `I’ll save ${F.inr(p.save.monthly)} a month` }[cur];
    const needs = p.now.fromGoals + p.now.fromNeeds;
    const slider = `<label class="pd-slider"><span class="pd-slider-k">Amount each month <b class="num">${F.inr(p.save.monthly)}</b></span>
        <input type="range" min="500" max="${maxMonthly}" step="100" value="${Math.min(maxMonthly, p.save.monthly)}" style="--p:${fill(Math.min(maxMonthly, p.save.monthly), 500, maxMonthly)}" data-monthly aria-label="Monthly amount to save" aria-valuetext="${F.inr(p.save.monthly)} a month" />
        <span class="pd-slider-ends num"><span>₹500</span><span>${F.inrc(maxMonthly)}</span></span></label>`;
    return `<div class="pd-plan-row" role="radiogroup" aria-labelledby="cmp-h">
        ${col('now', 'Buy now', 'Today', `${days(r.daysLeft)} to payday`, [
          ['Lowest before payday', F.inr(low(path.now)), low(path.now) < r.cushion],
          ['Safe to spend left', F.inr(p.now.left), p.now.left < 0],
          ['Taken from savings and bills', F.inr(needs), needs > 0]
        ])}
        ${col('later', laterLabel, F.date(laterOn, false), `in ${days(F.daysBetween(S.TODAY, laterOn))}${later ? ', after payday' : ''}`, [
          ['Lowest before payday', F.inr(low(path.later)), low(path.later) < r.cushion],
          ['Left that month', F.inr(p.wait.left), !p.wait.ok],
          ['Share of a typical month', isFinite(p.wait.share) ? (p.wait.share >= 10 ? '10×+' : F.pct(p.wait.share)) : '—', p.wait.share > 0.8]
        ])}
        ${col('save', 'Save first', F.date(saveReady, true).replace(/^\d+ /, ''), `${p.save.months} payday${p.save.months === 1 ? '' : 's'} of saving`, [
          ['Lowest before payday', F.inr(low(path.save)), low(path.save) < r.cushion],
          ['Put aside each payday', F.inr(p.save.monthly), !p.save.fits],
          ['Fits a typical month', p.save.fits ? 'Yes' : `${F.inr(p.save.monthly - Math.max(0, r.surplus))} less spending`, !p.save.fits]
        ])}
      </div>
      <div class="pd-commit">
        ${cur === 'save' ? slider : ''}
        <button type="button" class="btn btn-primary" data-save="${{ now: 'bought', later: 'waiting', save: 'saving' }[cur]}">${commitLabel}</button>
        ${cur === 'save' ? `<button type="button" class="btn btn-secondary" data-action="goal">${I('goals', 15)}Make it a savings goal</button>` : ''}
        <button type="button" class="btn btn-ghost" data-save="skipped">Skip it</button>
        <span class="pd-commit-note">Saving a decision doesn’t record a transaction.</span>
      </div>
      <div class="pd-proj">
        <p class="pd-proj-desc">If your usual spending carries on, scheduled bills land on their dates and pay arrives on the ${ordinal(F.d(payday).getDate())}. ${below >= 0 ? `<b class="warn">With this plan your balance drops below your ${F.inr(r.cushion)} buffer on ${F.date(sel.dates[below], false)}.</b>` : `With this plan your balance stays above your ${F.inr(r.cushion)} buffer; its lowest point is ${F.inr(sel.low.value)} on ${F.date(sel.low.date, false)}.`}</p>
        <details class="pd-more" data-proj-more ${projOpen ? 'open' : ''}>
          <summary><span>Balance path, ${S.monthName(S.CUR_MONTH)} to ${S.monthName(P.base.dates[P.base.dates.length - 1].slice(0, 7))}</span>${I('chevronDown', 16)}</summary>
          <div class="legend pd-proj-legend"><span><i class="lg-sel"></i>${names[cur]}</span><span><i class="lg-other"></i>Other plans</span><span><i class="lg-base"></i>Without it</span></div>
          <div data-proj></div>
        </details>
      </div>`;
  }

  function drawProjection(r, P) {
    const el = root.querySelector('[data-proj]');
    if (!el) return;
    const css = getComputedStyle(root);
    const v = n => css.getPropertyValue(n).trim();
    const { path, base, cur, names } = P;
    const dates = base.dates;
    const others = Object.keys(path).filter(k => k !== cur);
    const pays = S.paydaysUntil(dates[dates.length - 1]);
    C.line(el, {
      labels: dates.map(d => F.date(d, false)),
      height: 220, zero: false,
      ariaLabel: `Projected balance for each plan over ${dates.length - 1} days`,
      reference: r.cushion ? { value: r.cushion, label: `Buffer ${F.inrc(r.cushion)}`, align: 'start' } : null,
      markers: pays.slice(0, 4).map(pd => ({ index: dates.indexOf(pd), label: '', color: v('--gray-200') })).filter(m => m.index > 0),
      series: [
        { name: 'Without it', color: v('--gray-400'), values: base.values, dashed: true, width: 1.5 },
        ...others.map(k => ({ name: names[k], color: v('--gray-300'), values: path[k].values, width: 1.25 })),
        { name: names[cur], color: v('--accent'), values: path[cur].values, width: 2.5 }
      ],
      tooltip: i => `<div class="tt-title">${F.date(dates[i])}${pays.includes(dates[i]) ? ' · payday' : ''}</div>
        ${C.row(v('--accent'), names[cur], F.inr(path[cur].values[i]))}
        ${others.map(k => C.row(v('--gray-400'), names[k], F.inr(path[k].values[i]))).join('')}
        ${C.row(v('--gray-400'), 'Without it', F.inr(base.values[i]), true)}`
    });
  }

  /* ---------- Inputs ---------- */
  function field(name, label, opts = {}) {
    return `<label class="field"><span class="field-label">${label}</span>
      ${opts.days ? `<div class="input-affix has-suf"><input class="input num" type="number" min="1" max="62" name="${name}" value="${inp[name]}" inputmode="numeric" /><span class="affix suf">days</span></div>` : ui.moneyInput(name, inp[name])}</label>`;
  }

  function formHTML() {
    const payday = S.nextPayday();
    const cats = SEED.CATEGORIES.map(c => c.id);
    return `<form class="pd-form" data-form autocomplete="off" onsubmit="return false" aria-labelledby="form-h">
      <h2 class="pd-form-title" id="form-h">The purchase</h2>
      <div class="pd-form-grid">
        <label class="field pd-name"><span class="field-label">What are you buying?</span><input class="input" name="name" value="${F.esc(inp.name)}" placeholder="e.g. Concert tickets…" /></label>
        <label class="field pd-cat"><span class="field-label">Category</span><select class="select" name="category">${cats.map(c => `<option ${c === inp.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label class="field pd-prio"><span class="field-label">Priority <span class="opt">Optional</span></span><select class="select" name="priority">${Object.entries(PRIORITY).map(([v, l]) => `<option value="${v}" ${v === (inp.priority || '') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field pd-price"><span class="field-label">Price</span>
          <div class="input-affix has-pre price-input"><span class="affix pre">₹</span><input class="input num" name="price" inputmode="numeric" value="${inp.price ? F.num(inp.price) : ''}" placeholder="0" data-money /></div></label>
        <div class="field pd-date"><label class="field-label" for="pd-date">When would you like it?</label>
          <input class="input" type="date" id="pd-date" name="date" value="${inp.date}" min="${S.TODAY}" aria-describedby="date-hint" />
          <div class="pd-quick" role="group" aria-label="Quick dates">
            <button type="button" class="pd-chip" data-date="${S.TODAY}" aria-pressed="${inp.date === S.TODAY}">Today</button>
            <button type="button" class="pd-chip" data-date="${payday}" aria-pressed="${inp.date === payday}">Payday, ${F.short(payday)}</button>
            <button type="button" class="pd-chip" data-date="${F.addDays(S.TODAY, 60)}" aria-pressed="${inp.date === F.addDays(S.TODAY, 60)}">In 2 months</button>
          </div>
          <span class="field-hint" id="date-hint">A later date shapes the “Wait” plan.</span></div>
      </div>
      <details class="disclosure pd-adjust" ${changed() ? 'open' : ''}>
        <summary><span>Try a what-if<span class="sum-sub">Balance, commitments, savings</span></span>${I('chevronDown', 18)}</summary>
        <div class="disc-body">
          <div class="form-grid">
            ${field('balance', 'Balance')}
            ${field('bills', 'Commitments before payday')}
            ${field('goals', 'Savings still to move')}
            ${field('everyday', 'Essentials still to buy')}
            ${field('cushion', 'Monthly buffer')}
            ${field('daysLeft', 'Days to payday', { days: true })}
          </div>
          <button type="button" class="link pd-reset" data-action="mine" ${changed() ? '' : 'hidden'}>${I('reset', 14)}Back to my numbers</button>
        </div>
      </details>
    </form>`;
  }

  /* ---------- History ---------- */
  function historyHTML() {
    const list = S.state.decisions.slice().sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
    const skipped = list.filter(d => d.outcome === 'skipped').reduce((a, d) => a + d.price, 0);
    return `<div class="pd-sec-head"><h2 class="pd-sec-title" id="h-h">Past decisions</h2>
        ${list.length ? `<p class="pd-sec-desc">${list.length} checked${skipped ? ` · <b>${F.inr(skipped)}</b> not spent by skipping` : ''}</p>` : ''}</div>
      ${list.length ? `<div class="table-wrap pd-hist"><table class="table">
        <thead><tr><th scope="col">Purchase</th><th scope="col" class="hide-sm">Checked</th><th scope="col" class="hide-sm">Answer</th><th scope="col">Decision</th><th scope="col" class="r">Price</th><th scope="col"><span class="sr-only">Remove</span></th></tr></thead>
        <tbody>${list.map(d => `<tr>
          <th scope="row" class="cell-title">${F.esc(d.name)}<span class="cell-sub">${F.esc(d.category || '')}</span></th>
          <td class="hide-sm subtle num">${F.date(d.date)}</td>
          <td class="hide-sm subtle">${VERDICT_SHORT[d.verdict] || ''}</td>
          <td>${ui.badge(d.outcome, OUTCOME[d.outcome])}</td>
          <td class="r amt">${F.inr(d.price)}</td>
          <td class="r"><button class="icon-btn sm" data-del="${d.id}" aria-label="Remove ${F.esc(d.name)}">${I('trash', 16)}</button></td></tr>`).join('')}</tbody>
      </table></div>` : `<div class="pd-hist-empty">${ui.empty({ icon: 'decisions', title: 'No decisions saved yet', text: 'After you check a purchase, save what you decided. It helps to look back on what was worth it.' })}</div>`}`;
  }

  function render() {
    if (!inp) inp = defaults();
    if (inp.date < S.TODAY) inp.date = S.TODAY;
    const live = mine();
    Object.keys(live).forEach(k => { if (!ov[k]) inp[k] = live[k]; });
    const st = S.state;
    const noData = !st.transactions.length && !st.settings.openingBalance;
    const r = evaluate();
    const P = plans(r);
    return `
      ${ui.pageHeader({ title: 'Purchase Decisions', sub: 'Before you buy, see whether it fits your Safe-to-Spend, what it does to upcoming commitments, and how it moves your savings goals.' })}
      ${noData ? `<p class="callout" style="margin-bottom:20px">${I('info', 16)}<span>You haven’t added your balance yet, so the numbers start at zero. <a class="link" href="#/settings">Add your balance</a> for a real answer, or type your own numbers to try it out.</span></p>` : ''}
      <div class="pd-sheet">
      <div class="pd">
        <aside class="pd-side">${formHTML()}</aside>
        <div class="pd-main">
          <section class="pd-answer ${r.tone || ''}" data-answer aria-live="polite" aria-labelledby="ans-h">${answerHTML(r, P)}</section>
          <section class="pd-fit" aria-labelledby="snap-h">
            <div class="pd-sec-head"><h2 class="pd-sec-title" id="snap-h">How it fits</h2><p class="pd-sec-desc">Your balance, less what’s already spoken for before payday${r.price ? ', and what buying it changes' : ''}</p></div>
            <div data-snap>${barHTML(r)}</div>
            <div class="pd-fit-grid">
              <div data-ledger>${ledgerHTML(r)}</div>
              <div data-break ${r.price ? '' : 'hidden'}><div data-impact>${impactHTML(r)}</div>
              <details class="disclosure pd-steps"><summary><span>Step by step</span>${I('chevronDown', 18)}</summary>
                <div class="disc-body"><div class="pd-wf" data-waterfall></div><p class="pd-wf-note"><i aria-hidden="true"></i><span data-wf-note>Each step takes out money already spoken for</span></p></div></details></div>
            </div>
          </section>
          <section class="pd-goals" aria-labelledby="gi-h" data-gi-wrap ${r.price ? '' : 'hidden'}>
            <div class="pd-sec-head"><h2 class="pd-sec-title" id="gi-h">Effect on your goals</h2><p class="pd-sec-desc">Goal progress, this month’s transfer and when each goal is reached, before and after</p></div>
            <div data-gi>${goalImpactHTML(r)}</div>
          </section>
          <section class="pd-compare" aria-labelledby="cmp-h" data-compare-wrap ${r.price ? '' : 'hidden'}>
            <div class="pd-sec-head"><h2 class="pd-sec-title" id="cmp-h">Your options</h2><p class="pd-sec-desc">Buy now, wait, or save first. The one you pick is the one you can save.</p></div>
            <div data-compare>${compareHTML(r, P)}</div>
          </section>
        </div>
      </div>
      <section class="pd-history" aria-labelledby="h-h" data-history>${historyHTML()}</section>
      </div>
      <p class="hero-note">${I('shield', 15)}<span>An estimate from the numbers above, not financial advice. Money is used in this order: Safe-to-Spend, then the monthly buffer, then this month’s savings, then essentials, then bills. Income isn’t counted until it arrives. Saving a decision doesn’t record a transaction.</span></p>`;
  }

  /* ---------- Live updates ---------- */
  function update(focusPick) {
    const r = evaluate();
    const P = plans(r);
    const ans = root.querySelector('[data-answer]');
    ans.className = `pd-answer ${r.price ? r.tone : ''}`;
    ans.innerHTML = answerHTML(r, P);
    root.querySelector('[data-snap]').innerHTML = barHTML(r);
    root.querySelector('[data-ledger]').innerHTML = ledgerHTML(r);
    root.querySelector('[data-break]').hidden = !r.price;
    root.querySelector('[data-compare-wrap]').hidden = !r.price;
    root.querySelector('[data-gi-wrap]').hidden = !r.price;
    root.querySelector('[data-gi]').innerHTML = goalImpactHTML(r);
    root.querySelector('[data-impact]').innerHTML = impactHTML(r);
    const cmp = root.querySelector('[data-compare]');
    const slider = document.activeElement && document.activeElement.matches('[data-monthly]');
    cmp.innerHTML = compareHTML(r, P);
    if (slider) cmp.querySelector('[data-monthly]')?.focus();
    if (focusPick) cmp.querySelector(`[data-pick="${focusPick}"]`)?.focus();
    if (r.price) { drawWaterfall(r); drawProjection(r, P); }
    const reset = root.querySelector('[data-action="mine"]');
    if (reset) reset.hidden = !changed();
    root.querySelectorAll('[data-date]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.date === inp.date)));
  }

  function mount(r0) {
    root = r0;
    const form = root.querySelector('[data-form]');
    ui.bindMoney(form);
    const r = evaluate();
    if (r.price) { drawWaterfall(r); drawProjection(r, plans(r)); }
    form.addEventListener('input', e => {
      const t = e.target;
      if (t.name === 'date') {
        inp.date = t.value && t.value >= S.TODAY ? t.value : S.TODAY;
        plan = null;
      } else if (t.name) {
        if (!['name', 'price', 'category', 'priority'].includes(t.name)) ov[t.name] = true;
        inp[t.name] = ['name', 'category', 'priority'].includes(t.name) ? t.value : t.name === 'daysLeft' ? Math.max(1, +t.value || 1) : ui.money(t.value);
       
      }
      if (t.name === 'price') saveMonthly = null;
      update();
    });
    form.addEventListener('change', e => { if (['category', 'priority'].includes(e.target.name)) { inp[e.target.name] = e.target.value; update(); } });
    ui.on(root, 'click', '[data-date]', (e, b) => { inp.date = b.dataset.date; form.date.value = inp.date; plan = null; update(); });
    root.addEventListener('input', e => {
      if (!e.target.matches('[data-monthly]')) return;
      saveMonthly = +e.target.value;
      plan = 'save';
      update();
    });
    ui.on(root, 'click', '[data-jump]', (e, b) => { const t = root.querySelector('#' + b.dataset.jump); if (t) t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); });
    ui.on(root, 'click', '[data-pick]', (e, b) => { plan = b.dataset.pick; update(plan); });
    ui.on(root, 'click', '[data-seg="payfrom"] button', (e, b) => { payFrom = b.dataset.value; update(); root.querySelector(`[data-seg="payfrom"] [data-value="${payFrom}"]`)?.focus(); });
    ui.on(root, 'click', '.pd-plan', (e, t) => {
      if (e.target.closest('input, label, button')) return;
      const b = t.querySelector('[data-pick]');
      if (b && b.dataset.pick !== (plan || plans(evaluate()).rec)) { plan = b.dataset.pick; update(plan); }
    });
    root.addEventListener('toggle', e => { if (e.target.matches('[data-proj-more]')) projOpen = e.target.open; }, true);
    root.addEventListener('keydown', e => {
      const b = e.target.closest('[data-pick]');
      if (!b) return;
      const order = ['now', 'later', 'save'];
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      plan = order[(order.indexOf(b.dataset.pick) + step + 3) % 3];
      update(plan);
    });
    ui.on(root, 'click', '[data-action="mine"]', () => { ov = {}; Object.assign(inp, mine()); SW.refresh(); ui.toast('Back to your own numbers'); });
    ui.on(root, 'click', '[data-save]', (e, b) => {
      const r = evaluate();
      const key = `${inp.name}|${r.price}|${b.dataset.save}`;
      if (!r.price) { form.price.focus(); return; }
      if (lastSaved === key) { ui.toast('Already saved', 'info'); return; }
      lastSaved = key;
      S.state.decisions.push({ id: 'd-' + Date.now(), date: S.TODAY, name: inp.name.trim() || 'Untitled purchase', category: inp.category, priority: inp.priority || '', wanted: inp.date, price: r.price, verdict: r.key, outcome: b.dataset.save });
      S.save();
      root.querySelector('[data-history]').innerHTML = historyHTML();
      ui.toast('Decision saved');
    });
    ui.on(root, 'click', '[data-action="goal"]', () => {
      const r = evaluate();
      const p = S.purchasePlans(r, saveMonthly);
      SW.pages.goals.openForm({ name: inp.name.trim() || 'New purchase', target: r.price, monthly: p.save.monthly, deadline: p.save.when + '-28', start: 0 });
    });
    ui.on(root, 'click', '[data-del]', (e, b) => {
      const d = S.state.decisions.find(x => x.id === b.dataset.del);
      S.state.decisions = S.state.decisions.filter(x => x.id !== b.dataset.del);
      S.save();
      root.querySelector('[data-history]').innerHTML = historyHTML();
      ui.toast(`Removed “${F.esc(d.name)}”`);
    });
  }

  SW.pages.decisions = { render, mount };
})();
