/* Start screen + language. A globe spins under the title "The Value Behind Valu – الڤاليو بڤاليو"; the guest picks
   English or العربية; the globe turns to Egypt, dives in, and hands over to the map (camera zoomed on Egypt).
   The self-playing tour runs the same intro by itself (alternating languages) before its chapters.
   Globe: d3-geo (vendor/) drawing Natural Earth outlines (config/globe.js) on a canvas that exists only while visible. */
(function () {
  const I = (V.intro = { visible: false, busy: false });
  const $ = (id) => document.getElementById(id);
  const G = window.VALU_GLOBE;
  const EGYPT = [30.8, 26.8], CAIRO = [31.24, 30.04], AMMAN = [35.93, 31.95];
  const R0 = 330, CX = 960, CY = 560; // globe radius and centre in stage px

  // ---------- language ----------
  V.lang = "en";
  V.T = (o) => (o ? o[V.lang] || o.en : "");
  V.setLang = (l) => {
    V.lang = l === "ar" ? "ar" : "en";
    document.body.classList.toggle("lang-ar", V.lang === "ar");
    V.story.closeAll();
    V.world.relabel && V.world.relabel();
    V.story.initHud();
  };

  // ---------- DOM ----------
  const root = $("intro");
  root.innerHTML = `
    <canvas class="in-globe"></canvas>
    <div class="in-top">
      <div class="in-spark"></div>
      <div class="in-title"><span class="en">The Value Behind Valu</span><span class="sep"></span><span class="ar" dir="rtl">الڤاليو بڤاليو</span></div>
    </div>
    <div class="in-bottom">
      <div class="in-choose"><span class="en">Choose your language</span><span class="dot">·</span><span class="ar" dir="rtl">اختر لغتك</span></div>
      <div class="in-btns"><button data-l="en" class="en">English</button><button data-l="ar" class="ar">العربية</button></div>
    </div>`;
  root.querySelector(".in-spark").appendChild(V.art.spark({ size: 84 }).el);
  const cv = root.querySelector(".in-globe"), g = cv.getContext("2d");
  const parts = [root.querySelector(".in-top"), root.querySelector(".in-bottom")];

  // ---------- globe ----------
  const proj = d3.geoOrthographic().clipAngle(90).precision(0.6);
  const path = d3.geoPath(proj, g);
  const grat = d3.geoGraticule10();
  let rot = [-5, -18, 0], scale = R0, k = 1, spinning = true, arcT = 0;
  function sizeCanvas() {
    k = Math.min(1.6, V.stage.scale * (window.devicePixelRatio || 1)); // sharp but bounded (Mali-G52)
    cv.width = Math.round(1920 * k); cv.height = Math.round(1080 * k);
  }
  function draw() {
    g.setTransform(k, 0, 0, k, 0, 0);
    g.clearRect(0, 0, 1920, 1080);
    proj.translate([CX, CY]).scale(scale).rotate(rot);
    // atmosphere
    const at = g.createRadialGradient(CX, CY, scale * 0.95, CX, CY, scale * 1.18);
    at.addColorStop(0, "rgba(120,235,225,.55)"); at.addColorStop(1, "rgba(120,235,225,0)");
    g.fillStyle = at; g.beginPath(); g.arc(CX, CY, scale * 1.18, 0, Math.PI * 2); g.fill();
    // ocean
    const oc = g.createRadialGradient(CX - scale * 0.35, CY - scale * 0.4, scale * 0.1, CX, CY, scale);
    oc.addColorStop(0, "#3FD2C6"); oc.addColorStop(1, "#077E8C");
    g.beginPath(); path({ type: "Sphere" }); g.fillStyle = oc; g.fill();
    g.beginPath(); path(grat); g.strokeStyle = "rgba(255,255,255,.14)"; g.lineWidth = 1; g.stroke();
    // land
    g.beginPath(); path(G.land); g.fillStyle = "#F0DCB2"; g.fill(); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 0.8; g.stroke();
    // Egypt + Jordan
    g.beginPath(); path(G.egypt); path(G.jordan); g.fillStyle = "#FF5100"; g.fill(); g.strokeStyle = "#FFFFFF"; g.lineWidth = 1.6; g.stroke();
    // Cairo → Amman arc with a travelling light
    g.beginPath(); path({ type: "LineString", coordinates: [CAIRO, AMMAN] }); g.setLineDash([6, 6]); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 2.5; g.stroke(); g.setLineDash([]);
    const p = proj(d3.geoInterpolate(CAIRO, AMMAN)(arcT));
    const vis = d3.geoDistance(d3.geoInterpolate(CAIRO, AMMAN)(arcT), [-rot[0], -rot[1]]) < Math.PI / 2;
    if (p && vis) { const og = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], 14); og.addColorStop(0, "#fff"); og.addColorStop(0.4, "rgba(255,190,120,.9)"); og.addColorStop(1, "rgba(255,81,0,0)"); g.fillStyle = og; g.beginPath(); g.arc(p[0], p[1], 14, 0, Math.PI * 2); g.fill(); }
    // soft terminator shading for a round look
    const sh = g.createRadialGradient(CX - scale * 0.3, CY - scale * 0.35, scale * 0.2, CX, CY, scale * 1.02);
    sh.addColorStop(0, "rgba(255,255,255,.10)"); sh.addColorStop(0.7, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,30,40,.35)");
    g.beginPath(); path({ type: "Sphere" }); g.fillStyle = sh; g.fill();
  }
  let last = 0;
  V.loop.add((dt, t) => {
    if (!I.visible) return;
    if (spinning) rot[0] += dt * 9;                 // gentle spin (°/s)
    arcT = (t / 2600) % 1;
    if (t - last < 30 && spinning) return;          // ~30 fps while idle-spinning is plenty
    last = t; draw();
  });

  // ---------- show / hide ----------
  I.show = () => {
    if (I.visible) return;
    sizeCanvas(); rot = [-5, -18, 0]; scale = R0; spinning = true;
    parts.forEach((e) => { e.style.opacity = 1; e.style.transform = "none"; });
    root.style.display = "block"; root.style.opacity = 0; I.visible = true;
    V.story.closeAll(); V.cam.reset(true);
    V.tween(600, (q) => { root.style.opacity = q; });
  };
  I.hide = () => { I.visible = false; root.style.display = "none"; };
  window.addEventListener("resize", () => I.visible && sizeCanvas());

  // Turn to Egypt, dive in, hand over to the map zoomed on Egypt. Resolves when the map is showing.
  I.fly = () => new Promise((resolve) => {
    I.busy = true; spinning = false;
    const r0 = rot.slice(), r1 = [-EGYPT[0], -EGYPT[1], 0];
    while (r0[0] - r1[0] > 180) r0[0] -= 360; while (r1[0] - r0[0] > 180) r0[0] += 360;
    parts.forEach((e) => V.tween(500, (q) => { e.style.opacity = 1 - q; e.style.transform = `translateY(${(e.classList.contains("in-top") ? -1 : 1) * q * 30}px)`; }));
    V.tween(1500, (q) => { rot = [V.lerp(r0[0], r1[0], q), V.lerp(r0[1], r1[1], q), 0]; draw(); }, { ease: V.ease.inOutCubic, done: () => {
      V.cam.focus(470, 470, 2.3, 10);                // the map waits underneath, zoomed on Egypt
      V.tween(1500, (q) => {
        scale = R0 * Math.exp(q * Math.log(16)); draw();
        if (q > 0.55) root.style.opacity = 1 - (q - 0.55) / 0.45;
      }, { ease: (x) => x * x, done: () => { I.hide(); I.busy = false; resolve(); } });
    } });
  });

  // A guest picks a language.
  root.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    const b = e.target.closest("button[data-l]");
    if (!b || I.busy) return;
    V.audio.tick();
    b.classList.add("pressed");
    V.setLang(b.dataset.l);
    I.fly().then(() => { b.classList.remove("pressed"); V.lastTouch = V.now(); V.cam.reset(false, 1400); });
  });

  // The tour runs the intro by itself: spin a few seconds, "press" a language, fly in. false = a guest took over.
  I.attract = async (alive, lang) => {
    I.show();
    const end = V.now() + 6500;
    while (V.now() < end) { if (!alive()) return false; await V.wait(100); }
    const b = root.querySelector(`button[data-l="${lang}"]`);
    b.classList.add("pressed");
    V.setLang(lang);
    await V.wait(350);
    if (!alive()) { b.classList.remove("pressed"); return false; }
    await I.fly();
    b.classList.remove("pressed");
    return alive();
  };
})();
