// Version 8: two hypothetical scenarios for the front-page audit.
//
// Scenario 7, "best mix of known conditions". The model may combine any setting's time to
// appear (T1) with any other setting's number of sites, any driving cycle, any temperature,
// any mineral or mineral mix, any pH, salinity and confinement, and, if allowed, any of the
// known handoffs for each step. It searches one choice at a time, keeping the best, for three
// rounds. The aim is the shortest total time, and among equal totals the most tries per year.
//
// Scenario 8, "invented chemistry". Starting from scenario 7, an invented ion, molecule or
// catalyst makes one link K times faster. The model tries each link in turn and ranks them by
// how much time they save. It then applies the helper to every link at once.
//
// Both are hypothetical. Neither changes the six settings.

import { auditScenario, computeEnvelope, timeLeft, MIX_PRESETS, BUILDUP_VENUES, geomean } from "./engine.js";

export const RUNG_CANDIDATES = {
  S1: ["H1", "H2"], S2: ["H3", "H4", "H5"], S3: ["H7", "H12"], S4: ["H8", "H9"], S5: ["H10", "H11"],
};
const TEMPS = [-10, 0, 5, 15, 25, 40, 55, 70, 85, 100];

const WD = "Wet and dry", DN = "Day and night", HC = "Hot and cold, local", TI = "Tides", PR = "pH and redox at interfaces", RA = "Raft transit and beaching";

// Version 8.1: physical places. Scenario 7 must pick one of these and stay inside its ranges, so the
// answer describes a place that could exist. Single places take T1 and sites from their setting. A
// hybrid needs the conditions of both parents at once, so it is taken to be as slow to appear as the
// slower parent and to have as few sites as the rarer parent (a cautious rule, Tier C).
export const PLACES = [
  { id: "vent", venues: ["smoker"], label: "Deep alkaline vent", parents: ["SC1"],
    depth: "Seafloor, hundreds of metres to kilometres down", air: false, sun: false, land: "not needed",
    T: [40, 100], pH: [9, 11], sal: [35, 70],
    minerals: ["greenrust", "brucite", "ldh", "mackinawite", "mix:vent"], cycles: [HC, PR, TI],
    note: "Warm alkaline fluid from serpentinising rock meets the acidic ocean inside chimney pores. Dark, never dries." },
  { id: "pools", venues: ["pond"], label: "Wet and dry pools on land", parents: ["SC2"],
    depth: "On land, centimetres to a metre of water", air: true, sun: true, land: "needs dry land",
    T: [5, 85], pH: [5, 9], sal: [1, 35],
    minerals: ["smectite", "kaolinite", "mica", "quartz", "glass", "apatite", "ferrihydrite", "goethite", "calcite", "mix:basalt", "mix:felsic", "mix:clay"], cycles: [WD, DN],
    note: "Small pools on volcanic land fill with rain and dry in the sun." },
  { id: "crater", venues: ["pond"], label: "Impact crater lake with hot rock", parents: ["SC3"],
    depth: "Crater lake and fractured rock, metres to hundreds of metres", air: true, sun: true, land: "the crater rim makes local land",
    T: [15, 100], pH: [6, 9], sal: [1, 35],
    minerals: ["smectite", "glass", "mackinawite", "ferrihydrite", "quartz", "calcite", "mix:basalt", "mix:clay"], cycles: [HC, PR, WD, DN],
    note: "An impact leaves hot, cracked rock and a lake; water circulates for about 100,000 years." },
  { id: "raft", venues: ["raft", "tidal"], label: "Pumice raft and beaching", parents: ["SC4"],
    depth: "Floating at the sea surface, washed onto shores", air: true, sun: true, land: "shores of islands are enough",
    T: [5, 55], pH: [7, 8.5], sal: [35, 70],
    minerals: ["glass", "smectite", "ferrihydrite", "mix:raft"], cycles: [RA, TI, DN, WD],
    note: "Floating volcanic pumice with pore water, dried on top and wetted by waves." },
  { id: "ice", venues: ["ice"], label: "Brine veins in ice", parents: ["SC5"],
    depth: "Sea ice or frozen ponds at the surface", air: true, sun: true, land: "not needed",
    T: [-10, 5], pH: [6, 8.5], sal: [35, 150],
    minerals: ["none", "smectite", "mix:clay"], cycles: [DN, HC],
    note: "Freezing pushes salt and molecules into thin veins of brine." },
  { id: "spring", venues: ["pond"], label: "Hybrid: alkaline spring feeding a pond on land", parents: ["SC1", "SC2"],
    depth: "On land, a shallow pond fed by warm alkaline spring water", air: true, sun: true, land: "needs dry land",
    T: [20, 90], pH: [8, 11], sal: [1, 35],
    minerals: ["greenrust", "brucite", "ldh", "mackinawite", "smectite", "glass", "ferrihydrite", "mix:vent", "mix:basalt", "mix:clay"], cycles: [WD, DN, HC, PR],
    note: "Serpentinising rock exposed on land, so vent minerals and pH meet drying and sunlight. Needs land with ultramafic rock." },
  { id: "shore", venues: ["tidal", "estuary", "smoker"], label: "Hybrid: shallow alkaline vent on a tidal shore", parents: ["SC1", "SC4"],
    depth: "Shallow sea floor to the intertidal zone, 0 to about 10 m", air: true, sun: true, land: "shores of islands are enough",
    T: [20, 90], pH: [8, 11], sal: [35, 70],
    minerals: ["greenrust", "brucite", "ldh", "mackinawite", "glass", "smectite", "ferrihydrite", "mix:vent", "mix:raft", "mix:river"], cycles: [TI, DN, HC, PR, WD],
    note: "Alkaline vent fluid seeping out where tides flood and drain the shore." },
];

