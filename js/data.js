/* Seed data · Aarav Kulkarni, 24, a junior UX designer in Pune in his first job.
   Fictional. All values in INR. "Today" is fixed so figures stay consistent across the app.
   Transactions are generated from a seeded random source, so the history is the same on every load.
   Totals are never typed in: every page computes them from these rows. */
window.SW = window.SW || {};
(function () {
  const TODAY = '2026-11-02';

  /* kind: 'bill' = planned and tracked in Upcoming expenses
           'everyday' = day-to-day essentials estimated from history
           'flexible' = non-essential spending you choose day to day */
  const CATEGORIES = [
    { id: 'Rent', essential: true, kind: 'bill' },
    { id: 'Utilities & bills', essential: true, kind: 'bill' },
    { id: 'Loan EMI', essential: true, kind: 'bill' },
    { id: 'Insurance', essential: true, kind: 'bill' },
    { id: 'Education', essential: true, kind: 'bill' },
    { id: 'Family support', essential: true, kind: 'bill' },
    { id: 'Groceries', essential: true, kind: 'everyday' },
    { id: 'Transport', essential: true, kind: 'everyday' },
    { id: 'Health', essential: true, kind: 'everyday' },
    { id: 'Subscriptions', essential: false, kind: 'bill' },
    { id: 'Fitness', essential: false, kind: 'bill' },
    { id: 'Food & dining', essential: false, kind: 'flexible' },
    { id: 'Shopping', essential: false, kind: 'flexible' },
    { id: 'Entertainment', essential: false, kind: 'flexible' },
    { id: 'Personal care', essential: false, kind: 'flexible' },
    { id: 'Travel', essential: false, kind: 'flexible' },
    { id: 'Gifts', essential: false, kind: 'flexible' },
    { id: 'Other', essential: false, kind: 'flexible' }
  ];
  const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Pocket money', 'Scholarship', 'Refund', 'Other income'];
  const METHODS = ['UPI', 'Debit card', 'Credit card', 'Net banking', 'Cash', 'Bank transfer', 'Auto-debit'];

  const settings = {
    name: 'Aarav Kulkarni',
    stage: 'first-job',          // 'student' | 'first-job' | 'working'
    city: 'Pune',
    monthlyIncome: 60000,
    payday: 1,                   // day of month income usually arrives
    cushion: 5000,               // money the user never wants to dip below
    remindDays: 2,
    openingBalance: 8000        // balance on 31 May 2026, before the first recorded transaction
  };

  const goals = [
    { id: 'g-emergency', name: 'Emergency fund', target: 150000, start: 28000, deadline: '2028-03-31', monthly: 6000, created: '2026-03-01', note: 'Three months of essentials, kept untouched.' },
    { id: 'g-goa', name: 'Goa trip with college friends', target: 25000, start: 0, deadline: '2027-02-15', monthly: 4000, created: '2026-08-01', note: 'Flights, stay and my share of the villa.' },
    { id: 'g-phone', name: 'New phone', target: 45000, start: 5000, deadline: '2027-06-30', monthly: 3500, created: '2026-09-01', note: 'Started with ₹5,000 from selling the old one.' },
    { id: 'g-laptop', name: 'Laptop repair fund', target: 8000, start: 0, deadline: '2026-08-31', monthly: 0, created: '2026-06-01', note: '' }
  ];

  /* ---------- Seeded history: June to 2 November 2026 ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = rng(20261102);
  const between = (a, b) => Math.round(a + rand() * (b - a));
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const pad = n => String(n).padStart(2, '0');

  const tx = [];
  const add = (date, type, desc, category, amount, method, extra) => tx.push(Object.assign({ date, type, desc, category, amount: Math.round(amount), method }, extra || {}));

  const POOLS = {
    Groceries: [['Blinkit', 180, 650, 'UPI'], ['Zepto', 150, 520, 'UPI'], ['BigBasket', 900, 1600, 'Debit card'], ['DMart', 700, 1500, 'Debit card'], ['Sai Kirana Store', 120, 400, 'UPI']],
    'Food & dining': [['Swiggy', 180, 520, 'UPI'], ['Zomato', 200, 560, 'UPI'], ['Third Wave Coffee', 160, 320, 'UPI'], ['Office canteen', 90, 160, 'UPI'], ['Vaishali Restaurant', 350, 900, 'Credit card']],
    Transport: [['Uber', 160, 420, 'UPI'], ['Rapido', 60, 140, 'UPI'], ['Ola', 150, 380, 'UPI'], ['Pune Metro card recharge', 300, 500, 'UPI']],
    Health: [['Apollo Pharmacy', 180, 650, 'UPI']],
    'Personal care': [['Looks Salon', 300, 520, 'UPI']],
    Entertainment: [['BookMyShow', 380, 900, 'Credit card']]
  };

  // How many purchases of each kind per month, and a size multiplier
  const PLAN = {
    '2026-06': { Groceries: 7, 'Food & dining': 12, Transport: 9, Health: 1, 'Personal care': 1, Entertainment: 1, food: 1 },
    '2026-07': { Groceries: 7, 'Food & dining': 13, Transport: 8, Health: 2, 'Personal care': 1, Entertainment: 1, food: 1 },
    '2026-08': { Groceries: 8, 'Food & dining': 12, Transport: 9, Health: 1, 'Personal care': 1, Entertainment: 2, food: 1 },
    '2026-09': { Groceries: 7, 'Food & dining': 13, Transport: 9, Health: 1, 'Personal care': 1, Entertainment: 1, food: 1 },
    '2026-10': { Groceries: 8, 'Food & dining': 19, Transport: 10, Health: 1, 'Personal care': 1, Entertainment: 2, food: 1.12 }
  };
  const ELECTRICITY = { '2026-06': 1620, '2026-07': 1480, '2026-08': 1310, '2026-09': 1240, '2026-10': 1365 };

  Object.keys(PLAN).forEach(key => {
    const [y, m] = key.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    const d = day => `${key}-${pad(Math.min(day, last))}`;
    const plan = PLAN[key];

    // Income and planned money
    add(d(1), 'income', 'Salary · Lumen Labs', 'Salary', 60000, 'Bank transfer');
    add(d(1), 'transfer', 'Emergency fund', 'Savings', 6000, 'Auto-debit', { goalId: 'g-emergency' });
    if (key <= '2026-07') add(d(3), 'transfer', 'Laptop repair fund', 'Savings', 4000, 'Bank transfer', { goalId: 'g-laptop' });
    if (key >= '2026-08') add(d(3), 'transfer', 'Goa trip with college friends', 'Savings', 3000, 'Bank transfer', { goalId: 'g-goa' });
    if (key >= '2026-09') add(d(3), 'transfer', 'New phone', 'Savings', 3500, 'Bank transfer', { goalId: 'g-phone' });

    // Bills
    add(d(3), 'expense', 'Sent home to Aai', 'Family support', 4000, 'Bank transfer');
    add(d(5), 'expense', 'Rent · Baner flat (my share)', 'Rent', 16000, 'UPI');
    add(d(7), 'expense', 'Cult gym membership', 'Fitness', 1500, 'UPI');
    add(d(9), 'expense', 'Spotify', 'Subscriptions', 119, 'Credit card');
    add(d(10), 'expense', 'Broadband (my share)', 'Utilities & bills', 600, 'UPI');
    add(d(10), 'expense', 'Education loan EMI', 'Loan EMI', 4800, 'Auto-debit');
    add(d(12), 'expense', 'MSEDCL electricity bill', 'Utilities & bills', ELECTRICITY[key], 'UPI');
    add(d(18), 'expense', 'Jio recharge', 'Utilities & bills', 449, 'UPI');
    add(d(21), 'expense', 'Netflix', 'Subscriptions', 199, 'Credit card');
    add(d(26), 'expense', 'iCloud storage', 'Subscriptions', 75, 'Credit card');

    // Day-to-day
    Object.keys(POOLS).forEach(cat => {
      for (let i = 0; i < plan[cat]; i++) {
        const [desc, lo, hi, method] = pick(POOLS[cat]);
        const mult = cat === 'Food & dining' ? plan.food : 1;
        add(d(between(1, last)), 'expense', desc, cat, between(lo, hi) * mult, method);
      }
    });
  });

  // One-offs that make each month its own
  add('2026-06-14', 'expense', 'Decathlon · running shoes', 'Shopping', 2999, 'Credit card');
  add('2026-06-22', 'expense', "Ishaan's birthday gift", 'Gifts', 1200, 'UPI');
  add('2026-07-11', 'expense', 'Lonavala weekend trip', 'Travel', 3200, 'UPI');
  add('2026-07-16', 'income', 'Refund · Myntra return', 'Refund', 1299, 'Bank transfer');
  add('2026-07-24', 'expense', 'Myntra', 'Shopping', 1899, 'Credit card');
  add('2026-08-08', 'income', 'Logo design for a café', 'Freelance', 8000, 'Bank transfer');
  add('2026-08-19', 'expense', 'Amazon · desk lamp', 'Shopping', 1450, 'Credit card');
  add('2026-08-30', 'expense', 'Raksha Bandhan gift for Tanvi', 'Gifts', 1500, 'UPI');
  add('2026-09-13', 'expense', 'Prateek Kuhad concert', 'Entertainment', 2500, 'Credit card');
  add('2026-09-27', 'expense', 'Uniqlo', 'Shopping', 1990, 'Credit card');
  add('2026-10-04', 'expense', 'Amazon Great Indian Festival', 'Shopping', 4899, 'Credit card');
  add('2026-10-06', 'expense', 'Myntra festive sale', 'Shopping', 2350, 'Credit card');
  add('2026-10-18', 'income', 'Poster series · freelance', 'Freelance', 5000, 'Bank transfer');
  add('2026-10-25', 'expense', 'Dandiya night passes', 'Entertainment', 900, 'UPI');

  // This cycle so far
  add('2026-11-01', 'income', 'Salary · Lumen Labs', 'Salary', 60000, 'Bank transfer');
  add('2026-11-01', 'transfer', 'Emergency fund', 'Savings', 6000, 'Auto-debit', { goalId: 'g-emergency' });
  add('2026-11-01', 'expense', 'Blinkit', 'Groceries', 842, 'UPI');
  add('2026-11-01', 'expense', 'Swiggy', 'Food & dining', 386, 'UPI');
  add('2026-11-02', 'expense', 'Uber', 'Transport', 214, 'UPI');
  add('2026-11-02', 'expense', 'Third Wave Coffee', 'Food & dining', 180, 'UPI');

  tx.sort((a, b) => a.date.localeCompare(b.date));
  tx.forEach((t, i) => (t.id = 'T-' + (1001 + i)));

  /* ---------- Planned and recurring expenses ---------- */
  const upcoming = [
    { id: 'u-society', name: 'Society maintenance (my share)', category: 'Utilities & bills', amount: 1200, due: '2026-10-31', repeat: 'monthly', estimate: false, remind: 2, method: 'UPI' },
    { id: 'u-family', name: 'Sent home to Aai', category: 'Family support', amount: 4000, due: '2026-11-03', repeat: 'monthly', estimate: false, remind: 1, method: 'Bank transfer' },
    { id: 'u-rent', name: 'Rent · Baner flat (my share)', category: 'Rent', amount: 16000, due: '2026-11-05', repeat: 'monthly', estimate: false, remind: 2, method: 'UPI' },
    { id: 'u-bus', name: 'Bus to Nagpur for Diwali', category: 'Travel', amount: 1850, due: '2026-11-06', repeat: 'none', estimate: false, remind: null, method: 'UPI' },
    { id: 'u-diwali', name: 'Diwali gifts for family', category: 'Gifts', amount: 6000, due: '2026-11-07', repeat: 'none', estimate: true, remind: 3, method: 'UPI' },
    { id: 'u-gym', name: 'Cult gym membership', category: 'Fitness', amount: 1500, due: '2026-11-07', repeat: 'monthly', estimate: false, remind: null, method: 'UPI' },
    { id: 'u-spotify', name: 'Spotify', category: 'Subscriptions', amount: 119, due: '2026-11-09', repeat: 'monthly', estimate: false, remind: null, method: 'Credit card' },
    { id: 'u-broadband', name: 'Broadband (my share)', category: 'Utilities & bills', amount: 600, due: '2026-11-10', repeat: 'monthly', estimate: false, remind: null, method: 'UPI' },
    { id: 'u-emi', name: 'Education loan EMI', category: 'Loan EMI', amount: 4800, due: '2026-11-10', repeat: 'monthly', estimate: false, remind: 3, method: 'Auto-debit' },
    { id: 'u-power', name: 'MSEDCL electricity bill', category: 'Utilities & bills', amount: 1400, due: '2026-11-12', repeat: 'monthly', estimate: true, remind: 2, method: 'UPI' },
    { id: 'u-jio', name: 'Jio recharge', category: 'Utilities & bills', amount: 449, due: '2026-11-18', repeat: 'monthly', estimate: false, remind: null, method: 'UPI' },
    { id: 'u-netflix', name: 'Netflix', category: 'Subscriptions', amount: 199, due: '2026-11-21', repeat: 'monthly', estimate: false, remind: null, method: 'Credit card' },
    { id: 'u-icloud', name: 'iCloud storage', category: 'Subscriptions', amount: 75, due: '2026-11-26', repeat: 'monthly', estimate: false, remind: null, method: 'Credit card' },
    { id: 'u-insurance', name: 'Health insurance renewal', category: 'Insurance', amount: 7200, due: '2026-12-18', repeat: 'yearly', estimate: false, remind: 7, method: 'Net banking' }
  ];

  /* ---------- Past purchase checks ---------- */
  const decisions = [
    { id: 'd-1', date: '2026-10-03', name: 'Smartwatch in the festive sale', price: 6999, verdict: 'tight', outcome: 'skipped' },
    { id: 'd-2', date: '2026-09-08', name: 'Prateek Kuhad concert tickets', price: 2500, verdict: 'comfortable', outcome: 'bought' }
  ];

  SW.seed = { TODAY, CATEGORIES, INCOME_CATEGORIES, METHODS, settings, goals, transactions: tx, upcoming, decisions };
})();
