// What matters most. Repeats the one-at-a-time test live, for whatever the user
// has chosen: every other input stays as set, one input moves across its
// plausible range, and the app records how many times the total time changes and
// whether any setting moves in or out of the window.

import { auditScenario, computeEnvelope } from "./engine.js";
import { SPEC } from "./params.js";

// Who or what could set each input better. Plain words, for the table.
export const DATA_NEEDS = {
  chemTempC: "Hadean water temperatures, from isotope thermometry and models of the early climate",
  eaTransfer: "Rates of the key handoffs measured at three or more temperatures",
  eaLoss: "Breakdown rates of RNA and other products at three or more temperatures",
  t1Scale: "Geology of each setting: when it first appears and how often it recurs",
  landUncertaintyFactor: "Hadean crust and sea-level studies: how much dry land there was, and when",
  siteScale: "Counts of independent pools, vent fields, crater systems or pumice clasts",
  generationTimeS: "Growth rates of slow modern chemolithoautotrophs",
  popSize: "Sizes of early populations, from population genetics and the deep biosphere today",
  genFixFactor: "Population genetics of fixation under selection and in structured populations",
  errorThresholdMyr: "Copying fidelity of non-enzymatic and ribozyme replication",
  ecoSpecies: "Reconstructions of LUCA's community from phylogenomics (Moody et al. 2024)",
  ecoInteractions: "Which metabolic links LUCA's community needed (cross-feeding of acetate, H2, CO2)",
  ecoDivRate: "Rates of lineage splitting from microbial phylogenetics (Louca et al. 2018)",
  ecoLinkRate: "Evolution experiments on how fast cross-feeding appears",
  ecoExtraMyr: "Genome-scale reconstructions of what LUCA had to build",
  ecoDirectMyr: "A direct estimate of how long LUCA's community took to assemble",
  surfacePH: "pH at mineral surfaces in each setting",
  surfaceLoading: "How much mineral each litre of water touches in each setting",
  phosphateUM: "Phosphorus geochemistry of Hadean waters (Walton et al. 2023)",
  divalentMM: "Mg2+ and Ca2+ in Hadean oceans and pools",
  bridgeK: "Adsorption isotherms on negative surfaces with Mg2+ and Ca2+",
  bridgeHalfMM: "Adsorption isotherms across a range of Mg2+ and Ca2+",
  protectionFactor: "Breakdown rates of bound against free molecules on Hadean surfaces (model Gap 7)",
  damageK: "Damage to molecules that are held very strongly",
  yieldPerCycle: "Yield against cycle number, from the first few cycles (the start of an Eiby-type series)",
  lossPerCycle: "Yield against cycle number, from the level it reaches after many cycles",
  bondsNeeded: "Length of the products, from nanopore sequencing or mass spectrometry",
  moonAgeGa: "Ages of the oldest lunar rocks and of the Moon-forming impact",
  solidifyMyr: "Magma ocean models with tidal heating and a steam and CO2 atmosphere",
  co2DrawdownMyr: "Carbonate in Hadean ocean crust and how fast it was subducted",
  lateShare: "How much of Earth's water and carbon arrived after the last giant impact (hydrogen, nitrogen and noble gas isotopes)",
  borateFactor: "Ribose breakdown with and without borate, at Hadean pH, temperature and borate levels",
  deliveryRatePerMyr: "Hadean impact flux of small carbonaceous bodies into ponds and lakes",
  deliveryWindowYr: "How long delivered nucleobases and sugars last in a pond (seepage, ultraviolet light, breakdown)",
  salinityGkg: "Salinity of Hadean oceans, pools and pore waters (fluid inclusions; Knauth 2005; Marty et al. 2018)",
  adsDH: "Adsorption isotherms on Hadean minerals at several temperatures",
  confinement: "Where bound molecules sit on a mineral: basal faces, edges, steps or interlayers (AFM, as in Jelavic et al. 2017)",
  confProtect: "Breakdown of molecules in interlayers and pores against open faces",
  confActivity: "Joining rates of molecules held in interlayers and pores",
  felsicManual: "Composition of the Hadean exposed crust (zircons, shales, Ti and Ni/Co proxies)",
  buildupLength: "How long a chain must be before it does something useful",
  buildupAlpha: "How strongly chains of different lengths hold on to minerals (Alejandre et al. 2025)",
  buildupPorosity: "Porosity and mineral load of Hadean pond, tidal-flat and estuary sediments",
  _cycle: "Hadean cycle lengths, and which cycles each setting really has",
  _surface: "Which minerals were present in each setting, and how much of them",
};

