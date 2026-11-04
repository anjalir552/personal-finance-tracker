/* State, persistence and every derived figure.
   Pages never compute money themselves: they read it from here, so the same number
   is the same on every screen. */
(function () {
  const F = SW.fmt;
  const KEY = 'scopewise:personal:v1';
  const seed = SW.seed;
  const TODAY = seed.TODAY;
  const clone = o => JSON.parse(JSON.stringify(o));
  const CAT = Object.fromEntries(seed.CATEGORIES.map(c => [c.id, c]));

  function fresh() {
    return {
      settings: clone(seed.settings),
      transactions: clone(seed.transactions),
      goals: clone(seed.goals),
      upcoming: clone(seed.upcoming),
      decisions: clone(seed.decisions),
      isNew: false
    };
  }
  function empty() {
    const s = clone(seed.settings);
    Object.assign(s, { name: '', city: '', monthlyIncome: 0, openingBalance: 0 });
    return { settings: s, transactions: [], goals: [], upcoming: [], decisions: [], isNew: true };
  }

  let state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? Object.assign(fresh(), JSON.parse(raw)) : fresh();
  } catch (e) { state = fresh(); }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: keep working in memory */ }
  }

  const sum = (arr, fn = x => x.amount) => arr.reduce((a, x) => a + (fn(x) || 0), 0);
  const monthOf = d => d.slice(0, 7);
  const addMonths = (key, n) => {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const CUR_MONTH = monthOf(TODAY);

  const S = {
    TODAY, CAT, CUR_MONTH,
    get state() { return state; },
    save,
    reset() { state = fresh(); save(); },
    clear() { state = empty(); save(); },
    cat(id) { return CAT[id] || { id, essential: false, kind: 'flexible' }; },
    nextId(prefix, list) {
      const max = list.reduce((m, x) => Math.max(m, parseInt(String(x.id).replace(/\D/g, ''), 10) || 0), 1000);
      return `${prefix}-${max + 1}`;
    },

    /* ---------- Months ---------- */
    monthName(key, long) {
      const [y, m] = key.split('-').map(Number);
      return long ? F.MONTHS_LONG[m - 1] : F.MONTHS[m - 1];
    },
    /** Months that hold any transaction, oldest first, always including the current month */
    months() {
      const set = new Set(state.transactions.map(t => monthOf(t.date)));
      set.add(CUR_MONTH);
      return [...set].sort();
    },
    /** The last n complete months before the current one */
    fullMonths(n) {
      const out = [];
      for (let i = n; i >= 1; i--) out.push(addMonths(CUR_MONTH, -i));
      return out.filter(k => state.transactions.some(t => monthOf(t.date) === k));
    },
    addMonths,

    /* ---------- Transactions ---------- */
    inMonth(key, type) { return state.transactions.filter(t => monthOf(t.date) === key && (!type || t.type === type)); },
    income(key) { return sum(S.inMonth(key, 'income')); },
    spent(key) { return sum(S.inMonth(key, 'expense')); },
    saved(key) { return sum(S.inMonth(key, 'transfer')); },
    byCategory(key) {
      const out = {};
      S.inMonth(key, 'expense').forEach(t => (out[t.category] = (out[t.category] || 0) + t.amount));
      return out;
    },
    essentialSplit(key) {
      const list = S.inMonth(key, 'expense');
      const essential = sum(list.filter(t => S.cat(t.category).essential));
      return { essential, nonEssential: sum(list) - essential, total: sum(list) };
    },
    /** Average monthly spend over the last 3 complete months for the categories that match */
    avgMonthly(filter) {
      const keys = S.fullMonths(3);
      if (!keys.length) return 0;
      return keys.reduce((a, k) => a + sum(S.inMonth(k, 'expense').filter(t => filter(S.cat(t.category), t))), 0) / keys.length;
    },
    everydayAvg() { return S.avgMonthly(c => c.kind === 'everyday'); },
    flexibleAvg() { return S.avgMonthly(c => c.kind === 'flexible'); },

    /* ---------- Balance ---------- */
    balance(asOf = TODAY) {
      return state.settings.openingBalance + state.transactions.filter(t => t.date <= asOf)
        .reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0);
    },
    /** Set today's balance by adjusting the opening balance */
    setBalance(v) { state.settings.openingBalance += v - S.balance(); },

    /* ---------- Payday cycle ---------- */
    nextPayday() {
      const d = F.d(TODAY), p = state.settings.payday || 1;
      const clampDay = (y, m) => Math.min(p, new Date(y, m + 1, 0).getDate());
      let dt = new Date(d.getFullYear(), d.getMonth(), clampDay(d.getFullYear(), d.getMonth()));
      if (dt <= d) dt = new Date(d.getFullYear(), d.getMonth() + 1, clampDay(d.getFullYear(), d.getMonth() + 1));
      return F.iso(dt);
    },
    lastPayday() {
      const n = F.d(S.nextPayday());
      const p = state.settings.payday || 1;
      return F.iso(new Date(n.getFullYear(), n.getMonth() - 1, Math.min(p, new Date(n.getFullYear(), n.getMonth(), 0).getDate())));
    },
    daysToPayday() { return Math.max(1, F.daysBetween(TODAY, S.nextPayday())); },
    cycleDays() { return Math.max(1, F.daysBetween(S.lastPayday(), S.nextPayday())); },

    /* ---------- Upcoming expenses ---------- */
    upcomingSorted() { return state.upcoming.slice().sort((a, b) => a.due.localeCompare(b.due) || b.amount - a.amount); },
    dueBefore(iso) { return S.upcomingSorted().filter(u => u.due < iso); },
    isOverdue(u) { return u.due < TODAY; },
    /** Monthly cost of everything that repeats (yearly items spread across 12 months) */
    recurringMonthly() {
      return sum(state.upcoming, u => (u.repeat === 'monthly' ? u.amount : u.repeat === 'yearly' ? u.amount / 12 : 0));
    },
    reminderDate(u) { return u.remind != null ? F.addDays(u.due, -u.remind) : null; },
    advance(u) { return u.repeat === 'none' ? null : S.advanceDate(u.due, u.repeat); },
    advanceDate(iso, repeat) {
      const d = F.d(iso);
      const months = repeat === 'yearly' ? 12 : 1;
      const day = d.getDate();
      const next = new Date(d.getFullYear(), d.getMonth() + months, 1);
      next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      return F.iso(next);
    },
    /** Pay an upcoming expense: record it and roll a recurring one forward */
    markPaid(id) {
      const u = state.upcoming.find(x => x.id === id);
      if (!u) return;
      state.transactions.push({ id: S.nextId('T', state.transactions), date: TODAY, type: 'expense', desc: u.name, category: u.category, amount: u.amount, method: u.method || 'UPI', upcomingId: u.id, dueDate: u.due });
      const next = S.advance(u);
      if (next) u.due = next; else state.upcoming = state.upcoming.filter(x => x.id !== id);
      save();
    },

    /**
     * Every payment that falls in a month: bills already paid (from transactions) and
     * scheduled ones, with recurring expenses projected forward from their next due date.
     * status: 'paid' | 'upcoming' | 'overdue'. Only the next occurrence (next: true) can be paid.
     */
    schedule(key) {
      const start = key + '-01';
      const [y, m] = key.split('-').map(Number);
      const end = F.iso(new Date(y, m, 0));
      const out = [];
      const byName = Object.fromEntries(state.upcoming.map(u => [u.name, u]));
      state.transactions.forEach(t => {
        if (t.type !== 'expense') return;
        const u = t.upcomingId ? state.upcoming.find(x => x.id === t.upcomingId) : byName[t.desc];
        if (!u && !t.upcomingId) return;
        const date = t.dueDate || t.date;
        if (date < start || date > end) return;
        out.push({ key: 'p-' + t.id, status: 'paid', date, paidOn: t.date, name: t.desc, amount: t.amount, category: t.category, upId: u ? u.id : null, repeat: u ? u.repeat : 'none', txId: t.id });
      });
      state.upcoming.forEach(u => {
        let d = u.due, first = true, guard = 0;
        while (d <= end && guard++ < 60) {
          if (d >= start) out.push({ key: u.id + '@' + d, status: d < TODAY ? 'overdue' : 'upcoming', date: d, name: u.name, amount: u.amount, category: u.category, upId: u.id, repeat: u.repeat, estimate: u.estimate, next: first });
          if (u.repeat === 'none') break;
          d = S.advanceDate(d, u.repeat); first = false;
        }
      });
      // Viewing the current month, anything still unpaid from before it is carried in as overdue
      if (key === CUR_MONTH) state.upcoming.filter(u => u.due < start).forEach(u => out.push({ key: u.id + '@' + u.due, status: 'overdue', date: u.due, name: u.name, amount: u.amount, category: u.category, upId: u.id, repeat: u.repeat, estimate: u.estimate, next: true, carried: true }));
      const order = { overdue: 0, upcoming: 1, paid: 2 };
      return out.sort((a, b) => a.date.localeCompare(b.date) || order[a.status] - order[b.status] || b.amount - a.amount);
    },
    scheduleSummary(key) {
      const list = S.schedule(key);
      const part = st => { const l = list.filter(x => x.status === st); return { amount: sum(l), count: l.length }; };
      return { total: sum(list), count: list.length, paid: part('paid'), upcoming: part('upcoming'), overdue: part('overdue'), carried: list.filter(x => x.carried).length };
    },

    /* ---------- Month analytics ---------- */
    monthSummary(key) {
      const income = S.income(key), spent = S.spent(key), saved = S.saved(key);
      const split = S.essentialSplit(key);
      return { key, income, spent, saved, left: income - spent - saved, rate: income ? saved / income : 0, essential: split.essential, nonEssential: split.nonEssential };
    },
    /** Running total of spending through a month, one value per day (null after today) */
    dailyCumulative(key) {
      const [y, m] = key.split('-').map(Number);
      const n = new Date(y, m, 0).getDate();
      const byDay = new Array(n).fill(0);
      S.inMonth(key, 'expense').forEach(t => (byDay[F.d(t.date).getDate() - 1] += t.amount));
      let run = 0;
      return byDay.map((v, i) => { const iso = `${key}-${String(i + 1).padStart(2, '0')}`; run += v; return iso > TODAY ? null : run; });
    },
    /** Each category this month against last month and the 3 months before */
    categoryCompare(key) {
      const prev = addMonths(key, -1);
      const base = [1, 2, 3].map(i => addMonths(key, -i)).filter(k => state.transactions.some(t => monthOf(t.date) === k));
      const now = S.byCategory(key), last = S.byCategory(prev);
      const avgs = {};
      base.forEach(k => Object.entries(S.byCategory(k)).forEach(([c, v]) => (avgs[c] = (avgs[c] || 0) + v / base.length)));
      const cats = new Set([...Object.keys(now), ...Object.keys(last)]);
      return [...cats].map(c => ({ cat: c, essential: S.cat(c).essential, now: now[c] || 0, prev: last[c] || 0, avg: avgs[c] || 0 }))
        .sort((a, b) => b.now - a.now || b.prev - a.prev);
    },

    /* ---------- Purchase plans: buy now, wait for payday, or save first ---------- */
    purchasePlans(r, monthly) {
      const m = Math.max(100, Math.round(monthly || r.monthly));
      const months = r.price ? Math.ceil(r.price / m) : 0;
      return {
        now: { when: TODAY, left: r.after, perDay: r.after / r.daysLeft, fromGoals: r.usesGoals, fromNeeds: r.usesEveryday + r.usesBills, ok: r.key === 'comfortable' || r.key === 'tight' },
        wait: { when: S.nextPayday(), left: r.nextFree - r.price, share: r.nextFree > 0 ? r.price / r.nextFree : Infinity, ok: r.nextFree - r.price >= r.cushion },
        save: { monthly: m, months, when: addMonths(CUR_MONTH, months), fits: m <= Math.max(0, r.surplus), ok: true }
      };
    },

    /** Average monthly spend in one category over the last 3 complete months */
    categoryAverage(cat) { return S.avgMonthly((c, t) => t.category === cat); },

    /** Paydays after today and on or before the end date */
    paydaysUntil(endIso) {
      const out = [];
      let p = S.nextPayday();
      const day = state.settings.payday || 1;
      while (p <= endIso && out.length < 40) {
        out.push(p);
        const d = F.d(p);
        const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        n.setDate(Math.min(day, new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()));
        p = F.iso(n);
      }
      return out;
    },

    /**
     * Day-by-day account balance from today if everyday and usual flexible spending carry on,
     * scheduled payments land on their due dates, pay arrives on payday and goal money moves out.
     * A purchase is either paid on `buyOn`, or saved for first: `saveMonthly` leaves the account
     * each payday into a pot until it covers the price, and the pot pays for it.
     */
    projectBalance({ start, price = 0, buyOn = null, saveMonthly = 0, days = 92 }) {
      const end = F.addDays(TODAY, days);
      const perDay = (S.everydayAvg() + S.flexibleAvg()) / 30;
      const delta = {};
      const add = (iso, v) => { const k = iso < TODAY ? TODAY : iso; if (k <= end) delta[k] = (delta[k] || 0) + v; };
      let key = CUR_MONTH;
      while (key + '-01' <= end) {
        S.schedule(key).forEach(x => { if (x.status !== 'paid') add(x.date, -x.amount); });
        key = addMonths(key, 1);
      }
      add(TODAY, -S.goalsThisCycle());
      const paydays = S.paydaysUntil(end);
      paydays.forEach(p => { add(p, state.settings.monthlyIncome || 0); add(p, -S.goalsMonthly()); });
      let readyOn = null, pot = 0;
      if (price > 0 && saveMonthly > 0) {
        for (const p of paydays) { const put = Math.min(saveMonthly, price - pot); add(p, -put); pot += put; if (pot >= price) { readyOn = p; break; } }
      } else if (price > 0 && buyOn) add(buyOn, -price);
      const dates = [], values = [];
      let bal = start, low = { value: Infinity, date: TODAY };
      for (let i = 0; i <= days; i++) {
        const iso = F.addDays(TODAY, i);
        bal += (delta[iso] || 0) - (i ? perDay : 0);
        const v = Math.round(bal);
        dates.push(iso); values.push(v);
        if (v < low.value) low = { value: v, date: iso };
      }
      return { dates, values, low, end: values[values.length - 1], readyOn, perDay };
    },

    /* ---------- Goals ---------- */
    /** Saved at the end of each month from the month the goal was created (today for this month) */
    goalHistory(g) {
      const out = [];
      let key = monthOf(g.created || TODAY);
      if (key > CUR_MONTH) key = CUR_MONTH;
      const tr = state.transactions.filter(t => t.type === 'transfer' && t.goalId === g.id);
      while (key <= CUR_MONTH) {
        const [y, m] = key.split('-').map(Number);
        const last = key === CUR_MONTH ? TODAY : F.iso(new Date(y, m, 0));
        out.push({ key, saved: g.start + sum(tr.filter(t => t.date <= last)) });
        key = addMonths(key, 1);
      }
      return out;
    },
    /** Month by month from now until the goal is reached at a monthly amount (max 60 months) */
    goalProjection(g, monthly) {
      const s = S.goalStatus(g);
      const out = [{ key: CUR_MONTH, saved: s.saved }];
      if (s.reached || !(monthly > 0)) return out;
      let v = s.saved, key = CUR_MONTH;
      while (v < g.target && out.length < 61) { key = addMonths(key, 1); v = Math.min(g.target, v + monthly); out.push({ key, saved: v }); }
      return out;
    },
    goalSaved(g) { return g.start + sum(state.transactions.filter(t => t.type === 'transfer' && t.goalId === g.id)); },
    goalStatus(g) {
      const saved = S.goalSaved(g);
      const remaining = Math.max(0, g.target - saved);
      const reached = remaining === 0;
      const monthsLeft = Math.max(0, (F.d(g.deadline).getFullYear() - F.d(TODAY).getFullYear()) * 12 + F.d(g.deadline).getMonth() - F.d(TODAY).getMonth());
      const suggested = reached ? 0 : remaining / Math.max(1, monthsLeft);
      const onTrack = reached || g.monthly >= suggested - 1;
      const thisCycle = sum(state.transactions.filter(t => t.type === 'transfer' && t.goalId === g.id && t.date >= S.lastPayday() && t.date <= TODAY));
      const setAside = reached ? 0 : Math.max(0, Math.min(g.monthly, remaining) - thisCycle);
      const monthsAtPlan = g.monthly > 0 ? Math.ceil(remaining / g.monthly) : null;
      const projected = reached ? null : monthsAtPlan != null ? addMonths(CUR_MONTH, monthsAtPlan) : null;
      const overdue = !reached && g.deadline < TODAY;
      return { saved, remaining, reached, monthsLeft, suggested, onTrack, thisCycle, setAside, projected, pct: g.target ? Math.min(1, saved / g.target) : 0, overdue };
    },
    /** The month a goal would be reached at a given monthly amount */
    goalFinish(g, monthly) {
      const s = S.goalStatus(g);
      if (s.reached) return null;
      return monthly > 0 ? addMonths(CUR_MONTH, Math.ceil(s.remaining / monthly)) : null;
    },
    /** Where the goal should be today on a straight line from its start to its deadline */
    goalPace(g) {
      const total = F.daysBetween(g.created || TODAY, g.deadline);
      if (total <= 0) return 1;
      return Math.max(0, Math.min(1, F.daysBetween(g.created || TODAY, TODAY) / total));
    },
    /** Quarter milestones with the month each is reached at the planned rate */
    goalMilestones(g) {
      const s = S.goalStatus(g);
      return [0.25, 0.5, 0.75, 1].map(p => {
        const amount = Math.round(g.target * p);
        const reached = s.saved >= amount;
        const eta = reached ? null : g.monthly > 0 ? addMonths(CUR_MONTH, Math.ceil((amount - s.saved) / g.monthly)) : null;
        return { p, amount, reached, eta };
      });
    },
    /** Money a typical month has for goals and everything flexible, after bills and essentials */
    savingsRoom() {
      const tm = S.typicalMonth();
      return { room: tm.income - tm.bills - tm.everyday, flexible: tm.flexible, income: tm.income };
    },
    activeGoals() { return state.goals.filter(g => !S.goalStatus(g).reached); },
    goalsMonthly() { return sum(S.activeGoals(), g => g.monthly); },
    /** What still needs to move into goals before the next payday */
    goalsThisCycle() { return sum(S.activeGoals(), g => S.goalStatus(g).setAside); },
    contribute(goalId, amount, date = TODAY) {
      const g = state.goals.find(x => x.id === goalId);
      state.transactions.push({ id: S.nextId('T', state.transactions), date, type: 'transfer', desc: g.name, category: 'Savings', amount, method: 'Bank transfer', goalId });
      save();
    },

    /* ---------- The money map: where today's balance is already spoken for ---------- */
    moneyMap() {
      const balance = S.balance();
      const payday = S.nextPayday();
      const daysLeft = S.daysToPayday();
      const billsList = S.dueBefore(payday);
      const bills = sum(billsList);
      const goals = S.goalsThisCycle();
      const everyday = Math.round(S.everydayAvg() * daysLeft / S.cycleDays());
      const free = balance - bills - goals - everyday;
      return { balance, bills, billsList, goals, everyday, free, perDay: free / daysLeft, daysLeft, payday };
    },

    /** A typical month once pay arrives: what's left for flexible spending */
    typicalMonth() {
      const income = state.settings.monthlyIncome || 0;
      const bills = S.recurringMonthly();
      const goals = S.goalsMonthly();
      const everyday = S.everydayAvg();
      const flexible = S.flexibleAvg();
      const free = income - bills - goals - everyday;
      return { income, bills, goals, everyday, flexible, free, surplus: free - flexible };
    },

    /* ==========================================================================
       Purchase decision model
       Money is used in this order: free money, then this month's goal savings, then
       everyday essentials, then bills. The verdict names the first layer the purchase reaches.
       ========================================================================== */
    evaluatePurchase(i) {
      const price = Math.max(0, +i.price || 0);
      const balance = +i.balance || 0;
      const bills = Math.max(0, +i.bills || 0);
      const goals = Math.max(0, +i.goals || 0);
      const everyday = Math.max(0, +i.everyday || 0);
      const cushion = Math.max(0, +i.cushion || 0);
      const daysLeft = Math.max(1, +i.daysLeft || 1);
      const flexibleUntil = Math.round((+i.flexibleAvg || 0) * daysLeft / 30);
      const free = balance - bills - goals - everyday;
      const after = free - price;
      const share = free > 0 ? price / free : Infinity;

      let key;
      if (after >= flexibleUntil + cushion) key = 'comfortable';
      else if (after >= cushion) key = 'tight';
      else if (after + goals >= 0) key = 'goals';
      else if (after + goals + everyday >= 0) key = 'everyday';
      else if (balance - price >= 0) key = 'bills';
      else key = 'over';

      const LABEL = {
        comfortable: 'Fits comfortably',
        tight: 'Fits, but it’s tight',
        goals: 'Only by pausing your savings',
        everyday: 'Cuts into money for essentials',
        bills: 'Leaves you short for bills',
        over: 'More than you have right now'
      };
      const tone = key === 'comfortable' ? 'good' : key === 'tight' ? 'caution' : 'alert';

      // How much of each layer the purchase uses
      let left = price;
      const take = cap => { const t = Math.min(Math.max(0, cap), left); left -= t; return t; };
      const usesFree = take(free);
      const usesGoals = take(goals);
      const usesEveryday = take(everyday);
      const usesBills = take(bills);

      const comfortMax = Math.max(0, free - flexibleUntil - cushion);
      const tm = S.typicalMonth();
      const income = +i.income || tm.income;
      const nextFree = income - tm.bills - tm.goals - tm.everyday;

      // Saving towards it: from any real monthly surplus, otherwise from a 20% trim of flexible spending
      const surplus = nextFree - tm.flexible;
      const trim = Math.round((tm.flexible * 0.2) / 100) * 100;
      const monthly = Math.max(500, Math.round((surplus > 1000 ? Math.min(surplus, price) : trim) / 100) * 100);
      const months = price ? Math.ceil(price / monthly) : 0;
      const readyBy = addMonths(CUR_MONTH, months);

      const reasons = [];
      const days = `${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
      if (free <= 0) {
        reasons.push(`After your upcoming expenses, this month’s savings and everyday essentials, nothing is free until payday. You are already ${F.inr(-free)} short.`);
      } else {
        reasons.push(`You have about ${F.inr(free)} free to spend until payday. This would use ${share >= 1 ? 'all of it' : `${F.pct(share)} of it`}.`);
      }
      if (key === 'comfortable') reasons.push(`You’d still have ${F.inr(after)} for the next ${days}, which covers your usual eating out, shopping and plans (${F.inr(flexibleUntil)}) and keeps your ${F.inr(cushion)} cushion.`);
      if (key === 'tight') reasons.push(`That leaves ${F.inr(after)} for the next ${days}. You usually spend about ${F.inr(flexibleUntil)} on eating out, shopping and plans in that time, so you’d need to spend about ${F.inr(flexibleUntil + cushion - after)} less to keep your cushion.`);
      if (usesGoals > 0) reasons.push(`It would use ${F.inr(usesGoals)} of the ${F.inr(goals)} meant for your savings goals this month.`);
      if (usesEveryday > 0) reasons.push(`It would also take ${F.inr(usesEveryday)} from what you usually need for groceries, transport and health before payday.`);
      if (usesBills > 0) reasons.push(`${F.inr(usesBills)} of it would come from money already needed for rent and bills.`);
      if (key === 'over') reasons.push(`The price is ${F.inr(price - balance)} more than your whole available balance.`);

      return {
        price, balance, bills, goals, everyday, cushion, free, after, share, daysLeft, flexibleUntil,
        key, label: LABEL[key], tone, usesFree, usesGoals, usesEveryday, usesBills,
        comfortMax, nextFree, nextFlexible: tm.flexible, monthly, months, readyBy, surplus, trim, reasons
      };
    },

    /* ==========================================================================
       Insights: computed from the same rows, ranked by how much they need attention
       ========================================================================== */
    /**
     * key: the month being read (default: the latest complete month). Comparisons use that
     * month against up to three months before it. Observations about today (what's due, goals,
     * subscriptions, the typical month) are only added when reading the latest complete month,
     * so an old report never mixes in today's state.
     */
    insights(key) {
      const out = [];
      const latest = S.fullMonths(1)[0];
      key = key || latest;
      if (!key || key >= CUR_MONTH) return out;
      const hasData = k => state.transactions.some(t => monthOf(t.date) === k);
      const full = [3, 2, 1, 0].map(i => addMonths(key, -i)).filter(hasData);
      if (full.length < 2) return out;
      const now = key === latest;
      const last = full[full.length - 1];
      const prev = full.slice(0, -1);
      const lastName = S.monthName(last, true);

      // 1. Unusual increases in day-to-day categories
      const cats = seed.CATEGORIES.filter(c => c.kind !== 'bill').map(c => c.id);
      const jumps = cats.map(c => {
        const now = sum(S.inMonth(last, 'expense').filter(t => t.category === c));
        const usual = prev.reduce((a, k) => a + sum(S.inMonth(k, 'expense').filter(t => t.category === c)), 0) / prev.length;
        const count = S.inMonth(last, 'expense').filter(t => t.category === c).length;
        const usualCount = prev.reduce((a, k) => a + S.inMonth(k, 'expense').filter(t => t.category === c).length, 0) / prev.length;
        return { c, now, usual, diff: now - usual, ratio: usual ? now / usual - 1 : 0, count, usualCount };
      }).filter(j => j.diff > 1000 && j.ratio > 0.25).sort((a, b) => b.diff - a.diff);
      jumps.slice(0, 2).forEach((j, idx) => {
        const freq = j.count > j.usualCount + 1 ? ` You paid for ${j.c.toLowerCase()} ${j.count} times, against about ${Math.round(j.usualCount)} in a usual month.` : '';
        const big = S.inMonth(last, 'expense').filter(t => t.category === j.c).sort((a, b) => b.amount - a.amount)[0];
        out.push({
          id: 'jump-' + j.c, type: 'spending', tone: 'attention', rank: 10 - idx, figure: j.ratio >= 1 ? `${(j.ratio + 1).toFixed(1).replace(/\.0$/, '')}×` : '+' + F.pct(j.ratio), figureNote: `${j.c.toLowerCase()} vs usual`,
          title: j.ratio >= 1 ? `${j.c} was about ${(j.ratio + 1).toFixed(1).replace(/\.0$/, '')}× your usual in ${lastName}` : `${j.c} was ${F.pct(j.ratio)} higher than usual in ${lastName}`,
          text: `You spent ${F.inr(j.now)} on ${j.c.toLowerCase()}, about ${F.inr(j.diff)} more than your ${prev.length}-month average of ${F.inr(j.usual)}.${freq}`,
          detail: big ? `Largest single payment: ${big.desc}, ${F.inr(big.amount)} on ${F.date(big.date, false)}.` : '',
          link: ['#/spending', 'See spending by category']
        });
      });

      // 2. Upcoming pressure: the heaviest stretch before payday
      const map = S.moneyMap();
      const due = map.billsList.filter(u => u.due >= TODAY);
      if (now && due.length) {
        const week = F.addDays(TODAY, 7);
        const firstWeek = sum(due.filter(u => u.due <= week));
        const share = map.bills ? firstWeek / map.bills : 0;
        if (share >= 0.5 && firstWeek > 0) {
          out.push({
            id: 'pressure', type: 'upcoming', tone: 'attention', rank: 9, figure: F.inrc(firstWeek, 1), figureNote: 'due in 7 days',
            title: `${F.inr(firstWeek)} is due in the next 7 days`,
            text: `That is ${F.pct(share)} of everything due before payday on ${F.date(map.payday, false)}. ${due.filter(u => u.due <= week).slice(0, 3).map(u => u.name.split(' · ')[0]).join(', ')} all land this week, so it is worth waiting until they’re paid before spending on extras.`,
            detail: `Before payday you have ${due.length} expenses totalling ${F.inr(map.bills)}.`,
            link: ['#/upcoming', 'View upcoming expenses']
          });
        }
      }

      // 3. A typical month vs usual flexible spending
      const tm = S.typicalMonth();
      if (now && tm.income > 0 && tm.surplus < 0) {
        const startBal = S.balance(F.iso(new Date(F.d(full[0] + '-01').getFullYear(), F.d(full[0] + '-01').getMonth(), 0)));
        const endBal = S.balance(F.iso(new Date(F.d(last + '-01').getFullYear(), F.d(last + '-01').getMonth() + 1, 0)));
        out.push({
          id: 'gap', type: 'spending', tone: 'attention', rank: 8, figure: F.inrc(tm.surplus, 1), figureNote: 'a month, from balance',
          title: `Your usual flexible spending is ${F.inr(-tm.surplus)} more than a month allows`,
          text: `After bills, goal savings and essentials, a typical month leaves ${F.inr(tm.free)} from your pay. You usually spend ${F.inr(tm.flexible)} on eating out, shopping and plans, so the difference comes from your balance.`,
          detail: endBal < startBal ? `Your balance went from ${F.inr(startBal)} to ${F.inr(endBal)} between ${S.monthName(full[0], true)} and the end of ${lastName}.` : '',
          link: ['#/decisions', 'Check a purchase before you buy']
        });
      }

      // 4. Savings progress
      const behind = !now ? [] : S.activeGoals().map(g => ({ g, s: S.goalStatus(g) })).filter(x => !x.s.onTrack).sort((a, b) => (b.s.suggested - b.g.monthly) - (a.s.suggested - a.g.monthly));
      behind.slice(0, 1).forEach(({ g, s }) => out.push({
        id: 'behind-' + g.id, type: 'savings', tone: 'attention', rank: 7, figure: '+' + F.inrc(Math.ceil((s.suggested - g.monthly) / 100) * 100, 1), figureNote: 'a month needed',
        title: `${g.name} needs ${F.inr(Math.ceil((s.suggested - g.monthly) / 100) * 100)} more a month`,
        text: `To reach ${F.inr(g.target)} by ${F.date(g.deadline)}, you’d need about ${F.inr(Math.ceil(s.suggested / 100) * 100)} a month. You’ve planned ${F.inr(g.monthly)}${s.projected ? `, which gets you there around ${S.monthName(s.projected, true)} ${s.projected.slice(0, 4)}` : ''}.`,
        detail: `Saved so far: ${F.inr(s.saved)} of ${F.inr(g.target)} (${F.pct(s.pct)}).`,
        link: ['#/goals', 'Review savings goals']
      }));
      const best = !now ? null : S.activeGoals().map(g => ({ g, s: S.goalStatus(g) })).filter(x => x.s.onTrack).sort((a, b) => b.s.pct - a.s.pct)[0];
      if (best) out.push({
        id: 'progress-' + best.g.id, type: 'savings', tone: 'good', rank: 4, figure: F.pct(best.s.pct), figureNote: 'of the target',
        title: `${best.g.name} is ${F.pct(best.s.pct)} of the way there`,
        text: `${F.inr(best.s.saved)} saved towards ${F.inr(best.g.target)}. At ${F.inr(best.g.monthly)} a month you’re on track for ${F.date(best.g.deadline)}.`,
        detail: '', link: ['#/goals', 'View goal']
      });

      // 5. Weekend spending pattern on flexible categories
      const flex = full.flatMap(k => S.inMonth(k, 'expense')).filter(t => S.cat(t.category).kind === 'flexible');
      if (flex.length > 10) {
        let we = 0, wd = 0, weDays = 0, wdDays = 0;
        full.forEach(k => {
          const [y, m] = k.split('-').map(Number);
          const n = new Date(y, m, 0).getDate();
          for (let dd = 1; dd <= n; dd++) { const w = new Date(y, m - 1, dd).getDay(); if (w === 0 || w === 6) weDays++; else wdDays++; }
        });
        flex.forEach(t => { const w = F.d(t.date).getDay(); if (w === 0 || w === 6) we += t.amount; else wd += t.amount; });
        const ratio = (we / weDays) / (wd / wdDays);
        if (ratio > 1.3) out.push({
          id: 'weekend', type: 'spending', tone: 'info', rank: 5, figure: `${ratio.toFixed(1)}×`, figureNote: 'per weekend day',
          title: `You spend ${ratio.toFixed(1)}× more per day at weekends`,
          text: `On flexible spending, a weekend day costs you about ${F.inr(we / weDays)} against ${F.inr(wd / wdDays)} on a weekday. Planning one weekend treat ahead can stop it adding up.`,
          detail: `Based on ${full.length} months of eating out, shopping and plans.`,
          link: ['#/spending', 'See spending patterns']
        });
      }

      // 6. Subscriptions and memberships
      const subs = state.upcoming.filter(u => u.repeat === 'monthly' && ['Subscriptions', 'Fitness'].includes(u.category));
      if (now && subs.length >= 2) out.push({
        id: 'subs', type: 'upcoming', tone: 'info', rank: 3, figure: F.inrc(sum(subs) * 12, 1), figureNote: 'a year',
        title: `${subs.length} subscriptions cost ${F.inr(sum(subs))} a month`,
        text: `${subs.map(u => u.name.replace(' membership', '')).join(', ')}. That’s ${F.inr(sum(subs) * 12)} a year, worth a check that you still use each one.`,
        detail: '', link: ['#/upcoming', 'View recurring expenses']
      });

      // 7. Essentials holding steady
      const ess = full.map(k => S.essentialSplit(k).essential);
      const usualEss = ess.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(1, ess.length - 1);
      const essDiff = usualEss ? ess[ess.length - 1] / usualEss - 1 : 0;
      if (Math.abs(essDiff) < 0.06) out.push({
        id: 'steady', type: 'spending', tone: 'good', rank: 2, figure: (essDiff >= 0 ? '+' : '') + F.pct(essDiff), figureNote: 'essentials vs usual',
        title: `Your essentials held steady in ${lastName}`,
        text: `Rent, bills, groceries and transport came to ${F.inr(ess[ess.length - 1])}, within ${F.pct(Math.abs(essDiff))} of usual. The change in your spending came from non-essentials.`,
        detail: '', link: ['#/spending', 'Compare essentials']
      });

      // 8. Savings rate against the months before (works for any month read)
      const rate = k => { const i = S.income(k); return i ? S.saved(k) / i : 0; };
      const r = rate(last), usualRate = prev.reduce((a, k) => a + rate(k), 0) / prev.length;
      const rd = r - usualRate;
      if (Math.abs(rd) >= 0.02) out.push({
        id: 'rate', type: 'savings', tone: rd > 0 ? 'good' : 'attention', rank: rd > 0 ? 6 : 7.5,
        figure: F.pct(r), figureNote: 'of income saved',
        title: `You saved ${F.pct(r)} of income in ${lastName}, ${rd > 0 ? 'up' : 'down'} from ${F.pct(usualRate)}`,
        text: `${F.inr(S.saved(last))} went to goals out of ${F.inr(S.income(last))} that came in. In the ${prev.length} month${prev.length > 1 ? 's' : ''} before, you saved ${F.pct(usualRate)} on average.${rd < 0 && S.income(last) > S.income(prev[prev.length - 1]) ? ' Income was higher, so the extra went to spending.' : ''}`,
        detail: '', link: ['#/goals', 'Review savings goals']
      });

      return out.sort((a, b) => b.rank - a.rank);
    }
  };

  SW.store = S;
})();
