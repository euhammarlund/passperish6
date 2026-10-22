// Version 8, the second update for the Geobiology section at GLOBE.
// Two pages: (1) timeline, younger start and crust composition; (2) minerals, conditions and
// molecular build-up. All new choices are off or set as before until you switch them on.

import {
  FELSIC_CURVES, felsicAt, chemAgeFor, LAND_STARTS, BUILDUP_VENUES, MIX_PRESETS, SCENARIO_VENUE,
  SAND_PORE, SAND_MAP, loadingFromPorosity, buildupFor, surfaceState, mixMineral, venueFor, venueMix,
  blendMix, computeEnvelope, auditScenario, tempAtAge, START_EVIDENCE, borateFor, fmtSci, fmtMyr,
} from "./engine.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const C = { teal: "#20808d", terra: "#a84b2f", darkTeal: "#1b474d", cyan: "#bce2e7", mauve: "#944454", gold: "#d19a2a",
  olive: "#848456", brown: "#6e522b", text: "#28251d", muted: "#6e6b63", faint: "#a8a49b", border: "#d9d5cc", light: "#f7f6f2", surface: "#fdfdfb", fail: "#a13544" };
const FONT = "Switzer, system-ui, sans-serif";
const MONO = "JetBrains Mono, ui-monospace, monospace";
const f2 = (v, d = 2) => (v == null || !isFinite(v) ? "n/a" : (+v).toFixed(d));
const pct = (v, d = 0) => (v == null || !isFinite(v) ? "n/a" : (100 * v).toFixed(d) + " %");
const sci = (v) => (v == null || !isFinite(v) ? "n/a" : (Math.abs(v) >= 0.01 && Math.abs(v) < 1e4 ? (+v).toPrecision(3).replace(/\.?0+$/, "") : fmtSci(v)));

