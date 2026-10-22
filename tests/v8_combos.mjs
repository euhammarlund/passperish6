import fs from "fs";
const dir = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const E = await import(dir + "/js/engine.js"); const Pm = await import(dir + "/js/params.js"); const H = await import(dir + "/js/hypo.js");
const M = JSON.parse(fs.readFileSync(dir + "/data/model.json"));
const base = Pm.defaultParams();
const hard = { rungHandoff: { ...base.rungHandoff, S2: "H4", S3: "H7", S4: "H8" }, successesNeeded: 1e9 };
const combos = [
  {}, hard, { crustSetsMix: "on" }, { crustSetsBoron: "on", riboseStep: "on", borateLevel: "b80", borateFactor: 16 },
  { ...hard, crustSetsBoron: "on", riboseStep: "on", borateFactor: 16, felsicCurve: "greber" },
  { landStart: "islands" }, { nearEventId: "islands" }, { nearEventId: "islands", farEventId: "conservative" },
  { surfaceMode: "mix" }, { ...hard, surfaceMode: "mix", confinement: 0.5 }, { buildupOn: "on" }, { ...hard, buildupOn: "on", buildupMolecule: "aminoacid" },
  { buildupOn: "on", buildupWhere: "open" }, { buildupOn: "on", buildupCond: "mine", buildupMix: "mine" }, { salinityGkg: 70, adsDH: 20 },
  { cycleRole: "currency", buildupOn: "on" }, { chemAgeGa: 3.9, crustSetsMix: "on", felsicCurve: "manual", felsicManual: 0.9 },
];
for (const c of combos) {
  const p = { ...base, ...c }; const env = E.computeEnvelope(p); p.effectiveTempC = env.workingTempC;
  const res = M.scenarios.map((sc) => E.auditScenario(sc, p, M));
  const bad = res.filter((r) => !isFinite(r.total) && r.total !== Infinity || Number.isNaN(r.total));
  const h = H.hypoScenarios(M, p, res);
  console.log(JSON.stringify(c).slice(0, 90).padEnd(92), res.map((r) => r.total.toFixed(2)).join(" "), "| SC7", h.best.total.toFixed(2), "SC8", h.inv.total.toFixed(2), "top", h.levers.top.map((t) => t ? t.id + ":" + t.saved.toFixed(2) : "-").join(","), bad.length ? "NAN!" : "");
}
