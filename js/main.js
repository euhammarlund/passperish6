import {
  computeEnvelope, auditScenario, verdictAgainstBudget, handoffState, computeT4, computeT5, timeLeft, cycleSweep, handoffStateScaled,
  ecosystemGate, preservationGate, eaFromTwoPoints, tempAtAge, arrhenius,
  fmtSci, fmtMyr, fmtDuration, geomean, secPerYr,
  surfaceState, surfaceForScenario, SURFACE_RUNGS,
} from "./engine.js";
import { SPEC, defaultParams, isUnreasonable } from "./params.js";
import {
  envelopeSvg, coolingSvg, auditSvg, damkohlerSvg, ladderSvg, regimeSvg,
  preservationSvg, matrixSvg, downloadSvg, downloadPng, downloadText,
  surfacePhSvg, surfaceGainSvg, zoomRulerSvg, raceSvg, funnelSvg, t3CurveSvg, humanTime,
} from "./charts.js";
import { createGuided } from "./guided.js";
import { createSupply } from "./supply.js";
import { createV8 } from "./v8.js";

/* ---------------- state ---------------- */

let MODEL = null;
let P = defaultParams();
const FIGS = {};
const SEL = { scenario: 0, handoff: null, element: null, presClass: null, refFilter: "all", refSearch: "", mineral: "smectite" };

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const safeUrl = (u) => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
const num = (v) => `<span class="num">${esc(v)}</span>`;
const tierTag = (t) => {
  const k = String(t == null ? "" : t).replace(/tier/i, "").trim().toUpperCase().slice(0, 1) || "C";
  return `<span class="tier tier-${k}">Tier ${k}</span>`;
};
const verdictTag = (text, cls) => `<span class="verdict ${cls}">${esc(text)}</span>`;
const srcLinks = (urls) => !urls || !urls.length ? '<span class="empty">no source recorded</span>'
  : urls.filter(safeUrl).map((u, i) => `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener">source ${i + 1}</a>`).join(" ");

function pctText(p) {
  if (!(p > 0)) return "practically none";
  if (p >= 0.9995) return "practically certain";
  if (p >= 0.01) return (p * 100).toFixed(p >= 0.1 ? 0 : 1) + " per cent";
  return "1 in " + fmtSci(1 / p, 1);
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}

function table(el, headers, rows, opts = {}) {
  const th = headers.map((h) => `<th${h.n ? ' class="n"' : ""}>${esc(h.label ?? h)}</th>`).join("");
  const body = rows.map((r, i) => {
    const cls = [r._cls || "", opts.clickable ? "clickable" : "", r._sel ? "sel" : ""].filter(Boolean).join(" ");
    const tds = r.cells.map((c, j) => {
      const hd = headers[j] || {};
      const kl = [hd.n ? "n" : "", hd.cls || ""].filter(Boolean).join(" ");
      return `<td${kl ? ` class="${kl}"` : ""}>${c}</td>`;
    }).join("");
    return `<tr${cls ? ` class="${cls}"` : ""}${r._key != null ? ` data-key="${esc(r._key)}"` : ""} data-i="${i}">${tds}</tr>`;
  }).join("");
  el.innerHTML = `<thead><tr>${th}</tr></thead><tbody>${body}</tbody>`;
}

/* ---------------- parameter controls ---------------- */

function sliderFor(key) {
  const s = SPEC[key];
  const lo = P.allowUnreasonable ? s.uLo : s.lo;
  const hi = P.allowUnreasonable ? s.uHi : s.hi;
  const logScale = hi / Math.max(1e-12, Math.abs(lo) || 1e-12) > 1000 || s.hi / Math.max(1e-12, s.lo) > 1000;
  const bad = isUnreasonable(key, P[key]);
  return `<div class="field" data-pkey="${key}">
    <label><span class="flabel">${esc(s.label)}${s.unit ? ", " + esc(s.unit) : ""}</span>${tierTag(s.tier)}</label>
    <div class="rng-row">
      <input type="range" data-role="rng" data-key="${key}" data-log="${logScale ? 1 : 0}"
        min="${logScale ? 0 : lo}" max="${logScale ? 1000 : hi}" step="${logScale ? 1 : s.step}"
        value="${logScale ? toLog(P[key], lo, hi) : P[key]}" aria-label="${esc(s.label)}">
      <input type="number" data-role="numi" data-key="${key}" value="${P[key]}" step="${s.step}" aria-label="${esc(s.label)} value">
    </div>
    <div class="rng-scale"><span>${fmtSci(lo)}</span><span class="${bad ? "warn-inline" : ""}" data-role="cur">${bad ? "outside the plausible range" : ""}</span><span>${fmtSci(hi)}</span></div>
    <div class="hint">${esc(s.hint)}${s.ref ? (safeUrl(s.ref) ? ` <a href="${esc(safeUrl(s.ref))}" target="_blank" rel="noopener">source</a>` : " " + esc(s.ref)) : ""}</div>
  </div>`;
}
const toLog = (v, lo, hi) => {
  const a = Math.log10(Math.max(1e-12, lo)), b = Math.log10(Math.max(1e-12, hi));
  return Math.round(((Math.log10(Math.max(1e-12, v)) - a) / (b - a)) * 1000);
};
const fromLog = (r, lo, hi) => {
  const a = Math.log10(Math.max(1e-12, lo)), b = Math.log10(Math.max(1e-12, hi));
  return Math.pow(10, a + (r / 1000) * (b - a));
};

function wireParamInputs(root) {
  root.querySelectorAll('input[data-role="rng"]').forEach((el) => {
    el.oninput = () => {
      const key = el.dataset.key, s = SPEC[key];
      const lo = P.allowUnreasonable ? s.uLo : s.lo, hi = P.allowUnreasonable ? s.uHi : s.hi;
      let v = el.dataset.log === "1" ? fromLog(+el.value, lo, hi) : +el.value;
      if (s.step >= 1) v = Math.round(v);
      else v = +v.toPrecision(4);
      P[key] = v;
      recompute();
    };
  });
  root.querySelectorAll('input[data-role="numi"]').forEach((el) => {
    el.onchange = () => {
      const key = el.dataset.key;
      const v = parseFloat(el.value);
      if (!Number.isFinite(v)) return;
      P[key] = v;
      recompute();
    };
  });
}

function syncParamInputs() {
  $$('input[data-role="numi"]').forEach((el) => { el.value = P[el.dataset.key]; });
  $$('input[data-role="rng"]').forEach((el) => {
    const key = el.dataset.key, s = SPEC[key];
    const lo = P.allowUnreasonable ? s.uLo : s.lo, hi = P.allowUnreasonable ? s.uHi : s.hi;
    el.min = el.dataset.log === "1" ? 0 : lo;
    el.max = el.dataset.log === "1" ? 1000 : hi;
    el.value = el.dataset.log === "1" ? toLog(P[key], lo, hi) : P[key];
  });
  $$("[data-pkey]").forEach((f) => {
    const bad = isUnreasonable(f.dataset.pkey, P[f.dataset.pkey]);
    const cur = f.querySelector('[data-role="cur"]');
    const s = SPEC[f.dataset.pkey];
    const lo = P.allowUnreasonable ? s.uLo : s.lo, hi = P.allowUnreasonable ? s.uHi : s.hi;
    const sc = f.querySelectorAll(".rng-scale span");
    if (sc.length === 3) { sc[0].textContent = fmtSci(lo); sc[2].textContent = fmtSci(hi); }
    if (cur) { cur.textContent = bad ? "outside the plausible range" : ""; cur.className = bad ? "warn-inline" : ""; }
  });
}

/* ---------------- view 1, envelope ---------------- */

function buildEnvelopeStatics() {
  $("#nearEvent").innerHTML = P.nearOptions.map((o) => `<option value="${o.id}">${esc(o.label)}</option>`).join("");
  $("#farEvent").innerHTML = P.farOptions.map((o) => `<option value="${o.id}">${esc(o.label)}</option>`).join("");
  $("#nearEvent").value = P.nearEventId;
  $("#farEvent").value = P.farEventId;
  $("#nearTempField").innerHTML = sliderFor("startTempC");
  $("#chemTempField").innerHTML = sliderFor("chemTempC");
  $("#handoffTempField").innerHTML = sliderFor("chemTempC");
  $("#handoffEaFields").innerHTML = sliderFor("eaTransfer") + sliderFor("eaLoss");
  wireParamInputs($("#v-envelope"));
  wireParamInputs($("#v-handoffs"));

  $("#nearEvent").onchange = (e) => { P.nearEventId = e.target.value; recompute(); };
  $("#farEvent").onchange = (e) => { P.farEventId = e.target.value; recompute(); };
  $("#nearManual").onchange = (e) => { P.nearManualGa = parseFloat(e.target.value); recompute(); };
  $("#farManual").onchange = (e) => { P.farManualGa = parseFloat(e.target.value); recompute(); };
  seg("#nearModeSeg", (v) => { P.nearMode = v; recompute(); });
  seg("#farModeSeg", (v) => { P.farMode = v; recompute(); });
  seg("#tempModeSeg", (v) => { P.tempMode = v; recompute(); });
  seg("#rangeSeg", (v) => { P.allowUnreasonable = v === "wide"; syncParamInputs(); recompute(); });

  const ea = eaFromTwoPoints(4 * secPerYr, 25, 9 * 86400, 100);
  $("#eaDerivation").innerHTML = `<strong>Where the loss activation energy comes from.</strong> An RNA phosphodiester bond has a measured
    half-life of about 4 years at 25 C and about 9 days at 100 C. Two half-lives at two temperatures are enough to solve the
    Arrhenius equation for one activation energy, and they give ${num(ea.toFixed(1) + " kJ per mol")}, which is the default.
    The transfer value is not measured. It is a generic figure for a catalysed reaction on a mineral surface, which is why it
    is Tier C. That the two numbers differ is the point: cooling slows loss more than it slows transfer, so cooling changes
    <em>which</em> rungs pass rather than simply slowing everything down.
    <div style="margin-top:8px">${srcLinks(["https://bionumbers.hms.harvard.edu/bionumber.aspx?id=105354&ver=3"])}</div>`;
}

function seg(sel, cb) {
  const root = $(sel);
  if (!root) return;
  root.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      root.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      cb(b.dataset.v);
    };
  });
}

function renderEnvelope(env) {
  $("#nearEventField").hidden = P.nearMode !== "event";
  $("#nearTempField").hidden = P.nearMode !== "temperature";
  $("#nearManualField").hidden = P.nearMode !== "manual";
  $("#nearBuildField").hidden = P.nearMode !== "build";
  segSet("#nearModeSeg", P.nearMode);
  if (P.nearMode === "build") $("#nearBuildHint").textContent = `${env.nearGa.toFixed(3)} Ga. ${env.nearBasis}`;
  $("#farEventField").hidden = P.farMode !== "event";
  $("#farManualField").hidden = P.farMode !== "manual";
  $("#chemTempField").style.display = P.tempMode === "manual" ? "" : "none";

  const nOpt = P.nearOptions.find((o) => o.id === P.nearEventId);
  const fOpt = P.farOptions.find((o) => o.id === P.farEventId);
  $("#nearEventHint").innerHTML = nOpt ? esc(nOpt.basis) + (safeUrl(nOpt.url) ? ` <a href="${esc(safeUrl(nOpt.url))}" target="_blank" rel="noopener">source</a>` : "") : "";
  $("#farEventHint").innerHTML = fOpt ? esc(fOpt.basis) + (safeUrl(fOpt.url) ? ` <a href="${esc(safeUrl(fOpt.url))}" target="_blank" rel="noopener">source</a>` : "") : "";

  $("#envKpis").innerHTML = [
    kpi("Near end", env.nearGa.toFixed(3), "Ga"),
    kpi("Far end", env.farGa.toFixed(3), "Ga"),
    kpi("Budget", fmtMyr(env.budgetMyr), "Myr"),
    kpi("Chemistry at", Math.round(env.workingTempC), "C"),
  ].join("");
  $("#envWarn").innerHTML = !env.valid
    ? `<div class="warn">The far end you chose is older than the near end, so the budget is negative. That is a real result and not a bug: it means the evidence you accept for LUCA puts it before the planet was habitable on this cooling curve, and one of the two choices has to give.</div>`
    : env.budgetMyr < 50
      ? `<div class="warn">A budget of ${fmtMyr(env.budgetMyr)} Myr is very tight. Watch how few scenarios survive it on the audit page.</div>` : "";

  $("#capEnvelope").innerHTML = `Near end: ${esc(env.nearLabel)}. ${esc(env.nearBasis)} Far end: ${esc(env.farLabel)}. ${esc(env.farBasis)}`;
  setFig("envelope", envelopeSvg(env, MODEL, P, figW(920)), "#figEnvelope");
  setFig("cooling", coolingSvg(P, env, Math.min(460, figW(460))), "#figCooling");
}
const kpi = (k, v, n) => `<div class="kpi"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span>${n ? `<span class="n">${esc(n)}</span>` : ""}</div>`;
const figW = (want) => Math.max(560, Math.min(want, (document.body.clientWidth || 1280) - 80));

