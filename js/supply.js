// Version 7, page "Start and supply": the start of the clock built from accretion and volatiles,
// the ocean view, boron and the ribose step, and delivery from space as a shortcut.
// Every number on this page comes from the same engine as the rest of the app.

import {
  auditScenario, computeEnvelope, buildStart, resupplyMyr, ACCRETION_PATHS, START_EVIDENCE,
  BORATE_LEVELS, DELIVERY_SOURCES, LATE_ACCRETION, fmtSci, fmtMyr,
} from "./engine.js";
import { SPEC } from "./params.js";
import { humanTime } from "./charts.js";

const C = {
  teal: "#20808d", terra: "#a84b2f", darkTeal: "#1b474d", cyan: "#bce2e7", mauve: "#944454",
  gold: "#ffc553", olive: "#848456", text: "#28251d", muted: "#6e6b63", faint: "#a8a49b",
  border: "#d9d5cc", surface: "#fdfdfb", fail: "#a13544", light: "#f1efe9",
};
const FONT = "Switzer, system-ui, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tx = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.fill || C.text}" font-size="${o.size || 11}" font-weight="${o.weight || 400}" text-anchor="${o.anchor || "start"}">${esc(s)}</text>`;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const stars = (n) => n > 0 ? `<span class="stars" title="${n} of 3">${"\u2605".repeat(n)}<span class="off">${"\u2605".repeat(3 - n)}</span></span>` : "";
const SEC_PER_MYR = 3.15576e13;
const ht = (myr) => humanTime(myr * SEC_PER_MYR);
const cellMyr = (v) => (!isFinite(v) ? "never" : v >= 1e6 ? fmtSci(v) : v >= 10 ? Math.round(v).toLocaleString("en-GB") : v >= 1 ? v.toFixed(1) : v.toPrecision(2));
const pct = (p) => (p >= 0.995 ? "practically certain" : p >= 0.01 ? Math.round(p * 100) + " per cent" : "1 in " + fmtSci(1 / p));

// Literature that sits behind the buttons. Each entry has a URL that was read for this update.
export const SUPPLY_REFS = {
  zahnle2007: { cite: "Zahnle, K. et al. 2007. Emergence of a habitable planet. Space Science Reviews", url: "https://sseh.uchicago.edu/doc/Zahnle2007.pdf" },
  sleep2001: { cite: "Sleep, N. H., Zahnle, K. and Neuhoff, P. S. 2001. Initiation of clement surface conditions on the earliest Earth. PNAS", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC31109/" },
  zahnle2010: { cite: "Zahnle, K., Schaefer, L. and Fegley, B. 2010. Earth's earliest atmospheres. Cold Spring Harbor Perspectives in Biology", url: "https://pubmed.ncbi.nlm.nih.gov/20573713/" },
  sleep2010: { cite: "Sleep, N. H. 2010. The Hadean-Archaean environment. Cold Spring Harbor Perspectives in Biology", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2869525/" },
  miyazaki2022: { cite: "Miyazaki, Y. and Korenaga, J. 2022. A wet heterogeneous mantle creates a habitable world in the Hadean. Nature", url: "https://www.nature.com/articles/s41586-021-04371-9" },
  loth2026: { cite: "Loth, S. et al. 2026. Early Hadean Earth conditions were ideal for prebiotic chemistry. EarthArXiv preprint", url: "https://eartharxiv.org/repository/view/15138/" },
  tidal2025: { short: "Tidal heating preprint 2025", cite: "Onset of habitable conditions set by tidal heating after the Moon-forming impact. arXiv preprint 2511.00952", url: "https://arxiv.org/html/2511.00952v1" },
  elkins2011: { cite: "Elkins-Tanton, L. T. 2011. Formation of early water oceans on rocky planets. Astrophysics and Space Science", url: "https://arxiv.org/pdf/1011.2710v1" },
  johansen2021: { cite: "Johansen, A. et al. 2021. A pebble accretion model for the formation of the terrestrial planets in the Solar System. Science Advances", url: "https://pubmed.ncbi.nlm.nih.gov/33597233/" },
  johansen2023: { cite: "Johansen, A. et al. 2023. Anatomy of rocky planets formed by rapid pebble accretion III. Partitioning of volatiles between core, mantle and atmosphere. Astronomy and Astrophysics", url: "https://ar5iv.labs.arxiv.org/html/2207.09807" },
  onyett2023: { cite: "Onyett, I. J. et al. 2023. Silicon isotope constraints on terrestrial planet accretion. Nature", url: "https://pubmed.ncbi.nlm.nih.gov/37316662/" },
  jacobsen2005: { cite: "Jacobsen, S. B. 2005. The Hf-W isotopic system and the origin of the Earth and Moon. Annual Review of Earth and Planetary Sciences", url: "https://www.eoas.ubc.ca/~mjelline/453website/eosc453/E_prints/AnnRev.33.092203.122614.pdf" },
  natrev2022: { short: "Nature Reviews 2022", cite: "Nature Reviews Earth and Environment 2022. The accretion of planet Earth", url: "https://www.nature.com/articles/s43017-022-00370-0" },
  barboni2017: { cite: "Barboni, M. et al. 2017. Early formation of the Moon 4.51 billion years ago. Science Advances", url: "https://www.science.org/doi/10.1126/sciadv.1602365" },
  nimmo2024: { cite: "Nimmo, F. et al. 2024. Tidally driven remelting around 4.35 billion years ago indicates the Moon is old. Nature", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11655352/" },
  abramov2026: { cite: "Abramov, O. et al. 2026. A Hadean timeline for the emergence of the RNA world. Nature Communications", url: "https://www.nature.com/articles/s41467-026-76978-3" },
  wilde2001: { cite: "Wilde, S. A. et al. 2001. Evidence from detrital zircons for the existence of continental crust and oceans on the Earth 4.4 Gyr ago. Nature", url: "https://www.nature.com/articles/35051550" },
  mojzsis2001: { cite: "Mojzsis, S. J., Harrison, T. M. and Pidgeon, R. T. 2001. Oxygen-isotope evidence from ancient zircons for liquid water at the Earth's surface 4,300 Myr ago. Nature", url: "https://www.nature.com/articles/35051557" },
  gamaleldien2024: { cite: "Gamaleldien, H. et al. 2024. Onset of the Earth's hydrological cycle four billion years ago or earlier. Nature Geoscience", url: "https://www.nature.com/articles/s41561-024-01450-0" },
  korenaga2021: { cite: "Korenaga, J. 2021. Was there land on the early Earth? Life", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8623345/" },
  furukawa2013: { cite: "Furukawa, Y., Horiuchi, M. and Kakegawa, T. 2013. Selective stabilization of ribose by borate. Origins of Life and Evolution of Biospheres", url: "https://link.springer.com/content/pdf/10.1007/s11084-013-9350-5.pdf" },
  ricardo2004: { cite: "Ricardo, A. et al. 2004. Borate minerals stabilize ribose. Science", url: "https://pubmed.ncbi.nlm.nih.gov/14716004/" },
  benner2010: { cite: "Benner, S. A. et al. 2010. Planetary organic chemistry and the origins of biomolecules. Cold Spring Harbor Perspectives in Biology", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2890202/" },
  grew2011: { cite: "Grew, E. S. et al. 2011. How many boron minerals occurred in Earth's upper crust during the Hadean eon? Origins of Life and Evolution of Biospheres", url: "https://hazen.carnegiescience.edu/sites/default/files/220-Grew-Borates-OLEB-2011.pdf" },
  pearce2017: { cite: "Pearce, B. K. D. et al. 2017. Origin of the RNA world: the fate of nucleobases in warm little ponds. PNAS", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5664528/" },
  glavin2025: { cite: "Glavin, D. P. et al. 2025. Abundant ammonia and nitrogen-rich soluble organic matter in samples from asteroid (101955) Bennu. Nature Astronomy", url: "https://ntrs.nasa.gov/citations/20250001355" },
  furukawa2025: { cite: "Furukawa, Y. et al. 2025. Bio-essential sugars in samples from asteroid Bennu. Nature Geoscience (NASA report copy)", url: "https://ntrs.nasa.gov/api/citations/20250010936/downloads/GlavinBioessentialSTI.pdf" },
  ioppolo2021: { cite: "Ioppolo, S. et al. 2021. A non-energetic mechanism for glycine formation in the interstellar medium. Nature Astronomy", url: "https://www.nature.com/articles/s41550-020-01249-0" },
  krasno2022: { cite: "Krasnokutski, S. A. et al. 2022. A pathway to peptides in space through the condensation of atomic carbon. Nature Astronomy", url: "https://arxiv.org/abs/2202.12170" },
  intercat2026: { short: "InterCat authors 2026", cite: "An interstellar energetic and non-aqueous pathway to peptide formation. Nature Astronomy 2026, with InterCat authors", url: "https://www.nature.com/articles/s41550-025-02765-7" },
  intercat: { short: "InterCat centre", cite: "Center for Interstellar Catalysis (InterCat), Aarhus University. Danish National Research Foundation", url: "https://dg.dk/en/centers/center-for-interstellar-catalysis-intercat/" },
  todd2020: { cite: "Todd, Z. R. and Oberg, K. I. 2020. Cometary delivery of hydrogen cyanide to the early Earth. Astrobiology", url: "https://pubmed.ncbi.nlm.nih.gov/32749859/" },
  mehta2018: { cite: "Mehta, C. et al. 2018. Caveats to exogenous organic delivery from ablation, dilution, and thermal degradation. Life", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6027357/" },
};
// Short label such as "Zahnle et al. 2007" or "Miyazaki and Korenaga 2022", from the full citation.
function shortCite(r) {
  if (r.short) return r.short;
  const y = (r.cite.match(/\b(19|20)\d\d\b/) || [""])[0];
  const head = r.cite.split(/\b(19|20)\d\d\b/)[0];
  const two = head.match(/^([A-Z][A-Za-z-]+), [A-Z. -]+ and ([A-Z][A-Za-z-]+),/);
  if (two) return `${two[1]} and ${two[2]} ${y}`;
  const first = head.split(",")[0].trim();
  const many = /et al\./.test(head) || (head.match(/,/g) || []).length > 1;
  return `${first}${many ? " et al." : ""} ${y}`.trim();
}
const link = (k, label) => { const r = SUPPLY_REFS[k]; return r ? `<a href="${esc(r.url)}" target="_blank" rel="noopener" title="${esc(r.cite)}">${esc(label || shortCite(r))}</a>` : esc(label || k); };

const MOON_PRESETS = [
  { v: 4.51, label: "4.51 Ga, early", ref: "barboni2017" },
  { v: 4.47, label: "4.47 Ga, middle", ref: "natrev2022" },
  { v: 4.35, label: "4.35 Ga, late", ref: "nimmo2024" },
];
const SOLID_PRESETS = [
  { v: 2, label: "2 Myr, surface only", ref: "zahnle2007" },
  { v: 150, label: "150 Myr, whole mantle", ref: "tidal2025" },
  { v: 500, label: "500 Myr, with tidal heating", ref: "tidal2025" },
];
const CO2_PRESETS = [
  { v: 1, label: "1 Myr, water at once", ref: "loth2026" },
  { v: 10, label: "10 Myr, fast", ref: "zahnle2007" },
  { v: 30, label: "30 Myr, middle", ref: "zahnle2010" },
  { v: 100, label: "100 Myr, slow", ref: "sleep2010" },
  { v: 160, label: "160 Myr, wet uneven mantle", ref: "miyazaki2022" },
];
const OCEAN_VIEWS = {
  shallow: { factor: 1, label: "Shallow ocean, land at once", ref: "loth2026", stars: 1,
    plain: "A thick early crust holds much of the water, the ocean is only tens to hundreds of metres deep, and land stands above it from the start (Loth et al. 2026, preprint). The land factor is 1." },
  model: { factor: null, label: "As set before", ref: null, stars: 1,
    plain: "The land factor keeps the value set on the parameters page (default 3)." },
  deep: { factor: 20, label: "Deep water world, little land", ref: "korenaga2021", stars: 2,
    plain: "A hotter, drier mantle holds less water, so the early ocean is up to about twice today's volume and most continents are under water (Korenaga 2021). Fresh-water zircons put some dry land in place by 4.0 Ga (Gamaleldien et al. 2024). The land factor is 20, the top of its range." },
};
const COVER_STEPS = [
  ["S1", "S1 sorting by energy"], ["S2", "S2 lasting long enough"], ["S2r", "Ribose step"],
  ["S3", "S3 gathering"], ["S4", "S4 making more"], ["S5", "S5 copying"],
];

function startSvg(env, b, w = 900) {
  const h = 270, l = 30, r = 30, t = 26;
  const gaMax = 4.57, gaMin = Math.min(3.95, env.farGa - 0.05);
  const X = (ga) => l + ((gaMax - ga) / (gaMax - gaMin)) * (w - l - r);
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="From the last giant impact to the start of the clock" font-family="${FONT}"><rect width="${w}" height="${h}" fill="${C.surface}"/>`;
  const axisY = 150;
  o += `<line x1="${l}" y1="${axisY}" x2="${w - r}" y2="${axisY}" stroke="${C.border}" stroke-width="1.5"/>`;
  for (let g = 4.5; g >= gaMin - 1e-9; g -= 0.1) {
    const x = X(g);
    o += `<line x1="${x}" y1="${axisY - 4}" x2="${x}" y2="${axisY + 4}" stroke="${C.faint}"/>` + tx(x, axisY + 18, g.toFixed(1) + " Ga", { anchor: "middle", size: 10, fill: C.muted });
  }
  o += tx(X(4.567), axisY - 8, "first solids 4.567", { anchor: "start", size: 9.5, fill: C.muted });
  if (b) {
    const xm = X(b.moonGa), xs = X(b.moonGa - b.solid / 1000), xe = X(b.startGa);
    const bar = (x0, x1, y, col, label) => {
      const ww = Math.max(2, x1 - x0);
      return `<rect x="${x0}" y="${y}" width="${ww}" height="16" rx="3" fill="${col}" opacity="0.85"/>` + tx(Math.min(x0 + ww + 6, w - r - 4), y + 12, label, { size: 10.5, anchor: x0 + ww + 160 > w ? "end" : "start", fill: C.text });
    };
    o += `<line x1="${xm}" y1="${t}" x2="${xm}" y2="${axisY}" stroke="${C.mauve}" stroke-width="2"/>` + tx(xm + 4, t + 8, "Moon-forming impact " + b.moonGa.toFixed(2), { size: 10.5, fill: C.mauve, weight: 600 });
    o += bar(xm, xs, 46, C.terra, "surface solid, " + fmtMyr(b.solid) + " Myr");
    o += bar(xs, X(b.moonGa - (b.solid + b.draw) / 1000), 68, C.olive, "CO2 back into the rock, " + fmtMyr(b.draw) + " Myr");
    if (b.resup > 0) o += bar(xs, X(b.moonGa - (b.solid + b.resup) / 1000), 90, C.gold, "volatiles re-supplied, " + fmtMyr(b.resup) + " Myr");
    o += `<line x1="${xe}" y1="${t + 12}" x2="${xe}" y2="${axisY}" stroke="${C.darkTeal}" stroke-width="2.5"/>` + tx(xe + 4, 124, "start " + b.startGa.toFixed(3) + " Ga", { size: 11, weight: 700, fill: C.darkTeal });
  } else {
    const xe = X(env.nearGa);
    o += `<line x1="${xe}" y1="${t + 12}" x2="${xe}" y2="${axisY}" stroke="${C.darkTeal}" stroke-width="2.5"/>` + tx(xe + 4, 124, "start " + env.nearGa.toFixed(2) + " Ga (named event)", { size: 11, weight: 700, fill: C.darkTeal });
  }
  const xf = X(env.farGa);
  o += `<line x1="${xf}" y1="${t + 12}" x2="${xf}" y2="${axisY}" stroke="${C.teal}" stroke-width="2" stroke-dasharray="4 3"/>` + tx(xf - 4, t + 20, "LUCA " + env.farGa.toFixed(2), { size: 10.5, anchor: "end", fill: C.teal, weight: 600 });
  START_EVIDENCE.slice().sort((a, b2) => b2.age - a.age).forEach((e, i) => {
    const x = X(e.age), y = axisY + 32 + i * 17;
    o += `<line x1="${x}" y1="${axisY}" x2="${x}" y2="${y - 9}" stroke="${C.faint}" stroke-dasharray="2 2"/><circle cx="${x}" cy="${y - 4}" r="3" fill="${C.muted}"/>` + tx(x > w * 0.7 ? x - 6 : x + 6, y, e.label + ", " + e.age.toFixed(2) + " Ga", { size: 9.5, fill: C.muted, anchor: x > w * 0.7 ? "end" : "start" });
  });
  return o + "</svg>";
}

