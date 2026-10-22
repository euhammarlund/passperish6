// The guided entry: four simple views on top of the same engine. Every number
// here comes from the same audit as the full workbench, so the two never disagree.

import {
  auditScenario, verdictAgainstBudget, handoffState, computeT5, timeLeft, cycleSweep, cycleCurrency, CURRENCY_SOURCES, geomean,
  fmtSci, fmtMyr, fmtMyr as fmtMyrBase, secPerYr, secPerMyr,
} from "./engine.js";
import { defaultParams, SPEC } from "./params.js";
import { computeMatters } from "./matters.js";
import { hypoScenarios, HANDOFF_NEEDS, PLACES, conflictsOf } from "./hypo.js";
import { humanTime, TERM_COL } from "./charts.js";
import { sceneSvg, STEP_ORDER, KIND_COLS, linkList } from "./scenes.js";

const C = {
  teal: "#20808d", terra: "#a84b2f", darkTeal: "#1b474d", cyan: "#bce2e7", mauve: "#944454",
  gold: "#ffc553", olive: "#848456", text: "#28251d", muted: "#6e6b63", faint: "#a8a49b",
  border: "#d9d5cc", surface: "#fdfdfb", fail: "#a13544", marginal: "#c08a1e", light: "#f1efe9",
};
const FONT = "Switzer, system-ui, sans-serif";
const MONO = "JetBrains Mono, ui-monospace, monospace";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tx = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.fill || C.text}" font-size="${o.size || 11}" font-weight="${o.weight || 400}" text-anchor="${o.anchor || "start"}"${o.mono ? ` font-family="${MONO}"` : ""}>${esc(s)}</text>`;
const svgOpen = (w, h, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}" font-family="${FONT}"><rect width="${w}" height="${h}" fill="${C.surface}"/>`;
const S_YR = secPerYr;

/* ---------------- plain words for each setting ---------------- */

const STORY = {
  SC1: { short: "Warm alkaline fluid meets an acidic, CO2-rich ocean inside the pores of a chimney.",
    where: { S1: "on the iron-sulfur walls of the pores", S2: "inside the pores, out of the open ocean", S3: "on green rust and clay lining the pores", S4: "on Fe and Ni sulfide, where H2 meets CO2" },
    cycle: "pH and redox at interfaces" },
  SC2: { short: "Small pools on volcanic land fill with rain and dry in the sun, again and again.",
    where: { S1: "in the pool water as it warms", S2: "in the pool between dry spells", S3: "in the drying rim, where water leaves and molecules stay", S4: "on clay at the bottom of the pool" },
    cycle: "Wet and dry" },
  SC3: { short: "An impact leaves hot, cracked rock and a crater lake. Water circulates for about 100,000 years.",
    where: { S1: "where hot water meets the cracked crater floor", S2: "in the cooler parts of the cracks", S3: "on clay forming in the altered rock", S4: "on sulfide in the hot cracks" },
    cycle: "Hot and cold, local" },
  SC4: { short: "Floating pumice drifts for months, then washes up on a beach with the tide.",
    where: { S1: "in the seawater soaking the pumice", S2: "inside the holes of the pumice", S3: "on the volcanic glass of the pumice", S4: "on the glass and on sulfide grains" },
    cycle: "Raft transit and beaching" },
  SC5: { short: "As water freezes, solutes are pushed into thin veins of brine. Cold slows both making and breaking.",
    where: { S1: "in the brine before it freezes", S2: "in the cold brine veins", S3: "in the veins, where freezing has squeezed the solutes together", S4: "on mineral grains caught in the ice" },
    cycle: "Day and night" },
  SC6: { short: "Ready-made molecules or cells arrive on a rock from somewhere else.",
    where: { S1: "on the parent body, far away", S2: "during the trip and the landing", S3: "in the pool or sea where it lands", S4: "in the place it lands, as for any other setting" },
    cycle: null },
};

// Which driving cycles make physical sense for each setting. A judgement, Tier C.
export const CYCLE_FIT = {
  SC1: { main: "pH and redox at interfaces", ok: ["Hot and cold, local"] },
  SC2: { main: "Wet and dry", ok: ["Day and night", "Hot and cold, local"] },
  SC3: { main: "Hot and cold, local", ok: ["Wet and dry", "pH and redox at interfaces", "Day and night"] },
  SC4: { main: "Raft transit and beaching", ok: ["Tides", "Wet and dry", "Day and night"] },
  SC5: { main: "Day and night", ok: ["Hot and cold, local"] },
  SC6: { main: null, ok: ["Day and night", "Tides", "Wet and dry"] },
};

const RUNG_PLAIN = {
  S1: { title: "Sorting by energy", what: "Some products are more stable than what they came from, so they form and stay. Nothing is copied yet; the energy landscape decides." },
  S2: { title: "Lasting long enough", what: "A molecule has to last until the next step can use it. If it breaks down faster than it is passed on, it perishes." },
  S3: { title: "Gathering in one place", what: "Molecules spread thin in water rarely meet. A surface, a drying rim or a cold vein gathers them so they can react." },
  S4: { title: "Making more of itself", what: "A product that helps make more of itself grows with every round. Each tide, heat pulse or drying is a new round." },
};

const ROLE_NAMES = ["LUCA, an acetogen", "methane maker", "organic recycler", "H2 and CO2 recycler", "fermenter", "sulfur user"];

/* ---------------- presets ---------------- */

export const CHEM_PRESETS = {
  default: { label: "Default", conf: [2, "Middle of published ranges; most handoffs are Tier A or B"], hint: "The middle of every published range, one success needed, and each setting with its own mineral surface." },
  hardSurf: { label: "Hard, surfaces", conf: [1, "The rates are measured, but a billion successes is a stress test, not an estimate"], hint: "The three slow handoffs (HCN in a hot pool, free phosphate, CO2 with no catalyst) and a billion successes needed. Mineral surfaces still help." },
  hardNo: { label: "Hard, no surfaces", conf: [1, "The rates are measured, but a billion successes is a stress test, not an estimate"], hint: "The same hard chemistry, with every mineral surface switched off. This is the toughest test." },
};
export function applyChem(p, name) {
  const d = defaultParams();
  if (name === "default") {
    p.rungHandoff = { ...d.rungHandoff }; p.successesNeeded = 1; p.surfaceMode = "scenario";
  } else {
    p.rungHandoff = { ...p.rungHandoff, S2: "H4", S3: "H7", S4: "H8" };
    p.successesNeeded = 1e9; p.allowUnreasonable = true;
    p.surfaceMode = name === "hardNo" ? "off" : "scenario";
  }
  p.chemPreset = name;
  return p;
}
function chemOf(p) {
  const d = defaultParams().rungHandoff;
  const hard = p.rungHandoff.S2 === "H4" && p.rungHandoff.S3 === "H7" && p.rungHandoff.S4 === "H8" && p.successesNeeded === 1e9;
  if (hard) return p.surfaceMode === "off" ? "hardNo" : p.surfaceMode === "scenario" ? "hardSurf" : null;
  const def = ["S1", "S2", "S3", "S4", "S5"].every((k) => p.rungHandoff[k] === d[k]) && p.successesNeeded === 1 && p.surfaceMode === "scenario";
  return def ? "default" : null;
}
const WINDOWS = [
  { id: "moodyOld", conf: [2, "Zircon evidence for early water and a molecular clock with wide error bars"], label: "70 Myr", hint: "First water 4.40 Ga to LUCA at the old end of the clock, 4.33 Ga." },
  { id: "moody", conf: [2, "Zircon evidence for early water and a molecular clock with wide error bars"], label: "200 Myr", hint: "First water 4.40 Ga to LUCA at 4.2 Ga, the central clock estimate (Moody et al. 2024)." },
  { id: "moodyYoung", conf: [2, "Zircon evidence for early water and a molecular clock with wide error bars"], label: "310 Myr", hint: "First water 4.40 Ga to LUCA at the young end of the clock, 4.09 Ga." },
  { id: "conservative", conf: [2, "Zircon evidence for early water and a molecular clock with wide error bars"], label: "600 Myr", hint: "First water 4.40 Ga to a cautious LUCA date of 3.8 Ga." },
  { id: "younger", near: "islands", far: "conservative", conf: [1, "Our reading of Korenaga 2021; the paper gives no start date"], label: "200 Myr, younger start", hint: "Land only as islands from the late Hadean (Korenaga 2021): start 4.00 Ga, LUCA at a cautious 3.8 Ga. With LUCA at 4.2 Ga this start leaves no window at all." },
];
const MIXN = { basalt: "Basalt-derived sediment", felsic: "Granite-derived sediment", river: "River mud, mixed sources", vent: "Vent chimney minerals (green rust, LDH, brucite, iron sulfide)", raft: "Pumice raft", clay: "Clay only (smectite)" };
function hypoSummary(st, M) {
  if (st.place) { const pl = PLACES.find((x) => x.id === st.place); return `${pl ? pl.label.toLowerCase() : st.place}, ${st.T} C, pH ${st.pH}, ${st.mineral.startsWith("mix:") ? st.mineral.slice(4) + " mix" : st.mineral}, ${st.cycle.toLowerCase()}`; }
  const sc = (id) => String(M.scenarios.findIndex((x) => x.id === id) + 1);
  const min = st.mineral === "none" ? "no mineral" : st.mineral.startsWith("mix:") ? st.mineral.slice(4) + " mix" : st.mineral;
  return `T1 from setting ${sc(st.t1From)}, sites from ${sc(st.sitesFrom)}, ${st.cycle.toLowerCase()}, ${st.T} C, ${min}, pH ${st.pH}`;
}
const SPLIT_PRESETS = [
  { id: "louca", rate: 0.05, label: "Louca et al. 2018, modern bacteria (default): 14 Myr", hint: "The default from version 8. About the modern bacterial rate, just above the extinction rate of 0.03 to 0.05 per lineage per Myr (Louca et al. 2018)." },
  { id: "v7", rate: 0.1, label: "A little faster, empty world (version 7 default): 6.9 Myr", hint: "The version 7 default, set a little above the modern rate for a young world with empty niches." },
  { id: "slow", rate: 0.03, label: "Slow: 23 Myr", hint: "At the low end of the modern rates." },
  { id: "fast", rate: 0.693, label: "Fast, empty world: 1 Myr", hint: "One split per million years. A judgement, not a measurement." },
];
const winKey = (P) => {
  if (P.nearMode !== "event" || P.farMode !== "event") return null;
  const w = WINDOWS.find((x) => (x.near || "water") === P.nearEventId && (x.far || x.id) === P.farEventId);
  return w ? w.id : null;
};
const ECO_PRESETS = {
  none: { conf: [1, "The size of LUCA's community is a judgement; only the counts enter the model"], label: "None", X: null, Y: null, hint: "No community. The audit stops at the first population of cells, as before." },
  small: { conf: [1, "The size of LUCA's community is a judgement; only the counts enter the model"], label: "3 kinds", X: 3, Y: 2, hint: "LUCA plus two partners, two links: the smallest community that recycles anything." },
  mid: { conf: [1, "The size of LUCA's community is a judgement; only the counts enter the model"], label: "5 kinds", X: 5, Y: 6, hint: "LUCA and four partners with six links, a small version of the community Moody et al. 2024 describe." },
  rich: { conf: [1, "The size of LUCA's community is a judgement; only the counts enter the model"], label: "20 kinds", X: 20, Y: 60, hint: "Twenty kinds with sixty links, closer to a modern sediment community." },
};
function ecoOf(p) {
  if (p.ecoOn === false) return "none";
  if (p.ecoMode !== "computed") return null;
  for (const [k, v] of Object.entries(ECO_PRESETS)) if (v.X === p.ecoSpecies && v.Y === p.ecoInteractions) return k;
  return null;
}

function pctText(p) {
  if (!(p > 0)) return "practically none";
  if (p >= 0.9995) return "practically certain";
  if (p >= 0.995) return "over 99 per cent";
  if (p >= 0.01) return (p * 100).toFixed(p >= 0.1 ? 0 : 1) + " per cent";
  return "1 in " + fmtSci(1 / p, 1);
}
const cellMyr = (v) => (v < 10 ? v.toPrecision(2) : v < 1e6 ? Math.round(v).toLocaleString("en-GB") : fmtSci(v, 1));
const cnt = (n) => Math.round(n).toLocaleString("en-GB");