function setFig(name, svg, sel) {
  FIGS[name] = svg;
  const el = $(sel);
  if (el) el.innerHTML = svg;
}

/* ---------------- view 2, audit ---------------- */

function renderAudit(env, results) {
  table($("#tblTerms"),
    [{ label: "Term" }, { label: "What it is" }, { label: "How it is obtained" }, { label: "Tier" }],
    [
      { cells: ["<strong>T1</strong> setting", "How long you wait for the setting itself to exist", "Scenario range from the manuscript, geometric mean, multiplied by the land factor if the scenario needs dry land, then by your scale factor", tierTag("B")] },
      { cells: ["<strong>T2</strong> chemistry", "The chemistry once the setting is there", "Computed. Sum of temperature-corrected transfer times over the active rungs", tierTag("A")] },
      { cells: ["<strong>T3</strong> coincidence", "Waiting for the separate steps to land in the same place at the same time", "Computed. Successes needed, times the cycle period, divided by joint probability times number of sites", tierTag("C")] },
      { cells: ["<strong>T4</strong> slow biology", "Crossing the error threshold, then fixing the trait in a population", "Computed from generation time, population size and generations to fixation", tierTag("B")] },
      { cells: ["<strong>T5</strong> an ecosystem", "Growing from one kind of cell to LUCA's community of X kinds with Y interactions", "Computed. ln(X) divided by the splitting rate, and minus ln(1 minus C) divided by the link rate, where C is the share of possible pairs that interact", tierTag("C")] },
    ]);

  const rows = results.map((r, i) => {
    const v = verdictAgainstBudget(r.total, env.budgetMyr);
    return {
      _key: i, _sel: SEL.scenario === i,
      cells: [
        `<strong>${esc(r.scenario.name)}</strong>`,
        fmtMyr(r.t1), fmtMyr(r.t2), fmtMyr(r.t3), fmtMyr(r.t4), fmtMyr(r.t5),
        `<strong>${fmtMyr(r.total)}</strong>`,
        r.dominant,
        (() => { const tl = timeLeft(r, env.budgetMyr, P); return tl.remaining > 0 ? fmtMyr(tl.remaining) + `<br><span class="sub2">${tl.stopped.toLocaleString("en-GB")} earlier tries</span>` : "none"; })(),
        `${fmtMyr(r.workbookLow)} to ${fmtMyr(r.workbookHigh)}`,
        verdictTag(v.text, v.cls),
      ],
    };
  });
  table($("#tblAudit"),
    [{ label: "Scenario" }, { label: "T1", n: 1 }, { label: "T2", n: 1 }, { label: "T3", n: 1 }, { label: "T4", n: 1 }, { label: "T5", n: 1 },
     { label: "Total, Myr", n: 1 }, { label: "Dominant" }, { label: "Time left, Myr", n: 1 }, { label: "Manuscript, Myr", n: 1 }, { label: "Against your budget" }],
    rows, { clickable: true });
  $("#tblAudit").querySelectorAll("tbody tr").forEach((tr) => {
    tr.onclick = () => { SEL.scenario = +tr.dataset.key; recompute(); };
  });

  renderAuditDetail(results[SEL.scenario], env);

  // which passages could be very quick
  const fast = MODEL.handoffs
    .map((h) => ({ h, st: handoffState(h, P.effectiveTempC, P.eaTransfer, P.eaLoss) }))
    .sort((a, b) => a.st.tauTransfer - b.st.tauTransfer);
  table($("#tblFast"),
    [{ label: "Handoff" }, { label: "Species and transfer" }, { label: "Transfer time", n: 1 }, { label: "Loss time", n: 1 },
     { label: "Speed class" }, { label: "Verdict" }],
    fast.map(({ h, st }) => ({
      cells: [`<span class="num">${esc(h.id)}</span>`, esc(h.species_and_handoff),
        fmtDuration(st.tauTransfer), fmtDuration(st.tauLoss),
        esc(h.speed_class), verdictTag(st.verdict, st.verdictClass)],
    })));

  setFig("audit", auditSvg(results, env, figW(920)), "#figAudit");
}

function renderAuditDetail(r, env) {
  if (!r) { $("#auditDetail").innerHTML = '<p class="empty">Select a scenario.</p>'; return; }
  const v = verdictAgainstBudget(r.total, env.budgetMyr);
  const t4 = r.t4detail;
  const rungRows = r.rungs.map((x) => `<tr><td class="name">${esc(x.rung)}<br><span class="sub2">${esc(x.rungName)}</span></td>
    <td>${x.handoff ? esc(x.handoff.id) + ", " + esc(x.handoff.species_and_handoff) : "no rate gate assigned"}
      <br><span class="sub2">${x.handoff ? "transfer " + fmtDuration(x.tauTransfer) + ", Da " + fmtSci(x.da) : "nothing to pass"}</span></td>
    <td class="n">${x.p > 0.001 ? x.p.toFixed(4) : fmtSci(x.p)}${x.surface && x.surface.applied && Math.abs(x.p - x.pNoSurface) > 1e-6 ? `<br><span class="sub2">${x.pNoSurface > 0.001 ? x.pNoSurface.toFixed(4) : fmtSci(x.pNoSurface)} bare</span>` : ""}</td></tr>`).join("");
  const ss = r.surfaceState;
  const surfLine = !ss ? "switched off" : ss.none ? "no surface"
    : `${esc(ss.mineral.name)} at pH ${num(ss.pH.toFixed(1))} and ${num(fmtSci(ss.loading))} g per L holds ${num((ss.fBound * 100).toFixed(1) + " per cent")} of the phosphate. Loss time on S2 multiplied by ${num(fmtSci(ss.lossGain))}, accumulation ${num(fmtSci(ss.cf))} times faster, activation ${num(fmtSci(ss.s4Gain))} times faster. Handoffs that already assume a surface are scaled relative to it.`;
  $("#auditDetail").innerHTML = `<div class="detail">
    <h4>${esc(r.scenario.name)}</h4>
    <p class="lede" style="font-size:13.5px">${esc(r.scenario.reasoning || "")}</p>
    <div class="tbl-wrap"><table class="data"><thead><tr><th>Rung</th><th>Standing in for it</th><th class="n">p</th></tr></thead><tbody>${rungRows}</tbody></table></div>
    <dl>
      <dt>T1</dt><dd>geometric mean of ${num(fmtMyr(r.scenario.t1_low))} to ${num(fmtMyr(r.scenario.t1_high))} Myr, times a land factor of ${num(r.landFactor)}, times your scale of ${num(P.t1Scale)} = ${num(fmtMyr(r.t1) + " Myr")}</dd>
      <dt>surface</dt><dd>${surfLine}</dd>
      <dt>T2</dt><dd>sum of the transfer times above, at ${num(Math.round(r.tempC) + " C")}, = ${num(fmtMyr(r.t2) + " Myr")}</dd>
      <dt>joint p</dt><dd>product of p over the active rungs = ${num(fmtSci(r.pJoint))}</dd>
      <dt>sites</dt><dd>geometric mean of ${num(fmtSci(r.scenario.n_parallel_sites_low))} to ${num(fmtSci(r.scenario.n_parallel_sites_high))}, times your scale = ${num(fmtSci(r.nSites))}</dd>
      <dt>cycle</dt><dd>${esc(r.cycleName)}, period ${num(fmtDuration(r.tCycleS))}</dd>
      <dt>T3</dt><dd>${num(P.successesNeeded)} success divided by (${num(fmtSci(r.pJoint))} x ${num(fmtSci(r.nSites))} divided by ${num(fmtDuration(r.tCycleS))}) = ${num(fmtMyr(r.t3) + " Myr")}</dd>
      <dt>T4</dt><dd>${num(fmtSci(t4.gensToFix))} generations to fixation at ${num(fmtSci(t4.genPerYr))} generations per year = ${num(fmtMyr(t4.fixMyr) + " Myr")}, plus ${num(fmtMyr(t4.errorMyr) + " Myr")} to cross the error threshold = ${num(fmtMyr(r.t4) + " Myr")}</dd>
      <dt>T5</dt><dd>${r.t5detail.on ? (r.t5detail.direct ? "set directly to " + num(fmtMyr(r.t5) + " Myr") : `${num(r.t5detail.X)} kinds take ln(${num(r.t5detail.X)}) divided by ${num(P.ecoDivRate)} = ${num(fmtMyr(r.t5detail.tDiv) + " Myr")} to appear. ${num(r.t5detail.Y)} links out of ${num(r.t5detail.pairs)} possible pairs (C = ${num(r.t5detail.C.toFixed(2))}) take ${num(fmtMyr(r.t5detail.tInt) + " Myr")}. ${r.t5detail.overlap ? "They run at the same time, so the longer one counts" : "They run one after the other, so both count"}${r.t5detail.extra > 0 ? ", plus " + num(fmtMyr(r.t5detail.extra) + " Myr") + " extra" : ""} = ${num(fmtMyr(r.t5) + " Myr")}`) : "switched off"}</dd>
      <dt>total</dt><dd><strong>${num(fmtMyr(r.total) + " Myr")}</strong> against a budget of ${num(fmtMyr(env.budgetMyr) + " Myr")}. ${verdictTag(v.text, v.cls)}</dd>
      <dt>time left</dt><dd>${(() => { const tl = timeLeft(r, env.budgetMyr, P); return tl.remaining > 0 ? `${num(fmtMyr(tl.remaining) + " Myr")} left over. One full try takes ${num(fmtMyr(tl.run) + " Myr")}, so the window holds ${num(tl.tries.toLocaleString("en-GB"))} tries: ours plus ${num(tl.stopped.toLocaleString("en-GB"))} that could have started and stopped. Chance that it fits at all: ${num(pctText(tl.pFit))}` : `none. The run needs ${num(fmtMyr(-tl.remaining) + " Myr")} more than the window has. Chance that it still fits by luck: ${num(pctText(tl.pFit))}`; })()}</dd>
      <dt>dominant term</dt><dd>${esc(r.dominant)}. ${esc(r.scenario.dominant_term && r.scenario.dominant_term !== r.dominant ? "The manuscript lists " + r.scenario.dominant_term + " as dominant, so your parameters have moved it." : "This agrees with the manuscript.")}</dd>
    </dl></div>`;
}

/* ---------------- view 3, handoffs ---------------- */