export const V8_REFS = {
  korenaga: { short: "Korenaga 2021", url: "https://pubmed.ncbi.nlm.nih.gov/34833018/" },
  gamaleldien: { short: "Gamaleldien et al. 2024", url: "https://www.nature.com/articles/s41561-024-01450-0" },
  tang: { short: "Tang et al. 2016", url: "https://www.science.org/doi/abs/10.1126/science.aad5513" },
  dhuime: { short: "Dhuime et al. 2015", url: "https://www.nature.com/articles/ngeo2466" },
  greber: { short: "Greber et al. 2017", url: "https://www.science.org/doi/10.1126/science.aan8086" },
  bernadet: { short: "Bernadet et al. 2025", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11939034/" },
  bindeman: { short: "Bindeman et al. 2018", url: "https://www.nature.com/articles/s41586-018-0131-1" },
  kt: { short: "Krissansen-Totton et al. 2018", url: "https://pubmed.ncbi.nlm.nih.gov/29610313/" },
  knauth: { short: "Knauth 2005", url: "https://doi.org/10.1016/j.palaeo.2004.10.014" },
  marty: { short: "Marty et al. 2018", url: "https://doi.org/10.1016/j.crte.2017.12.002" },
  goldblatt: { short: "Goldblatt and Zahnle 2011", url: "https://cp.copernicus.org/articles/7/203/2011/" },
  rosing: { short: "Rosing et al. 2010", url: "https://pubmed.ncbi.nlm.nih.gov/20360739/" },
  gough: { short: "Gough 1981", url: "https://doi.org/10.1007/BF00151270" },
  pavlov: { short: "Pavlov and Kasting 2002", url: "https://pubmed.ncbi.nlm.nih.gov/12449853/" },
  kasting: { short: "Kasting 2002 report", url: "https://astrobiology.nasa.gov/nai/annual-reports/2002/psu/evolution-of-atmospheric-o2-climate-and-biosphere-james-f-kasting/index.html" },
  ranjan: { short: "Ranjan and Sasselov 2017", url: "https://hero.epa.gov/reference/3849661/" },
  zahnle: { short: "Zahnle et al. 2007", url: "https://sseh.uchicago.edu/doc/Zahnle2007.pdf" },
  abramov: { short: "Abramov et al. 2026 (impact chronology)", url: "https://www.nature.com/articles/s41467-026-76978-3" },
  grew: { short: "Grew et al. 2011", url: "https://hazen.carnegiescience.edu/sites/default/files/220-Grew-Borates-OLEB-2011.pdf" },
  jelavic: { short: "Jelavic et al. 2017", url: "https://pubs.rsc.org/en/content/articlehtml/2017/cc/c7cc04276k" },
  gregoire: { short: "Gregoire et al. 2016", url: "https://doi.org/10.1016/j.gca.2015.12.026" },
  sand: { short: "Sand et al. 2024", url: "https://onlinelibrary.wiley.com/doi/full/10.1002/edn3.519" },
  alejandre: { short: "Alejandre et al. 2025", url: "https://arxiv.org/pdf/2411.05795" },
  louca: { short: "Louca et al. 2018", url: "https://pubmed.ncbi.nlm.nih.gov/30061564/" },
};
const cite = (...keys) => keys.map((k) => V8_REFS[k] ? `<a href="${V8_REFS[k].url}" target="_blank" rel="noopener">${esc(V8_REFS[k].short)}</a>` : "").filter(Boolean).join(", ");

/* ------------------------------ environmental tracks ------------------------------ */

const LUM = (a) => 1 / (1 + 0.4 * (a / 4.57)); // Gough 1981, a = age in Ga
const DEFICIT = (a) => -238.2 * (1 - LUM(a)); // W per m2: 1361 / 4 x (1 - 0.3 albedo) x (1 - L)

function co2Curve(P) {
  const moon = P.moonAgeGa || 4.47;
  const ts = moon - (P.solidifyMyr != null ? P.solidifyMyr : 2) / 1000;
  const td = ts - Math.max(1, P.co2DrawdownMyr != null ? P.co2DrawdownMyr : 30) / 1000;
  return { moon, ts, td };
}

const TRACKS = [
  { id: "events", label: "Events and the window", kind: "events", h: 58 },
  { id: "sun", label: "Sunlight", unit: "% of today", min: 65, max: 85, scale: "lin", refs: ["gough"],
    val: (a) => ({ v: 100 * LUM(a) }),
    note: "Gough 1981: the young Sun gave about 70 per cent of today's light, rising slowly." },
  { id: "temp", label: "Surface temperature", unit: "C", min: 0, max: 100, scale: "lin", refs: ["kt", "knauth"],
    opts: { model: "Cooling curve of this app", kt: "Temperate, 0 to 50 C (Krissansen-Totton et al. 2018)", knauth: "Hot, 55 to 85 C (Knauth 2005)" },
    def: "model",
    val: (a, P, o) => {
      if (o === "kt") return a <= 4.0 ? { v: 25, lo: 0, hi: 50 } : { v: null, why: "not covered before 4.0 Ga" };
      if (o === "knauth") return a <= 3.8 ? { v: 70, lo: 55, hi: 85 } : { v: 70, lo: 55, hi: 85, dashed: true, why: "extended back from the Archean" };
      return { v: tempAtAge(P.coolingAnchors, a), dashed: a < 4.0 };
    },
    note: "Krissansen-Totton et al. 2018 model a temperate Archean (0 to 50 C); Knauth 2005 reads chert oxygen isotopes as 55 to 85 C. The cooling curve is the one used by this app for the Hadean." },
  { id: "ph", label: "Ocean pH", unit: "", min: 5.5, max: 9, scale: "lin", refs: ["kt"],
    opts: { kt: "Carbon-cycle model (Krissansen-Totton et al. 2018)", mine: "The pH set in the app" }, def: "kt",
    val: (a, P, o) => {
      if (o === "mine") return { v: P.surfacePH };
      if (a > 4.0) return { v: 6.6, lo: 6.2, hi: 7.2, dashed: true, why: "held at the 4.0 Ga value" };
      const f = Math.min(1, (4.0 - a) / 1.5);
      return { v: 6.6 + 0.4 * f, lo: 6.6 + 0.4 * f - (0.4 + 0.1 * f), hi: 6.6 + 0.4 * f + (0.6 + 0.1 * f) };
    },
    note: "Ocean pH rises from 6.6 (+0.6 / -0.4) at 4.0 Ga to 7.0 (+0.7 / -0.5) at 2.5 Ga as CO2 falls. Vent fluids and some pools are far more alkaline than the ocean." },
  { id: "sal", label: "Ocean salinity", unit: "g per kg", min: 20, max: 80, scale: "lin", refs: ["knauth", "marty"],
    opts: { knauth: "1.5 to 2 times today (Knauth 2005)", marty: "About today (Marty et al. 2018)" }, def: "knauth",
    val: (a, P, o) => (o === "marty" ? { v: 35 } : { v: 61, lo: 52, hi: 70 }),
    note: "Knauth 2005: no large continents to store salt, so the early ocean was 1.5 to 2 times saltier. Fluid inclusions in Archean quartz (Marty et al. 2018) suggest about today's salinity." },
  { id: "co2", label: "CO2 in the air", unit: "bar", min: 0.1, max: 300, scale: "log", refs: ["zahnle", "korenaga"],
    val: (a, P) => {
      const c = co2Curve(P);
      if (a > c.ts) return { v: null, why: "magma ocean, before the surface froze" };
      if (a >= c.td) return { v: 100 * Math.exp(-Math.log(100) * (c.ts - a) / Math.max(1e-6, c.ts - c.td)) };
      return { v: 1, dashed: true, why: "after ingassing; not modelled further" };
    },
    note: "About 100 bar after the surface froze (order of magnitude, Zahnle et al. 2007), taken back into the rock over the ingassing time set on the start page. Afterwards drawn flat at 1 bar, which is not a model." },
  { id: "cloud", label: "Faint Sun and clouds", unit: "W per m2", min: -70, max: 30, scale: "lin", refs: ["goldblatt", "rosing"],
    opts: { today: "Clouds as today", fewer: "Fewer low clouds, +10 to +15 (Goldblatt and Zahnle 2011)", none: "No low clouds, +25 (upper bound)" }, def: "fewer",
    val: (a, P, o) => ({ v: DEFICIT(a), cloud: o === "today" ? [0, 0] : (o === "none" ? [25, 25] : [10, 15]) }),
    note: "Less sunlight is a forcing of about -50 W per m2 in the late Archean. Removing all low clouds gives +25; more modest changes +10 to +15 (Goldblatt and Zahnle 2011). Rosing et al. 2010 proposed fewer clouds and a darker Earth, because there were fewer continents and no biological cloud seeds." },
  { id: "o2", label: "Oxygen in the air", unit: "times today", min: 1e-14, max: 1, scale: "log", refs: ["pavlov", "kasting"],
    val: (a) => (a > 2.3 ? { v: 1e-13, hi: 1e-5 } : { v: null, why: "oxygen rises after 2.3 Ga" }),
    note: "Sulfur isotopes need O2 below 1e-5 times today's level before 2.3 Ga; a more realistic value is 1e-13 (Pavlov and Kasting 2002)." },
  { id: "uv", label: "UV at the surface", kind: "band", refs: ["ranjan"],
    opts: { clear: "Clear air: UV-C reaches the ground", so2: "Volcanic SO2 or H2S at 1 to 100 ppm" }, def: "clear",
    val: (a, P, o) => (a > 2.3 ? { text: o === "so2" ? "UV-C strongly dimmed by SO2 and H2S" : "UV-C reaches the ground (no ozone)", lvl: o === "so2" ? 0.35 : 1 } : { text: "ozone forms after the oxygen rise", lvl: 0.1 }),
    note: "With no ozone, UV down to about 200 nm reaches the ground; CO2 screens below 189 nm and water below 198 nm. SO2 or H2S at 1 to 100 ppm would dim it strongly (Ranjan and Sasselov 2017)." },
  { id: "felsic", label: "Felsic share of exposed crust", unit: "fraction", min: 0, max: 1, scale: "lin", refs: ["tang", "greber", "dhuime", "bernadet"],
    val: (a, P) => ({ v: felsicAt(P, a), others: Object.keys(FELSIC_CURVES).filter((k) => k !== "manual" && k !== P.felsicCurve).map((k) => felsicAt({ ...P, felsicCurve: k }, a)) }),
    note: "0 is all basalt, 1 all granite-like rock. Choose the curve in card 2." },
  { id: "land", label: "Exposed land", unit: "% of surface", min: 0, max: 45, scale: "lin", refs: ["korenaga", "bindeman"],
    opts: { k20: "Korenaga 2021, mid-Hadean land up to 20 %", k40: "Korenaga 2021, up to 40 %", islands: "Islands only until 3.0 Ga" }, def: "k20",
    val: (a, P, o) => {
      const mid = o === "k40" ? 40 : 20;
      if (a <= 3.0) { const f = Math.min(1, (3.0 - a) / 0.5); return { v: 1 + 28 * f }; }
      if (o !== "islands" && a <= 4.4 && a >= 4.2) return { v: mid, dashed: true, why: "mid-Hadean, ages are our reading" };
      return { v: 1, dashed: true, why: "islands only (drawn at 1 per cent)" };
    },
    note: "Korenaga 2021: maybe 20 per cent or more land in the mid-Hadean, then only isolated ocean islands in the late Hadean and early Archean, and regionally expansive land from 3.0 Ga. We place the mid-Hadean at 4.4 to 4.2 Ga and draw islands at 1 per cent; both are our reading. Bindeman et al. 2018: rapid emergence near 2.5 Ga, toward today's 29 per cent." },
  { id: "impact", label: "Impact rate after the Moon", unit: "relative", min: 1e-5, max: 10, scale: "log", refs: ["abramov"],
    val: (a, P) => {
      const t = ((P.moonAgeGa || 4.47) - a) * 1000;
      if (t <= 0) return { v: null, why: "before the Moon-forming impact" };
      const tau = 47, b = 0.8, rel = (x) => Math.pow(x / tau, b - 1) * Math.exp(-Math.pow(x / tau, b));
      return { v: rel(t) / rel(100) };
    },
    note: "Stretched exponential with a 47 Myr time scale (after Brasser et al., as used by Abramov et al. 2026), set to 1 at 100 Myr after the Moon-forming impact." },
];

/* --------------------------------- small charts --------------------------------- */

function timelineSvg(P, env, st, w) {
  const left = 168, right = 16, a0 = 4.6, a1 = st.range === "long" ? 2.0 : 3.5;
  const x = (a) => left + ((a0 - a) / (a0 - a1)) * (w - left - right);
  const shown = TRACKS.filter((t) => st.show[t.id] !== false);
  let y = 24, o = "";
  const tickStep = st.range === "long" ? 0.2 : 0.1;
  const H = shown.reduce((s, t) => s + (t.h || 50) + 8, 0) + 44;
  o += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" font-family="${FONT}" role="img" aria-label="Timeline of environmental parameters">`;
  o += `<rect width="${w}" height="${H}" fill="${C.surface}"/>`;
  // axis
  for (let a = a0; a >= a1 - 1e-9; a -= tickStep) {
    const xx = x(a);
    o += `<line x1="${xx}" y1="18" x2="${xx}" y2="${H - 22}" stroke="${C.border}" stroke-width="0.6"/>`;
    o += `<text x="${xx}" y="${H - 8}" font-size="10" fill="${C.muted}" text-anchor="middle" font-family="${MONO}">${a.toFixed(1)}</text>`;
  }
  o += `<text x="${left - 16}" y="${H - 8}" font-size="10" fill="${C.muted}" text-anchor="end">Ga, old to young</text>`;
  for (const t of shown) {
    const h = t.h || 50;
    const opt = st.opts[t.id] || t.def;
    o += `<text x="8" y="${y + 14}" font-size="11.5" font-weight="600" fill="${C.text}">${esc(t.label)}</text>`;
    if (t.unit != null && t.kind == null) o += `<text x="8" y="${y + 28}" font-size="10" fill="${C.muted}">${esc(t.unit)}</text>`;
    o += `<rect x="${left}" y="${y}" width="${w - left - right}" height="${h}" fill="none" stroke="${C.border}"/>`;
    if (t.kind === "events") {
      const nx = x(Math.min(a0, env.nearGa)), fx = x(Math.max(a1, env.farGa));
      if (env.farGa < env.nearGa) o += `<rect x="${nx}" y="${y}" width="${Math.max(0, fx - nx)}" height="${h}" fill="${C.cyan}" opacity="0.55"/>`;
      const evs = [
        { a: P.moonAgeGa || 4.47, l: "Moon", c: C.brown },
        { a: env.nearGa, l: "start", c: C.darkTeal, bold: true },
        { a: env.farGa, l: "LUCA", c: C.terra, bold: true },
        ...START_EVIDENCE.filter((e) => e.id === "zircon_water" || e.id === "fresh_land").map((e) => ({ a: e.age, l: e.id === "fresh_land" ? "fresh water, land" : "zircon water", c: C.muted })),
        { a: 3.0, l: "expansive land", c: C.muted }, { a: 2.5, l: "land emerges", c: C.muted }, { a: 2.3, l: "oxygen rises", c: C.muted },
      ].filter((e) => e.a <= a0 && e.a >= a1);
      evs.forEach((e, i) => {
        const xx = x(e.a);
        o += `<line x1="${xx}" y1="${y}" x2="${xx}" y2="${y + h}" stroke="${e.c}" stroke-width="${e.bold ? 2 : 1}"${e.bold ? "" : ' stroke-dasharray="3 2"'}/>`;
        o += `<text x="${xx + 3}" y="${y + 12 + (i % 3) * 14}" font-size="10" fill="${e.c}"${e.bold ? ' font-weight="700"' : ""}>${esc(e.l)}</text>`;
      });
      if (P.chemAgeGa != null) { const xx = x(P.chemAgeGa); o += `<path d="M${xx - 5} ${y + h} L${xx + 5} ${y + h} L${xx} ${y + h - 8} Z" fill="${C.gold}"/>`; }
    } else if (t.kind === "band") {
      let segA = a0, segL = t.val(a0, P, opt).lvl;
      const put = (aa, bb, lvl) => { o += `<rect x="${x(aa)}" y="${y + 4}" width="${Math.max(0, x(bb) - x(aa))}" height="${h - 8}" fill="${C.mauve}" opacity="${0.12 + 0.5 * lvl}"/>`; };
      for (let a = a0 - 0.01; a >= a1 - 1e-9; a -= 0.01) {
        const l = t.val(a, P, opt).lvl;
        if (l !== segL) { put(segA, a, segL); segA = a; segL = l; }
      }
      put(segA, a1, segL);
      const r0 = t.val(Math.min(4.3, a0), P, opt);
      o += `<text x="${left + 6}" y="${y + h / 2 + 4}" font-size="11" fill="#fff" font-weight="600">${esc(r0.text)}</text>`;
    } else {
      const ys = (v) => {
        if (v == null) return null;
        if (t.scale === "log") { const l = Math.log10(Math.max(t.min, Math.min(t.max, v))); return y + h - ((l - Math.log10(t.min)) / (Math.log10(t.max) - Math.log10(t.min))) * h; }
        return y + h - ((Math.max(t.min, Math.min(t.max, v)) - t.min) / (t.max - t.min)) * h;
      };
      const lab = (v) => t.scale === "log" ? "1e" + Math.round(Math.log10(v)) : String(v);
      o += `<text x="${left + 3}" y="${y + 10}" font-size="9" fill="${C.faint}" font-family="${MONO}">${lab(t.max)}</text>`;
      o += `<text x="${left + 3}" y="${y + h - 3}" font-size="9" fill="${C.faint}" font-family="${MONO}">${lab(t.min)}</text>`;
      let line = "", dline = "", band = [], bandLo = [], prevDashed = null, others = [];
      const pts = [];
      for (let a = a0; a >= a1 - 1e-9; a -= 0.01) pts.push([a, t.val(a, P, opt)]);
      // faint alternatives
      if (t.id === "felsic") {
        const n = pts[0][1].others.length;
        for (let k = 0; k < n; k++) others.push(pts.map(([a, r]) => `${x(a).toFixed(1)},${ys(r.others[k]).toFixed(1)}`).join(" "));
        others.forEach((s) => { o += `<polyline points="${s}" fill="none" stroke="${C.faint}" stroke-width="1"/>`; });
      }
      if (t.id === "cloud") {
        const zy = ys(0);
        o += `<line x1="${left}" y1="${zy}" x2="${w - right}" y2="${zy}" stroke="${C.faint}" stroke-width="0.8"/>`;
        const c = pts[0][1].cloud;
        const y1 = ys(c[1]), y0 = ys(c[0]);
        o += `<rect x="${left}" y="${Math.min(y0, y1) - 1}" width="${w - left - right}" height="${Math.abs(y0 - y1) + 2}" fill="${C.teal}" opacity="0.35"/>`;
        o += `<text x="${w - right - 4}" y="${Math.min(y0, y1) - 4}" font-size="9.5" fill="${C.teal}" text-anchor="end">clouds help</text>`;
        o += `<text x="${w - right - 4}" y="${ys(DEFICIT(a1)) + 12}" font-size="9.5" fill="${C.terra}" text-anchor="end">faint Sun</text>`;
      }
      for (const [a, r] of pts) {
        if (r.lo != null && r.v != null) { band.push(`${x(a).toFixed(1)},${ys(r.hi).toFixed(1)}`); bandLo.unshift(`${x(a).toFixed(1)},${ys(r.lo).toFixed(1)}`); }
        if (t.id === "o2" && r.hi != null) { band.push(`${x(a).toFixed(1)},${ys(r.hi).toFixed(1)}`); bandLo.unshift(`${x(a).toFixed(1)},${ys(r.v).toFixed(1)}`); }
      }
      if (band.length) o += `<polygon points="${band.join(" ")} ${bandLo.join(" ")}" fill="${t.id === "cloud" ? C.terra : C.teal}" opacity="0.18"/>`;
      let seg = [], segDashed = null;
      const flush = () => {
        if (seg.length > 1) o += `<polyline points="${seg.join(" ")}" fill="none" stroke="${t.id === "cloud" ? C.terra : C.darkTeal}" stroke-width="2"${segDashed ? ' stroke-dasharray="5 3"' : ""}/>`;
        seg = [];
      };
      for (const [a, r] of pts) {
        const yy = ys(r.v);
        if (yy == null) { flush(); segDashed = null; continue; }
        const d = !!r.dashed;
        if (segDashed !== null && d !== segDashed) { const last = seg[seg.length - 1]; flush(); if (last) seg.push(last); }
        segDashed = d; seg.push(`${x(a).toFixed(1)},${yy.toFixed(1)}`);
      }
      flush();
    }
    y += h + 8;
  }
  // cursor
  const cx = x(Math.max(a1, Math.min(a0, st.cursor)));
  o += `<line x1="${cx}" y1="14" x2="${cx}" y2="${H - 22}" stroke="${C.gold}" stroke-width="3" opacity="0.9"/>`;
  o += `<rect x="${cx - 30}" y="2" width="60" height="16" rx="3" fill="${C.gold}"/>`;
  o += `<text x="${cx}" y="14" font-size="11" font-weight="700" fill="${C.text}" text-anchor="middle" font-family="${MONO}">${st.cursor.toFixed(2)} Ga</text>`;
  o += `<rect class="tl-hit" x="${left}" y="0" width="${w - left - right}" height="${H - 18}" fill="transparent" style="cursor:ew-resize"/>`;
  o += "</svg>";
  return { svg: o, left, right, a0, a1, w };
}

function felsicSvg(P, env, w) {
  const h = 250, left = 46, right = 16, top = 14, bot = 70, a0 = 4.6, a1 = 2.0;
  const x = (a) => left + ((a0 - a) / (a0 - a1)) * (w - left - right);
  const y = (v) => top + (1 - v) * (h - top - bot);
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONT}" role="img" aria-label="Felsic share of the exposed crust through time"><rect width="${w}" height="${h}" fill="${C.surface}"/>`;
  for (let v = 0; v <= 1.001; v += 0.25) o += `<line x1="${left}" y1="${y(v)}" x2="${w - right}" y2="${y(v)}" stroke="${C.border}" stroke-width="0.6"/><text x="${left - 6}" y="${y(v) + 3}" font-size="10" text-anchor="end" fill="${C.muted}" font-family="${MONO}">${v.toFixed(2)}</text>`;
  for (let a = 4.6; a >= 1.99; a -= 0.2) o += `<text x="${x(a)}" y="${h - bot + 16}" font-size="10" text-anchor="middle" fill="${C.muted}" font-family="${MONO}">${a.toFixed(1)}</text>`;
  o += `<text x="${w - right}" y="${h - bot + 30}" font-size="10" text-anchor="end" fill="${C.muted}">Ga</text>`;
  if (env.farGa < env.nearGa) o += `<rect x="${x(Math.min(a0, env.nearGa))}" y="${top}" width="${Math.max(0, x(env.farGa) - x(Math.min(a0, env.nearGa)))}" height="${h - top - bot}" fill="${C.cyan}" opacity="0.5"/>`;
  const cols = { tang: C.terra, greber: C.teal, dhuime: C.olive, bernadet: C.mauve, manual: C.brown };
  for (const k of Object.keys(FELSIC_CURVES)) {
    if (k === "manual" && P.felsicCurve !== "manual") continue;
    const pts = [];
    for (let a = a0; a >= a1 - 1e-9; a -= 0.02) pts.push(`${x(a).toFixed(1)},${y(felsicAt({ ...P, felsicCurve: k }, a)).toFixed(1)}`);
    const sel = k === P.felsicCurve;
    o += `<polyline points="${pts.join(" ")}" fill="none" stroke="${cols[k]}" stroke-width="${sel ? 3 : 1.4}" opacity="${sel ? 1 : 0.65}"/>`;
  }
  const ca = chemAgeFor(P);
  o += `<line x1="${x(ca)}" y1="${top}" x2="${x(ca)}" y2="${h - bot}" stroke="${C.gold}" stroke-width="2"/><text x="${x(ca) + 4}" y="${top + 12}" font-size="10" fill="${C.text}">chemistry read here</text>`;
  let lx = left, ly = h - 26;
  for (const k of Object.keys(FELSIC_CURVES)) {
    if (k === "manual" && P.felsicCurve !== "manual") continue;
    const lab = FELSIC_CURVES[k].label;
    const wd = 22 + lab.length * 5.6;
    if (lx + wd > w - right) { lx = left; ly += 14; }
    o += `<rect x="${lx}" y="${ly - 4}" width="14" height="${k === P.felsicCurve ? 4 : 2}" fill="${cols[k]}"/><text x="${lx + 18}" y="${ly}" font-size="10" fill="${C.text}"${k === P.felsicCurve ? ' font-weight="700"' : ""}>${esc(lab)}</text>`;
    lx += wd + 10;
  }
  return o + "</svg>";
}