/* ---------------- confidence stars ---------------- */
// Three stars: measured or tightly bounded (Tier A). Two: order of magnitude from
// published work (Tier B). One: a judgement made for this model (Tier C).
// A step gets the stars of its weakest input.
export const CONF_WORD = { 1: "Low confidence, a judgement made for this model", 2: "Medium confidence, order of magnitude from published work", 3: "High confidence, measured or tightly bounded" };
export function tierStars(t) {
  const s = String(t || "");
  if (/\bA\b/.test(s)) return 3;
  if (/\bB\b/.test(s)) return 2;
  return 1;
}
export function starsHtml(n, why = "") {
  n = Math.max(1, Math.min(3, n | 0));
  const tip = CONF_WORD[n] + (why ? ". " + why : "");
  return `<span class="stars s${n}" title="${esc(tip)}" aria-label="${esc("Confidence " + n + " of 3. " + tip)}">${"\u2605".repeat(n)}<span class="off">${"\u2606".repeat(3 - n)}</span></span>`;
}

/* ---------------- small charts ---------------- */

// The window drawn to scale, with our run and the tries that could have stopped.
function windowRowSvg(r, budget, tl, w, opts = {}) {
  const h = opts.h || 34, l = opts.l || 0, rr = opts.r || 0;
  const maxT = opts.maxT || Math.max(budget, Math.min(r.total, budget * 2));
  const x = (v) => l + (Math.min(Math.max(0, v), maxT) / maxT) * (w - l - rr);
  let s = "";
  const y = opts.y || 0, bh = opts.bh || 14;
  s += `<rect x="${l}" y="${y}" width="${x(budget) - l}" height="${bh}" fill="${C.light}" stroke="${C.border}"/>`;
  // earlier tries, drawn after ours as hollow blocks
  const run = tl.run;
  let acc = 0;
  for (const k of ["T1", "T2", "T3", "T4", "T5"]) {
    const v = r.terms[k] || 0; if (!(v > 0)) continue;
    const a = x(acc), b = x(Math.min(acc + v, maxT)); acc += v;
    if (b - a <= 0) continue;
    s += `<rect x="${a}" y="${y}" width="${Math.max(0.8, b - a)}" height="${bh}" fill="${TERM_COL[k]}"><title>${k} ${esc(fmtMyr(v))} Myr</title></rect>`;
  }
  if (tl.stopped > 0 && run > 0) {
    const n = Math.min(tl.stopped, 80);
    for (let i = 0; i < n; i++) {
      const a = x(r.total + i * run), b = x(r.total + (i + 1) * run);
      if (b > x(budget) + 0.5) break;
      s += `<rect x="${a + 0.6}" y="${y + 2}" width="${Math.max(0.6, b - a - 1.2)}" height="${bh - 4}" fill="none" stroke="${C.darkTeal}" stroke-width="0.9" opacity="0.65"/>`;
    }
  }
  if (r.total > budget) {
    s += `<rect x="${x(budget)}" y="${y}" width="${x(Math.min(r.total, maxT)) - x(budget)}" height="${bh}" fill="${C.fail}" opacity="0.25"/>`;
    if (r.total > maxT) s += `<path d="M${w - rr - 2} ${y - 2} l8 ${bh / 2 + 2} l-8 ${bh / 2 + 2} Z" fill="${C.fail}"/>`;
  }
  s += `<line x1="${x(budget)}" y1="${y - 4}" x2="${x(budget)}" y2="${y + bh + 4}" stroke="${C.darkTeal}" stroke-width="1.6"/>`;
  return s;
}

function miniWindowSvg(r, budget, tl, maxT) {
  const w = 300, h = 30;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img" aria-label="Window bar">${windowRowSvg(r, budget, tl, w, { y: 8, bh: 14, r: 10, maxT })}</svg>`;
}

function timeLeftSvg(results, env, p, w = 900) {
  const budget = env.budgetMyr;
  const rowH = 54, m = { l: 230, r: 210, t: 86, b: 46 };
  const h = m.t + results.length * rowH + m.b;
  let s = svgOpen(w, h, "Time left in the window and the tries that fit");
  s += tx(14, 22, "The window, drawn to scale: our run, then the tries that could have started and stopped", { size: 14, weight: 600 });
  s += tx(14, 39, `Coloured blocks are one full run to LUCA's community. Hollow blocks are earlier tries of the same length. ${p.restartNeedsT1 ? "Each restart waits for the setting again." : "The setting stays, so a restart skips T1."}`, { size: 10.5, fill: C.muted });
  let lx = 14;
  for (const k of ["T1", "T2", "T3", "T4", "T5"]) {
    s += `<rect x="${lx}" y="54" width="12" height="10" fill="${TERM_COL[k]}"/>` + tx(lx + 17, 63, { T1: "T1 setting", T2: "T2 chemistry", T3: "T3 luck", T4: "T4 slow biology", T5: "T5 ecosystem" }[k], { size: 10.5 });
    lx += { T1: 92, T2: 108, T3: 78, T4: 120, T5: 110 }[k];
  }
  s += `<rect x="${lx}" y="54" width="12" height="10" fill="none" stroke="${C.darkTeal}"/>` + tx(lx + 17, 63, "a try that stopped", { size: 10.5 });
  const maxT = Math.max(budget, ...results.map((r) => Math.min(r.total, budget * 2)));
  const x = (v) => m.l + (v / maxT) * (w - m.l - m.r);
  for (let i = 0; i <= 4; i++) {
    const v = (budget * i) / 4;
    s += `<line x1="${x(v)}" y1="${m.t - 6}" x2="${x(v)}" y2="${h - m.b + 4}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += tx(x(v), h - m.b + 18, fmtMyr(v), { size: 9.5, anchor: "middle", fill: C.muted, mono: true });
  }
  s += tx(x(budget / 2), h - m.b + 34, "Myr from the start of the window, linear", { size: 10.5, anchor: "middle", fill: C.muted, weight: 600 });
  results.forEach((r, i) => {
    const tl = timeLeft(r, budget, p);
    const y = m.t + i * rowH;
    s += tx(m.l - 10, y + 12, r.scenario.name, { size: 11.5, anchor: "end", weight: 600 });
    s += tx(m.l - 10, y + 26, `needs ${fmtMyr(r.total)} Myr`, { size: 10, anchor: "end", fill: C.muted, mono: true });
    s += windowRowSvg(r, budget, tl, w, { l: m.l, r: m.r, y, bh: 18, maxT });
    const fits = tl.remaining >= 0;
    s += tx(w - m.r + 14, y + 10, fits ? `${fmtMyr(tl.remaining)} Myr left` : `${fmtMyr(-tl.remaining)} Myr short`, { size: 11, weight: 700, mono: true, fill: fits ? C.teal : C.fail });
    s += tx(w - m.r + 14, y + 24, fits ? `room for ${cnt(tl.tries)} tries, ${cnt(tl.stopped)} stopped` : "not even one full try", { size: 10, fill: C.muted });
    s += tx(w - m.r + 14, y + 37, "chance it fits: " + pctText(tl.pFit), { size: 10, fill: C.muted });
  });
  s += tx(x(budget), m.t - 12, "end of the window", { size: 10, anchor: "middle", fill: C.darkTeal, weight: 600 });
  return s + "</svg>";
}

// Two panels: time to split into X kinds, and time to link a share C of pairs.
function ecoCurveSvg(p, w = 620) {
  const h = 272, gap = 44, pw = (w - 60 - gap) / 2, top = 70, bot = 218;
  let s = svgOpen(w, h, "How the ecosystem time grows with complexity");
  s += tx(10, 20, "Why more complexity costs more time", { size: 13, weight: 600 });
  s += tx(10, 36, "Left: more kinds take longer, but slowly. Right: the last links are by far the slowest.", { size: 10.5, fill: C.muted });
  const t5 = computeT5(p);
  // left: tDiv vs X, X from 2 to 100, log x
  const xl = (X) => 50 + ((Math.log10(X) - Math.log10(2)) / (2 - Math.log10(2))) * pw;
  const maxL = Math.log(100) / p.ecoDivRate;
  const yl = (v) => bot - (v / maxL) * (bot - top);
  s += `<line x1="50" y1="${bot}" x2="${50 + pw}" y2="${bot}" stroke="${C.muted}"/><line x1="50" y1="${top}" x2="50" y2="${bot}" stroke="${C.muted}"/>`;
  let d = "";
  for (let X = 2; X <= 100; X *= 1.1) d += (d ? "L" : "M") + xl(X).toFixed(1) + " " + yl(Math.log(X) / p.ecoDivRate).toFixed(1);
  s += `<path d="${d}" fill="none" stroke="${C.mauve}" stroke-width="2"/>`;
  for (const X of [2, 5, 10, 20, 50, 100]) s += tx(xl(X), bot + 14, String(X), { size: 9.5, anchor: "middle", fill: C.muted, mono: true });
  s += tx(50 + pw / 2, bot + 30, "kinds of organisms, X", { size: 10.5, anchor: "middle", fill: C.muted, weight: 600 });
  s += tx(54, top - 4, `Myr to split, up to ${fmtMyr(maxL)}`, { size: 9.5, fill: C.muted });
  if (t5.X >= 2 && t5.X <= 100) { s += `<circle cx="${xl(t5.X)}" cy="${yl(t5.tDiv)}" r="5" fill="${C.mauve}" stroke="#fff"/>`; s += tx(xl(t5.X) + 8, yl(t5.tDiv) - 6, `${fmtMyr(t5.tDiv)} Myr`, { size: 10, weight: 700, fill: C.mauve, mono: true }); }
  // right: tInt vs C
  const ox = 50 + pw + gap;
  const xr = (c) => ox + c * pw;
  const maxR = -Math.log(1 - 0.99) / p.ecoLinkRate;
  const yr = (v) => bot - (Math.min(v, maxR) / maxR) * (bot - top);
  s += `<line x1="${ox}" y1="${bot}" x2="${ox + pw}" y2="${bot}" stroke="${C.muted}"/><line x1="${ox}" y1="${top}" x2="${ox}" y2="${bot}" stroke="${C.muted}"/>`;
  d = "";
  for (let c = 0; c <= 0.99; c += 0.01) d += (d ? "L" : "M") + xr(c).toFixed(1) + " " + yr(-Math.log(1 - c) / p.ecoLinkRate).toFixed(1);
  s += `<path d="${d}" fill="none" stroke="${C.terra}" stroke-width="2"/>`;
  for (const c of [0, 0.25, 0.5, 0.75, 1]) s += tx(xr(c), bot + 14, Math.round(c * 100) + "%", { size: 9.5, anchor: "middle", fill: C.muted, mono: true });
  s += tx(ox + pw / 2, bot + 30, "share of possible pairs that interact, C", { size: 10.5, anchor: "middle", fill: C.muted, weight: 600 });
  s += tx(ox + 4, top - 4, `Myr to link, up to ${fmtMyr(maxR)}`, { size: 9.5, fill: C.muted });
  if (t5.C > 0) { s += `<circle cx="${xr(Math.min(t5.C, 0.99))}" cy="${yr(t5.tInt)}" r="5" fill="${C.terra}" stroke="#fff"/>`; s += tx(xr(Math.min(t5.C, 0.99)) + (t5.C > 0.7 ? -8 : 8), yr(t5.tInt) - 7, `${fmtMyr(t5.tInt)} Myr`, { size: 10, weight: 700, fill: C.terra, mono: true, anchor: t5.C > 0.7 ? "end" : "start" }); }
  return s + "</svg>";
}

function ecoNetSvg(p, w = 480) {
  const t5 = computeT5(p);
  const h = 330, cx = w / 2, cy = 172, R = 104;
  let s = svgOpen(w, h, "LUCA's community as a network");
  s += tx(10, 20, "LUCA's community", { size: 13, weight: 600 });
  s += tx(10, 36, `${t5.X} kinds of organisms, ${t5.Y} links out of ${t5.pairs} possible pairs`, { size: 10.5, fill: C.muted });
  const X = Math.min(t5.X, 40);
  const nodes = Array.from({ length: X }, (_, i) => {
    const a = -Math.PI / 2 + (i / X) * Math.PI * 2;
    return { x: cx + Math.cos(a) * (X === 1 ? 0 : R), y: cy + Math.sin(a) * (X === 1 ? 0 : R) };
  });
  for (const [a, b] of linkList(t5.X, t5.Y).filter(([a, b]) => a < X && b < X)) s += `<line x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}" stroke="${C.muted}" stroke-width="1.2" opacity="0.65"/>`;
  nodes.forEach((n, i) => {
    s += `<circle cx="${n.x}" cy="${n.y}" r="${i === 0 ? 11 : X > 20 ? 6 : 8}" fill="${KIND_COLS[i % KIND_COLS.length]}" stroke="#fff" stroke-width="1.5"/>`;
    if (X <= 8) {
      const right = n.x >= cx - 1;
      s += tx(n.x + (right ? 14 : -14), n.y + 4, i < ROLE_NAMES.length ? ROLE_NAMES[i] : "kind " + (i + 1), { size: 10, anchor: right ? "start" : "end", weight: i === 0 ? 700 : 400 });
    }
  });
  s += tx(10, h - 10, "Roles are illustrative, after Moody et al. 2024. Only the counts enter the model.", { size: 9.5, fill: C.muted });
  return s + "</svg>";
}