function renderHandoffs() {
  const rows = MODEL.handoffs.map((h) => {
    const st = handoffState(h, P.effectiveTempC, P.eaTransfer, P.eaLoss);
    return {
      _key: h.id, _sel: SEL.handoff === h.id,
      cells: [
        `<span class="num">${esc(h.id)}</span>`,
        `<strong>${esc(h.species_and_handoff)}</strong>`,
        esc(h.marker_category || ""),
        fmtDuration(st.tauTransfer), fmtDuration(st.tauLoss),
        fmtSci(st.da), st.p > 0.001 ? st.p.toFixed(4) : fmtSci(st.p),
        verdictTag(st.verdict, st.verdictClass), tierTag(h.tier),
      ],
    };
  });
  table($("#tblHandoffs"),
    [{ label: "Id" }, { label: "Species and handoff" }, { label: "Category" }, { label: "tau transfer", n: 1 },
     { label: "tau loss", n: 1 }, { label: "Da", n: 1 }, { label: "p", n: 1 }, { label: "Verdict" }, { label: "Tier" }],
    rows, { clickable: true });
  $("#tblHandoffs").querySelectorAll("tbody tr").forEach((tr) => {
    tr.onclick = () => { SEL.handoff = tr.dataset.key; recompute(); };
  });

  const h = MODEL.handoffs.find((x) => x.id === SEL.handoff);
  if (!h) {
    $("#handoffDetail").innerHTML = '<p class="empty">Select a handoff to read where its numbers come from.</p>';
  } else {
    const st = handoffState(h, P.effectiveTempC, P.eaTransfer, P.eaLoss);
    $("#handoffDetail").innerHTML = `<div class="detail">
      <h4>${esc(h.id)}. ${esc(h.species_and_handoff)}</h4>
      <dl>
        <dt>why these values</dt><dd>${esc(h.why_this_value)}</dd>
        <dt>reported at 25 C</dt><dd>transfer ${num(fmtDuration(h.tau_transfer_low_s))} to ${num(fmtDuration(h.tau_transfer_high_s))}, loss ${num(fmtDuration(h.tau_loss_low_s))} to ${num(fmtDuration(h.tau_loss_high_s))}</dd>
        <dt>at ${num(Math.round(P.effectiveTempC) + " C")}</dt><dd>transfer ${num(fmtDuration(st.tauTransfer))}, loss ${num(fmtDuration(st.tauLoss))}</dd>
        <dt>Da and p</dt><dd>Da = ${num(fmtSci(st.da))}, so p = Da divided by (1 + Da) = ${num(st.p > 0.001 ? st.p.toFixed(4) : fmtSci(st.p))}. ${verdictTag(st.verdict, st.verdictClass)}</dd>
        <dt>speed class</dt><dd>${esc(h.speed_class)}</dd>
        <dt>confidence</dt><dd>${tierTag(h.tier)}</dd>
        <dt>sources</dt><dd>${srcLinks(h.source_urls)}</dd>
      </dl></div>`;
  }
  setFig("damkohler", damkohlerSvg(MODEL, P, Math.min(660, figW(660)), SEL.handoff), "#figDamkohler");
}

/* ---------------- view 4, mineral surfaces ---------------- */

const MODE_HINT = {
  scenario: "Each scenario uses its own mineral, pH and amount of solid, set in the table below.",
  one: "Every scenario uses the same mineral, pH and amount of solid.",
  mix: "Every scenario uses the mineral mix set on the minerals and build-up page, with the pH and amount of solid below.",
  off: "No surface anywhere. Handoffs that already assume a surface keep their tabulated values.",
};

