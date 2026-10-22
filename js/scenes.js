// Scene drawings for the guided story. One simple picture per setting, and the
// same nine steps drawn on top of it, so the chemistry can be followed with the
// eye. Every picture is a sketch, not a measurement.

const C = {
  teal: "#20808d", terra: "#a84b2f", darkTeal: "#1b474d", cyan: "#bce2e7",
  mauve: "#944454", gold: "#e0a526", olive: "#848456", brown: "#6e522b",
  text: "#28251d", muted: "#6e6b63", faint: "#a8a49b", border: "#d9d5cc",
  surface: "#fdfdfb", fail: "#a13544",
};
const FONT = "Switzer, system-ui, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const t = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 11}" fill="${o.fill || C.text}" font-weight="${o.weight || 400}" text-anchor="${o.anchor || "start"}"${o.opacity ? ` opacity="${o.opacity}"` : ""}>${esc(s)}</text>`;

// Kinds of organisms in the ecosystem step get these colours, in turn.
export const KIND_COLS = [C.darkTeal, C.terra, C.gold, C.mauve, C.olive, C.teal, C.brown, "#5b6f9a", "#7c8c3a", "#b0603a"];

// Small deterministic random numbers so a scene looks the same every time.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* ---------------- the six settings ---------------- */

const W = 600, H = 300;

const SETTINGS = {
  SC1: { // alkaline vent
    pockets: [[250, 92], [292, 112], [262, 140], [305, 160], [255, 188], [298, 208], [270, 236]].map(([x, y]) => ({ x, y, r: 15 })),
    bg() {
      let s = `<defs><linearGradient id="ocn1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe6ea"/><stop offset="1" stop-color="#8fb9c0"/></linearGradient></defs>`;
      s += `<rect width="${W}" height="${H}" fill="url(#ocn1)"/>`;
      s += `<path d="M0 262 Q150 252 300 262 T600 258 L600 300 L0 300 Z" fill="#7a6a55"/>`;
      s += `<path d="M232 262 L224 210 L236 160 L228 110 L246 70 L272 56 L296 66 L318 100 L312 150 L326 196 L318 262 Z" fill="#b9a789" stroke="#8a7a60" stroke-width="1.5"/>`;
      for (let i = 0; i < 4; i++) s += `<path d="M${262 + i * 9} 280 q-6 -20 0 -40" stroke="${C.terra}" stroke-width="1.6" fill="none" opacity="0.55" marker-end="url(#arr)"/>`;
      s += `<defs><marker id="arr" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="${C.terra}"/></marker></defs>`;
      s += t(338, 74, "acidic ocean, rich in CO2", { fill: C.darkTeal, weight: 600 });
      s += t(338, 89, "and dissolved iron", { fill: C.darkTeal });
      s += t(338, 270, "warm alkaline fluid with H2 rises", { fill: C.surface, weight: 600 });
      s += t(26, 74, "chimney of iron sulfide,", { fill: C.darkTeal, weight: 600 });
      s += t(26, 89, "green rust and clay, full of pores", { fill: C.darkTeal });
      return s;
    },
  },
  SC2: { // wet and dry pools
    pockets: [[120, 196], [176, 210], [300, 204], [360, 214], [470, 200], [520, 212]].map(([x, y]) => ({ x, y, r: 16 })),
    bg() {
      let s = `<rect width="${W}" height="${H}" fill="#e9eef0"/>`;
      s += `<circle cx="520" cy="56" r="20" fill="#f4d58a"/>`;
      s += `<path d="M0 150 L80 98 L150 140 L230 84 L320 150 L410 110 L520 150 L600 128 L600 300 L0 300 Z" fill="#a39a86"/>`;
      s += `<path d="M0 180 L600 176 L600 300 L0 300 Z" fill="#8d806a"/>`;
      for (const [cx, w] of [[148, 76], [330, 86], [495, 74]]) {
        s += `<ellipse cx="${cx}" cy="206" rx="${w}" ry="20" fill="#c7a77a" opacity="0.7"/>`;
        s += `<ellipse cx="${cx}" cy="206" rx="${w - 12}" ry="14" fill="#9cc6cc"/>`;
      }
      s += t(20, 40, "volcanic land above the sea", { fill: C.darkTeal, weight: 600 });
      s += t(20, 56, "small pools fill with rain and dry in the sun", { fill: C.darkTeal });
      s += t(20, 270, "a dry crust forms at each rim, then the pool fills again", { fill: C.surface, weight: 600 });
      return s;
    },
  },
  SC3: { // impact hydrothermal
    pockets: [[190, 196], [236, 222], [300, 236], [364, 222], [410, 196], [300, 196]].map(([x, y]) => ({ x, y, r: 14 })),
    bg() {
      let s = `<rect width="${W}" height="${H}" fill="#eef0ee"/>`;
      s += `<path d="M0 120 L120 120 Q150 108 170 130 Q300 270 430 130 Q450 108 480 120 L600 120 L600 300 L0 300 Z" fill="#9e8f78"/>`;
      s += `<path d="M178 140 Q300 240 422 140" fill="#a8cdd2" opacity="0.85"/>`;
      s += `<path d="M120 300 Q300 200 480 300 Z" fill="${C.terra}" opacity="0.35"/>`;
      const r = rng(3);
      for (let i = 0; i < 14; i++) { const x = 170 + r() * 260, y = 190 + r() * 70; s += `<path d="M${x} ${y} l${(r() - 0.5) * 30} ${10 + r() * 20}" stroke="#6e522b" stroke-width="1.2" opacity="0.6"/>`; }
      s += t(20, 40, "an impact crater with a crater lake", { fill: C.darkTeal, weight: 600 });
      s += t(20, 56, "hot rock below drives water through cracks for about 100,000 years", { fill: C.darkTeal });
      s += t(20, 286, "hot, cracked rock under the floor", { fill: C.surface, weight: 600 });
      return s;
    },
  },
  SC4: { // pumice rafts
    pockets: [[120, 150], [164, 140], [210, 156], [254, 144], [300, 152], [470, 214], [510, 222]].map(([x, y]) => ({ x, y, r: 12 })),
    bg() {
      let s = `<rect width="${W}" height="${H}" fill="#e7eef0"/>`;
      s += `<rect y="160" width="${W}" height="140" fill="#9ec3c9"/>`;
      s += `<path d="M420 300 L440 190 Q520 170 600 180 L600 300 Z" fill="#c9b48e"/>`;
      s += `<path d="M430 236 Q500 226 600 232" stroke="#8d7a58" stroke-dasharray="4 4" fill="none"/>`;
      const r = rng(7);
      for (let i = 0; i < 9; i++) { const x = 100 + i * 26 + r() * 6, y = 146 + r() * 14; s += `<ellipse cx="${x}" cy="${y}" rx="${16 + r() * 6}" ry="${10 + r() * 4}" fill="#d8d0c0" stroke="#a89f8c"/>`; }
      s += t(20, 40, "floating rafts of pumice, a glassy volcanic rock full of holes", { fill: C.darkTeal, weight: 600 });
      s += t(20, 56, "they drift for months, then wash up on a beach with the tide", { fill: C.darkTeal });
      s += t(446, 262, "tide line on the beach", { fill: C.text, weight: 600 });
      return s;
    },
  },
  SC5: { // ice
    pockets: [[150, 130], [210, 170], [270, 120], [330, 190], [390, 140], [450, 182]].map(([x, y]) => ({ x, y, r: 12 })),
    bg() {
      let s = `<rect width="${W}" height="${H}" fill="#eef3f5"/>`;
      s += `<rect x="60" y="80" width="480" height="160" rx="10" fill="#dbeaf0" stroke="#a9c6d0"/>`;
      s += `<path d="M90 150 C150 110 210 200 270 120 S390 210 450 150 S510 120 530 160" stroke="#9cbfcb" stroke-width="3" fill="none"/>`;
      s += `<path d="M120 210 C200 170 260 230 330 190 S420 170 500 210" stroke="#9cbfcb" stroke-width="2" fill="none"/>`;
      s += t(20, 40, "sea ice or a frozen lake", { fill: C.darkTeal, weight: 600 });
      s += t(20, 56, "as water freezes, salt and solutes are pushed into thin veins of brine", { fill: C.darkTeal });
      s += t(70, 268, "cold, so everything is slow, but very little falls apart", { fill: C.darkTeal, weight: 600 });
      return s;
    },
  },
  SC6: { // panspermia
    pockets: [[330, 214], [380, 226], [430, 214], [480, 228], [530, 216]].map(([x, y]) => ({ x, y, r: 13 })),
    bg() {
      let s = `<rect width="${W}" height="${H}" fill="#e9ecf2"/>`;
      s += `<rect width="${W}" height="120" fill="#d4d9e6"/>`;
      s += `<path d="M40 30 L230 160" stroke="${C.terra}" stroke-width="3" opacity="0.5" stroke-dasharray="6 5"/>`;
      s += `<circle cx="238" cy="166" r="12" fill="#7a6a55"/>`;
      s += `<path d="M0 200 L600 196 L600 300 L0 300 Z" fill="#9ec3c9"/>`;
      s += `<path d="M0 250 L600 246 L600 300 L0 300 Z" fill="#7a6a55"/>`;
      s += t(20, 40, "a rock arrives from somewhere else", { fill: C.darkTeal, weight: 600 });
      s += t(20, 56, "it delivers ready-made molecules or cells, so the problem moves", { fill: C.darkTeal });
      s += t(300, 186, "the place it lands still has to keep them", { fill: C.darkTeal, weight: 600 });
      return s;
    },
  },
};

export function hasScene(id) { return !!SETTINGS[id]; }

/* ---------------- the step overlays ---------------- */

// step ids in order: T1 S1 S2 S3 S4 T3 S5 E L
export const STEP_ORDER = ["T1", "S1", "S2", "S3", "S4", "T3", "S5", "E", "L"];

function dots(pk, n, col, r, seed, op = 1, ring = 0.55) {
  const R = rng(seed); let s = "";
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = pk.r * ring * Math.sqrt(R());
    s += `<circle cx="${(pk.x + Math.cos(a) * d).toFixed(1)}" cy="${(pk.y + Math.sin(a) * d).toFixed(1)}" r="${r}" fill="${col}" opacity="${op}"/>`;
  }
  return s;
}

// info: { stepIdx, pS2, X, Y, pairs, stepsActive:Set }
export function sceneSvg(scId, info) {
  const S = SETTINGS[scId] || SETTINGS.SC1;
  const k = info.stepIdx;
  const pk = S.pockets;
  const hot = Math.floor(pk.length / 2);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Scene for step ${k + 1}" font-family="${FONT}">`;
  s += S.bg();
  const past = (i) => (i < k ? 0.45 : 1);
  // 0. setting: pockets outlined
  for (const p of pk) s += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="#fdfdfb" fill-opacity="${k === 0 ? 0.55 : 0.35}" stroke="${C.darkTeal}" stroke-width="${k === 0 ? 1.6 : 1}" ${k === 0 ? 'stroke-dasharray="3 2"' : ""}/>`;
  // 1. S1, first building blocks appear
  if (k >= 1 && k <= 6) pk.forEach((p, i) => { s += dots(p, 4, C.gold, 2.2, 11 + i, past(1)); });
  // 2. S2, some survive, some break
  if (k >= 2 && k <= 6) {
    const keep = Math.max(0, Math.min(1, info.pS2 ?? 1));
    pk.forEach((p, i) => {
      const R = rng(40 + i);
      for (let j = 0; j < 4; j++) {
        const x = p.x + (R() - 0.5) * p.r * 1.2, y = p.y + (R() - 0.5) * p.r * 1.2;
        const ok = (i * 4 + j + 0.5) / (pk.length * 4) <= keep || keep > 0.97;
        if (!ok && k === 2) s += `<path d="M${x - 2.5} ${y - 2.5} l5 5 m0 -5 l-5 5" stroke="${C.fail}" stroke-width="1.3"/>`;
        else if (ok) s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="${C.teal}" opacity="${past(2)}"/>`;
      }
    });
  }
  // 3. S3, gathered on the wall: a ring of dots at the pocket edge
  if (k >= 3 && k <= 6) pk.forEach((p) => {
    for (let j = 0; j < 9; j++) { const a = (j / 9) * Math.PI * 2; s += `<circle cx="${(p.x + Math.cos(a) * (p.r - 3)).toFixed(1)}" cy="${(p.y + Math.sin(a) * (p.r - 3)).toFixed(1)}" r="1.9" fill="${C.terra}" opacity="${past(3)}"/>`; }
  });
  // 4. S4, a loop that makes more of itself
  if (k >= 4 && k <= 6) pk.forEach((p) => {
    s += `<path d="M${p.x - 6} ${p.y} a6 6 0 1 1 6 6" fill="none" stroke="${C.darkTeal}" stroke-width="1.6" opacity="${past(4)}"/>`;
    s += `<path d="M${p.x} ${p.y + 6} l-3 -3 m3 3 l-3 3" stroke="${C.darkTeal}" stroke-width="1.6" opacity="${past(4)}"/>`;
  });
  // 5. T3, one place where everything lines up
  if (k === 5) {
    const p = pk[hot];
    s += `<circle cx="${p.x}" cy="${p.y}" r="${p.r + 9}" fill="none" stroke="${C.gold}" stroke-width="3"/>`;
    s += `<circle cx="${p.x}" cy="${p.y}" r="${p.r + 15}" fill="none" stroke="${C.gold}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
  }
  // 6. S5, a membrane around a working network, copies spread
  if (k === 6) {
    [hot, hot - 1, hot + 1].filter((i) => pk[i]).forEach((i, n) => {
      const p = pk[i];
      s += `<circle cx="${p.x}" cy="${p.y}" r="${p.r - 1}" fill="${C.cyan}" fill-opacity="0.55" stroke="${C.darkTeal}" stroke-width="2.2" opacity="${n === 0 ? 1 : 0.7}"/>`;
    });
  }
  // 7 and 8. The ecosystem: X kinds of cells, Y links between them
  if (k >= 7) {
    const X = Math.max(1, Math.min(12, info.X || 1));
    const cx = W / 2 + 130, cy = 178, R0 = 68;
    s += `<rect x="${cx - R0 - 34}" y="${cy - R0 - 30}" width="${2 * R0 + 68}" height="${2 * R0 + 52}" rx="10" fill="#fdfdfb" opacity="0.88" stroke="${C.border}"/>`;
    const nodes = Array.from({ length: X }, (_, i) => {
      const a = -Math.PI / 2 + (i / X) * Math.PI * 2;
      return { x: cx + Math.cos(a) * (X === 1 ? 0 : R0 * 0.8), y: cy + Math.sin(a) * (X === 1 ? 0 : R0 * 0.8), c: KIND_COLS[i % KIND_COLS.length] };
    });
    const links = linkList(info.X || 1, info.Y || 0).filter(([a, b]) => a < X && b < X);
    for (const [a, b] of links) s += `<line x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}" stroke="${C.muted}" stroke-width="1.2" opacity="0.7"/>`;
    nodes.forEach((n, i) => {
      const R = rng(90 + i);
      for (let j = 0; j < (k === 8 ? 5 : 3); j++) s += `<ellipse cx="${(n.x + (R() - 0.5) * 18).toFixed(1)}" cy="${(n.y + (R() - 0.5) * 14).toFixed(1)}" rx="5" ry="3.4" fill="${n.c}" stroke="#fff" stroke-width="0.8"/>`;
    });
    s += t(cx, cy - R0 - 12, k === 8 ? "LUCA's community, as first seen" : `${info.X} kinds, ${Math.min(info.Y, info.pairs)} links`, { anchor: "middle", weight: 600, size: 11.5, fill: C.darkTeal });
    if ((info.X || 0) > 12) s += t(cx, cy + R0 + 16, `${info.X - 12} more kinds not drawn`, { anchor: "middle", size: 10, fill: C.muted });
  }
  // step badge
  s += `<rect x="${W - 132}" y="10" width="122" height="24" rx="12" fill="${C.darkTeal}"/>`;
  s += t(W - 71, 26, `step ${k + 1} of ${STEP_ORDER.length}`, { anchor: "middle", fill: "#fff", weight: 600, size: 11.5 });
  return s + "</svg>";
}

// Which pairs are linked, in a fixed order: first a ring (every kind feeds the
// next), then shortcuts. Deterministic so the drawing does not jump about.
export function linkList(X, Y) {
  const out = [];
  if (X < 2) return out;
  const seen = new Set();
  const add = (a, b) => { const k = a < b ? a + "," + b : b + "," + a; if (a !== b && !seen.has(k)) { seen.add(k); out.push([Math.min(a, b), Math.max(a, b)]); } };
  for (let i = 0; i < X && out.length < Y; i++) add(i, (i + 1) % X);
  for (let d = 2; d <= Math.floor(X / 2) && out.length < Y; d++) for (let i = 0; i < X && out.length < Y; i++) add(i, (i + d) % X);
  return out.slice(0, Y);
}
