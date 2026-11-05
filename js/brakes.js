// Version 9: what holds back the tries.
// For each setting, each step in turn is made free (instant and certain) and the room for tries is
// counted again. The step whose removal adds the most tries is the main brake in that setting.
// Steps S0 to S5 are made free by giving them no rate gate; the ribose step and the build-up step
// are switched off; T1 (the setting appears), T4 (copying with selection) and T5 (LUCA's community)
// are set to zero. S6, preservation, comes after LUCA and is not part of the time budget.

import { auditScenario, timeLeft } from "./engine.js";

// Room for tries as a number with decimals, so that small changes show. The whole number of
// tries is the floor of this.
export function triesExact(r, budgetMyr, p) {
  const tl = timeLeft(r, budgetMyr, p);
  if (!(tl.run > 0) || !(tl.open > 0) || !isFinite(tl.run)) return 0;
  return tl.open / tl.run;
}

const RUNG_LABEL = {
  S0: "S0, supply", S1: "S1, sorting by energy", S2: "S2, lasting long enough", S2r: "S2, ribose kept",
  S3: "S3, gathering in one place", S4: "S4, making more of itself", S5: "S5, chemical selection (bound RNA)",
  S5b: "S5, build-up to a useful length",
};

export function brakeColumns(results, P) {
  const cols = [{ id: "T1", label: "Setting appears (T1)", kind: "term" }];
  const seen = new Set();
  for (const r of results) for (const g of r.rungs) seen.add(g.rung);
  for (const id of ["S0", "S1", "S2", "S2r", "S3", "S4", "S5", "S5b"]) if (seen.has(id)) cols.push({ id, label: RUNG_LABEL[id], kind: "rung" });
  cols.push({ id: "T4", label: "S5, copying with selection (T4)", kind: "term" });
  if (P.ecoOn !== false) cols.push({ id: "T5", label: "LUCA's community (T5)", kind: "term" });
  return cols;
}

function freeStep(sc, r, id, P, model) {
  if (id === "T1") return { ...r, t1: 0, total: r.total - r.t1 };
  if (id === "T4") return { ...r, t4: 0, total: r.total - r.t4 };
  if (id === "T5") return { ...r, t5: 0, total: r.total - r.t5 };
  if (id === "S2r") return auditScenario(sc, { ...P, riboseStep: "off" }, model);
  if (id === "S5b") return auditScenario(sc, { ...P, buildupOn: "off" }, model);
  return auditScenario(sc, { ...P, rungHandoff: { ...P.rungHandoff, [id]: "none" } }, model);
}

export function brakeTable(model, P, results, budgetMyr) {
  const cols = brakeColumns(results, P);
  const rows = results.map((r) => {
    const base = triesExact(r, budgetMyr, P);
    const cells = cols.map((c) => {
      if (c.kind === "rung" && !r.rungs.some((g) => g.rung === c.id)) return null;
      const r2 = freeStep(r.scenario, r, c.id, P, model);
      const t = triesExact(r2, budgetMyr, P);
      return { tries: t, gain: t - base, saveMyr: r.total - r2.total };
    });
    let top = -1;
    cells.forEach((x, i) => { if (x && x.gain > 0.05 && (top < 0 || x.gain > cells[top].gain)) top = i; });
    // The main brake among the setting's own steps (T1 and S0 to S5), leaving out the biology
    // (T4 and T5), which is the same in every setting.
    let topOwn = -1;
    cells.forEach((x, i) => { if (x && cols[i].id !== "T4" && cols[i].id !== "T5" && x.gain > 0.05 && (topOwn < 0 || x.gain > cells[topOwn].gain)) topOwn = i; });
    return { r, base, cells, top, topOwn };
  });
  return { cols, rows };
}

// Version 9.2: the easiest, hardest, fastest and slowest stage in one setting, and why.
// "Hardest" is the stage with the lowest chance of passing per try; "slowest" is the stage that
// takes the longest per try. Both come straight from the rung records of the audit.
export const HANDOFF_SHORT = { H1: "Fe-S cluster", H2: "Thioester", H3: "Ferrocyanide", H4: "HCN in a hot pool", H5: "Stored nitrogen", H6: "Sugars", H7: "Free phosphate", H8: "CO2 with no catalyst", H9: "CO2 on an iron sulfide surface", H10: "RNA, free", H11: "RNA on a mineral", H12: "Phosphate on volcanic glass" };
export const stageLabel = (id) => RUNG_LABEL[id] || id;
export const stepSeconds = (g) => (g.currency && g.currency.on ? g.currency.tauTransfer * g.currency.bonds : g.tauTransfer || 0);