function buildSurfaceStatics() {
  const mins = MODEL.minerals || [];
  $("#surfMineral").innerHTML = mins.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("");
  $("#surfMineral").value = P.surfaceMineral;
  $("#surfMineral").onchange = (e) => { P.surfaceMineral = e.target.value; SEL.mineral = e.target.value; recompute(); };
  $("#surfOneFields").innerHTML = sliderFor("surfacePH") + sliderFor("surfaceLoading");
  $("#surfSolutionFields").innerHTML = sliderFor("phosphateUM") + sliderFor("divalentMM");
  $("#surfStabilityFields").innerHTML = sliderFor("protectionFactor") + sliderFor("damageK") + sliderFor("bridgeK") + sliderFor("bridgeHalfMM");
  wireParamInputs($("#v-surfaces"));
  seg("#surfModeSeg", (v) => { P.surfaceMode = v; recompute(); });
  $("#surfRungs").innerHTML = SURFACE_RUNGS.map((r) => {
    const rung = MODEL.rungs.find((x) => x.id === r);
    const nm = rung ? rung.name.replace(/^S\d\s*/, "") : "";
    return `<label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" data-srung="${r}" ${P.surfaceRungs[r] ? "checked" : ""}> ${esc(r)}, ${esc(nm)}</label>`;
  }).join("");
  $("#surfRungs").querySelectorAll("input[data-srung]").forEach((cb) => {
    cb.onchange = () => { P.surfaceRungs = { ...P.surfaceRungs, [cb.dataset.srung]: cb.checked }; recompute(); };
  });
  $("#surfHard").onclick = loadHardCase;
  $("#surfDefaultChem").onclick = loadDefaultChem;
  const sm = MODEL.surface_method || {};
  $("#surfMethod").innerHTML = `<p class="lede" style="font-size:14px">${esc(sm.summary || "")}</p>
    <ol style="margin:10px 0 0 18px;line-height:1.6;font-size:13.5px">${(sm.steps || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
    <h3>What the model does not yet capture</h3>
    <ul style="margin:0 0 0 18px;line-height:1.6;font-size:13.5px">${(sm.caveats || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
}

function surfaceFocus(results) {
  if (P.surfaceMode === "one" || P.surfaceMode === "mix") return { cond: { pH: P.surfacePH, loading: P.surfaceLoading }, label: "the surface used for every scenario" };
  const r = results[SEL.scenario];
  const sf = surfaceForScenario(r.scenario, P, MODEL);
  return { cond: sf.off ? { pH: 7, loading: 10 } : sf.cond, label: sf.off ? "pH 7 and 10 g per L (surfaces are off)" : r.scenario.name };
}

function renderSurfaces(env, results) {
  if (!MODEL.minerals) return;
  segSet("#surfModeSeg", P.surfaceMode);
  $("#surfModeHint").textContent = MODE_HINT[P.surfaceMode] || "";
  $("#surfMineralField").hidden = P.surfaceMode !== "one";
  $("#surfOneFields").hidden = P.surfaceMode !== "one" && P.surfaceMode !== "mix";
  $("#surfMineral").value = P.surfaceMineral;
  $("#surfRungs").querySelectorAll("input[data-srung]").forEach((cb) => { cb.checked = !!P.surfaceRungs[cb.dataset.srung]; });

  const bare = MODEL.scenarios.map((sc) => auditScenario(sc, { ...P, surfaceMode: "off" }, MODEL));
  const mins = MODEL.minerals;
  const opts = (sel) => mins.map((m) => `<option value="${esc(m.id)}"${m.id === sel ? " selected" : ""}>${esc(m.name)}</option>`).join("");
  const editable = P.surfaceMode === "scenario";
  const off = P.surfaceMode === "off";
  const rows = results.map((r, i) => {
    const sf = surfaceForScenario(r.scenario, P, MODEL);
    const ss = r.surfaceState;
    const b = bare[i];
    const v = verdictAgainstBudget(r.total, env.budgetMyr);
    const sid = esc(r.scenario.id);
    const mineralCell = editable ? `<select data-ssc="${sid}" data-f="mineral" style="min-width:150px">${opts(sf.mineral.id)}</select>` : esc(off ? "off" : sf.mineral.name);
    const phCell = editable ? `<input type="number" data-ssc="${sid}" data-f="pH" value="${sf.cond.pH}" step="0.1" min="2" max="13" style="width:64px">` : (off ? "" : sf.cond.pH.toFixed(1));
    const ldCell = editable ? `<input type="number" data-ssc="${sid}" data-f="loading" value="${sf.cond.loading}" step="any" min="0" style="width:72px">` : (off ? "" : fmtSci(sf.cond.loading));
    const pct = ss && !ss.none ? (ss.fBound * 100).toFixed(ss.fBound > 0.999 ? 2 : 1) : "0";
    return {
      _key: i, _sel: SEL.scenario === i,
      cells: [
        `<strong>${esc(r.scenario.name)}</strong>`, mineralCell, phCell, ldCell, pct,
        ss ? fmtSci(ss.lossGain) : "1", ss ? fmtSci(ss.cf) : "1", ss ? fmtSci(ss.s4Gain) : "1",
        `${fmtSci(b.pJoint)} to <strong>${fmtSci(r.pJoint)}</strong>`,
        `${fmtMyr(b.total)} to <strong>${fmtMyr(r.total)}</strong>`,
        verdictTag(v.text, v.cls),
      ],
    };
  });
  table($("#tblSurfScen"),
    [{ label: "Scenario" }, { label: "Mineral" }, { label: "pH", n: 1 }, { label: "g per L", n: 1 }, { label: "Held, per cent", n: 1 },
     { label: "S2 loss time x", n: 1 }, { label: "S3 faster x", n: 1 }, { label: "S4 faster x", n: 1 },
     { label: "Joint p, bare to surface", n: 1 }, { label: "Total Myr, bare to surface", n: 1 }, { label: "Against budget" }],
    rows, { clickable: true });
  const tb = $("#tblSurfScen");
  tb.querySelectorAll("tbody tr").forEach((tr) => {
    tr.onclick = (e) => {
      if (e.target.closest("select,input")) return;
      SEL.scenario = +tr.dataset.key;
      const sf = surfaceForScenario(results[SEL.scenario].scenario, P, MODEL);
      if (sf.mineral && sf.mineral.id !== "none") SEL.mineral = sf.mineral.id;
      recompute();
    };
  });
  tb.querySelectorAll("[data-ssc]").forEach((el) => {
    el.onchange = () => {
      const id = el.dataset.ssc, f = el.dataset.f;
      const cur = { ...(P.scenarioSurface[id] || {}) };
      if (f === "mineral") { cur.mineral = el.value; if (el.value !== "none") SEL.mineral = el.value; }
      else { const val = parseFloat(el.value); if (!Number.isFinite(val) || val < 0) return; cur[f] = val; }
      P.scenarioSurface = { ...P.scenarioSurface, [id]: cur };
      SEL.scenario = results.findIndex((r) => r.scenario.id === id);
      recompute();
    };
  });
  const allSmall = results.every((r, i) => Math.abs(r.total - bare[i].total) / bare[i].total < 0.02);
  $("#surfScenNote").innerHTML = off
    ? "<strong>Surfaces are off.</strong> Both columns show the same run."
    : allSmall
    ? "<strong>Surfaces change almost nothing here.</strong> With the current handoffs every rung already passes, so there is little for a surface to rescue and the totals are set by T1 and T4. Load the hard case to see the difference."
    : "<strong>Surfaces matter here.</strong> Where a rung would otherwise fail, holding and protection lift its probability, which shortens the coincidence term T3. What remains is set by T1 and T4, which no surface touches.";

  const focus = surfaceFocus(results);
  if (!mins.find((m) => m.id === SEL.mineral && m.id !== "none")) SEL.mineral = "smectite";
  const mRows = mins.filter((m) => m.id !== "none").map((m) => {
    const st = surfaceState(m, focus.cond, P);
    return {
      _key: m.id, _sel: SEL.mineral === m.id,
      cells: [
        `<strong>${esc(m.name)}</strong><br><span class="sub2">${esc(m.group)}</span>`,
        m.pzc.toFixed(1), fmtSci(m.ssa_m2_g), m.gmax_umol_m2.toFixed(2), fmtSci(m.k7_l_umol),
        (m.f_locked * 100).toFixed(0), fmtSci(st.K), (st.fBound * 100).toFixed(1), tierTag(m.tier),
      ],
    };
  });
  table($("#tblMinerals"),
    [{ label: "Mineral" }, { label: "pzc", n: 1 }, { label: "m2 per g", n: 1 }, { label: "umol per m2", n: 1 }, { label: "K at pH 7", n: 1 },
     { label: "Locked, per cent", n: 1 }, { label: "K now", n: 1 }, { label: "Held now, per cent", n: 1 }, { label: "Tier" }],
    mRows, { clickable: true });
  $("#tblMinerals").querySelectorAll("tbody tr").forEach((tr) => {
    tr.onclick = () => { SEL.mineral = tr.dataset.key; recompute(); };
  });
  const mm = mins.find((m) => m.id === SEL.mineral);
  if (mm) {
    const st = surfaceState(mm, focus.cond, P);
    $("#mineralDetail").innerHTML = `<div class="detail">
      <h4>${esc(mm.name)}${mm.formula ? `, <span style="font-weight:400">${esc(mm.formula)}</span>` : ""}</h4>
      <dl>
        <dt>why these numbers</dt><dd>${esc(mm.why)}</dd>
        <dt>on the Hadean Earth</dt><dd>${esc(mm.hadean)}</dd>
        <dt>conditions</dt><dd>${esc(focus.label)}: pH ${num(focus.cond.pH.toFixed(1))}, ${num(fmtSci(focus.cond.loading))} g per L</dd>
        <dt>affinity</dt><dd>direct ${num(fmtSci(st.kDirect))} plus cation bridge ${num(fmtSci(st.kBridge))} = ${num(fmtSci(st.K))} L per umol. ${num((st.negFrac * 100).toFixed(0) + " per cent")} of the surface is negative at this pH.</dd>
        <dt>held</dt><dd>Kd ${num(fmtSci(st.kd))} L per g, so ${num((st.fBound * 100).toFixed(1) + " per cent")} is on the surface, which is ${num((st.theta * 100).toFixed(1) + " per cent")} full</dd>
        <dt>protection</dt><dd>a held molecule lasts ${num(fmtSci(st.pfEff))} times longer, so the S2 loss time is multiplied by ${num(fmtSci(st.lossGain))}</dd>
        <dt>gathering</dt><dd>S3 ${num(fmtSci(st.cf))} times faster. S4 ${num(fmtSci(st.s4Gain))} times faster, because ${num((mm.f_locked * 100).toFixed(0) + " per cent")} of what is held is locked away</dd>
        <dt>confidence</dt><dd>${tierTag(mm.tier)}</dd>
        <dt>sources</dt><dd>${srcLinks(mm.source_urls)}</dd>
      </dl></div>`;
  }
  $("#surfPhSub").textContent = "Distribution coefficient for each surface, with the pH and loading of " + focus.label;
  setFig("surfaceph", surfacePhSvg(MODEL, P, focus.cond, Math.min(720, figW(720)), SEL.mineral), "#figSurfacePh");
  setFig("surfacegain", surfaceGainSvg(MODEL, P, focus.cond, Math.min(720, figW(720)), SEL.mineral), "#figSurfaceGain");
}

/* ---------------- view 5, T2 and T3 up close ---------------- */

function loadHardCase() {
  P.rungHandoff = { ...P.rungHandoff, S2: "H4", S3: "H7", S4: "H8" };
  P.allowUnreasonable = true;
  P.successesNeeded = 1e9;
  rebuildAllControls();
  recompute();
  toast("Hard case loaded: H4, H7 and H8 with a billion successes. The wide parameter range is switched on");
}
function loadDefaultChem() {
  P.rungHandoff = { ...defaultParams().rungHandoff };
  P.successesNeeded = SPEC.successesNeeded.def;
  rebuildAllControls();
  recompute();
  toast("Default handoffs and one required success restored");
}

function buildZoomStatics() {
  $("#zoomScenSeg").innerHTML = MODEL.scenarios.map((sc, i) => `<button data-v="${i}" aria-pressed="${i === SEL.scenario}">${esc(sc.name)}</button>`).join("");
  seg("#zoomScenSeg", (v) => { SEL.scenario = +v; recompute(); });
  $("#zoomHard").onclick = loadHardCase;
  $("#zoomDefault").onclick = loadDefaultChem;
}

function renderZoom(env, results) {
  const i = SEL.scenario;
  const r = results[i];
  segSet("#zoomScenSeg", String(i));
  const surfOn = P.surfaceMode !== "off";
  const bare = surfOn ? auditScenario(r.scenario, { ...P, surfaceMode: "off" }, MODEL) : null;
  const t2s = r.t2 * secPerYr * 1e6, t3s = r.t3 * secPerYr * 1e6;
  const budS = env.budgetMyr * secPerYr * 1e6;
  const triesPerCycle = r.nSites;
  const cycles = P.successesNeeded / (r.pJoint * r.nSites);
  $("#zoomKpis").innerHTML = [
    kpi("T2, chemistry", humanTime(t2s), "transfer times laid end to end"),
    kpi("T3, waiting", humanTime(t3s), "until " + fmtSci(P.successesNeeded) + " success" + (P.successesNeeded === 1 ? "" : "es")),
    kpi("Joint p", r.pJoint > 0.001 ? r.pJoint.toFixed(4) : fmtSci(r.pJoint), "chance one try passes every rung"),
    kpi("Tries per cycle", fmtSci(triesPerCycle), "sites working at once"),
    kpi("Cycles to wait", cycles < 1 ? "less than 1" : fmtSci(cycles), "each " + humanTime(r.tCycleS)),
    kpi("T1, T4 and T5", humanTime((r.t1 + r.t4 + r.t5) * secPerYr * 1e6), "for comparison"),
  ].join("");
  // compress the budget into one calendar year
  if (budS > 0) {
    const f = secPerYr / budS;
    $("#zoomAnalogy").innerHTML = `<strong>If the whole ${esc(fmtMyr(env.budgetMyr))} Myr budget were squeezed into one calendar year,</strong> T2 would last ${num(humanTime(t2s * f))} and T3 ${num(humanTime(t3s * f))}, while T1, T4 and T5 together would take ${num(humanTime((r.t1 + r.t4 + r.t5) * secPerYr * 1e6 * f))}. ` +
      (r.t3 > env.budgetMyr ? "Here T3 alone is longer than the budget, so the chance estimates decide the verdict." : r.t3 > 0.01 * env.budgetMyr ? "Here T3 is a real share of the budget, so the chance estimates start to matter." : "At this setting the chance estimates could be badly wrong without changing the verdict.");
  } else $("#zoomAnalogy").textContent = "There is no budget at these envelope settings.";

  const W = Math.min(980, figW(980));
  setFig("zoomruler", zoomRulerSvg(results, env, W, i), "#figZoomRuler");
  const half = Math.max(560, Math.min(620, Math.floor((document.body.clientWidth || 1280) / 2) - 60));
  $("#zoomRaceSub").textContent = r.scenario.name + ", at " + Math.round(r.tempC) + " C";
  setFig("zoomrace", raceSvg(r, half, bare), "#figZoomRace");
  setFig("zoomfunnel", funnelSvg(r, half, bare), "#figZoomFunnel");
  setFig("zoomt3", t3CurveSvg(results, env, P, W, i), "#figZoomT3");

  // break-even table
  const marks = [[86400, "a day"], [secPerYr, "a year"], [secPerYr * 1e6, "1 Myr"]];
  const rows = results.map((x, j) => {
    const k = P.successesNeeded * x.tCycleS / x.nSites; // seconds
    const pBud = budS > 0 ? k / budS : Infinity;
    const room = Math.log10(x.pJoint / pBud);
    const pf = (v) => (v >= 1 ? "not reachable" : fmtSci(v));
    return {
      _key: j, _sel: j === i,
      cells: [`<strong>${esc(x.scenario.name)}</strong>`, x.pJoint > 0.001 ? x.pJoint.toFixed(4) : fmtSci(x.pJoint),
        ...marks.map(([s2]) => pf(k / s2)), pf(pBud),
        verdictTag(Number.isFinite(room) ? (room >= 0 ? room.toFixed(1) + " powers of ten" : "short by " + (-room).toFixed(1)) : "n.a.", room >= 3 ? "v-pass" : room >= 0 ? "v-marginal" : "v-fail")],
    };
  });
  table($("#tblZoomBreak"), [{ label: "Scenario" }, { label: "p now", n: 1 }, { label: "T3 = a day", n: 1 }, { label: "T3 = a year", n: 1 }, { label: "T3 = 1 Myr", n: 1 }, { label: "T3 = budget", n: 1 }, { label: "Room" }], rows, { clickable: true });
  $("#tblZoomBreak").querySelectorAll("tbody tr").forEach((tr) => { tr.onclick = () => { SEL.scenario = +tr.dataset.key; recompute(); }; });

  $("#zoomStepSub").textContent = "For " + r.scenario.name;
  const pTxt = r.pJoint > 0.001 ? r.pJoint.toFixed(4) : fmtSci(r.pJoint);
  $("#zoomSteps").innerHTML = `<div class="detail"><dl>
    <dt>1. sites</dt><dd>${num(fmtSci(r.nSites))} places trying at once (geometric mean of the scenario range, times the site scale)</dd>
    <dt>2. cycle</dt><dd>${esc(r.cycleName)}, one try per site every ${num(humanTime(r.tCycleS))}</dd>
    <dt>3. joint p</dt><dd>${r.rungs.filter((g) => g.handoff).map((g) => num(g.p > 0.9999 ? "0.9999+" : g.p > 0.001 ? g.p.toFixed(4) : fmtSci(g.p))).join(" x ")} = ${num(pTxt)}</dd>
    <dt>4. successes per cycle</dt><dd>${num(fmtSci(r.nSites))} x ${num(pTxt)} = ${num(fmtSci(r.nSites * r.pJoint))}</dd>
    <dt>5. cycles needed</dt><dd>${num(fmtSci(P.successesNeeded))} needed / ${num(fmtSci(r.nSites * r.pJoint))} = ${num(fmtSci(cycles))}</dd>
    <dt>6. T3</dt><dd>${num(fmtSci(cycles))} cycles x ${num(humanTime(r.tCycleS))} = <strong>${num(humanTime(t3s))}</strong></dd>
    <dt>T2</dt><dd>${r.rungs.filter((g) => g.handoff).map((g) => num(humanTime(g.tauTransfer))).join(" + ")}${P.t2Scale !== 1 ? ", times " + num(P.t2Scale) : ""} = <strong>${num(humanTime(t2s))}</strong></dd>
    <dt>note</dt><dd>When fewer than one cycle is needed, T3 is less than one cycle period. That means success is expected in the first round. The model does not round it up to one full cycle.</dd>
  </dl></div>`;
}

/* ---------------- view 6, ladder ---------------- */

function renderLadder(result) {
  setFig("ladder", ladderSvg(result, MODEL, figW(920)), "#figLadder");
  setFig("matrix", matrixSvg(MODEL, figW(920)), "#figMatrix");

  $("#rungAssign").innerHTML = MODEL.rungs.filter((r) => r.id !== "S6").map((r) => {
    const opts = ['<option value="none">no rate gate</option>']
      .concat(MODEL.handoffs.map((h) => `<option value="${h.id}"${P.rungHandoff[r.id] === h.id ? " selected" : ""}>${esc(h.id)}, ${esc(h.species_and_handoff)}</option>`)).join("");
    const active = P.activeRungs.includes(r.id);
    return `<div class="field" style="display:grid;grid-template-columns:215px 1fr auto;gap:12px;align-items:center">
      <span class="flabel" style="margin:0;line-height:1.3"><strong>${esc(r.id)}</strong> ${esc(r.name)}</span>
      <select data-rung="${r.id}">${opts}</select>
      <label style="display:flex;gap:6px;align-items:center;font-size:12px;color:var(--muted)">
        <input type="checkbox" data-active="${r.id}"${active ? " checked" : ""}> counts in the audit</label>
    </div>`;
  }).join("");
  $("#rungAssign").querySelectorAll("select[data-rung]").forEach((s) => {
    s.onchange = () => { P.rungHandoff[s.dataset.rung] = s.value; recompute(); };
  });
  $("#rungAssign").querySelectorAll("input[data-active]").forEach((c) => {
    c.onchange = () => {
      const id = c.dataset.active;
      P.activeRungs = c.checked ? [...new Set([...P.activeRungs, id])].sort() : P.activeRungs.filter((x) => x !== id);
      recompute();
    };
  });

  const pill = (g) => `<span class="pill ${g || "na"}">${esc(g || "n.a.")}</span>`;
  const rungIds = ["S0", "S1", "S2", "S3", "S4", "S5", "S6"];
  table($("#tblElements"),
    [{ label: "Element" }, ...rungIds.map((r) => ({ label: r })), { label: "Hardest rung" }],
    MODEL.elements.map((el) => ({
      _key: el.symbol, _sel: SEL.element === el.symbol,
      cells: [`<strong>${esc(el.symbol)}</strong> ${esc(el.name)}`,
        ...rungIds.map((r) => pill(el.rungs[r])),
        esc(el.hardest_rung || rungIds.filter((r) => el.rungs[r] === "h").join(", ") || "none")],
    })), { clickable: true });
  $("#tblElements").querySelectorAll("tbody tr").forEach((tr) => {
    tr.onclick = () => { SEL.element = tr.dataset.key; renderElementDetail(); };
  });
  renderElementDetail();

  table($("#tblCouplings"),
    [{ label: "Elements involved" }, { label: "Kind of coupling" }, { label: "What it does" }, { label: "Sources" }],
    MODEL.couplings.map((c) => ({
      cells: [`<strong>${esc(Array.isArray(c.elements) ? c.elements.join(" and ") : c.elements || "")}</strong>`,
        esc(c.type || ""), esc(c.what_it_does || ""), srcLinks(c.source_urls)],
    })));

  $("#chains").innerHTML = MODEL.chains.map((ch) => `<div class="chain">
    <h3>${esc(ch.chain_name || ch.name || "")}</h3>
    ${(ch.steps || []).map((s) => {
      const loss = String(s.what_happens || "").replace(/^Loss process that competes:\s*/i, "");
      const pay = String(s.note || "").replace(/^Currency that pays the step:\s*/i, "");
      return `<div class="chain-step">
        <span class="rg">${esc(s.rung || "")}</span>
        <span class="sp">${esc(s.species || "")}<br><span class="sub2">${esc(s.stage || "")}</span></span>
        <span class="wh"><span class="sub2">competing loss</span> ${esc(loss || "none recorded")}
          <br><span class="sub2">paid for by</span> ${esc(pay || "no payment needed")}</span></div>`;
    }).join("")}
  </div>`).join("");
}

function renderElementDetail() {
  const el = MODEL.elements.find((e) => e.symbol === SEL.element);
  if (!el) { $("#elementDetail").innerHTML = '<p class="empty">Select an element.</p>'; return; }
  const rungIds = ["S0", "S1", "S2", "S3", "S4", "S5", "S6"];
  $("#elementDetail").innerHTML = `<div class="detail">
    <h4>${esc(el.symbol)}, ${esc(el.name)}</h4>
    <dl>
      <dt>grades</dt><dd>${rungIds.map((r) => `${r} ${el.rungs[r] || "n.a."}`).join(", ")}</dd>
      ${el.hadean_source ? `<dt>Hadean source</dt><dd>${esc(el.hadean_source)}</dd>` : ""}
      ${el.why ? `<dt>why</dt><dd>${esc(el.why)}</dd>` : ""}
      ${el.rate_limiting_step ? `<dt>rate-limiting step</dt><dd>${esc(el.rate_limiting_step)}</dd>` : ""}
      <dt>S6, preservation</dt><dd>${esc(el.s6_why || "not assessed")}</dd>
      <dt>sources</dt><dd>${srcLinks((el.source_urls || []).concat(el.s6_source_urls || []))}</dd>
    </dl></div>`;
}

/* ---------------- view 5, preservation ---------------- */

function renderPreservation() {
  const pr = MODEL.preservation;
  const gA = (pr.gates || []).find((g) => g.id === "S6a") || {};
  const gB = (pr.gates || []).find((g) => g.id === "S6b") || {};
  $("#s6Lede").innerHTML = `Everything up to S5 asks whether life could get started and become heritable. S6 asks a different question:
    <strong>whether anything about it could still be there for us to measure.</strong> It sits after LUCA and it does not spend any of the
    pre-LUCA budget, so it never makes the audit harder. What it does instead is decide which kinds of evidence are even allowed to
    reach us, and it splits into two gates. S6a asks whether the community lasted long enough to be an ecosystem rather than a single
    population, because LUCA was not alone. S6b asks whether any molecule from that community was refractory enough, for long enough,
    at the temperature its rock experienced, to survive as a biomarker.`;
  $("#s6aReading").innerHTML = esc(gA.reading || "") + `<br><br><em>${esc(gA.criterion || "")}</em>`;
  $("#s6bReading").innerHTML = esc(gB.reading || "") + `<br><br><em>${esc(gB.criterion || "")}</em>`;

  if (!$("#s6aFields").dataset.built) {
    $("#s6aFields").innerHTML = ["vesselLifetimeYr", "recycleTimeYr", "turnoversForEcosystem"].map(sliderFor).join("");
    $("#s6bFields").innerHTML = ["burialTempC", "rockAgeMyr", "eaDegradation"].map(sliderFor).join("");
    wireParamInputs($("#v-preservation"));
    $("#s6aFields").dataset.built = "1";
  }

  const eco = ecosystemGate(P);
  $("#s6aKpis").innerHTML = [
    kpi("Turnovers available", fmtSci(eco.turnovers), ""),
    kpi("Needed", fmtSci(P.turnoversForEcosystem), ""),
    kpi("Ratio", fmtSci(eco.ratio), "x"),
  ].join("") + `<div style="flex-basis:100%;margin-top:8px">${verdictTag(eco.verdict, eco.verdictClass)}</div>`;

  const anyClass = MODEL.preservation.molecule_classes.find((m) => m.half_life_value != null);
  const g = anyClass ? preservationGate(anyClass, P) : null;
  $("#s6bKpis").innerHTML = [
    kpi("Burial", P.burialTempC, "C"),
    kpi("Rock age", fmtMyr(P.rockAgeMyr), "Myr"),
    kpi("Over the oil window", P.burialTempC > 150 ? "yes" : "no", ""),
    kpi("Over greenschist", P.burialTempC > 400 ? "yes" : "no", ""),
  ].join("") + (P.burialTempC > 400
    ? `<div style="flex-basis:100%;margin-top:8px"><div class="warn">Above about 400 C nothing molecular survives and carbon exchanges with its surroundings. Only isotopic and textural evidence is left, which is exactly the regime the Isua rocks sit in.</div></div>`
    : P.burialTempC > 150 ? `<div style="flex-basis:100%;margin-top:8px"><div class="warn">Above about 150 C the oil window closes, so hydrocarbon biomarkers are cracked whatever their half-life says.</div></div>` : "");
  void g;

  const rows = MODEL.preservation.molecule_classes.map((mc) => {
    const pg = preservationGate(mc, P);
    return {
      _key: mc.name, _sel: SEL.presClass === mc.name,
      cells: [
        `<strong>${esc(mc.name)}</strong>`,
        mc.half_life_value != null ? esc(halfLifeText(mc)) : '<span class="empty">not measured</span>',
        pg.tauMyr != null ? fmtMyr(pg.tauMyr) : "n.a.",
        pg.ratio != null ? fmtSci(pg.ratio) : "n.a.",
        verdictTag(pg.verdict, pg.verdictClass),
        tierTag(mc.tier || "B"),
      ],
    };
  });
  table($("#tblPreservation"),
    [{ label: "Class" }, { label: "Measured half-life" }, { label: "At your burial T, Myr", n: 1 },
     { label: "Against the rock age", n: 1 }, { label: "Verdict" }, { label: "Tier" }],
    rows, { clickable: true });
  $("#tblPreservation").querySelectorAll("tbody tr").forEach((tr) => {
    tr.onclick = () => { SEL.presClass = tr.dataset.key; renderPresDetail(); };
  });
  renderPresDetail();

  $("#whyRefractory").innerHTML = (pr.why_refractory || []).map((w, i) => `<div class="chain-step">
    <span class="rg">${i + 1}</span>
    <span class="sp" style="min-width:210px">${esc(w.point || "")}</span>
    <span class="wh">${esc(w.detail || "")}</span></div>`).join("");

  setFig("preservation", preservationSvg(MODEL, P, Math.min(760, figW(760))), "#figPreservation");
}

function halfLifeText(mc) {
  const u = mc.half_life_unit || "yr";
  const base = fmtSci(mc.half_life_value) + " " + u;
  return / at /.test(u) ? base : base + " at " + mc.half_life_temp_c + " C";
}

function renderPresDetail() {
  const mc = MODEL.preservation.molecule_classes.find((m) => m.name === SEL.presClass);
  if (!mc) { $("#presDetail").innerHTML = '<p class="empty">Select a class to read why it survives, or why it cannot.</p>'; return; }
  const pg = preservationGate(mc, P);
  $("#presDetail").innerHTML = `<div class="detail"><h4>${esc(mc.name)}</h4><dl>
    <dt>chemistry</dt><dd>${esc(mc.why || mc.chemistry || "")}</dd>
    <dt>measured</dt><dd>${mc.half_life_value != null ? esc(halfLifeText(mc)) : "no half-life has been measured for this class, so no curve is drawn for it"}</dd>
    <dt>at ${num(P.burialTempC + " C")}</dt><dd>${pg.tauMyr != null ? num(fmtMyr(pg.tauMyr) + " Myr") + ", which is " + num(fmtSci(pg.ratio)) + " times the age of the rock" : "not extrapolated"}</dd>
    <dt>verdict</dt><dd>${verdictTag(pg.verdict, pg.verdictClass)} ${esc(mc.verdict || "")}</dd>
    <dt>sources</dt><dd>${srcLinks(mc.source_urls)}</dd></dl></div>`;
}

/* ---------------- view 6, regimes ---------------- */

function renderRegimes(env) {
  setFig("regimes", regimeSvg(MODEL, env, figW(920)), "#figRegimes");

  table($("#tblRegimes"),
    [{ label: "Regime" }, { label: "Rungs" }, { label: "Unit selected" }, { label: "Conditions" },
     { label: "Duration, Myr", n: 1 }, { label: "Geometric mean", n: 1 }, { label: "Why that long" }, { label: "Expected legacy" }],
    MODEL.regimes.map((r) => ({
      cells: [`<strong>${esc(r.id)}. ${esc(r.name)}</strong>`, esc(r.rungs_covered), esc(r.unit_selected), esc(r.conditions),
        `${fmtMyr(r.duration_low_myr)} to ${fmtMyr(r.duration_high_myr)}`,
        fmtMyr(geomean(r.duration_low_myr, r.duration_high_myr)),
        esc(r.why_that_long), esc(r.expected_legacy || "")],
    })));

  table($("#tblVocab"),
    [{ label: "Level", n: 1 }, { label: "Name" }, { label: "What it is" }, { label: "Named examples" }, { label: "Rungs it can occupy" }, { label: "Note" }],
    MODEL.vocabulary.map((v) => ({
      cells: [String(v.level), `<strong>${esc(v.name)}</strong>`, esc(v.what_it_is || ""),
        esc(Array.isArray(v.named_examples) ? v.named_examples.join(", ") : v.named_examples || ""),
        esc(v.rungs_it_can_occupy || ""), esc(v.note || "")],
    })));

  table($("#tblRungs"),
    [{ label: "Rung" }, { label: "Name" }, { label: "From, to" }, { label: "Mechanism" }, { label: "Unit selected" }, { label: "What removes material" }, { label: "Filter or selection" }],
    MODEL.rungs.map((r) => ({
      cells: [`<strong>${esc(r.id)}</strong>`, esc(r.name),
        esc((r.from_reservoir || "") + " to " + (r.to_reservoir || "")), esc(r.mechanism || ""),
        esc(r.unit_selected || ""), esc(r.loss_process || ""),
        r.is_filter ? "filter, no inheritance" : "selection proper"],
    })));

  table($("#tblCycles"),
    [{ label: "Cycle" }, { label: "Period", n: 1 }, { label: "Rungs it serves" }, { label: "In use" }],
    MODEL.cycles.map((c) => ({
      cells: [`<strong>${esc(c.name)}</strong>`,
        `${fmtDuration(c.hadean_period_s_low)} to ${fmtDuration(c.hadean_period_s_high)}`,
        esc(c.rungs_served || "") + (c.note ? ". " + esc(c.note) : ""),
        c.name === P.cycleName ? '<span class="verdict v-pass">driving T3</span>' : `<button class="btn sm" data-cycle="${esc(c.name)}">use this</button>`],
    })));
  $("#tblCycles").querySelectorAll("button[data-cycle]").forEach((b) => {
    b.onclick = () => { P.cycleName = b.dataset.cycle; recompute(); toast("T3 is now driven by " + P.cycleName); };
  });

  table($("#tblEnergy"),
    [{ label: "Currency" }, { label: "Reaction" }, { label: "kJ per mol", n: 1 }, { label: "Note" }, { label: "Source" }],
    MODEL.free_energy.map((f) => ({
      cells: [`<strong>${esc(f.currency || "")}</strong>`, esc(f.reaction || ""),
        f.value_kj_per_mol == null ? "n.a." : fmtSci(f.value_kj_per_mol), esc(f.note || ""),
        safeUrl(f.source_url) ? `<a href="${esc(safeUrl(f.source_url))}" target="_blank" rel="noopener">open</a>` : '<span class="empty">none</span>'],
    })));

  $("#speedClasses").innerHTML = MODEL.speed_classes.map((s) => `<div class="chain-step">
    <span class="rg">${esc(s.id || "")}</span>
    <span class="sp">${esc(s.label || "")}</span>
    <span class="wh">${esc(s.description || "")}</span></div>`).join("");
  $("#tierDefs").innerHTML = MODEL.tiers.map((t) => `<div class="chain-step">
    <span class="rg">${esc(t.id || "")}</span>
    <span class="sp">${esc(t.label || "")}</span>
    <span class="wh">${esc(t.definition || "")}</span></div>`).join("");
}

/* ---------------- view 7, parameters ---------------- */

function buildParamsView() {
  const groups = [
    ["Temperature", ["startTempC", "chemTempC", "eaTransfer", "eaLoss"]],
    ["T1, the setting", ["t1Scale", "landUncertaintyFactor"]],
    ["T2, the chemistry", ["t2Scale"]],
    ["T3, the coincidence", ["siteScale", "successesNeeded"]],
    ["T4, the slow biology", ["generationTimeS", "popSize", "genFixFactor", "errorThresholdMyr"]],
    ["T5, LUCA's ecosystem", ["ecoSpecies", "ecoInteractions", "ecoDivRate", "ecoLinkRate", "ecoExtraMyr", "ecoDirectMyr"]],
    ["Mineral surfaces, S2 to S4", ["surfacePH", "surfaceLoading", "phosphateUM", "divalentMM", "bridgeK", "bridgeHalfMM", "protectionFactor", "damageK"]],
    ["The cycle as currency (joining step, H10 or H11)", ["yieldPerCycle", "lossPerCycle", "bondsNeeded"]],
    ["S6a, ecosystem", ["vesselLifetimeYr", "recycleTimeYr", "turnoversForEcosystem"]],
    ["S6b, the rock record", ["burialTempC", "rockAgeMyr", "eaDegradation"]],
  ];
  $("#paramPanels").innerHTML = groups.map(([g, keys]) => `<div class="card" style="margin:0 0 14px">
    <h3 style="margin-top:0">${esc(g)}</h3>
    ${g.startsWith("The cycle as currency") ? `<div class="field"><label><span class="flabel">Role of the cycle</span></label><div class="seg" id="wbCurRoleSeg"><button data-v="clock" aria-pressed="${P.cycleRole !== "currency"}">Clock only</button><button data-v="currency" aria-pressed="${P.cycleRole === "currency"}">Clock and currency</button></div><div class="hint">As a clock the cycle only sets how often a place gets a try. As a currency a drying cycle also pays for the joining step: a yield y per cycle against a loss d per cycle. Explained on guided page 3.</div></div>` : ""}
    <div class="grid g-2">${keys.map(sliderFor).join("")}</div></div>`).join("");
  wireParamInputs($("#paramPanels"));
  $$("#wbCurRoleSeg button").forEach((b) => { b.onclick = () => { P.cycleRole = b.dataset.v; recompute(); }; });
  $("#resetParams").onclick = () => {
    const keep = { allowUnreasonable: P.allowUnreasonable };
    P = Object.assign(defaultParams(), keep);
    rebuildAllControls();
    recompute();
    toast("Every parameter is back to its default");
  };

  table($("#tblGaps"), [{ label: "Id" }, { label: "What is missing" }, { label: "Why it matters" }, { label: "What would settle it" }, { label: "Linked prediction" }],
    MODEL.measurement_gaps.map((g) => ({
      cells: [`<span class="num">${esc(g.id || "")}</span>`, `<strong>${esc(g.gap || "")}</strong>`,
        esc(g.why_it_matters || ""), esc(g.what_would_settle_it || ""), esc(g.linked_prediction || "")],
    })));

  table($("#tblPredictions"), [{ label: "No.", n: 1 }, { label: "Prediction" }, { label: "What it expects" }, { label: "What would break it" }, { label: "Section" }],
    MODEL.predictions.map((p) => ({
      cells: [String(p.number || ""), `<strong>${esc(p.title || "")}</strong>`,
        esc(p.expectation || ""), esc(p.broken_by || ""), esc(p.section || "")],
    })));

  renderAnchors();
  buildRefs();
  const am = MODEL.audit_method || {};
  $("#methodText").innerHTML = (am.terms || []).map((t) => `<div class="detail" style="margin-bottom:10px">
      <h4>${esc(t.id)}. ${esc(t.name)}</h4>
      <dl><dt>measures</dt><dd>${esc(t.what_it_measures || "")}</dd>
      <dt>estimated by</dt><dd>${esc(t.how_estimated || "")}</dd>
      <dt>confidence</dt><dd>${esc(t.tier || "")}</dd></dl></div>`).join("")
    + ["budget_note", "trials_note", "remaining_note", "caveat"].filter((k) => am[k]).map((k) => `<div class="note" style="margin-top:10px"><strong>${esc(k.replace(/_/g, " "))}.</strong> ${esc(am[k])}</div>`).join("");

  table($("#tblSchema"), [{ label: "Array" }, { label: "Required keys" }],
    [
      { cells: ["<code>elements</code>", "<code>symbol, name, rungs {S0..S6}, s6_why, source_urls</code>"] },
      { cells: ["<code>handoffs</code>", "<code>id, species_and_handoff, tau_transfer_low_s, tau_transfer_high_s, tau_loss_low_s, tau_loss_high_s, tier, speed_class, why_this_value, source_urls</code>"] },
      { cells: ["<code>minerals</code>", "<code>id, name, group, pzc, ssa_m2_g, gmax_umol_m2, k7_l_umol, ph_slope, f_locked, hadean, tier, why, source_urls</code>"] },
      { cells: ["<code>references</code>", "<code>id, citation, url, used_in, tier, note</code>"] },
      { cells: ["<code>scenarios</code>", "<code>id, name, t1_low, t1_high, n_parallel_sites_low, n_parallel_sites_high, requires_subaerial_land, reasoning</code>"] },
      { cells: ["<code>preservation.molecule_classes</code>", "<code>name, half_life_value, half_life_unit, half_life_temp_c, verdict, why, source_urls</code>"] },
    ]);
}

function renderAnchors() {
  const rows = P.coolingAnchors.map((a, i) => ({
    cells: [
      `<input type="number" data-anchor="${i}" data-f="age" value="${a.age}" step="0.01" min="3.6" max="4.6" style="width:92px">`,
      `<input type="number" data-anchor="${i}" data-f="t" value="${Math.round(a.t)}" step="5" min="0" max="2500" style="width:92px">`,
      esc(anchorNote(a.age)),
    ],
  }));
  table($("#tblAnchors"), [{ label: "Age, Ga" }, { label: "Surface T, C" }, { label: "What it stands for" }], rows);
  $("#tblAnchors").querySelectorAll("input[data-anchor]").forEach((el) => {
    el.onchange = () => {
      const i = +el.dataset.anchor, v = parseFloat(el.value);
      if (Number.isFinite(v)) { P.coolingAnchors[i][el.dataset.f] = v; recompute(); }
    };
  });
}
function anchorNote(age) {
  if (age >= 4.5) return "Magma ocean. No liquid water surface at all.";
  if (age >= 4.45) return "Steam atmosphere collapsing.";
  if (age >= 4.4) return "First liquid water plausible.";
  if (age >= 4.35) return "Hot but survivable for surface chemistry.";
  if (age >= 4.3) return "Warm ocean. Most handoffs are quick here.";
  if (age >= 4.2) return "Cooling further. Loss slows faster than transfer.";
  return "Close to a modern warm ocean.";
}

function buildRefs() {
  const uses = [...new Set(MODEL.references.flatMap((r) => String(r.used_in || "unclassified").split(",").map((u) => u.trim()).filter(Boolean)))]
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  $("#refFilter").innerHTML = '<option value="all">everything</option>' + uses.map((u) => `<option value="${esc(u)}">${esc(u)}</option>`).join("");
  $("#refCount").textContent = MODEL.references.length;
  $("#refFilter").onchange = (e) => { SEL.refFilter = e.target.value; renderRefs(); };
  $("#refSearch").oninput = (e) => { SEL.refSearch = e.target.value.toLowerCase(); renderRefs(); };
  renderRefs();
}
function renderRefs() {
  const rows = MODEL.references.filter((r) => {
    if (SEL.refFilter !== "all") {
      const tags = String(r.used_in || "unclassified").split(",").map((u) => u.trim());
      if (!tags.includes(SEL.refFilter)) return false;
    }
    if (!SEL.refSearch) return true;
    return JSON.stringify(r).toLowerCase().includes(SEL.refSearch);
  }).map((r) => ({
    cells: [
      `<span class="num">${esc(r.id || "")}</span>`,
      esc(r.citation || r.title || ""),
      esc(r.used_in || ""),
      r.tier ? tierTag(r.tier) : "",
      esc(r.note || ""),
      safeUrl(r.url) ? `<a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener">open</a>` : '<span class="empty">no URL</span>',
    ],
  }));
  table($("#tblRefs"), [{ label: "Id" }, { label: "Source" }, { label: "Used in" }, { label: "Tier" }, { label: "Note" }, { label: "Link" }], rows);
  $("#refCount").textContent = rows.length + " of " + MODEL.references.length;
}

