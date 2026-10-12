/* Edit mode (spec §8): place, move and re-assign story points, glow areas, plots, paths, title and
   headline by touch or mouse. Every change saves to localStorage at once; Export gives layout.js text.
   While editing, a full-stage surface takes every touch, so nothing reaches the cards or the tour. */
(function () {
  const E = (V.editor = { preview: false });
  const KEY = "valu-story-layout-v1";
  const $ = (id) => document.getElementById(id);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const R = Math.round;
  const two = (n) => String(n).padStart(2, "0");
  const chapter = (id) => V.S().chapters.find((c) => c.id === id);
  const BUILDINGS = ["shop", "villa", "house", "house2", "block1", "block2"];
  const PATHS = {
    bridge: { name: "Bridge path", single: true, color: "#FFB347" },
    jordanRoads: { name: "Jordan road", single: false, color: "#ffffff" },
    egyptStreets: { name: "Egypt street", single: false, color: "#FCE200" },
    water: { name: "Water path", single: false, color: "#95D4E9" },
    runway: { name: "Runway", single: true, color: "#8347AD" },
    nile: { name: "Nile", single: true, color: "#2f8fd8" },
  };

  // ---------- load / normalise / save ----------
  function normalize(l) {
    if (!l || typeof l !== "object" || !Array.isArray(l.points) || !Array.isArray(l.plots)) return null;
    l.paths = l.paths || {};
    ["jordanRoads", "egyptStreets", "water"].forEach((k) => { if (!Array.isArray(l.paths[k])) l.paths[k] = []; });
    ["bridge", "runway", "nile"].forEach((k) => { if (!Array.isArray(l.paths[k])) l.paths[k] = []; });
    l.points.forEach((p) => { p.side = p.side || "r"; p.glow = Array.isArray(p.glow) ? p.glow : []; });
    l.title = l.title || [820, 62];
    l.headline = l.headline || [815, 255];
    return l;
  }
  V.loadLayout = () => {
    let saved = null;
    try { const s = localStorage.getItem(KEY); if (s) saved = normalize(JSON.parse(s)); } catch (e) { saved = null; }
    V.layoutSource = saved ? "saved on this device" : "config/layout.js";
    return saved || normalize(clone(window.VALU_LAYOUT));
  };
  function save() {
    V.layout.savedAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(V.layout)); V.layoutSource = "saved on this device"; toast("Saved ✓"); }
    catch (e) { toast("Could not save on this device: use Export", true); }
  }

  // Rebuild the live world from V.layout (points, glows, plots, movers, title, headline).
  V.applyLayout = () => { V.story.cancelPending(); V.story.closeAll(); V.world.init(); V.story.initHud(); V.bridgeDrag && V.bridgeDrag.reset(); };

  // ---------- undo ----------
  const undoStack = [];
  const snapshot = () => { const s = clone(V.layout); delete s.savedAt; return s; };
  function begin() { undoStack.push(snapshot()); if (undoStack.length > 100) undoStack.shift(); }
  function finish(applyWorld) { save(); if (applyWorld !== false) V.applyLayout(); render(); }
  E.undo = () => {
    if (tool) { cancelTool(); return; }
    const s = undoStack.pop();
    if (!s) { toast("Nothing to undo"); return; }
    V.layout = normalize(s);
    if (sel && !selTarget()) sel = null;
    finish();
    toast("Undone");
  };

  // ---------- export ----------
  E.layoutText = () => {
    const l = snapshot();
    let json = JSON.stringify(l, null, 2);
    json = json.replace(/\[\s+(-?\d+(?:\.\d+)?),\s+(-?\d+(?:\.\d+)?)\s+\]/g, "[$1,$2]");                       // [x,y] on one line
    json = json.replace(/\[\s*((?:\[-?[\d.]+,-?[\d.]+\],?\s*)+)\]/g, (m, inner) => "[" + inner.replace(/\s+/g, "") + "]"); // pair lists on one line
    return "// Positions on the world, in 1920×1080 stage coordinates.\n" +
      "// Exported from Edit mode on " + new Date().toISOString().slice(0, 16).replace("T", " ") + ". Replace config/layout.js with this file.\n" +
      "// side: label position (l/r/t/b) · glow: landmark glow polygon · plots: building = shop/villa/house/house2/block1/block2\n" +
      "window.VALU_LAYOUT = " + json + ";\n";
  };

  // ---------- DOM ----------
  const root = $("editor");
  root.innerHTML = `
    <svg class="ed-svg" viewBox="0 0 1920 1080" width="1920" height="1080"></svg>
    <div class="ed-surface"></div>
    <div class="ed-bar">
      <span class="ed-name">✎ Edit mode</span>
      <button data-a="addpoint">+ Add point</button>
      <button data-a="plot">+ Plot</button>
      <span class="ed-sep"></span>
      <button data-a="path" data-k="bridge">Bridge</button>
      <button data-a="path" data-k="jordanRoads">+ Road</button>
      <button data-a="path" data-k="egyptStreets">+ Street</button>
      <button data-a="path" data-k="water">+ Water</button>
      <button data-a="path" data-k="runway">Runway</button>
      <button data-a="path" data-k="nile">Nile</button>
      <span class="ed-sep"></span>
      <button data-a="preview">Preview: OFF</button>
      <button data-a="undo">↶ Undo</button>
      <button data-a="export">Export</button>
      <button data-a="reset">Reset to file</button>
      <button data-a="dock" title="Move this bar to the other edge">⇅</button>
      <button data-a="exit" class="ed-exit">Exit</button>
    </div>
    <div class="ed-hint"><span class="ed-hint-txt"></span><button data-a="done">Done</button><button data-a="cancel">Cancel</button></div>
    <div class="ed-panel"></div>
    <div class="ed-modal"></div>
    <div class="ed-toast"></div>`;
  const svg = root.querySelector(".ed-svg"), surface = root.querySelector(".ed-surface");
  const bar = root.querySelector(".ed-bar"), hint = root.querySelector(".ed-hint"), hintTxt = root.querySelector(".ed-hint-txt");
  const panel = root.querySelector(".ed-panel"), modal = root.querySelector(".ed-modal"), toastEl = root.querySelector(".ed-toast");
  // UI pieces must not leak touches to the surface or the world.
  [bar, hint, panel, modal].forEach((el) => el.addEventListener("pointerdown", (e) => e.stopPropagation()));

  let toastT = null;
  function toast(msg, warn) {
    toastEl.textContent = msg;
    toastEl.classList.toggle("warn", !!warn);
    toastEl.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("show"), warn ? 4000 : 1400);
  }

  // ---------- enter / exit ----------
  E.enter = () => {
    if (V.editing) return;
    V.story.stopTour();
    V.story.cancelPending();
    V.story.closeAll();
    V.intro.hide(); V.cam.reset(true); V.cam.locked = true; // Edit mode always works on the whole, un-zoomed map
    V.admin && V.admin.close();
    V.editing = true;
    document.body.classList.add("editing");
    sel = null; tool = null;
    render();
    toast("Edit mode: drag points, corners and path dots");
  };
  E.exit = () => {
    if (!V.editing) return;
    cancelTool();
    V.editing = false;
    V.cam.locked = false;
    document.body.classList.remove("editing");
    modal.classList.remove("open");
    V.applyLayout();
    V.lastTouch = V.now();
  };
  E.toggle = () => (V.editing ? E.exit() : E.enter());

  // ---------- selection + tools ----------
  let sel = null;  // {type:'point', ch} | {type:'plot', id} | {type:'path', key, i} | {type:'anchor', key}
  let tool = null; // {kind:'place', ch} | {kind:'glow', ch, pts} | {kind:'plot', pts} | {kind:'path', key, pts}
  const pointOf = (ch) => V.layout.points.find((p) => p.chapter === ch);
  const plotOf = (id) => V.layout.plots.find((p) => p.id === id);
  const pathRef = (key, i) => (PATHS[key].single ? V.layout.paths[key] : V.layout.paths[key][i]);
  function selTarget() {
    if (!sel) return null;
    if (sel.type === "point") return pointOf(sel.ch);
    if (sel.type === "plot") return plotOf(sel.id);
    if (sel.type === "path") { const p = pathRef(sel.key, sel.i); return p && p.length ? p : null; }
    if (sel.type === "anchor") return V.layout[sel.key];
    return null;
  }
  function setTool(t) { tool = t; render(); }
  function cancelTool() { tool = null; render(); }
  function finishTool() {
    if (!tool) return;
    const t = tool;
    if (t.kind === "glow") {
      if (t.pts.length < 3) { toast("A glow area needs at least 3 corners", true); return; }
      begin(); pointOf(t.ch).glow = t.pts; tool = null; sel = { type: "point", ch: t.ch }; finish();
    } else if (t.kind === "path") {
      if (t.pts.length < 2) { toast("A path needs at least 2 points", true); return; }
      begin();
      if (PATHS[t.key].single) { V.layout.paths[t.key] = t.pts; sel = { type: "path", key: t.key, i: -1 }; }
      else { V.layout.paths[t.key].push(t.pts); sel = { type: "path", key: t.key, i: V.layout.paths[t.key].length - 1 }; }
      tool = null; finish();
    } else { tool = null; render(); }
  }
  function nextPlotId() {
    const used = new Set(V.layout.plots.map((p) => p.id));
    for (let c = 65; c <= 90; c++) if (!used.has(String.fromCharCode(c))) return String.fromCharCode(c);
    let n = 1; while (used.has("P" + n)) n++;
    return "P" + n;
  }

  // ---------- hit testing (stage coords; generous radii so handles are ≥ 44 px to a finger) ----------
  const near = (a, x, y, r) => Math.hypot(a[0] - x, a[1] - y) <= r;
  function nearestIdx(arr, x, y, r) {
    let best = -1, bd = r;
    arr.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d <= bd) { bd = d; best = i; } });
    return best;
  }
  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    const t = V.clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, 0, 1);
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }
  function allPaths() {
    const out = [];
    for (const key in PATHS) {
      if (PATHS[key].single) { if (V.layout.paths[key].length) out.push({ key, i: -1, pts: V.layout.paths[key] }); }
      else V.layout.paths[key].forEach((pts, i) => out.push({ key, i, pts }));
    }
    return out;
  }
  function hitTest(x, y) {
    const t = selTarget();
    // 1. handles of the current selection
    if (sel && t) {
      if (sel.type === "plot") { const i = nearestIdx(t.poly, x, y, 26); if (i >= 0) return { sel, drag: { kind: "vertex", arr: () => plotOf(sel.id).poly, i } }; }
      if (sel.type === "path") { const i = nearestIdx(t, x, y, 26); if (i >= 0) return { sel, drag: { kind: "vertex", arr: () => pathRef(sel.key, sel.i), i } }; }
      if (sel.type === "point" && t.glow.length) { const i = nearestIdx(t.glow, x, y, 24); if (i >= 0 && !near([t.x, t.y], x, y, 30)) return { sel, drag: { kind: "vertex", arr: () => pointOf(sel.ch).glow, i } }; }
    }
    // 2. title / headline anchors
    for (const key of ["title", "headline"]) if (near(V.layout[key], x, y, 34)) return { sel: { type: "anchor", key }, drag: { kind: "anchor", key } };
    // 3. story points
    let best = null, bd = 32;
    V.layout.points.forEach((p) => { const d = Math.hypot(p.x - x, p.y - y); if (d <= bd) { bd = d; best = p; } });
    if (best) return { sel: { type: "point", ch: best.chapter }, drag: { kind: "point", ch: best.chapter } };
    // 4. any path dot
    for (const p of allPaths()) { const i = nearestIdx(p.pts, x, y, 20); if (i >= 0) return { sel: { type: "path", key: p.key, i: p.i }, drag: { kind: "vertex", arr: () => pathRef(p.key, p.i), i } }; }
    // 5. plots: a corner, or inside (drag moves the whole plot)
    for (const pl of V.layout.plots) { const i = nearestIdx(pl.poly, x, y, 22); if (i >= 0) return { sel: { type: "plot", id: pl.id }, drag: { kind: "vertex", arr: () => plotOf(pl.id).poly, i } }; }
    for (const pl of V.layout.plots) if (V.inPoly(x, y, pl.poly)) return { sel: { type: "plot", id: pl.id }, drag: { kind: "plotmove", id: pl.id } };
    // 6. a path line
    for (const p of allPaths()) for (let k = 1; k < p.pts.length; k++) if (segDist([x, y], p.pts[k - 1], p.pts[k]) < 14) return { sel: { type: "path", key: p.key, i: p.i }, drag: null };
    return { sel: null, drag: null };
  }

  // ---------- pointer handling on the edit surface ----------
  let drag = null; // { id, h, x0, y0, moved, orig }
  surface.addEventListener("pointerdown", (e) => {
    if (!V.editing || drag) return; // one editing finger at a time
    e.stopPropagation();
    const [x, y] = V.stage.toStage(e.clientX, e.clientY).map(R);
    if (tool) {
      if (tool.kind === "place") {
        begin();
        V.layout.points.push({ chapter: tool.ch, x, y, side: x > 1500 ? "l" : "r", glow: [] });
        sel = { type: "point", ch: tool.ch }; tool = null; finish(); V.audio.tick();
        return;
      }
      tool.pts.push([x, y]); V.audio.tick();
      if (tool.kind === "plot" && tool.pts.length === 4) {
        begin();
        const id = nextPlotId();
        V.layout.plots.push({ id, building: "shop", poly: tool.pts });
        tool = null; sel = { type: "plot", id }; finish();
        toast("Plot " + id + " added: pick its building");
      } else render();
      return;
    }
    const h = hitTest(x, y);
    try { surface.setPointerCapture(e.pointerId); } catch (err) {}
    drag = { id: e.pointerId, h, x0: x, y0: y, moved: false, orig: null };
  });
  surface.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id || !drag.h.drag) return;
    const [x, y] = V.stage.toStage(e.clientX, e.clientY);
    const dx = x - drag.x0, dy = y - drag.y0;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 6) return; // a tap, not a drag (yet)
      drag.moved = true;
      begin();
      sel = drag.h.sel;
      const d = drag.h.drag;
      if (d.kind === "point") { const p = pointOf(d.ch); drag.orig = [p.x, p.y]; }
      if (d.kind === "plotmove") drag.orig = clone(plotOf(d.id).poly);
      if (d.kind === "anchor") drag.orig = V.layout[d.key].slice();
    }
    const d = drag.h.drag;
    if (d.kind === "point") {
      const p = pointOf(d.ch);
      p.x = R(drag.orig[0] + dx); p.y = R(drag.orig[1] + dy);
      const live = V.world.point(d.ch);
      if (live) live.el.style.transform = `translate(${p.x}px,${p.y}px)`;
    } else if (d.kind === "vertex") {
      d.arr()[d.i] = [R(x), R(y)];
    } else if (d.kind === "plotmove") {
      plotOf(d.id).poly = drag.orig.map(([px, py]) => [R(px + dx), R(py + dy)]);
    } else if (d.kind === "anchor") {
      V.layout[d.key] = [R(drag.orig[0] + dx), R(drag.orig[1] + dy)];
      const el = document.querySelector(d.key === "title" ? ".title-pill" : ".headline");
      if (el) { el.style.left = V.layout[d.key][0] + "px"; el.style.top = V.layout[d.key][1] + "px"; }
    }
    renderSoon();
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.moved) { finish(); return; }
    // a tap: select (or deselect) without changing anything
    sel = d.h.sel;
    if (sel && sel.type === "point" && E.preview) V.story.playFx(sel.ch);
    if (sel) V.audio.tick();
    render();
  };
  surface.addEventListener("pointerup", endDrag);
  surface.addEventListener("pointercancel", endDrag);

  // ---------- toolbar + panel actions ----------
  let resetArmed = 0;
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !root.contains(b)) return;
    const a = b.dataset.a;
    V.audio.tick();
    if (a === "addpoint") { sel = null; tool = null; render(); showAddList(); return; }
    if (a === "plot") return setTool({ kind: "plot", pts: [] });
    if (a === "path") return setTool({ kind: "path", key: b.dataset.k, pts: [] });
    if (a === "preview") { E.preview = !E.preview; render(); return; }
    if (a === "undo") return E.undo();
    if (a === "export") return openExport();
    if (a === "reset") {
      if (Date.now() - resetArmed > 4000) { resetArmed = Date.now(); b.textContent = "Tap again to discard"; b.classList.add("armed"); setTimeout(() => { b.textContent = "Reset to file"; b.classList.remove("armed"); }, 4000); return; }
      resetArmed = 0; b.textContent = "Reset to file"; b.classList.remove("armed");
      begin();
      try { localStorage.removeItem(KEY); } catch (err) {}
      V.layout = normalize(clone(window.VALU_LAYOUT));
      V.layoutSource = "config/layout.js";
      sel = null; tool = null; V.applyLayout(); render();
      toast("Back to config/layout.js (Undo restores your edits)");
      return;
    }
    if (a === "dock") { root.classList.toggle("dock-bottom"); return; }
    if (a === "exit") return E.exit();
    if (a === "done") return finishTool();
    if (a === "cancel") return cancelTool();
    // panel
    const t = selTarget();
    if (a === "pickch") { setTool({ kind: "place", ch: +b.dataset.ch }); panel.innerHTML = ""; return; }
    if (a === "side" && t) { begin(); t.side = b.dataset.s; finish(); return; }
    if (a === "glow" && t) return setTool({ kind: "glow", ch: sel.ch, pts: [] });
    if (a === "glowclear" && t) { begin(); t.glow = []; finish(); return; }
    if (a === "previewfx" && sel) { V.story.playFx(sel.ch); return; }
    if (a === "removept" && t) { begin(); V.layout.points.splice(V.layout.points.indexOf(t), 1); sel = null; finish(); toast("Point removed: chapter is now unplaced"); return; }
    if (a === "building" && t) { begin(); t.building = b.dataset.b; finish(); return; }
    if (a === "delplot" && t) { begin(); V.layout.plots.splice(V.layout.plots.indexOf(t), 1); sel = null; finish(); return; }
    if (a === "redraw" && sel) return setTool({ kind: "path", key: sel.key, pts: [] });
    if (a === "delpath" && sel) { begin(); if (PATHS[sel.key].single) V.layout.paths[sel.key] = []; else V.layout.paths[sel.key].splice(sel.i, 1); sel = null; finish(); return; }
    if (a === "copy") return copyExport();
    if (a === "download") return downloadExport();
    if (a === "closemodal") { modal.classList.remove("open"); return; }
  });
  panel.addEventListener("change", (e) => {
    if (e.target.dataset.a !== "chapter" || !sel || sel.type !== "point") return;
    const to = +e.target.value, me = pointOf(sel.ch), other = pointOf(to);
    if (to === sel.ch) return;
    begin();
    if (other) other.chapter = sel.ch; // one point = one chapter: the two points swap chapters
    me.chapter = to;
    sel = { type: "point", ch: to };
    finish();
    toast(other ? "Chapters swapped" : "Chapter changed");
  });

  function showAddList() {
    const placed = new Set(V.layout.points.map((p) => p.chapter));
    const free = V.S().chapters.filter((c) => !placed.has(c.id));
    panel.className = "ed-panel open";
    panel.innerHTML = `<h4>Add a point</h4>` + (free.length
      ? `<p>Tap a chapter, then tap the map where it goes.</p><div class="ed-list">${free.map((c) => `<button data-a="pickch" data-ch="${c.id}">${two(c.id)} · ${V.esc(c.title.en)}</button>`).join("")}</div>`
      : `<p>All ${V.S().chapters.length} chapters are on the map. Remove a point first to place it elsewhere.</p>`);
    placePanel([-999, -999]);
  }

  // ---------- export box ----------
  function openExport() {
    const txt = E.layoutText();
    modal.innerHTML = `<h4>Export layout.js</h4>
      <p>Copy this text into <b>config/layout.js</b> on the laptop (replace everything). A download was also started, but Fully Kiosk may block it, so the copy box is the reliable way.</p>
      <textarea readonly spellcheck="false"></textarea>
      <div class="row"><button data-a="copy" class="main">Copy</button><button data-a="download">Download layout.js</button><button data-a="closemodal">Close</button><span class="ed-copied"></span></div>`;
    modal.querySelector("textarea").value = txt;
    modal.classList.add("open");
    downloadExport(true);
  }
  function copyExport() {
    const ta = modal.querySelector("textarea"), note = modal.querySelector(".ed-copied");
    const fallback = () => {
      ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length);
      let ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      note.textContent = ok ? "Copied ✓" : "Text selected: copy it manually";
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => { note.textContent = "Copied ✓"; }, fallback);
    else fallback();
  }
  function downloadExport(quiet) {
    try {
      const blob = new Blob([E.layoutText()], { type: "text/javascript" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "layout.js";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      if (!quiet) toast("Download started");
    } catch (e) { toast("Download blocked: use Copy", true); }
  }

  // ---------- drawing the edit overlay + panel ----------
  let renderQueued = false;
  function renderSoon() { if (!renderQueued) { renderQueued = true; requestAnimationFrame(() => { renderQueued = false; render(); }); } }
  const pts = (a) => a.map((p) => p.join(",")).join(" ");
  const dots = (a, r, fill, stroke) => a.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`).join("");
  const label = (x, y, t, c) => `<text x="${x}" y="${y}" fill="${c || "#fff"}" class="ed-txt">${V.esc(t)}</text>`;

  function render() {
    if (!V.editing) return;
    const L = V.layout;
    let s = "";
    // plots
    L.plots.forEach((pl) => {
      const on = sel && sel.type === "plot" && sel.id === pl.id;
      s += `<polygon points="${pts(pl.poly)}" fill="rgba(255,81,0,${on ? 0.3 : 0.15})" stroke="#FF5100" stroke-width="${on ? 4 : 2.5}" stroke-linejoin="round"/>`;
      const c = V.centroid(pl.poly);
      s += label(c[0] - 8, c[1] + 6, pl.id, "#fff");
      if (on) s += dots(pl.poly, 11, "#fff", "#FF5100");
    });
    // glows
    L.points.forEach((p) => {
      if (!p.glow.length) return;
      const on = sel && sel.type === "point" && sel.ch === p.chapter;
      s += `<polygon points="${pts(p.glow)}" fill="rgba(252,226,0,${on ? 0.22 : 0.08})" stroke="#FCE200" stroke-width="2.5" stroke-dasharray="8 6"/>`;
      if (on) s += dots(p.glow, 10, "#FCE200", "#8a6d00");
    });
    // paths
    allPaths().forEach((p) => {
      const on = sel && sel.type === "path" && sel.key === p.key && sel.i === p.i, c = PATHS[p.key].color;
      s += `<polyline points="${pts(p.pts)}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="${on ? 9 : 6}" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<polyline points="${pts(p.pts)}" fill="none" stroke="${c}" stroke-width="${on ? 5 : 3}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${on ? "none" : "10 7"}"/>`;
      s += dots(p.pts, on ? 11 : 5, on ? "#fff" : c, on ? c : "rgba(0,0,0,.4)");
      s += label(p.pts[0][0] + 10, p.pts[0][1] - 12, PATHS[p.key].name + (PATHS[p.key].single ? "" : " " + (p.i + 1)), c);
    });
    // selected point
    if (sel && sel.type === "point") { const p = pointOf(sel.ch); if (p) s += `<circle cx="${p.x}" cy="${p.y}" r="36" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="9 6"/>`; }
    // title + headline anchors
    ["title", "headline"].forEach((key) => {
      const [x, y] = L[key], on = sel && sel.type === "anchor" && sel.key === key;
      s += `<circle cx="${x}" cy="${y}" r="${on ? 20 : 16}" fill="rgba(0,196,179,.85)" stroke="#fff" stroke-width="3"/><path d="M${x - 9} ${y}h18M${x} ${y - 9}v18" stroke="#fff" stroke-width="3"/>`;
      s += label(x + 24, y + 6, key === "title" ? "TITLE" : "HEADLINE", "#fff");
    });
    // drawing in progress
    if (tool && tool.pts && tool.pts.length) {
      const closed = tool.kind === "glow" || tool.kind === "plot";
      s += closed && tool.pts.length > 2
        ? `<polygon points="${pts(tool.pts)}" fill="rgba(0,196,179,.2)" stroke="#00C4B3" stroke-width="3" stroke-dasharray="8 5"/>`
        : `<polyline points="${pts(tool.pts)}" fill="none" stroke="#00C4B3" stroke-width="4" stroke-linecap="round"/>`;
      s += dots(tool.pts, 10, "#00C4B3", "#fff");
    }
    svg.innerHTML = s;

    // toolbar state
    bar.querySelector('[data-a="preview"]').textContent = "Preview: " + (E.preview ? "ON" : "OFF");
    bar.querySelector('[data-a="preview"]').classList.toggle("on", E.preview);
    bar.querySelector('[data-a="undo"]').disabled = !undoStack.length && !tool;

    // hint line
    const H = {
      place: () => `Tap the map where chapter ${two(tool.ch)} goes`,
      glow: () => `Glow area for ${two(tool.ch)}: tap the corners around the landmark, then Done (${tool.pts.length})`,
      plot: () => `New plot: tap its 4 corners (${tool.pts.length}/4)`,
      path: () => `${PATHS[tool.key].single ? "Redraw the" : "New"} ${PATHS[tool.key].name.toLowerCase()}: tap along it, then Done (${tool.pts.length} points)`,
    };
    root.classList.toggle("drawing", !!tool);
    hintTxt.textContent = tool ? H[tool.kind]() : "Drag points, corners and path dots · tap something to select it";
    hint.querySelector('[data-a="done"]').style.display = tool && tool.kind !== "place" && tool.kind !== "plot" ? "" : "none";
    hint.querySelector('[data-a="cancel"]').style.display = tool ? "" : "none";

    renderPanel();
  }

  function renderPanel() {
    const t = selTarget();
    if (!sel || !t || tool) { if (!panel.querySelector(".ed-list") || tool || sel) { panel.className = "ed-panel"; panel.innerHTML = ""; } return; }
    panel.className = "ed-panel open";
    if (sel.type === "point") {
      const c = chapter(t.chapter), placed = new Set(V.layout.points.map((p) => p.chapter));
      panel.innerHTML = `<h4>Point ${two(c.id)}</h4>
        <label>Chapter</label>
        <select data-a="chapter">${V.S().chapters.map((ch) => `<option value="${ch.id}" ${ch.id === t.chapter ? "selected" : ""}>${two(ch.id)} · ${V.esc(ch.title.en)}${placed.has(ch.id) && ch.id !== t.chapter ? " (swap)" : ""}</option>`).join("")}</select>
        <label>Label side</label>
        <div class="row">${[["l", "←"], ["r", "→"], ["t", "↑"], ["b", "↓"]].map(([k, a]) => `<button data-a="side" data-s="${k}" class="${t.side === k ? "on" : ""}">${a}</button>`).join("")}</div>
        <label>Landmark glow ${t.glow.length ? `(${t.glow.length} corners)` : "(none)"}</label>
        <div class="row"><button data-a="glow">Draw glow area</button><button data-a="glowclear" ${t.glow.length ? "" : "disabled"}>Clear</button></div>
        <div class="row"><button data-a="previewfx">▶ Preview effect</button></div>
        <div class="row"><button data-a="removept" class="danger">Remove from map</button></div>`;
    } else if (sel.type === "plot") {
      panel.innerHTML = `<h4>Plot ${V.esc(t.id)}</h4>
        <label>Building</label>
        <div class="ed-grid">${BUILDINGS.map((b) => `<button data-a="building" data-b="${b}" class="${t.building === b ? "on" : ""}">${b}</button>`).join("")}</div>
        <p class="small">Drag the corners to reshape, or drag inside to move it. After moving plots, export and rerun make-sprites on the laptop (README).</p>
        <div class="row"><button data-a="delplot" class="danger">Delete plot</button></div>`;
    } else if (sel.type === "path") {
      const P = PATHS[sel.key];
      panel.innerHTML = `<h4>${P.name}${P.single ? "" : " " + (sel.i + 1)}</h4>
        <p class="small">${t.length} points. Drag the dots to adjust.</p>
        <div class="row"><button data-a="redraw">${P.single ? "Redraw" : "Draw another"}</button><button data-a="delpath" class="danger">Delete</button></div>`;
    } else if (sel.type === "anchor") {
      panel.innerHTML = `<h4>${sel.key === "title" ? "Title" : "Headline"} position</h4><p class="small">Drag the teal cross to move it.</p>`;
    }
    const sp = sel.type === "point" ? [t.x, t.y] : sel.type === "plot" ? V.centroid(t.poly) : sel.type === "path" ? V.centroid(t) : t;
    placePanel(sp);
  }

  // Put the panel in the screen corner that hides the fewest story points, and never the selection.
  function placePanel(selPos) {
    const w = panel.offsetWidth, h = panel.offsetHeight, m = 16, VW = V.stage.view;
    const bottomDock = root.classList.contains("dock-bottom");
    const top = VW.y0 + (bottomDock ? m : 130), bottom = VW.y1 - h - (bottomDock ? 130 : m);
    const spots = [[VW.x0 + m, bottom], [VW.x1 - w - m, bottom], [VW.x0 + m, top], [VW.x1 - w - m, top]];
    let best = null;
    spots.forEach(([x, y]) => {
      const inside = (p) => p[0] > x - 30 && p[0] < x + w + 30 && p[1] > y - 30 && p[1] < y + h + 30;
      const score = V.layout.points.filter((p) => inside([p.x, p.y])).length * 10 + (inside(selPos) ? 1000 : 0);
      if (!best || score < best.score) best = { x, y, score };
    });
    panel.style.left = best.x + "px";
    panel.style.top = best.y + "px";
  }

  // keyboard (laptop): E toggles, Ctrl+Z undo, Delete removes, Enter = Done, Esc = cancel
  window.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT" || e.target.tagName === "INPUT")) return;
    if ((e.key === "e" || e.key === "E") && !e.ctrlKey) { E.toggle(); return; }
    if (!V.editing) return;
    if (e.key === "z" && e.ctrlKey) { e.preventDefault(); E.undo(); }
    if (e.key === "Enter") finishTool();
    if (e.key === "Escape") { if (tool) cancelTool(); else { sel = null; render(); } }
    if ((e.key === "Delete" || e.key === "Backspace") && sel && !tool) {
      const a = { point: "removept", plot: "delplot", path: "delpath" }[sel.type];
      const btn = a && panel.querySelector(`[data-a="${a}"]`);
      if (btn) btn.click();
    }
  });
})();