const pctTxt = (p) => (p >= 0.9995 ? "almost 100%" : p >= 0.01 ? (100 * p).toFixed(p >= 0.1 ? 0 : 1) + "%" : p > 0 ? "about 1 in " + timesTxt(1 / p) : "0%");
const timesTxt = (x) => (x >= 1e4 ? x.toExponential(0).replace("e+", " x 10^") : x >= 10 ? Math.round(x).toLocaleString("en-GB") : x.toPrecision(2));

export function stageReasons(g, r, humanTime) {
  const why = [];
  const hName = g.handoff ? HANDOFF_SHORT[g.handoff.id] || g.handoff.id : null;
  if (hName) why.push(`stands for ${hName}`);
  if (g.tauLoss && g.tauTransfer) {
    const da = g.tauLoss / g.tauTransfer;
    why.push(da >= 1
      ? `forms in ${humanTime(g.tauTransfer)} and lasts ${humanTime(g.tauLoss)}, so it lasts ${timesTxt(da)} times longer than it takes to form`
      : `forms in ${humanTime(g.tauTransfer)} but lasts only ${humanTime(g.tauLoss)}, so it usually breaks down before it is made`);
  }
  if (g.surface && g.surface.applied) {
    const f = 1 / g.surface.t, l = g.surface.l;
    const speed = f >= 1 ? `${timesTxt(f)} times faster` : `${timesTxt(1 / f)} times slower`;
    why.push(`a surface (${g.surface.ref}) makes it ${speed}${l > 1.05 ? ` and ${timesTxt(l)} times longer lasting` : ""}`);
  }
  if (g.feed && g.feed > 1.01) why.push(`the rock feeds this step ${g.feed.toFixed(2)} times more iron or phosphate`);
  if (g.currency && g.currency.on) why.push(`made by the wet and dry cycle, ${g.currency.bonds} bond${g.currency.bonds > 1 ? "s" : ""} in a row`);
  if (r.delivery && r.delivery.on && g.rung === "S4") why.push(`a share of the tries is fed by delivered amino acids`);
  if (g.rung === "S5b") why.push(`the chain has to grow to a useful length`);
  return why;
}

export function stageSummary(r, humanTime) {
  const gs = r.rungs.filter((g) => typeof g.p === "number");
  if (!gs.length) return null;
  const pick = (cmp) => gs.reduce((a, b) => (cmp(b, a) ? b : a));
  const easiest = pick((b, a) => b.p > a.p || (b.p === a.p && stepSeconds(b) < stepSeconds(a)));
  const hardest = pick((b, a) => b.p < a.p || (b.p === a.p && stepSeconds(b) > stepSeconds(a)));
  const fastest = pick((b, a) => stepSeconds(b) < stepSeconds(a));
  const slowest = pick((b, a) => stepSeconds(b) > stepSeconds(a));
  const card = (g) => ({ id: g.rung, label: stageLabel(g.rung), p: g.p, pTxt: pctTxt(g.p), sec: stepSeconds(g), timeTxt: humanTime(stepSeconds(g)), why: stageReasons(g, r, humanTime) });
  return { easiest: card(easiest), hardest: card(hardest), fastest: card(fastest), slowest: card(slowest), pJoint: r.pJoint, pJointTxt: pctTxt(r.pJoint) };
}

// Why one setting has a different number of tries on Earth and on Mars: the window, and the
// three parts of one run (the setting appears, the chemistry, the biology).
export function planetWhy(rE, envE, PE, rM, envM, PM) {
  const tE = triesExact(rE, envE.budgetMyr, PE), tM = triesExact(rM, envM.budgetMyr, PM);
  const parts = [
    { key: "window", label: "the window", e: envE.budgetMyr, m: envM.budgetMyr, good: "longer" },
    { key: "t1", label: "the wait for the setting to appear", e: rE.t1, m: rM.t1 },
    { key: "chem", label: "the chemistry (S1 to S5)", e: rE.t2 + rE.t3, m: rM.t2 + rM.t3 },
    { key: "bio", label: "copying with selection and LUCA's community", e: rE.t4 + rE.t5, m: rM.t4 + rM.t5 },
  ];
  // The biggest change in run time among the three run parts, and the change in the window.
  const runParts = parts.slice(1).map((x) => ({ ...x, d: x.m - x.e }));
  const main = runParts.reduce((a, b) => (Math.abs(b.d) > Math.abs(a.d) ? b : a));
  return { tE, tM, parts, main, runE: rE.total, runM: rM.total, dWin: envM.budgetMyr - envE.budgetMyr };
}