// What each handoff needs from the place. Read from the handoff descriptions in the model.
export const HANDOFF_NEEDS = {
  H1: { text: "Fe(II) and sulfide in water without oxygen", ok: () => true },
  H2: { text: "shallow, sunlit water (sulfite comes from volcanic SO2 in light)", ok: (pl) => pl.sun },
  H3: { text: "cool (50 C or less), Fe-rich water near pH 7.5 to 10", ok: (pl, st) => st.T <= 50 && st.pH >= 7.5 && st.pH <= 10 },
  H4: { text: "a hot (60 C or more), acidic (pH 6.5 or less) pool", ok: (pl, st) => st.T >= 60 && st.pH <= 6.5 },
  H5: { text: "an Fe(II)-bearing ocean, so seawater (20 g per kg or more)", ok: (pl, st) => st.sal >= 20 },
  H7: { text: "nothing special: free phosphate in water", ok: () => true },
  H8: { text: "nothing special: CO2 with no catalyst", ok: () => true },
  H9: { text: "an Fe or Ni sulfide surface (mackinawite, or the vent mix)", ok: (pl, st) => st.mineral === "mackinawite" || st.mineral === "mix:vent" },
  H10: { text: "nothing special: RNA free in warm water", ok: () => true },
  H11: { text: "a mineral surface to bind to", ok: (pl, st) => st.mineral !== "none" },
  H12: { text: "volcanic glass or pumice (glass, or the basalt or raft mix)", ok: (pl, st) => ["glass", "mix:basalt", "mix:raft"].includes(st.mineral) },
};
const needOk = (h, pl, st) => !HANDOFF_NEEDS[h] || HANDOFF_NEEDS[h].ok(pl, st);

const PHS = [6, 7, 8, 9, 10, 11];
const SALS = [5, 35, 70, 120];
const CONFS = [0, 0.25, 0.5, 0.9];

function t1Of(sc, P) {
  return geomean(sc.t1_low, sc.t1_high) * (sc.requires_subaerial_land ? P.landUncertaintyFactor : 1) * P.t1Scale;
}

function synth(model, P, st) {
  const A = model.scenarios.find((s) => s.id === st.t1From);
  const B = model.scenarios.find((s) => s.id === st.sitesFrom);
  const useA = t1Of(A, P) >= t1Of(B, P);
  const T = useA ? A : B;
  return {
    ...A, id: "SC7", name: "Best mix of known conditions",
    t1_low: T.t1_low, t1_high: T.t1_high,
    requires_subaerial_land: !!(A.requires_subaerial_land || B.requires_subaerial_land),
    n_parallel_sites_low: B.n_parallel_sites_low, n_parallel_sites_high: B.n_parallel_sites_high,
    borate_concentrates: true, receives_delivery: !!(A.receives_delivery || B.receives_delivery),
  };
}

