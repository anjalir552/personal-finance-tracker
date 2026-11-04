/* Formatting helpers: INR, dates, percentages */
(function () {
  const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const F = {
    MONTHS, MONTHS_LONG, WEEKDAYS,
    /** ₹9,40,000 */
    inr(v) {
      if (v == null || isNaN(v)) return '—';
      const s = inr.format(Math.round(Math.abs(v)));
      return v < 0 ? '−' + s : s;
    },
    /** Signed: +₹2,60,500 / −₹40,000 */
    inrSigned(v) {
      if (!v) return F.inr(0);
      return (v > 0 ? '+' : '') + F.inr(v);
    },
    /** Compact Indian notation: ₹9.4L, ₹1.2Cr, ₹45k */
    inrc(v, digits) {
      if (v == null || isNaN(v)) return '—';
      const a = Math.abs(v), sign = v < 0 ? '−' : '';
      let out;
      if (a >= 1e7) out = (a / 1e7).toFixed(digits ?? (a >= 1e8 ? 1 : 2)).replace(/\.0+$/, '') + 'Cr';
      else if (a >= 1e5) out = (a / 1e5).toFixed(digits ?? (a >= 1e6 ? 1 : 2)).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1') + 'L';
      else if (a >= 1e3) out = (a / 1e3).toFixed(digits ?? 0).replace(/\.0+$/, '') + 'k';
      else out = Math.round(a).toString();
      return sign + '₹' + out;
    },
    num(v) { return num.format(Math.round(v)); },
    pct(v, d = 0) {
      if (v == null || !isFinite(v)) return '—';
      return (v * 100).toFixed(d).replace('-', '−') + '%';
    },
    /** Parse 'YYYY-MM-DD' as a local date */
    d(s) {
      if (s instanceof Date) return s;
      const [y, m, dd] = s.split('-').map(Number);
      return new Date(y, m - 1, dd);
    },
    iso(dt) {
      const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, '0'), d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },
    /** 14 Nov 2026 */
    date(s, withYear = true) {
      const dt = F.d(s);
      return `${dt.getDate()} ${MONTHS[dt.getMonth()]}${withYear ? ' ' + dt.getFullYear() : ''}`;
    },
    short(s) { return F.date(s, false); },
    monthLabel(y, m) { return `${MONTHS[m]} ${String(y).slice(2)}`; },
    addDays(s, n) { const dt = new Date(F.d(s)); dt.setDate(dt.getDate() + n); return F.iso(dt); },
    daysBetween(a, b) { return Math.round((F.d(b) - F.d(a)) / 86400000); },
    /** "in 3 days" / "5 days ago" / "today" */
    rel(s, today) {
      const n = F.daysBetween(today, s);
      if (n === 0) return 'today';
      if (n === 1) return 'tomorrow';
      if (n === -1) return 'yesterday';
      return n > 0 ? `in ${n} days` : `${-n} days ago`;
    },
    esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    initials(name) { return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(); },
    /** Parse "1,20,000" / "₹1.2L" style input into a number */
    parseAmount(str) {
      if (typeof str === 'number') return str;
      const s = String(str || '').trim().toLowerCase().replace(/[₹,\s]/g, '');
      const m = s.match(/^(-?\d*\.?\d+)(cr|l|k)?$/);
      if (!m) return NaN;
      const mult = { cr: 1e7, l: 1e5, k: 1e3 }[m[2]] || 1;
      return parseFloat(m[1]) * mult;
    }
  };
  SW.fmt = F;
})();
