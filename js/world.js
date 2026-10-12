/* The world: story points + labels + landmark glows, Jordan plots + rising buildings,
   movers (cars, boats, plane), bridge pulse and twinkles. Everything in 1920×1080 stage space. */
(function () {
  const W = (V.world = {});
  const L = () => V.layout;
  const $ = (id) => document.getElementById(id);
  const chapter = (id) => V.S().chapters.find((c) => c.id === id);
  const two = (n) => String(n).padStart(2, "0");
  const tf = (el, s) => { el.style.transform = s; };

  // ---------- glow polygons (one small SVG each, so fading one never repaints the others) ----------
  const glows = {}; // chapterId → svg element
  function makeGlow(p) {
    if (!p.glow || p.glow.length < 3) return;
    const pad = 30, b = V.bbox(p.glow);
    const svg = V.svg("svg", { width: b.w + pad * 2, height: b.h + pad * 2, class: "glow" });
    const id = "gb" + p.chapter;
    svg.innerHTML = `<defs><filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter></defs>` +
      `<polygon points="${V.polyToSvg(p.glow.map(([x, y]) => [x - b.x + pad, y - b.y + pad]))}" fill="rgba(255,170,60,.55)" filter="url(#${id})"/>` +
      `<polygon points="${V.polyToSvg(p.glow.map(([x, y]) => [x - b.x + pad, y - b.y + pad]))}" fill="none" stroke="#FFE3A8" stroke-width="3" stroke-dasharray="10 8" stroke-linejoin="round"/>`;
    tf(svg, `translate(${b.x - pad}px,${b.y - pad}px)`);
    $("overlay").appendChild(svg);
    glows[p.chapter] = svg;
  }

  // ---------- story points + label pills ----------
  const points = {}; // chapterId → { def, el }
  function makePoint(p) {
    const c = chapter(p.chapter);
    if (!c) return;
    const el = V.el("div", "pt side-" + (p.side || "r") + (c.side === "bridge" ? " inv" : ""));
    el.innerHTML = `<div class="pt-in"><div class="pt-ring"></div><div class="pt-dot">${two(c.id)}</div>` +
      `<div class="pt-label"><span class="lb" dir="${V.lang === "ar" ? "rtl" : "ltr"}">${V.esc(V.T(c.title))}</span></div></div>`;
    tf(el, `translate(${p.x}px,${p.y}px)`);
    $("labels").appendChild(el);
    points[p.chapter] = { def: p, el, label: el.querySelector(".pt-label") };
  }
  W.point = (ch) => points[ch];
  W.relabel = () => { for (const ch in points) { const c = chapter(+ch); points[ch].label.innerHTML = `<span class="lb" dir="${V.lang === "ar" ? "rtl" : "ltr"}">${V.esc(V.T(c.title))}</span>`; } };
  W.pointPos = (ch) => (points[ch] ? [points[ch].def.x, points[ch].def.y] : null);
  W.setActive = (ch, on) => {
    if (points[ch]) points[ch].el.classList.toggle("on", on);
    if (glows[ch]) glows[ch].classList.toggle("on", on);
  };

  // Nearest point within 48 px (optionally ignoring one chapter): used for taps that land on a card.
  W.hitPoint = (x, y, except) => {
    let best = null, bd = 48 / V.cam.s; // 48 px on the glass, whatever the zoom
    for (const ch in points) {
      if (+ch === except) continue;
      const d = V.dist([x, y], [points[ch].def.x, points[ch].def.y]);
      if (d <= bd) { bd = d; best = +ch; }
    }
    return best;
  };
  // Tap routing: nearest point within 48 px, then its label pill, then the smallest glow polygon.
  W.hit = (x, y) => {
    let best = null, bd = 48 / V.cam.s; // 48 px on the glass, whatever the zoom
    for (const ch in points) {
      const d = V.dist([x, y], [points[ch].def.x, points[ch].def.y]);
      if (d <= bd) { bd = d; best = +ch; }
    }
    if (best) return best;
    for (const ch in points) {
      const r = points[ch].label.getBoundingClientRect();
      const a = V.cam.toWorld(...V.stage.toStage(r.left, r.top)), b = V.cam.toWorld(...V.stage.toStage(r.right, r.bottom));
      if (x >= a[0] - 6 && x <= b[0] + 6 && y >= a[1] - 6 && y <= b[1] + 6) return +ch;
    }
    let area = Infinity;
    L().points.forEach((p) => {
      if (p.glow && p.glow.length > 2 && V.inPoly(x, y, p.glow)) {
        const ar = V.polyArea(p.glow);
        if (ar < area) { area = ar; best = p.chapter; }
      }
    });
    return best;
  };

  // ---------- plots + buildings ----------
  const plots = {}; // id → { def, outline, bld, built }
  function plotGeom(def) {
    const b = V.bbox(def.poly);
    return { cx: b.x + b.w / 2, maxY: b.y + b.h, w: b.w, b };
  }
  function makePlot(def) {
    const g = plotGeom(def), pad = 6;
    const svg = V.svg("svg", { width: g.b.w + pad * 2, height: g.b.h + pad * 2, class: "plot-outline" });
    svg.innerHTML = `<polygon points="${V.polyToSvg(def.poly.map(([x, y]) => [x - g.b.x + pad, y - g.b.y + pad]))}" fill="none" stroke="#FFC46B" stroke-width="2.5" stroke-linejoin="round"/>`;
    tf(svg, `translate(${g.b.x - pad}px,${g.b.y - pad}px)`);
    $("overlay").appendChild(svg);
    plots[def.id] = { def, outline: svg, bld: null, built: false };
  }
  function buildingBox(def) {
    const g = plotGeom(def), s = (window.VALU_SPRITES || {})[def.id];
    if (s && s.src) {
      const k = g.w / (s.pw || g.w), w = s.w * k, h = s.h * k;
      return { x: g.cx - w / 2 + (s.ox || 0) * k, y: g.maxY - h + (s.oy || 0) * k, w, h, src: s.src };
    }
    const w = g.w * 1.05, h = w * 0.9;
    return { x: g.cx - w / 2, y: g.maxY - 4 - h, w, h, src: null };
  }

  W.plotIds = () => Object.keys(plots);
  W.builtCount = () => Object.values(plots).filter((p) => p.built).length;
  W.isEmpty = () => W.builtCount() === 0;

  // Building rise: dust + ring at the plot, the building slides up out of its footprint with a small scale-up.
  W.build = (id, opt) => {
    opt = opt || {};
    const p = plots[id];
    if (!p || p.built) return Promise.resolve();
    p.built = true;
    const box = buildingBox(p.def), g = plotGeom(p.def);
    const wrap = V.el("div", "bld");
    Object.assign(wrap.style, { width: box.w + "px", height: box.h + "px", zIndex: Math.round(box.y + box.h) });
    const inner = V.el("div", "bld-in", box.src ? `<img src="${box.src}" alt="" draggable="false">` : V.art.building());
    wrap.appendChild(inner);
    $("buildings").appendChild(wrap);
    p.bld = wrap;
    const base = `translate(${box.x}px,${box.y}px)`;
    tf(wrap, base + " scale(.9)"); wrap.style.opacity = 0;
    tf(inner, `translateY(${box.h}px)`);
    p.outline.classList.add("built");
    V.fx.burst(g.cx, g.maxY - 6, { n: 24, color: ["gold", "yellow", "gold", "white"], speed: 130, flat: 0.5, up: 34, size: 6, life: 0.75 }); // golden dust
    V.fx.ring(g.cx, g.maxY - 8, { r1: g.w * 0.75, dur: 650, color: "white", width: 3 });
    opt.quiet ? V.audio.tick() : V.audio.build();
    return new Promise((resolve) => {
      V.tween(160, (k) => { wrap.style.opacity = k; });
      V.tween(900, (k) => {
        tf(inner, `translateY(${(1 - k) * box.h}px)`);
        tf(wrap, `${base} scale(${0.9 + 0.1 * k})`);
      }, { ease: V.ease.outBack, done: () => {
        tf(inner, "none"); tf(wrap, base);
        V.fx.sparkle(box.x + box.w / 2, box.y + box.h * 0.15, { n: 6, spread: box.w * 0.3 });
        if (opt.quiet) V.audio.tick();
        resolve();
      } });
    });
  };
  // Build every empty plot, one by one.
  W.buildAll = (gapMs) => {
    const ids = Object.keys(plots).filter((id) => !plots[id].built);
    ids.sort((a, b) => plotGeom(plots[a].def).maxY - plotGeom(plots[b].def).maxY); // back to front
    return Promise.all(ids.map((id, i) => V.wait(i * (gapMs == null ? 300 : gapMs)).then(() => W.build(id, { quiet: i > 0 }))));
  };
  W.clearAll = () => {
    Object.values(plots).forEach((p) => {
      if (!p.built) return;
      p.built = false;
      const el = p.bld; p.bld = null;
      p.outline.classList.remove("built");
      V.tween(600, (k) => { el.style.opacity = 1 - k; }, { done: () => el.remove() });
    });
    W.removeExtraCars();
  };
  W.buildingTops = () => Object.values(plots).filter((p) => p.built && p.bld).map((p) => {
    const b = buildingBox(p.def); return { x: b.x + b.w / 2, y: b.y + b.h * 0.2, w: b.w, def: p.def };
  });
  W.twinkle = () => W.buildingTops().forEach((t, i) => setTimeout(() => V.fx.sparkle(t.x, t.y, { n: 5, spread: t.w * 0.35, scale: 0.9 }), i * 90));

  // ---------- movers ----------
  const movers = [];
  // Place an element on a path, rotated along it but mirrored so it never drives upside down.
  function pose(m, x, y, a, extra) {
    const left = Math.cos(a) < 0;
    const rot = left ? a - Math.PI : a;
    const s = m.scale * hopK(m);
    m.px = x; m.py = y;
    tf(m.el, `translate(${x}px,${y}px) rotate(${(rot * 180) / Math.PI}deg) scale(${(left ? -1 : 1) * s},${s}) translate(${-m.w / 2}px,${-m.h * 0.85}px)${extra || ""}`);
  }
  // A quick hop when touched: scale 1 → 1.15 → 1 over 320 ms (transform only).
  function hopK(m) {
    if (!m.hopAt) return 1;
    const k = (V.now() - m.hopAt) / 320;
    if (k >= 1) { m.hopAt = 0; return 1; }
    return 1 + 0.15 * Math.sin(Math.PI * k);
  }
  let plane = null; // the plane while it is taking off (touchable too)
  // The car, boat or plane under a stage point, if any.
  W.moverAt = (x, y) => {
    let best = null, bd = Infinity;
    const all = plane ? movers.concat([plane]) : movers;
    all.forEach((m) => {
      if (m.px == null || (m.alpha != null && m.alpha < 0.3)) return;
      const cy = m.py - m.h * 0.35 * m.scale, r = (m.kind === "plane" ? 46 : 28) * m.scale, d = Math.hypot(x - m.px, y - cy);
      if (d <= r && d < bd) { bd = d; best = m; }
    });
    return best;
  };
  W.hop = (m) => { m.hopAt = V.now(); };
  W.movers = () => movers.slice(); // read-only list (tests, debug)
  function addMover(kind, pts, o) {
    o = o || {};
    const el = V.el("div", "mover " + kind, kind === "boat" ? V.art.boat() : V.art.car(o.color));
    $("movers").appendChild(el);
    const path = V.path(pts);
    const m = { kind, el, path, w: kind === "boat" ? 40 : 44, h: kind === "boat" ? 40 : 24, scale: o.scale || 1,
      t: o.t != null ? o.t : Math.random(), dir: Math.random() < 0.5 ? 1 : -1, speed: o.speed || 40, state: "run",
      wait: 0, alpha: 0, rotate: kind !== "boat", phase: Math.random() * 6, extra: !!o.extra };
    movers.push(m);
    return m;
  }
  W.removeExtraCars = () => {
    for (let i = movers.length - 1; i >= 0; i--) if (movers[i].extra) { const m = movers.splice(i, 1)[0]; V.tween(500, (k) => { m.el.style.opacity = 1 - k; }, { done: () => m.el.remove() }); }
  };
  W.addCar = (color) => {
    const roads = L().paths.jordanRoads || [];
    if (!roads.length) return;
    const m = addMover("car", roads[(Math.random() * roads.length) | 0], { color, t: 0.02, speed: 55, extra: true });
    m.dir = 1;
  };
  V.loop.add((dt, now) => {
    movers.forEach((m) => {
      if (m.state === "wait") {
        m.wait -= dt;
        if (m.wait <= 0) { m.state = "run"; m.dir *= -1; }
        return;
      }
      m.t += (m.dir * m.speed * dt) / Math.max(1, m.path.len);
      const edge = m.dir > 0 ? 1 - m.t : m.t; // distance to the end we're heading for (0..1)
      const fadeLen = 40 / Math.max(1, m.path.len);
      m.alpha = V.clamp(Math.min(edge, m.dir > 0 ? m.t : 1 - m.t) / fadeLen, 0, 1);
      if (edge <= 0) { m.t = V.clamp(m.t, 0, 1); m.state = "wait"; m.wait = V.rand(1, 4); m.alpha = 0; }
      const p = m.path.at(m.t);
      const a = m.rotate ? (m.dir > 0 ? p.a : p.a + Math.PI) : (m.dir > 0 ? 0 : Math.PI);
      const bob = m.kind === "boat" ? ` translateY(${Math.sin(now / 700 + m.phase) * 1.5}px)` : "";
      pose(m, p.x, p.y, a, bob);
      m.el.style.opacity = m.alpha;
    });
  });

  // The plane, used only by chapter 14: takes off along the runway, scales up and fades out.
  W.planeTakeoff = () => {
    const pts = L().paths.runway;
    if (!pts || pts.length < 2) return Promise.resolve();
    const el = V.el("div", "mover plane", V.art.plane());
    $("movers").appendChild(el);
    const m = { kind: "plane", el, w: 96, h: 48, scale: 0.7, alpha: 0 }, path = V.path(pts);
    plane = m;
    return new Promise((resolve) => V.tween(3600, (k) => {
      const p = path.at(k);
      m.scale = 0.7 + k * 1.1;
      pose(m, p.x, p.y, p.a);
      m.alpha = k < 0.1 ? k / 0.1 : k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1;
      el.style.opacity = m.alpha;
    }, { ease: (x) => x * x, done: () => { el.remove(); if (plane === m) plane = null; resolve(); } }));
  };

  // Jordan's lights fade up (when the bridge Spark arrives): warm glows over the plots, buildings and Jordan points.
  W.jordanLights = () => {
    const spots = L().plots.map((pl) => V.centroid(pl.poly))
      .concat(L().points.filter((p) => chapter(p.chapter) && chapter(p.chapter).side === "jordan").map((p) => [p.x, p.y + 18]));
    spots.forEach(([x, y], i) => V.fx.glow(x, y, { r: V.rand(26, 38), color: i % 3 ? "gold" : "orange", alpha: 0.7, delay: 120 + i * 70, up: 600, hold: 1400, fade: 900 }));
    W.twinkle();
  };

  // ---------- bridge pulse ----------
  W.bridgePulse = (big) => {
    const pts = L().paths.bridge;
    if (!pts || pts.length < 2) return Promise.resolve();
    V.audio.whoosh(big ? 2.2 : 1.6);
    if (big) V.fx.ring(pts[0][0], pts[0][1], { r1: 90, dur: 800, color: "orange", width: 5 });
    return V.fx.orb(pts, { dur: big ? 2400 : 2000, size: big ? 46 : 28, color: big ? "orange" : "gold" }).then(() => {
      const end = pts[pts.length - 1];
      V.fx.ring(end[0], end[1], { r1: big ? 110 : 60, dur: 800, color: "orange", width: big ? 5 : 3 });
      V.fx.sparkle(end[0], end[1], { n: big ? 14 : 6, spread: 40 });
      W.twinkle();
    });
  };

  // ---------- build everything from the layout ----------
  W.init = () => {
    ["overlay", "labels", "buildings", "movers"].forEach((id) => { $(id).innerHTML = ""; });
    for (const k in points) delete points[k];
    for (const k in glows) delete glows[k];
    for (const k in plots) delete plots[k];
    movers.length = 0;
    const lay = L();
    lay.points.forEach((p) => { makeGlow(p); makePoint(p); });
    lay.plots.forEach(makePlot);
    (lay.paths.jordanRoads || []).forEach((road, i) => {
      addMover("car", road, { t: 0.2 + i * 0.3, speed: V.rand(38, 50) });
      addMover("car", road, { t: 0.7, speed: V.rand(34, 44), color: "#f4f1ec" });
    });
    (lay.paths.water || []).slice(0, 3).forEach((w) => addMover("boat", w, { speed: V.rand(10, 16), scale: 0.9 }));
  };
})();