// Inputs that never change the total, or only in a mode that is not in use.
function inputsFor(P) {
  const keys = [];
  const skip = new Set(["startTempC", "t2Scale", "successesNeeded", "vesselLifetimeYr", "recycleTimeYr", "turnoversForEcosystem", "burialTempC", "rockAgeMyr", "eaDegradation"]);
  for (const [k, s] of Object.entries(SPEC)) {
    if (skip.has(k) || s.kind === "select" || s.lo == null || typeof s.def !== "number") continue;
    if (k === "chemTempC" && P.tempMode === "curve") continue;
    if (k === "ecoDirectMyr" && P.ecoMode !== "direct") continue;
    if (["ecoSpecies", "ecoInteractions", "ecoDivRate", "ecoLinkRate", "ecoExtraMyr"].includes(k) && (P.ecoOn === false || P.ecoMode === "direct")) continue;
    if (k === "ecoDirectMyr" && P.ecoOn === false) continue;
    if (["surfacePH", "surfaceLoading"].includes(k) && P.surfaceMode !== "one") continue;
    if (["phosphateUM", "divalentMM", "bridgeK", "bridgeHalfMM", "protectionFactor", "damageK"].includes(k) && P.surfaceMode === "off") continue;
    if (k === "bondsNeeded" && P.cycleRole !== "currency") continue;
    if (["yieldPerCycle", "lossPerCycle"].includes(k) && P.cycleRole !== "currency" && P.buildupOn !== "on") continue;
    if (["moonAgeGa", "solidifyMyr", "co2DrawdownMyr", "lateShare"].includes(k) && P.nearMode !== "build") continue;
    if (k === "lateShare" && P.accretionPath !== "collisional_lost") continue;
    if (k === "borateFactor" && P.riboseStep !== "on") continue;
    // Version 8.
    const bOn = P.buildupOn === "on";
    if (k === "hypoK") continue;
    if (["salinityGkg", "adsDH", "confinement"].includes(k) && P.surfaceMode === "off" && !bOn) continue;
    if (["confProtect", "confActivity"].includes(k) && !(P.confinement > 0)) continue;
    if (k === "felsicManual" && (P.felsicCurve !== "manual" || (P.crustSetsBoron !== "on" && P.crustSetsMix !== "on" && !bOn))) continue;
    if (["buildupLength", "buildupAlpha"].includes(k) && !bOn) continue;
    if (k === "buildupPorosity" && !(bOn && P.buildupCond === "mine")) continue;
    if (["deliveryRatePerMyr", "deliveryWindowYr"].includes(k) && (P.deliverySource === "none" || P.deliverySource === "comet")) continue;
    keys.push(k);
  }
  return keys;
}

const STARS = { A: 3, B: 2, C: 1 };
const START_KEYS = ["moonAgeGa", "solidifyMyr", "co2DrawdownMyr", "lateShare"];

function run(sc, q, model) {
  return auditScenario(sc, q, model).total;
}