/* ---------------- view 8, export ---------------- */

const FIG_LABELS = {
  start: "Figure S1, start of the clock",
  felsic: "Figure V1, felsic share of the crust", timeline: "Figure V2, environmental timeline", zoom: "Figure V3, physical conditions",
  envelope: "Figure E1, the envelope", cooling: "Figure E2, cooling curve",
  audit: "Figure A1, time-budget audit", damkohler: "Figure H1, the diagonal",
  ladder: "Figure L1, the ladder", matrix: "Figure L2, element matrix",
  regimes: "Figure R1, four regimes", preservation: "Figure P1, survival against burial temperature",
  surfaceph: "Figure M1, phosphate held against pH", surfacegain: "Figure M2, holding helps until it hinders",
  timeLeft: "Figure T1, time left and tries that fit", ecoNet: "Figure T2, LUCA's community", ecoCurve: "Figure T3, cost of complexity",
  zoomruler: "Figure Z1, one ruler for all terms", zoomrace: "Figure Z2, the race on each rung", zoomfunnel: "Figure Z3, the filter", zoomt3: "Figure Z4, T3 against joint p",
};

function buildExportView() {
  $("#exportFigs").innerHTML = Object.entries(FIG_LABELS).map(([k, l]) =>
    `<span style="display:inline-flex;gap:4px;align-items:center;margin:0 10px 8px 0">
      <span style="font-size:12px;color:var(--muted)">${esc(l)}</span>
      <button class="btn sm" data-exp="${k}" data-fmt="svg">SVG</button>
      <button class="btn sm" data-exp="${k}" data-fmt="png">PNG</button></span>`).join("");
  $("#exportFigs").querySelectorAll("button[data-exp]").forEach((b) => {
    b.onclick = () => exportFig(b.dataset.exp, b.dataset.fmt);
  });
  $$(".fig-tools").forEach((tools) => {
    const name = tools.dataset.fig;
    tools.querySelectorAll("button[data-dl]").forEach((b) => { b.onclick = () => exportFig(name, b.dataset.dl); });
  });

  $("#expAuditCsv").onclick = $("#dlAuditCsv").onclick = () => downloadText(auditCsv(), "pass-or-perish-audit.csv", "text/csv");
  $("#expHandoffCsv").onclick = () => downloadText(handoffCsv(), "pass-or-perish-handoffs.csv", "text/csv");
  $("#expMatrixCsv").onclick = () => downloadText(matrixCsv(), "pass-or-perish-element-matrix.csv", "text/csv");
  $("#expPresCsv").onclick = () => downloadText(presCsv(), "pass-or-perish-preservation.csv", "text/csv");
  const zBtn = $("#expZoomCsv");
  if (zBtn) zBtn.onclick = () => downloadText(zoomCsv(), "pass-or-perish-t2-t3.csv", "text/csv");
  const scBtn = $("#expSurfCsv");
  if (scBtn) scBtn.onclick = () => downloadText(surfaceCsv(), "pass-or-perish-mineral-surfaces.csv", "text/csv");
  $("#expState").onclick = () => {
    const state = { kind: "pass-or-perish-state", saved: new Date().toISOString(), parameters: stripState(P) };
    downloadText(JSON.stringify(state, null, 2), "pass-or-perish-state.json", "application/json");
  };
  $("#expModel").onclick = () => downloadText(JSON.stringify(MODEL, null, 2), "pass-or-perish-model.json", "application/json");
  $("#expReport").onclick = () => downloadText(runReport(), "pass-or-perish-run.md", "text/markdown");
  $("#importFile").onchange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) importJson(f);
  };
}

