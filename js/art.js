/* Art: the Spark (SVG, never rotated, arms stretch along their own axis), line icons,
   small car / boat / plane movers, and a fallback building for plots without a sprite. */
(function () {
  const A = (V.art = {});
  const NS = V.svgNS;

  // ---------- the Spark ----------
  // The official Spark, path taken from the Valu Brand Guidelines (Aug 2023, §1.2.1 / §5.2): a horizontal bar and
  // two diagonals; the two centre corners sharp, every other corner rounded. Drawn exactly, never redrawn by hand,
  // never rotated. set(s) grows/shrinks the whole Spark (0 = hidden, 1 = normal): the arms are never stretched apart.
  const SPARK_D = "M74.74 88.74 L82.31 83.48 C84.26 82.13 84.74 79.45 83.39 77.51 L70.60 59.10 C69.09 56.93 70.65 53.94 73.30 53.94 L95.71 53.94 C98.08 53.94 100.00 52.03 100.00 49.66 L100.00 40.43 C100.00 38.06 98.08 36.15 95.71 36.15 L73.30 36.15 C70.65 36.15 69.09 33.16 70.60 30.99 L83.39 12.58 C84.74 10.64 84.26 7.96 82.31 6.61 L74.74 1.35 C72.80 0.00 70.12 0.48 68.77 2.43 L50.00 29.45 L31.23 2.43 C29.88 0.48 27.20 0.00 25.26 1.35 L17.69 6.61 C15.74 7.96 15.26 10.64 16.61 12.58 L29.40 30.99 C30.91 33.16 29.35 36.15 26.70 36.15 L4.29 36.15 C1.92 36.15 0.00 38.06 0.00 40.43 L0.00 49.66 C0.00 52.03 1.92 53.94 4.29 53.94 L26.70 53.94 C29.35 53.94 30.91 56.93 29.40 59.10 L16.61 77.51 C15.26 79.45 15.74 82.13 17.69 83.48 L25.26 88.74 C27.20 90.09 29.88 89.61 31.23 87.66 L50.00 60.64 L68.77 87.66 C70.12 89.61 72.80 90.09 74.74 88.74 Z";
  const SPARK_W = 92; // width in the 120×120 viewBox (official shape is 100 × 90.09)
  A.SPARK_COLORS = { orange: "#FF5100", teal: "#00C4B3" };

  A.spark = function (opt) {
    opt = opt || {};
    const size = opt.size || 64;
    const color = A.SPARK_COLORS[opt.color] || opt.color || "#FF5100";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "-60 -60 120 120");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("class", "spark");
    svg.style.overflow = "visible";
    const g = document.createElementNS(NS, "g");
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", SPARK_D);
    path.setAttribute("fill", color);
    path.setAttribute("transform", `scale(${SPARK_W / 100}) translate(-50,-45.045)`); // centre the shape on 0,0
    g.appendChild(path);
    svg.appendChild(g);
    function set(s) {
      const k = Array.isArray(s) ? s.reduce((a, b) => a + b, 0) / s.length : s;
      g.setAttribute("transform", `scale(${Math.max(0, k)})`);
    }
    set(opt.stretch == null ? 1 : opt.stretch);
    return { el: svg, set };
  };

  // ---------- line icons (single colour, rounded, clear cuts) ----------
  const ICONS = {
    home:   '<path d="M4 11.5 12 4.5l8 7"/><path d="M6.5 10v9.5h4v-5h3v5h4V10"/>',
    bag:    '<path d="M5.5 8.5h13l-1 11h-11z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
    plane:  '<path d="M3.5 13.5 10 12l4.5-7h2l-2 7.2 4.8.8 1.2-2h1.5l-.8 3.5.8 3.5H20.5l-1.2-2-4.8.8 2 7.2h-2L10 17l-6.5-1.5z" transform="scale(.9) translate(1 -1.5)"/>',
    car:    '<path d="M4 15.5v-3l2-4.5h12l2 4.5v3"/><path d="M3.5 15.5h17v3h-17z"/><circle cx="7.5" cy="18.5" r="1.6"/><circle cx="16.5" cy="18.5" r="1.6"/>',
    phone:  '<rect x="7" y="3" width="10" height="18" rx="2.4"/><path d="M10.5 18h3"/>',
    pin:    '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    cash:   '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
    card:   '<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="M3 9.5h18M6.5 14.5h4"/>',
    qr:     '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M14 14h2v2h-2zM18 14h2M14 18v2M17 17h3v3"/>',
    heart:  '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    book:   '<path d="M4 5.5h6a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4zM20 5.5h-6a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h6z"/>',
    piggy:  '<path d="M5 11a6 5 0 0 1 11-2.5h2l1-2v4l1.5 1v3l-1.5.5-1 3h-2.5l-.5-1.5h-4l-.5 1.5H7.5l-1-3A5 5 0 0 1 5 11z"/><circle cx="15.5" cy="10.5" r=".6"/>',
    chart:  '<path d="M4 20h16"/><path d="M7 16v-4M11 16V8M15 16v-6M19 16V5"/>',
    gift:   '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-1.5-3-5-3.5-5-1s5 1 5 1zm0 0c1.5-3 5-3.5 5-1s-5 1-5 1z"/>',
    ticket: '<path d="M4 7h16v3.2a1.8 1.8 0 0 0 0 3.6V17H4v-3.2a1.8 1.8 0 0 0 0-3.6z"/><path d="M14 7.5v9" stroke-dasharray="1.5 2"/>',
  };
  A.icon = (name, color, size) =>
    `<svg viewBox="0 0 24 24" width="${size || 40}" height="${size || 40}" fill="none" stroke="${color || "#FF5100"}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;

  // ---------- movers (drawn facing right; world.js mirrors them when heading left) ----------
  A.car = (body) =>
    `<svg viewBox="0 0 48 26" width="44" height="24"><ellipse cx="24" cy="23" rx="20" ry="3" fill="rgba(0,0,0,.18)"/>` +
    `<path d="M5 18v-5l5-1 5-6h16l7 6 5 1.5V18z" fill="${body || "#fff"}" stroke="rgba(0,0,0,.25)" stroke-width="1"/>` +
    `<path d="M17 7.5h6.5v4.5H13zM25.5 7.5h5l5 4.5H25.5z" fill="#9fd8e6"/>` +
    `<circle cx="13" cy="19" r="3.4" fill="#333"/><circle cx="36" cy="19" r="3.4" fill="#333"/>` +
    `<rect x="41" y="13" width="4" height="2" rx="1" fill="#FCE200"/></svg>`;
  A.boat = () =>
    `<svg viewBox="0 0 44 44" width="40" height="40"><ellipse cx="22" cy="38" rx="17" ry="3" fill="rgba(255,255,255,.35)"/>` +
    `<path d="M6 31h32l-5 6H11z" fill="#FF5100"/><path d="M21 6v24H8z" fill="#fff"/><path d="M23 10v20h11z" fill="#f3efe9"/>` +
    `<path d="M22 4v28" stroke="#8a6a4a" stroke-width="1.6"/></svg>`;
  A.plane = () =>
    `<svg viewBox="0 0 80 40" width="96" height="48"><path d="M6 21c0-2 2-3 5-3h48c6 0 13 1.5 15 3-2 1.5-9 3-15 3H11c-3 0-5-1-5-3z" fill="#fff" stroke="rgba(0,0,0,.2)"/>` +
    `<path d="M36 18 26 4h6l16 14zM36 24 26 37h6l16-13z" fill="#FF5100"/><path d="M8 18 4 8h5l7 10z" fill="#FF5100"/>` +
    `<path d="M62 19h6l3 2h-9z" fill="#9fd8e6"/></svg>`;

  // ---------- fallback building (used when config/sprites.js has no sprite for a plot) ----------
  A.building = () =>
    `<svg viewBox="0 0 100 90" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">` +
    `<path d="M14 40 50 26l36 14v44H14z" fill="#fbf7f2"/><path d="M50 26l36 14v44L50 90z" fill="#e9e0d6"/>` +
    `<path d="M14 40 50 54v36L14 84z" fill="#fff"/><path d="M10 39 50 23l40 16-40 16z" fill="#FF5100"/>` +
    `<rect x="22" y="58" width="9" height="10" rx="1.5" fill="#9fd8e6"/><rect x="35" y="62" width="9" height="10" rx="1.5" fill="#9fd8e6"/>` +
    `<path d="M58 60h10v20H58z" fill="#cfc4b8"/></svg>`;
})();
