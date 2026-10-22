import fs from "fs";
const dir = process.argv[2];
const E = await import(dir + "/js/engine.js");
const Pm = await import(dir + "/js/params.js");
const G = await import(dir + "/js/guided.js").catch(()=>null);
const M = JSON.parse(fs.readFileSync(dir + "/data/model.json"));
function run(over) {
  const p = { ...Pm.defaultParams(), ...over };
  const env = E.computeEnvelope(p); p.effectiveTempC = env.workingTempC;
  return M.scenarios.map((sc) => +E.auditScenario(sc, p, M).total.toPrecision(10));
}
const hard = { rungHandoff: { ...Pm.defaultParams().rungHandoff, S2: "H4", S3: "H7", S4: "H8" }, successesNeeded: 1e9 };
const out = {
  def: run({}), hard: run(hard),
  hardBor: run({ ...hard, riboseStep: "on", borateLevel: "b80", borateFactor: 16 }),
  build: run({ nearMode: "build" }), deep: run({ landUncertaintyFactor: 20 }),
  one: run({ surfaceMode: "one", surfaceMineral: "goethite" }), hardOne: run({ ...hard, surfaceMode: "one", surfaceMineral: "goethite" }),
  cur: run({ cycleRole: "currency" }), del: run({ ...hard, deliverySource: "meteorite" }),
};
console.log(JSON.stringify(out));