function synthPlace(model, P, pl) {
  const par = pl.parents.map((id) => model.scenarios.find((s) => s.id === id));
  const slow = par.reduce((a, b) => (t1Of(b, P) > t1Of(a, P) ? b : a));
  const rare = par.reduce((a, b) => (geomean(b.n_parallel_sites_low, b.n_parallel_sites_high) < geomean(a.n_parallel_sites_low, a.n_parallel_sites_high) ? b : a));
  return {
    ...par[0], id: "SC7", name: pl.label,
    t1_low: slow.t1_low, t1_high: slow.t1_high,
    requires_subaerial_land: par.some((x) => x.requires_subaerial_land),
    n_parallel_sites_low: rare.n_parallel_sites_low, n_parallel_sites_high: rare.n_parallel_sites_high,
    borate_concentrates: pl.air, receives_delivery: par.some((x) => x.receives_delivery),
    _t1From: slow.id, _sitesFrom: rare.id,
  };
}

const span = (lo, hi, grid) => { const g = grid.filter((v) => v >= lo && v <= hi); return g.length ? g : [lo]; };
function placeValues(pl, model) {
  const known = new Set((model.minerals || []).map((m) => m.id));
  return {
    T: span(pl.T[0], pl.T[1], TEMPS), pH: span(pl.pH[0], pl.pH[1], [5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11]),
    sal: span(pl.sal[0], pl.sal[1], [1, 5, 20, 35, 70, 100, 150]), conf: CONFS,
    mineral: pl.minerals.filter((m) => m === "none" || m.startsWith("mix:") || known.has(m)),
    cycle: pl.cycles.filter((c) => model.cycles.some((x) => x.name === c)),
  };
}

// The best state inside one place, or null if no allowed state lets every step use a handoff it can.
function searchPlace(model, P, pl, fixedHandoffs) {
  const V = placeValues(pl, model);
  const sc = synthPlace(model, P, pl);
  const rungs = P.activeRungs.filter((r) => RUNG_CANDIDATES[r]);
  const valid = (st) => Object.entries(st.handoffs).every(([, h]) => needOk(h, pl, st));
  const pickHandoffs = (st) => {
    if (fixedHandoffs) return { ...fixedHandoffs };
    const out = {};
    for (const r of rungs) { const c = RUNG_CANDIDATES[r].find((h) => needOk(h, pl, st)); if (!c) return null; out[r] = c; }
    return out;
  };
  let st = null;
  outer: for (const T of V.T) for (const pH of V.pH) for (const mineral of V.mineral) {
    const s0 = { place: pl.id, T, pH, sal: V.sal[0], conf: 0, mineral, cycle: V.cycle[0], venue: pl.venues[0] };
    const h = pickHandoffs(s0);
    if (h && valid({ ...s0, handoffs: h })) { st = { ...s0, handoffs: h }; break outer; }
  }
  if (!st) return null;
  const evalSt = (x) => { const r = auditScenario(sc, paramsFor(P, x), model); return { r, ...score(r) }; };
  let cur = evalSt(st), evals = 1;
  const dims = [["cycle", V.cycle], ["T", V.T], ["mineral", V.mineral], ["pH", V.pH], ["sal", V.sal], ["conf", V.conf]];
  if (P.buildupOn === "on") dims.push(["venue", pl.venues]);
  for (let round = 0; round < 2; round++) {
    let changed = false;
    for (const [key, vals] of dims) for (const v of vals) {
      if (st[key] === v) continue;
      const s2 = { ...st, [key]: v };
      if (!valid(s2)) continue;
      const e = evalSt(s2); evals++;
      if (better(e, cur)) { st = s2; cur = e; changed = true; }
    }
    if (!fixedHandoffs) for (const r of rungs) for (const h of RUNG_CANDIDATES[r]) {
      if (st.handoffs[r] === h) continue;
      const s2 = { ...st, handoffs: { ...st.handoffs, [r]: h } };
      if (!valid(s2)) continue;
      const e = evalSt(s2); evals++;
      if (better(e, cur)) { st = s2; cur = e; changed = true; }
    }
    if (!changed) break;
  }
  return { place: pl, state: { ...st, t1From: sc._t1From, sitesFrom: sc._sitesFrom }, result: cur.r, total: cur.total, rate: cur.rate, evals, sc, params: paramsFor(P, st) };
}

