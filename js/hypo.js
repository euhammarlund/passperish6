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
const TEMPS = [5, 15, 25, 40, 55, 70, 85, 100];
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
  const best = searchBestMix(model, P, start);
  const inv = inventChemistry(model, P, best);
  const levers = leverMatrix(model, P, conventional, best);
  _key = key; _val = { best, inv, levers, fastest: ok[0] || null };
  return _val;
}