function exportFig(name, fmt) {
  const svg = FIGS[name];
  if (!svg) { toast("Open that page once so the figure is drawn, then export it"); return; }
  const base = "pass-or-perish-" + name;
  if (fmt === "svg") { downloadSvg(svg, base + ".svg"); toast("Exported " + base + ".svg"); }
  else downloadPng(svg, base + ".png").then((ok) => toast(ok ? "Exported " + base + ".png" : "PNG was blocked here, so an SVG was saved instead"));
}

const csvCell = (v) => {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\n");

function auditCsv() {
  const env = computeEnvelope(P);
  P.effectiveTempC = env.workingTempC;
  const res = MODEL.scenarios.map((sc) => auditScenario(sc, P, MODEL));
  return csv([
    ["Pass or perish, time-budget audit"],
    ["exported", new Date().toISOString()],
    ["near end Ga", env.nearGa, "far end Ga", env.farGa, "budget Myr", env.budgetMyr, "chemistry T C", env.workingTempC],
    [],
    ["ecosystem", "X species", P.ecoSpecies, "Y interactions", P.ecoInteractions, "split rate per Myr", P.ecoDivRate, "link rate per pair per Myr", P.ecoLinkRate, "mode", P.ecoOn === false ? "off" : P.ecoMode, "overlap", P.ecoOverlap !== false, "restart waits for T1", !!P.restartNeedsT1],
    [],
    ["scenario", "T1 Myr", "T2 Myr", "T3 Myr", "T4 Myr", "T5 Myr", "total Myr", "dominant", "time left Myr", "one try Myr", "tries that fit", "tries that stopped", "chance it fits", "joint p", "sites", "cycle s", "manuscript low", "manuscript high", "verdict"],
    ...res.map((r) => { const tl = timeLeft(r, env.budgetMyr, P); return [r.scenario.name, r.t1, r.t2, r.t3, r.t4, r.t5, r.total, r.dominant, tl.remaining, tl.run, tl.tries, tl.stopped, tl.pFit, r.pJoint, r.nSites, r.tCycleS, r.workbookLow, r.workbookHigh, verdictAgainstBudget(r.total, env.budgetMyr).text]; }),
  ]);
}
function handoffCsv() {
  return csv([
    ["Handoffs at " + Math.round(P.effectiveTempC) + " C, Ea transfer " + P.eaTransfer + ", Ea loss " + P.eaLoss + " kJ per mol"],
    [],
    ["id", "species and handoff", "category", "tau transfer s", "tau loss s", "Da", "p", "verdict", "tier", "speed class", "why this value", "sources"],
    ...MODEL.handoffs.map((h) => {
      const st = handoffState(h, P.effectiveTempC, P.eaTransfer, P.eaLoss);
      return [h.id, h.species_and_handoff, h.marker_category, st.tauTransfer, st.tauLoss, st.da, st.p, st.verdict, h.tier, h.speed_class, h.why_this_value, (h.source_urls || []).join(" ")];
    }),
  ]);
}
function matrixCsv() {
  const ids = ["S0", "S1", "S2", "S3", "S4", "S5", "S6"];
  return csv([["symbol", "name", ...ids, "s6 why", "sources"],
    ...MODEL.elements.map((e) => [e.symbol, e.name, ...ids.map((r) => e.rungs[r] || ""), e.s6_why || "", (e.s6_source_urls || []).join(" ")])]);
}
function presCsv() {
  return csv([
    ["Preservation at burial " + P.burialTempC + " C, rock age " + P.rockAgeMyr + " Myr, Ea " + P.eaDegradation + " kJ per mol"],
    [],
    ["class", "half-life", "unit", "at C", "tau at burial Myr", "ratio to rock age", "verdict", "why", "sources"],
    ...MODEL.preservation.molecule_classes.map((mc) => {
      const g = preservationGate(mc, P);
      return [mc.name, mc.half_life_value, mc.half_life_unit, mc.half_life_temp_c, g.tauMyr, g.ratio, g.verdict, mc.why || "", (mc.source_urls || []).join(" ")];
    }),
  ]);
}

function zoomCsv() {
  const env = computeEnvelope(P);
  P.effectiveTempC = env.workingTempC;
  const res = MODEL.scenarios.map((sc) => auditScenario(sc, P, MODEL));
  const budS = env.budgetMyr * secPerYr * 1e6;
  const out = [["T2 and T3 in seconds"], ["successes needed", P.successesNeeded, "budget Myr", env.budgetMyr, "temperature C", env.workingTempC], [],
    ["scenario", "sites", "cycle", "cycle s", "joint p", "T2 s", "T3 s", "T2 readable", "T3 readable", "p at T3 = budget", "room, powers of ten"]];
  for (const r of res) {
    const k = P.successesNeeded * r.tCycleS / r.nSites;
    out.push([r.scenario.name, r.nSites, r.cycleName, r.tCycleS, r.pJoint, r.t2 * secPerYr * 1e6, r.t3 * secPerYr * 1e6,
      humanTime(r.t2 * secPerYr * 1e6), humanTime(r.t3 * secPerYr * 1e6), budS > 0 ? k / budS : "", budS > 0 ? Math.log10(r.pJoint * budS / k) : ""]);
  }
  out.push([], ["scenario", "rung", "handoff", "transfer s", "loss s", "Da", "p"]);
  for (const r of res) for (const g of r.rungs) if (g.handoff) out.push([r.scenario.name, g.rung, g.handoff.id, g.tauTransfer, g.tauLoss, g.da, g.p]);
  return csv(out);
}

function surfaceCsv() {
  const env = computeEnvelope(P);
  P.effectiveTempC = env.workingTempC;
  const res = MODEL.scenarios.map((sc) => auditScenario(sc, P, MODEL));
  const bare = MODEL.scenarios.map((sc) => auditScenario(sc, { ...P, surfaceMode: "off" }, MODEL));
  return csv([
    ["Mineral surfaces, phosphate as the model adsorbate"],
    ["mode", P.surfaceMode, "phosphate uM", P.phosphateUM, "Mg plus Ca mM", P.divalentMM, "protection factor", P.protectionFactor, "damage K", P.damageK, "bridge K", P.bridgeK, "bridge half mM", P.bridgeHalfMM],
    ["rungs", SURFACE_RUNGS.filter((r) => P.surfaceRungs[r]).join(" ")],
    [],
    ["scenario", "mineral", "pH", "g per L", "K L per umol", "fraction held", "surface coverage", "S2 loss x", "S3 faster x", "S4 faster x", "joint p bare", "joint p surface", "total bare Myr", "total surface Myr"],
    ...res.map((r, i) => {
      const ss = r.surfaceState;
      return [r.scenario.name, ss ? ss.mineral.name : "off", ss ? ss.pH : "", ss ? ss.loading : "", ss ? ss.K : 0, ss ? ss.fBound : 0, ss ? ss.theta : 0,
        ss ? ss.lossGain : 1, ss ? ss.cf : 1, ss ? ss.s4Gain : 1, bare[i].pJoint, r.pJoint, bare[i].total, r.total];
    }),
    [],
    ["mineral", "group", "pzc", "ssa m2 per g", "gmax umol per m2", "K at pH 7", "pH slope", "locked fraction", "tier", "why", "sources"],
    ...MODEL.minerals.filter((m) => m.id !== "none").map((m) => [m.name, m.group, m.pzc, m.ssa_m2_g, m.gmax_umol_m2, m.k7_l_umol, m.ph_slope, m.f_locked, m.tier, m.why, (m.source_urls || []).join(" ")]),
  ]);
}

function stripState(p) {
  const out = {};
  for (const k of Object.keys(p)) {
    if (k === "nearOptions" || k === "farOptions") continue;
    out[k] = p[k];
  }
  return out;
}

function runReport() {
  const env = computeEnvelope(P);
  P.effectiveTempC = env.workingTempC;
  const res = MODEL.scenarios.map((sc) => auditScenario(sc, P, MODEL));
  const eco = ecosystemGate(P);
  const L = [];
  L.push("# Pass or perish: one run of the rate-gate model", "");
  L.push("Exported " + new Date().toISOString() + ".", "");
  L.push("## The envelope", "");
  L.push("Near end: " + env.nearLabel + ", " + env.nearGa.toFixed(3) + " Ga. " + env.nearBasis);
  L.push("Far end: " + env.farLabel + ", " + env.farGa.toFixed(3) + " Ga. " + env.farBasis);
  L.push("Budget: " + fmtMyr(env.budgetMyr) + " Myr. Chemistry temperature: " + Math.round(env.workingTempC) + " C.", "");
  L.push("## Audit", "");
  const t5d = computeT5(P);
  L.push("Ecosystem (T5): " + (t5d.on ? (t5d.direct ? "set directly to " + fmtMyr(t5d.totalMyr) + " Myr." : t5d.X + " kinds of organisms, " + t5d.Y + " interactions out of " + t5d.pairs + " possible pairs. Splitting " + fmtMyr(t5d.tDiv) + " Myr, linking " + fmtMyr(t5d.tInt) + " Myr, " + (t5d.overlap ? "at the same time" : "one after the other") + ", total " + fmtMyr(t5d.totalMyr) + " Myr.") : "switched off.") + " A restart " + (P.restartNeedsT1 ? "has to wait for the setting again." : "can reuse the setting."), "");
  L.push("| Scenario | T1 | T2 | T3 | T4 | T5 | Total Myr | Time left Myr | Tries that stopped | Chance it fits | Verdict |");
  L.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const r of res) {
    const tl = timeLeft(r, env.budgetMyr, P);
    L.push("| " + [r.scenario.name, fmtMyr(r.t1), fmtMyr(r.t2), fmtMyr(r.t3), fmtMyr(r.t4), fmtMyr(r.t5), fmtMyr(r.total), tl.remaining > 0 ? fmtMyr(tl.remaining) : "none", tl.stopped.toLocaleString("en-GB"), pctText(tl.pFit), verdictAgainstBudget(r.total, env.budgetMyr).text].join(" | ") + " |");
  }
  L.push("", "## Mineral surfaces, S2 to S4", "");
  L.push("Mode: " + P.surfaceMode + ". Rungs: " + SURFACE_RUNGS.filter((r) => P.surfaceRungs[r]).join(", ") + ". Phosphate " + P.phosphateUM + " uM, Mg2+ plus Ca2+ " + P.divalentMM + " mM, protection factor " + P.protectionFactor + ".");
  for (const r of res) {
    const ss = r.surfaceState;
    if (!ss) { L.push("- " + r.scenario.name + ": surfaces off."); continue; }
    L.push("- " + r.scenario.name + ": " + ss.mineral.name + " at pH " + ss.pH + ", " + ss.loading + " g per L, holds " + (ss.fBound * 100).toFixed(1) + " per cent. S2 loss x " + fmtSci(ss.lossGain) + ", S3 faster x " + fmtSci(ss.cf) + ", S4 faster x " + fmtSci(ss.s4Gain) + ". Joint p " + fmtSci(r.pJoint) + ".");
  }
  L.push("", "## Which passages are quick at this temperature", "");
  const fast = MODEL.handoffs.map((h) => ({ h, st: handoffState(h, P.effectiveTempC, P.eaTransfer, P.eaLoss) })).sort((a, b) => a.st.tauTransfer - b.st.tauTransfer).slice(0, 6);
  for (const { h, st } of fast) L.push("- " + h.id + ", " + h.species_and_handoff + ": transfer " + fmtDuration(st.tauTransfer) + ", loss " + fmtDuration(st.tauLoss) + ", " + st.verdict + ".");
  L.push("", "## S6, preservation", "");
  L.push("S6a: " + fmtSci(eco.turnovers) + " turnovers available against " + fmtSci(P.turnoversForEcosystem) + " needed, so " + eco.verdict + ".");
  L.push("S6b at " + P.burialTempC + " C for a rock " + fmtMyr(P.rockAgeMyr) + " Myr old:");
  for (const mc of MODEL.preservation.molecule_classes) {
    const g = preservationGate(mc, P);
    L.push("- " + mc.name + ": " + g.verdict + (g.tauMyr != null ? ", survival " + fmtMyr(g.tauMyr) + " Myr" : ", no measured half-life") + ".");
  }
  L.push("", "## Parameters used", "");
  for (const [k, s] of Object.entries(SPEC)) {
    L.push("- " + s.label + ": " + P[k] + (s.unit ? " " + s.unit : "") + " (Tier " + s.tier + (isUnreasonable(k, P[k]) ? ", outside the plausible range" : "") + ")");
  }
  return L.join("\n");
}

