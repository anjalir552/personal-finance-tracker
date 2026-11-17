/* State, persistence and every derived figure.
   Pages never compute money themselves: they read it from here, so the same number
   is the same on every screen.

   The model in one paragraph
   - Transactions are the record of what happened (income, expenses, transfers into goals,
     withdrawals out of goals). The balance is worked out from them.
   - The budget is the plan: a base allocation per category plus a monthly buffer, with savings
     equal to the goals' monthly amounts. Every change the user approves (a recovery plan, an
     adaptive suggestion, an edit) is stored as an *adjustment* with the months it covers, so
     past months keep the plan they had and nothing is ever changed silently.
   - Safe-to-Spend = balance − commitments still due before payday − essentials still to buy
     this month − savings still to move this month − the unused monthly buffer. Each part only
     counts what is still ahead, so money already spent or already moved is never counted twice.

   Persistence: one saved state in localStorage. Every page reads it through this module, and
   every situation (overspending, an emergency, a recovery plan) follows from what is recorded. */
(function () {
  const F = SW.fmt;
  const seed = SW.seed;
  const TODAY = seed.TODAY;
  const KEY = 'scopewise:aditi:v2';
  // Keys from earlier builds (one saved state per demo scenario): no longer read
  const OLD_KEYS = ['scopewise:aditi:scenario', 'scopewise:aditi:v1:normal', 'scopewise:aditi:v1:overspend', 'scopewise:aditi:v1:emergency'];
  const clone = o => JSON.parse(JSON.stringify(o));
  const CAT = Object.fromEntries(seed.CATEGORIES.map(c => [c.id, c]));
  const PRIORITY = { high: 3, medium: 2, low: 1 };

  function fresh() {
    return {
      settings: clone(seed.settings),
      budget: clone(seed.budget),
      buffer: seed.buffer,
      transactions: seed.transactions(),
      goals: clone(seed.goals),
      upcoming: clone(seed.upcoming),
      decisions: clone(seed.decisions),
      adjustments: [],
      planLog: [],
      isNew: false
    };
  }
  function empty() {
    const s = clone(seed.settings);
    Object.assign(s, { name: '', city: '', monthlyIncome: 0, openingBalance: 0 });
    const budget = Object.fromEntries(Object.keys(seed.budget).map(k => [k, 0]));
    return { settings: s, budget, buffer: 0, transactions: [], goals: [], upcoming: [], decisions: [], adjustments: [], planLog: [], isNew: true };
  }

  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable: keep working in memory */ } };
  try { OLD_KEYS.forEach(k => localStorage.removeItem(k)); } catch (e) { /* storage unavailable */ }
  function load() {
    try {
      const raw = read(KEY);
      return raw ? Object.assign(fresh(), JSON.parse(raw)) : fresh();
    } catch (e) { return fresh(); }
  }
  let state = load();
  function save() { write(KEY, JSON.stringify(state)); }

  const sum = (arr, fn = x => x.amount) => arr.reduce((a, x) => a + (fn(x) || 0), 0);
  const monthOf = d => d.slice(0, 7);
  const addMonths = (key, n) => {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const monthsBetween = (a, b) => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + mb - ma; };
  const CUR_MONTH = monthOf(TODAY);
  const round = (v, step = 50) => Math.round(v / step) * step;
  const floorTo = (v, step = 50) => Math.floor(v / step) * step;
  const ceil100 = v => Math.ceil(v / 100) * 100;
  const isDelivery = t => /swiggy|zomato/i.test(t.desc);
  const isWeekend = iso => [0, 6].includes(F.d(iso).getDay());

  const S = {
    TODAY, CAT, CUR_MONTH, PRIORITY,
    get state() { return state; },
    save,
    reset() { state = fresh(); save(); },
    clear() { state = empty(); save(); },
    cat(id) { return CAT[id] || { id, essential: false, kind: 'flexible' }; },
    nextId(prefix, list) {
      const max = list.reduce((m, x) => Math.max(m, parseInt(String(x.id).replace(/\D/g, ''), 10) || 0), 1000);
      return `${prefix}-${max + 1}`;
    },
    isDelivery, isWeekend,

    /* ---------- Months ---------- */
    monthName(key, long) {
      const [, m] = key.split('-').map(Number);
      return long ? F.MONTHS_LONG[m - 1] : F.MONTHS[m - 1];
    },
    months() {
      const set = new Set(state.transactions.map(t => monthOf(t.date)));
      set.add(CUR_MONTH);
      return [...set].sort();
    },
    fullMonths(n) {
      const out = [];
      for (let i = n; i >= 1; i--) out.push(addMonths(CUR_MONTH, -i));
      return out.filter(k => state.transactions.some(t => monthOf(t.date) === k));
    },
    addMonths, monthsBetween,
    daysInMonth(key) { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); },
    /** Days left in the current month, today included */
    daysLeftInMonth() { return S.daysInMonth(CUR_MONTH) - F.d(TODAY).getDate() + 1; },

    /* ---------- Transactions ---------- */
    inMonth(key, type) { return state.transactions.filter(t => monthOf(t.date) === key && (!type || t.type === type)); },
    income(key) { return sum(S.inMonth(key, 'income')); },
    spent(key) { return sum(S.inMonth(key, 'expense')); },
    saved(key) { return sum(S.inMonth(key, 'transfer')) - sum(S.inMonth(key, 'withdrawal')); },
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
    avgMonthly(filter) {
      const keys = S.fullMonths(3);
      if (!keys.length) return 0;
      return keys.reduce((a, k) => a + sum(S.inMonth(k, 'expense').filter(t => !t.emergency && filter(S.cat(t.category), t))), 0) / keys.length;
    },
    everydayAvg() { return S.avgMonthly(c => c.kind === 'everyday'); },
    flexibleAvg() { return S.avgMonthly(c => c.kind === 'flexible'); },
    categoryAverage(cat) { return S.avgMonthly((c, t) => t.category === cat); },

    /** Validate and add or update a transaction. Returns { ok, errors, row }. */
    validateTx(d) {
      const errors = {};
      const amount = +d.amount || 0;
      if (!String(d.desc || '').trim()) errors.desc = 'Add a short description.';
      if (!(amount > 0)) errors.amount = 'Enter an amount above zero.';
      else if (amount > 1000000) errors.amount = 'That’s more than ₹10,00,000. Check the amount.';
      if (!d.date) errors.date = 'Choose a date.';
      else if (d.date > TODAY) errors.date = 'Transactions can’t be in the future. Add it to Upcoming expenses instead.';
      if (!d.category) errors.category = 'Choose a category.';
      return errors;
    },
    /** A transaction already recorded with the same date, amount and description */
    findDuplicate(row, ignoreId) {
      const desc = String(row.desc || '').trim().toLowerCase();
      return state.transactions.find(t => t.id !== ignoreId && t.type === row.type && t.date === row.date && t.amount === row.amount && t.desc.trim().toLowerCase() === desc);
    },
    addTransaction(row) {
      const t = Object.assign({ id: S.nextId('T', state.transactions) }, row);
      state.transactions.push(t);
      state.isNew = false;
      save();
      return t;
    },
    updateTransaction(id, row) {
      const t = state.transactions.find(x => x.id === id);
      if (!t) return null;
      Object.assign(t, row);
      if (!row.unplanned) delete t.unplanned;
      if (!row.emergency) delete t.emergency;
      save();
      return t;
    },
    deleteTransaction(id) { state.transactions = state.transactions.filter(x => x.id !== id); save(); },

    /* ---------- Balance ---------- */
    balance(asOf = TODAY) {
      return state.settings.openingBalance + state.transactions.filter(t => t.date <= asOf)
        .reduce((a, t) => a + (t.type === 'income' || t.type === 'withdrawal' ? t.amount : -t.amount), 0);
    },
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

    /* ==========================================================================
       The budget: base plan + approved adjustments, month by month
       ========================================================================== */
    adjustmentsFor(key) {
      return (state.adjustments || []).filter(a => a.from <= key && (a.until == null || key <= a.until));
    },
    budgetFor(key = CUR_MONTH) {
      const out = Object.assign({}, state.budget);
      S.adjustmentsFor(key).forEach(a => Object.entries(a.budget || {}).forEach(([c, d]) => (out[c] = (out[c] || 0) + d)));
      Object.keys(out).forEach(c => (out[c] = Math.max(0, Math.round(out[c]))));
      return out;
    },
    /** The lasting plan from this month on: base + open-ended changes (adaptive, edits), without one-month recovery trims */
    ongoingBudget() {
      const out = Object.assign({}, state.budget);
      S.adjustmentsFor(CUR_MONTH).filter(a => a.until == null).forEach(a => Object.entries(a.budget || {}).forEach(([c, d]) => (out[c] = (out[c] || 0) + d)));
      Object.keys(out).forEach(c => (out[c] = Math.max(0, Math.round(out[c]))));
      return out;
    },
    bufferFor(key = CUR_MONTH) {
      return Math.max(0, (state.buffer || 0) + sum(S.adjustmentsFor(key), a => a.buffer || 0));
    },
    goalMonthlyFor(g, key = CUR_MONTH, base) {
      const m = (base != null ? base : g.monthly) + sum(S.adjustmentsFor(key), a => (a.goals && a.goals[g.id]) || 0);
      return Math.max(0, m);
    },
    savingsFor(key = CUR_MONTH) { return sum(S.activeGoals(), g => S.goalMonthlyFor(g, key)); },
    /** The month's plan as one allocation: lines + savings + buffer against income */
    plan(key = CUR_MONTH) {
      const b = S.budgetFor(key);
      const lines = sum(Object.values(b), v => v);
      const savings = S.savingsFor(key), buffer = S.bufferFor(key), income = state.settings.monthlyIncome || 0;
      return { budget: b, lines, savings, buffer, income, allocated: lines + savings + buffer, unallocated: income - lines - savings - buffer };
    },

    /**
     * Each category this month: its budget, what has been spent (emergencies count against the
     * buffer, not the category), what is still scheduled, what is left and any overspend.
     */
    monthBudget(key = CUR_MONTH) {
      const b = S.budgetFor(key);
      const list = S.inMonth(key, 'expense');
      const sched = key === CUR_MONTH ? S.dueBefore(F.addDays(S.addMonths(CUR_MONTH, 1) + '-01', 0)).filter(u => u.due >= key + '-01' || S.isOverdue(u)) : [];
      return seed.CATEGORIES.map(c => {
        const budget = b[c.id] || 0;
        const spent = sum(list.filter(t => t.category === c.id && !t.emergency));
        const emergency = sum(list.filter(t => t.category === c.id && t.emergency));
        const scheduled = sum(sched.filter(u => u.category === c.id));
        const remaining = budget - spent - scheduled;
        return { cat: c.id, kind: c.kind, essential: c.essential, note: c.note, budget, spent, emergency, scheduled, remaining, left: Math.max(0, remaining), over: Math.max(0, spent - budget), pct: budget ? spent / budget : spent ? Infinity : 0 };
      }).filter(r => r.budget || r.spent || r.emergency || r.scheduled);
    },

    /* ---------- Upcoming expenses ---------- */
    upcomingSorted() { return state.upcoming.slice().sort((a, b) => a.due.localeCompare(b.due) || b.amount - a.amount); },
    dueBefore(iso) { return S.upcomingSorted().filter(u => u.due < iso); },
    isOverdue(u) { return u.due < TODAY; },
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
    markPaid(id) {
      const u = state.upcoming.find(x => x.id === id);
      if (!u) return;
      state.transactions.push({ id: S.nextId('T', state.transactions), date: TODAY, type: 'expense', desc: u.name, category: u.category, amount: u.amount, method: u.method || 'UPI', upcomingId: u.id, dueDate: u.due });
      const next = S.advance(u);
      if (next) u.due = next; else state.upcoming = state.upcoming.filter(x => x.id !== id);
      save();
    },
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
    dailyCumulative(key) {
      const n = S.daysInMonth(key);
      const byDay = new Array(n).fill(0);
      S.inMonth(key, 'expense').forEach(t => (byDay[F.d(t.date).getDate() - 1] += t.amount));
      let run = 0;
      return byDay.map((v, i) => { const iso = `${key}-${String(i + 1).padStart(2, '0')}`; run += v; return iso > TODAY ? null : run; });
    },
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
    /** Spending matching a filter up to a day of the month */
    spentByDay(key, day, filter = () => true) {
      return sum(S.inMonth(key, 'expense').filter(t => F.d(t.date).getDate() <= day && filter(t)));
    },

    /* ==========================================================================
       Goals
       ========================================================================== */
    goalSaved(g) {
      return g.start + sum(state.transactions.filter(t => t.type === 'transfer' && t.goalId === g.id)) - sum(state.transactions.filter(t => t.type === 'withdrawal' && t.goalId === g.id));
    },
    goalTransferredThisMonth(g) {
      return sum(state.transactions.filter(t => t.type === 'transfer' && t.goalId === g.id && monthOf(t.date) === CUR_MONTH && t.date <= TODAY));
    },
    /**
     * Month by month from now: this month gets whatever transfer is still due, each later month
     * its planned amount (with approved adjustments). monthly: a what-if base amount; deltas:
     * extra changes by month; savedDelta: money added to or taken out of the goal today.
     */
    goalSim(g, { monthly, deltas = {}, savedDelta = 0 } = {}) {
      let saved = S.goalSaved(g) + savedDelta;
      const series = [];
      if (saved >= g.target) return { finish: null, reached: true, series: [{ key: CUR_MONTH, saved }] };
      const eff = k => Math.max(0, S.goalMonthlyFor(g, k, monthly) + (deltas[k] || 0));
      saved += Math.max(0, eff(CUR_MONTH) - S.goalTransferredThisMonth(g));
      series.push({ key: CUR_MONTH, saved: Math.min(saved, g.target) });
      let k = CUR_MONTH;
      let finish = saved >= g.target ? CUR_MONTH : null;
      let idle = 0;
      while (!finish && series.length < 121) {
        k = addMonths(k, 1);
        const m = eff(k);
        idle = m > 0 ? 0 : idle + 1;
        if (idle > 24) break;   // nothing going in for two years: no finish date
        saved += m;
        series.push({ key: k, saved: Math.min(saved, g.target) });
        if (saved >= g.target) finish = k;
      }
      return { finish, reached: false, series };
    },
    goalStatus(g) {
      const saved = S.goalSaved(g);
      const remaining = Math.max(0, g.target - saved);
      const reached = remaining === 0;
      const monthsLeft = Math.max(0, monthsBetween(CUR_MONTH, monthOf(g.deadline)));
      const suggested = reached ? 0 : remaining / Math.max(1, monthsLeft + 1);
      const thisCycle = S.goalTransferredThisMonth(g);
      const monthlyNow = S.goalMonthlyFor(g, CUR_MONTH);
      const setAside = reached ? 0 : Math.max(0, Math.min(monthlyNow, remaining) - thisCycle);
      const sim = reached ? null : S.goalSim(g);
      const projected = sim ? sim.finish : null;
      const overdue = !reached && g.deadline < TODAY;
      const onTrack = reached || (!!projected && projected <= monthOf(g.deadline));
      return { saved, remaining, reached, monthsLeft, suggested, onTrack, thisCycle, monthlyNow, setAside, projected, pct: g.target ? Math.min(1, saved / g.target) : 0, overdue };
    },
    goalFinish(g, monthly) { return S.goalSim(g, { monthly }).finish; },
    goalProjection(g, monthly) { return S.goalSim(g, { monthly }).series; },
    goalHistory(g) {
      const out = [];
      let key = monthOf(g.created || TODAY);
      if (key > CUR_MONTH) key = CUR_MONTH;
      const tr = state.transactions.filter(t => (t.type === 'transfer' || t.type === 'withdrawal') && t.goalId === g.id);
      while (key <= CUR_MONTH) {
        const last = key === CUR_MONTH ? TODAY : F.iso(new Date(+key.slice(0, 4), +key.slice(5), 0));
        out.push({ key, saved: g.start + sum(tr.filter(t => t.date <= last), t => (t.type === 'transfer' ? t.amount : -t.amount)) });
        key = addMonths(key, 1);
      }
      return out;
    },
    goalPace(g) {
      const total = F.daysBetween(g.created || TODAY, g.deadline);
      if (total <= 0) return 1;
      return Math.max(0, Math.min(1, F.daysBetween(g.created || TODAY, TODAY) / total));
    },
    goalMilestones(g) {
      const s = S.goalStatus(g);
      const series = s.reached ? [] : S.goalSim(g).series;
      return [0.25, 0.5, 0.75, 1].map(p => {
        const amount = Math.round(g.target * p);
        const reached = s.saved >= amount;
        const hit = reached ? null : series.find(x => x.saved >= amount);
        return { p, amount, reached, eta: hit ? hit.key : null };
      });
    },
    activeGoals() { return state.goals.filter(g => S.goalSaved(g) < g.target); },
    /** Lowest priority first: the order savings are touched when money is short */
    goalsByPriority() { return S.activeGoals().slice().sort((a, b) => (PRIORITY[a.priority] || 2) - (PRIORITY[b.priority] || 2)); },
    emergencyGoal() { return state.goals.find(g => g.id === 'g-emergency') || state.goals.find(g => /emergency/i.test(g.name)); },
    goalsMonthly() { return S.savingsFor(CUR_MONTH); },
    goalsThisCycle() { return sum(S.activeGoals(), g => S.goalStatus(g).setAside); },
    savingsRoom() {
      const tm = S.typicalMonth();
      return { room: tm.income - tm.bills - tm.everyday - tm.buffer, flexible: tm.flexible, flexibleBudget: tm.flexibleBudget, income: tm.income };
    },
    contribute(goalId, amount, date = TODAY) {
      const g = state.goals.find(x => x.id === goalId);
      state.transactions.push({ id: S.nextId('T', state.transactions), date, type: 'transfer', desc: g.name, category: 'Savings', amount, method: 'Bank transfer', goalId });
      save();
    },
    withdraw(goalId, amount, desc, date = TODAY) {
      const g = state.goals.find(x => x.id === goalId);
      state.transactions.push({ id: S.nextId('T', state.transactions), date, type: 'withdrawal', desc: desc || `From ${g.name}`, category: 'Savings', amount, method: 'Bank transfer', goalId });
      save();
    },

    /* ==========================================================================
       Safe-to-Spend: where today's balance is already spoken for
       ========================================================================== */
    moneyMap() {
      const balance = S.balance();
      const payday = S.nextPayday();
      const daysLeft = S.daysToPayday();
      const billsList = S.dueBefore(payday);
      const bills = sum(billsList);
      const rows = S.monthBudget(CUR_MONTH);
      const everydayRows = rows.filter(r => r.kind === 'everyday');
      const flexRows = rows.filter(r => r.kind === 'flexible');
      const everyday = sum(everydayRows, r => r.left);
      const flexRemaining = sum(flexRows, r => r.left);
      const goals = S.goalsThisCycle();
      const bufferPlan = S.bufferFor(CUR_MONTH);
      const emergencySpent = sum(S.inMonth(CUR_MONTH, 'expense').filter(t => t.emergency));
      const bufferUsed = Math.min(bufferPlan, emergencySpent);
      const buffer = bufferPlan - bufferUsed;
      const free = balance - bills - everyday - goals - buffer;
      return {
        balance, bills, billsList, everyday, everydayRows, goals, buffer, bufferPlan, bufferUsed, emergencySpent,
        free, perDay: free / daysLeft, daysLeft, payday,
        flexRemaining, flexRows, extra: free - flexRemaining, gap: Math.max(0, Math.round(flexRemaining - free)),
        committed: bills + everyday + goals + buffer
      };
    },
    safeToSpend() { return S.moneyMap().free; },

    typicalMonth() {
      const b = S.budgetFor(CUR_MONTH);
      const by = kind => sum(Object.entries(b).filter(([c]) => S.cat(c).kind === kind), ([, v]) => v);
      const income = state.settings.monthlyIncome || 0;
      const bills = by('bill'), everyday = by('everyday'), flexibleBudget = by('flexible');
      const goals = S.goalsMonthly(), buffer = S.bufferFor(CUR_MONTH);
      const flexible = S.flexibleAvg();
      const free = income - bills - everyday - goals - buffer;
      return { income, bills, everyday, goals, buffer, flexible, flexibleBudget, free, surplus: free - flexible };
    },

    /* ==========================================================================
       What needs attention this month, and Smart Financial Recovery
       ========================================================================== */
    issues() {
      const m = S.moneyMap();
      const rows = S.monthBudget(CUR_MONTH);
      const over = rows.filter(r => r.kind !== 'bill' && r.over > 0).sort((a, b) => b.over - a.over);
      const emergencies = S.inMonth(CUR_MONTH, 'expense').filter(t => t.emergency);
      const emergencyTotal = sum(emergencies);
      const approved = (state.planLog || []).filter(p => p.month === CUR_MONTH && p.status === 'approved');
      const declined = (state.planLog || []).filter(p => p.month === CUR_MONTH && p.status === 'rejected');
      return {
        m, over, overTotal: sum(over, r => r.over), emergencies, emergencyTotal,
        beyondBuffer: Math.max(0, emergencyTotal - m.bufferPlan),
        gap: m.gap, short: m.free < 0, needsRecovery: m.gap > 0,
        context: emergencyTotal > 0 && emergencyTotal >= sum(over, r => r.over) ? 'emergency' : 'overspend',
        approved, declined
      };
    },

    /** The levers that can close a gap, with the most each can give */
    recoveryLevers(context) {
      const m = S.moneyMap();
      const trimByCat = {};
      m.flexRows.forEach(r => { const t = floorTo(r.left * 0.5); if (t > 0) trimByCat[r.cat] = t; });
      const pending = S.goalsByPriority().map(g => ({ g, amount: S.goalStatus(g).setAside })).filter(x => x.amount > 0);
      const fundGoal = S.emergencyGoal();
      const fundSaved = fundGoal ? S.goalSaved(fundGoal) : 0;
      const levers = {
        trim: { max: sum(Object.values(trimByCat), v => v), trimByCat },
        savings: { max: sum(pending), pending },
        buffer: { max: m.buffer },
        fund: { max: context === 'emergency' ? fundSaved : 0, goal: fundGoal, saved: fundSaved }
      };
      const order = context === 'emergency' ? ['buffer', 'fund', 'trim', 'savings'] : ['trim', 'buffer', 'savings', 'fund'];
      const defaults = context === 'emergency' ? { buffer: true, trim: true, savings: true, fund: false, catchUp: false } : { trim: true, savings: true, buffer: false, fund: false, catchUp: false };
      return { m, levers, order, defaults };
    },

    /**
     * A recovery plan: fill the gap from the enabled levers, in order. Nothing here changes
     * state; applyRecovery() does that, only after the user approves.
     */
    recoveryPlan(context, enabled) {
      const { m, levers, order } = S.recoveryLevers(context);
      let left = m.gap;
      const plan = { context, gap: m.gap, trimByCat: {}, savingsByGoal: {}, bufferUse: 0, fundUse: 0, catchUp: !!enabled.catchUp, parts: [] };
      order.forEach(k => {
        if (!enabled[k] || left <= 0 || !levers[k].max) return;
        if (k === 'trim') {
          // take from each category in proportion to what it can give
          const total = levers.trim.max;
          const want = Math.min(left, total);
          let given = 0;
          const cats = Object.keys(levers.trim.trimByCat);
          cats.forEach((c, i) => {
            const cap = levers.trim.trimByCat[c];
            const t = i === cats.length - 1 ? Math.min(cap, want - given) : Math.min(cap, Math.round(want * cap / total));
            if (t > 0) { plan.trimByCat[c] = t; given += t; }
          });
          left -= given;
          plan.parts.push({ lever: 'trim', amount: given });
        } else if (k === 'savings') {
          let given = 0;
          levers.savings.pending.forEach(({ g, amount }) => {
            const t = Math.min(amount, left - given);
            if (t > 0) { plan.savingsByGoal[g.id] = t; given += t; }
          });
          left -= given;
          plan.parts.push({ lever: 'savings', amount: given });
        } else if (k === 'buffer') {
          const t = Math.min(levers.buffer.max, left);
          plan.bufferUse = t; left -= t;
          plan.parts.push({ lever: 'buffer', amount: t });
        } else if (k === 'fund') {
          const t = Math.min(levers.fund.max, left);
          plan.fundUse = t; left -= t;
          plan.parts.push({ lever: 'fund', amount: t });
        }
      });
      plan.covered = m.gap - left;
      plan.uncovered = Math.max(0, left);
      const savingsCut = sum(Object.values(plan.savingsByGoal), v => v);
      const next = addMonths(CUR_MONTH, 1);
      // Catch up next month: put the skipped savings back, from next month's flexible budget
      plan.nextMonth = {};
      if (plan.catchUp && savingsCut > 0) plan.nextMonth = S.spreadCut(savingsCut, next);
      // Rebuild the emergency fund over three months, from flexible spending
      plan.replenish = null;
      if (plan.fundUse > 0) {
        const monthly = ceil100(plan.fundUse / 3);
        const months = Math.ceil(plan.fundUse / monthly);
        plan.replenish = { monthly, months, from: next, until: addMonths(next, months - 1), cut: S.spreadCut(monthly, next), goalId: levers.fund.goal.id };
      }
      // The revised budget for the rest of this month
      const b = S.budgetFor(CUR_MONTH);
      plan.rows = S.monthBudget(CUR_MONTH).filter(r => r.kind !== 'bill').map(r => ({ cat: r.cat, kind: r.kind, budget: r.budget, spent: r.spent, left: r.left, newBudget: b[r.cat] - (plan.trimByCat[r.cat] || 0), newLeft: Math.max(0, r.left - (plan.trimByCat[r.cat] || 0)) }));
      plan.bufferBefore = m.buffer; plan.bufferAfter = m.buffer - plan.bufferUse;
      plan.freeAfter = m.free + savingsCut + plan.bufferUse + plan.fundUse;
      plan.flexAfter = m.flexRemaining - sum(Object.values(plan.trimByCat), v => v);
      plan.perDayAfter = plan.flexAfter / S.daysLeftInMonth();
      // Goal impact of each goal touched
      plan.goals = S.activeGoals().map(g => {
        const deltas = {};
        if (plan.savingsByGoal[g.id]) deltas[CUR_MONTH] = -plan.savingsByGoal[g.id];
        if (plan.catchUp && plan.savingsByGoal[g.id]) deltas[next] = (deltas[next] || 0) + plan.savingsByGoal[g.id];
        let savedDelta = 0;
        if (plan.replenish && g.id === plan.replenish.goalId) {
          savedDelta = -plan.fundUse;
          for (let i = 0; i < plan.replenish.months; i++) { const k = addMonths(next, i); deltas[k] = (deltas[k] || 0) + plan.replenish.monthly; }
        }
        if (!Object.keys(deltas).length && !savedDelta) return null;
        return S.impactRow(g, { deltas, savedDelta });
      }).filter(Boolean);
      return plan;
    },
    /** Spread a monthly cut across flexible budgets in proportion to their size, rounded to ₹50 */
    spreadCut(amount, key) {
      const b = S.budgetFor(key);
      const flex = Object.keys(b).filter(c => S.cat(c).kind === 'flexible' && b[c] > 0);
      const total = sum(flex, c => b[c]);
      const out = {};
      let given = 0;
      flex.forEach((c, i) => {
        const v = i === flex.length - 1 ? amount - given : Math.min(b[c], round(amount * b[c] / total));
        out[c] = v; given += v;
      });
      return out;
    },
    /** Before and after for one goal under a change */
    impactRow(g, change) {
      const s = S.goalStatus(g);
      const before = S.goalSim(g).finish;
      const after = S.goalSim(g, change).finish;
      const delay = before && after ? monthsBetween(before, after) : after ? null : Infinity;
      const dl = monthOf(g.deadline);
      return { g, saved: s.saved, savedAfter: s.saved + (change.savedDelta || 0), target: g.target, monthly: s.monthlyNow, monthlyAfter: Math.max(0, s.monthlyNow + ((change.deltas || {})[CUR_MONTH] || 0)), before, after, delay, lateBefore: !before || before > dl, lateAfter: !after || after > dl, deadline: g.deadline };
    },

    applyRecovery(plan, title) {
      const id = 'plan-' + Date.now();
      const next = addMonths(CUR_MONTH, 1);
      const neg = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, -v]));
      const adj = [];
      if (Object.keys(plan.trimByCat).length || plan.bufferUse || Object.keys(plan.savingsByGoal).length) {
        adj.push({ id: id + '-a', plan: id, kind: 'recovery', from: CUR_MONTH, until: CUR_MONTH, budget: neg(plan.trimByCat), buffer: -plan.bufferUse, goals: neg(plan.savingsByGoal) });
      }
      if (plan.catchUp && Object.keys(plan.nextMonth).length) {
        adj.push({ id: id + '-b', plan: id, kind: 'recovery', from: next, until: next, budget: neg(plan.nextMonth), buffer: 0, goals: Object.assign({}, plan.savingsByGoal) });
      }
      if (plan.fundUse > 0) {
        S.withdraw(plan.replenish.goalId, plan.fundUse, 'Used from emergency fund');
        adj.push({ id: id + '-c', plan: id, kind: 'recovery', from: plan.replenish.from, until: plan.replenish.until, budget: neg(plan.replenish.cut), buffer: 0, goals: { [plan.replenish.goalId]: plan.replenish.monthly } });
      }
      state.adjustments = (state.adjustments || []).concat(adj);
      state.planLog = (state.planLog || []).concat({ id, kind: 'recovery', context: plan.context, month: CUR_MONTH, date: TODAY, status: 'approved', title, amount: plan.covered, summary: S.planSummary(plan) });
      save();
      return id;
    },
    planSummary(plan) {
      const bits = [];
      const trim = sum(Object.values(plan.trimByCat), v => v);
      const sav = sum(Object.values(plan.savingsByGoal), v => v);
      if (plan.bufferUse) bits.push(`${F.inr(plan.bufferUse)} from the monthly buffer`);
      if (trim) bits.push(`${F.inr(trim)} less flexible spending this month`);
      if (sav) bits.push(`${F.inr(sav)} less into savings this month${plan.catchUp ? ', caught up next month' : ''}`);
      if (plan.fundUse) bits.push(`${F.inr(plan.fundUse)} from the emergency fund, rebuilt at ${F.inr(plan.replenish.monthly)} a month`);
      return bits.join('; ');
    },
    rejectPlan(kind, title, amount, context) {
      state.planLog = (state.planLog || []).concat({ id: 'plan-' + Date.now(), kind, context, month: CUR_MONTH, date: TODAY, status: 'rejected', title, amount: amount || 0, summary: '' });
      save();
    },
    /** Undo an approved plan: remove its adjustments (withdrawals stay as they happened) */
    undoPlan(id) {
      state.adjustments = (state.adjustments || []).filter(a => a.plan !== id);
      const p = (state.planLog || []).find(x => x.id === id);
      if (p) p.status = 'undone';
      save();
    },

    /* ==========================================================================
       Adaptive Budgeting: suggest a plan that matches how she actually spends
       ========================================================================== */
    adaptiveProposal(fundFrom = 'flex') {
      const keys = S.fullMonths(3);
      if (keys.length < 3) return { rows: [], keys, enough: false };
      const b = S.ongoingBudget();
      const rows = [];
      const spentIn = (k, c) => sum(S.inMonth(k, 'expense').filter(t => t.category === c && !t.emergency));
      Object.keys(b).forEach(c => {
        const cat = S.cat(c);
        if (cat.kind === 'bill' || !b[c]) return;
        const vals = keys.map(k => spentIn(k, c));
        const avg = vals.reduce((a, v) => a + v, 0) / vals.length;
        const overN = vals.filter(v => v > b[c]).length;
        const max = Math.max(...vals);
        const sorted = vals.slice().sort((x, y) => x - y);
        const median = sorted[1];
        let proposed = b[c], reason = '', type = '';
        if (overN >= 2 && avg > b[c] * 1.05) {
          proposed = cat.essential ? ceil100(avg) : b[c] + ceil100((avg - b[c]) / 2);
          type = 'up';
          reason = cat.essential
            ? `Over plan in ${overN} of the last 3 months, averaging ${F.inr(avg)}. It’s an essential, so the plan should cover it.`
            : `Over plan in ${overN} of the last 3 months, averaging ${F.inr(avg)}. This meets you halfway rather than matching it fully.`;
        } else if (overN === 0 && max < b[c] * 0.97) {
          proposed = Math.max(ceil100(max), 100);
          type = 'down';
          reason = `Under plan every month (highest ${F.inr(max)}). The spare money can do more elsewhere.`;
        }
        rows.push({ cat: c, kind: cat.kind, essential: cat.essential, current: b[c], proposed, avg, vals, median, overN, reason, type });
      });
      const inc = sum(rows.filter(r => r.type === 'up'), r => r.proposed - r.current);
      const dec = sum(rows.filter(r => r.type === 'down'), r => r.current - r.proposed);
      let need = inc - dec;
      const goalChanges = {};
      let bufferChange = 0;
      const notes = [];
      if (need > 0) {
        if (fundFrom === 'flex') {
          const pool = rows.filter(r => r.kind === 'flexible' && r.type !== 'up');
          const total = sum(pool, r => r.proposed);
          let given = 0;
          pool.forEach((r, i) => {
            const t = i === pool.length - 1 ? need - given : Math.min(r.proposed, round(need * r.proposed / Math.max(1, total)));
            if (t > 0) {
              r.proposed -= t; given += t;
              if (!r.type) { r.type = 'down'; r.reason = `Lowered to make room for the categories that keep running over. Your middle month here was ${F.inr(r.median)}.`; }
              else r.reason += ` Also helps cover the increases.`;
            }
          });
          need -= given;
          const below = pool.filter(r => r.proposed < r.median);
          if (below.length) notes.push(`${below.map(r => r.cat).join(' and ')} would be planned below what you usually spend, so this asks for a little restraint there.`);
        } else if (fundFrom === 'savings') {
          let left = need;
          S.goalsByPriority().forEach(g => { const t = Math.min(left, S.goalMonthlyFor(g)); if (t > 0) { goalChanges[g.id] = -t; left -= t; } });
          need = left;
          notes.push('Your savings go down each month, so goals take longer. The goal impact is shown below.');
        } else if (fundFrom === 'buffer') {
          const t = Math.min(need, Math.max(0, S.bufferFor() - 500));
          bufferChange = -t;
          notes.push(`Your monthly buffer drops to ${F.inr(S.bufferFor() - t)}, leaving less for surprises.`);
          need -= t;
        }
      } else if (need < 0) {
        // Spare money: into the emergency fund
        const g = S.emergencyGoal() || S.goalsByPriority().slice(-1)[0];
        if (g) { goalChanges[g.id] = -need; notes.push(`The ${F.inr(-need)} freed up goes to ${g.name} each month.`); }
      }
      const changed = rows.filter(r => r.proposed !== r.current);
      const goalImpact = Object.keys(goalChanges).map(id => {
        const g = state.goals.find(x => x.id === id);
        const deltas = {};
        for (let i = 0; i < 120; i++) deltas[addMonths(CUR_MONTH, i)] = goalChanges[id];
        // this month's transfer may already have happened; a change applies from what is still to move
        return S.impactRow(g, { deltas });
      });
      return { keys, enough: true, rows, changed, inc, dec, goalChanges, bufferChange, notes, goalImpact, fundFrom, unfunded: Math.max(0, need) };
    },
    applyAdaptive(p) {
      const id = 'plan-' + Date.now();
      const budget = {};
      p.changed.forEach(r => (budget[r.cat] = r.proposed - r.current));
      state.adjustments = (state.adjustments || []).concat({ id: id + '-a', plan: id, kind: 'adaptive', from: CUR_MONTH, until: null, budget, buffer: p.bufferChange || 0, goals: Object.assign({}, p.goalChanges) });
      state.planLog = (state.planLog || []).concat({ id, kind: 'adaptive', month: CUR_MONTH, date: TODAY, status: 'approved', title: 'Budget adjusted to match your spending', summary: p.changed.map(r => `${r.cat} ${F.inr(r.current)} → ${F.inr(r.proposed)}`).join('; ') });
      save();
      return id;
    },
    /** A direct edit of the plan from this month on (kept as an adjustment so past months keep theirs) */
    applyBudgetEdit(newBudget, newBuffer) {
      const b = S.ongoingBudget();
      const budget = {};
      Object.keys(newBudget).forEach(c => { const d = newBudget[c] - (b[c] || 0); if (d) budget[c] = d; });
      const buffer = newBuffer - S.bufferFor(CUR_MONTH);
      if (!Object.keys(budget).length && !buffer) return null;
      const id = 'plan-' + Date.now();
      state.adjustments = (state.adjustments || []).concat({ id: id + '-a', plan: id, kind: 'manual', from: CUR_MONTH, until: null, budget, buffer, goals: {} });
      state.planLog = (state.planLog || []).concat({ id, kind: 'manual', month: CUR_MONTH, date: TODAY, status: 'approved', title: 'You edited your monthly budget', summary: Object.entries(budget).map(([c, d]) => `${c} ${d > 0 ? '+' : '−'}${F.inr(Math.abs(d))}`).concat(buffer ? [`Buffer ${buffer > 0 ? '+' : '−'}${F.inr(Math.abs(buffer))}`] : []).join('; ') });
      save();
      return id;
    },

    /* ==========================================================================
       Goal Impact Analyzer: what a purchase does to each goal
       mode 'spend': the purchase uses spending money first, savings only if it must (usesGoals)
       mode 'savings': the purchase is paid from savings: this month's transfers first, then
       money already saved, lowest-priority goal first
       ========================================================================== */
    goalImpact(amount, mode = 'spend', fromGoalsNow = 0) {
      let left = mode === 'savings' ? amount : fromGoalsNow;
      const rows = [];
      S.goalsByPriority().forEach(g => {
        const s = S.goalStatus(g);
        const change = { deltas: {}, savedDelta: 0 };
        const fromTransfer = Math.min(left, s.setAside);
        if (fromTransfer > 0) { change.deltas[CUR_MONTH] = -fromTransfer; left -= fromTransfer; }
        let fromSaved = 0;
        if (mode === 'savings' && left > 0) { fromSaved = Math.min(left, s.saved); change.savedDelta = -fromSaved; left -= fromSaved; }
        const row = S.impactRow(g, change);
        row.fromTransfer = fromTransfer; row.fromSaved = fromSaved;
        rows.push(row);
      });
      const order = Object.fromEntries(S.activeGoals().map((g, i) => [g.id, i]));
      rows.sort((a, b) => order[a.g.id] - order[b.g.id]);
      return { rows, uncovered: Math.max(0, left), touched: rows.filter(r => r.fromTransfer || r.fromSaved) };
    },

    /* ==========================================================================
       Emergencies
       ========================================================================== */
    emergencySummary() {
      const m = S.moneyMap();
      const g = S.emergencyGoal();
      const b = S.budgetFor(CUR_MONTH);
      const essentials = sum(Object.entries(b).filter(([c]) => S.cat(c).essential), ([, v]) => v);
      const saved = g ? S.goalSaved(g) : 0;
      const list = S.inMonth(CUR_MONTH, 'expense').filter(t => t.emergency || t.unplanned).sort((a, b) => b.date.localeCompare(a.date));
      return { goal: g, saved, essentials, monthsCovered: essentials ? saved / essentials : 0, bufferPlan: m.bufferPlan, bufferUsed: m.bufferUsed, bufferLeft: m.buffer, emergencySpent: m.emergencySpent, beyond: Math.max(0, m.emergencySpent - m.bufferPlan), list, m };
    },
    /** What recording an emergency of `amount` would do, before it is recorded */
    previewEmergency(amount, emergency = true) {
      const m = S.moneyMap();
      const fromBuffer = emergency ? Math.min(m.buffer, amount) : 0;
      const rest = amount - fromBuffer;
      const free = m.free - rest;
      return { amount, fromBuffer, rest, free, freeBefore: m.free, gap: Math.max(0, Math.round(m.flexRemaining - free)), flexRemaining: m.flexRemaining, bufferAfter: m.buffer - fromBuffer, balanceAfter: m.balance - amount };
    },

    /* ==========================================================================
       Purchase decision model
       Money is used in this order: Safe-to-Spend, the monthly buffer, this month's savings,
       essentials still to buy, then bills. The verdict names the first layer the purchase reaches.
       ========================================================================== */
    evaluatePurchase(i) {
      const price = Math.max(0, +i.price || 0);
      const balance = +i.balance || 0;
      const bills = Math.max(0, +i.bills || 0);
      const goals = Math.max(0, +i.goals || 0);
      const everyday = Math.max(0, +i.everyday || 0);
      const cushion = Math.max(0, +i.cushion || 0);
      const daysLeft = Math.max(1, +i.daysLeft || 1);
      const flexRemaining = Math.max(0, +i.flexRemaining || 0);
      const catRoom = Math.max(0, +i.catRoom || 0);
      const sts = balance - bills - everyday - goals - cushion;
      // Spending you've planned for the rest of the month, besides this purchase.
      // If it fits in the category's own remaining budget, that part is already planned.
      const fromCat = Math.min(price, catRoom);
      const flexibleUntil = Math.max(0, flexRemaining - fromCat);
      const after = sts - price;
      const share = sts > 0 ? price / sts : Infinity;

      let key;
      if (after >= flexibleUntil) key = 'comfortable';
      else if (after >= 0) key = 'tight';
      else if (after + cushion >= 0) key = 'buffer';
      else if (after + cushion + goals >= 0) key = 'goals';
      else if (after + cushion + goals + everyday >= 0) key = 'everyday';
      else if (balance - price >= 0) key = 'bills';
      else key = 'over';

      const LABEL = {
        comfortable: 'Fits comfortably',
        tight: 'Fits, but it’s tight',
        buffer: 'Only by using your buffer',
        goals: 'Only by cutting your savings',
        everyday: 'Cuts into money for essentials',
        bills: 'Leaves you short for bills',
        over: 'More than you have right now'
      };
      const tone = key === 'comfortable' ? 'good' : key === 'tight' ? 'caution' : 'alert';

      // How much of each layer the purchase uses (after any shortfall that already exists)
      let deficit = Math.max(0, -sts);
      const avail = cap => { const a = Math.max(0, cap - deficit); deficit = Math.max(0, deficit - cap); return a; };
      const layers = { free: Math.max(0, sts), buffer: avail(cushion), goals: avail(goals), everyday: avail(everyday), bills: avail(bills) };
      let left = price;
      const take = cap => { const t = Math.min(Math.max(0, cap), left); left -= t; return t; };
      const usesFree = take(layers.free);
      const usesBuffer = take(layers.buffer);
      const usesGoals = take(layers.goals);
      const usesEveryday = take(layers.everyday);
      const usesBills = take(layers.bills);

      const comfortMax = Math.max(0, sts - flexibleUntil);
      const tm = S.typicalMonth();
      const nextFree = tm.income - tm.bills - tm.goals - tm.everyday - tm.buffer;

      // Saving towards it: from a real monthly surplus, otherwise from a 20% trim of flexible spending
      const surplus = tm.surplus;
      const trim = Math.round((tm.flexibleBudget * 0.2) / 100) * 100;
      const monthly = Math.max(500, Math.round((surplus > 1000 ? Math.min(surplus, price) : trim) / 100) * 100);
      const months = price ? Math.ceil(price / monthly) : 0;
      const readyBy = addMonths(CUR_MONTH, months);

      const reasons = [];
      const days = `${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
      if (sts <= 0) reasons.push(`After commitments, essentials, this month’s savings and your buffer, nothing is safe to spend until payday. You’re already ${F.inr(-sts)} short.`);
      else reasons.push(`Your Safe-to-Spend is ${F.inr(sts)} until payday. This would use ${share >= 1 ? 'all of it' : `${F.pct(share)} of it`}.`);
      if (fromCat > 0) reasons.push(`${F.inr(fromCat)} of it fits inside what’s left of your ${i.category} budget, so that part was already planned.`);
      if (key === 'comfortable') reasons.push(`You’d still have ${F.inr(after)}, which covers the ${F.inr(flexibleUntil)} you’ve planned for food, shopping and plans over the next ${days}.`);
      if (key === 'tight') reasons.push(`That leaves ${F.inr(after)} for the next ${days}, but you’ve planned ${F.inr(flexibleUntil)} of other flexible spending. You’d need to spend about ${F.inr(flexibleUntil - after)} less than planned.`);
      if (usesBuffer > 0) reasons.push(`It would use ${F.inr(usesBuffer)} of your ${F.inr(cushion)} monthly buffer, the money kept for surprises.`);
      if (usesGoals > 0) reasons.push(`It would take ${F.inr(usesGoals)} of the ${F.inr(goals)} still to go into your savings goals this month.`);
      if (usesEveryday > 0) reasons.push(`It would also take ${F.inr(usesEveryday)} from what you still need for groceries and transport this month.`);
      if (usesBills > 0) reasons.push(`${F.inr(usesBills)} of it would come from money needed for bills due before payday.`);
      if (key === 'over') reasons.push(`The price is ${F.inr(price - balance)} more than your whole balance.`);

      return {
        price, balance, bills, goals, everyday, cushion, free: sts, after, share, daysLeft, flexibleUntil, flexRemaining, catRoom, fromCat,
        key, label: LABEL[key], tone, usesFree, usesBuffer, usesGoals, usesEveryday, usesBills,
        comfortMax, nextFree, nextFlexible: tm.flexibleBudget, monthly, months, readyBy, surplus, trim, reasons
      };
    },

    /* ---------- Purchase plans: buy now, wait for payday, or save first ---------- */
    purchasePlans(r, monthly) {
      const m = Math.max(100, Math.round(monthly || r.monthly));
      const months = r.price ? Math.ceil(r.price / m) : 0;
      return {
        now: { when: TODAY, left: r.after, perDay: r.after / r.daysLeft, fromGoals: r.usesGoals + r.usesBuffer, fromNeeds: r.usesEveryday + r.usesBills, ok: r.key === 'comfortable' || r.key === 'tight' },
        wait: { when: S.nextPayday(), left: r.nextFree - r.price, share: r.nextFree > 0 ? r.price / r.nextFree : Infinity, ok: r.price <= r.nextFree * 0.5 },
        save: { monthly: m, months, when: addMonths(CUR_MONTH, months), fits: m <= Math.max(0, r.surplus), ok: true }
      };
    },
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
      paydays.forEach(p => { add(p, state.settings.monthlyIncome || 0); add(p, -S.savingsFor(monthOf(p))); });
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
