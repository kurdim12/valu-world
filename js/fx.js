/* The one FX canvas: bursts, sparkles, steam, fireworks, expanding rings, and light orbs travelling
   along paths. Hard cap of 300 live particles. Draws only while something is alive. */
(function () {
  const W = 1920, H = 1080, MAX = 300;
  const cv = document.getElementById("fx");
  const g = cv.getContext("2d");
  const parts = [], rings = [], orbs = [], strokes = [], glows = [];
  let dirty = false, shown = false;
  // An empty canvas is hidden, so the GPU doesn't blend a transparent full-screen 4K layer every frame.
  cv.style.visibility = "hidden";

  // Pre-rendered soft glow dot (an offscreen canvas we only ever draw from: no pixel reads).
  const glow = document.createElement("canvas");
  glow.width = glow.height = 64;
  (function () {
    const c = glow.getContext("2d"), r = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,.75)"); r.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = r; c.fillRect(0, 0, 64, 64);
  })();
  const tintCache = {};
  function tinted(color) { // glow sprite tinted to a colour (cached; drawn with source-in, no pixel reads)
    if (tintCache[color]) return tintCache[color];
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d");
    x.drawImage(glow, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, 64, 64);
    return (tintCache[color] = c);
  }

  const COL = { orange: "#FF5100", teal: "#00C4B3", white: "#ffffff", yellow: "#FCE200", gold: "#FFB347", sand: "#F2D3A2" };
  const col = (c) => COL[c] || c || "#ffffff";
  const pickCol = (c) => col(Array.isArray(c) ? c[(Math.random() * c.length) | 0] : c);

  function add(p) { if (parts.length < MAX) { parts.push(p); dirty = true; } }

  const F = (V.fx = {});

  // Burst of particles flying outward (dust, sparks).
  F.burst = (x, y, o) => {
    o = o || {};
    const n = o.n || 24;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (o.speed || 160) * (0.35 + Math.random() * 0.65);
      add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * (o.flat || 1) - (o.up || 0), g: o.gravity || 0,
        drag: o.drag || 2.2, life: 0, max: (o.life || 0.9) * (0.6 + Math.random() * 0.5), size: (o.size || 5) * (0.6 + Math.random() * 0.7),
        color: pickCol(o.color || ["orange", "white"]), glow: o.glow !== false });
    }
  };
  // Twinkling sparkles in an area.
  F.sparkle = (x, y, o) => {
    o = o || {};
    const n = o.n || 10, s = o.spread || 40;
    for (let i = 0; i < n; i++) {
      add({ x: x + V.rand(-s, s), y: y + V.rand(-s, s) * 0.7, vx: 0, vy: -V.rand(4, 18), g: 0, drag: 0,
        life: -V.rand(0, o.stagger || 0.5), max: V.rand(0.5, 1.0), size: V.rand(5, 10) * (o.scale || 1), color: pickCol(o.color || ["white", "yellow", "orange"]), glow: true, star: true });
    }
  };
  // Soft rising steam.
  F.steam = (x, y, o) => {
    o = o || {};
    for (let i = 0; i < (o.n || 14); i++) {
      add({ x: x + V.rand(-22, 22), y: y + V.rand(-6, 6), vx: V.rand(-6, 6), vy: -V.rand(22, 40), g: 0, drag: 0.3,
        life: -i * 0.12, max: V.rand(1.6, 2.4), size: V.rand(14, 22), grow: 1.6, color: "rgba(255,255,255,.9)", glow: true, soft: 0.35 });
    }
  };
  // Firework: a rising spark, then a radial burst.
  F.firework = (x, y, color, scale) => {
    const c = pickCol(color || ["orange", "yellow", "white", "teal"]), z = scale || 1;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2, sp = V.rand(120, 210) * z;
      add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 60, drag: 1.6, life: 0, max: V.rand(0.9, 1.4), size: V.rand(4, 7) * z, color: c, glow: true });
    }
    F.ring(x, y, { r1: 70 * z, dur: 500, color: c, width: 3 * z });
  };
  // Expanding ring.
  F.ring = (x, y, o) => {
    o = o || {};
    rings.push({ x, y, r0: o.r0 || 6, r1: o.r1 || 60, t: -(o.delay || 0), dur: (o.dur || 700) / 1000, color: col(o.color || "white"), width: o.width || 4, flat: o.flat || 0.62 });
    dirty = true;
  };
  // A light orb travelling along a polyline, leaving a short trail. Resolves when it arrives.
  F.orb = (pts, o) => new Promise((resolve) => {
    o = o || {};
    if (!pts || pts.length < 2) return resolve();
    orbs.push({ path: V.path(pts), t: -(o.delay || 0) / 1000, dur: (o.dur || 2000) / 1000, size: o.size || 26,
      color: col(o.color || "orange"), ease: o.ease || V.ease.inOutSine, done: resolve, trail: o.trail !== false });
    dirty = true;
  });

  // A glowing line that draws itself along a polyline, holds, then fades (blueprint lines, network links).
  F.stroke = (pts, o) => {
    o = o || {};
    if (!pts || pts.length < 2) return;
    strokes.push({ path: V.path(pts), pts, t: -(o.delay || 0) / 1000, draw: (o.draw || 700) / 1000, hold: (o.hold || 600) / 1000, fade: (o.fade || 450) / 1000,
      color: col(o.color || "white"), glowCol: col(o.glow || "orange"), width: o.width || 3 });
    dirty = true;
  };
  // A soft glow that fades up, holds and fades out; w/h let it be a tall column (towers) or a round lamp.
  F.glow = (x, y, o) => {
    o = o || {};
    glows.push({ x, y, w: o.w || o.r * 2 || 60, h: o.h || o.r * 2 || 60, t: -(o.delay || 0) / 1000, up: (o.up || 250) / 1000, hold: (o.hold || 600) / 1000,
      fade: (o.fade || 500) / 1000, color: col(o.color || "gold"), alpha: o.alpha || 0.9 });
    dirty = true;
  };
  // Confetti: little coloured squares that pop up and flutter down.
  F.confetti = (x, y, o) => {
    o = o || {};
    const cols = ["orange", "teal", "white", "yellow"];
    for (let i = 0; i < (o.n || 26); i++) {
      const a = -Math.PI / 2 + V.rand(-1.1, 1.1), sp = V.rand(160, 300);
      add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 340, drag: 1.4, life: 0, max: V.rand(1.0, 1.5), size: V.rand(5, 8), color: col(cols[i % cols.length]), glow: false });
    }
  };

  F.count = () => parts.length;
  F.stats = () => ({ parts: parts.length, rings: rings.length, orbs: orbs.length, strokes: strokes.length, glows: glows.length });

  V.loop.add((dt) => {
    if (!dirty) return;
    if (!shown) { shown = true; cv.style.visibility = "visible"; }
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    // orbs
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      o.t += dt;
      if (o.t < 0) continue;
      const k = Math.min(1, o.t / o.dur), p = o.path.at(o.ease(k));
      if (o.trail && Math.random() < 0.8) add({ x: p.x, y: p.y, vx: V.rand(-12, 12), vy: V.rand(-12, 12), g: 0, drag: 1, life: 0, max: 0.45, size: o.size * 0.35, color: o.color, glow: true });
      g.globalAlpha = 1;
      g.drawImage(tinted(o.color), p.x - o.size, p.y - o.size, o.size * 2, o.size * 2);
      g.drawImage(glow, p.x - o.size * 0.45, p.y - o.size * 0.45, o.size * 0.9, o.size * 0.9);
      if (k >= 1) { orbs.splice(i, 1); o.done(); }
    }
    // particles
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life < 0) continue;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      const k = p.life / p.max;
      p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt; p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const a = (p.star ? Math.sin(k * Math.PI) : 1 - k * k) * (p.soft || 1);
      const s = p.size * (p.grow ? 1 + k * p.grow : p.star ? 0.6 + Math.sin(k * Math.PI) * 0.6 : 1);
      g.globalAlpha = a;
      if (p.glow) g.drawImage(tinted(p.color), p.x - s, p.y - s, s * 2, s * 2);
      else { g.fillStyle = p.color; g.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
    }
    // glows (additive)
    for (let i = glows.length - 1; i >= 0; i--) {
      const gl = glows[i];
      gl.t += dt;
      if (gl.t < 0) continue;
      const end = gl.up + gl.hold + gl.fade;
      if (gl.t >= end) { glows.splice(i, 1); continue; }
      const a = gl.t < gl.up ? V.ease.outCubic(gl.t / gl.up) : gl.t < gl.up + gl.hold ? 1 : 1 - (gl.t - gl.up - gl.hold) / gl.fade;
      g.globalAlpha = a * gl.alpha;
      g.drawImage(tinted(gl.color), gl.x - gl.w / 2, gl.y - gl.h / 2, gl.w, gl.h);
    }
    // self-drawing strokes: a wide soft pass in the glow colour, then a thin bright line
    for (let i = strokes.length - 1; i >= 0; i--) {
      const st = strokes[i];
      st.t += dt;
      if (st.t < 0) continue;
      const end = st.draw + st.hold + st.fade;
      if (st.t >= end) { strokes.splice(i, 1); continue; }
      const k = V.ease.inOutSine(Math.min(1, st.t / st.draw));
      const a = st.t < st.draw + st.hold ? 1 : 1 - (st.t - st.draw - st.hold) / st.fade;
      const lim = k * st.path.len;
      g.beginPath();
      let acc = 0;
      g.moveTo(st.pts[0][0], st.pts[0][1]);
      for (let j = 1; j < st.pts.length; j++) {
        const [ax, ay] = st.pts[j - 1], [bx, by] = st.pts[j], l = Math.hypot(bx - ax, by - ay);
        if (acc + l >= lim) { const f = l ? (lim - acc) / l : 0; g.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f); break; }
        g.lineTo(bx, by); acc += l;
      }
      g.lineCap = "round"; g.lineJoin = "round";
      g.globalAlpha = a * 0.45; g.strokeStyle = st.glowCol; g.lineWidth = st.width * 4; g.stroke();
      g.globalAlpha = a; g.strokeStyle = st.color; g.lineWidth = st.width; g.stroke();
      if (k < 1) { const tip = st.path.at(k); g.globalAlpha = a; g.drawImage(tinted(st.glowCol), tip.x - 14, tip.y - 14, 28, 28); }
    }
    // rings (drawn normally so white stays white over the bright world)
    g.globalCompositeOperation = "source-over";
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.t += dt;
      if (r.t < 0) continue;
      const k = Math.min(1, r.t / r.dur), e = V.ease.outCubic(k), rad = V.lerp(r.r0, r.r1, e);
      g.globalAlpha = 1 - k;
      g.strokeStyle = r.color; g.lineWidth = r.width * (1 - k * 0.5);
      g.beginPath(); g.ellipse(r.x, r.y, rad, rad * r.flat, 0, 0, Math.PI * 2); g.stroke();
      if (k >= 1) rings.splice(i, 1);
    }
    g.globalAlpha = 1;
    if (!parts.length && !rings.length && !orbs.length && !strokes.length && !glows.length) { g.clearRect(0, 0, W, H); dirty = false; shown = false; cv.style.visibility = "hidden"; }
  });
})();