export function searchBestPlace(model, P) {
  const env = computeEnvelope(P);
  const fixed = P.hypoHandoffs === "yours" ? Object.fromEntries(P.activeRungs.filter((r) => RUNG_CANDIDATES[r]).map((r) => [r, P.rungHandoff[r]])) : null;
  const all = PLACES.map((pl) => searchPlace(model, P, pl, fixed) || { place: pl, none: true });
  const ok = all.filter((x) => !x.none);
  let best = null;
  for (const x of ok) if (!best || better(x, best)) best = x;
  if (!best) return null;
  const tl = timeLeft(best.result, env.budgetMyr, P);
  return { ...best, tries: tl.tries, tl, evals: all.reduce((a, x) => a + (x.evals || 0), 0), places: all, mode: "place" };
}

// For the free search: which choices conflict with what a handoff needs, or with each other.
export function conflictsOf(st, model) {
  const out = [];
  const pseudo = { sun: true };
  for (const [r, h] of Object.entries(st.handoffs || {})) if (!needOk(h, pseudo, st)) out.push(`${r} uses ${h}, which needs ${HANDOFF_NEEDS[h].text}, but the choice is ${st.T} C, pH ${st.pH}, ${st.mineral}`);
  if (st.t1From !== st.sitesFrom) out.push(`The time to appear comes from ${st.t1From} and the number of sites from ${st.sitesFrom}: two different places`);
  return out;
}

function paramsFor(P, st, extra = {}) {
  const q = {
    ...P, effectiveTempC: st.T, tempMode: "manual", chemTempC: st.T,
    rungHandoff: { ...P.rungHandoff, ...st.handoffs },
    surfacePH: st.pH, salinityGkg: st.sal, confinement: st.conf, cycleName: st.cycle,
    surfaceLoading: P.surfaceLoading,
    ...extra,
  };
  if (st.mineral === "none") q.surfaceMode = "off";
  else if (st.mineral.startsWith("mix:")) { q.surfaceMode = "mix"; q.mineralMix = MIX_PRESETS[st.mineral.slice(4)].mix; }
  else { q.surfaceMode = "one"; q.surfaceMineral = st.mineral; }
  if (P.buildupOn === "on") q.buildupWhere = st.venue;
  return q;
}

function score(r) {
  return { total: r.total, rate: r.attemptsPerS || 0 };
}
function better(a, b) {
  if (!b) return true;
  if (!isFinite(a.total)) return false;
  if (a.total < b.total * (1 - 1e-9)) return true;
  if (a.total <= b.total * (1 + 1e-9) && a.rate > b.rate * 1.01) return true;
  return false;
}

export function searchBestMix(model, P, startFrom) {
  const scen = model.scenarios;
  const env = computeEnvelope(P);
  const handoffs = {};
  for (const rid of P.activeRungs) if (RUNG_CANDIDATES[rid]) handoffs[rid] = P.rungHandoff[rid];
  const base = startFrom || scen[0].id;
  let st = {
    t1From: base, sitesFrom: base, cycle: P.cycleName, T: P.effectiveTempC,
    mineral: P.surfaceMode === "off" ? "none" : (P.surfaceMode === "one" ? P.surfaceMineral : "mix:river"),
    pH: P.surfacePH, sal: P.salinityGkg != null ? P.salinityGkg : 35, conf: P.confinement || 0,
    venue: "tidal", handoffs,
  };
  const evalSt = (s) => {
    const r = auditScenario(synth(model, P, s), paramsFor(P, s), model);
    return { r, ...score(r) };
  };
  let cur = evalSt(st);
  const minerals = ["none", ...(model.minerals || []).filter((m) => m.id !== "none").map((m) => m.id), ...Object.keys(MIX_PRESETS).map((k) => "mix:" + k)];
  const dims = [
    ["t1From", scen.map((s) => s.id)],
    ["sitesFrom", scen.map((s) => s.id)],
    ["cycle", model.cycles.map((c) => c.name)],
    ["T", TEMPS],
    ["mineral", minerals],
    ["pH", PHS],
    ["sal", SALS],
    ["conf", CONFS],
  ];
  if (P.buildupOn === "on") dims.push(["venue", Object.keys(BUILDUP_VENUES)]);
  let evals = 1;
  for (let round = 0; round < 3; round++) {
    let changed = false;
    for (const [key, vals] of dims) {
      for (const v of vals) {
        if (st[key] === v) continue;
        const s2 = { ...st, [key]: v };
        const e = evalSt(s2); evals++;
        if (better(e, cur)) { st = s2; cur = e; changed = true; }
      }
    }
    if (P.hypoHandoffs !== "yours") {
      for (const rid of Object.keys(handoffs)) {
        for (const h of RUNG_CANDIDATES[rid]) {
          if (st.handoffs[rid] === h) continue;
          const s2 = { ...st, handoffs: { ...st.handoffs, [rid]: h } };
          const e = evalSt(s2); evals++;
          if (better(e, cur)) { st = s2; cur = e; changed = true; }
        }
      }
    }
    if (!changed) break;
  }
  const tl = timeLeft(cur.r, env.budgetMyr, P);
  return { state: st, result: cur.r, total: cur.total, rate: cur.rate, tries: tl.tries, tl, evals, sc: synth(model, P, st), params: paramsFor(P, st) };
}

