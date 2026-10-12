/* Camera: zoom in / zoom out over the world. Everything inside .cam layers (the SVG world, plots, buildings,
   movers, points, effects, the bridge Spark) scales and pans together; cards, title and hero line stay on the glass.
   screen = world × s + (x, y). Guests: pinch with two fingers, drag with one finger while zoomed, double-tap to zoom
   in/out, mouse wheel on a laptop. After a quiet spell the view eases back to the whole map. */
(function () {
  const W = 1920, H = 1080, MIN = 1, MAX = 3, IDLE_MS = 10000;
  const C = (V.cam = { s: 1, x: 0, y: 0, locked: false, moving: false });
  const layers = () => document.querySelectorAll(".cam");
  const stageEl = document.getElementById("stage");
  let settleT = null, stopTween = null;

  function clampAll(s, x, y) {
    s = V.clamp(s, MIN, MAX);
    return [s, V.clamp(x, W - W * s, 0), V.clamp(y, H - H * s, 0)];
  }
  function apply(s, x, y) {
    [C.s, C.x, C.y] = clampAll(s, x, y);
    const t = `translate(${C.x.toFixed(2)}px,${C.y.toFixed(2)}px) scale(${C.s.toFixed(4)})`;
    layers().forEach((el) => { el.style.transform = t; });
    stageEl.style.setProperty("--pk", (1 / C.s).toFixed(4)); // points, labels and the Spark keep their size on the glass
    // while moving, keep the cached raster (smooth); once still, let the browser re-draw the vectors sharp at the new zoom
    if (!C.moving) { C.moving = true; document.body.classList.add("cam-moving"); window.dispatchEvent(new Event("cammove")); }
    clearTimeout(settleT);
    settleT = setTimeout(() => { C.moving = false; document.body.classList.remove("cam-moving"); window.dispatchEvent(new Event("camsettle")); }, 160);
  }
  C.toWorld = (sx, sy) => [(sx - C.x) / C.s, (sy - C.y) / C.s];
  C.toScreen = (wx, wy) => [wx * C.s + C.x, wy * C.s + C.y];
  C.zoomed = () => C.s > 1.01;

  // Smooth flight to zoom s centred on world point (wx, wy). Resolves when it lands.
  C.focus = (wx, wy, s, ms) => new Promise((resolve) => {
    stopTween && stopTween();
    const s0 = C.s, x0 = C.x, y0 = C.y;
    const [s1, x1, y1] = clampAll(s, W / 2 - wx * s, H / 2 - wy * s);
    if (Math.abs(s1 - s0) < 0.001 && Math.abs(x1 - x0) < 0.5 && Math.abs(y1 - y0) < 0.5) { resolve(); return; }
    // interpolate in log-scale so the zoom feels even
    stopTween = V.tween(ms || 1100, (k) => {
      const s = Math.exp(V.lerp(Math.log(s0), Math.log(s1), k));
      // keep the path of the screen centre straight while scaling
      const cx0 = (W / 2 - x0) / s0, cy0 = (H / 2 - y0) / s0, cx1 = (W / 2 - x1) / s1, cy1 = (H / 2 - y1) / s1;
      const cx = V.lerp(cx0, cx1, k), cy = V.lerp(cy0, cy1, k);
      apply(s, W / 2 - cx * s, H / 2 - cy * s);
    }, { ease: V.ease.inOutCubic, done: resolve });
  });
  C.reset = (instant, ms) => {
    if (instant) { stopTween && stopTween(); apply(1, 0, 0); return Promise.resolve(); }
    return C.focus(W / 2, H / 2, 1, ms || 900);
  };

  // ---------- guest gestures on the open map (#hit) ----------
  const hit = document.getElementById("hit");
  const ptrs = new Map(); // pointerId → { x, y, x0, y0 } in stage (screen) coords
  let pinch = null, pan = null, lastTap = null, lastActive = V.now();
  const sp = (e) => V.stage.toStage(e.clientX, e.clientY);
  const active = () => !C.locked && !V.editing;

  hit.addEventListener("pointerdown", (e) => {
    lastActive = V.now();
    if (!active()) return;
    const [x, y] = sp(e);
    ptrs.set(e.pointerId, { x, y, x0: x, y0: y });
    try { hit.setPointerCapture(e.pointerId); } catch (err) {}
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      stopTween && stopTween();
      pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: C.s, w: C.toWorld((a.x + b.x) / 2, (a.y + b.y) / 2) };
      pan = null;
    }
    // double tap on the open map: zoom in there, or back out
    if (ptrs.size === 1) {
      const now = V.now();
      if (lastTap && now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 50) {
        lastTap = null;
        const [wx, wy] = C.toWorld(x, y);
        C.zoomed() ? C.reset() : C.focus(wx, wy, 2.2, 700);
      } else lastTap = { t: now, x, y };
    }
  });
  hit.addEventListener("pointermove", (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p || !active()) return;
    lastActive = V.now();
    [p.x, p.y] = sp(e);
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      const s = pinch.s0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const sc = V.clamp(s, MIN, MAX);
      apply(sc, mx - pinch.w[0] * sc, my - pinch.w[1] * sc); // the pinched world point stays under the fingers
    } else if (ptrs.size === 1 && C.zoomed()) {
      if (!pan && Math.hypot(p.x - p.x0, p.y - p.y0) > 10) { stopTween && stopTween(); pan = { x: p.x, y: p.y, cx: C.x, cy: C.y }; lastTap = null; }
      if (pan) apply(C.s, pan.cx + (p.x - pan.x), pan.cy + (p.y - pan.y));
    }
  });
  const up = (e) => { if (!ptrs.delete(e.pointerId)) return; if (ptrs.size < 2) pinch = null; if (ptrs.size === 0) pan = null; };
  hit.addEventListener("pointerup", up);
  hit.addEventListener("pointercancel", up);
  hit.addEventListener("lostpointercapture", up);
  C.isGesturing = () => !!(pinch || pan);

  // laptop: mouse wheel zooms about the cursor
  window.addEventListener("wheel", (e) => {
    if (!active() || e.ctrlKey) return;
    lastActive = V.now();
    const [x, y] = sp(e), [wx, wy] = C.toWorld(x, y);
    const s = V.clamp(C.s * Math.exp(-e.deltaY * 0.0015), MIN, MAX);
    stopTween && stopTween();
    apply(s, x - wx * s, y - wy * s);
  }, { passive: true });

  // any touch anywhere counts as activity; after a quiet spell, ease back to the whole map
  window.addEventListener("pointerdown", () => { lastActive = V.now(); }, true);
  V.loop.add(() => {
    if (C.zoomed() && !C.locked && !V.story.touring && !ptrs.size && V.now() - lastActive > IDLE_MS) { lastActive = V.now(); C.reset(); }
  });
  apply(1, 0, 0);
})();
