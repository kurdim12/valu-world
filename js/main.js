/* Boot, touch routing, idle timer → self-playing tour, ambient bridge pulse,
   admin panel (hold top-left 5 s or Ctrl+A), debug overlay (key D). */
(function () {
  const set = V.set;
  const $ = (id) => document.getElementById(id);

  // Layout: a layout saved by Edit mode on this device overrides config/layout.js.
  V.layout = V.loadLayout();
  V.editing = false;
  V.tourState = "off";

  // ---------- pointers, idle timer, debug dots ----------
  const ptrs = new Map(); // pointerId → { n, dot }
  let maxP = 0;
  V.lastTouch = V.now();
  const dots = $("dots");
  function freeNumber() {
    const used = new Set([...ptrs.values()].map((p) => p.n));
    let n = 1; while (used.has(n)) n++;
    return n;
  }
  function place(p, e) {
    const [x, y] = V.stage.toStage(e.clientX, e.clientY);
    p.dot.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
  }
  // Capture phase on window: every finger is seen first, so any touch stops the tour immediately.
  window.addEventListener("pointerdown", (e) => {
    V.lastTouch = V.now();
    if (V.story.touring) V.story.stopTour();
    const p = { n: freeNumber(), dot: V.el("div", "tdot") };
    p.dot.textContent = p.n;
    dots.appendChild(p.dot);
    ptrs.set(e.pointerId, p);
    place(p, e);
    maxP = Math.max(maxP, ptrs.size);
  }, true);
  window.addEventListener("pointermove", (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    V.lastTouch = V.now();
    place(p, e);
  }, true);
  const end = (e) => { const p = ptrs.get(e.pointerId); if (p) { p.dot.remove(); ptrs.delete(e.pointerId); } };
  window.addEventListener("pointerup", end, true);
  window.addEventListener("pointercancel", end, true);
  window.addEventListener("blur", () => { ptrs.forEach((p) => p.dot.remove()); ptrs.clear(); });

  // ---------- taps on the world ----------
  $("hit").addEventListener("pointerdown", (e) => {
    if (V.editing) return;
    const [x, y] = V.cam.toWorld(...V.stage.toStage(e.clientX, e.clientY)); // world coordinates (camera-aware)
    const ch = V.world.hit(x, y);
    if (ch) { V.fx.ring(x, y, { r1: 34, dur: 450, color: "white", width: 3 }); V.story.tapChapter(ch, [x, y]); }
    else V.ambient.react(x, y); // water ripples, a puff of sparks on land, or a hop for a car/boat/plane
  });

  // ---------- debug overlay ----------
  const dbg = $("debug");
  V.setDebug = (on) => { set().debug = on; document.body.classList.toggle("debug", on); };
  V.setDebug(!!set().debug);
  window.addEventListener("keydown", (e) => {
    if ((e.key === "d" || e.key === "D") && !e.ctrlKey) V.setDebug(!set().debug);
    if ((e.key === "a" || e.key === "A") && e.ctrlKey) { e.preventDefault(); V.admin.open(); }
  });
  let frames = 0, acc = 0, fps = 0, hudAcc = 0;
  V.loop.add((dt) => {
    frames++; acc += dt; hudAcc += dt;
    if (acc >= 0.5) { fps = Math.round(frames / acc); frames = 0; acc = 0; }
    if (!set().debug || hudAcc < 0.25) return;
    hudAcc = 0;
    dbg.textContent =
      `FPS ${fps}  ·  touches ${ptrs.size} (max ${maxP})  ·  scale ${V.stage.scale.toFixed(3)}  ·  ` +
      `idle ${Math.floor((V.now() - V.lastTouch) / 1000)} s  ·  tour ${V.tourState}  ·  particles ${V.fx.count()}`;
  });

  // ---------- admin panel ----------
  const panel = $("admin");
  const AD = (V.admin = {});
  AD.open = () => {
    const s = set();
    panel.innerHTML = `<h3>The Valu Story — admin</h3>
      <div class="row"><button data-a="play" class="main">▶ Play the story now</button></div>
      <div class="row"><button data-a="build">Build Jordan</button><button data-a="clear">Clear Jordan</button><button data-a="pulse">Bridge pulse</button></div>
      <div class="row"><button data-a="edit">✎ Edit mode</button><span class="meta">Layout: ${V.esc(V.layoutSource)}</span></div>
      <div class="row"><button data-a="sound">Sound: ${V.audio.enabled ? "ON" : "OFF"}</button>
        <label class="vol">Volume <input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-a="vol"></label></div>
      <div class="row"><button data-a="ambient">Ambient touch: ${s.ambientTouch === false ? "OFF" : "ON"}</button></div>
      <div class="row"><button data-a="debug">Debug: ${s.debug ? "ON" : "OFF"}</button><button data-a="fs">Fullscreen</button><button data-a="close" class="close">Close</button></div>`;
    panel.classList.add("open");
  };
  AD.close = () => panel.classList.remove("open");
  panel.addEventListener("pointerdown", (e) => e.stopPropagation());
  panel.addEventListener("input", (e) => { if (e.target.dataset.a === "vol") V.audio.setVolume(+e.target.value); });
  panel.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const a = b.dataset.a;
    if (a === "play") { AD.close(); V.story.startTour(); return; }
    if (a === "edit") { AD.close(); V.editor.enter(); return; }
    if (a === "build") V.world.buildAll(250);
    if (a === "clear") V.world.clearAll();
    if (a === "pulse") V.world.bridgePulse(true);
    if (a === "sound") V.audio.enabled = !V.audio.enabled;
    if (a === "debug") V.setDebug(!set().debug);
    if (a === "ambient") set().ambientTouch = set().ambientTouch === false;
    if (a === "fs") { const d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen || (() => {})).call(d); }
    if (a === "close") { AD.close(); return; }
    AD.open(); // refresh labels
  });
  // Hold the top-left corner for 5 s. A small ring fills up so the hold is visible.
  const corner = $("corner"), cfill = corner.querySelector(".fill");
  let hold = null, holdStop = null;
  corner.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    clearTimeout(hold);
    holdStop && holdStop();
    corner.classList.add("holding");
    holdStop = V.tween(5000, (k) => { cfill.style.transform = `scale(${k})`; }, { ease: V.ease.linear });
    hold = setTimeout(() => { corner.classList.remove("holding"); AD.open(); }, 5000);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => corner.addEventListener(ev, () => {
    clearTimeout(hold); holdStop && holdStop();
    corner.classList.remove("holding"); cfill.style.transform = "scale(0)";
  }));

  // ---------- idle → tour; ambient bridge pulse ----------
  let lastPulse = V.now();
  V.loop.add(() => {
    const now = V.now(), s = set();
    // autoTour false (client, 12 Oct): touch only — the self-playing tour never starts by itself (admin ▶ can still start it)
    if (s.autoTour !== false && !V.story.touring && !V.editing && !panel.classList.contains("open") && now - V.lastTouch > s.attractAfterSec * 1000) V.story.startTour();
    if (!V.story.touring && !V.editing && now - lastPulse > s.bridgePulseEverySec * 1000) { lastPulse = now; V.world.bridgePulse(false); }
  });

  // ---------- preload + decode the world, then build everything and fade in ----------
  const img = $("world");
  const probe = new Image();
  probe.onload = () => {
    const shown = () => {
      img.src = probe.src;
      V.world.init();
      V.story.initHud();
      V.bridgeDrag.reset();
      // no start screen: the table opens straight on the map (language: EN | ع switch in the title bar)
      requestAnimationFrame(() => document.body.classList.add("ready"));
    };
    (probe.decode ? probe.decode() : Promise.resolve()).then(shown, shown);
  };
  probe.onerror = () => {
    const b = $("boot");
    b.textContent = "Missing assets/world.jpg";
    b.classList.add("err");
  };
  probe.src = "assets/world.jpg";
})();
