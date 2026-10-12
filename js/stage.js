/* Fixed 1920×1080 stage, scaled with one transform. settings.fit = "cover" (default) fills the whole
   screen (a non-16:9 window crops a thin strip at the edges; the 16:9 board shows everything);
   "contain" shows the whole map with teal bars. Also: client→stage coordinates, gesture blocking.
   S.view = the part of the stage that is on screen; screen-pinned UI and cards stay inside it. */
(function () {
  const W = 1920, H = 1080;
  const el = document.getElementById("stage");
  const S = (V.stage = { W, H, el, scale: 1, ox: 0, oy: 0, view: { x0: 0, y0: 0, x1: W, y1: H, w: W, h: H } });

  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const cover = (V.set().fit || "cover") !== "contain";
    S.scale = cover ? Math.max(vw / W, vh / H) : Math.min(vw / W, vh / H);
    // Whole-pixel offsets keep text and image edges crisp.
    S.ox = Math.round((vw - W * S.scale) / 2);
    S.oy = Math.round((vh - H * S.scale) / 2);
    el.style.transform = `translate(${S.ox}px, ${S.oy}px) scale(${S.scale})`;
    const x0 = Math.max(0, -S.ox / S.scale), y0 = Math.max(0, -S.oy / S.scale);
    const x1 = Math.min(W, (vw - S.ox) / S.scale), y1 = Math.min(H, (vh - S.oy) / S.scale);
    S.view = { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
    [["--vx0", x0], ["--vy0", y0], ["--vx1", x1], ["--vy1", y1]].forEach(([k, v]) => el.style.setProperty(k, v.toFixed(1) + "px"));
    window.dispatchEvent(new Event("stagefit"));
  }
  // Window (client) coords → stage coords
  S.toStage = (cx, cy) => [(cx - S.ox) / S.scale, (cy - S.oy) / S.scale];
  // Rotation (deg) that makes content readable from the table edge nearest a stage point,
  // limited to the edges guests stand at (settings.cardEdges): bottom 0, left 90, top 180, right 270.
  S.edgeRot = (x, y) => {
    const allowed = V.set().cardEdges || ["bottom"];
    const v = S.view;
    const d = [[v.y1 - y, 0, "bottom"], [x - v.x0, 90, "left"], [y - v.y0, 180, "top"], [v.x1 - x, 270, "right"]]
      .filter((e) => allowed.includes(e[2]))
      .sort((a, b) => a[0] - b[0]);
    return d.length ? d[0][1] : 0;
  };
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", () => setTimeout(fit, 200));
  fit();

  // Block pinch / double-tap zoom, long-press menus and callouts, text selection, scroll bounce.
  const block = (e) => e.preventDefault();
  ["contextmenu", "selectstart", "dragstart", "gesturestart", "dblclick"].forEach((ev) => document.addEventListener(ev, block));
  document.addEventListener("touchmove", block, { passive: false });
  document.addEventListener("touchstart", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
})();
