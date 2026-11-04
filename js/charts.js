/* Lightweight responsive SVG charts with tooltips (line/area and grouped bars) */
(function () {
  const F = SW.fmt;
  const NS = 'http://www.w3.org/2000/svg';
  let observers = [];

  function niceTicks(min, max, count = 4) {
    if (min === max) { max = min + 1; }
    const span = max - min;
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const s = norm > 5 ? 10 * mag : norm > 2.5 ? 5 * mag : norm > 2 ? 2.5 * mag : norm > 1 ? 2 * mag : mag;
    const lo = Math.floor(min / s) * s, hi = Math.ceil(max / s) * s;
    const ticks = [];
    for (let v = lo; v <= hi + s / 2; v += s) ticks.push(Math.round(v * 100) / 100);
    return { ticks, lo, hi, step: s };
  }

  // Straight segments: a smoothed curve invents values between monthly totals
  function linePath(pts) {
    return pts.length ? 'M' + pts.map(p => p[0] + ',' + p[1]).join('L') : '';
  }
  function monotonePath(pts) {
    const n = pts.length;
    if (n < 2) return '';
    if (n === 2) return `M${pts[0][0]},${pts[0][1]}L${pts[1][0]},${pts[1][1]}`;
    const dx = [], dy = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = pts[i + 1][1] - pts[i][1]; m[i] = dy[i] / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
      if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < n - 1; i++) {
      const c = dx[i] / 3;
      d += `C${pts[i][0] + c},${pts[i][1] + c * t[i]} ${pts[i + 1][0] - c},${pts[i + 1][1] - c * t[i + 1]} ${pts[i + 1][0]},${pts[i + 1][1]}`;
    }
    return d;
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function mount(container, draw) {
    container.classList.add('chart');
    const run = () => {
      container.innerHTML = '';
      const tip = document.createElement('div');
      tip.className = 'chart-tooltip';
      container.appendChild(tip);
      draw(container, Math.max(container.clientWidth, 260), tip);
    };
    run();
    let lastW = container.clientWidth;
    if (container._ro) container._ro.disconnect();
    const ro = new ResizeObserver(() => {
      if (Math.abs(container.clientWidth - lastW) > 4) { lastW = container.clientWidth; run(); }
    });
    ro.observe(container);
    container._ro = ro;
    observers.push(ro);
  }

  function placeTip(tip, container, x, y, w) {
    tip.classList.add('show');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = x + 14;
    if (left + tw > w) left = x - tw - 14;
    if (left < 0) left = Math.max(0, x - tw / 2);
    let top = Math.max(0, y - th / 2);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function yAxis(svg, ticks, y, padL, w, padR, fmt) {
    const g = el('g', {}, svg);
    ticks.forEach(v => {
      const yy = y(v);
      el('line', { x1: padL, x2: w - padR, y1: yy, y2: yy, class: v === 0 ? 'zero-line' : 'grid-line' }, g);
      const t = el('text', { x: padL - 10, y: yy + 3.5, 'text-anchor': 'end', class: 'axis-label' }, g);
      t.textContent = fmt(v);
    });
  }

  /**
   * Line chart
   * opts: { labels, series: [{ name, color, values, dashFrom, width, area }], band: {lower, upper, color},
   *         height, yFormat, tooltip(i) -> html, markerIndex, xEvery }
   */
  function line(container, opts) {
    mount(container, (root, w, tip) => {
      const h = opts.height || 240;
      const padL = 56, padR = 14, padT = 12, padB = 30;
      const n = opts.labels.length;
      const all = [];
      opts.series.forEach(s => s.values.forEach(v => v != null && all.push(v)));
      if (opts.band) { all.push(...opts.band.lower, ...opts.band.upper); }
      if (opts.reference) all.push(opts.reference.value);
      if (opts.max != null) all.push(opts.max);
      let min = Math.min(...all), max = Math.max(...all);
      if (opts.zero || min < 0) min = Math.min(0, min);
      const pad = (max - min) * 0.08;
      const floor = min >= 0 ? Math.max(0, min - pad) : min - pad;
      const { ticks, lo, hi } = niceTicks(floor, max + pad, opts.ticks || 4);
      const x = i => padL + (n === 1 ? 0 : (i * (w - padL - padR)) / (n - 1));
      const y = v => padT + (1 - (v - lo) / (hi - lo)) * (h - padT - padB);

      const svg = el('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': opts.ariaLabel || 'Chart' });
      root.insertBefore(svg, tip);
      const defs = el('defs', {}, svg);
      yAxis(svg, ticks, y, padL, w, padR, opts.yFormat || F.inrc);

      // X labels
      const every = opts.xEvery || Math.ceil(n / Math.max(2, Math.floor((w - padL) / 64)));
      opts.labels.forEach((l, i) => {
        if (i % every !== 0 && i !== n - 1) return;
        if (i !== n - 1 && n - 1 - i < every && i % every === 0 && i !== 0) return;
        const t = el('text', { x: x(i), y: h - 8, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle', class: 'axis-label' }, svg);
        t.textContent = l;
      });

      // Marker (e.g. "today")
      if (opts.markerIndex != null) {
        const mx = x(opts.markerIndex);
        el('line', { x1: mx, x2: mx, y1: padT, y2: h - padB, stroke: 'var(--line-strong)', 'stroke-dasharray': '2 3' }, svg);
        if (opts.markerLabel) {
          const t = el('text', { x: mx + 6, y: padT + 10, class: 'axis-label', style: 'font-weight:500' }, svg);
          t.textContent = opts.markerLabel;
        }
      }

      // Extra markers: [{ index, label }]
      (opts.markers || []).forEach((mk, mi) => {
        const mx = x(mk.index);
        el('line', { x1: mx, x2: mx, y1: padT, y2: h - padB, stroke: mk.color || 'var(--line-strong)', 'stroke-dasharray': '2 3' }, svg);
        if (mk.label) {
          const right = mx > w - 110;
          const t = el('text', { x: right ? mx - 6 : mx + 6, y: padT + 10 + mi * 14, 'text-anchor': right ? 'end' : 'start', class: 'axis-label', style: 'font-weight:500' }, svg);
          t.textContent = mk.label;
        }
      });
      // Reference line: { value, label }
      if (opts.reference) {
        const ry = y(opts.reference.value);
        el('line', { x1: padL, x2: w - padR, y1: ry, y2: ry, class: 'ref-line' }, svg);
        if (opts.reference.label) {
          const st = opts.reference.align === 'start';
          const t = el('text', { x: st ? padL + 6 : w - padR, y: ry - 6, 'text-anchor': st ? 'start' : 'end', class: 'axis-label ref-label' }, svg);
          t.textContent = opts.reference.label;
        }
      }

      // Band
      if (opts.band) {
        const up = opts.band.upper.map((v, i) => [x(i), y(v)]);
        const low = opts.band.lower.map((v, i) => [x(i), y(v)]).reverse();
        const d = 'M' + up.map(p => p.join(',')).join('L') + 'L' + low.map(p => p.join(',')).join('L') + 'Z';
        el('path', { d, fill: opts.band.color || 'var(--stone-100)', opacity: 0.75 }, svg);
      }

      // Series
      opts.series.forEach((s, si) => {
        const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
        if (s.area) {
          const base = y(Math.max(lo, 0 > lo ? 0 : lo));
          const areaPts = s.areaTo != null ? pts.slice(0, s.areaTo + 1) : pts;
          const d = linePath(areaPts) + `L${areaPts[areaPts.length - 1][0]},${base}L${areaPts[0][0]},${base}Z`;
          el('path', { d, fill: s.color, 'fill-opacity': 0.08 }, svg);
        }
        const common = { fill: 'none', stroke: s.color, 'stroke-width': s.width || 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
        if (s.dashFrom != null && s.dashFrom < pts.length - 1) {
          el('path', Object.assign({ d: linePath(pts.slice(0, s.dashFrom + 1)) }, common), svg);
          el('path', Object.assign({ d: linePath(pts.slice(s.dashFrom)), 'stroke-dasharray': '4 4' }, common), svg);
        } else {
          el('path', Object.assign({ d: linePath(pts), 'stroke-dasharray': s.dashed ? '4 4' : 'none' }, common), svg);
        }
        if (s.endDot) {
          const p = pts[pts.length - 1];
          el('circle', { cx: p[0], cy: p[1], r: 3.5, fill: s.color, stroke: '#fff', 'stroke-width': 2 }, svg);
        }
      });

      // Hover layer
      const hl = el('line', { y1: padT, y2: h - padB, class: 'hover-line', opacity: 0 }, svg);
      const dots = opts.series.map(s => el('circle', { r: 4, fill: '#fff', stroke: s.color, 'stroke-width': 2, opacity: 0 }, svg));
      const hit = el('rect', { x: padL, y: 0, width: w - padL - padR, height: h, fill: 'transparent' }, svg);
      const move = ev => {
        const r = svg.getBoundingClientRect();
        const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
        const i = Math.max(0, Math.min(n - 1, Math.round(((px - padL) / (w - padL - padR)) * (n - 1))));
        const xx = x(i);
        hl.setAttribute('x1', xx); hl.setAttribute('x2', xx); hl.setAttribute('opacity', 1);
        let topY = h;
        opts.series.forEach((s, si) => {
          const v = s.values[i];
          if (v == null) { dots[si].setAttribute('opacity', 0); return; }
          dots[si].setAttribute('cx', xx); dots[si].setAttribute('cy', y(v)); dots[si].setAttribute('opacity', 1);
          topY = Math.min(topY, y(v));
        });
        tip.innerHTML = opts.tooltip ? opts.tooltip(i) : `<div class="tt-title">${opts.labels[i]}</div>`;
        placeTip(tip, root, xx, Math.max(40, topY), w);
      };
      const leave = () => { tip.classList.remove('show'); hl.setAttribute('opacity', 0); dots.forEach(d => d.setAttribute('opacity', 0)); };
      hit.addEventListener('mousemove', move);
      hit.addEventListener('touchstart', move, { passive: true });
      hit.addEventListener('touchmove', move, { passive: true });
      hit.addEventListener('mouseleave', leave);
      hit.addEventListener('touchend', () => setTimeout(leave, 1600));
    });
  }

  /**
   * Grouped bar chart
   * opts: { labels, series: [{ name, color, values }], height, yFormat, tooltip(i), highlight: index }
   */
  function bars(container, opts) {
    mount(container, (root, w, tip) => {
      const h = opts.height || 240;
      const padL = 56, padR = 8, padT = 12, padB = 30;
      const n = opts.labels.length, k = opts.series.length;
      const all = [0];
      if (opts.stack) opts.labels.forEach((l, i) => all.push(opts.series.reduce((a, s) => a + (s.values[i] || 0), 0)));
      else opts.series.forEach(s => all.push(...s.values));
      if (opts.overlay) all.push(...opts.overlay.values);
      if (opts.reference) all.push(opts.reference.value);
      const { ticks, lo, hi } = niceTicks(Math.min(...all), Math.max(...all) * 1.05, opts.ticks || 4);
      const innerW = w - padL - padR;
      const groupW = innerW / n;
      const gap = Math.min(4, groupW * 0.06);
      const cols = opts.stack ? 1 : k;
      const barW = Math.min(opts.maxBar || 22, (groupW * 0.62 - gap * (cols - 1)) / cols);
      const y = v => padT + (1 - (v - lo) / (hi - lo)) * (h - padT - padB);

      const svg = el('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': opts.ariaLabel || 'Bar chart' });
      root.insertBefore(svg, tip);
      yAxis(svg, ticks, y, padL, w, padR, opts.yFormat || F.inrc);

      const groups = [];
      opts.labels.forEach((l, i) => {
        const g = el('g', { class: 'bar-group' }, svg);
        const cx = padL + groupW * i + groupW / 2;
        const totalW = barW * cols + gap * (cols - 1);
        let acc = 0;
        if (opts.stack) {
          opts.series.forEach((s, si) => {
            const v = s.values[i] || 0;
            if (v <= 0) return;
            const bx = cx - barW / 2;
            const top = si === opts.series.length - 1 || !opts.series.slice(si + 1).some(o => (o.values[i] || 0) > 0);
            const y0 = y(acc), y1 = y(acc + v) + (acc > 0 ? 1 : 0);
            acc += v;
            const r = top ? Math.min(3, barW / 2, Math.max(0, y0 - y1)) : 0;
            const d = `M${bx},${y0}V${y1 + r}Q${bx},${y1} ${bx + r},${y1}H${bx + barW - r}Q${bx + barW},${y1} ${bx + barW},${y1 + r}V${y0}Z`;
            el('path', { d, fill: (s.colors && s.colors[i]) || s.color, class: 'bar-rect' }, g);
          });
        }
        if (opts.overlay) {
          const oy = y(opts.overlay.values[i]);
          el('line', { x1: cx - barW / 2 - 5, x2: cx + barW / 2 + 5, y1: oy, y2: oy, stroke: (opts.overlay.colors && opts.overlay.colors[i]) || opts.overlay.color, 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
        }
        if (!opts.stack) opts.series.forEach((s, si) => {
          const v = s.values[i];
          const bx = cx - totalW / 2 + si * (barW + gap);
          const b0 = y(0);
          let d;
          if (v >= 0) {
            const by = y(v), r = Math.min(3, barW / 2, Math.max(0, b0 - by));
            d = `M${bx},${b0}V${by + r}Q${bx},${by} ${bx + r},${by}H${bx + barW - r}Q${bx + barW},${by} ${bx + barW},${by + r}V${b0}Z`;
          } else {
            const by = y(v), r = Math.min(3, barW / 2, Math.max(0, by - b0));
            d = `M${bx},${b0}V${by - r}Q${bx},${by} ${bx + r},${by}H${bx + barW - r}Q${bx + barW},${by} ${bx + barW},${by - r}V${b0}Z`;
          }
          el('path', { d, fill: (s.colors && s.colors[i]) || s.color, class: 'bar-rect' }, g);
        });
        const t = el('text', { x: cx, y: h - 8, 'text-anchor': 'middle', class: 'axis-label' }, svg);
        t.textContent = l;
        if (opts.highlight === i) t.setAttribute('style', 'font-weight:600;fill:var(--text)');
        groups.push({ g, cx });
      });

      if (opts.reference) {
        const ry = y(opts.reference.value);
        el('line', { x1: padL, x2: w - padR, y1: ry, y2: ry, class: 'ref-line' }, svg);
        if (opts.reference.label) {
          const t = el('text', { x: w - padR, y: ry - 6, 'text-anchor': 'end', class: 'axis-label ref-label' }, svg);
          t.textContent = opts.reference.label;
        }
      }
      const hit = el('rect', { x: padL, y: 0, width: innerW, height: h, fill: 'transparent' }, svg);
      const move = ev => {
        const r = svg.getBoundingClientRect();
        const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
        const i = Math.max(0, Math.min(n - 1, Math.floor((px - padL) / groupW)));
        groups.forEach((gr, gi) => gr.g.classList.toggle('dimmed', gi !== i));
        tip.innerHTML = opts.tooltip ? opts.tooltip(i) : '';
        const top = opts.stack ? y(opts.series.reduce((a, s) => a + (s.values[i] || 0), 0)) : Math.min(...opts.series.map(s => Math.min(y(0), y(s.values[i]))));
        placeTip(tip, root, groups[i].cx + barW, Math.max(40, top), w);
      };
      const leave = () => { tip.classList.remove('show'); groups.forEach(gr => gr.g.classList.remove('dimmed')); };
      if (opts.onSelect) {
        hit.style.cursor = 'pointer';
        hit.addEventListener('click', ev => { const r = svg.getBoundingClientRect(); opts.onSelect(Math.max(0, Math.min(n - 1, Math.floor((ev.clientX - r.left - padL) / groupW)))); });
      }
      hit.addEventListener('mousemove', move);
      hit.addEventListener('touchstart', move, { passive: true });
      hit.addEventListener('mouseleave', leave);
      hit.addEventListener('touchend', () => setTimeout(leave, 1600));
    });
  }

  /**
   * Waterfall: a running sum drawn as floating columns.
   * opts: { steps: [{ label, value, kind: 'start'|'minus'|'total', cls }], reference: { value, label }, height, yFormat }
   * 'start' and 'total' columns stand on zero; 'minus' columns hang from the running total.
   */
  function waterfall(container, opts) {
    mount(container, (root, w, tip) => {
      const h = opts.height || 220;
      const padL = 8, padR = 8, padT = 26, padB = 30;
      const fmt = opts.yFormat || (v => F.inrc(v, Math.abs(v) < 1e5 ? 1 : 2));
      let run = 0;
      const cols = opts.steps.map(st => {
        let a, b;
        if (st.kind === 'minus') { a = run; b = run - st.value; run = b; }
        else { a = 0; b = st.kind === 'total' ? run : st.value; run = b; }
        return Object.assign({ a, b }, st);
      });
      const vals = cols.flatMap(c => [c.a, c.b]).concat(opts.reference ? [opts.reference.value] : []);
      const lo = Math.min(0, ...vals), hi = Math.max(...vals);
      const y = v => padT + (1 - (v - lo) / ((hi - lo) || 1)) * (h - padT - padB);
      const n = cols.length;
      const colW = (w - padL - padR) / n;
      const barW = Math.min(64, colW * 0.6);
      const svg = el('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': opts.ariaLabel || 'Waterfall chart' });
      root.insertBefore(svg, tip);
      el('line', { x1: padL, x2: w - padR, y1: y(0), y2: y(0), class: 'zero-line' }, svg);
      cols.forEach((c, i) => {
        const cx = padL + colW * i + colW / 2;
        const top = y(Math.max(c.a, c.b)), bot = y(Math.min(c.a, c.b));
        el('rect', { x: cx - barW / 2, y: top, width: barW, height: Math.max(2, bot - top), rx: 2, class: 'wf-bar ' + (c.cls || c.kind) }, svg);
        if (i < n - 1) {
          const nx = padL + colW * (i + 1) + colW / 2;
          el('line', { x1: cx + barW / 2, x2: nx - barW / 2, y1: y(c.b), y2: y(c.b), class: 'wf-link' }, svg);
        }
        const val = c.kind === 'minus' ? -c.value : c.b;
        const vt = el('text', { x: cx, y: Math.min(top, y(0)) - 7, 'text-anchor': 'middle', class: 'wf-val' + (c.kind !== 'minus' ? ' strong' : '') }, svg);
        vt.textContent = (c.kind === 'minus' ? '−' : '') + fmt(Math.abs(val)).replace('−', '−');
        if (c.kind !== 'minus' && val < 0) vt.textContent = fmt(val);
        const lt = el('text', { x: cx, y: h - 9, 'text-anchor': 'middle', class: 'axis-label' + (c.cls === 'buy' ? ' wf-buy-label' : '') }, svg);
        lt.textContent = colW < 62 && c.short ? c.short : c.label;
      });
      if (opts.reference) {
        const ry = y(opts.reference.value);
        el('line', { x1: padL, x2: w - padR, y1: ry, y2: ry, class: 'ref-line' }, svg);
        if (opts.reference.label) {
          const t = el('text', { x: w - padR, y: ry - 5, 'text-anchor': 'end', class: 'axis-label ref-label' }, svg);
          t.textContent = opts.reference.label;
        }
      }
    });
  }

  function cleanup() { observers.forEach(o => o.disconnect()); observers = []; }

  /** Tooltip row helper */
  function row(color, label, value, dashed) {
    const sw = dashed ? `<i style="background:none;border-top:2px dashed ${color};height:0;width:10px;border-radius:0"></i>` : `<i style="background:${color}"></i>`;
    return `<div class="tt-row"><span>${sw}${label}</span><span class="num">${value}</span></div>`;
  }

  SW.charts = { line, bars, waterfall, cleanup, row, niceTicks };
})();