function importJson(file) {
  const rd = new FileReader();
  rd.onload = () => {
    let obj;
    try { obj = JSON.parse(rd.result); }
    catch (e) { $("#importReport").innerHTML = `<div class="warn">That file is not valid JSON, so nothing was changed. ${esc(e.message)}</div>`; return; }
    const notes = [];
    if (obj.parameters) {
      Object.assign(P, obj.parameters);
      P.nearOptions = P.nearOptions || defaultParams().nearOptions;
      P.farOptions = P.farOptions || defaultParams().farOptions;
      notes.push("Loaded a saved run and applied every parameter in it.");
      rebuildAllControls();
    }
    for (const key of ["minerals", "elements", "handoffs", "references", "scenarios", "cycles", "regimes", "vocabulary", "rungs", "couplings", "chains", "free_energy", "predictions", "measurement_gaps"]) {
      if (!Array.isArray(obj[key])) continue;
      const idOf = (x) => x.id || x.symbol || x.name;
      const existing = new Set(MODEL[key].map(idOf));
      let added = 0, replaced = 0;
      for (const item of obj[key]) {
        const id = idOf(item);
        if (existing.has(id)) { MODEL[key] = MODEL[key].map((x) => (idOf(x) === id ? item : x)); replaced++; }
        else { MODEL[key].push(item); added++; }
      }
      notes.push(key + ": " + added + " added, " + replaced + " replaced. Now " + MODEL[key].length + " entries.");
    }
    if (obj.preservation && Array.isArray(obj.preservation.molecule_classes)) {
      const ex = new Set(MODEL.preservation.molecule_classes.map((m) => m.name));
      let a = 0, rp = 0;
      for (const m of obj.preservation.molecule_classes) {
        if (ex.has(m.name)) { MODEL.preservation.molecule_classes = MODEL.preservation.molecule_classes.map((x) => (x.name === m.name ? m : x)); rp++; }
        else { MODEL.preservation.molecule_classes.push(m); a++; }
      }
      notes.push("preservation classes: " + a + " added, " + rp + " replaced.");
    }
    if (!notes.length) {
      $("#importReport").innerHTML = `<div class="warn">Nothing in that file matched a key the model knows. Export the full model data to see the shape it expects.</div>`;
      return;
    }
    buildParamsView();
    recompute();
    $("#importReport").innerHTML = `<div class="note"><strong>Loaded.</strong><ul>${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
      Nothing here is saved anywhere. Export the full model data to keep the merged version.</div>`;
    toast("File loaded");
  };
  rd.readAsText(file);
}

