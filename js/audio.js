/* Synthesized sounds (Web Audio, no files). Unlocked by the first touch. Master volume = settings.volume. */
(function () {
  let ctx = null, master = null;
  const AU = (V.audio = { enabled: true });

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = V.set().volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  // Browsers only allow audio after a user gesture: unlock on the first touch.
  window.addEventListener("pointerdown", ensure, true);

  AU.setVolume = (v) => { V.set().volume = v; if (master) master.gain.value = v; };
  const ok = () => AU.enabled && ctx && ctx.state === "running";

  // soft sine/triangle note with a quick attack and gentle release
  function note(freq, at, dur, vol, type) {
    const t = ctx.currentTime + (at || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  AU.tick = () => { if (ok()) note(1320, 0, 0.09, 0.08, "triangle"); };
  AU.chime = () => { if (!ok()) return; note(784, 0, 0.9, 0.12); note(1175, 0.12, 1.1, 0.1); };          // G5 → D6
  AU.bell = () => { if (!ok()) return; note(1047, 0, 1.4, 0.09); note(2094, 0, 0.6, 0.025); };          // soft bell
  AU.build = () => { if (!ok()) return; [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.07, 0.7, 0.07, "triangle")); }; // warm arpeggio
  AU.pop = () => { if (ok()) note(880, 0, 0.18, 0.06, "sine"); };
  AU.whoosh = (dur) => {
    if (!ok()) return;
    dur = dur || 1.6;
    const t = ctx.currentTime, n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf;
    f.type = "bandpass"; f.Q.value = 1.4;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + dur * 0.55);
    f.frequency.exponentialRampToValueAtTime(500, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur);
  };
})();