function zoomSvg(rows, xs, xLabel, w) {
  // Four small panels in a 2 by 2 grid.
  const pw = (w - 30) / 2, ph = 190;
  const H = ph * 2 + 40;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" font-family="${FONT}" role="img" aria-label="Physical conditions and their effects"><rect width="${w}" height="${H}" fill="${C.surface}"/>`;
  rows.forEach((r, i) => {
    const ox = 10 + (i % 2) * (pw + 10), oy = 10 + Math.floor(i / 2) * (ph + 22);
    const L = 44, R = 8, T = 22 + 12 * r.series.length, B = 22;
    const vals = r.series.flatMap((s) => s.v).filter((v) => v != null && isFinite(v));
    let lo = r.log ? Math.min(...vals.filter((v) => v > 0)) : Math.min(0, ...vals);
    let hi = Math.max(...vals);
    if (r.max != null) hi = r.max;
    if (r.log) { lo = Math.pow(10, Math.floor(Math.log10(Math.max(lo, 1e-30)))); hi = Math.pow(10, Math.ceil(Math.log10(Math.max(hi, lo * 10)))); }
    if (!(hi > lo)) hi = lo + 1;
    const X = (k) => ox + L + (k / (xs.length - 1)) * (pw - L - R);
    const Y = (v) => r.log ? oy + T + (1 - (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (ph - T - B) : oy + T + (1 - (v - lo) / (hi - lo)) * (ph - T - B);
    o += `<rect x="${ox}" y="${oy}" width="${pw}" height="${ph}" fill="none" stroke="${C.border}"/>`;
    o += `<text x="${ox + 6}" y="${oy + 13}" font-size="11.5" font-weight="600" fill="${C.text}">${esc(r.title)}</text>`;
    o += `<text x="${ox + L - 4}" y="${oy + T + 6}" font-size="9" text-anchor="end" fill="${C.faint}" font-family="${MONO}">${esc(sci(hi))}</text>`;
    o += `<text x="${ox + L - 4}" y="${oy + ph - B}" font-size="9" text-anchor="end" fill="${C.faint}" font-family="${MONO}">${esc(sci(lo))}</text>`;
    o += `<text x="${ox + L}" y="${oy + ph - 6}" font-size="9" fill="${C.faint}" font-family="${MONO}">${esc(String(xs[0]))}</text><text x="${ox + pw - R}" y="${oy + ph - 6}" font-size="9" text-anchor="end" fill="${C.faint}" font-family="${MONO}">${esc(String(xs[xs.length - 1]))}</text>`;
    o += `<text x="${ox + pw / 2 + L / 2}" y="${oy + ph - 6}" font-size="9.5" text-anchor="middle" fill="${C.muted}">${esc(xLabel)}</text>`;
    r.series.forEach((s, j) => {
      const pts = s.v.map((v, k) => (v == null || !isFinite(v) ? null : `${X(k).toFixed(1)},${Y(v).toFixed(1)}`)).filter(Boolean);
      o += `<polyline points="${pts.join(" ")}" fill="none" stroke="${s.c}" stroke-width="2"${s.dash ? ' stroke-dasharray="4 3"' : ""}/>`;
      o += `<rect x="${ox + L + 4}" y="${oy + 20 + j * 12}" width="10" height="3" fill="${s.c}"/><text x="${ox + L + 18}" y="${oy + 25 + j * 12}" font-size="9.5" fill="${C.text}">${esc(s.name)}</text>`;
    });
    if (r.mark != null) { const k = r.mark; o += `<line x1="${X(k)}" y1="${oy + T}" x2="${X(k)}" y2="${oy + ph - B}" stroke="${C.gold}" stroke-width="2"/>`; }
  });
  return o + "</svg>";
}

/* ------------------------------------ the module ------------------------------------ */

export function createV8(ctx) {
  const M = () => ctx.MODEL();
  const P = () => ctx.P();
  const segBtns = (sel, items, cur) => { const el = $(sel); if (el) el.innerHTML = items.map((it) => `<button data-v="${esc(it.v)}" aria-pressed="${String(it.v) === String(cur)}" title="${esc(it.title || "")}">${esc(it.label)}</button>`).join(""); };
  const segWire = (sel, cb) => { $$(sel + " button").forEach((b) => { b.onclick = () => cb(b.dataset.v); }); };
  const press = (sel, v) => $$(sel + " button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(v))));
  const st = { cursor: 4.2, range: "hadean", show: {}, opts: {}, zoomVar: "temp" };
  TRACKS.forEach((t) => { st.show[t.id] = true; if (t.def) st.opts[t.id] = t.def; });

  function build() {
    const p = P();
    // ---- timeline page
    segBtns("#tlStartSeg", [
      { v: "water", label: "Liquid water, 4.40 Ga (as before)" },
      { v: "islands", label: "Islands only, 4.00 Ga (Korenaga 2021)" },
      { v: "expansive", label: "Expansive land, 3.00 Ga (Korenaga 2021)" },
    ], p.nearMode === "event" ? p.nearEventId : "");
    segWire("#tlStartSeg", (v) => { const q = P(); q.nearMode = "event"; q.nearEventId = v; ctx.recompute(); });
    segBtns("#tlFarSeg", ["moody", "moodyYoung", "conservative", "isua"].map((id) => {
      const f = p.farOptions.find((x) => x.id === id); return { v: id, label: f ? f.label.split(" (")[0] + ", " + f.age.toFixed(2) + " Ga" : id };
    }), p.farMode === "event" ? p.farEventId : "");
    segWire("#tlFarSeg", (v) => { const q = P(); q.farMode = "event"; q.farEventId = v; ctx.recompute(); });
    segBtns("#tlLandSeg", Object.entries(LAND_STARTS).map(([k, v]) => ({ v: k, label: v.label })), p.landStart);
    segWire("#tlLandSeg", (v) => { P().landStart = v; ctx.recompute(); });
    segBtns("#tlFelsicSeg", Object.entries(FELSIC_CURVES).map(([k, v]) => ({ v: k, label: v.label })), p.felsicCurve);
    segWire("#tlFelsicSeg", (v) => { P().felsicCurve = v; ctx.recompute(); });
    $("#tlFelsicFields").innerHTML = ctx.sliderFor("felsicManual");
    ctx.wireParamInputs($("#tlFelsicFields"));
    segBtns("#tlBoronSeg", [{ v: "off", label: "Off, as before" }, { v: "on", label: "On: borate needs felsic crust" }], p.crustSetsBoron);
    segWire("#tlBoronSeg", (v) => { P().crustSetsBoron = v; ctx.recompute(); });
    segBtns("#tlMixSeg", [{ v: "off", label: "Off, as before" }, { v: "on", label: "On: land minerals follow the crust" }], p.crustSetsMix);
    segWire("#tlMixSeg", (v) => { P().crustSetsMix = v; ctx.recompute(); });
    segBtns("#tlRangeSeg", [{ v: "hadean", label: "4.6 to 3.5 Ga" }, { v: "long", label: "4.6 to 2.0 Ga" }], st.range);
    segWire("#tlRangeSeg", (v) => { st.range = v; press("#tlRangeSeg", v); drawTimeline(); });
    $("#tlTrackChips").innerHTML = TRACKS.map((t) => `<button class="chip" data-t="${t.id}" aria-pressed="true">${esc(t.label)}</button>`).join("");
    $$("#tlTrackChips .chip").forEach((b) => { b.onclick = () => { st.show[b.dataset.t] = !st.show[b.dataset.t]; b.setAttribute("aria-pressed", String(st.show[b.dataset.t])); drawTimeline(); }; });
    $("#tlTrackOpts").innerHTML = TRACKS.filter((t) => t.opts).map((t) => `<div class="field"><label><span class="flabel">${esc(t.label)}</span></label><select class="tl-opt" data-t="${t.id}">${Object.entries(t.opts).map(([k, l]) => `<option value="${k}"${st.opts[t.id] === k ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`).join("");
    $$("#tlTrackOpts select").forEach((s) => { s.onchange = () => { st.opts[s.dataset.t] = s.value; drawTimeline(); }; });
    $("#tlUseBtn").onclick = useConditions;
    $("#tlResetBtn").onclick = () => { P().chemAgeGa = null; ctx.toast("Chemistry is read at the start date again"); ctx.recompute(); };
    $("#tlToStart").onclick = () => { st.cursor = computeEnvelope(P()).nearGa; drawTimeline(); };
    const fig = $("#figTimeline");
    let drag = false;
    const setFromEvent = (ev) => {
      const svg = fig.querySelector("svg"); if (!svg || !st.geom) return;
      const r = svg.getBoundingClientRect();
      const sx = ((ev.clientX - r.left) / r.width) * st.geom.w;
      const g = st.geom;
      const a = g.a0 - ((sx - g.left) / (g.w - g.left - g.right)) * (g.a0 - g.a1);
      st.cursor = Math.max(g.a1, Math.min(g.a0, Math.round(a * 100) / 100));
      drawTimeline();
    };
    fig.addEventListener("pointerdown", (ev) => { if (ev.target.closest("svg")) { drag = true; fig.setPointerCapture && fig.setPointerCapture(ev.pointerId); setFromEvent(ev); } });
    fig.addEventListener("pointermove", (ev) => { if (drag) setFromEvent(ev); });
    const stop = () => { drag = false; };
    fig.addEventListener("pointerup", stop); fig.addEventListener("pointercancel", stop); fig.addEventListener("pointerleave", stop);
    fig.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") { st.cursor = +(st.cursor + (ev.key === "ArrowLeft" ? 0.01 : -0.01)).toFixed(2); drawTimeline(); ev.preventDefault(); }
    });

    // ---- minerals page
    const presets = [...Object.entries(MIX_PRESETS).map(([k, v]) => ({ v: k, label: v.label })), { v: "crust", label: "From the crust at the chemistry time" }];
    segBtns("#mxPresetSeg", presets, "");
    segWire("#mxPresetSeg", (v) => {
      const q = P();
      q.mineralMix = v === "crust" ? roundMix(blendMix(felsicAt(q, chemAgeFor(q)))) : { ...MIX_PRESETS[v].mix };
      buildMixSliders(); ctx.recompute();
    });
    buildMixSliders();
    segBtns("#mxUseSeg", [{ v: "no", label: "No, keep the surface setting" }, { v: "yes", label: "Yes, every setting uses this mix" }], p.surfaceMode === "mix" ? "yes" : "no");
    segWire("#mxUseSeg", (v) => { const q = P(); if (v === "yes") { if (q.surfaceMode !== "mix") q._prevSurfaceMode = q.surfaceMode; q.surfaceMode = "mix"; } else { q.surfaceMode = q._prevSurfaceMode && q._prevSurfaceMode !== "mix" ? q._prevSurfaceMode : "scenario"; } ctx.rebuild(); ctx.recompute(); });
    $("#mxConfFields").innerHTML = ["confinement", "confProtect", "confActivity"].map(ctx.sliderFor).join("");
    ctx.wireParamInputs($("#mxConfFields"));
    // zoom
    segBtns("#zmVarSeg", [
      { v: "temp", label: "Temperature" }, { v: "sal", label: "Salinity" }, { v: "ph", label: "pH" }, { v: "mg", label: "Mg2+ and Ca2+" }, { v: "phi", label: "Porosity" },
    ], st.zoomVar);
    segWire("#zmVarSeg", (v) => { st.zoomVar = v; press("#zmVarSeg", v); drawZoom(); });
    $("#zmFields").innerHTML = ["salinityGkg", "adsDH", "divalentMM"].map(ctx.sliderFor).join("");
    ctx.wireParamInputs($("#zmFields"));
    // build-up
    segBtns("#buOnSeg", [{ v: "off", label: "Off, as before" }, { v: "on", label: "On: chains must grow" }], p.buildupOn);
    segWire("#buOnSeg", (v) => { P().buildupOn = v; ctx.recompute(); });
    segBtns("#buWhereSeg", [{ v: "own", label: "Each setting's own place" }, ...Object.entries(BUILDUP_VENUES).map(([k, v]) => ({ v: k, label: v.label.split(",")[0] }))], p.buildupWhere);
    segWire("#buWhereSeg", (v) => { P().buildupWhere = v; ctx.recompute(); });
    segBtns("#buMolSeg", [{ v: "nucleotide", label: "Nucleotides into RNA" }, { v: "aminoacid", label: "Amino acids into peptides" }], p.buildupMolecule);
    segWire("#buMolSeg", (v) => { P().buildupMolecule = v; ctx.recompute(); });
    segBtns("#buMixSeg", [{ v: "venue", label: "The place's own minerals" }, { v: "mine", label: "My mineral mix" }], p.buildupMix);
    segWire("#buMixSeg", (v) => { P().buildupMix = v; ctx.recompute(); });
    segBtns("#buCondSeg", [{ v: "venue", label: "The place's own pH, salt and porosity" }, { v: "mine", label: "The values I set" }], p.buildupCond);
    segWire("#buCondSeg", (v) => { P().buildupCond = v; ctx.recompute(); });
    $("#buFields").innerHTML = ["buildupLength", "buildupAlpha", "buildupPorosity", "yieldPerCycle", "lossPerCycle"].map(ctx.sliderFor).join("");
    ctx.wireParamInputs($("#buFields"));
  }

  function roundMix(m) { const o = {}; for (const [k, v] of Object.entries(m)) if (v > 0.05) o[k] = Math.round(v * 10) / 10; return o; }

  function buildMixSliders() {
    const p = P();
    const mins = (M().minerals || []).filter((m) => m.id !== "none");
    $("#mxSliders").innerHTML = mins.map((m) => `<div class="mx-row"><label for="mx_${m.id}">${esc(m.name)}</label><input type="range" id="mx_${m.id}" data-m="${m.id}" min="0" max="100" step="1" value="${Math.round(p.mineralMix[m.id] || 0)}"><output id="mxo_${m.id}">${Math.round(p.mineralMix[m.id] || 0)}</output></div>`).join("");
    $$("#mxSliders input").forEach((el) => {
      el.oninput = () => {
        const q = P(); q.mineralMix = { ...q.mineralMix, [el.dataset.m]: +el.value };
        if (!(+el.value)) delete q.mineralMix[el.dataset.m];
        $("#mxo_" + el.dataset.m).textContent = el.value;
        ctx.recompute();
      };
    });
  }

  function useConditions() {
    const p = P();
    const a = st.cursor;
    const tT = TRACKS.find((t) => t.id === "temp").val(a, p, st.opts.temp);
    const tP = TRACKS.find((t) => t.id === "ph").val(a, p, st.opts.ph);
    const tS = TRACKS.find((t) => t.id === "sal").val(a, p, st.opts.sal);
    const set = [];
    if (tT.v != null) { p.tempMode = "manual"; p.chemTempC = Math.round(tT.v); set.push(`temperature ${Math.round(tT.v)} C`); }
    if (tP.v != null) { p.surfacePH = Math.round(tP.v * 10) / 10; set.push(`pH ${p.surfacePH}`); }
    if (tS.v != null) { p.salinityGkg = Math.round(tS.v); set.push(`salinity ${p.salinityGkg} g per kg`); }
    p.chemAgeGa = a;
    set.push(`crust read at ${a.toFixed(2)} Ga`);
    ctx.toast("Using the conditions at " + a.toFixed(2) + " Ga: " + set.join(", "));
    ctx.rebuild(); ctx.recompute();
  }

  function drawTimeline() {
    const p = P();
    const env = st.env || computeEnvelope(p);
    const el = $("#figTimeline"); if (!el) return;
    const w = Math.max(640, ctx.figW(Math.max(900, el.clientWidth || 1180)));
    const g = timelineSvg(p, env, st, w);
    st.geom = g;
    ctx.setFig("timeline", g.svg, "#figTimeline");
    const a = st.cursor;
    const rows = TRACKS.filter((t) => t.id !== "events" && st.show[t.id] !== false).map((t) => {
      const o = st.opts[t.id] || t.def;
      const r = t.val(a, p, o);
      let v;
      if (t.kind === "band") v = r.text;
      else if (t.id === "cloud") v = `Faint Sun ${f2(r.v, 0)}; clouds help +${r.cloud[0]}${r.cloud[1] !== r.cloud[0] ? " to +" + r.cloud[1] : ""}; left for greenhouse gases ${f2(-(r.v + r.cloud[1]), 0)} or more`;
      else if (r.v == null) v = r.why || "n/a";
      else v = (t.scale === "log" ? sci(r.v) : f2(r.v, t.id === "ph" ? 1 : (t.id === "felsic" ? 2 : 0))) + (r.lo != null ? ` (${t.scale === "log" ? sci(r.lo) : f2(r.lo, t.id === "ph" ? 1 : 0)} to ${t.scale === "log" ? sci(r.hi) : f2(r.hi, t.id === "ph" ? 1 : 0)})` : (t.id === "o2" && r.hi ? ` (upper limit ${sci(r.hi)})` : "")) + (r.why ? `, ${r.why}` : "");
      return { cells: [esc(t.label), esc(t.unit || ""), esc(v), esc(t.opts ? t.opts[o] : ""), cite(...(t.refs || []))] };
    });
    ctx.table($("#tblTimelineRead"), ["Track", "Unit", `At ${a.toFixed(2)} Ga`, "Curve used", "Sources"], rows);
    $("#tlCursorRead").innerHTML = `The bar is at <b>${a.toFixed(2)} Ga</b>${a <= env.nearGa && a >= env.farGa ? ", inside the window" : (a > env.nearGa ? ", before the start of the clock" : ", after the LUCA date")}. Drag it, or use the arrow keys after clicking the figure.`;
    $("#tlUseRead").innerHTML = p.chemAgeGa != null ? `The chemistry now uses the conditions read at <b>${p.chemAgeGa.toFixed(2)} Ga</b>: ${p.chemTempC} C, pH ${p.surfacePH}, salinity ${p.salinityGkg} g per kg. The pH is used where one pH applies to all settings (one surface for all, or a mineral mix).` : "The chemistry uses the start date for the crust and the values set elsewhere for temperature, pH and salinity.";
  }

  function drawZoom() {
    const p = P();
    const mins = M().minerals || [];
    const mix = mixMineral(p.mineralMix, mins, "Your mineral mix");
    const n = 31;
    const ranges = {
      temp: { lab: "temperature, C", f: (k) => 100 * k / (n - 1), base: p.effectiveTempC },
      sal: { lab: "salinity, g per kg", f: (k) => 1 + 149 * k / (n - 1), base: p.salinityGkg },
      ph: { lab: "pH", f: (k) => 5 + 7 * k / (n - 1), base: p.surfacePH },
      mg: { lab: "Mg2+ and Ca2+, mM", f: (k) => Math.pow(10, -1 + 3 * k / (n - 1)), base: p.divalentMM },
      phi: { lab: "porosity", f: (k) => 0.3 + 0.65 * k / (n - 1), base: p.buildupPorosity },
    };
    const R = ranges[st.zoomVar];
    const xs = [], sites = [], held = [], K = [], act = [], brk = [], pL = [], mean = [];
    let mark = 0, best = Infinity;
    const sc = M().scenarios.find((s) => s.id === "SC2");
    for (let k = 0; k < n; k++) {
      const v = R.f(k); xs.push(st.zoomVar === "mg" ? +v.toPrecision(2) : +v.toFixed(st.zoomVar === "phi" ? 2 : 0));
      if (Math.abs(v - R.base) < best) { best = Math.abs(v - R.base); mark = k; }
      const q = { ...p };
      let tempC = p.effectiveTempC, pH = p.surfacePH, phi = p.buildupPorosity;
      if (st.zoomVar === "temp") { tempC = v; q.effectiveTempC = v; }
      if (st.zoomVar === "sal") q.salinityGkg = v;
      if (st.zoomVar === "ph") pH = v;
      if (st.zoomVar === "mg") q.divalentMM = v;
      if (st.zoomVar === "phi") phi = v;
      const loading = loadingFromPorosity(phi);
      const s = surfaceState(mix, { pH, loading, tempC }, q);
      const free = s.parts.reduce((a, x) => a + x.qmax * loading * x.w * (1 - x.theta), 0);
      sites.push(free); held.push(s.fBound); K.push(s.K);
      act.push(s.parts.reduce((a, x) => a + (x.x / Math.max(1e-30, s.x)) * (1 - x.theta) * (1 - x.mineral.f_locked), 0) * (s.confAct != null ? s.confAct : 1));
      const b = buildupFor(sc, { ...q, buildupMix: "mine", buildupCond: "mine", surfacePH: pH, buildupPorosity: phi, buildupWhere: "tidal" }, M(), 43200);
      brk.push(b.hFree / b.pf); pL.push(b.p); mean.push(b.meanLen);
    }
    const w = Math.max(560, ctx.figW(Math.max(900, $("#figZoom").clientWidth || 1180)));
    const rows = [
      { title: "Free active sites", series: [{ name: "umol per L of pore water", v: sites, c: C.teal }], log: true, mark },
      { title: "Binding strength", series: [{ name: "K, L per umol", v: K, c: C.terra }, { name: "share held, 0 to 1", v: held, c: C.darkTeal, dash: true }], log: true, mark },
      { title: "Activity of bound dimers and polymers", series: [{ name: "share free to react", v: act, c: C.olive }, { name: "breaking per cycle", v: brk, c: C.mauve, dash: true }], log: true, mark },
      { title: `Build-up to ${p.buildupLength} units (tidal flat)`, series: [{ name: "chance to reach the length", v: pL, c: C.darkTeal }, { name: "mean length / 100", v: mean.map((m) => m / 100), c: C.gold, dash: true }], log: true, mark },
    ];
    ctx.setFig("zoom", zoomSvg(rows, xs, R.lab, w), "#figZoom");
  }

  function render(env, results) {
    const p = P(), m = M();
    st.env = env;
    if (!st._init) { st.cursor = Math.round(((env.nearGa + Math.max(env.farGa, 3.5)) / 2) * 100) / 100; st._init = true; }
    // --- start and land
    press("#tlStartSeg", p.nearMode === "event" ? p.nearEventId : "");
    press("#tlFarSeg", p.farMode === "event" ? p.farEventId : "");
    press("#tlLandSeg", p.landStart);
    const fits = results.filter((r) => isFinite(r.total) && r.total <= env.budgetMyr).length;
    const near = p.nearOptions.find((x) => x.id === p.nearEventId);
    $("#tlStartRead").innerHTML = `${near && p.nearMode === "event" ? esc(near.basis) + (near.id === "islands" || near.id === "expansive" ? " " + cite("korenaga") + "." : "") + " " : ""}Window now: <b>${env.nearGa.toFixed(2)} to ${env.farGa.toFixed(2)} Ga</b>, ${env.budgetMyr > 0 ? `<b>${fmtMyr(env.budgetMyr)} Myr</b>; ${fits} of ${results.length} settings fit.` : "<b>no window is left</b>, because the start is younger than the LUCA date. Choose a younger LUCA date, such as the conservative 3.80 Ga, to open a window again."}`;
    const L = LAND_STARTS[p.landStart] || LAND_STARTS.same;
    const pools = results.find((r) => r.scenario.requires_subaerial_land);
    $("#tlLandRead").innerHTML = `${esc(L.plain)} ${cite(p.landStart === "emergence" ? "bindeman" : (p.landStart === "same" ? "" : "korenaga"))}${pools ? ` For ${esc(pools.scenario.name.toLowerCase())}, the wait for land adds <b>${fmtMyr(pools.landDelay || 0)} Myr</b> to the time to appear, and the total is <b>${fmtMyr(pools.total)} Myr</b>${isFinite(pools.total) && pools.total <= env.budgetMyr ? ", which fits" : ", which does not fit"}.` : ""}`;
    // --- felsic
    press("#tlFelsicSeg", p.felsicCurve);
    press("#tlBoronSeg", p.crustSetsBoron);
    press("#tlMixSeg", p.crustSetsMix);
    $("#tlFelsicFields").hidden = p.felsicCurve !== "manual";
    const fc = FELSIC_CURVES[p.felsicCurve];
    const ca = chemAgeFor(p), f = felsicAt(p, ca);
    const sc2 = m.scenarios.find((s) => s.requires_subaerial_land) || m.scenarios[1];
    const B = p.borateFactor > 1 ? p.borateFactor : 16;
    const bor = borateFor(sc2, { ...p, riboseStep: "on", crustSetsBoron: "on", borateFactor: B });
    const mix = blendMix(f);
    const mixTxt = Object.entries(mix).filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${(m.minerals.find((x) => x.id === k) || { name: k }).name.split(" (")[0].toLowerCase()} ${Math.round(v)}`).join(", ");
    $("#tlFelsicRead").innerHTML = `${esc(fc.plain)} ${cite(p.felsicCurve)}<br>At <b>${ca.toFixed(2)} Ga</b>${p.chemAgeGa != null ? " (set from the timeline)" : " (the start date)"}, the felsic share is <b>${f2(f, 2)}</b>. With the boron link on, borate at ${B} times${p.borateFactor > 1 ? "" : " (80 mM, as on the start and supply page)"} would give <b>${f2(bor.factor, 1)} times</b> instead, because borate minerals form from felsic crust (${cite("grew")}). With the mineral link on, sediment on land would be weight per cent: ${esc(mixTxt)}.`;
    ctx.setFig("felsic", felsicSvg(p, env, Math.max(560, ctx.figW(Math.max(900, $("#figFelsic").clientWidth || 1180)))), "#figFelsic");
    press("#tlRangeSeg", st.range);
    drawTimeline();
    ctx.table($("#tblTimelineLit"), ["Track", "What the curve says", "Sources"], TRACKS.filter((t) => t.note).map((t) => ({ cells: [esc(t.label), esc(t.note), cite(...(t.refs || []))] })));

    // --- minerals page
    if (!$("#v-minerals")) return;
    press("#mxUseSeg", p.surfaceMode === "mix" ? "yes" : "no");
    const mm = mixMineral(p.mineralMix, m.minerals, "Your mineral mix");
    const s = surfaceState(mm, { pH: p.surfacePH, loading: p.surfaceLoading, tempC: p.effectiveTempC }, p);
    const wsum = Object.values(p.mineralMix).reduce((a, b) => a + (+b || 0), 0);
    const kp = (k, v, n) => `<div class="kpi"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div>${n ? `<div class="n">${esc(n)}</div>` : ""}</div>`;
    $("#mxKpis").innerHTML = s.none ? `<p class="hint">Add some mineral to the mix.</p>` : [
      kp("Share held on minerals", pct(s.fBound, 1), `at ${p.surfaceLoading} g per L, pH ${p.surfacePH}`),
      kp("Concentration gain", sci(s.cf) + " x", "how much more crowded the bound layer is"),
      kp("Protection", sci(s.pfEff) + " x", s.confinement ? `confined share ${f2(s.confinement, 2)}` : "no confinement"),
      kp("Activity gain", sci(s.s4Gain) + " x", "for joining on the surface (S4)"),
    ].join("");
    ctx.table($("#tblMix"), ["Mineral", { label: "Weight", n: true }, { label: "Share of what is held", n: true }, { label: "Binding K, L per umol", n: true }, { label: "Locked share", n: true }, { label: "Why it binds", cls: "why" }],
      s.none ? [] : s.parts.map((q) => ({ cells: [esc(q.mineral.name), (100 * q.w).toFixed(0) + " %", pct(q.x / Math.max(1e-30, s.x), 1), sci(q.K), f2(q.mineral.f_locked, 2), esc((q.mineral.why || "").slice(0, 220))] })));
    $("#mxRead").innerHTML = s.none ? "" : `The weights add to ${Math.round(wsum)} and are scaled to 100. ${p.surfaceMode === "mix" ? "Every setting now uses this mix on the surface steps S2 to S4." : "The mix is used here and, if chosen, in the build-up step. To use it on the surface steps of every setting, choose yes above."}`;
    drawZoom();
    // build-up
    press("#buOnSeg", p.buildupOn); press("#buWhereSeg", p.buildupWhere); press("#buMolSeg", p.buildupMolecule); press("#buMixSeg", p.buildupMix); press("#buCondSeg", p.buildupCond);
    const tC = results[0] ? results[0].tCycleS : 43200;
    const vrows = Object.entries(BUILDUP_VENUES).map(([id, v]) => {
      const b = buildupFor(sc2, { ...p, buildupWhere: id }, m, tC);
      return { _cls: p.buildupWhere === id ? "sel" : "", cells: [esc(v.label), esc(b.mineral.name), sci(b.loading), String(b.salinity), String(b.pH), f2(v.drive, 2), pct(b.r1, 1), sci(b.p), f2(b.meanLen, 1), esc(fmtTime(b.timeS))] };
    });
    ctx.table($("#tblVenues"), ["Place", "Minerals", { label: "Mineral load, g per L", n: true }, { label: "Salt, g per kg", n: true }, { label: "pH", n: true }, { label: "Drying drive", n: true }, { label: "Shed chain caught again", n: true }, { label: `Chance to reach ${p.buildupLength}`, n: true }, { label: "Mean length", n: true }, "Time"], vrows);
    const srows = results.map((r) => {
      const b = r.buildup || buildupFor(r.scenario, p, m, r.tCycleS);
      return { cells: [esc(r.scenario.id + " " + r.scenario.name), esc(b.venue.label), sci(b.p), f2(b.meanLen, 1), p.buildupOn === "on" ? fmtMyr(r.total) + " Myr" : "switch on to count"] };
    });
    ctx.table($("#tblBuildupSettings"), ["Setting", "Where chains grow", { label: `Chance to reach ${p.buildupLength}`, n: true }, { label: "Mean length", n: true }, { label: "Total", n: true }], srows);
    const sandRows = Object.entries(SAND_MAP).map(([id, sid]) => {
      const mi = m.minerals.find((x) => x.id === id); if (!mi) return null;
      const a = surfaceState(mi, { pH: 7, loading: loadingFromPorosity(0.3) }, p), b = surfaceState(mi, { pH: 7, loading: loadingFromPorosity(0.9) }, p);
      return { cells: [esc(mi.name) + (sid !== id ? ` (as ${sid})` : ""), f2(100 * (1 - a.fBound), 2), String(SAND_PORE[sid][0]), f2(100 * (1 - b.fBound), 2), String(SAND_PORE[sid][1])] };
    }).filter(Boolean);
    ctx.table($("#tblSand"), ["Mineral", { label: "Model, porosity 0.3", n: true }, { label: "Measured", n: true }, { label: "Model, porosity 0.9", n: true }, { label: "Measured", n: true }], sandRows);
    // tidal-zone verdict with live numbers
    const bt = buildupFor(sc2, { ...p, buildupWhere: "tidal" }, m, tC), bp = buildupFor(sc2, { ...p, buildupWhere: "pond" }, m, tC), bo = buildupFor(sc2, { ...p, buildupWhere: "open" }, m, tC), be = buildupFor(sc2, { ...p, buildupWhere: "estuary" }, m, tC);
    $("#buTidalNums").innerHTML = `With the values set now, a chain reaches ${p.buildupLength} units with chance <b>${sci(bt.p)}</b> on a tidal flat, <b>${sci(bp.p)}</b> in pond sediment, <b>${sci(be.p)}</b> at a river mouth that does not dry, and <b>${sci(bo.p)}</b> in open water. Mean lengths: ${f2(bt.meanLen, 1)}, ${f2(bp.meanLen, 1)}, ${f2(be.meanLen, 1)} and ${f2(bo.meanLen, 1)} units.`;
  }

  return { build, render, TRACKS };
}

function fmtTime(sec) {
  if (!isFinite(sec)) return "never";
  const y = sec / 3.15576e7;
  if (y < 1 / 365) return (sec / 3600).toFixed(1) + " h";
  if (y < 1) return (y * 365).toFixed(0) + " days";
  if (y < 1e3) return y.toFixed(1) + " years";
  if (y < 1e6) return (y / 1e3).toFixed(1) + " thousand years";
  return (y / 1e6).toFixed(2) + " Myr";
}