/* ---------------- orchestration ---------------- */

function rebuildAllControls() {
  $("#nearEvent").value = P.nearEventId;
  $("#farEvent").value = P.farEventId;
  $("#nearManual").value = P.nearManualGa;
  $("#farManual").value = P.farManualGa;
  segSet("#nearModeSeg", P.nearMode);
  segSet("#farModeSeg", P.farMode);
  segSet("#tempModeSeg", P.tempMode);
  segSet("#rangeSeg", P.allowUnreasonable ? "wide" : "plausible");
  segSet("#surfModeSeg", P.surfaceMode);
  P.surfaceRungs = P.surfaceRungs || { S2: true, S3: true, S4: true };
  P.scenarioSurface = P.scenarioSurface || {};
  syncParamInputs();
  renderAnchors();
}
function segSet(sel, v) {
  const root = $(sel);
  if (root) root.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
}

function recompute() {
  const env = computeEnvelope(P);
  P.effectiveTempC = env.workingTempC;
  const results = MODEL.scenarios.map((sc) => auditScenario(sc, P, MODEL));
  if (SEL.scenario >= results.length) SEL.scenario = 0;

  $("#chipBudget").textContent = env.valid ? fmtMyr(env.budgetMyr) : "none";
  $("#chipTemp").textContent = Math.round(env.workingTempC);

  syncParamInputs();
  segSet("#wbCurRoleSeg", P.cycleRole === "currency" ? "currency" : "clock");
  renderEnvelope(env);
  renderAudit(env, results);
  renderHandoffs();
  renderSurfaces(env, results);
  renderZoom(env, results);
  renderLadder(results[SEL.scenario]);
  renderPreservation();
  renderRegimes(env);
  buildExportView();
  LAST_ENV = env;
  GUIDED.render(env, results);
  SUPPLY.render(env, results);
  V8.render(env, results);
}

let LAST_ENV = null;
const GUIDED = createGuided({
  P: () => P, MODEL: () => MODEL, recompute: () => recompute(), rebuild: () => rebuildAllControls(),
  sliderFor: (k) => sliderFor(k), wireParamInputs: (r) => wireParamInputs(r), toast: (m) => toast(m),
  setFig: (n, s, sel) => setFig(n, s, sel), figW: (w) => figW(w), table: (el, h, r, o) => table(el, h, r, o),
  lastEnv: () => LAST_ENV, showView: (v) => showView(v),
});

const SUPPLY = createSupply({
  P: () => P, MODEL: () => MODEL, recompute: () => recompute(), rebuild: () => rebuildAllControls(),
  sliderFor: (k) => sliderFor(k), wireParamInputs: (r) => wireParamInputs(r), toast: (m) => toast(m),
  setFig: (n, s, sel) => setFig(n, s, sel), figW: (w) => figW(w), table: (el, h, r, o) => table(el, h, r, o),
  showView: (v) => showView(v),
});

const V8 = createV8({
  P: () => P, MODEL: () => MODEL, recompute: () => recompute(), rebuild: () => rebuildAllControls(),
  sliderFor: (k) => sliderFor(k), wireParamInputs: (r) => wireParamInputs(r), toast: (m) => toast(m),
  setFig: (n, s, sel) => setFig(n, s, sel), figW: (w) => figW(w), table: (el, h, r, o) => table(el, h, r, o),
  showView: (v) => showView(v),
});

function showView(view) {
  $$("nav.tabs button").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.view === view)));
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === "v-" + view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function setMode(mode) {
  P.uiMode = mode;
  const guided = mode !== "workbench";
  $("#tabsGuided").hidden = !guided;
  $("#tabs").hidden = guided;
  segSet("#modeSeg", guided ? "guided" : "workbench");
  const nav = guided ? "#tabsGuided" : "#tabs";
  const cur = $$(".view").find((v) => v.classList.contains("active"));
  const curView = cur ? cur.id.slice(2) : null;
  const inNav = $$(nav + " button").some((b) => b.dataset.view === curView);
  showView(inNav ? curView : $(nav + " button").dataset.view);
}
function wireTabs() {
  $$("nav.tabs button").forEach((b) => { b.onclick = () => showView(b.dataset.view); });
  $$("#modeSeg button").forEach((b) => { b.onclick = () => setMode(b.dataset.v); });
}

async function boot() {
  const res = await fetch("data/model.json");
  MODEL = await res.json();
  SEL.handoff = MODEL.handoffs[0].id;
  SEL.element = "Fe";
  SEL.presClass = MODEL.preservation.molecule_classes[0].name;
  P.cycleName = MODEL.cycles.find((c) => c.name === P.cycleName) ? P.cycleName : MODEL.cycles[0].name;

  wireTabs();
  buildEnvelopeStatics();
  buildSurfaceStatics();
  buildZoomStatics();
  buildParamsView();
  GUIDED.build();
  SUPPLY.build();
  V8.build();
  $("#goSupply").onclick = () => showView("supply");
  recompute();
  setMode(new URLSearchParams(location.search).get("mode") === "workbench" ? "workbench" : "guided");

  $("#footNote").innerHTML = `Companion model to the manuscript <em>Pass or perish: rate-gated selective regimes on the Hadean Earth</em>.
    ${MODEL.references.length} sources are listed on the parameters page, each with its link.
    Nothing on this page is stored: use the export buttons to keep a run. Prepared by the Geobiology section at GLOBE.`;
  window.addEventListener("resize", () => { clearTimeout(boot._r); boot._r = setTimeout(recompute, 250); });
  window.__model = { get P() { return P; }, get MODEL() { return MODEL; }, recompute, FIGS };
}

boot().catch((e) => {
  document.body.insertAdjacentHTML("afterbegin", `<div class="warn" style="margin:20px">The model data could not be loaded. ${esc(e.message)}</div>`);
  console.error(e);
});

void tempAtAge; void arrhenius; void computeT4;