// scopeIds: list of scenario ids to test. cycleFit: which cycles fit each setting.
export function computeMatters(model, P, scopeIds, cycleFit) {
  const env = computeEnvelope(P);
  const budget = env.budgetMyr;
  const base = { ...P, effectiveTempC: env.workingTempC };
  const scs = model.scenarios.filter((s) => scopeIds.includes(s.id));
  const baseTot = scs.map((sc) => run(sc, base, model));
  const rows = [];

  const record = (key, label, stars, rangeText, totals, budgets = null) => {
    // totals: per scenario, an array of totals at the tested values (base included).
    // budgets: the window at each tested value, for inputs that move the start (version 7).
    // Then the factor compares total against window, so a shorter window counts like a longer total.
    const bud = (j) => (budgets ? budgets[j] : budget);
    const rel = totals.map((arr) => arr.map((t, j) => (bud(j) > 0 ? t / bud(j) : Infinity)));
    const noWindow = rel.some((arr) => arr.some((x) => !isFinite(x)));
    const f = rel.map((arr) => { const fin = arr.filter(isFinite); return fin.length < arr.length ? 1e6 : Math.max(...arr) / Math.min(...arr); });
    const flips = scs.filter((sc, i) => { const fits = totals[i].map((t, j) => t <= bud(j)); return fits.some((x) => x !== fits[0]); }).map((sc) => sc.id);
    const maxF = Math.max(...f);
    const worst = scs[f.indexOf(maxF)];
    rows.push({ key, label, stars, rangeText, factors: f, maxF, noWindow, worstId: worst ? worst.id : null, flips, need: DATA_NEEDS[key] || "" });
  };

  for (const k of inputsFor(P)) {
    const s = SPEC[k];
    const vals = [s.lo, s.hi];
    const moves = START_KEYS.includes(k);
    const qs = vals.map((v) => {
      const q = { ...base, [k]: v };
      if (k === "chemTempC") q.effectiveTempC = v;
      if (moves) { const e2 = computeEnvelope(q); q.effectiveTempC = e2.workingTempC; q._budget = e2.budgetMyr; }
      return q;
    });
    const totals = scs.map((sc, i) => [baseTot[i], ...qs.map((q) => run(sc, q, model))]);
    record(k, s.label, STARS[s.tier] || 1, rangeTxt(s) + (moves ? " (moves the start)" : ""), totals, moves ? [budget, ...qs.map((q) => q._budget)] : null);
  }

  // The driving cycle: every cycle that fits each setting.
  const cycTot = scs.map((sc, i) => {
    const fit = cycleFit[sc.id] || { main: null, ok: [] };
    const names = [fit.main, ...fit.ok].filter(Boolean);
    return [baseTot[i], ...names.map((n) => run(sc, { ...base, cycleName: n }, model))];
  });
  record("_cycle", "Driving cycle, any that fits the setting", 1, "every cycle that fits", cycTot);

  // Mineral surfaces on or off.
  const surfOn = P.surfaceMode === "off" ? "scenario" : P.surfaceMode;
  const surfTot = scs.map((sc, i) => [baseTot[i], run(sc, { ...base, surfaceMode: surfOn }, model), run(sc, { ...base, surfaceMode: "off" }, model)]);
  record("_surface", "Mineral surfaces, on or off", 1, "on, and off", surfTot);

  rows.sort((a, b) => b.maxF - a.maxF);
  const moving = rows.filter((r) => r.maxF > 1.05);
  const still = rows.filter((r) => r.maxF <= 1.05);
  const target = moving.find((r) => r.stars === 1) || null;
  return { env, budget, scs, baseTot, rows: moving, still, target };
}

function rangeTxt(s) {
  const f = (v) => {
    const a = Math.abs(v);
    if (a === 0) return "0";
    if (a >= 1e5 || a < 1e-3) { const e = Math.floor(Math.log10(a)); const m = v / Math.pow(10, e); return (Math.abs(m - 1) < 1e-9 ? "" : m.toFixed(1) + " x ") + "10^" + e; }
    if (a >= 100) return Math.round(v).toLocaleString("en-GB");
    return String(+v.toPrecision(3));
  };
  return f(s.lo) + " to " + f(s.hi) + (s.unit && s.unit !== "x" && s.unit !== "count" ? " " + s.unit : s.unit === "x" ? " times" : "");
}