// The links an invented helper can act on.
export function hypoLinks(r) {
  return r.rungs.filter((x) => x.handoff || x.rung === "S5b").map((x) => ({ id: x.rung, name: x.rungName, handoff: x.handoff ? x.handoff.id : null, p: x.p }));
}

export function inventChemistry(model, P, best) {
  const K = Math.max(1, P.hypoK || 1000);
  const base = best.result;
  const links = hypoLinks(base);
  const env = computeEnvelope(P);
  const ranks = links.map((L) => {
    const r = auditScenario(best.sc, { ...best.params, hypoBoost: { [L.id]: K } }, model);
    return { ...L, total: r.total, saved: base.total - r.total, pAfter: (r.rungs.find((x) => x.rung === L.id) || {}).p, rate: r.attemptsPerS, rateGain: base.attemptsPerS > 0 ? r.attemptsPerS / base.attemptsPerS : 1 };
  }).sort((a, b) => (b.saved - a.saved) || (b.rateGain - a.rateGain));
  const all = {};
  for (const L of links) all[L.id] = K;
  const rAll = auditScenario(best.sc, { ...best.params, hypoBoost: all }, model);
  const tl = timeLeft(rAll, env.budgetMyr, P);
  const floor = rAll.t1 + rAll.t4 + rAll.t5;
  return { K, ranks, result: rAll, total: rAll.total, tries: tl.tries, tl, floor, biology: rAll.t4 + rAll.t5 };
}

// For every setting, how much time an invented helper on each link would save.
export function leverMatrix(model, P, conventional, best) {
  const K = Math.max(1, P.hypoK || 1000);
  const cols = conventional.map((r) => ({ id: r.scenario.id, sc: r.scenario, p: P, base: r }));
  if (best) cols.push({ id: "SC7", sc: best.sc, p: best.params, base: best.result });
  const ids = [];
  for (const c of cols) for (const L of hypoLinks(c.base)) if (!ids.includes(L.id)) ids.push(L.id);
  const rows = ids.map((id) => {
    const cells = cols.map((c) => {
      if (!c.base.rungs.some((x) => x.rung === id)) return null;
      const r = auditScenario(c.sc, { ...c.p, hypoBoost: { [id]: K } }, model);
      return { saved: c.base.total - r.total, total: r.total };
    });
    const name = (cols.map((c) => c.base.rungs.find((x) => x.rung === id)).find(Boolean) || {}).rungName || id;
    return { id, name, cells };
  });
  const top = cols.map((c, i) => {
    let b = null;
    for (const row of rows) { const cell = row.cells[i]; if (cell && (!b || cell.saved > b.saved)) b = { id: row.id, name: row.name, saved: cell.saved }; }
    return b;
  });
  return { K, cols: cols.map((c) => ({ id: c.id, total: c.base.total })), rows, top };
}

// Cache by the inputs that matter, so the search runs once per change.
let _key = null, _val = null;
export function hypoScenarios(model, P, conventional) {
  const key = JSON.stringify(P, (k, v) => (k === "nearOptions" || k === "farOptions" || k === "coolingAnchors" ? undefined : v));
  if (key === _key && _val) return _val;
  // Start from the fastest conventional setting.
  const ok = conventional.filter((r) => isFinite(r.total)).sort((a, b) => a.total - b.total);
  const start = ok.length ? ok[0].scenario.id : model.scenarios[0].id;
  let best = P.hypoMode === "free" ? null : searchBestPlace(model, P);
  if (!best) best = { ...searchBestMix(model, P, start), mode: "free" };
  const inv = inventChemistry(model, P, best);
  const levers = leverMatrix(model, P, conventional, best);
  _key = key; _val = { best, inv, levers, fastest: ok[0] || null };
  return _val;
}
