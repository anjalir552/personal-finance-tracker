/* Seed data · Aditi, 25, a working professional in Bengaluru. Her family lives in Mysuru.
   FICTIONAL DEMONSTRATION DATA. No bank is connected; these are not real records. All values in INR.
   "Today" is fixed so every figure stays consistent across the app.

   History runs from August to today (17 November 2026). Each category's monthly total is set
   here on purpose (so the patterns the insights describe really are in the rows); the individual
   payments, their dates and merchants come from a seeded random source, so the history is the
   same on every load. Totals are never typed into pages: every page computes them from these rows.

   There is one dataset. November so far follows the plan; overspending, unexpected expenses
   and everything that follows from them come from the transactions the user adds. */
window.SW = window.SW || {};
(function () {
  const TODAY = '2026-11-17';

  /* kind: 'bill'     = a fixed commitment, tracked in Upcoming expenses
           'everyday' = an essential that is spent day to day (budgeted)
           'flexible' = lifestyle spending she chooses day to day (budgeted) */
  const CATEGORIES = [
    { id: 'Family support', essential: true, kind: 'bill', note: 'Sent home every month' },
    { id: 'Rent', essential: true, kind: 'bill', note: 'Her share of the flat' },
    { id: 'Bills & recharges', essential: true, kind: 'bill', note: 'Electricity, mobile and internet' },
    { id: 'Transport', essential: true, kind: 'everyday', note: 'Metro, autos and cabs to work' },
    { id: 'Groceries', essential: true, kind: 'everyday', note: 'Food and supplies for home' },
    { id: 'Health', essential: true, kind: 'everyday', note: 'Medicines and doctor visits' },
    { id: 'Food & dining', essential: false, kind: 'flexible', note: 'Eating out, cafés and delivery' },
    { id: 'Shopping & grooming', essential: false, kind: 'flexible', note: 'Clothes, salon, personal care' },
    { id: 'Friends & entertainment', essential: false, kind: 'flexible', note: 'Plans, movies, outings' },
    { id: 'Travel', essential: false, kind: 'flexible', note: 'Trips and travel' },
    { id: 'Other', essential: false, kind: 'flexible', note: 'Anything else' }
  ];
  const INCOME_CATEGORIES = ['Salary', 'Refund', 'Gift received', 'Other income'];
  const METHODS = ['UPI', 'Debit card', 'Credit card', 'Net banking', 'Cash', 'Bank transfer', 'Auto-debit'];

  /* Aditi's monthly plan: ₹35,000 take-home. Savings (₹3,000) is the sum of her goals' monthly
     amounts, and the monthly buffer (₹1,000) is kept for surprises. Lines + savings + buffer = income. */
  const budget = {
    'Family support': 10000,
    'Rent': 6000,
    'Transport': 4500,
    'Groceries': 3000,
    'Bills & recharges': 1500,
    'Food & dining': 2500,
    'Shopping & grooming': 2000,
    'Friends & entertainment': 1500
  };
  const buffer = 1000;

  const settings = {
    name: 'Aditi',
    stage: 'working',
    city: 'Bengaluru',
    monthlyIncome: 35000,
    payday: 1,
    remindDays: 2,
    openingBalance: 0           // set below so the balance on 31 October is ₹350
  };

  const goals = [
    { id: 'g-emergency', name: 'Emergency fund', target: 50000, start: 9500, deadline: '2028-12-31', monthly: 1500, priority: 'high', created: '2025-11-01', note: 'About two months of essentials, kept for real emergencies.' },
    { id: 'g-goa', name: 'Goa trip with college friends', target: 15000, start: 2000, deadline: '2027-08-31', monthly: 1000, priority: 'medium', created: '2026-07-01', note: 'Flights, stay and her share of the villa.' },
    { id: 'g-phone', name: 'New phone', target: 12000, start: 3000, deadline: '2028-03-31', monthly: 500, priority: 'low', created: '2026-06-01', note: 'Her current phone is four years old.' }
  ];

  /* ---------- Seeded randomness: one stream per month and category, so the history is stable ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pad = n => String(n).padStart(2, '0');
  const daysIn = key => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); };
  const weekday = (key, d) => { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };

  const POOLS = {
    Groceries: [['Zepto', 'UPI'], ['Blinkit', 'UPI'], ['BigBasket', 'UPI'], ['More Supermarket', 'Debit card'], ['Sri Ganesh Provisions', 'UPI']],
    Transport: [['Rapido bike taxi', 'UPI'], ['Uber Auto', 'UPI'], ['Ola cab', 'UPI'], ['Namma Yatri auto', 'UPI']],
    delivery: [['Swiggy', 'UPI'], ['Zomato', 'UPI']],
    dining: [['Chai Point', 'UPI'], ['Third Wave Coffee', 'UPI'], ['Office cafeteria', 'UPI'], ['Meghana Foods', 'UPI'], ['Truffles', 'Credit card']],
    'Shopping & grooming': [['Myntra', 'Credit card'], ['Nykaa', 'UPI'], ['Salon · haircut', 'UPI'], ['Westside', 'Debit card'], ['Amazon', 'Credit card']],
    'Friends & entertainment': [['BookMyShow', 'Credit card'], ['Dinner with friends (my share)', 'UPI'], ['Bowling with friends', 'UPI'], ['PVR · weekend movie', 'Credit card'], ['Café meet-up (my share)', 'UPI']]
  };

  /**
   * n payments in one category that add up to exactly `total`, rounded to ₹10.
   * weekend: chance that a payment falls on a Saturday or Sunday. maxDay: last day allowed.
   */
  function spread(key, cat, total, n, pool, { weekend = 0.3, maxDay, minDay = 1, salt = '' } = {}) {
    const r = rng(hash(key + cat + salt));
    const last = Math.min(maxDay || daysIn(key), daysIn(key));
    const ends = [], mids = [];
    for (let d = minDay; d <= last; d++) ([0, 6].includes(weekday(key, d)) ? ends : mids).push(d);
    const w = Array.from({ length: n }, () => 0.6 + r() * 0.8);
    const sw = w.reduce((a, b) => a + b, 0);
    let left = total;
    const out = [];
    w.forEach((x, i) => {
      const amt = i === n - 1 ? left : Math.max(10, Math.round((total * x / sw) / 10) * 10);
      left -= amt;
      const list = (r() < weekend && ends.length) || !mids.length ? ends : mids;
      const day = list[Math.floor(r() * list.length)];
      const [desc, method] = pool[Math.floor(r() * pool.length)];
      out.push({ date: `${key}-${pad(day)}`, desc, amount: amt, method, category: cat });
    });
    return out;
  }

  /* ---------- What each month holds ---------- */
  // Everyday and flexible totals per month. Patterns built in on purpose:
  // transport creeping up, food delivery getting more frequent, shopping over plan in festive October,
  // and weekend-heavy spending on friends and food.
  const HISTORY = {
    '2026-08': { Groceries: [2700, 8], Transport: [4650, 13], delivery: [1500, 6], dining: [800, 6], shop: [1700, 4], friends: [1250, 4], power: 720 },
    '2026-09': { Groceries: [2850, 8], Transport: [4900, 14], delivery: [1900, 8], dining: [750, 5], shop: [1850, 4], friends: [1400, 5], power: 690 },
    '2026-10': { Groceries: [2750, 8], Transport: [5150, 15], delivery: [2450, 11], dining: [650, 5], shop: [2950, 6], friends: [1350, 4], power: 760 }
  };
  // November up to today (the 17th)
  const NOVEMBER = { Groceries: [1550, 5], Transport: [2450, 8], delivery: [850, 4], dining: [400, 3], shop: [1050, 2], friends: [650, 2] };

  function monthRows(key, spec, maxDay) {
    const rows = [];
    const add = (date, type, desc, category, amount, method, extra) => {
      if (maxDay && +date.slice(8) > maxDay) return;
      rows.push(Object.assign({ date, type, desc, category, amount, method }, extra || {}));
    };
    // Income and planned money
    add(`${key}-01`, 'income', 'Salary · Brightline Services', 'Salary', 35000, 'Bank transfer');
    add(`${key}-01`, 'transfer', 'Emergency fund', 'Savings', 1500, 'Auto-debit', { goalId: 'g-emergency' });
    add(`${key}-25`, 'transfer', 'Goa trip with college friends', 'Savings', 1000, 'Bank transfer', { goalId: 'g-goa' });
    add(`${key}-25`, 'transfer', 'New phone', 'Savings', 500, 'Bank transfer', { goalId: 'g-phone' });
    // Commitments
    add(`${key}-02`, 'expense', 'Sent home to family', 'Family support', 10000, 'Bank transfer');
    add(`${key}-03`, 'expense', 'Rent · Koramangala flat (my share)', 'Rent', 6000, 'UPI');
    add(`${key}-08`, 'expense', 'ACT Fibernet (my share)', 'Bills & recharges', 400, 'UPI');
    if (spec.power) add(`${key}-18`, 'expense', 'BESCOM electricity (my share)', 'Bills & recharges', spec.power, 'UPI');
    add(`${key}-24`, 'expense', 'Jio recharge', 'Bills & recharges', 349, 'UPI');

    // Transport: a ₹500 metro card top-up about every ten days, rides for the rest
    const tops = [1, 11, 21].filter(d => !maxDay || d <= maxDay);
    tops.forEach(d => add(`${key}-${pad(d)}`, 'expense', 'Namma Metro card top-up', 'Transport', 500, 'UPI'));
    const t = spec.Transport;
    const opts = { maxDay };
    spread(key, 'Transport', t[0] - tops.length * 500, t[1] - tops.length, POOLS.Transport, { weekend: 0.15, ...opts }).forEach(x => add(x.date, 'expense', x.desc, x.category, x.amount, x.method));
    spread(key, 'Groceries', spec.Groceries[0], spec.Groceries[1], POOLS.Groceries, { weekend: 0.45, ...opts }).forEach(x => add(x.date, 'expense', x.desc, x.category, x.amount, x.method));
    spread(key, 'Food & dining', spec.delivery[0], spec.delivery[1], POOLS.delivery, { weekend: 0.55, salt: 'd', ...opts }).forEach(x => add(x.date, 'expense', x.desc, x.category, x.amount, x.method));
    spread(key, 'Food & dining', spec.dining[0], spec.dining[1], POOLS.dining, { weekend: 0.3, salt: 'o', ...opts }).forEach(x => add(x.date, 'expense', x.desc, x.category, x.amount, x.method));
    spread(key, 'Shopping & grooming', spec.shop[0], spec.shop[1], POOLS['Shopping & grooming'], { weekend: 0.6, ...opts }).forEach(x => add(x.date, 'expense', x.desc, x.category, x.amount, x.method));
    spread(key, 'Friends & entertainment', spec.friends[0], spec.friends[1], POOLS['Friends & entertainment'], { weekend: 0.8, ...opts }).forEach(x => add(x.date, 'expense', x.desc, x.category, x.amount, x.method));
    return rows;
  }

  const history = [];
  Object.keys(HISTORY).forEach(k => history.push(...monthRows(k, HISTORY[k])));
  // One unplanned expense in the history: a laptop charger replacement in August
  history.push({ date: '2026-08-21', type: 'expense', desc: 'Laptop charger replacement', category: 'Other', amount: 1800, method: 'UPI', unplanned: true });
  history.push({ date: '2026-09-12', type: 'income', desc: 'Refund · Myntra return', category: 'Refund', amount: 650, method: 'Bank transfer' });

  // Opening balance: chosen so that ₹350 is carried into November
  const net = history.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0);
  settings.openingBalance = 350 - net;

  function transactions() {
    const rows = history.slice().concat(monthRows('2026-11', NOVEMBER, 17));
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows.map((t, i) => Object.assign({ id: 'T-' + (1001 + i) }, t));
  }

  /* ---------- Planned and recurring expenses (next due date; paid ones have rolled forward) ---------- */
  const upcoming = [
    { id: 'u-power', name: 'BESCOM electricity (my share)', category: 'Bills & recharges', amount: 750, due: '2026-11-18', repeat: 'monthly', estimate: true, remind: 2, method: 'UPI' },
    { id: 'u-jio', name: 'Jio recharge', category: 'Bills & recharges', amount: 349, due: '2026-11-24', repeat: 'monthly', estimate: false, remind: 1, method: 'UPI' },
    { id: 'u-family', name: 'Sent home to family', category: 'Family support', amount: 10000, due: '2026-12-02', repeat: 'monthly', estimate: false, remind: 1, method: 'Bank transfer' },
    { id: 'u-rent', name: 'Rent · Koramangala flat (my share)', category: 'Rent', amount: 6000, due: '2026-12-03', repeat: 'monthly', estimate: false, remind: 2, method: 'UPI' },
    { id: 'u-wifi', name: 'ACT Fibernet (my share)', category: 'Bills & recharges', amount: 400, due: '2026-12-08', repeat: 'monthly', estimate: false, remind: null, method: 'UPI' },
    { id: 'u-gift', name: 'Wedding gift for Priya', category: 'Friends & entertainment', amount: 1500, due: '2026-12-12', repeat: 'none', estimate: true, remind: 3, method: 'UPI' }
  ];

  /* ---------- Past purchase checks ---------- */
  const decisions = [
    { id: 'd-1', date: '2026-10-05', name: 'Noise-cancelling earbuds', category: 'Shopping & grooming', price: 2499, verdict: 'tight', outcome: 'waiting' },
    { id: 'd-2', date: '2026-09-10', name: 'Concert tickets with friends', category: 'Friends & entertainment', price: 1800, verdict: 'comfortable', outcome: 'bought' }
  ];

  SW.seed = {
    TODAY, CATEGORIES, INCOME_CATEGORIES, METHODS, settings, budget, buffer, goals, upcoming, decisions,
    transactions
  };
})();
