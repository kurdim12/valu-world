/* Shared helpers: one animation loop, tweens, easing, geometry, DOM, bilingual text.
   Classic script (no modules) so it runs from file://. */
(function () {
  const V = (window.V = window.V || {});

  // ---------- one requestAnimationFrame loop for everything ----------
  const tasks = new Set();
  let last = performance.now();
  V.now = () => performance.now();
  V.loop = {
    add(fn) { tasks.add(fn); return () => tasks.delete(fn); },
    remove(fn) { tasks.delete(fn); },
  };
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000); // seconds, clamped so a stall never makes things jump
    last = t;
    tasks.forEach((fn) => { try { fn(dt, t); } catch (e) { console.error(e); tasks.delete(fn); } });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- easing ----------
  V.ease = {
    linear: (x) => x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    outQuint: (x) => 1 - Math.pow(1 - x, 5),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  };

  // tween(duration ms, onUpdate(easedK, rawK), {ease, delay, done}) → cancel()
  V.tween = function (dur, onUpdate, opt) {
    opt = opt || {};
    const ease = opt.ease || V.ease.outCubic;
    const start = V.now() + (opt.delay || 0);
    let finished = false;
    const fn = () => {
      const t = V.now();
      if (t < start) return;
      const k = Math.min(1, (t - start) / dur);
      onUpdate(ease(k), k);
      if (k >= 1) { finished = true; V.loop.remove(fn); opt.done && opt.done(); }
    };
    V.loop.add(fn);
    return () => { if (!finished) V.loop.remove(fn); };
  };
  V.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  V.lerp = (a, b, k) => a + (b - a) * k;
  V.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  V.rand = (a, b) => a + Math.random() * (b - a);

  // ---------- geometry ----------
  V.dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  V.centroid = (poly) => {
    let x = 0, y = 0;
    poly.forEach((p) => { x += p[0]; y += p[1]; });
    return [x / poly.length, y / poly.length];
  };
  V.bbox = (poly) => {
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };
  V.polyArea = (poly) => {
    let a = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
    return Math.abs(a / 2);
  };
  V.inPoly = (x, y, poly) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  // Polyline sampler: {len, at(t 0..1) → {x, y, a}}
  V.path = (pts) => {
    const seg = [];
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      const l = Math.hypot(dx, dy);
      seg.push({ a: pts[i - 1], dx, dy, l, s: len });
      len += l;
    }
    return {
      len,
      at(t) {
        const d = V.clamp(t, 0, 1) * len;
        let s = seg[seg.length - 1];
        for (const g of seg) { if (d <= g.s + g.l) { s = g; break; } }
        const k = s.l ? (d - s.s) / s.l : 0;
        return { x: s.a[0] + s.dx * k, y: s.a[1] + s.dy * k, a: Math.atan2(s.dy, s.dx) };
      },
    };
  };
  V.polyToSvg = (poly) => poly.map((p) => p.join(",")).join(" ");

  // ---------- DOM ----------
  V.el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  V.svgNS = "http://www.w3.org/2000/svg";
  V.svg = (tag, attrs) => {
    const e = document.createElementNS(V.svgNS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    return e;
  };
  V.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- content + bilingual text (Arabic line above English line) ----------
  V.S = () => window.VALU_STORY;
  V.set = () => window.VALU_STORY.settings;
  V.t = (key) => V.S().copy[key] || { en: key, ar: key };
  V.bi = (obj, cls) =>
    `<span class="bi ${cls || ""}"><span class="ar" dir="rtl" lang="ar">${V.esc(obj.ar)}</span><span class="en" lang="en">${V.esc(obj.en)}</span></span>`;
})();
