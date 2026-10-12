/* The story: chapter cards, chapter effects, headline, title pill, and the self-playing tour. */
(function () {
  const ST = (V.story = {});
  const $ = (id) => document.getElementById(id);
  const chapter = (id) => V.S().chapters.find((c) => c.id === id);
  const two = (n) => String(n).padStart(2, "0");
  const SW = 1920, SH = 1080, MARGIN = 16, CARD_W = 480;
  const MS = 1.5; // landmark moments: size factor (readable from 2 m)
  const TOUR_ZOOM = 1.7; // the self-playing tour flies in this close to each landmark

  // ---------- title pill + headline ----------
  let titleEl, headEl, headTimer = null;
  ST.initHud = () => {
    const hud = $("hud");
    hud.innerHTML = "";
    const t = V.t("title");
    titleEl = V.el("div", "title-pill");
    titleEl.appendChild(V.art.spark({ size: 46 }).el);
    titleEl.insertAdjacentHTML("beforeend",
      `<div class="title-txt"><div class="title-main ${V.lang}" dir="${V.lang === "ar" ? "rtl" : "ltr"}">${V.esc(V.T(t))}</div></div>` +
      `<button class="lang-switch" aria-label="Language"><span class="${V.lang === "en" ? "on" : ""}">EN</span><span class="${V.lang === "ar" ? "on" : ""} ar">ع</span></button>`);
    titleEl.querySelector(".lang-switch").addEventListener("pointerdown", (e) => { e.stopPropagation(); V.audio.tick(); V.setLang(V.lang === "ar" ? "en" : "ar"); });
    hud.appendChild(titleEl);
    const [tx, ty] = V.layout.title;
    titleEl.style.left = tx + "px"; titleEl.style.top = ty + "px";

    const h1 = V.t("headline1"), h2 = V.t("headline2");
    headEl = V.el("div", "headline",
      `<div class="hl-ar" dir="rtl">${V.esc(h1.ar)} ${V.esc(h2.ar)}</div><div class="hl-en">${V.esc(h1.en)} ${V.esc(h2.en)}</div>`);
    hud.appendChild(headEl);
    const [hx, hy] = V.layout.headline;
    headEl.style.left = hx + "px"; headEl.style.top = hy + "px";
    ST.keepHudInView();
  };
  // Title and headline are centred on their anchors; if a cropped window hides part of one, slide it into view.
  ST.keepHudInView = () => {
    const VW = V.stage.view;
    [[titleEl, V.layout.title], [headEl, V.layout.headline]].forEach(([el, a]) => {
      if (!el) return;
      const w = el.offsetWidth, h = el.offsetHeight;
      const x = w + 32 >= VW.w ? (VW.x0 + VW.x1) / 2 : V.clamp(a[0], VW.x0 + w / 2 + 16, VW.x1 - w / 2 - 16);
      const y = V.clamp(a[1], VW.y0 + h / 2 + 12, VW.y1 - h / 2 - 12);
      el.style.left = x + "px"; el.style.top = y + "px";
    });
  };
  window.addEventListener("stagefit", () => { if (!V.editing) ST.keepHudInView(); });
  ST.setTourLook = (on) => titleEl && titleEl.classList.toggle("touring", on);

  // Headline: fades in, holds, fades out (~6 s); the title pill dims while it shows.
  let headStop = null;
  ST.showHeadline = (ms) => {
    ms = ms || 6000;
    clearTimeout(headTimer);
    headStop && headStop();
    const from = +headEl.style.opacity || 0;
    titleEl.classList.add("dim");
    headStop = V.tween(800, (k) => { headEl.style.opacity = V.lerp(from, 1, k); headEl.style.transform = `translate(-50%,-50%) translateY(${(1 - k) * 14}px)`; });
    headTimer = setTimeout(() => {
      headStop = V.tween(1000, (k) => { headEl.style.opacity = 1 - k; }, { done: () => titleEl.classList.remove("dim") });
    }, ms - 1000);
  };

  // ---------- pop-up icons + the Spark drawing itself (DOM effects in #pops) ----------
  function popIcon(name, x, y, delay, big) {
    setTimeout(() => {
      const z = big ? MS : 1;
      const el = V.el("div", "pop-icon", V.art.icon(name, "#FF5100", 34));
      $("pops").appendChild(el);
      V.audio.pop();
      V.tween(2200, (e, k) => {
        const s = (k < 0.18 ? V.ease.outBack(k / 0.18) : 1) * z;
        el.style.transform = `translate(${x - 30}px,${y - 30 - k * 26 * z}px) scale(${s})`;
        el.style.opacity = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      }, { ease: V.ease.linear, done: () => el.remove() });
    }, delay || 0);
  }
  function drawSpark(x, y, size, color) {
    const sp = V.art.spark({ size, stretch: 0, color });
    const el = V.el("div", "pop-spark");
    el.appendChild(sp.el);
    tfAt(el, x, y, size, 1);
    $("pops").appendChild(el);
    const s = [0, 0, 0, 0, 0, 0];
    // arms grow one after another (order around the Spark), then hold, then fade
    V.tween(1300, (e, k) => {
      for (let i = 0; i < 6; i++) s[i] = V.ease.outBack(V.clamp((k - i * 0.09) / 0.46, 0, 1));
      sp.set(s);
    }, { ease: V.ease.linear });
    V.fx.sparkle(x, y, { n: 12, spread: size * 0.45, stagger: 1 });
    setTimeout(() => V.tween(700, (k) => { el.style.opacity = 1 - k; }, { done: () => el.remove() }), 2600);
  }
  function tfAt(el, x, y, size, s) { el.style.transform = `translate(${x - size / 2}px,${y - size / 2}px) scale(${s})`; }

  // ---------- chapter effects (spec §6) ----------
  const P = V.world;
  const above = (x, y, d) => [x, Math.max(80, y - d)];
  const FX = {
    sketch(x, y) { const [ax, ay] = above(x, y, 110); drawSpark(ax, ay, 130); },
    booth(x, y) { V.fx.ring(x, y, { r1: 70 }); V.fx.burst(x, y, { n: 18, speed: 130 }); popIcon("bag", x, y - 60, 150); },
    spark(x, y) { const [ax, ay] = above(x, y, 150); drawSpark(ax, ay, 190); V.fx.burst(ax, ay, { n: 40, speed: 260, size: 6, life: 1.1 }); V.fx.ring(ax, ay, { r1: 140, dur: 900, color: "orange", width: 5, flat: 1 }); },
    products(x, y) { ["home", "bag", "plane", "car", "ticket"].forEach((n, i) => { const a = -Math.PI / 2 + (i - 2) * 0.62; popIcon(n, x + Math.cos(a) * 105, y + Math.sin(a) * 85, i * 140); }); },
    network() {
      (V.layout.paths.egyptStreets || []).forEach((pts, j) => {
        V.fx.orb(pts, { dur: 2300, delay: j * 350, size: 24 });
        pts.forEach((pt, i) => V.fx.ring(pt[0], pt[1], { r1: 34, dur: 700, color: "orange", delay: j * 0.35 + (i / (pts.length - 1)) * 2.3 }));
      });
    },
    cafe(x, y) { V.fx.steam(x, y - 30, { n: 16 }); popIcon("ticket", x, y - 70, 300); },
    bell(x, y) { [0, 450, 900].forEach((d) => setTimeout(() => { V.fx.ring(x, y, { r1: 120, dur: 1100, color: "white", width: 4 }); V.audio.bell(); }, d)); },
    bridge() { return P.bridgePulse(true).then(() => ST.showHeadline()); },
    soft(x, y) { const [ax, ay] = above(x, y, 110); drawSpark(ax, ay, 140, "teal"); V.fx.ring(x, y, { r1: 80 }); V.fx.sparkle(x, y, { n: 10, spread: 70 }); },
    jnetwork() {
      (V.layout.paths.jordanRoads || []).forEach((pts, j) => V.fx.orb(pts, { dur: 2200, delay: j * 300, size: 24 }));
      return P.buildAll(300);
    },
    launch(x, y) {
      const cols = ["orange", "yellow", "white", "teal", "orange"];
      cols.forEach((c, i) => setTimeout(() => { V.fx.firework(x + V.rand(-120, 120), Math.max(70, y - V.rand(40, 150)), c); V.audio.pop(); }, i * 380));
    },
    people() {
      const ready = P.builtCount() < P.plotIds().length ? P.buildAll(150) : Promise.resolve();
      return ready.then(() => {
        const tops = P.buildingTops().sort((a, b) => b.y - a.y).slice(0, 5);
        ["home", "bag", "plane", "car", "ticket"].forEach((n, i) => tops[i] && popIcon(n, tops[i].x, tops[i].y - 40, i * 160));
        P.addCar("#FF5100");
      });
    },
    partners(x, y) {
      [0, 350, 700].forEach((d) => V.fx.ring(x, y, { r1: 90, dur: 900, color: "orange", delay: d / 1000 }));
      const water = V.layout.paths.water || [], roads = V.layout.paths.jordanRoads || [];
      // the water path whose start is nearest the port, then the roads
      const near = water.slice().sort((a, b) => V.dist(a[0], [x, y]) - V.dist(b[0], [x, y]))[0];
      if (near) V.fx.orb(near, { dur: 2400, color: "teal", size: 24 });
      roads.forEach((r, j) => V.fx.orb(r, { dur: 2200, delay: 400 + j * 300, size: 22 }));
      popIcon("bag", x, y - 60, 200);
    },
    beginning() {
      const ready = P.builtCount() < P.plotIds().length ? P.buildAll(150) : Promise.resolve();
      return ready.then(() => Promise.all([P.planeTakeoff(), V.wait(900).then(() => P.twinkle())]));
    },
  };
  // Extra tour time so long effects can finish (ms).
  const TOUR_EXTRA = { bridge: 1400, network: 900, jnetwork: () => 1500 + P.plotIds().length * 300, beginning: 3500 };

  // A chapter with a landmark moment skips its old decorative fx; these fx still run after the moment
  // because they do real work (build Jordan, plane take-off, headline).
  const FUNCTIONAL_FX = { jnetwork: true, beginning: true };
  ST.playFx = (ch) => {
    const c = chapter(ch), pos = P.pointPos(ch), fn = c && FX[c.fx];
    if (!fn || !pos) return Promise.resolve();
    if (c.moment && !FUNCTIONAL_FX[c.fx]) return Promise.resolve();
    try { return Promise.resolve(fn(pos[0], pos[1], c)); } catch (e) { console.error(e); return Promise.resolve(); }
  };

  // ---------- landmark moments (0.8–1.5 s, played on the landmark before the card opens) ----------
  // Every offset in a chapter's `moment` is relative to its point, so moments follow points moved in Edit mode.
  const rel = (x, y, o) => [x + o[0], y + o[1]];
  const MOMENTS = {
    sketch(x, y, m) { // glowing blueprint lines draw over the pyramids
      (m.lines || []).forEach((ln, i) => V.fx.stroke(ln.map((o) => rel(x, y, o)), { draw: 650, delay: i * 140, hold: 600, fade: 400, color: "white", glow: "teal", width: 3 * MS }));
      V.fx.sparkle(x, y - 10, { n: 14, spread: 80 * MS, stagger: 0.9, scale: MS });
      V.audio.chime();
      return 1300;
    },
    booth(x, y, m) { // the booth lights up at the tower base, a phone pops
      const [bx, by] = rel(x, y, m.base || [0, 50]);
      V.fx.glow(bx, by, { r: 60 * MS, color: "gold", alpha: 1, up: 200, hold: 700, fade: 500 });
      V.fx.ring(bx, by, { r1: 70 * MS, dur: 750, color: "orange", width: 6 });
      popIcon("phone", bx, by - 70 * MS, 150, true);
      return 1000;
    },
    rise(x, y, m) { // orange light climbs Cairo Tower from bottom to top
      const a = rel(x, y, m.from || [0, 70]), b = rel(x, y, m.to || [0, -150]);
      V.fx.orb([a, b], { dur: 1000, size: 30 * MS, color: "orange", ease: V.ease.inOutCubic }).then(() => {
        V.fx.glow(b[0], b[1], { r: 55 * MS, color: "orange", alpha: 1, up: 150, hold: 400, fade: 500 });
        V.fx.sparkle(b[0], b[1], { n: 14, spread: 35 * MS, scale: MS });
      });
      V.fx.glow((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { w: 34 * MS, h: Math.abs(a[1] - b[1]) + 30, color: "orange", alpha: 0.7, up: 700, hold: 400, fade: 500 });
      V.audio.whoosh(1.1);
      return 1200;
    },
    lanterns(x, y, m) { // lanterns glow across the bazaar, products pop
      const r = m.r || 70;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + V.rand(-0.3, 0.3), d = r * V.rand(0.35, 1);
        V.fx.glow(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, { r: V.rand(12, 18) * MS, color: i % 2 ? "gold" : "orange", alpha: 1, delay: i * 70, up: 200, hold: 800, fade: 500 });
      }
      ["bag", "home", "ticket", "car"].forEach((n, i) => { const a = -Math.PI / 2 + (i - 1.5) * 0.66; popIcon(n, x + Math.cos(a) * (r + 60), y + Math.sin(a) * (r + 45), 200 + i * 130, true); });
      return 1400;
    },
    nile(x, y, m) { // ripples flow along the Nile, a light crosses Qasr El Nil Bridge
      const nile = V.layout.paths.nile;
      if (nile && nile.length > 1) {
        const path = V.path(nile);
        for (let i = 0; i <= 8; i++) { const p = path.at(i / 8); V.fx.ring(p.x, p.y, { r1: 34 * MS, dur: 850, color: "white", width: 4.5, delay: i * 0.11 }); }
      } else [0, 0.2, 0.4].forEach((d) => V.fx.ring(x, y, { r1: 70 * MS, dur: 900, color: "white", width: 5, delay: d }));
      const br = (m.bridge || [[-70, 12], [70, -12]]).map((o) => rel(x, y, o));
      V.fx.orb(br, { dur: 1000, size: 24 * MS, color: "gold", delay: 250 });
      return 1400;
    },
    cafe(x, y, m) { // steam rises, the café lights come on
      V.fx.steam(x, y - 30, { n: 18 });
      (m.lights || []).forEach((o, i) => { const [lx, ly] = rel(x, y, o); V.fx.glow(lx, ly, { r: 13 * MS, color: "gold", alpha: 1, delay: 150 + i * 110, up: 150, hold: 1000, fade: 500 }); });
      return 1200;
    },
    bell(x, y) { // bell ring + ring shape + confetti
      V.audio.bell();
      V.fx.ring(x, y, { r1: 110 * MS, dur: 950, color: "white", width: 6 });
      V.fx.ring(x, y, { r1: 150 * MS, dur: 1150, color: "orange", width: 5, delay: 0.25 });
      setTimeout(() => V.fx.confetti(x, y - 30, { n: 40 }), 200);
      return 1200;
    },
    bridge() { // the bridge pulse, then the headline
      P.bridgePulse(true).then(() => ST.showHeadline());
      return 1200;
    },
    network() { // network lines join the plots (Jordan then builds, via the chapter's fx)
      const cs = V.layout.plots.map((pl) => V.centroid(pl.poly)).sort((a, b) => a[0] - b[0]);
      const edges = [];
      cs.forEach((c, i) => {
        const near = cs.map((d, j) => [j, V.dist(c, d)]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 2);
        near.forEach(([j]) => { const k = i < j ? i + "-" + j : j + "-" + i; if (!edges.includes(k)) edges.push(k); });
      });
      edges.slice(0, 14).forEach((k, n) => { const [i, j] = k.split("-").map(Number); V.fx.stroke([cs[i], cs[j]], { draw: 380, delay: n * 60, hold: 800, fade: 400, color: "white", glow: "orange", width: 2.5 * MS }); });
      cs.forEach((c, i) => V.fx.glow(c[0], c[1], { r: 16 * MS, color: "orange", alpha: 1, delay: i * 60, up: 150, hold: 900, fade: 400 }));
      return 1300;
    },
    towers(x, y, m) { // the Abdali towers light up orange
      (m.towers || []).forEach(([dx, dy, h], i) => {
        const bx = x + dx, by = y + dy;
        V.fx.glow(bx, by - h / 2, { w: 40 * MS, h: h + 30, color: "orange", alpha: 1, delay: i * 180, up: 500, hold: 700, fade: 500 });
        V.fx.orb([[bx, by], [bx, by - h]], { dur: 700, delay: i * 180, size: 20 * MS, color: "orange" });
      });
      return 1300;
    },
    citadel(x, y, m) { // the citadel columns glow, then fireworks over Amman
      (m.columns || []).forEach(([dx, dy, h], i) => V.fx.glow(x + dx, y + dy - h / 2, { w: 22 * MS, h: h + 24, color: "gold", alpha: 1, delay: i * 90, up: 300, hold: 800, fade: 500 }));
      const fy = Math.max(70, y + (m.fireworksDy || -150));
      ["orange", "yellow", "white", "teal"].forEach((c, i) => setTimeout(() => { V.fx.firework(x + V.rand(-120, 120), fy + V.rand(-30, 30), c, MS); V.audio.pop(); }, 650 + i * 260));
      return 1500;
    },
  };
  // Plays the chapter's moment; returns how long to wait before opening its card (0 = no moment).
  ST.playMoment = (ch) => {
    const c = chapter(ch), pos = P.pointPos(ch), fn = c && c.moment && MOMENTS[c.moment.type];
    if (!fn || !pos) return 0;
    try { return fn(pos[0], pos[1], c.moment) || 0; } catch (e) { console.error(e); return 0; }
  };

  // ---------- cards ----------
  const open = new Map(); // chapterId → { el, timer, tour }
  const TABLE_SCALES = [1, 0.85, 0.72]; // how far cards shrink on a very busy table
  let tableScale = 1;

  // Pick a spot that never covers its own point, covers no other point if any candidate can manage
  // that (on a shared table a covered point is a point someone can't reach), then stays clear of
  // other open cards and the title/headline, then has the most room.
  function placeCard(ch, px, py, w, h, rot) {
    const VW = V.stage.view, X0 = VW.x0 + MARGIN, Y0 = VW.y0 + MARGIN, X1 = VW.x1 - MARGIN, Y1 = VW.y1 - MARGIN;
    const vertical = rot === 90 || rot === 270;
    const bw = vertical ? h : w, bh = vertical ? w : h; // on-screen box after rotation
    const gap = 40;
    // each side, centred on the point or slid along it (so a second card can sit beside the first)
    const cands = [];
    [py - bh / 2, py - bh + 70, py - 70].forEach((y, i) => {
      cands.push({ side: "r", x: px + gap, y, room: VW.x1 - px, slide: i });
      cands.push({ side: "l", x: px - gap - bw, y, room: px - VW.x0, slide: i });
    });
    [px - bw / 2, px - bw + 70, px - 70].forEach((x, i) => {
      cands.push({ side: "b", x, y: py + gap, room: VW.y1 - py, slide: i });
      cands.push({ side: "t", x, y: py - gap - bh, room: py - VW.y0, slide: i });
    });
    const cardsOpen = [...open.values()].map((o) => o.box).filter(Boolean); // other guests' cards
    const soft = []; // title pill and hero line: avoid when possible
    const rectOf = (el) => { const r = el.getBoundingClientRect(), a = V.stage.toStage(r.left, r.top), b = V.stage.toStage(r.right, r.bottom); return { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1] }; };
    if (titleEl) soft.push(rectOf(titleEl));
    // the hero line may still be fading out — or is about to appear (chapter 08 shows it right after its card)
    if (headEl && (+headEl.style.opacity > 0.05 || ch === 8)) { const r = rectOf(headEl); soft.push(r.w ? r : { x: V.layout.headline[0] - 600, y: V.layout.headline[1] - 75, w: 1200, h: 150 }); }
    const overlap = (A, B) => Math.max(0, Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x)) * Math.max(0, Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y));
    const sum = (list, b) => list.reduce((s, a) => s + overlap(b, a), 0);
    const coversOwn = (b) => px > b.x - 30 && px < b.x + b.w + 30 && py > b.y - 30 && py < b.y + b.h + 30;
    const others = V.layout.points.filter((p) => p.chapter !== ch).map((p) => { const [x, y] = V.cam.toScreen(p.x, p.y); return { x, y }; });
    const covers = (b) => others.filter((p) => p.x > b.x - 29 && p.x < b.x + b.w + 29 && p.y > b.y - 29 && p.y < b.y + b.h + 29).length;
    // Priority on a shared table: never hide another guest's card; then cover no other point
    // (a covered point is still tappable through the card); then keep clear of title and hero line.
    const K = (b) => { const c = sum(cardsOpen, b); return (c > 0 ? 1e13 + c : 0) + covers(b) * 1e9 + sum(soft, b) * 10; };
    let best = null;
    cands.forEach((c) => {
      const box = { x: V.clamp(c.x, X0, X1 - bw), y: V.clamp(c.y, Y0, Y1 - bh), w: bw, h: bh };
      const fits = c.room >= (c.side === "l" || c.side === "r" ? bw + gap : bh + gap);
      const score = (coversOwn(box) ? -1e15 : 0) - K(box) + (fits ? 0 : -1e6) + c.room - c.slide * 40;
      if (!best || score > best.score) best = { box, score, side: c.side };
    });
    // Nothing clean right beside the point? Search a wider grid, closest acceptable box first
    // (the connector line shows whose card it is).
    const edgeGap = (b) => Math.hypot(Math.max(b.x - px, 0, px - (b.x + b.w)), Math.max(b.y - py, 0, py - (b.y + b.h)));
    const search = (radius) => {
      let bestKey = K(best.box) + edgeGap(best.box), bestBox = best.box;
      for (let x = X0; x <= X1 - bw; x += 20) {
        for (let y = Y0; y <= Y1 - bh; y += 20) {
          const b = { x, y, w: bw, h: bh }, g = edgeGap(b);
          if (g > radius || coversOwn(b)) continue;
          const k = K(b) + g;
          if (k < bestKey) { bestKey = k; bestBox = b; }
        }
      }
      best.box = bestBox;
    };
    if (K(best.box) > 0) search(320);
    if (K(best.box) >= 1e9) search(600);
    if (K(best.box) > 0) search(1200);
    // Fine-tune: nudge up to 80 px if that strictly improves it, staying on screen and off its own point.
    if (K(best.box) > 0) {
      const steps = [0, 20, -20, 40, -40, 60, -60, 80, -80];
      const offs = [];
      steps.forEach((dx) => steps.forEach((dy) => offs.push([dx, dy])));
      offs.sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - Math.abs(b[0]) - Math.abs(b[1]));
      let bestKey = K(best.box), bestBox = best.box;
      for (const [dx, dy] of offs) {
        const b = { x: best.box.x + dx, y: best.box.y + dy, w: bw, h: bh };
        const onScreen = b.x >= X0 && b.y >= Y0 && b.x + bw <= X1 && b.y + bh <= Y1;
        if (!onScreen || coversOwn(b)) continue;
        const k = K(b);
        if (k < bestKey) { bestKey = k; bestBox = b; if (k === 0) break; }
      }
      best.box = bestBox;
    }
    best.key = K(best.box);
    return best;
  }

  // Landmark close-ups (assets/closeups/chNN.jpg, cut by scripts/make-closeups.mjs), preloaded so a card never pops in empty.
  // ---------- card media: photo / video / animated orbit of icons / animated Spark / mini map ----------
  const mediaSrc = (c) => (c.media && c.media.src) || `assets/media/ch${two(c.id)}.jpg`;
  V.S().chapters.forEach((c) => { if (!c.media || c.media.type === "image" || c.media.type === "map") { const im = new Image(); im.src = mediaSrc(c); } });
  // photos are shown whole: each has its own height (config/media.js, made by scripts/build-media.py)
  function mediaH(c) {
    const m = c.media || {}, h = m.h || (m.type === "image" && (window.VALU_MEDIA || {})[m.src]);
    return h ? ` style="height:${h}px"` : "";
  }
  // ---------- chapter 08 "Beyond Borders": a plane flies Cairo → Amman over a small map (real outlines, config/globe.js) ----------
  // The map is drawn once on a canvas; the plane, its shadow, the trail dots and the landing ring move by transform/opacity only.
  const FLIGHT_DOTS = 16, CAIRO = [31.24, 30.04], AMMAN = [35.93, 31.95], MH = CARD_W / 2;
  const PLANE_SVG = '<svg viewBox="-24 -24 48 48" width="48" height="48"><path d="M22 0c0-1.7-1.6-2.6-3.6-2.6H6.5L-5.5-19.5h-4.6l6.4 17.1h-9.7l-3.8-5.2h-3.4l2.6 7.6-2.6 7.6h3.4l3.8-5.2h9.7l-6.4 17.1h4.6L6.5 2.6h11.9C20.4 2.6 22 1.7 22 0z" fill="currentColor"/></svg>';
  function startFlight(box, el) {
    const G = window.VALU_GLOBE, cv = box.querySelector("canvas"), g = cv.getContext("2d");
    const k = Math.min(2, V.stage.scale * (window.devicePixelRatio || 1));
    cv.width = Math.round(CARD_W * k); cv.height = Math.round(MH * k); g.setTransform(k, 0, 0, k, 0, 0);
    const proj = d3.geoMercator().fitExtent([[28, 34], [CARD_W - 28, MH - 22]], { type: "MultiPoint", coordinates: [[27.5, 26.5], [39.5, 33.4]] });
    const path = d3.geoPath(proj, g);
    const sea = g.createLinearGradient(0, 0, 0, MH); sea.addColorStop(0, "#9FE3DC"); sea.addColorStop(1, "#5CC6C0");
    g.fillStyle = sea; g.fillRect(0, 0, CARD_W, MH);
    g.beginPath(); path(d3.geoGraticule().step([2, 2])()); g.strokeStyle = "rgba(255,255,255,.22)"; g.lineWidth = 1; g.stroke();
    g.beginPath(); path(G.land); g.fillStyle = "#F4E6C8"; g.fill(); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1; g.stroke();
    g.beginPath(); path(G.egypt); g.fillStyle = "#FBD7B4"; g.fill(); g.strokeStyle = "#FF8A4C"; g.lineWidth = 1.4; g.stroke();
    g.beginPath(); path(G.jordan); g.fillStyle = "#FFB27E"; g.fill(); g.strokeStyle = "#FF5100"; g.lineWidth = 1.6; g.stroke();
    // the route: a gentle arc lifted above the straight line, so it reads as a flight
    const a = proj(CAIRO), b = proj(AMMAN), lift = 0.32 * Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ctrl = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - lift];
    const at = (t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1]];
    const dir = (t) => Math.atan2(2 * (1 - t) * (ctrl[1] - a[1]) + 2 * t * (b[1] - ctrl[1]), 2 * (1 - t) * (ctrl[0] - a[0]) + 2 * t * (b[0] - ctrl[0])) * 180 / Math.PI;
    g.beginPath(); for (let i = 0; i <= 40; i++) { const p = at(i / 40); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
    g.setLineDash([3, 6]); g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 1.6; g.stroke(); g.setLineDash([]);
    [a, b].forEach((p) => { g.beginPath(); g.arc(p[0], p[1], 6.5, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.beginPath(); g.arc(p[0], p[1], 4, 0, Math.PI * 2); g.fillStyle = "#FF5100"; g.fill(); });
    // city tags, trail dots, landing ring
    const tagEg = box.querySelector(".f-tag.eg"), tagJo = box.querySelector(".f-tag.jo");
    tagEg.style.transform = `translate(${a[0]}px,${a[1] + 12}px) translateX(-50%)`;
    tagJo.style.transform = `translate(${b[0]}px,${b[1] + 12}px) translateX(-50%)`;
    const dots = [...box.querySelectorAll(".f-dot")].map((d, i) => { const t = (i + 1) / (FLIGHT_DOTS + 1), p = at(t); d.style.transform = `translate(${p[0]}px,${p[1]}px)`; return { d, t }; });
    const ring = box.querySelector(".f-ring"), plane = box.querySelector(".f-plane"), shadow = box.querySelector(".f-shadow");
    const T = 5600, t0 = V.now();
    const run = () => {
      if (!el.isConnected) { V.loop.remove(run); return; }
      const u = ((V.now() - t0) % T) / 1000; // seconds into the loop
      const f = Math.min(1, Math.max(0, (u - 0.6) / 3.2)), t = V.ease.inOutCubic(f); // 0.6 s on the ground, 3.2 s in the air
      const p = at(t), alt = Math.sin(Math.PI * t), r = dir(Math.min(0.999, Math.max(0.001, t)));
      const fade = u < 0.3 ? u / 0.3 : u > 5.0 ? Math.max(0, 1 - (u - 5.0) / 0.5) : 1;
      plane.style.transform = `translate(${p[0]}px,${p[1] - alt * 14}px) rotate(${r}deg) scale(${0.62 + 0.28 * alt})`;
      shadow.style.transform = `translate(${p[0] + alt * 10}px,${p[1] + alt * 8}px) rotate(${r}deg) scale(${0.58 + 0.12 * alt})`;
      plane.style.opacity = fade; shadow.style.opacity = fade * (0.12 + 0.12 * alt);
      dots.forEach((o) => { o.d.style.opacity = fade * (t >= o.t ? 1 : 0); });
      const q = Math.min(1, Math.max(0, (u - 3.8) / 1.0)); // touch-down pulse at Amman
      ring.style.transform = `translate(${b[0]}px,${b[1]}px) scale(${0.4 + 2.2 * q})`; ring.style.opacity = q > 0 && q < 1 ? 1 - q : 0;
    };
    run(); V.loop.add(run);
  }
  // ---------- chapter 03 "The Ripple Effect": the Spark in the middle, every category icon orbiting it ----------
  // Icons are the 18 official category icons (brand guidelines §4.3, vector). They travel on a wide oval, evenly spaced
  // along its length (so they never bunch up at the ends), a little bigger in front and smaller behind.
  const CATS_RX = 188, CATS_RY = 106, CATS_LAP = 26000; // oval radii (px) and ms per full lap
  function startCats(box, el, m) {
    const H = m.h || CARD_W / 2, cx = CARD_W / 2, cy = H / 2;
    const sp = V.art.spark({ size: 88, color: "orange" }); box.querySelector(".c-core").appendChild(sp.el);
    // arc-length table so equal steps along the oval are equal distances on screen
    const N = 720, len = [0]; let prev = [cx + CATS_RX, cy];
    for (let i = 1; i <= N; i++) { const t = (i / N) * Math.PI * 2, p = [cx + CATS_RX * Math.cos(t), cy + CATS_RY * Math.sin(t)]; len.push(len[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1])); prev = p; }
    const total = len[N];
    const angleAt = (u) => { const target = u * total; let lo = 0, hi = N; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (len[mid] < target) lo = mid; else hi = mid; } const f = (target - len[lo]) / (len[hi] - len[lo] || 1); return ((lo + f) / N) * Math.PI * 2; };
    const icos = [...box.querySelectorAll(".c-ico")], n = icos.length, t0 = V.now();
    const run = () => {
      if (!el.isConnected) { V.loop.remove(run); return; }
      const t = (V.now() - t0) / 1000;
      sp.set(1 + 0.05 * Math.sin(t * 2.2));
      const base = ((V.now() - t0) % CATS_LAP) / CATS_LAP;
      icos.forEach((ic, i) => {
        const a = angleAt((base + i / n) % 1), x = cx + CATS_RX * Math.cos(a), y = cy + CATS_RY * Math.sin(a);
        const depth = (Math.sin(a) + 1) / 2; // 0 = back (top), 1 = front (bottom)
        ic.style.transform = `translate(${x}px,${y}px) scale(${0.76 + 0.32 * depth})`;
        ic.style.opacity = 0.72 + 0.28 * depth;
      });
    };
    run(); V.loop.add(run);
  }
  // ---------- chapter 05 "Beyond BNPL": every Valu product logo, one after another (like a GIF) ----------
  // Logos come from the brand guidelines (page 4, brand architecture), upscaled and cut out with transparent backgrounds.
  // Each logo gets the same visual weight (equal area, capped), pops in, holds, drifts out; dots show the progress.
  const LOGO_AREA = 15000, LOGO_MAXW = 330, LOGO_MAXH = 120, LOGO_STEP = 1300;
  function logoSize(w, h) {
    const a = w / h; let dw = Math.sqrt(LOGO_AREA * a), dh = dw / a;
    if (dw > LOGO_MAXW) { dw = LOGO_MAXW; dh = dw / a; }
    if (dh > LOGO_MAXH) { dh = LOGO_MAXH; dw = dh * a; }
    return [Math.round(dw), Math.round(dh)];
  }
  function startLogos(box, el) {
    const imgs = [...box.querySelectorAll("img")], dots = [...box.querySelectorAll(".l-dots i")], n = imgs.length, t0 = V.now();
    const run = () => {
      if (!el.isConnected) { V.loop.remove(run); return; }
      const t = (V.now() - t0) / LOGO_STEP, cur = Math.floor(t) % n, f = t - Math.floor(t);
      imgs.forEach((im, i) => {
        let o = 0, y = 0, s = 1;
        if (i === cur) { const q = Math.min(1, f / 0.28), e = V.ease.outBack(q); o = Math.min(1, q * 1.4); s = 0.82 + 0.18 * e; y = (1 - e) * 14;
          if (f > 0.8) { const r = (f - 0.8) / 0.2; o *= 1 - r; y = -10 * r; s *= 1 + 0.04 * r; } }
        im.style.opacity = o; im.style.transform = `translate(0,${y}px) scale(${s})`;
      });
      dots.forEach((d, i) => { d.style.opacity = i === cur ? 1 : 0.3; });
    };
    run(); V.loop.add(run);
  }
  function mediaHTML(c) {
    const m = c.media || { type: "image" };
    if (m.type === "video") return `<video src="${m.src}" muted autoplay loop playsinline preload="auto"></video>`;
    if (m.type === "orbit") {
      const n = m.icons.length;
      return `<div class="m-orbit"><div class="m-ring">${m.icons.map((ic, i) => `<span class="m-ico" style="--a:${(i * 360) / n}deg"><i>${V.art.icon(ic, "#FF5100", 30)}</i></span>`).join("")}</div><div class="m-core"></div></div>`;
    }
    if (m.type === "spark") return `<div class="m-spark"></div>`;
    if (m.type === "categories") { const H = m.h || CARD_W / 2;
      return `<div class="m-cats"><svg class="c-path" width="${CARD_W}" height="${H}"><ellipse cx="${CARD_W / 2}" cy="${H / 2}" rx="${CATS_RX}" ry="${CATS_RY}"/></svg>${m.icons.map((n) => `<span class="c-ico"><i><img src="${m.dir}${n}.svg" alt="" draggable="false"></i></span>`).join("")}<div class="c-core"></div></div>`; }
    if (m.type === "logos") return `<div class="m-logos">${m.items.map(([n, w, h]) => { const [dw, dh] = logoSize(w, h); return `<img src="${m.dir}${n}.png" alt="" draggable="false" style="width:${dw}px;height:${dh}px;margin:${-dh / 2}px 0 0 ${-dw / 2}px">`; }).join("")}<div class="l-dots">${m.items.map(() => "<i></i>").join("")}</div></div>`;
    if (m.type === "flight") return `<div class="m-flight"><canvas></canvas>${Array.from({ length: FLIGHT_DOTS }, () => '<i class="f-dot"></i>').join("")}<span class="f-ring"></span><span class="f-shadow">${PLANE_SVG}</span><span class="f-plane">${PLANE_SVG}</span><span class="f-tag eg">${V.esc(V.T(V.t("egypt")))}</span><span class="f-tag jo">${V.esc(V.T(V.t("jordan")))}</span></div>`;
    if (m.type === "map") return `<div class="m-map"><img src="${mediaSrc(c)}" alt="" draggable="false"><span class="m-orb"></span><span class="m-tag eg">${V.esc(V.T(V.t("egypt")))}</span><span class="m-tag jo">${V.esc(V.T(V.t("jordan")))}</span></div>`;
    return `<img src="${mediaSrc(c)}" alt="" draggable="false">`;
  }
  // animated media run on the shared loop while their card is on the table
  function startMedia(el, c) {
    const m = c.media || {};
    if (m.type === "orbit") el.querySelector(".m-core").appendChild(V.art.spark({ size: 70, color: "orange" }).el);
    if (m.type === "spark") {
      const sp = V.art.spark({ size: 150, color: "orange" });
      el.querySelector(".m-spark").appendChild(sp.el);
      const t0 = V.now();
      const run = () => { if (!el.isConnected) { V.loop.remove(run); return; }
        const t = (V.now() - t0) / 1000; sp.set(1 + 0.07 * Math.sin(t * 2.4) * Math.min(1, t)); }; // gentle breathing: the official Spark is never pulled apart
      V.loop.add(run);
    }
    if (m.type === "flight") startFlight(el.querySelector(".m-flight"), el);
    if (m.type === "logos") startLogos(el.querySelector(".m-logos"), el);
    if (m.type === "categories") startCats(el.querySelector(".m-cats"), el, m);
    if (m.type === "map") {
      const orb = el.querySelector(".m-orb"); const t0 = V.now();
      const pts = [[0.23, 0.53], [0.4, 0.5], [0.6, 0.5], [0.73, 0.52], [0.9, 0.38]]; const path = V.path(pts);
      const run = () => { if (!el.isConnected) { V.loop.remove(run); return; }
        const p = path.at(((V.now() - t0) / 2600) % 1); orb.style.transform = `translate(${p.x * CARD_W}px,${p.y * (CARD_W / 2)}px)`; };
      V.loop.add(run);
    }
  }

  ST.isOpen = (ch) => open.has(ch);
  ST.openCard = (ch, opt) => {
    opt = opt || {};
    const c = chapter(ch), wpos = P.pointPos(ch);
    if (!c || !wpos) return;
    const pos = V.cam.toScreen(wpos[0], wpos[1]); // cards sit on the glass, beside where the point is on screen now
    if (open.has(ch)) ST.closeCard(ch, true);
    const L = V.lang, rtl = L === "ar";
    const el = V.el("div", `card edge-${c.side} ${L}`);
    el.dir = rtl ? "rtl" : "ltr";
    el.dataset.ch = ch;
    let lead = V.T(c.lead) || "";
    const body = V.T(c.body) || "";
    if (lead && body.startsWith(lead.replace(/[.؟!]\s*$/, ""))) lead = ""; // the deck's text already starts with it
    el.innerHTML =
      `<div class="card-media"${mediaH(c)}>${mediaHTML(c)}<span class="card-badge"></span></div>` +
      `<button class="card-x" aria-label="Close"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>` +
      `<div class="card-text">` +
      `<div class="card-title">${V.esc(V.T(c.title))}</div>` +
      // (no location line under the title: removed 12 Oct at the client's request)
      (lead ? `<div class="card-lead">${V.esc(lead)}</div>` : "") +
      `<div class="card-body">${V.esc(body)}</div></div>`;
    el.querySelector(".card-badge").appendChild(V.art.spark({ size: 30 }).el);
    startMedia(el, c);
    el.style.width = CARD_W + "px";
    el.style.opacity = 0;
    $("cards").appendChild(el);
    let w = el.offsetWidth, h = el.offsetHeight; // layout size, unaffected by the stage scale
    const rot = opt.upright ? 0 : opt.touch ? V.stage.edgeRot(opt.touch[0], opt.touch[1]) : 0;
    const place = () => placeCard(ch, pos[0], pos[1], w * tableScale, h * tableScale, rot);
    let pl = place();
    // A busy table: cards never land on each other. Each step only runs if the one before still overlaps:
    //  1. this card opens compact (text only)   2. the open cards fold to compact too
    //  3. every card on the table shrinks a step (85 %, then 72 %), each around its own centre
    //  4. last resort: the oldest card closes, until the new one has its own spot
    if (pl.key >= 1e13 && [...open.keys()].some((k) => k !== ch)) {
      el.classList.add("compact");
      const w0 = w, h0 = h; w = el.offsetWidth; h = el.offsetHeight;
      const pl2 = place();
      if (pl2.key < pl.key) pl = pl2; else { el.classList.remove("compact"); w = w0; h = h0; }
      if (pl.key >= 1e13) {
        open.forEach((o) => { if (o.ch !== ch) fold(o); });
        el.classList.add("compact"); w = el.offsetWidth; h = el.offsetHeight; pl = place();
      }
      for (let i = TABLE_SCALES.indexOf(tableScale) + 1; pl.key >= 1e13 && i < TABLE_SCALES.length; i++) {
        tableScale = TABLE_SCALES[i];
        open.forEach((o) => { if (o.ch !== ch) refit(o); });
        pl = place();
      }
      while (pl.key >= 1e13) {
        const oldest = [...open.keys()].find((k) => k !== ch);
        if (oldest == null) break;
        ST.closeCard(oldest);
        pl = place();
      }
    }
    // Rotate/scale around the card's centre, then put that centre in the middle of the chosen box.
    const cx = pl.box.x + pl.box.w / 2, cy = pl.box.y + pl.box.h / 2;
    const st = { base: `translate(${cx - w / 2}px,${cy - h / 2}px) rotate(${rot}deg) scale(${tableScale})` }; // fold()/refit() may change it
    const link = makeLink(pos[0], pos[1], pl.box);
    V.tween(420, (k) => {
      el.style.opacity = Math.min(1, k * 1.6);
      el.style.transform = `${st.base} scale(${0.92 + 0.08 * k})`;
      if (rec.link) rec.link.style.opacity = Math.min(1, k * 1.6);
    }, { ease: V.ease.outBack });
    // On a shared table a card never closes by accident: only its X, its own point, or the timeout close it.
    // A tap on the card body that lands on another (hidden) point opens that point's card instead.
    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target.closest(".card-x")) { V.audio.tick(); ST.closeCard(ch); return; }
      restartTimer(rec); // someone is reading it: start the countdown again
      const [x, y] = V.cam.toWorld(...V.stage.toStage(e.clientX, e.clientY));
      const under = P.hitPoint(x, y, ch);
      if (under) ST.tapChapter(under, [x, y]);
    });
    const rec = { ch, el, link, st, rot, box: pl.box, tour: !!opt.tour, ms: opt.ms || V.set().cardSec * 1000, timer: null };
    restartTimer(rec);
    open.set(ch, rec);
    P.setActive(ch, true);
    if (!opt.silent) V.audio.chime();
    return rec;
  };
  ST.closeCard = (ch, instant) => {
    const rec = open.get(ch);
    if (!rec) return;
    open.delete(ch);
    if (!open.size) tableScale = 1; // an empty table starts again at full size
    clearTimeout(rec.timer);
    P.setActive(ch, false);
    const el = rec.el, link = rec.link;
    if (instant) { el.remove(); if (link) link.remove(); return; }
    const t0 = el.style.transform;
    V.tween(260, (k) => {
      el.style.opacity = 1 - k;
      el.style.transform = `${t0} translateY(${k * 8}px)`;
      if (link) link.style.opacity = 1 - k;
    }, { done: () => { el.remove(); if (link) link.remove(); } });
  };
  // Fold an open card to compact (picture hidden) around its own centre, so a crowded table makes room.
  function fold(rec) {
    if (rec.el.classList.contains("compact")) return;
    rec.el.classList.add("compact");
    refit(rec);
  }
  // Re-size an open card's box to its current size × the table scale, keeping its centre where it is.
  function refit(rec) {
    const w = rec.el.offsetWidth, h = rec.el.offsetHeight, vertical = rec.rot % 180 !== 0;
    const b = rec.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2, bw = (vertical ? h : w) * tableScale, bh = (vertical ? w : h) * tableScale;
    rec.box = { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
    rec.st.base = `translate(${cx - w / 2}px,${cy - h / 2}px) rotate(${rec.rot}deg) scale(${tableScale})`;
    rec.el.style.transform = rec.st.base;
    if (rec.link) rec.link.remove();
    const wp = P.pointPos(rec.ch), sp = wp ? V.cam.toScreen(wp[0], wp[1]) : [0, 0]; // the point's spot on screen now
    rec.link = makeLink(sp[0], sp[1], rec.box);
    if (rec.link) rec.link.style.opacity = 1;
  }
  function restartTimer(rec) {
    clearTimeout(rec.timer);
    rec.timer = setTimeout(() => { if (open.get(rec.ch) === rec) ST.closeCard(rec.ch); }, rec.ms);
  }

  // Connector: when a card had to sit away from its point (centre > 180 px), a thin orange line runs
  // from the point's rim (small dot) to the nearest card edge. Lives in #links: above labels, under cards.
  const LINK_MIN = 180, LINK_PAD = 8;
  function makeLink(px, py, box) {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    if (Math.hypot(cx - px, cy - py) <= LINK_MIN) return null;
    const ex = V.clamp(px, box.x, box.x + box.w), ey = V.clamp(py, box.y, box.y + box.h); // nearest card edge
    const len = Math.hypot(ex - px, ey - py);
    if (len - 27 < 30) return null; // card right beside its point: a stub would just be clutter
    const ux = (ex - px) / len, uy = (ey - py) / len;
    const sx = px + ux * 27, sy = py + uy * 27; // start on the point's rim, just outside the white border
    const x0 = Math.min(sx, ex) - LINK_PAD, y0 = Math.min(sy, ey) - LINK_PAD;
    const svg = V.svg("svg", { width: Math.abs(ex - sx) + LINK_PAD * 2, height: Math.abs(ey - sy) + LINK_PAD * 2, class: "card-link" });
    svg.innerHTML = `<line x1="${sx - x0}" y1="${sy - y0}" x2="${ex - x0}" y2="${ey - y0}" stroke="#FF5100" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="${sx - x0}" cy="${sy - y0}" r="4" fill="#FF5100"/>`;
    svg.style.transform = `translate(${x0}px,${y0}px)`;
    svg.style.opacity = 0;
    $("links").appendChild(svg);
    return svg;
  }
  // The camera moved: connector lines fade out while it moves and are redrawn to the points' new screen spots.
  window.addEventListener("cammove", () => open.forEach((r) => { if (r.link) r.link.style.opacity = 0; }));
  window.addEventListener("camsettle", () => open.forEach((r, ch) => {
    if (r.link) r.link.remove();
    const w = P.pointPos(ch); if (!w) return;
    const [sx, sy] = V.cam.toScreen(w[0], w[1]);
    r.link = (sx > -20 && sx < 1940 && sy > -20 && sy < 1100) ? makeLink(sx, sy, r.box) : null;
    if (r.link) V.tween(250, (k) => { r.link.style.opacity = k; });
  }));
  ST.closeAll = () => [...open.keys()].forEach((ch) => ST.closeCard(ch, true));
  ST.closeTourCards = () => [...open.entries()].forEach(([ch, r]) => r.tour && ST.closeCard(ch));

  // A guest tap on a chapter: toggle its card. A landmark moment plays first (instant feedback),
  // then the card opens and the chapter's fx runs.
  const pending = new Map(); // chapter → timer while its moment plays
  ST.tapChapter = (ch, touch) => {
    if (open.has(ch) && !open.get(ch).tour) { V.audio.tick(); ST.closeCard(ch); return; }
    if (pending.has(ch)) return; // its moment is already playing
    P.setActive(ch, true);
    const wait = ST.playMoment(ch);
    const go = () => { pending.delete(ch); if (V.editing) { P.setActive(ch, false); return; } ST.openCard(ch, { touch }); ST.playFx(ch); };
    if (wait) pending.set(ch, setTimeout(go, wait)); else go();
  };
  ST.cancelPending = () => { pending.forEach((t, ch) => { clearTimeout(t); P.setActive(ch, false); }); pending.clear(); };

  // ---------- the self-playing tour ----------
  let token = 0;
  ST.touring = false;
  ST.startTour = async () => {
    if (ST.touring || V.editing) return;
    const my = ++token;
    ST.touring = true; ST.setTourLook(true);
    const alive = () => my === token;
    const sleep = async (ms) => { const end = V.now() + ms; while (V.now() < end) { if (!alive()) return false; await V.wait(Math.min(100, end - V.now())); } return alive(); };
    let loopN = 0;
    while (alive()) {
      if (V.set().jordanResetOnTour && !P.isEmpty()) { P.clearAll(); }
      V.tourState = "loop start";
      V.setLang(loopN++ % 2 ? "ar" : "en"); // each loop alternates English / Arabic (no start screen)
      if (!(await sleep(600))) break;
      for (const c of V.S().chapters) {
        if (!alive()) break;
        if (!P.pointPos(c.id)) continue; // unplaced chapter
        V.tourState = "chapter " + two(c.id);
        { const w = P.pointPos(c.id), wide = c.id === 8; // the bridge: whole map
          await (wide ? V.cam.reset(false, 1100) : V.cam.focus(w[0], w[1] + 30, TOUR_ZOOM, 1300));
          if (!alive()) break; }
        if (c.id === 8 && V.bridgeDrag && V.bridgeDrag.ready()) {
          // the tour drags the Spark across the bridge itself, with a faint ghost-finger dot
          await V.bridgeDrag.auto(alive);
          if (!alive()) break;
          ST.openCard(c.id, { upright: true, tour: true, ms: 60000 });
        } else {
          P.setActive(c.id, true);
          const wait = ST.playMoment(c.id);
          if (wait && !(await sleep(wait))) break;
          ST.openCard(c.id, { upright: true, tour: true, ms: 60000 });
          ST.playFx(c.id);
        }
        const extra = typeof TOUR_EXTRA[c.fx] === "function" ? TOUR_EXTRA[c.fx]() : TOUR_EXTRA[c.fx] || 0;
        if (!(await sleep(V.set().tourCardSec * 1000 + extra))) break;
        ST.closeCard(c.id);
        if (!(await sleep(450))) break;
      }
      if (!alive()) break;
      V.tourState = "loop pause";
      await V.cam.reset(false, 1200);
      if (!alive()) break;
      ST.showHeadline(5200); // the hero line closes every loop
      if (!(await sleep(5600))) break;
    }
  };
  ST.stopTour = () => {
    if (!ST.touring) return;
    token++;
    ST.touring = false; ST.setTourLook(false);
    V.tourState = "off";
    ST.closeTourCards();
  };
})();