export function createSupply(ctx) {
  const M = () => ctx.MODEL();
  const P = () => ctx.P();
  const segBtns = (sel, items, cur) => { $(sel).innerHTML = items.map((it) => `<button data-v="${esc(it.v)}" aria-pressed="${String(it.v) === String(cur)}" title="${esc(it.title || "")}">${esc(it.label)}</button>`).join(""); };
  const segWire = (sel, cb) => { $$(sel + " button").forEach((b) => { b.onclick = () => cb(b.dataset.v); }); };
  const press = (sel, v) => $$(sel + " button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(v))));

  function build() {
    segWire("#supStartSeg", (v) => { P().nearMode = v === "build" ? "build" : "event"; ctx.recompute(); ctx.toast(v === "build" ? "The start is now built from accretion and volatiles" : "The start is a named event again"); });
    segBtns("#supPathSeg", Object.entries(ACCRETION_PATHS).map(([k, a]) => ({ v: k, label: a.label })), P().accretionPath);
    segWire("#supPathSeg", (v) => { P().accretionPath = v; ctx.recompute(); });
    segBtns("#supMoonSeg", MOON_PRESETS, P().moonAgeGa);
    segWire("#supMoonSeg", (v) => { P().moonAgeGa = parseFloat(v); ctx.rebuild(); ctx.recompute(); });
    segBtns("#supSolidSeg", SOLID_PRESETS, P().solidifyMyr);
    segWire("#supSolidSeg", (v) => { P().solidifyMyr = parseFloat(v); ctx.rebuild(); ctx.recompute(); });
    segBtns("#supCo2Seg", CO2_PRESETS, P().co2DrawdownMyr);
    segWire("#supCo2Seg", (v) => { P().co2DrawdownMyr = parseFloat(v); ctx.rebuild(); ctx.recompute(); });
    $("#supFields").innerHTML = ["moonAgeGa", "solidifyMyr", "co2DrawdownMyr", "lateShare"].map((k) => ctx.sliderFor(k)).join("");
    ctx.wireParamInputs($("#supFields"));

    segBtns("#supOceanSeg", Object.entries(OCEAN_VIEWS).map(([k, o]) => ({ v: k, label: o.label })), P().oceanView);
    segWire("#supOceanSeg", (v) => {
      P().oceanView = v;
      const f = OCEAN_VIEWS[v].factor;
      P().landUncertaintyFactor = f == null ? SPEC.landUncertaintyFactor.def : f;
      ctx.rebuild(); ctx.recompute();
    });

    segWire("#supRiboseSeg", (v) => { P().riboseStep = v; ctx.recompute(); });
    segWire("#supBorWhereSeg", (v) => { P().borateWhere = v; ctx.recompute(); });
    segBtns("#supBorSeg", Object.entries(BORATE_LEVELS).map(([k, b]) => ({ v: k, label: b.label + (b.factor > 1 && !/times/.test(b.label) ? ", " + b.factor + " times" : "") })), P().borateLevel);
    segWire("#supBorSeg", (v) => { P().borateLevel = v; P().borateFactor = BORATE_LEVELS[v].factor; ctx.rebuild(); ctx.recompute(); });
    $("#supBorFields").innerHTML = ctx.sliderFor("borateFactor");
    ctx.wireParamInputs($("#supBorFields"));

    segBtns("#supDelSeg", Object.entries(DELIVERY_SOURCES).map(([k, d]) => ({ v: k, label: d.label })), P().deliverySource);
    segWire("#supDelSeg", (v) => { P().deliverySource = v; P().deliveryCovers = null; if (v === "comet" && P().deliveryWindowYr < 1000) { /* keep the window; comet HCN changes access only */ } ctx.recompute(); });
    segWire("#supDelWhereSeg", (v) => { P().deliveryWhere = v; ctx.recompute(); });
    segWire("#supDelBlockSeg", (v) => { P().deliveryBlocked = v; ctx.recompute(); });
    $("#supDelFields").innerHTML = ["deliveryRatePerMyr", "deliveryWindowYr"].map((k) => ctx.sliderFor(k)).join("");
    ctx.wireParamInputs($("#supDelFields"));

    $("#supExplain").innerHTML = `
      <p><strong>The start.</strong> start = age of the Moon-forming impact minus (time for the surface to solidify plus the later of two waits). The two waits run at the same time once the surface is solid: taking CO2 back into the rock, and, only if the giant impacts stripped the volatiles, waiting for late accretion to bring them back. Late accretion falls off as exp(-(t / ${LATE_ACCRETION.tauMyr} Myr)^${LATE_ACCRETION.beta}), so waiting for a share f of it takes ${LATE_ACCRETION.tauMyr} Myr times (-ln(1 - f))^(1/${LATE_ACCRETION.beta}). The window is the start minus the age of LUCA, as before.</p>
      <p><strong>Pebble or slow growth.</strong> The path changes the start only through re-supply. With pebble accretion, or slow growth that keeps its volatiles, nothing has to be re-supplied, so the start is set by the Moon-forming impact, solidification and ingassing. With slow growth that loses its volatiles, the start can wait for late accretion. The path does not change the chemistry rates.</p>
      <p><strong>Ocean depth.</strong> Only the wet and dry pools need dry land. The ocean view sets the land factor on their T1: 1 for a shallow ocean, 20 for a deep water world.</p>
      <p><strong>Boron.</strong> When the ribose step is on, ribose must last long enough in the same try as the other steps: its chance, Da / (1 + Da), is multiplied into the joint chance, and its formation time is added to T2. Borate multiplies how long ribose lasts, so it raises Da by the same factor, but only in settings where borate can collect.</p>
      <p><strong>Delivery.</strong> A delivery event gives a receiving site a window of tries in which the covered steps are already done. Chance per delivery = 1 - (1 - p_rest)^m, with m = window / cycle length and p_rest the joint chance of the steps not covered. Successes per Myr = (tries made in place times p_joint) + (deliveries per Myr times chance per delivery). T3 = successes needed divided by that sum. The two routes add, so delivery can only shorten T3.</p>`;

    const lit = [
      ["Start: how Earth grew", "Pebble accretion: fast, volatiles kept", "No re-supply wait", 2, ["johansen2021", "onyett2023", "johansen2023"]],
      ["", "Slow growth by collisions", "Re-supply wait if volatiles are lost", 2, ["jacobsen2005", "natrev2022"]],
      ["Start: Moon-forming impact", "4.51 Ga, early", "Sets the reset", 2, ["barboni2017"]],
      ["", "4.47 Ga, middle (70 to 120 Myr after the first solids)", "Sets the reset", 2, ["natrev2022", "jacobsen2005"]],
      ["", "4.35 Ga, late (now read as tidal remelting)", "Sets the reset; conflicts with 4.40 Ga zircons", 1, ["nimmo2024"]],
      ["Start: surface solid", "A few Myr under a steam and CO2 atmosphere", "Adds to the wait", 2, ["zahnle2007", "elkins2011"]],
      ["", "Up to 150 Myr for the whole mantle, 30 to 500 Myr with tidal heating", "Adds to the wait", 1, ["tidal2025"]],
      ["Start: CO2 ingassing", "10 to 100 Myr by carbonation and subduction of ocean crust; the warm stage near 100 C itself about 0.1 to 10 Myr", "Adds to the wait", 2, ["zahnle2007", "zahnle2010", "sleep2010", "sleep2001"]],
      ["", "Up to 160 Myr, needs a wet and uneven mantle", "Adds to the wait", 2, ["miyazaki2022"]],
      ["", "Dense CO2 for over 100 Myr, but water at the surface at once", "About 1 Myr wait; hot surface", 1, ["loth2026"]],
      ["Start: checks", "Liquid water by 4.40 Ga; widespread by 4.3 Ga; fresh water and land by 4.0 Ga", "Shown as checks only", 2, ["wilde2001", "mojzsis2001", "gamaleldien2024"]],
      ["", "No global sterilisation after 4.4 Ga; sweet spot 4.4 to 4.2 Ga", "Shown as checks only", 1, ["abramov2026"]],
      ["Ocean depth and land", "Shallow ocean, land at once", "Land factor 1 on T1 of the pools", 1, ["loth2026"]],
      ["", "Deep water world, little land", "Land factor 20 on T1 of the pools", 2, ["korenaga2021", "gamaleldien2024"]],
      ["Boron", "Borate keeps ribose 2.1 times (40 mM) to 16 times (80 mM) longer", "Raises the chance of the ribose step", 2, ["furukawa2013", "ricardo2004"]],
      ["", "About 48 times for branched pentoses", "Upper bound", 1, ["benner2010"]],
      ["", "Borate minerals scarce in a young basaltic crust; seawater about 0.4 mM", "Borate only where it can collect", 2, ["grew2011"]],
      ["Delivery", "Meteorites into warm little ponds: 0.02 to 11 per Myr, usable 0.5 to 7 years", "Stands in for S2 and the ribose step", 2, ["pearce2017", "mehta2018"]],
      ["", "Nucleobases, ammonia and amino acids in Bennu; ribose and other sugars in Bennu", "Supports what a delivery can cover", 2, ["glavin2025", "furukawa2025"]],
      ["", "Glycine and peptides form on cold interstellar ice and dust", "Stands in for S4 as organic carbon", 1, ["ioppolo2021", "krasno2022", "intercat2026", "intercat"]],
      ["", "Comet HCN in local ponds for up to millions of years", "Changes access at S0, not a rate", 2, ["todd2020"]],
    ];
    ctx.table($("#tblSupplyLit"), [{ label: "Topic" }, { label: "Reading in the literature" }, { label: "What it changes in the model" }, { label: "Confidence" }, { label: "Sources" }],
      lit.map((r) => ({ cells: [r[0] ? `<strong>${esc(r[0])}</strong>` : "", esc(r[1]), esc(r[2]), stars(r[3]), r[4].map((k) => link(k)).join("; ")] })));
  }

  function variant(over) {
    const P2 = { ...P(), ...over };
    const env = computeEnvelope(P2);
    P2.effectiveTempC = env.workingTempC;
    return { env, res: M().scenarios.map((sc) => auditScenario(sc, P2, M())) };
  }

  function render(env, results) {
    const p = P();
    // 1. start
    press("#supStartSeg", p.nearMode === "build" ? "build" : "event");
    press("#supPathSeg", p.accretionPath); press("#supMoonSeg", p.moonAgeGa); press("#supSolidSeg", p.solidifyMyr); press("#supCo2Seg", p.co2DrawdownMyr);
    const isBuild = p.nearMode === "build";
    $("#supBuild").style.opacity = isBuild ? "1" : "0.55";
    const b = buildStart(p);
    const path = ACCRETION_PATHS[p.accretionPath];
    $("#supPathRead").innerHTML = esc(path.plain) + (path.keeps ? "" : ` Re-supply wait for ${Math.round(p.lateShare * 100)} per cent of late accretion: ${fmtMyr(resupplyMyr(p.lateShare))} Myr.`);
    const ls = $("#supFields [data-pkey=lateShare]"); if (ls) ls.style.display = path.keeps ? "none" : "";
    const kp = (k, v, n) => `<div class="kpi"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span>${n ? `<span class="n">${esc(n)}</span>` : ""}</div>`;
    $("#supKpis").innerHTML = [
      kp("Start", (isBuild ? b.startGa : env.nearGa).toFixed(isBuild ? 3 : 2) + " Ga", isBuild ? "built here" : "named event: " + env.nearLabel),
      kp("Built start would be", b.startGa.toFixed(3) + " Ga", "Moon " + b.moonGa.toFixed(2) + " minus " + fmtMyr(b.solid + b.wait) + " Myr"),
      kp("Window", env.valid ? fmtMyr(env.budgetMyr) + " Myr" : "none", "start to LUCA at " + env.farGa.toFixed(2) + " Ga"),
      kp("What sets the wait", b.limiting === "resupply" ? "re-supply" : "ingassing", b.limiting === "resupply" ? fmtMyr(b.resup) + " Myr of late accretion" : fmtMyr(b.draw) + " Myr of CO2 drawdown"),
    ].join("");
    ctx.setFig("start", startSvg(env, isBuild ? b : null, Math.min(900, ctx.figW(900))), "#figStart");
    const fitN = results.filter((r) => env.valid && r.total <= env.budgetMyr).length;
    const conflicts = [];
    if (b.moonGa < 4.404) conflicts.push("a Moon-forming impact at " + b.moonGa.toFixed(2) + " Ga is younger than the 4.40 Ga zircon, which would then have had to survive the impact");
    if (b.startGa < env.farGa) conflicts.push("the built start is younger than LUCA, so there is no window");
    $("#supStartRead").innerHTML = (isBuild
      ? `The start is ${b.startGa.toFixed(3)} Ga, which gives a window of ${env.valid ? fmtMyr(env.budgetMyr) + " Myr" : "nothing"} before LUCA. ${fitN} of 6 settings fit (the two hypothetical scenarios are on the start page).`
      : `The start is still the named event (${esc(env.nearLabel)}${/Ga/.test(env.nearLabel) ? "" : ", " + env.nearGa.toFixed(2) + " Ga"}). Choose "Build it from accretion and volatiles" to use the built start of ${b.startGa.toFixed(3)} Ga instead.`)
      + (conflicts.length ? ` <span class="warn-inline">Check: ${esc(conflicts.join("; "))}.</span>` : "");
    const s0 = isBuild ? b.startGa : env.nearGa;
    ctx.table($("#tblEvidence"), [{ label: "Evidence" }, { label: "Age, Ga", n: true }, { label: "Confidence" }, { label: "Your start compared" }, { label: "What it says" }],
      START_EVIDENCE.map((e) => {
        const d = (s0 - e.age) * 1000;
        const cmp = Math.abs(d) < 0.5 ? "at the same time" : d > 0 ? fmtMyr(d) + " Myr earlier" : fmtMyr(-d) + " Myr later";
        return { cells: [`<strong>${esc(e.label)}</strong><br><span class="hint">${esc(e.ref)}</span>`, e.age.toFixed(2), stars(e.stars), esc(cmp), esc(e.plain)] };
      }));

    // 2. ocean
    press("#supOceanSeg", p.oceanView);
    const ov = OCEAN_VIEWS[p.oceanView] || OCEAN_VIEWS.model;
    const pools = results.find((r) => r.scenario.requires_subaerial_land);
    $("#supOceanRead").innerHTML = esc(ov.plain) + (pools ? ` With the land factor now ${p.landUncertaintyFactor}, T1 for ${esc(pools.scenario.name.toLowerCase())} is ${cellMyr(pools.t1)} Myr and its total ${cellMyr(pools.total)} Myr.` : "");

    // 3. boron
    press("#supRiboseSeg", p.riboseStep); press("#supBorWhereSeg", p.borateWhere); press("#supBorSeg", p.borateLevel);
    const fDemo = p.borateFactor > 1 ? p.borateFactor : 16;
    const vOff = variant({ riboseStep: "off" }), vNoB = variant({ riboseStep: "on", borateFactor: 1 }), vB = variant({ riboseStep: "on", borateFactor: fDemo });
    ctx.table($("#tblBoron"), [{ label: "Setting" }, { label: "Borate can collect" }, { label: "Ribose step, chance: no borate to borate, " + fDemo + " times" }, { label: "Total, Myr: no ribose step" }, { label: "With ribose step, no borate" }, { label: "With ribose step and borate, " + fDemo + " times" }],
      M().scenarios.map((sc, i) => {
        const r1 = vNoB.res[i].rungs.find((x) => x.rung === "S2r"), r2 = vB.res[i].rungs.find((x) => x.rung === "S2r");
        const can = vB.res[i].borate ? vB.res[i].borate.applies : !!sc.borate_concentrates;
        return { cells: [`<strong>${esc(sc.name)}</strong>`, (can ? "yes" : "no") + `<br><span class="hint">${esc(sc.borate_note || "")}</span>`,
          r1 && r2 ? `<span class="num">${esc(pct(r1.p))}</span><br>to <span class="num">${esc(pct(r2.p))}</span>` : "no S2 step",
          `<span class="num">${cellMyr(vOff.res[i].total)}</span>`, `<span class="num">${cellMyr(vNoB.res[i].total)}</span>`, `<span class="num">${cellMyr(vB.res[i].total)}</span>`] };
      }));
    const maxUp = Math.max(...vNoB.res.map((r, i) => r.total / vOff.res[i].total));
    const r0 = vNoB.res[1] && vNoB.res[1].rungs.find((x) => x.rung === "S2r");
    const lead = p.riboseStep === "on" ? "The ribose step is on in the rest of the app." : "The ribose step is off in the rest of the app; the table shows what it would do.";
    const rate = r0 ? ` At ${Math.round(env.workingTempC)} C ribose is lost about as fast as it forms or faster, so the step on its own passes ${pct(r0.p)} of the time, and borate at ${fDemo} times raises that where borate can collect.` : "";
    const tot = maxUp < 1.05
      ? " The totals do not move here, because the wait for luck (T3) is only minutes to hours at these settings. Choose the hard chemistry on page 1 to see the step matter."
      : ` The step makes the total up to ${maxUp.toFixed(1)} times longer, and borate wins most of that back where it can collect.`;
    $("#supBorRead").innerHTML = lead + rate + tot + " So boron changes one rate, how long ribose lasts, and it shows in the total only where T3 is a large part of it.";

    // 4. delivery
    press("#supDelSeg", p.deliverySource); press("#supDelWhereSeg", p.deliveryWhere); press("#supDelBlockSeg", p.deliveryBlocked);
    const src = DELIVERY_SOURCES[p.deliverySource] || DELIVERY_SOURCES.none;
    const covers = Array.isArray(p.deliveryCovers) ? p.deliveryCovers : src.covers;
    $("#supDelRead").innerHTML = esc(src.plain) + (src.refs ? ` <span class="hint">${esc(src.refs.join("; "))}</span>` : "");
    $("#supDelCover").innerHTML = COVER_STEPS.map(([k, l]) => `<button class="chip" data-v="${k}" aria-pressed="${covers.includes(k)}"${p.deliverySource === "none" ? " disabled" : ""}>${esc(l)}</button>`).join("");
    $$("#supDelCover .chip").forEach((c) => { c.onclick = () => {
      const cur = new Set(Array.isArray(p.deliveryCovers) ? p.deliveryCovers : src.covers);
      cur.has(c.dataset.v) ? cur.delete(c.dataset.v) : cur.add(c.dataset.v);
      p.deliveryCovers = [...cur]; ctx.recompute();
    }; });
    const vNone = variant({ deliverySource: "none" });
    ctx.table($("#tblDelivery"), [{ label: "Setting" }, { label: "Receives deliveries" }, { label: "Chance per delivery" }, { label: "Delivery wins if the covered steps, made in place, have a chance below" }, { label: "Wait for luck, T3" }, { label: "Route that wins" }, { label: "Total, Myr" }],
      M().scenarios.map((sc, i) => {
        const r = results[i], d = r.delivery, r0 = vNone.res[i];
        const on = d && d.on;
        return { cells: [`<strong>${esc(sc.name)}</strong>`, (d && d.receives ? "yes" : "no") + `<br><span class="hint">${esc(sc.delivery_note || "")}</span>`,
          on ? `<span class="num">${esc(pct(d.perDelivery))}</span><br><span class="hint">${fmtSci(d.triesPerDelivery)} tries each</span>` : "none",
          on ? (d.blocked ? "always: they cannot be made in place" : `<span class="num">${esc(d.breakEven >= 1 ? "any chance" : "1 in " + fmtSci(1 / Math.max(d.breakEven, 1e-300)))}</span><br><span class="hint">now ${esc(pct(d.pCovered))}</span>`) : "none",
          `<span class="num">${esc(ht(r0.t3))}</span><br>to <span class="num">${esc(ht(r.t3))}</span>`,
          on ? (d.viaDelivery ? "delivered" : "made in place") + `<br><span class="hint">delivery share ${Math.round(d.share * 100)} per cent</span>` : "made in place",
          `<span class="num">${cellMyr(r0.total)}</span><br>to <span class="num">${cellMyr(r.total)}</span>`] };
      }));
    $("#supDelNote").innerHTML = p.deliverySource === "none"
      ? "No delivery is on, so every setting makes everything in place. Pick a source above to add the second route."
      : p.deliverySource === "comet"
        ? "Comet HCN covers no rate-limited step in this model: it changes whether nitrogen is there at all (S0), so the totals do not move. Its value is in settings where HCN would otherwise be missing, which the model does not yet count."
        : `Each cell shows the value with no delivery, then "to" the value with this delivery. Deliveries are rare: ${p.deliveryRatePerMyr} per Myr, against the very many tries a setting gets when it makes things in place. So delivery wins only where the covered steps are close to impossible in place, below the break-even chance in the table, or cannot happen in place at all. ${p.deliveryBlocked === "yes" ? "Here they cannot, so delivery is the only route and its rate sets T3." : "Choose \"only by delivery\" to see that case."} With ${fmtSci(p.successesNeeded)} successes needed, a route that delivers ${p.deliveryRatePerMyr} per Myr needs at least ${cellMyr(p.successesNeeded / p.deliveryRatePerMyr)} Myr.`;
  }
  return { build, render };
}