// Two bars on one log ruler: time to form against time it survives.
function raceMini(tf, ts, w = 460) {
  const h = 92, l = 12, r = 12;
  const lo = 1e-2, hi = 1e17;
  const x = (v) => l + ((Math.log10(Math.min(hi, Math.max(lo, v))) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (w - l - r);
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Time to form against time it survives" font-family="${FONT}">`;
  for (const [v, lab] of [[1, "second"], [86400, "day"], [S_YR, "year"], [1e6 * S_YR, "Myr"], [1e9 * S_YR, "Gyr"]]) {
    s += `<line x1="${x(v)}" y1="8" x2="${x(v)}" y2="66" stroke="${C.border}"/>` + tx(x(v), 80, lab, { size: 9.5, anchor: "middle", fill: C.muted });
  }
  s += `<rect x="${l}" y="14" width="${x(tf) - l}" height="16" rx="3" fill="${C.teal}"/>` + tx(Math.min(x(tf) + 6, w - 120), 26, "forms in " + humanTime(tf), { size: 10.5, weight: 600 });
  s += `<rect x="${l}" y="38" width="${x(ts) - l}" height="16" rx="3" fill="${C.terra}" opacity="0.6"/>` + tx(Math.min(x(ts) + 6, w - 120), 50, "survives " + humanTime(ts), { size: 10.5, weight: 600 });
  return s + "</svg>";
}
function timeMini(sec, budgetMyr, w = 460) {
  const h = 70, l = 12, r = 12, lo = 1e-2, hi = 1e17;
  const x = (v) => l + ((Math.log10(Math.min(hi, Math.max(lo, v))) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (w - l - r);
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="How long this step takes" font-family="${FONT}">`;
  for (const [v, lab] of [[1, "second"], [86400, "day"], [S_YR, "year"], [1e6 * S_YR, "Myr"], [1e9 * S_YR, "Gyr"]]) s += `<line x1="${x(v)}" y1="8" x2="${x(v)}" y2="44" stroke="${C.border}"/>` + tx(x(v), 58, lab, { size: 9.5, anchor: "middle", fill: C.muted });
  const bx = x(budgetMyr * 1e6 * S_YR);
  s += `<line x1="${bx}" y1="4" x2="${bx}" y2="46" stroke="${C.darkTeal}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
  s += `<rect x="${l}" y="16" width="${Math.max(1.5, x(sec) - l)}" height="18" rx="3" fill="${C.mauve}" opacity="0.8"/>`;
  s += tx(Math.min(x(sec) + 6, bx - 6), 29, humanTime(sec), { size: 10.5, weight: 700, anchor: x(sec) + 60 > bx ? "end" : "start", fill: x(sec) + 60 > bx ? "#fff" : C.text });
  s += tx(bx + 4, 12, "window", { size: 9.5, fill: C.darkTeal, weight: 600 });
  return s + "</svg>";
}


/* ---------------- hard steps, element by element ---------------- */

const HANDOFF_ELEMENT = { H1: "Fe", H2: "S", H3: "N", H4: "N", H5: "N", H6: "C", H7: "P", H8: "C", H9: "C", H10: "P", H11: "P", H12: "P" };
const RUNG_SHORT = { S0: "S0 getting the element", S1: "S1 sorting by energy", S2: "S2 lasting long enough", S3: "S3 gathering", S4: "S4 making more", S5: "S5 copying" };
const HARD_SWAP = { S2: "H4", S3: "H7", S4: "H8" };
const RATE_WORD = { e: "easy", m: "medium", h: "hard" };
const HARD_PLAIN = {
  S2: "HCN is a key nitrogen feedstock. In a cool, iron-rich pond it is caught as ferrocyanide and kept. In a hot acidic pool it breaks down within about a minute, before anything can use it.",
  S3: "Phosphorus has to be joined to an organic molecule. On volcanic glass phosphate is held and joined quickly. Free phosphate in water is scarce, calcium removes it, and the joining is very slow.",
  S4: "Carbon has to be pulled out of CO2. On iron and nickel sulfide, with H2, this takes seconds. With no catalyst it takes about twenty times longer than the product survives.",
};

const ELEM_PLAIN = {
  H: "No hard step. Rock and water make H2 all the time; the cost is keeping a gradient, not getting the atom.",
  O: "No hard step. Present everywhere as water and oxide surfaces.",
  C: "S4: plenty of CO2, but pulling carbon out of it needs a sulfide catalyst, so carbon waits for iron and sulfur.",
  N: "S3: making reactive nitrogen is quick but costly, and the product is destroyed by ultraviolet light and dissolved iron before it can build up.",
  P: "S0 and S1: free phosphate is scarce and calcium removes it. Ways out are calcium-poor alkaline water, reduced phosphorus and phosphate held on volcanic glass.",
  S: "No hard step. Easy to get and use; only local build-up is capped, because sulfite is split by light.",
  Fe: "No hard step. Soluble, plentiful and redox-active in an ocean without oxygen.",
  Ni: "S3: about a thousand times scarcer than iron, so it has to be gathered locally, by the same sulfide chemistry that gathers iron.",
  Mg: "S4: plenty in seawater, but Fe(II) took the metal seat in early RNA first; magnesium took over only when oxygen removed dissolved iron.",
};

function elementGridHtml(M) {
  const rungs = ["S0", "S1", "S2", "S3", "S4", "S5"];
  const defH = { S1: "H2", S2: "H3", S3: "H12", S4: "H9" };
  const head = `<tr><th>Element</th>${rungs.map((r) => `<th>${esc(RUNG_SHORT[r])}</th>`).join("")}<th>Hardest step, in plain words</th></tr>`;
  const body = M.elements.map((e) => {
    const cells = rungs.map((r) => {
      const v = e.rungs[r] || "e";
      const tags = [];
      if (defH[r] && HANDOFF_ELEMENT[defH[r]] === e.symbol) tags.push(`<span class="eg-tag d" title="Default chemistry uses ${defH[r]} here">${defH[r]}</span>`);
      if (HARD_SWAP[r] && HANDOFF_ELEMENT[HARD_SWAP[r]] === e.symbol) tags.push(`<span class="eg-tag h" title="Hard chemistry uses ${HARD_SWAP[r]} here">${HARD_SWAP[r]}</span>`);
      return `<td class="eg eg-${v}"><span>${RATE_WORD[v] || v}</span>${tags.join("")}</td>`;
    }).join("");
    const why = ELEM_PLAIN[e.symbol] || String(e.why || "").split(/(?<=\.)\s/)[0];
    return `<tr><th class="rowh"><span class="eg-sym">${esc(e.symbol)}</span> ${esc(e.name)}</th>${cells}<td class="eg-why">${esc(why)}</td></tr>`;
  }).join("");
  return `<table class="elgrid"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

/* ---------------- controller ---------------- */


/* ---------------- the cycle as currency: yield against cycles ---------------- */
// f(n) = plateau * (1 - (1 - y - d')^n), with d' = d + T_cycle / tau_chem.
function currencySvg(cur, w = 520) {
  const h = 300, l = 60, r = 18, t = 22, b = 46;
  const nMax = 1e6, fMin = 1e-5, fMax = 1;
  const X = (n) => l + (Math.log10(n) / Math.log10(nMax)) * (w - l - r);
  const Y = (f) => t + (1 - (Math.log10(Math.max(fMin, f)) - Math.log10(fMin)) / (Math.log10(fMax) - Math.log10(fMin))) * (h - t - b);
  let o = svgOpen(w, h, "Yield against the number of cycles");
  for (let e = 0; e <= 6; e++) { const x = X(Math.pow(10, e)); o += `<line x1="${x}" y1="${t}" x2="${x}" y2="${h - b}" stroke="${C.light}"/>` + tx(x, h - b + 15, e === 0 ? "1" : e < 4 ? String(Math.pow(10, e).toLocaleString("en-GB")) : "10^" + e, { anchor: "middle", size: 10, fill: C.muted }); }
  for (let e = -5; e <= 0; e++) { const y = Y(Math.pow(10, e)); o += `<line x1="${l}" y1="${y}" x2="${w - r}" y2="${y}" stroke="${C.light}"/>` + tx(l - 6, y + 3, e >= -2 ? (Math.pow(10, e) * 100).toLocaleString("en-GB") + " %" : (Math.pow(10, e) * 100).toPrecision(1) + " %", { anchor: "end", size: 10, fill: C.muted }); }
  o += tx((l + w - r) / 2, h - 10, "Number of wet and dry cycles (log scale)", { anchor: "middle", size: 11, fill: C.muted });
  o += `<text transform="translate(14 ${(t + h - b) / 2}) rotate(-90)" text-anchor="middle" font-size="11" fill="${C.muted}">Yield of joined product (log scale)</text>`;
  // Eiby 2025 point: 5 cycles, 0.1 to 1.2 per cent
  const ex = X(5);
  o += `<rect x="${ex - 5}" y="${Y(0.012)}" width="10" height="${Y(0.001) - Y(0.012)}" fill="${C.faint}" opacity="0.6"/>` + tx(ex + 9, Y(0.012) - 4, "Eiby 2025, 5 cycles", { size: 10, fill: C.muted });
  if (cur && cur.on !== undefined) {
    const y = cur.y, dd = cur.d + cur.tCycleS / cur.tauChem, plateau = y / (y + dd);
    let path = "";
    for (let i = 0; i <= 120; i++) { const n = Math.pow(10, (i / 120) * 6); const f = plateau * (1 - Math.pow(Math.max(0, 1 - y - dd), n)); path += (i ? "L" : "M") + X(n).toFixed(1) + " " + Y(f).toFixed(1); }
    o += `<path d="${path}" fill="none" stroke="${C.teal}" stroke-width="2.4"/>`;
    o += `<line x1="${l}" y1="${Y(plateau)}" x2="${w - r}" y2="${Y(plateau)}" stroke="${C.terra}" stroke-dasharray="5 4"/>` + tx(w - r - 4, Y(plateau) - 5, "level reached = chance per bond, " + pctText(plateau), { anchor: "end", size: 10.5, fill: C.terra, weight: 600 });
    const nHalf = Math.log(0.5) / Math.log(Math.max(1e-12, 1 - y - dd));
    if (nHalf > 1 && nHalf < nMax) o += `<circle cx="${X(nHalf)}" cy="${Y(plateau / 2)}" r="3.5" fill="${C.darkTeal}"/>` + tx(X(nHalf) + 6, Y(plateau / 2) + 14, "half-way after " + cnt(nHalf) + " cycles", { size: 10, fill: C.darkTeal });
  }
  return o + "</svg>";
}

export function createGuided(ctx) {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const st = { scenario: 0, step: 0, pp: null, ppForm: 1000, ppSurv: 1e9, mapChem: "current", mScope: "all" };

  function segWire(sel, cb) {
    const root = $(sel); if (!root) return;
    root.querySelectorAll("button").forEach((b) => { b.onclick = () => cb(b.dataset.v); });
  }
  function segShow(sel, v) {
    const root = $(sel); if (!root) return;
    root.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
  }

  function build() {
    const M = ctx.MODEL();
    // start page choices
    $("#gWindowSeg").innerHTML = WINDOWS.map((w) => `<button data-v="${w.id}" aria-pressed="false">${esc(w.label)}</button>`).join("");
    $("#gChemSeg").innerHTML = Object.entries(CHEM_PRESETS).map(([k, v]) => `<button data-v="${k}" aria-pressed="false">${esc(v.label)}</button>`).join("");
    $("#gEcoSeg").innerHTML = Object.entries(ECO_PRESETS).map(([k, v]) => `<button data-v="${k}" aria-pressed="false">${esc(v.label)}</button>`).join("");
    segWire("#gWindowSeg", (id) => { const P = ctx.P(); const w = WINDOWS.find((x) => x.id === id); P.nearMode = "event"; P.nearEventId = w.near || "water"; P.farMode = "event"; P.farEventId = w.far || w.id; ctx.rebuild(); ctx.recompute(); });
    segWire("#gChemSeg", (name) => { applyChem(ctx.P(), name); ctx.rebuild(); ctx.recompute(); ctx.toast(CHEM_PRESETS[name].label + " chemistry loaded"); });
    const ecoSet = (k) => { const P = ctx.P(); const e = ECO_PRESETS[k]; if (k === "none") P.ecoOn = false; else { P.ecoOn = true; P.ecoMode = "computed"; P.ecoSpecies = e.X; P.ecoInteractions = e.Y; } ctx.recompute(); };
    segWire("#gEcoSeg", ecoSet);
    $("#gStartMore").innerHTML = ["chemTempC", "successesNeeded", "siteScale", "t1Scale", "landUncertaintyFactor", "errorThresholdMyr"].map(ctx.sliderFor).join("");
    ctx.wireParamInputs($("#gStartMore"));

    // story
    $("#storyScenarios").innerHTML = M.scenarios.map((sc, i) => `<button class="chip" data-i="${i}">${esc(sc.name)}</button>`).join("");
    $$("#storyScenarios .chip").forEach((b) => { b.onclick = () => { st.scenario = +b.dataset.i; ctx.recompute(); }; });
    $("#storyPrev").onclick = () => { st.step = Math.max(0, st.step - 1); ctx.recompute(); };
    $("#storyNext").onclick = () => { st.step = Math.min(STEP_ORDER.length - 1, st.step + 1); ctx.recompute(); };
    $("#gStoryMore").innerHTML = ["chemTempC", "eaTransfer", "eaLoss", "protectionFactor", "phosphateUM", "divalentMM", "generationTimeS", "popSize"].map(ctx.sliderFor).join("");
    ctx.wireParamInputs($("#gStoryMore"));
    document.addEventListener("keydown", (e) => {
      if (!$("#v-story").classList.contains("active")) return;
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") { st.step = Math.min(STEP_ORDER.length - 1, st.step + 1); ctx.recompute(); }
      if (e.key === "ArrowLeft") { st.step = Math.max(0, st.step - 1); ctx.recompute(); }
    });

    // compounds and cycles
    st.pp = M.handoffs[0].id;
    $("#ppChips").innerHTML = M.handoffs.map((h) => `<button class="chip" data-id="${esc(h.id)}">${esc(shortName(h))} ${starsHtml(tierStars(h.tier), "Rates for this handoff are " + h.tier)}</button>`).join("");
    $$("#ppChips .chip").forEach((b) => { b.onclick = () => { st.pp = b.dataset.id; ppFromHandoff(); renderPP(); }; });
    $("#ppForm").oninput = () => { st.ppForm = Math.pow(10, +$("#ppForm").value / 100); renderPP(); };
    $("#ppSurv").oninput = () => { st.ppSurv = Math.pow(10, +$("#ppSurv").value / 100); renderPP(); };
    ppFromHandoff();
    $("#mapChemSeg").innerHTML = [["current", "Your settings"], ...Object.entries(CHEM_PRESETS).map(([k, v]) => [k, v.label])].map(([k, l]) => `<button data-v="${k}" aria-pressed="${k === "current"}">${esc(l)}</button>`).join("");
    segWire("#mapChemSeg", (k) => { st.mapChem = k; segShow("#mapChemSeg", k); renderMap(ctx.lastEnv()); renderCycleExplain(ctx.lastEnv()); });
    $("#gCycleMore").innerHTML = ["siteScale", "successesNeeded"].map(ctx.sliderFor).join("");
    ctx.wireParamInputs($("#gCycleMore"));

    // the cycle as currency
    segWire("#curRoleSeg", (v) => { ctx.P().cycleRole = v; ctx.recompute(); ctx.toast(v === "currency" ? "The cycle now also pays for the joining step" : "The cycle is a clock only"); });
    segWire("#curCyclesSeg", (v) => { ctx.P().currencyCycles = v; ctx.recompute(); });
    $("#curSrcSeg").innerHTML = [...Object.entries(CURRENCY_SOURCES).map(([k, v]) => [k, v.label]), ["custom", "Own value"]].map(([k, l]) => `<button data-v="${k}" aria-pressed="false">${esc(l)}</button>`).join("");
    segWire("#curSrcSeg", (k) => { const P = ctx.P(); P.yieldSource = k; if (CURRENCY_SOURCES[k]) P.yieldPerCycle = CURRENCY_SOURCES[k].y; ctx.recompute(); });
    $("#curFields").innerHTML = ["yieldPerCycle", "lossPerCycle", "bondsNeeded"].map(ctx.sliderFor).join("");
    ctx.wireParamInputs($("#curFields"));

    // ecosystem
    $("#gEcoMain").innerHTML = ["ecoSpecies", "ecoInteractions"].map(ctx.sliderFor).join("");
    ctx.wireParamInputs($("#gEcoMain"));
    // Version 8: the time for one lineage to split into two, ln(2) / lambda.
    $("#gSplitSeg").innerHTML = SPLIT_PRESETS.map((x) => `<button data-v="${x.id}" aria-pressed="false">${esc(x.label)}</button>`).join("");
    segWire("#gSplitSeg", (id) => { const x = SPLIT_PRESETS.find((y) => y.id === id); ctx.P().ecoDivRate = x.rate; ctx.recompute(); });
    $("#gSplitMyr").onchange = () => { const v = parseFloat($("#gSplitMyr").value); if (Number.isFinite(v) && v > 0) { ctx.P().ecoDivRate = +(Math.LN2 / v).toPrecision(4); ctx.recompute(); } };
    $("#gEcoMore").innerHTML = ["ecoDivRate", "ecoLinkRate", "ecoExtraMyr", "ecoDirectMyr"].map(ctx.sliderFor).join("");
    ctx.wireParamInputs($("#gEcoMore"));
    segWire("#ecoModeSeg", (v) => { const P = ctx.P(); if (v === "off") P.ecoOn = false; else { P.ecoOn = true; P.ecoMode = v; } ctx.recompute(); });
    segWire("#ecoOverlapSeg", (v) => { ctx.P().ecoOverlap = v === "yes"; ctx.recompute(); });
    segWire("#restartSeg", (v) => { ctx.P().restartNeedsT1 = v === "yes"; ctx.recompute(); });
  }

  function shortName(h) {
    const map = { H1: "Fe-S cluster", H2: "Thioester", H3: "Ferrocyanide", H4: "HCN, hot pool", H5: "Stored N", H6: "Sugars", H7: "Free phosphate", H8: "CO2, no catalyst", H9: "CO2 on Fe-S", H10: "RNA, free", H11: "RNA on mineral", H12: "P on glass" };
    return map[h.id] || h.species_and_handoff;
  }
  function ppFromHandoff() {
    const P = ctx.P(), M = ctx.MODEL();
    const h = M.handoffs.find((x) => x.id === st.pp);
    const s = handoffState(h, P.effectiveTempC ?? P.chemTempC, P.eaTransfer, P.eaLoss);
    st.ppForm = s.tauTransfer; st.ppSurv = s.tauLoss;
    $("#ppForm").value = Math.round(Math.log10(st.ppForm) * 100);
    $("#ppSurv").value = Math.round(Math.log10(st.ppSurv) * 100);
  }
  function renderPP() {
    const M = ctx.MODEL();
    const h = M.handoffs.find((x) => x.id === st.pp);
    $$("#ppChips .chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === st.pp)));
    const da = st.ppSurv / st.ppForm, p = da / (1 + da);
    $("#ppFormV").textContent = humanTime(st.ppForm);
    $("#ppSurvV").textContent = humanTime(st.ppSurv);
    const col = p > 0.9 ? C.teal : p > 0.1 ? C.marginal : C.fail;
    $("#ppBar").innerHTML = `<div style="width:${Math.max(0.6, p * 100).toFixed(1)}%;background:${col}"></div>`;
    $("#ppOut").innerHTML = [
      ["survives / forms", da >= 1 ? "x " + fmtSci(da, 1) : "1 / " + fmtSci(1 / da, 1)],
      ["chance per attempt", p >= 0.995 ? "about 100%" : p >= 0.01 ? (p * 100).toFixed(1) + "%" : "1 in " + fmtSci(1 / p, 1)],
      ["attempts per success", p >= 0.5 ? "about 1" : "about " + fmtSci(1 / p, 1)],
    ].map(([k, v]) => `<div class="kpi"><div class="v">${esc(v)}</div><div class="n">${esc(k)}</div></div>`).join("");
    $("#ppNote").innerHTML = `<strong>${esc(h.id)}, ${esc(h.species_and_handoff)}</strong> (${esc(h.tier)}) ${starsHtml(tierStars(h.tier), "Rates for this handoff are " + h.tier)}. ${esc(h.why_this_value)} Drag the sliders to see how the chance changes; this widget does not change the model.`;
  }

  function pillFor(kind, txt) { return `<span class="pill ${kind}">${esc(txt)}</span>`; }

  function stepInfo(r, env, P) {
    const M = ctx.MODEL();
    const sc = r.scenario, story = STORY[sc.id] || STORY.SC1;
    const out = [];
    const t1c = sc.requires_subaerial_land || sc.is_cold || sc.id === "SC6" ? [1, "Whether this kind of place existed early is contested"] : [2, "This kind of place exists as soon as there is an ocean; the waiting time is order of magnitude"];
    out.push({ id: "T1", title: "A setting appears", pill: ["na", "time, not tries"], time: r.t1, conf: t1c,
      body: `${story.short} The model first waits for this kind of place to exist: ${fmtMyr(r.t1)} Myr${sc.requires_subaerial_land ? ", which includes extra waiting because it needs dry land above the sea" : ""}.`,
      chart: timeMini(r.t1 * 1e6 * S_YR, env.budgetMyr) });
    for (const rid of ["S1", "S2", "S3", "S4"]) {
      const g = r.rungs.find((x) => x.rung === rid);
      const plain = RUNG_PLAIN[rid];
      if (!g) { out.push({ id: rid, title: plain.title, conf: [1, "Switched off"], pill: ["na", "switched off"], body: "This step is switched off in the full workbench, so it is skipped here.", chart: "" }); continue; }
      if (!g.handoff) { out.push({ id: rid, title: plain.title, conf: [1, "No molecule assigned, so passing is assumed"], pill: ["e", "about 1"], body: plain.what + " No molecule is assigned to this step, so it always passes.", chart: "" }); continue; }
      const surfHelp = g.surface && g.surface.applied && g.pNoSurface < 0.5 && g.p >= 0.5;
      const pill = g.p >= 0.5 ? (surfHelp ? ["m", "about 1, on a surface"] : ["e", "about 1"]) : ["h", "about " + fmtSci(1 / g.p, 1)];
      const surfTxt = g.surface && g.surface.applied && pctText(g.p) !== pctText(g.pNoSurface)
        ? ` The mineral surface of this setting changes the chance from ${pctText(g.pNoSurface)} to ${pctText(g.p)}.` : "";
      const hN = tierStars(g.handoff.tier);
      const surfUsed = g.surface && g.surface.applied && pctText(g.p) !== pctText(g.pNoSurface);
      const minT = surfUsed && r.surface && r.surface.mineral ? tierStars(r.surface.mineral.tier) : 3;
      const cN = Math.min(hN, minT);
      const cWhy = `The rates for ${g.handoff.id} are ${g.handoff.tier}` + (surfUsed ? `; the surface (${r.surface.mineral.name}) is Tier ${r.surface.mineral.tier}` : "");
      out.push({ id: rid, title: plain.title, pill, time: g.tauTransfer / (1e6 * S_YR), conf: [cN, cWhy],
        body: `${plain.what} In this setting it happens ${esc(story.where[rid] || "")}. The model's named molecule for this step is <strong>${esc(g.handoff.species_and_handoff)}</strong> (${esc(g.handoff.id)}, the same in every setting; change it in the full workbench). It forms in ${humanTime(g.tauTransfer)} and survives ${humanTime(g.tauLoss)}, so the chance it is passed on is ${pctText(g.p)}.${surfTxt}`,
        chart: raceMini(g.tauTransfer, g.tauLoss) });
    }
    const pj = r.pJoint;
    out.push({ id: "T3", title: "Waiting for it all in one place", conf: [1, "The number of places working at once is a judgement, and the cycle choice too"], pill: pj >= 0.5 ? ["e", "about 1"] : ["h", "about " + fmtSci(1 / pj, 1)], time: r.t3,
      body: `Every step has to succeed in the same place, in the same round. Together the chance per round is ${pctText(pj)}. There are about ${fmtSci(r.nSites, 1)} places working at once, each trying once per ${esc(r.cycleName.toLowerCase())} cycle (${humanTime(r.tCycleS)}), and ${cnt(P.successesNeeded)} success${P.successesNeeded === 1 ? " is" : "es are"} needed. The wait is ${humanTime(r.t3 * 1e6 * S_YR)}.`,
      chart: timeMini(r.t3 * 1e6 * S_YR, env.budgetMyr) });
    out.push({ id: "S5", title: "Copying with selection", conf: [2, "Standard population genetics; the generation time and population size are order of magnitude"], pill: ["na", "time, not tries"], time: r.t4,
      body: `A membrane wraps a working network: a protocell. Copies that copy better spread. This is slow: ${fmtMyr(r.t4detail.errorMyr)} Myr to copy without losing the message, then ${fmtMyr(r.t4detail.fixMyr)} Myr for a better version to take over a population of ${fmtSci(P.popSize, 1)}. Together ${fmtMyr(r.t4)} Myr.`,
      chart: timeMini(r.t4 * 1e6 * S_YR, env.budgetMyr) });
    const t5 = r.t5detail;
    out.push({ id: "E", title: "Growing LUCA's community", conf: [1, "The split rate is anchored on modern bacteria, the link rate and the community size are judgements"], pill: ["na", "time, not tries"], time: r.t5,
      body: !t5.on ? "The ecosystem step is switched off, so the audit stops at the first population of cells." :
        t5.direct ? `The time to build the community is set directly to ${fmtMyr(r.t5)} Myr.` :
        `LUCA lived in a community (Moody et al. 2024). Growing from one kind of cell to ${t5.X} kinds takes about ${fmtMyr(t5.tDiv)} Myr. Making ${t5.Y} of the ${t5.pairs} possible partnerships takes about ${fmtMyr(t5.tInt)} Myr. ${t5.overlap ? "Both happen at the same time, so the longer counts" : "One follows the other, so both count"}: ${fmtMyr(r.t5)} Myr.`,
      chart: timeMini(Math.max(1e-6, r.t5) * 1e6 * S_YR, env.budgetMyr) });
    const tl = timeLeft(r, env.budgetMyr, P);
    // The total gets the stars of the weakest term that makes up at least a tenth of it.
    const confOf = (id) => (out.find((o) => o.id === id) || {}).conf;
    const chemC = Math.min(...["S1", "S2", "S3", "S4"].map((k) => (confOf(k) || [3])[0]));
    const termConf = { T1: confOf("T1")[0], T2: chemC, T3: confOf("T3")[0], T4: confOf("S5")[0], T5: confOf("E")[0] };
    const big = Object.keys(termConf).filter((k) => (r.terms[k] || 0) >= 0.1 * r.total);
    const totC = Math.min(...(big.length ? big : Object.keys(termConf)).map((k) => termConf[k]));
    const TERM_WORD = { T1: "waiting for the setting", T2: "the chemistry", T3: "waiting for luck", T4: "slow biology", T5: "the ecosystem" };
    out.push({ id: "L", title: "LUCA, and the time left", conf: [totC, "The total is only as firm as the weakest term that makes up a real share of it, here " + big.map((k) => TERM_WORD[k]).join(" and ")], pill: tl.remaining >= 0 ? ["e", cnt(tl.tries) + " tries fit"] : ["h", "does not fit"], time: r.total,
      body: tl.remaining >= 0
        ? `All together the run needs ${fmtMyr(r.total)} Myr of a ${fmtMyr(env.budgetMyr)} Myr window, leaving ${fmtMyr(tl.remaining)} Myr. One full try takes ${fmtMyr(tl.run)} Myr, so the window has room for ${cnt(tl.tries)} tries: the one we descend from, and ${cnt(tl.stopped)} that could have reached the same point and then stopped. Chance it fits at all: ${pctText(tl.pFit)}.`
        : `All together the run needs ${fmtMyr(r.total)} Myr, which is ${fmtMyr(-tl.remaining)} Myr more than the ${fmtMyr(env.budgetMyr)} Myr window. Chance it fits by luck: ${pctText(tl.pFit)}.`,
      chart: `<svg viewBox="0 0 460 40" width="100%" role="img" aria-label="Window bar">${windowRowSvg(r, env.budgetMyr, tl, 460, { y: 12, bh: 16, r: 12 })}</svg>` });
    return out;
  }

  function renderStart(env, results) {
    const P = ctx.P();
    segShow("#gWindowSeg", winKey(P));
    segShow("#gChemSeg", chemOf(P));
    segShow("#gEcoSeg", ecoOf(P));
    const w = WINDOWS.find((x) => x.id === winKey(P));
    const hintWith = (o, fallback) => o ? `${esc(o.hint)} <span class="conf-inline">${starsHtml(o.conf[0], o.conf[1])}</span>` : esc(fallback);
    $("#gWindowHint").innerHTML = hintWith(w, `A custom window of ${fmtMyr(env.budgetMyr)} Myr, set in the full workbench.`);
    const c = chemOf(P);
    $("#gChemHint").innerHTML = hintWith(c ? CHEM_PRESETS[c] : null, "A custom mix, set in the full workbench.") + ` <button class="linkbtn" id="gHardLink">What makes a step hard?</button>`;
    $("#gHardLink").onclick = () => { ctx.showView("cycles"); setTimeout(() => { const el = $("#hardSec"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60); };
    const e = ecoOf(P);
    $("#gEcoHint").innerHTML = hintWith(e ? ECO_PRESETS[e] : null, `${P.ecoSpecies} kinds and ${P.ecoInteractions} links, set on the ecosystem page.`);

    const tls = results.map((r) => timeLeft(r, env.budgetMyr, P));
    const nFit = tls.filter((t) => t.remaining >= 0).length;
    const best = results.reduce((a, b) => (b.total < a.total ? b : a));
    const most = Math.max(...tls.map((t) => t.stopped));
    $("#startKpis").innerHTML = [
      ["The window", fmtMyr(env.budgetMyr) + " Myr", `${env.nearGa.toFixed(2)} to ${env.farGa.toFixed(2)} Ga`],
      ["Fastest setting", fmtMyr(best.total) + " Myr", best.scenario.name],
      ["Settings that fit", `${nFit} of ${results.length}`, "with the current choices"],
      ["Most tries that stopped", cnt(most), "before ours, in one setting"],
    ].map(([k, v, n]) => `<div class="kpi"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div><div class="n">${esc(n)}</div></div>`).join("");

    const cardMax = Math.max(env.budgetMyr, ...results.map((r) => Math.min(r.total, env.budgetMyr * 2)));
    $("#scenarioCards").innerHTML = results.map((r, i) => {
      const tl = tls[i];
      const v = verdictAgainstBudget(r.total, env.budgetMyr);
      const badge = v.cls === "v-pass" ? "e" : v.cls === "v-marginal" ? "m" : "h";
      const dom = { T1: "waiting for the setting", T2: "the chemistry", T3: "waiting for luck", T4: "slow biology", T5: "building the ecosystem" }[r.dominant];
      return `<button class="sc-card" data-i="${i}">
        <span class="sc-num">${i + 1}</span>
        <span class="sc-name">${esc(r.scenario.name)}</span>
        <span class="sc-short">${esc((STORY[r.scenario.id] || {}).short || "")}</span>
        ${miniWindowSvg(r, env.budgetMyr, tl, cardMax)}
        <span class="sc-line"><strong class="num">${esc(fmtMyr(r.total))} Myr</strong> needed, mostly ${esc(dom)}</span>
        <span class="sc-line">${tl.remaining >= 0 ? `${esc(fmtMyr(tl.remaining))} Myr left, room for ${esc(cnt(tl.tries))} tries` : `${esc(fmtMyr(-tl.remaining))} Myr short`}</span>
        <span class="pill ${badge}">${esc(v.text)}</span>
        <span class="sc-go">Follow the steps</span>
      </button>`;
    }).join("");
    $$("#scenarioCards .sc-card").forEach((b) => { b.onclick = () => { st.scenario = +b.dataset.i; st.step = 0; ctx.showView("story"); ctx.recompute(); }; });
    renderHypo(env, results, tls, cardMax);
  }

  // Version 8: scenarios 7 and 8, hypothetical.
  function renderHypo(env, results, tls, cardMax) {
    const P = ctx.P(), M = ctx.MODEL();
    const fmtMyr = (v) => (isFinite(v) && v < 1000 ? (v < 0.1 ? (+v).toPrecision(2) : (+v).toFixed(2)) : fmtMyrBase(v));
    if (!$("#hypoCards")) return;
    const H = hypoScenarios(M, P, results);
    const b = H.best, inv = H.inv;
    const fast = H.fastest;
    const rate = (x) => (x.attemptsPerS || 0) * secPerYr;
    const card = (num, name, short, r, tl, extra) => {
      const v = verdictAgainstBudget(r.total, env.budgetMyr);
      const badge = v.cls === "v-pass" ? "e" : v.cls === "v-marginal" ? "m" : "h";
      return `<button class="sc-card hypo" data-h="${num}">
        <span class="sc-num">${num}</span>
        <span class="sc-name">${esc(name)} <span class="pill na">hypothetical</span></span>
        <span class="sc-short">${esc(short)}</span>
        ${miniWindowSvg(r, env.budgetMyr, tl, cardMax)}
        <span class="sc-line"><strong class="num">${esc(fmtMyr(r.total))} Myr</strong> needed${fast ? `, against ${esc(fmtMyr(fast.total))} for the fastest of the six` : ""}</span>
        <span class="sc-line">${tl.remaining >= 0 ? `${esc(fmtMyr(tl.remaining))} Myr left, room for ${esc(cnt(tl.tries))} tries` : `${esc(fmtMyr(-tl.remaining))} Myr short`}; ${esc(fmtSci(rate(r)))} successful tries per year${fast && rate(fast) > 0 ? ` (${esc(fmtSci(rate(r) / rate(fast)))} times the fastest of the six)` : ""}</span>
        ${extra}
        <span class="pill ${badge}">${esc(v.text)}</span>
        <span class="sc-go">See what it chose</span>
      </button>`;
    };
    const top = inv.ranks[0];
    $("#hypoCards").innerHTML = card(7, "Best mix of known conditions", b.mode === "place" ? "The best single place that could exist, with any known conditions and handoffs that fit it." : "Any mix of the known settings, cycles, temperatures, minerals, pH, salt and handoffs, even if no place has it.", b.result, b.tl,
      `<span class="sc-line">Picked: ${esc(hypoSummary(b.state, M))}</span>`) +
      card(8, "Invented chemistry", `An invented helper, ${fmtSci(inv.K)} times faster, on every link of scenario 7.`, inv.result, inv.tl,
      `<span class="sc-line">Biggest lever: ${top && top.saved > 1e-6 ? esc(top.name) + ", saves " + esc(fmtMyr(top.saved)) + " Myr" : "none; every link already passes"}</span>`);
    $$("#hypoCards .sc-card").forEach((el) => { el.onclick = () => { const d = $("#hypoDetail"); if (d) d.scrollIntoView({ behavior: "smooth", block: "start" }); }; });
    segShow("#hypoHandSeg", P.hypoHandoffs || "best");
    $$("#hypoHandSeg button").forEach((x) => { x.onclick = () => { ctx.P().hypoHandoffs = x.dataset.v; ctx.recompute(); }; });
    const kp = (k, v, n) => `<div class="kpi"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div><div class="n">${esc(n)}</div></div>`;
    $("#hypo7Kpis").innerHTML = [
      kp("Scenario 7 needs", fmtMyr(b.total) + " Myr", fast ? `fastest of the six: ${fmtMyr(fast.total)} Myr (${fast.scenario.name})` : ""),
      kp("Floor no chemistry can beat", fmtMyr(b.result.t1 + b.result.t4 + b.result.t5) + " Myr", "T1 plus the biology terms T4 and T5"),
      kp("Successful tries per year", fmtSci(rate(b.result)), fast ? `fastest of the six: ${fmtSci(rate(fast))}` : ""),
      kp("Runs that fit", cnt(b.tl.tries), "in the window, one after another"),
    ].join("");
    const st7 = b.state;
    const sc = (id) => (M.scenarios.find((x) => x.id === id) || { name: id }).name;
    const hName = (id) => { const h = M.handoffs.find((x) => x.id === id); return h ? `${id}, ${h.species_and_handoff}` : id; };
    const minName = (id) => id === "none" ? "No mineral surface" : id.startsWith("mix:") ? (MIXN[id.slice(4)] || id.slice(4)) : ((M.minerals.find((x) => x.id === id) || { name: id }).name);
    segShow("#hypoModeSeg", P.hypoMode === "free" ? "free" : "place");
    $$("#hypoModeSeg button").forEach((x) => { x.onclick = () => { ctx.P().hypoMode = x.dataset.v; ctx.recompute(); }; });
    const isPlace = b.mode === "place";
    $("#hypoModeHint").innerHTML = isPlace
      ? "The model must choose one of seven physical places (the five real settings, plus two hybrids that combine an alkaline vent with land or a shore) and stay inside that place's temperature, pH, salinity, minerals and cycles. Every handoff must have the conditions it needs. Panspermia is left out because it is a delivery route, not a place."
      : "The model may combine anything, even choices no single place has. Conflicts are listed below the table. Useful as an upper bound, not as a description of a place.";
    const pl = isPlace ? b.place : null;
    const prow = (k, v) => ({ cells: [esc(k), esc(v)] });
    const placeRows = isPlace ? [
      prow("Place", pl.label),
      prow("What it is", pl.note),
      prow("Depth and setting", pl.depth),
      prow("Open to air, and drying", pl.air ? "Yes" : "No, always under water"),
      prow("Sunlight and UV", pl.sun ? "Yes; with no ozone, UV-C reaches the surface" : "No, dark"),
      prow("Land", pl.land),
      prow("Temperature", `${st7.T} C (allowed here: ${pl.T[0]} to ${pl.T[1]} C)`),
      prow("pH", `${st7.pH} (allowed: ${pl.pH[0]} to ${pl.pH[1]})`),
      prow("Salinity", `${st7.sal} g per kg (allowed: ${pl.sal[0]} to ${pl.sal[1]})`),
      prow("Mineral surface", minName(st7.mineral)),
      prow("Share of bound molecules held in confined spaces", String(st7.conf)),
      prow("Driving cycle", `${st7.cycle}, ${humanTime(b.result.tCycleS)} per cycle`),
      prow("Time to appear (T1)", `${fmtMyr(b.result.t1)} Myr, from ${sc(st7.t1From)}${pl.parents.length > 1 ? " (the slower parent)" : ""}`),
      prow("Number of sites", `${fmtSci(b.result.nSites)}, from ${sc(st7.sitesFrom)}${pl.parents.length > 1 ? " (the rarer parent)" : ""}`),
      ...(P.buildupOn === "on" ? [prow("Where chains are built up", st7.venue)] : []),
      prow("Molecules needed", "All building blocks are taken to be present here, as in the six settings. Supply is not counted unless the availability step S0 or a delivery route is switched on."),
    ] : [
      prow("Place", "None: a free mix"),
      prow("Time to appear (T1)", `${fmtMyr(b.result.t1)} Myr, from ${sc(st7.t1From)}`),
      prow("Number of sites", `${fmtSci(b.result.nSites)}, from ${sc(st7.sitesFrom)}`),
      prow("Driving cycle", `${st7.cycle}, ${humanTime(b.result.tCycleS)} per cycle`),
      prow("Temperature, pH, salinity", `${st7.T} C, pH ${st7.pH}, ${st7.sal} g per kg`),
      prow("Mineral surface", minName(st7.mineral)),
      prow("Share of bound molecules held in confined spaces", String(st7.conf)),
    ];
    ctx.table($("#tblHypo7Place"), ["", "Scenario 7"], placeRows);
    const rungName = (rid) => ({ S1: "S1, thermodynamic partitioning", S2: "S2, kinetic persistence", S3: "S3, accumulation and concentration", S4: "S4, autocatalytic amplification", S5: "S5, Darwinian selection" }[rid] || rid);
    const hRows = Object.entries(st7.handoffs).map(([rid, h]) => {
      const g = b.result.rungs.find((x) => x.rung === rid);
      return { cells: [esc(rungName(rid)), esc(hName(h)), esc(HANDOFF_NEEDS[h] ? HANDOFF_NEEDS[h].text : ""), g ? esc(fmtSci(g.p)) : ""] };
    });
    ctx.table($("#tblHypo7"), ["Step", "Handoff the model picked", "What it needs", { label: "Chance per try", n: true }], hRows);
    const cf = isPlace ? [] : conflictsOf(st7, M);
    $("#hypo7Conflicts").innerHTML = isPlace ? "All handoffs have the conditions they need in this place." : (cf.length ? "Conflicts: " + cf.map(esc).join("; ") + "." : "No conflicts found.");
    const placesList = isPlace ? b.places : [];
    ctx.table($("#tblHypoPlaces"), ["Place", "Best conditions found", { label: "Total, Myr", n: true }, { label: "Successful tries per year", n: true }],
      placesList.map((x) => ({ _cls: x.place.id === (pl && pl.id) ? "sel" : "", cells: x.none
        ? [esc(x.place.label), "No allowed conditions let every step use a handoff it can", "", ""]
        : [esc(x.place.label), esc(`${x.state.T} C, pH ${x.state.pH}, ${minName(x.state.mineral)}, ${x.state.cycle.toLowerCase()}`), esc(fmtMyr(x.total)), esc(fmtSci((x.result.attemptsPerS || 0) * secPerYr))] })));
    if (!isPlace) $("#tblHypoPlaces").innerHTML = "<tbody><tr><td>Choose one place that could exist to compare places.</td></tr></tbody>";
    $("#hypoKField").innerHTML = ctx.sliderFor("hypoK");
    ctx.wireParamInputs($("#hypoKField"));
    $("#hypo8Kpis").innerHTML = [
      kp("Scenario 8 needs", fmtMyr(inv.total) + " Myr", "helper on every link of scenario 7"),
      kp("Of that, biology", fmtMyr(inv.biology) + " Myr", "T4 and T5: no catalyst touches them"),
      kp("Successful tries per year", fmtSci(rate(inv.result)), ""),
    ].join("");
    const L = H.levers;
    const head = ["Link", ...L.cols.map((c) => ({ label: c.id === "SC7" ? "7" : String(M.scenarios.findIndex((x) => x.id === c.id) + 1), n: true }))];
    const lrows = L.rows.map((row) => ({ cells: [esc(row.id + ", " + row.name), ...row.cells.map((c, i) => {
      if (!c) return "";
      const isTop = L.top[i] && L.top[i].id === row.id && c.saved > 1e-3;
      const t = c.saved > 1e-3 ? fmtMyr(c.saved) : "0";
      return isTop ? `<strong>${esc(t)}</strong>` : esc(t);
    })] }));
    ctx.table($("#tblHypo8"), head, lrows);
    const tops = L.top.map((t, i) => t && t.saved > 1e-3 ? `${L.cols[i].id === "SC7" ? "7" : M.scenarios.findIndex((x) => x.id === L.cols[i].id) + 1}: ${t.id} (${fmtMyr(t.saved)} Myr)` : null).filter(Boolean);
    $("#hypo8Read").innerHTML = `Time saved, in Myr, if an invented helper made that one link ${esc(fmtSci(L.K))} times faster; columns are the settings 1 to 6 and scenario 7. ${tops.length ? `The biggest lever in each setting: ${esc(tops.join("; "))}. These are the links where a reaction we do not yet appreciate would change the time audit most.` : "No link saves a measurable time: with the current chemistry every step already passes, so the totals are set by the time to appear and by biology. Load the hard chemistry on this page to see which link an unknown reaction would need to fix."}`;
  }

  function renderStory(env, results) {
    const P = ctx.P();
    if (st.scenario >= results.length) st.scenario = 0;
    const r = results[st.scenario];
    $$("#storyScenarios .chip").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === st.scenario)));
    const steps = stepInfo(r, env, P);
    $("#storyRoute").innerHTML = steps.map((s, i) => `<button class="route-step${i === st.step ? " on" : ""}" data-i="${i}">
      <span class="rs-n">${i + 1}</span><span class="rs-t">${esc(s.title)}</span>${pillFor(s.pill[0], s.pill[1])}${s.conf ? starsHtml(s.conf[0], s.conf[1]) : ""}</button>`).join("");
    $$("#storyRoute .route-step").forEach((b) => { b.onclick = () => { st.step = +b.dataset.i; ctx.recompute(); }; });
    const s = steps[st.step];
    const g2 = r.rungs.find((x) => x.rung === "S2");
    const t5 = r.t5detail;
    $("#storyScene").innerHTML = sceneSvg(r.scenario.id, { stepIdx: st.step, pS2: g2 ? g2.p : 1, X: t5.on ? t5.X : 1, Y: t5.on ? t5.Y : 0, pairs: t5.pairs });
    $("#storyPanel").innerHTML = `<p class="eyebrow">Step ${st.step + 1} of ${steps.length}, ${esc(r.scenario.name)}</p>
      <h3 class="step-title">${esc(s.title)}</h3>
      <div class="step-pill">${pillFor(s.pill[0], s.pill[1])}${s.time != null ? `<span class="step-time">this step: <strong class="num">${esc(humanTime(s.time * 1e6 * S_YR))}</strong></span>` : ""}</div>
      <p>${s.body}</p>
      <div class="step-chart">${s.chart || ""}</div>
      ${s.conf ? `<p class="conf-line">Confidence ${starsHtml(s.conf[0], s.conf[1])} <span>${esc(s.conf[1])}.</span></p>` : ""}`;
    $("#storyDots").innerHTML = steps.map((_, i) => `<span class="dot${i === st.step ? " on" : ""}${i < st.step ? " done" : ""}"></span>`).join("");
    $("#storyPrev").disabled = st.step === 0;
    $("#storyNext").disabled = st.step === steps.length - 1;
  }

  function presetParams(name) {
    const P = ctx.P();
    if (name === "current") return P;
    const q = JSON.parse(JSON.stringify(P));
    q.coolingAnchors = P.coolingAnchors; q.nearOptions = P.nearOptions; q.farOptions = P.farOptions;
    return applyChem(q, name);
  }
  function renderMap(env) {
    if (!env) return;
    const M = ctx.MODEL();
    const q = presetParams(st.mapChem);
    const sweep = cycleSweep(M, q, auditScenario);
    const head = `<tr><th></th>${M.cycles.map((c) => `<th><button class="col-pick${c.name === ctx.P().cycleName ? " on" : ""}" data-cycle="${esc(c.name)}" title="Use this cycle in the model">${esc(c.name)}</button><span class="col-sub">${esc(humanTime(Math.sqrt(c.hadean_period_s_low * c.hadean_period_s_high)))}</span></th>`).join("")}</tr>`;
    const body = M.scenarios.map((sc, i) => {
      const fit = CYCLE_FIT[sc.id] || { main: null, ok: [] };
      return `<tr><th class="rowh">${esc(sc.name)}</th>${sweep[i].map((r, j) => {
        const c = M.cycles[j];
        const v = verdictAgainstBudget(r.total, env.budgetMyr);
        const cls = v.cls === "v-pass" ? "hm-pass" : v.cls === "v-marginal" ? "hm-mid" : "hm-fail";
        const rel = c.name === fit.main ? "main" : fit.ok.includes(c.name) ? "ok" : "no";
        return `<td class="${cls} hm-${rel}" title="${esc(sc.name + ", " + c.name + ": T3 " + humanTime(r.t3 * 1e6 * S_YR) + ", total " + fmtMyr(r.total) + " Myr")}">${esc(cellMyr(r.total))}</td>`;
      }).join("")}</tr>`;
    }).join("");
    $("#cycleMap").innerHTML = `<table class="heat"><thead>${head}</thead><tbody>${body}</tbody></table>`;
    $$("#cycleMap .col-pick").forEach((b) => { b.onclick = () => { ctx.P().cycleName = b.dataset.cycle; ctx.recompute(); ctx.toast("T3 is now driven by " + b.dataset.cycle); }; });
    // a plain reading of the map
    const spread = sweep.map((row) => Math.max(...row.map((r) => r.total)) / Math.min(...row.map((r) => r.total)));
    const maxSpread = Math.max(...spread);
    $("#cycleRead").innerHTML = maxSpread < 1.05
      ? "<strong>Here the cycle hardly matters.</strong> Every row is the same across, because waiting for luck (T3) is tiny next to the slow biology and the ecosystem. Switch to a hard chemistry to see the cycles start to count."
      : `<strong>Here the cycle matters.</strong> In the most sensitive setting the total changes by a factor of about ${cellMyr(maxSpread)} from the fastest to the slowest cycle. Faster cycles mean more tries per year, so the wait for luck shrinks.`;
  }

  function renderEco(env, results) {
    {
      const P0 = ctx.P();
      const tSplit = Math.LN2 / P0.ecoDivRate;
      const hit = SPLIT_PRESETS.find((x) => Math.abs(x.rate - P0.ecoDivRate) < 1e-9);
      segShow("#gSplitSeg", hit ? hit.id : null);
      if (document.activeElement !== $("#gSplitMyr")) $("#gSplitMyr").value = +tSplit.toPrecision(3);
      const t5 = P0.ecoOn !== false && !(P0.ecoMode === "direct") ? computeT5(P0) : null;
      $("#gSplitRead").innerHTML = `${hit ? esc(hit.hint) + " " : ""}One split every <b>${fmtMyr(tSplit)} Myr</b> means a splitting rate of ${(+P0.ecoDivRate.toPrecision(3))} per lineage per Myr. ${t5 ? `Reaching ${t5.X} kinds then takes ln(${t5.X}) / rate = <b>${fmtMyr(t5.tDiv)} Myr</b>, and the ecosystem term T5 is <b>${fmtMyr(t5.totalMyr)} Myr</b>.` : "Switch on an ecosystem above to see what it does to T5."} <a href="https://pubmed.ncbi.nlm.nih.gov/30061564/" target="_blank" rel="noopener">Louca et al. 2018</a>.`;
    }
    const P = ctx.P();
    segShow("#ecoModeSeg", P.ecoOn === false ? "off" : P.ecoMode);
    segShow("#ecoOverlapSeg", P.ecoOverlap !== false ? "yes" : "no");
    segShow("#restartSeg", P.restartNeedsT1 ? "yes" : "no");
    const t5 = computeT5(P);
    $("#ecoKpis").innerHTML = [
      ["Time to split into " + t5.X + " kinds", fmtMyr(t5.tDiv) + " Myr", "ln(X) divided by " + P.ecoDivRate + " per Myr"],
      ["Time to make " + t5.Y + " links", fmtMyr(t5.tInt) + " Myr", `${Math.round(t5.C * 100)}% of ${t5.pairs} possible pairs`],
      ["T5, the ecosystem", t5.on ? fmtMyr(t5.totalMyr) + " Myr" : "off", t5.on ? (t5.direct ? "set directly" : t5.overlap ? "the longer of the two" : "the two added") : "left out of the audit"],
    ].map(([k, v, n]) => `<div class="kpi"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div><div class="n">${esc(n)}</div></div>`).join("");
    const warn = [];
    if (t5.capped) warn.push(`You asked for ${t5.Yasked} links, but ${t5.X} kinds only have ${t5.pairs} possible pairs, so the model uses ${t5.pairs}.`);
    if (t5.nearFull) warn.push("Almost every pair interacts. The last links are the slowest, so the time rises very fast here.");
    $("#ecoWarn").innerHTML = warn.map((w) => `<div class="warn">${esc(w)}</div>`).join("");
    ctx.setFig("ecoNet", ecoNetSvg(P, 480), "#figEcoNet");
    ctx.setFig("ecoCurve", ecoCurveSvg(P, 620), "#figEcoCurve");
    ctx.setFig("timeLeft", timeLeftSvg(results, env, P, ctx.figW(940)), "#figTimeLeft");
    ctx.table($("#tblTimeLeft"),
      [{ label: "Setting" }, { label: "Needed, Myr", n: 1 }, { label: "Left, Myr", n: 1 }, { label: "One try, Myr", n: 1 }, { label: "Tries that fit", n: 1 }, { label: "Tries that stopped", n: 1 }, { label: "Chance it fits" }],
      results.map((r) => { const tl = timeLeft(r, env.budgetMyr, P); return { cells: [
        `<strong>${esc(r.scenario.name)}</strong>`, fmtMyr(r.total), tl.remaining >= 0 ? fmtMyr(tl.remaining) : `<span class="v-fail">${esc(fmtMyr(tl.remaining))}</span>`,
        fmtMyr(tl.run), cnt(tl.tries), cnt(tl.stopped), esc(pctText(tl.pFit))] }; }));
  }


  function renderHard(env) {
    const P = ctx.P(), M = ctx.MODEL();
    const T = P.effectiveTempC ?? P.chemTempC;
    const defH = defaultParams().rungHandoff;
    const pOf = (id) => handoffState(M.handoffs.find((h) => h.id === id), T, P.eaTransfer, P.eaLoss);
    let jd = 1, jh = 1;
    const rows = ["S2", "S3", "S4"].map((rid) => {
      const d = M.handoffs.find((h) => h.id === defH[rid]), h = M.handoffs.find((x) => x.id === HARD_SWAP[rid]);
      const sd = pOf(d.id), sh = pOf(h.id); jd *= sd.p; jh *= sh.p;
      return { cells: [
        `<strong>${esc(RUNG_SHORT[rid])}</strong>`,
        `${esc(d.species_and_handoff)} ${starsHtml(tierStars(d.tier), "Rates are " + d.tier)}<div class="hint">forms in ${esc(humanTime(sd.tauTransfer))}, lasts ${esc(humanTime(sd.tauLoss))}</div>`,
        `<span class="pill ${sd.p >= 0.5 ? "e" : "h"}">${esc(pctText(sd.p))}</span>`,
        `${esc(h.species_and_handoff)} ${starsHtml(tierStars(h.tier), "Rates are " + h.tier)}<div class="hint">forms in ${esc(humanTime(sh.tauTransfer))}, lasts ${esc(humanTime(sh.tauLoss))}</div>`,
        `<span class="pill ${sh.p >= 0.5 ? "e" : sh.p >= 0.01 ? "m" : "h"}">${esc(pctText(sh.p))}</span>`,
        `<span class="hint">${esc(HARD_PLAIN[rid])}</span>`] };
    });
    rows.push({ cells: ["<strong>Successes needed</strong>", "One lucky success is enough", "<span class=\"pill e\">1</span>", `A billion separate successes before one takes hold, a stress test rather than an estimate ${starsHtml(1, "A deliberate worst case")}`, "<span class=\"pill h\">1,000,000,000</span>", "<span class=\"hint\">This multiplies the wait for luck (T3) by a billion.</span>"] });
    ctx.table($("#tblHard"), [{ label: "Step" }, { label: "Default molecule" }, { label: "Chance per try" }, { label: "Hard molecule" }, { label: "Chance per try" }, { label: "Why it is hard" }], rows);
    $("#hardSum").innerHTML = `At ${Math.round(T)} C in free water, all three default steps together pass ${esc(pctText(jd))} of the time; the three hard steps together pass ${esc(pctText(jh))} of the time, before any surface helps. A mineral surface can raise the hard chances again, which is why the two hard choices differ.`;
    $("#elemGrid").innerHTML = elementGridHtml(M);
    $("#elemStars").innerHTML = starsHtml(2, "A qualitative rating drawn from the manuscript's reading of the literature");
  }

  function renderCycleExplain(env) {
    const M = ctx.MODEL();
    const CYC_CONF = { "Wet and dry": [2, "Hours to a day per event, from pool and lab studies"], "Day and night": [2, "6 to 17 hours, from models of the early Earth's spin"], "Hot and cold, local": [1, "Set by local mixing, a judgement"], "Tides": [2, "Shorter and stronger with a closer Moon, from lunar recession models"], "pH and redox at interfaces": [1, "Continuous rather than periodic, so the period is a judgement"], "Raft transit and beaching": [2, "From modern pumice rafts"] };
    ctx.table($("#tblCycles"), [{ label: "Cycle" }, { label: "One cycle in the Hadean" }, { label: "Steps it serves" }, { label: "Confidence" }],
      M.cycles.map((c) => { const cf = CYC_CONF[c.name] || [1, ""]; return { cells: [`<strong>${esc(c.name)}</strong>`, esc(c.hadean_period_s_low === c.hadean_period_s_high ? humanTime(c.hadean_period_s_low) : humanTime(c.hadean_period_s_low) + " to " + humanTime(c.hadean_period_s_high)), esc(c.rungs_served), starsHtml(cf[0], cf[1])] }; }));
    // cycle against surface, for the chemistry chosen for the map
    const q = presetParams(st.mapChem);
    const sweep = cycleSweep(M, q, auditScenario);
    const onP = { ...q, surfaceMode: "scenario" }, offP = { ...q, surfaceMode: "off" };
    const rows = M.scenarios.map((sc, i) => {
      const fit = CYCLE_FIT[sc.id] || { main: null, ok: [] };
      const names = [fit.main, ...fit.ok].filter(Boolean);
      const sub = sweep[i].filter((r, j) => names.includes(M.cycles[j].name));
      const t3s = sub.map((r) => r.t3), tots = sub.map((r) => r.total);
      const cyc = Math.max(...t3s) / Math.min(...t3s);
      const a = auditScenario(sc, onP, M), b = auditScenario(sc, offP, M);
      const surf = a.t3 > 0 ? b.t3 / a.t3 : 1;
      const totLo = Math.min(...tots, a.total, b.total), totHi = Math.max(...tots, a.total, b.total);
      const shows = totHi / totLo > 1.05;
      const bigger = surf > cyc * 1.5 ? "surface" : cyc > surf * 1.5 ? "cycle" : "similar";
      return { cells: [`<strong>${esc(sc.name)}</strong>`, esc(names.length ? names.join(", ") : "none"),
        `<span class="num">${esc(names.length > 1 ? "x " + cellMyr(cyc) : "one cycle only")}</span>`,
        `<span class="num">x ${esc(cellMyr(surf))}</span>`,
        !shows ? "neither, in the total" : bigger === "surface" ? "the surface" : bigger === "cycle" ? "the cycle" : "about the same",
        shows ? `yes, ${esc(cellMyr(totLo))} to ${esc(cellMyr(totHi))} Myr` : `no, about ${esc(cellMyr(totLo))} Myr either way`] };
    });
    ctx.table($("#tblCycleSurf"), [{ label: "Setting" }, { label: "Cycles that fit" }, { label: "Wait for luck changes, across those cycles" }, { label: "Wait for luck changes, surface on or off" }, { label: "Which matters more" }, { label: "Seen in the total?" }], rows);
  }

  // Main cycle of a setting, for tables that compare settings fairly.
  function mainCycle(sc) {
    const fit = CYCLE_FIT[sc.id] || {};
    return fit.main || (STORY[sc.id] && STORY[sc.id].cycle) || "Day and night";
  }

  function renderCurrency(env) {
    if (!env || !$("#tblCurrency")) return;
    const P = ctx.P(), M = ctx.MODEL();
    segShow("#curRoleSeg", P.cycleRole === "currency" ? "currency" : "clock");
    segShow("#curCyclesSeg", P.currencyCycles === "all" ? "all" : "drying");
    let src = "custom";
    for (const [k, v] of Object.entries(CURRENCY_SOURCES)) if (Math.abs(P.yieldPerCycle - v.y) / v.y < 1e-3) src = k;
    P.yieldSource = src;
    segShow("#curSrcSeg", src);
    $("#curSrcHint").textContent = CURRENCY_SOURCES[src] ? CURRENCY_SOURCES[src].note : "A value of your own, set with the slider below.";
    $("#curStars").innerHTML = starsHtml(1, "The yield is measured (two stars), but the loss per cycle and the bonds needed are judgements");
    const floors = [];
    const rows = M.scenarios.map((sc) => {
      const cyc = mainCycle(sc);
      const c = M.cycles.find((x) => x.name === cyc);
      const a = auditScenario(sc, { ...P, cycleName: cyc, cycleRole: "clock" }, M);
      const b = auditScenario(sc, { ...P, cycleName: cyc, cycleRole: "currency" }, M);
      const ra = a.rungs.find((x) => x.currency && x.currency.eligible);
      const rb = b.rungs.find((x) => x.currency && x.currency.eligible);
      const vb = verdictAgainstBudget(b.total, env.budgetMyr), va = verdictAgainstBudget(a.total, env.budgetMyr);
      const pays = rb && rb.currency.on;
      const ht = (myr) => humanTime(myr * secPerMyr);
      const pair = (x, y) => Math.abs(y - x) <= 1e-9 * Math.max(Math.abs(x), 1e-300) ? `<span class="num">${esc(ht(x))}</span><br><span class="hint">no change</span>` : `<span class="num">${esc(ht(x))}</span><br>to <span class="num">${esc(ht(y))}</span>`;
      const fixedA = a.t1 + a.t4 + a.t5;
      floors.push(a.t4 + a.t5);
      return { cells: [
        `<strong>${esc(sc.name)}</strong>`,
        `${esc(cyc)}<br><span class="hint">${c && c.dries ? "dries" : "does not dry"}</span>`,
        ra ? `<span class="num">${esc(pctText(ra.p))}</span><br>to <span class="num">${esc(pctText(rb.p))}</span>` : `<span class="hint">no joining step in use</span>`,
        pair(a.t3, b.t3),
        pair(a.t2, b.t2),
        `<span class="num">${esc(cellMyr(a.total))}</span><br>to <span class="num">${esc(cellMyr(b.total))}</span><br><span class="hint">of which T1 + T4 + T5: ${esc(cellMyr(fixedA))}</span>`,
        `<span class="${vb.cls}">${esc(vb.text)}</span>${va.text !== vb.text ? `<br><span class="hint">was: ${esc(va.text)}</span>` : ""}`,
      ] };
    });
    ctx.table($("#tblCurrency"), [{ label: "Setting" }, { label: "Main cycle" }, { label: "Joining step, chance" }, { label: "Wait for luck, T3" }, { label: "Chemistry time, T2" }, { label: "Total, Myr" }, { label: "With currency" }], rows);
    const floor = Math.min(...floors);
    $("#curTotNote").innerHTML = `Why the total often stays the same: the cycle changes only the wait for luck (T3) and, as a currency, adds the time to make one product to the chemistry time (T2). Every setting also needs slow biology and the ecosystem (T4 + T5, at least ${esc(cellMyr(floor))} Myr here) and must wait for its setting to exist (T1). The total moves only when T3 or T2 grows to a visible share of that, for example with many bonds, a slow cycle, or hard chemistry without surfaces. Totals of 10 Myr or more are shown to the nearest whole Myr.`;
    // a worked reading for the wet and dry cycle
    const wd = M.cycles.find((c) => c.name === "Wet and dry");
    const hid = P.rungHandoff.S5 && M.handoffs.find((h) => h.id === P.rungHandoff.S5 && h.cycle_currency) ? P.rungHandoff.S5 : "H11";
    const h = M.handoffs.find((x) => x.id === hid);
    const stt = handoffState(h, P.effectiveTempC, P.eaTransfer, P.eaLoss);
    const cur = cycleCurrency(h, stt, wd, geomean(wd.hadean_period_s_low, wd.hadean_period_s_high), { ...P, cycleRole: "currency", currencyCycles: "all" });
    ctx.setFig("currency", currencySvg(cur, Math.min(520, ctx.figW(520))), "#figCurrency");
    const share = cur.chemShare;
    $("#curRead").innerHTML = `On the wet and dry cycle, ${esc(shortName(h))} gains ${esc(pctText(cur.y))} per cycle and loses ${esc(pctText(cur.d + cur.tCycleS / cur.tauChem))} per cycle, ${share > 0.5 ? "mostly by breaking down in water between dryings" : "mostly by damage in each cycle"}. So each bond is made with a chance of ${esc(pctText(cur.pBond))}, and a product of ${cur.bonds} bond${cur.bonds > 1 ? "s" : ""} with a chance of ${esc(pctText(cur.p))}. ${P.cycleRole === "currency" ? "This is now part of the whole model." : "Switch the role to clock and currency to use this in the whole model."} Confidence: yield ${starsHtml(2, "Measured by Eiby 2025 and others, at laboratory conditions")}, loss ${starsHtml(1, "Not measured yet")}, bonds needed ${starsHtml(1, "A choice about what counts as a useful product")}.`;
  }

  const lc = (s) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  function renderMatters(env) {
    if (!env || !$("#tblMatters")) return;
    const P = ctx.P(), M = ctx.MODEL();
    const scopeBtns = [["all", "All six settings"], ...M.scenarios.map((sc) => [sc.id, sc.name])];
    $("#mattersScope").innerHTML = scopeBtns.map(([k, l]) => `<button class="chip" data-v="${k}" aria-pressed="${st.mScope === k}">${esc(l)}</button>`).join("");
    $$("#mattersScope .chip").forEach((b) => { b.onclick = () => { st.mScope = b.dataset.v; renderMatters(ctx.lastEnv()); }; });
    const ids = st.mScope === "all" ? M.scenarios.map((s) => s.id) : [st.mScope];
    const R = computeMatters(M, P, ids, CYCLE_FIT);
    const nameOf = (id) => (M.scenarios.find((s) => s.id === id) || {}).name || id;
    const top = R.rows[0];
    const maxL = Math.max(1, ...R.rows.map((r) => Math.log10(r.maxF)));
    const chemName = (CHEM_PRESETS[chemOf(P)] || { label: "your own" }).label.toLowerCase();
    const fitNow = R.scs.filter((sc, i) => R.baseTot[i] <= R.budget).length;
    const kp = (k, v, n) => `<div class="kpi"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span>${n ? `<span class="n">${esc(n)}</span>` : ""}</div>`;
    $("#mattersKpis").innerHTML = [
      kp("Window", cellMyr(R.budget) + " Myr", "as chosen on the start page"),
      kp("Chemistry", chemName, P.cycleRole === "currency" ? "the cycle also pays" : "the cycle is a clock only"),
      kp("Settings that fit now", fitNow + " of " + R.scs.length, ids.length === 1 ? nameOf(ids[0]) : "at the current settings"),
      kp("Inputs that move the total", String(R.rows.length), R.still.length + " others make no visible difference"),
    ].join("");
    const rows = R.rows.map((r, i) => {
      const w = Math.max(2, (Math.log10(r.maxF) / maxL) * 100);
      const isT = R.target && r.key === R.target.key;
      const fmin = Math.min(...r.factors);
      const where = ids.length > 1 && r.worstId ? (r.maxF > fmin * 1.5 ? `<br><span class="hint">most in ${esc(nameOf(r.worstId))}</span>` : `<br><span class="hint">about the same in every setting</span>`) : "";
      return { cls: isT ? "target" : "", cells: [
        `<span class="num">${i + 1}</span>`,
        `<strong>${esc(r.label)}</strong>${isT ? `<span class="tgt">best target</span>` : ""}`,
        starsHtml(r.stars),
        esc(r.rangeText),
        `<div class="mcell"><div class="mbar s${r.stars}"><span style="width:${w.toFixed(1)}%"></span></div><span class="num">${r.noWindow ? "closes the window" : "x " + esc(cellMyr(r.maxF))}</span></div>${where}`,
        r.flips.length ? r.flips.map((id) => `<span class="flip">${esc(nameOf(id))}</span>`).join("") : `<span class="nofl">none</span>`,
        esc(r.need),
      ] };
    });
    ctx.table($("#tblMatters"), [{ label: "" }, { label: "Input" }, { label: "Confidence" }, { label: "Range tested" }, { label: "Total time changes" }, { label: "Moves in or out of the window" }, { label: "Data that would set it" }], rows);
    // mark the target row
    $$("#tblMatters tbody tr").forEach((tr, i) => { if (R.rows[i] && R.target && R.rows[i].key === R.target.key) tr.classList.add("target"); });
    const flipsAll = [...new Set(R.rows.flatMap((r) => r.flips))];
    let read = top ? `For ${ids.length > 1 ? "the six settings" : esc(nameOf(ids[0]))}, the input that moves the total most is <strong>${esc(lc(top.label))}</strong> (up to ${esc(cellMyr(top.maxF))} times). ` : "No input moves the total visibly. ";
    if (R.target) read += `The best target for new data is <strong>${esc(lc(R.target.label))}</strong>: one star, and it changes the total up to ${esc(cellMyr(R.target.maxF))} times${R.target.flips.length ? ", enough to move " + esc(R.target.flips.map(nameOf).join(", ")) + " into or out of the window" : ""}. `;
    read += flipsAll.length ? `Across the ranges tested, ${esc(flipsAll.map(nameOf).join(", "))} can move into or out of the window.` : "No setting moves into or out of the window across the ranges tested.";
    $("#mattersRead").innerHTML = read;
    $("#dlMatters").onclick = () => {
      const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
      const head = ["rank", "input", "stars", "range tested", "largest factor on total", ...R.scs.map((sc) => "factor " + sc.name), "moves in or out of window", "data that would set it"];
      const lines = [head.map(q).join(",")].concat(R.rows.map((r, i) => [i + 1, r.label, r.stars, r.rangeText, r.maxF.toPrecision(3), ...r.factors.map((f) => f.toPrecision(3)), r.flips.map(nameOf).join("; "), r.need].map(q).join(",")));
      const blob = new Blob([lines.join("\n")], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pass-or-perish-what-matters-most.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $("#mattersStill").textContent = R.still.length ? "No visible effect on the total (less than 5 per cent) for these inputs: " + R.still.map((r) => lc(r.label)).join("; ") + "." : "";
  }

  function render(env, results) {
    renderStart(env, results);
    renderStory(env, results);
    renderPP();
    renderMap(env);
    renderHard(env);
    renderCycleExplain(env);
    renderEco(env, results);
    renderCurrency(env);
    renderMatters(env);
  }

  return { build, render, state: st, timeLeftSvg, ecoNetSvg, ecoCurveSvg };
}
