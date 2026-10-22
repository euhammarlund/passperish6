// All figures are drawn as SVG so that export is vector by default and the
// exported file matches what is on screen exactly.

import { fmtMyr, fmtSci, geomean, handoffState, arrhenius, tempAtAge, R_GAS, surfaceState } from "./engine.js";

const C = {
  teal: "#20808d", terra: "#a84b2f", darkTeal: "#1b474d", cyan: "#bce2e7",
  mauve: "#944454", gold: "#ffc553", olive: "#848456", brown: "#6e522b",
  text: "#28251d", muted: "#6e6b63", faint: "#a8a49b", border: "#d9d5cc",
  light: "#f7f6f2", surface: "#fdfdfb", fail: "#a13544",
};
export const PALETTE = C;
const FONT = "Switzer, system-ui, sans-serif";
const MONO = "JetBrains Mono, ui-monospace, monospace";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svgOpen(w, h, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}" font-family="${FONT}">
<rect width="${w}" height="${h}" fill="${C.surface}"/>`;
}
const txt = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" fill="${o.fill || C.text}" font-size="${o.size || 12}" font-weight="${o.weight || 400}"` +
  ` text-anchor="${o.anchor || "start"}"${o.mono ? ` font-family="${MONO}"` : ""}` +
  `${o.rotate ? ` transform="rotate(${o.rotate} ${x} ${y})"` : ""}` +
  `${o.opacity ? ` opacity="${o.opacity}"` : ""}>${esc(s)}</text>`;

/* ============ 1. Envelope ============ */

export function envelopeSvg(env, model, params, w = 900) {
  const evs = model.envelope_events;
  const h = 168 + evs.length * 30;
  const m = { l: 215, r: 34, t: 78, b: 62 };
  const oldest = 4.60, youngest = 3.60;
  const x = (ga) => m.l + ((oldest - ga) / (oldest - youngest)) * (w - m.l - m.r);
  let s = svgOpen(w, h, "The envelope and its two ends");

  s += txt(m.l - 200, 24, "The envelope and its two ends", { size: 14, weight: 600 });
  s += txt(m.l - 200, 41, "Bands are reported ranges, not confidence intervals. Time runs older to younger, left to right. A triangle means the band continues past the axis.", { size: 10.5, fill: C.muted });

  // the chosen budget, drawn as a shaded band behind everything
  if (env.valid) {
    s += `<rect x="${x(env.nearGa)}" y="${m.t - 12}" width="${x(env.farGa) - x(env.nearGa)}" height="${h - m.t - m.b + 22}" fill="${C.cyan}" opacity="0.45"/>`;
    s += `<line x1="${x(env.nearGa)}" y1="${m.t - 12}" x2="${x(env.nearGa)}" y2="${h - m.b + 10}" stroke="${C.darkTeal}" stroke-width="1.6"/>`;
    s += `<line x1="${x(env.farGa)}" y1="${m.t - 12}" x2="${x(env.farGa)}" y2="${h - m.b + 10}" stroke="${C.darkTeal}" stroke-width="1.6"/>`;
  } else {
    s += txt(w / 2, m.t + 20, "The near end is younger than the far end, so there is no budget.", { size: 12, weight: 600, fill: C.fail, anchor: "middle" });
  }

  // grid
  for (let g = 4.6; g >= 3.6 - 1e-9; g -= 0.1) {
    const gx = x(g);
    s += `<line x1="${gx}" y1="${m.t - 12}" x2="${gx}" y2="${h - m.b + 6}" stroke="${C.border}" stroke-width="0.6" opacity="0.8"/>`;
    s += txt(gx, h - m.b + 22, g.toFixed(1), { size: 10, anchor: "middle", fill: C.muted, mono: true });
  }
  s += txt((m.l + w - m.r) / 2, h - m.b + 42, "Age, Ga", { size: 11, anchor: "middle", fill: C.muted, weight: 600 });

  const colour = { planetary: C.darkTeal, biological: C.teal, contested: C.mauve, derived: C.terra };
  evs.forEach((e, i) => {
    const y = m.t + 10 + i * 30;
    const xL = m.l, xR = w - m.r;
    const clampX = (v) => Math.max(xL, Math.min(xR, v));
    const rawOld = x(e.age_old_ga), rawYoung = x(e.age_young_ga);
    const x1 = clampX(rawOld), x2 = clampX(rawYoung);
    const runsOff = rawYoung > xR + 1 || rawOld < xL - 1;
    const col = colour[e.type] || C.muted;
    s += txt(m.l - 10, y + 4, e.label, { size: 11, anchor: "end", weight: e.type === "derived" ? 600 : 400 });
    if (e.drawn_as === "band") {
      s += `<rect x="${Math.min(x1, x2)}" y="${y - 6}" width="${Math.max(3, Math.abs(x2 - x1))}" height="12" rx="2" fill="${col}" opacity="${e.type === "contested" ? 0.35 : 0.7}" stroke="${col}" stroke-width="${e.type === "contested" ? 1.2 : 0}" stroke-dasharray="${e.type === "contested" ? "3 2" : ""}"/>`;
    } else if (e.drawn_as === "arrow") {
      s += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${col}" stroke-width="1.8" stroke-dasharray="5 3"/>`;
      s += `<polygon points="${x2},${y} ${x2 - 7},${y - 4} ${x2 - 7},${y + 4}" fill="${col}"/>`;
      s += `<polygon points="${x1},${y} ${x1 + 7},${y - 4} ${x1 + 7},${y + 4}" fill="${col}"/>`;
      const mid = (x1 + x2) / 2;
      s += txt(mid, y - 8, fmtMyr((e.age_old_ga - e.age_young_ga) * 1000) + " Myr", { size: 9.5, anchor: "middle", fill: col, weight: 600, mono: true });
    } else {
      s += `<circle cx="${x1}" cy="${y}" r="5" fill="${e.type === "contested" ? C.surface : col}" stroke="${col}" stroke-width="1.8"/>`;
    }
    if (runsOff && e.drawn_as === "band") {
      if (rawYoung > xR + 1) s += `<polygon points="${xR + 3},${y} ${xR - 4},${y - 6} ${xR - 4},${y + 6}" fill="${col}" opacity="0.7"/>`;
      if (rawOld < xL - 1) s += `<polygon points="${xL - 3},${y} ${xL + 4},${y - 6} ${xL + 4},${y + 6}" fill="${col}" opacity="0.7"/>`;
    }
  });

  // chosen ends, labelled on top
  if (env.valid) {
    const xn = x(env.nearGa), xf = x(env.farGa), bandW = xf - xn;
    const tight = bandW < 210;
    s += txt(tight ? xn - 6 : xn, m.t - 20, "near end " + env.nearGa.toFixed(3) + " Ga",
      { size: 10, anchor: tight ? "end" : "middle", weight: 600, fill: C.darkTeal, mono: true });
    s += txt(tight ? xf + 6 : xf, m.t - 20, "far end " + env.farGa.toFixed(3) + " Ga",
      { size: 10, anchor: tight ? "start" : "middle", weight: 600, fill: C.darkTeal, mono: true });
    const label = "budget " + fmtMyr(env.budgetMyr) + " Myr";
    const narrow = bandW < 130;
    s += txt(narrow ? xf + 8 : (xn + xf) / 2, h - m.b - 4, label,
      { size: 12.5, anchor: narrow ? "start" : "middle", weight: 700, fill: C.darkTeal, mono: true });
  }
  void params;
  return s + "</svg>";
}

/* ============ 2. Cooling curve ============ */

export function coolingSvg(params, env, w = 420) {
  const h = 250, m = { l: 52, r: 16, t: 30, b: 44 };
  const oldest = 4.55, youngest = 4.00;
  const x = (ga) => m.l + ((oldest - ga) / (oldest - youngest)) * (w - m.l - m.r);
  const tLo = 30, tHi = 2000;
  const y = (t) => h - m.b - ((Math.log10(Math.max(tLo, t)) - Math.log10(tLo)) / (Math.log10(tHi) - Math.log10(tLo))) * (h - m.t - m.b);
  let s = svgOpen(w, h, "Illustrative Hadean cooling curve");
  s += txt(4, 17, "Cooling curve, Tier C and illustrative", { size: 11.5, weight: 600 });

  for (const t of [30, 100, 300, 1000, 2000]) {
    s += `<line x1="${m.l}" y1="${y(t)}" x2="${w - m.r}" y2="${y(t)}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(m.l - 6, y(t) + 3.5, String(t), { size: 9.5, anchor: "end", fill: C.muted, mono: true });
  }
  for (let g = 4.5; g >= 4.0 - 1e-9; g -= 0.1) {
    s += `<line x1="${x(g)}" y1="${m.t}" x2="${x(g)}" y2="${h - m.b}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(x(g), h - m.b + 15, g.toFixed(1), { size: 9.5, anchor: "middle", fill: C.muted, mono: true });
  }
  s += txt(14, m.t - 12, "Surface T, C", { size: 9.5, fill: C.muted });
  s += txt((m.l + w - m.r) / 2, h - 8, "Age, Ga", { size: 10, anchor: "middle", fill: C.muted });

  let d = "";
  for (let g = oldest; g >= youngest - 1e-9; g -= 0.005) {
    const t = tempAtAge(params.coolingAnchors, g);
    d += (d ? " L" : "M") + x(g).toFixed(1) + " " + y(t).toFixed(1);
  }
  s += `<path d="${d}" fill="none" stroke="${C.terra}" stroke-width="2"/>`;
  for (const a of params.coolingAnchors) {
    if (a.age > oldest || a.age < youngest) continue;
    s += `<circle cx="${x(a.age)}" cy="${y(a.t)}" r="3" fill="${C.surface}" stroke="${C.terra}" stroke-width="1.6"/>`;
  }
  // the threshold and where it lands
  const th = params.startTempC;
  s += `<line x1="${m.l}" y1="${y(th)}" x2="${w - m.r}" y2="${y(th)}" stroke="${C.teal}" stroke-width="1.4" stroke-dasharray="4 3"/>`;
  s += txt(w - m.r - 2, y(th) - 5, th + " C threshold", { size: 9.5, anchor: "end", fill: C.teal, weight: 600, mono: true });
  if (env.nearGa <= oldest && env.nearGa >= youngest) {
    s += `<line x1="${x(env.nearGa)}" y1="${m.t}" x2="${x(env.nearGa)}" y2="${h - m.b}" stroke="${C.darkTeal}" stroke-width="1.4"/>`;
    s += txt(x(env.nearGa) + 4, m.t + 12, env.nearGa.toFixed(3) + " Ga", { size: 9.5, fill: C.darkTeal, weight: 600, mono: true });
  }
  return s + "</svg>";
}

/* ============ 3. Audit ============ */

export function auditSvg(results, env, w = 900) {
  const h = 120 + results.length * 52;
  const m = { l: 266, r: 130, t: 62, b: 56 };
  const lo = -4, hi = 4; // log10 Myr
  const x = (v) => m.l + ((Math.log10(Math.max(1e-4, v)) - lo) / (hi - lo)) * (w - m.l - m.r);
  let s = svgOpen(w, h, "Time-budget audit");
  s += txt(10, 24, "Time-budget audit: required duration against the budget you chose", { size: 14, weight: 600 });
  s += txt(10, 41, "Each bar is T1 setting, T2 chemistry, T3 coincidence, T4 slow biology and T5 building the ecosystem, stacked on a logarithmic axis.", { size: 10.5, fill: C.muted });

  for (let e = lo; e <= hi; e++) {
    s += `<line x1="${x(Math.pow(10, e))}" y1="${m.t - 8}" x2="${x(Math.pow(10, e))}" y2="${h - m.b + 6}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(x(Math.pow(10, e)), h - m.b + 21, "10^" + e, { size: 9.5, anchor: "middle", fill: C.muted, mono: true });
  }
  s += txt((m.l + w - m.r) / 2, h - m.b + 40, "Required duration, Myr, logarithmic", { size: 11, anchor: "middle", fill: C.muted, weight: 600 });

  if (env.valid && env.budgetMyr > 0) {
    const bx = x(env.budgetMyr);
    s += `<rect x="${m.l}" y="${m.t - 8}" width="${Math.max(0, bx - m.l)}" height="${h - m.t - m.b + 14}" fill="${C.cyan}" opacity="0.3"/>`;
    s += `<line x1="${bx}" y1="${m.t - 16}" x2="${bx}" y2="${h - m.b + 6}" stroke="${C.darkTeal}" stroke-width="2"/>`;
    s += txt(bx + 5, m.t - 20, "budget " + fmtMyr(env.budgetMyr) + " Myr", { size: 11, weight: 700, fill: C.darkTeal, mono: true });
  }

  const termCol = { T1: C.terra, T2: C.gold, T3: C.teal, T4: C.darkTeal, T5: C.mauve };
  results.forEach((r, i) => {
    const y0 = m.t + 8 + i * 52;
    s += txt(m.l - 10, y0 + 11, r.scenario.name, { size: 11.5, anchor: "end", weight: 600 });
    s += txt(m.l - 10, y0 + 25, "dominant " + r.dominant, { size: 9.5, anchor: "end", fill: C.muted, mono: true });
    let acc = 0;
    for (const k of ["T1", "T2", "T3", "T4", "T5"]) {
      const v = r.terms[k];
      if (!(v > 0)) continue;
      const xa = x(Math.max(1e-4, acc || 1e-4)), xb = x(acc + v);
      acc += v;
      const width = Math.max(1.5, xb - (acc === v ? m.l : xa));
      const x0 = acc === v ? m.l : xa;
      s += `<rect x="${x0}" y="${y0}" width="${width}" height="17" fill="${termCol[k]}" opacity="0.9"><title>${esc(k + " = " + fmtMyr(v) + " Myr")}</title></rect>`;
      if (width > 26) s += txt(x0 + width / 2, y0 + 12, k, { size: 9.5, anchor: "middle", fill: k === "T2" ? C.text : "#fff", weight: 700 });
    }
    const tx = x(r.total);
    s += `<line x1="${tx}" y1="${y0 - 4}" x2="${tx}" y2="${y0 + 21}" stroke="${C.text}" stroke-width="1.5"/>`;
    const fits = env.valid && r.total <= env.budgetMyr;
    const near = env.valid && !fits && r.total <= env.budgetMyr * 3;
    s += txt(w - m.r + 8, y0 + 8, fmtMyr(r.total) + " Myr", { size: 11, weight: 700, mono: true, fill: fits ? C.teal : near ? "#c08a1e" : C.fail });
    s += txt(w - m.r + 8, y0 + 21, fits ? "fits" : near ? "fast end only" : "too slow", { size: 9.5, fill: C.muted });
    // workbook range for comparison
    const wa = x(r.workbookLow), wb = x(r.workbookHigh);
    s += `<line x1="${wa}" y1="${y0 + 28}" x2="${wb}" y2="${y0 + 28}" stroke="${C.faint}" stroke-width="3" stroke-linecap="round" opacity="0.8"><title>manuscript range</title></line>`;
    s += txt(wa - 4, y0 + 31.5, "ms", { size: 8.5, anchor: "end", fill: C.faint, mono: true });
  });
  return s + "</svg>";
}

/* ============ 4. Damkohler diagonal ============ */

export function damkohlerSvg(model, params, w = 640, selectedId = null) {
  const h = 520, m = { l: 62, r: 22, t: 46, b: 62 };
  const lo = -1, hi = 16;
  const sx = (v) => m.l + ((Math.log10(v) - lo) / (hi - lo)) * (w - m.l - m.r);
  const sy = (v) => h - m.b - ((Math.log10(v) - lo) / (hi - lo)) * (h - m.t - m.b);
  let s = svgOpen(w, h, "Pass or perish, the handoff criterion");
  s += txt(8, 20, "Pass or perish: transfer time against loss time", { size: 13.5, weight: 600 });
  s += txt(8, 35, "Above the diagonal a species is handed on. Below it, it is destroyed first.", { size: 10.5, fill: C.muted });

  for (let e = 0; e <= 16; e += 2) {
    s += `<line x1="${sx(Math.pow(10, e))}" y1="${m.t}" x2="${sx(Math.pow(10, e))}" y2="${h - m.b}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += `<line x1="${m.l}" y1="${sy(Math.pow(10, e))}" x2="${w - m.r}" y2="${sy(Math.pow(10, e))}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(sx(Math.pow(10, e)), h - m.b + 16, "10^" + e, { size: 9, anchor: "middle", fill: C.muted, mono: true });
    s += txt(m.l - 6, sy(Math.pow(10, e)) + 3, "10^" + e, { size: 9, anchor: "end", fill: C.muted, mono: true });
  }
  s += txt((m.l + w - m.r) / 2, h - m.b + 36, "tau transfer, s", { size: 11, anchor: "middle", fill: C.muted, weight: 600 });
  s += txt(16, (m.t + h - m.b) / 2, "tau loss, s", { size: 11, anchor: "middle", fill: C.muted, weight: 600, rotate: -90 });

  // diagonal and the pass region
  s += `<polygon points="${m.l},${m.t} ${w - m.r},${m.t} ${m.l},${sy(Math.pow(10, lo))}" fill="${C.cyan}" opacity="0.22"/>`;
  s += `<line x1="${sx(Math.pow(10, lo))}" y1="${sy(Math.pow(10, lo))}" x2="${sx(Math.pow(10, hi))}" y2="${sy(Math.pow(10, hi))}" stroke="${C.text}" stroke-width="1.4" stroke-dasharray="6 4"/>`;
  s += txt(w - m.r - 6, m.t + 14, "pass", { size: 11, anchor: "end", weight: 700, fill: C.darkTeal });
  s += txt(w - m.r - 6, h - m.b - 8, "perish", { size: 11, anchor: "end", weight: 700, fill: C.fail });

  const catCol = { "small molecule and ion": C.teal, "carbon substrate": C.terra, polymer: C.mauve };
  for (const hd of model.handoffs) {
    const st = handoffState(hd, params.effectiveTempC, params.eaTransfer, params.eaLoss);
    const cx = sx(Math.min(1e16, Math.max(0.1, st.tauTransfer)));
    const cy = sy(Math.min(1e16, Math.max(0.1, st.tauLoss)));
    const col = catCol[hd.marker_category] || C.muted;
    const on = selectedId === hd.id;
    // low to high bars, at the working temperature
    const txLo = arrhenius(hd.tau_transfer_low_s, params.effectiveTempC, params.eaTransfer);
    const txHi = arrhenius(hd.tau_transfer_high_s, params.effectiveTempC, params.eaTransfer);
    const tlLo = arrhenius(hd.tau_loss_low_s, params.effectiveTempC, params.eaLoss);
    const tlHi = arrhenius(hd.tau_loss_high_s, params.effectiveTempC, params.eaLoss);
    s += `<line x1="${sx(Math.max(0.1, txLo))}" y1="${cy}" x2="${sx(Math.min(1e16, txHi))}" y2="${cy}" stroke="${col}" stroke-width="1" opacity="0.5"/>`;
    s += `<line x1="${cx}" y1="${sy(Math.max(0.1, tlLo))}" x2="${cx}" y2="${sy(Math.min(1e16, tlHi))}" stroke="${col}" stroke-width="1" opacity="0.5"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${on ? 8 : 5.5}" fill="${col}" stroke="${on ? C.text : C.surface}" stroke-width="${on ? 2 : 1.2}"><title>${esc(hd.species_and_handoff + ": Da = " + fmtSci(st.da) + ", p = " + st.p.toFixed(4))}</title></circle>`;
    s += txt(cx + (on ? 12 : 9), cy + 3.5, hd.id, { size: 9, fill: col, weight: 700, mono: true });
  }
  let lx = m.l + 6;
  for (const [k, v] of Object.entries(catCol)) {
    s += `<circle cx="${lx}" cy="${h - 12}" r="4.5" fill="${v}"/>`;
    s += txt(lx + 8, h - 8.5, k, { size: 9.5, fill: C.muted });
    lx += 13 + k.length * 5.2;
  }
  return s + "</svg>";
}

/* ============ 5. Ladder, S0 to S6 with per rung probability ============ */

export function ladderSvg(result, model, w = 900) {
  const rungs = model.rungs;
  const h = 300;
  const m = { l: 40, r: 40, t: 60, b: 90 };
  const cw = (w - m.l - m.r) / rungs.length;
  let s = svgOpen(w, h, "The ladder, S0 to S6");
  s += txt(10, 22, "The ladder, with the probability the model assigns to each rung", { size: 14, weight: 600 });
  s += txt(10, 39, "S6 sits after S5 and does not consume the budget. It decides what the rock record is allowed to show us.", { size: 10.5, fill: C.muted });

  rungs.forEach((r, i) => {
    const cx = m.l + i * cw + cw / 2;
    const active = result.rungs.find((x) => x.rung === r.id);
    const isS6 = r.id === "S6";
    const p = active ? active.p : null;
    const barH = 86;
    const col = isS6 ? C.mauve : p == null ? C.faint : p > 0.9 ? C.teal : p > 0.1 ? C.gold : C.terra;
    // box
    s += `<rect x="${cx - cw / 2 + 5}" y="${m.t}" width="${cw - 10}" height="${barH}" rx="4" fill="${isS6 ? "#f3e9ec" : C.light}" stroke="${col}" stroke-width="1.4" stroke-dasharray="${isS6 ? "5 3" : ""}"/>`;
    s += txt(cx, m.t + 19, r.id, { size: 15, anchor: "middle", weight: 700, fill: col, mono: true });
    const words = r.name.split(" ");
    let line = "", ln = 0;
    for (const wd of words) {
      if ((line + " " + wd).trim().length > 15) { s += txt(cx, m.t + 36 + ln * 12, line, { size: 10, anchor: "middle", fill: C.text }); line = wd; ln++; }
      else line = (line + " " + wd).trim();
    }
    s += txt(cx, m.t + 36 + ln * 12, line, { size: 10, anchor: "middle", fill: C.text });
    if (p != null && !isS6) {
      s += txt(cx, m.t + barH - 8, "p = " + (p > 0.001 ? p.toFixed(3) : fmtSci(p)), { size: 9.5, anchor: "middle", fill: C.muted, mono: true, weight: 600 });
      const rib = r.id === "S2" ? result.rungs.find((x) => x.rung === "S2r") : null;
      if (rib) s += txt(cx, m.t + barH + 30, "+ ribose step p = " + (rib.p > 0.001 ? rib.p.toFixed(3) : fmtSci(rib.p)), { size: 9, anchor: "middle", fill: C.terra, mono: true, weight: 600 });
    } else if (isS6) {
      s += txt(cx, m.t + barH - 8, "evidence filter", { size: 9, anchor: "middle", fill: C.mauve, mono: true, weight: 600 });
    }
    // arrow
    if (i < rungs.length - 1) {
      const ax = cx + cw / 2 - 5, bx = cx + cw / 2 + 5;
      const dash = rungs[i + 1].id === "S6" ? "4 3" : "";
      s += `<line x1="${ax}" y1="${m.t + barH / 2}" x2="${bx - 3}" y2="${m.t + barH / 2}" stroke="${C.muted}" stroke-width="1.3" stroke-dasharray="${dash}"/>`;
      s += `<polygon points="${bx},${m.t + barH / 2} ${bx - 5},${m.t + barH / 2 - 3.5} ${bx - 5},${m.t + barH / 2 + 3.5}" fill="${C.muted}"/>`;
    }
    // unit selected
    s += txt(cx, m.t + barH + 20, r.unit_selected.length > 22 ? r.unit_selected.slice(0, 21) + "." : r.unit_selected, { size: 9, anchor: "middle", fill: C.muted });
  });

  // brackets: filters vs selection proper vs preservation
  const y = m.t + 150;
  const bracket = (i0, i1, label, col) => {
    const a = m.l + i0 * cw + 5, b = m.l + (i1 + 1) * cw - 5;
    let o = `<path d="M${a} ${y} L${a} ${y + 7} L${b} ${y + 7} L${b} ${y}" fill="none" stroke="${col}" stroke-width="1.3"/>`;
    o += txt((a + b) / 2, y + 22, label, { size: 10.5, anchor: "middle", fill: col, weight: 600 });
    return o;
  };
  s += bracket(0, 3, "S0 to S3, filters. No copying, no inheritance.", C.terra);
  s += bracket(4, 5, "S4 to S5, selection proper", C.teal);
  s += bracket(6, 6, "S6, preservation", C.mauve);

  s += txt(m.l, h - 14, "joint probability across the active rungs, p = " + fmtSci(result.pJoint) + ",  which sets T3", { size: 10.5, fill: C.darkTeal, weight: 600, mono: true });
  return s + "</svg>";
}

/* ============ 6. Regimes with proportional duration arrows ============ */

export function regimeSvg(model, env, w = 900) {
  const rs = model.regimes;
  const h = 300, m = { l: 22, r: 22, t: 58, b: 74 };
  const cw = (w - m.l - m.r) / rs.length;
  const cols = [C.terra, C.gold, C.teal, C.darkTeal];
  let s = svgOpen(w, h, "Four regimes with duration arrows");
  s += txt(10, 22, "Four rate-gated regimes, with duration arrows drawn to scale", { size: 14, weight: 600 });
  const total = rs.reduce((a, r) => a + Math.sqrt(r.duration_low_myr * r.duration_high_myr), 0);
  s += txt(10, 39, "Geometric means sum to " + fmtMyr(total) + " Myr" + (env.valid ? ", against a budget of " + fmtMyr(env.budgetMyr) + " Myr." : "."), { size: 10.5, fill: C.muted });

  const maxLog = Math.log10(100);
  rs.forEach((r, i) => {
    const x0 = m.l + i * cw, cx = x0 + cw / 2;
    const col = cols[i % 4];
    s += `<rect x="${x0 + 6}" y="${m.t}" width="${cw - 12}" height="112" rx="4" fill="${C.light}" stroke="${col}" stroke-width="1.5"/>`;
    s += txt(cx, m.t + 20, r.id + ". " + r.name, { size: 13, anchor: "middle", weight: 700, fill: col });
    s += txt(cx, m.t + 36, r.rungs_covered, { size: 10, anchor: "middle", fill: C.muted, mono: true });
    // wrapped conditions
    const words = r.conditions.split(" ");
    let line = "", ln = 0;
    for (const wd of words) {
      if ((line + " " + wd).trim().length > 24) { s += txt(cx, m.t + 55 + ln * 12, line, { size: 9.5, anchor: "middle" }); line = wd; ln++; }
      else line = (line + " " + wd).trim();
    }
    s += txt(cx, m.t + 55 + ln * 12, line, { size: 9.5, anchor: "middle" });
    s += txt(cx, m.t + 104, r.unit_selected, { size: 9.5, anchor: "middle", fill: col, weight: 600 });

    // duration arrow, length proportional to log of the geometric mean
    const gm = Math.sqrt(r.duration_low_myr * r.duration_high_myr);
    const frac = Math.max(0.08, (Math.log10(gm) + 3) / (maxLog + 3));
    const availW = cw - 24;
    const ax = x0 + 12, ay = m.t + 140;
    s += `<line x1="${ax}" y1="${ay}" x2="${ax + availW * frac}" y2="${ay}" stroke="${col}" stroke-width="5" stroke-linecap="round"/>`;
    s += `<polygon points="${ax + availW * frac + 9},${ay} ${ax + availW * frac},${ay - 5.5} ${ax + availW * frac},${ay + 5.5}" fill="${col}"/>`;
    s += txt(ax, ay + 18, fmtMyr(r.duration_low_myr) + " to " + fmtMyr(r.duration_high_myr) + " Myr", { size: 10, fill: col, weight: 700, mono: true });
    s += txt(ax, ay + 32, r.why_that_long, { size: 9.5, fill: C.muted });
  });
  s += txt(m.l, h - 10, "Arrow length is proportional to the logarithm of the geometric mean duration, so R2 is visibly the quickest regime.", { size: 9.5, fill: C.faint });
  return s + "</svg>";
}

/* ============ 7. Preservation survival curves ============ */

export function preservationSvg(model, params, w = 640) {
  const h = 400, m = { l: 58, r: 252, t: 50, b: 56 };
  const tLo = 0, tHi = 300;
  const x = (t) => m.l + ((t - tLo) / (tHi - tLo)) * (w - m.l - m.r);
  const yLo = -6, yHi = 12; // log10 Myr
  const y = (v) => h - m.b - ((Math.min(yHi, Math.max(yLo, v)) - yLo) / (yHi - yLo)) * (h - m.t - m.b);
  let s = svgOpen(w, h, "Survival time against burial temperature");
  s += txt(8, 20, "S6b: survival time against burial temperature", { size: 13.5, weight: 600 });
  s += txt(8, 35, "A class is readable only where its curve sits above the age of the rock.", { size: 10.5, fill: C.muted });

  for (let e = yLo; e <= yHi; e += 3) {
    s += `<line x1="${m.l}" y1="${y(e)}" x2="${w - m.r}" y2="${y(e)}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(m.l - 6, y(e) + 3, "10^" + e, { size: 9, anchor: "end", fill: C.muted, mono: true });
  }
  for (let t = 0; t <= 300; t += 50) {
    s += `<line x1="${x(t)}" y1="${m.t}" x2="${x(t)}" y2="${h - m.b}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(x(t), h - m.b + 15, String(t), { size: 9, anchor: "middle", fill: C.muted, mono: true });
  }
  s += txt((m.l + w - m.r) / 2, h - m.b + 34, "Burial temperature, C", { size: 10.5, anchor: "middle", fill: C.muted, weight: 600 });
  s += txt(14, (m.t + h - m.b) / 2, "Survival time, Myr", { size: 10.5, anchor: "middle", fill: C.muted, weight: 600, rotate: -90 });

  // age of the rock
  const ay = y(Math.log10(params.rockAgeMyr));
  s += `<line x1="${m.l}" y1="${ay}" x2="${w - m.r}" y2="${ay}" stroke="${C.text}" stroke-width="1.6" stroke-dasharray="6 4"/>`;
  s += txt(m.l + 4, ay - 5, "age of the rock, " + fmtMyr(params.rockAgeMyr) + " Myr", { size: 9.5, fill: C.text, weight: 600, mono: true });

  // the oil window ceiling
  s += `<rect x="${x(150)}" y="${m.t}" width="${w - m.r - x(150)}" height="${h - m.t - m.b}" fill="${C.terra}" opacity="0.09"/>`;
  s += `<line x1="${x(150)}" y1="${m.t}" x2="${x(150)}" y2="${h - m.b}" stroke="${C.terra}" stroke-width="1.3" stroke-dasharray="3 3"/>`;
  s += txt(x(150) + 4, m.t + 12, "oil window closes", { size: 9, fill: C.terra, weight: 600 });

  const cols = [C.mauve, C.terra, C.brown, C.darkTeal, C.olive, C.teal, C.mauve, C.muted];
  const withData = model.preservation.molecule_classes.filter((mc) => mc.half_life_value != null && mc.half_life_temp_c != null);
  withData.forEach((mc, i) => {
    const halfYr = mc.half_life_unit.startsWith("Myr") ? mc.half_life_value * 1e6 : mc.half_life_value;
    const tauRefS = halfYr * 3.15576e7;
    const tauAt25 = tauRefS / Math.exp((params.eaDegradation * 1000 / R_GAS) * (1 / (mc.half_life_temp_c + 273.15) - 1 / 298.15));
    let d = "";
    for (let t = tLo; t <= tHi; t += 2) {
      const v = Math.log10(arrhenius(tauAt25, t, params.eaDegradation) / 3.15576e13);
      d += (d ? " L" : "M") + x(t).toFixed(1) + " " + y(v).toFixed(1);
    }
    s += `<path d="${d}" fill="none" stroke="${cols[i]}" stroke-width="2"/>`;
    s += `<circle cx="${x(params.burialTempC)}" cy="${y(Math.log10(arrhenius(tauAt25, params.burialTempC, params.eaDegradation) / 3.15576e13))}" r="4" fill="${cols[i]}" stroke="${C.surface}" stroke-width="1.2"/>`;
    s += txt(w - m.r + 8, m.t + 12 + i * 15, mc.name.length > 38 ? mc.name.slice(0, 37) + "." : mc.name, { size: 9, fill: cols[i], weight: 600 });
  });
  // classes with no measured half-life
  const noData = model.preservation.molecule_classes.filter((mc) => mc.half_life_value == null);
  s += txt(w - m.r + 8, m.t + 12 + withData.length * 15 + 8, "no measured half-life:", { size: 9, fill: C.muted, weight: 700 });
  noData.forEach((mc, i) => {
    s += txt(w - m.r + 8, m.t + 12 + withData.length * 15 + 22 + i * 13, mc.name.length > 38 ? mc.name.slice(0, 37) + "." : mc.name, { size: 8.5, fill: C.muted });
  });

  const bx = x(params.burialTempC);
  s += `<line x1="${bx}" y1="${m.t}" x2="${bx}" y2="${h - m.b}" stroke="${C.darkTeal}" stroke-width="1.4"/>`;
  s += txt(bx + 4, m.t - 6, "your burial T, " + params.burialTempC + " C", { size: 9.5, fill: C.darkTeal, weight: 700, mono: true });
  return s + "</svg>";
}

/* ============ 8. Element passage matrix ============ */

export function matrixSvg(model, w = 900) {
  const els = model.elements;
  const rungIds = ["S0", "S1", "S2", "S3", "S4", "S5", "S6"];
  const m = { l: 96, r: 20, t: 92, b: 40 };
  const cw = (w - m.l - m.r) / rungIds.length, rh = 30;
  const h = m.t + els.length * rh + m.b;
  let s = svgOpen(w, h, "Elemental passage matrix");
  s += txt(10, 22, "Elemental passage matrix, now including the preservation rung", { size: 14, weight: 600 });
  s += txt(10, 39, "e is easy, m is moderate, h is hard and rate-limiting. The S6 column is new and is Tier C.", { size: 10.5, fill: C.muted });

  const gradeCol = { e: C.cyan, m: C.gold, h: C.terra };
  const gradeText = { e: C.darkTeal, m: C.text, h: "#fff" };
  rungIds.forEach((rid, j) => {
    const r = model.rungs.find((x) => x.id === rid);
    const cx = m.l + j * cw + cw / 2;
    s += txt(cx, m.t - 26, rid, { size: 12.5, anchor: "middle", weight: 700, fill: rid === "S6" ? C.mauve : C.darkTeal, mono: true });
    const nm = r ? r.name : "";
    s += txt(cx, m.t - 12, nm.length > 16 ? nm.slice(0, 15) + "." : nm, { size: 9, anchor: "middle", fill: C.muted });
  });
  els.forEach((el, i) => {
    const y0 = m.t + i * rh;
    s += `<rect x="${m.l}" y="${y0}" width="${w - m.l - m.r}" height="${rh}" fill="${i % 2 ? "#f5f4f0" : C.surface}"/>`;
    s += txt(m.l - 10, y0 + rh / 2 + 4, el.symbol + ", " + el.name, { size: 11, anchor: "end", weight: 600 });
    rungIds.forEach((rid, j) => {
      const g = el.rungs[rid];
      if (!g) return;
      const cx = m.l + j * cw + cw / 2;
      s += `<rect x="${cx - 15}" y="${y0 + 5}" width="30" height="${rh - 10}" rx="3" fill="${gradeCol[g]}" opacity="${rid === "S6" ? 0.75 : 1}"/>`;
      s += txt(cx, y0 + rh / 2 + 4, g, { size: 12, anchor: "middle", weight: 700, fill: gradeText[g], mono: true });
    });
  });
  let lx = m.l;
  for (const [g, lbl] of [["e", "easy"], ["m", "moderate"], ["h", "hard, rate-limiting"]]) {
    s += `<rect x="${lx}" y="${h - 26}" width="18" height="12" rx="2" fill="${gradeCol[g]}"/>`;
    s += txt(lx + 23, h - 16, lbl, { size: 9.5, fill: C.muted });
    lx += 40 + lbl.length * 5.4;
  }
  return s + "</svg>";
}

/* ============ export helpers ============ */

/* ============ Mineral surfaces ============ */

const MIN_COL = {
  "Fe(III) oxyhydroxide": C.terra, "Fe(II)-Fe(III) layered hydroxide": C.teal, "Mg hydroxide": C.darkTeal,
  "Ca phosphate": C.gold, carbonate: C.olive, "1:1 clay": C.brown, "2:1 clay": C.mauve,
  "silicate glass": C.muted, silicate: C.faint, "2:1 sheet silicate face": C.faint, sulfide: C.text,
};
const minCol = (m) => MIN_COL[m.group] || C.muted;

// Space labels vertically so they never overlap.
function spread(items, minGap, lo, hi) {
  const a = [...items].sort((p, q) => p.y - q.y);
  for (let i = 1; i < a.length; i++) if (a[i].y - a[i - 1].y < minGap) a[i].y = a[i - 1].y + minGap;
  if (a.length && a[a.length - 1].y > hi) {
    a[a.length - 1].y = hi;
    for (let i = a.length - 2; i >= 0; i--) if (a[i + 1].y - a[i].y < minGap) a[i].y = a[i + 1].y - minGap;
  }
  for (const it of a) it.y = Math.max(lo, it.y);
  return a;
}

export function surfacePhSvg(model, params, cond, w = 640, selectedId = null) {
  const mins = (model.minerals || []).filter((m) => m.id !== "none");
  const h = 410;
  const m = { l: 62, r: 182, t: 62, b: 52 };
  const pw = w - m.l - m.r, ph = h - m.t - m.b;
  const xLo = 4, xHi = 11, yLo = -3, yHi = 4;
  const x = (v) => m.l + ((v - xLo) / (xHi - xLo)) * pw;
  const y = (kd) => {
    const l = Math.log10(Math.max(1e-12, kd));
    return m.t + (1 - (Math.min(yHi, Math.max(yLo, l)) - yLo) / (yHi - yLo)) * ph;
  };
  let s = svgOpen(w, h, "Phosphate distribution coefficient against pH");
  s += txt(14, 22, "Litres of water one gram of mineral can strip of phosphate", { size: 14, weight: 600 });
  s += txt(14, 39, `Distribution coefficient Kd at ${fmtSci(params.phosphateUM)} uM phosphate and ${fmtSci(params.divalentMM)} mM Mg2+ plus Ca2+. Above the dashed line most phosphate is held at ${fmtSci(cond.loading)} g per L`, { size: 10.5, fill: C.muted });
  for (let g = yLo; g <= yHi; g++) {
    s += `<line x1="${m.l}" y1="${y(10 ** g)}" x2="${m.l + pw}" y2="${y(10 ** g)}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(m.l - 8, y(10 ** g) + 4, g === 0 ? "1" : "10^" + g, { size: 10, anchor: "end", fill: C.muted, mono: true });
  }
  for (let v = xLo; v <= xHi; v++) {
    s += `<line x1="${x(v)}" y1="${m.t + ph}" x2="${x(v)}" y2="${m.t + ph + 5}" stroke="${C.muted}"/>`;
    s += txt(x(v), m.t + ph + 18, String(v), { size: 10, anchor: "middle", fill: C.muted, mono: true });
  }
  s += txt(m.l + pw / 2, h - 12, "pH", { size: 11, anchor: "middle", fill: C.muted, weight: 600 });
  s += txt(18, m.t + ph / 2, "Kd, litres per gram", { size: 11, anchor: "middle", fill: C.muted, weight: 600, rotate: -90 });
  if (cond.loading > 0) {
    const yh = y(1 / cond.loading);
    s += `<line x1="${m.l}" y1="${yh}" x2="${m.l + pw}" y2="${yh}" stroke="${C.darkTeal}" stroke-width="1.2" stroke-dasharray="6 4"/>`;
    s += txt(m.l + 4, yh - 5, "half held at " + fmtSci(cond.loading) + " g per L", { size: 10, fill: C.darkTeal, weight: 600 });
  }
  if (cond.pH >= xLo && cond.pH <= xHi) {
    s += `<line x1="${x(cond.pH)}" y1="${m.t}" x2="${x(cond.pH)}" y2="${m.t + ph}" stroke="${C.darkTeal}" stroke-width="1.2" stroke-dasharray="2 3"/>`;
    s += txt(x(cond.pH) + 4, m.t + 10, "pH " + cond.pH.toFixed(1), { size: 10, fill: C.darkTeal, weight: 600 });
  }
  const labels = [];
  const draw = (mn, sel) => {
    const pts = [];
    for (let v = xLo; v <= xHi + 1e-9; v += 0.1) {
      const st = surfaceState(mn, { pH: v, loading: cond.loading }, params);
      pts.push(`${x(v).toFixed(1)},${y(st.kd).toFixed(1)}`);
    }
    const col = minCol(mn);
    s += `<polyline points="${pts.join(" ")}" fill="none" stroke="${col}" stroke-width="${sel ? 3 : 1.4}" opacity="${sel || !selectedId ? 1 : 0.5}"/>`;
    const end = surfaceState(mn, { pH: xHi, loading: cond.loading }, params);
    labels.push({ y: y(end.kd) + 4, name: mn.name, col, sel });
  };
  mins.filter((mn) => mn.id !== selectedId).forEach((mn) => draw(mn, false));
  const selM = mins.find((mn) => mn.id === selectedId);
  if (selM) draw(selM, true);
  for (const L of spread(labels, 12, m.t + 4, m.t + ph + 4)) {
    s += txt(m.l + pw + 8, L.y, L.name, { size: 10, fill: L.col === C.faint ? C.muted : L.col, weight: L.sel ? 700 : 400 });
  }
  s += `</svg>`;
  return s;
}

export function surfaceGainSvg(model, params, cond, w = 640, selectedId = null) {
  const mins = (model.minerals || []).filter((m) => m.id !== "none");
  const ref = mins.find((mn) => mn.id === selectedId) || mins.find((mn) => mn.id === "smectite") || mins[0];
  const h = 400;
  const m = { l: 62, r: 30, t: 72, b: 56 };
  const pw = w - m.l - m.r, ph = h - m.t - m.b;
  const kLo = -4, kHi = 2, gLo = 0, gHi = 4;
  const x = (K) => m.l + ((Math.log10(Math.max(1e-12, K)) - kLo) / (kHi - kLo)) * pw;
  const y = (g) => m.t + (1 - (Math.log10(Math.max(1, g)) - gLo) / (gHi - gLo)) * ph;
  let s = svgOpen(w, h, "Protection and activation gain against binding affinity");
  s += txt(14, 22, "How many times a surface helps S2 and S4", { size: 14, weight: 600 });
  s += txt(14, 39, `Generic surface with the site density and locked fraction of ${ref.name}, at pH ${cond.pH.toFixed(1)} and ${fmtSci(cond.loading)} g per L`, { size: 10.5, fill: C.muted });
  for (let g = gLo; g <= gHi; g++) {
    s += `<line x1="${m.l}" y1="${y(10 ** g)}" x2="${m.l + pw}" y2="${y(10 ** g)}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(m.l - 8, y(10 ** g) + 4, g === 0 ? "1" : "10^" + g, { size: 10, anchor: "end", fill: C.muted, mono: true });
  }
  for (let k = kLo; k <= kHi; k++) {
    s += `<line x1="${x(10 ** k)}" y1="${m.t + ph}" x2="${x(10 ** k)}" y2="${m.t + ph + 5}" stroke="${C.muted}"/>`;
    s += txt(x(10 ** k), m.t + ph + 18, "10^" + k, { size: 10, anchor: "middle", fill: C.muted, mono: true });
  }
  s += txt(m.l + pw / 2, h - 14, "binding affinity K at this pH, litres per micromole of phosphate", { size: 11, anchor: "middle", fill: C.muted, weight: 600 });
  s += txt(16, m.t + ph / 2, "times faster or longer", { size: 11, anchor: "middle", fill: C.muted, weight: 600, rotate: -90 });
  // damage threshold
  s += `<line x1="${x(params.damageK)}" y1="${m.t}" x2="${x(params.damageK)}" y2="${m.t + ph}" stroke="${C.fail}" stroke-width="1" stroke-dasharray="3 3"/>`;
  s += txt(x(params.damageK) + 4, m.t + 10, "binding starts to damage", { size: 10, fill: C.fail });
  // sweep: build a synthetic mineral with fixed K at this pH
  const s2 = [], s4 = [];
  for (let lk = kLo; lk <= kHi + 1e-9; lk += 0.05) {
    const K = 10 ** lk;
    const synth = { ...ref, id: "synth", k7_l_umol: K, ph_slope: 0, pzc: 0 }; // pzc 0 keeps the bridge term out of the sweep
    const st = surfaceState(synth, { pH: 7, loading: cond.loading }, { ...params, bridgeK: 0 });
    s2.push(`${x(K).toFixed(1)},${y(st.lossGain).toFixed(1)}`);
    s4.push(`${x(K).toFixed(1)},${y(st.s4Gain).toFixed(1)}`);
  }
  s += `<polyline points="${s2.join(" ")}" fill="none" stroke="${C.teal}" stroke-width="2.4"/>`;
  s += `<polyline points="${s4.join(" ")}" fill="none" stroke="${C.terra}" stroke-width="2.4" stroke-dasharray="6 3"/>`;
  // legend
  const lx = m.l + 8, ly = 56;
  s += `<line x1="${lx}" y1="${ly}" x2="${lx + 22}" y2="${ly}" stroke="${C.teal}" stroke-width="2.4"/>` + txt(lx + 28, ly + 4, "S2, loss time multiplied by", { size: 10.5 });
  s += `<line x1="${lx + 200}" y1="${ly}" x2="${lx + 222}" y2="${ly}" stroke="${C.terra}" stroke-width="2.4" stroke-dasharray="6 3"/>` + txt(lx + 228, ly + 4, "S4, activation made faster by", { size: 10.5 });
  // minerals as points
  for (const mn of mins) {
    const st = surfaceState(mn, cond, params);
    if (st.K <= 0) continue;
    const X = x(st.K), sel = mn.id === selectedId;
    s += `<circle cx="${X}" cy="${y(st.lossGain)}" r="${sel ? 5.5 : 3.8}" fill="${C.teal}" stroke="${C.surface}" stroke-width="1"/>`;
    s += `<rect x="${X - (sel ? 4.5 : 3.2)}" y="${y(st.s4Gain) - (sel ? 4.5 : 3.2)}" width="${sel ? 9 : 6.4}" height="${sel ? 9 : 6.4}" fill="${C.terra}" transform="rotate(45 ${X} ${y(st.s4Gain)})"/>`;
    if (sel) s += txt(X + 8, Math.min(y(st.lossGain), y(st.s4Gain)) - 8, mn.name, { size: 10.5, weight: 700 });
  }
  s += `</svg>`;
  return s;
}

/* ============ T2 and T3 up close ============ */

const S_YR = 3.15576e7;
const LANDMARKS = [
  [1e-3, "a millisecond"], [1, "a second"], [60, "a minute"], [3600, "an hour"], [86400, "a day"],
  [S_YR, "a year"], [100 * S_YR, "a human life"], [1e4 * S_YR, "10 kyr"], [1e6 * S_YR, "a million years"],
  [1e9 * S_YR, "a billion years"],
];
export const TERM_COL = { T1: C.olive, T2: C.teal, T3: C.terra, T4: C.darkTeal, T5: C.mauve };

// Human readable time from seconds, plain words, no long dashes.
export function humanTime(sec) {
  if (!Number.isFinite(sec)) return "never";
  if (sec <= 0) return "0 s";
  const f = (v) => (v >= 100 ? Math.round(v).toLocaleString("en-GB") : v >= 10 ? v.toFixed(1) : v.toPrecision(2));
  if (sec < 1e-3) return fmtSci(sec * 1e6) + " microseconds";
  if (sec < 1) return f(sec * 1000) + " ms";
  if (sec < 120) return f(sec) + " s";
  if (sec < 7200) return f(sec / 60) + " min";
  if (sec < 2 * 86400) return f(sec / 3600) + " h";
  if (sec < 2 * S_YR) return f(sec / 86400) + " days";
  const yr = sec / S_YR;
  if (yr < 1e4) return f(yr) + " years";
  if (yr < 1e6) return f(yr / 1e3) + " kyr";
  if (yr < 1e9) return f(yr / 1e6) + " Myr";
  if (yr < 1e13) return f(yr / 1e9) + " Gyr";
  return fmtSci(yr / 1e9) + " Gyr";
}

function logAxis(lo, hi, a, b) {
  const L = Math.log10(lo), H = Math.log10(hi);
  return (v) => a + ((Math.log10(Math.min(hi, Math.max(lo, v))) - L) / (H - L)) * (b - a);
}

// Z1. Every term of every scenario on one ruler, in seconds.
export function zoomRulerSvg(results, env, w = 900, selIdx = 0) {
  const rows = results.length;
  const h = 150 + rows * 34;
  const m = { l: 236, r: 28, t: 92, b: 58 };
  const all = results.flatMap((r) => [r.t1, r.t2, r.t3, r.t4, r.t5 || 0].map((v) => v * 1e6 * S_YR)).filter((v) => v > 0);
  const lo = Math.min(1e-2, ...all) * 0.5, hi = Math.max(1e17, ...all, env.budgetMyr * 1e6 * S_YR) * 2;
  const x = logAxis(lo, hi, m.l, w - m.r);
  let s = svgOpen(w, h, "All five terms on one time ruler");
  s += txt(14, 22, "All the terms on one ruler, from seconds to billions of years", { size: 14, weight: 600 });
  s += txt(14, 39, "Each step to the right is ten times longer. T2 and T3 sit near the left, T1, T4 and T5 near the right, many powers of ten apart.", { size: 10.5, fill: C.muted });
  // legend
  let lx = 14;
  for (const k of ["T1", "T2", "T3", "T4", "T5"]) {
    s += `<circle cx="${lx + 6}" cy="60" r="5.5" fill="${TERM_COL[k]}"/>` + txt(lx + 16, 64, { T1: "T1, a setting exists", T2: "T2, chemistry", T3: "T3, waiting for luck", T4: "T4, slow biology", T5: "T5, an ecosystem" }[k], { size: 10.5 });
    lx += k === "T4" ? 130 : 150;
  }
  // landmarks
  for (const [v, lab] of LANDMARKS) {
    if (v < lo || v > hi) continue;
    s += `<line x1="${x(v)}" y1="${m.t - 10}" x2="${x(v)}" y2="${h - m.b + 4}" stroke="${C.border}" stroke-width="0.8"/>`;
    s += txt(x(v), h - m.b + 18, lab, { size: 9.5, anchor: "end", fill: C.muted, rotate: -30 });
  }
  const bud = env.budgetMyr * 1e6 * S_YR;
  if (bud > 0) {
    s += `<line x1="${x(bud)}" y1="${m.t - 16}" x2="${x(bud)}" y2="${h - m.b + 4}" stroke="${C.fail}" stroke-width="1.4" stroke-dasharray="4 3"/>`;
    s += txt(x(bud) - 4, m.t - 20, "budget " + fmtMyr(env.budgetMyr) + " Myr", { size: 10, fill: C.fail, anchor: "end", weight: 600 });
  }
  results.forEach((r, i) => {
    const y = m.t + 12 + i * 34;
    const sel = i === selIdx;
    if (sel) s += `<rect x="4" y="${y - 15}" width="${w - 8}" height="30" fill="${C.cyan}" opacity="0.35"/>`;
    s += txt(m.l - 12, y + 4, r.scenario.name, { size: 11, anchor: "end", weight: sel ? 700 : 400 });
    s += `<line x1="${m.l}" y1="${y}" x2="${w - m.r}" y2="${y}" stroke="${C.border}" stroke-width="0.6"/>`;
    const pts = ["T1", "T2", "T3", "T4", "T5"].map((k) => ({ k, v: (r.terms[k] || 0) * 1e6 * S_YR }));
    const t23 = pts.filter((p) => p.k === "T2" || p.k === "T3").map((p) => p.v).filter((v) => v > 0);
    const t14 = pts.filter((p) => p.k === "T1" || p.k === "T4" || p.k === "T5").map((p) => p.v).filter((v) => v > 0);
    if (t23.length && t14.length) {
      const a = Math.max(...t23), b = Math.min(...t14);
      if (b > a * 10) {
        s += `<line x1="${x(a) + 8}" y1="${y}" x2="${x(b) - 8}" y2="${y}" stroke="${C.muted}" stroke-width="1" stroke-dasharray="2 3"/>`;
        if (sel) s += txt((x(a) + x(b)) / 2, y - 6, `${Math.round(Math.log10(b / a))} powers of ten apart`, { size: 10, anchor: "middle", fill: C.darkTeal, weight: 600 });
      }
    }
    for (const p of pts) {
      if (!(p.v > 0)) continue;
      s += `<circle cx="${x(p.v)}" cy="${y}" r="${sel ? 7 : 5.5}" fill="${TERM_COL[p.k]}" stroke="${C.surface}" stroke-width="1.2"/>`;
    }
    if (sel) {
      // labels, nudged apart when two dots sit close together
      const lab = pts.filter((p) => p.v > 0).map((p) => ({ k: p.k, X: x(p.v) })).sort((u, v) => u.X - v.X);
      for (let j = 1; j < lab.length; j++) if (lab[j].X - lab[j - 1].X < 18) { lab[j - 1].X -= 7; lab[j].X += 7; }
      for (const L of lab) s += txt(L.X, y + 21, L.k, { size: 9.5, anchor: "middle", weight: 700, fill: TERM_COL[L.k] });
    }
  });
  s += `</svg>`;
  return s;
}

// Z2. The race on each rung: transfer time against loss time, in seconds.
export function raceSvg(r, w = 900, bareR = null) {
  const rungs = r.rungs;
  const h = 120 + rungs.length * 52 + 96;
  const m = { l: 200, r: 150, t: 78, b: 110 };
  const vals = rungs.flatMap((x) => [x.tauTransfer, x.tauLoss]).filter((v) => v > 0 && Number.isFinite(v));
  const lo = Math.min(0.1, ...vals) / 2, hi = Math.max(1e12, ...vals) * 2;
  const x = logAxis(lo, hi, m.l, w - m.r);
  let s = svgOpen(w, h, "Transfer time against loss time on each rung");
  s += txt(14, 22, "Inside T2: on every rung, passing on races falling apart", { size: 14, weight: 600 });
  s += txt(14, 39, `${r.scenario.name}, ${Math.round(r.tempC)} C. The wider the gap between the bars, the safer the step.`, { size: 10.5, fill: C.muted });
  s += `<rect x="14" y="52" width="18" height="9" fill="${C.teal}"/>` + txt(38, 61, "time to pass on (transfer)", { size: 10.5 });
  s += `<rect x="214" y="52" width="18" height="9" fill="${C.terra}" opacity="0.55"/>` + txt(238, 61, "time it survives (loss)", { size: 10.5 });
  for (const [v, lab] of LANDMARKS) {
    if (v < lo || v > hi) continue;
    s += `<line x1="${x(v)}" y1="${m.t - 6}" x2="${x(v)}" y2="${m.t + rungs.length * 52}" stroke="${C.border}" stroke-width="0.8"/>`;
    s += txt(x(v), m.t + rungs.length * 52 + 14, lab, { size: 9.5, anchor: "end", fill: C.muted, rotate: -30 });
  }
  s += txt(w - m.r + 10, m.t - 8, "chance it passes", { size: 10, fill: C.muted, weight: 600 });
  rungs.forEach((g, i) => {
    const y = m.t + i * 52 + 8;
    s += txt(m.l - 12, y + 10, `${g.rung}${g.handoff ? ", " + g.handoff.id : ""}`, { size: 11.5, anchor: "end", weight: 700 });
    s += txt(m.l - 12, y + 24, g.handoff ? String(g.handoff.species_and_handoff || "").slice(0, 32) : "no rate gate", { size: 9.5, anchor: "end", fill: C.muted });
    if (!g.handoff) { s += txt(m.l + 6, y + 16, "no rate gate on this rung, it always passes", { size: 10.5, fill: C.muted }); return; }
    const xt = x(g.tauTransfer), xl = x(g.tauLoss);
    s += `<rect x="${m.l}" y="${y + 13}" width="${Math.max(1, xl - m.l)}" height="13" fill="${C.terra}" opacity="0.55"/>`;
    s += `<rect x="${m.l}" y="${y}" width="${Math.max(1, xt - m.l)}" height="13" fill="${C.teal}"/>`;
    s += txt(xt + 5, y + 10, humanTime(g.tauTransfer), { size: 10, fill: C.darkTeal, weight: 600 });
    s += txt(xl + 5, y + 24, humanTime(g.tauLoss), { size: 10, fill: C.terra });
    const pTxt = g.p > 0.9999 ? "0.9999+" : g.p > 0.001 ? g.p.toFixed(4) : fmtSci(g.p);
    s += txt(w - m.r + 10, y + 16, "p " + pTxt, { size: 11, weight: 700, fill: g.p < 0.1 ? C.fail : C.text, mono: true });
    const b = bareR && bareR.rungs[i];
    if (b && b.handoff && Math.abs(b.p - g.p) > 1e-6) s += txt(w - m.r + 10, y + 29, "bare " + (b.p > 0.001 ? b.p.toFixed(4) : fmtSci(b.p)), { size: 9.5, fill: C.muted, mono: true });
  });
  // linear clock of T2 underneath
  const ys = h - 48;
  const tot = rungs.reduce((a, g) => a + (g.tauTransfer || 0), 0);
  s += txt(14, ys - 10, `T2 is these teal times laid end to end: ${humanTime(tot)} before any scale factor. Drawn to scale, normal clock time.`, { size: 11, weight: 600 });
  let cx = 14;
  const cw = w - 28;
  const cols = [C.teal, C.darkTeal, C.cyan, C.olive, C.gold, C.mauve, C.brown];
  rungs.forEach((g, i) => {
    if (!(g.tauTransfer > 0) || !(tot > 0)) return;
    const ww = (g.tauTransfer / tot) * cw;
    s += `<rect x="${cx}" y="${ys}" width="${Math.max(0.5, ww)}" height="20" fill="${cols[i % cols.length]}" stroke="${C.surface}" stroke-width="1"/>`;
    if (ww > 60) s += txt(cx + ww / 2, ys + 14, `${g.rung} ${humanTime(g.tauTransfer)}`, { size: 10, anchor: "middle", fill: i % cols.length === 2 || i % cols.length === 4 ? C.text : C.surface, weight: 600 });
    cx += ww;
  });
  s += txt(14, ys + 36, "0", { size: 10, fill: C.muted, mono: true }) + txt(w - 14, ys + 36, humanTime(tot), { size: 10, fill: C.muted, anchor: "end", mono: true });
  s += `</svg>`;
  return s;
}

// Z3. The filter: how many of a large number of tries survive each rung.
export function funnelSvg(r, w = 900, bareR = null, start = 1e6) {
  const rungs = r.rungs.filter((g) => g.handoff);
  const steps = [{ lab: "tries", v: start, vb: start }];
  let v = start, vb = start;
  rungs.forEach((g, i) => {
    v *= g.p;
    const bg = bareR ? bareR.rungs.find((x) => x.rung === g.rung) : null;
    vb *= bg ? bg.p : g.p;
    steps.push({ lab: g.rung + " " + g.handoff.id, v, vb, p: g.p });
  });
  const h = 360;
  const m = { l: 70, r: 20, t: 70, b: 56 };
  const pw = w - m.l - m.r, ph = h - m.t - m.b;
  const minV = Math.max(1e-6, Math.min(...steps.map((s2) => Math.min(s2.v, s2.vb))));
  const lo = Math.pow(10, Math.floor(Math.log10(minV))), hi = start * 1.5;
  const y = (val) => m.t + ph - ((Math.log10(Math.max(lo, val)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * ph;
  let s = svgOpen(w, h, "How many tries survive each rung");
  s += txt(14, 22, `The filter: of ${fmtSci(start)} tries, how many get through each rung`, { size: 14, weight: 600 });
  s += txt(14, 39, bareR ? "Filled bars are with the chosen surface, outlines are the same run on bare rock. Each step down is a factor of ten." : "Each step down is a factor of ten.", { size: 10.5, fill: C.muted });
  for (let e = Math.log10(lo); e <= Math.log10(start) + 1e-9; e++) {
    s += `<line x1="${m.l}" y1="${y(10 ** e)}" x2="${m.l + pw}" y2="${y(10 ** e)}" stroke="${C.border}" stroke-width="0.6"/>`;
    s += txt(m.l - 8, y(10 ** e) + 4, e === 0 ? "1" : "10^" + e, { size: 10, anchor: "end", fill: C.muted, mono: true });
  }
  const bw = pw / steps.length;
  steps.forEach((st, i) => {
    const bx = m.l + i * bw + bw * 0.18, bwid = bw * 0.64;
    const yv = y(st.v);
    s += `<rect x="${bx}" y="${yv}" width="${bwid}" height="${m.t + ph - yv}" fill="${i === 0 ? C.darkTeal : C.teal}"/>`;
    if (bareR && Math.abs(st.vb - st.v) / st.v > 1e-3) {
      const yb = y(st.vb);
      s += `<rect x="${bx}" y="${yb}" width="${bwid}" height="${m.t + ph - yb}" fill="none" stroke="${C.terra}" stroke-width="1.6" stroke-dasharray="4 2"/>`;
    }
    s += txt(bx + bwid / 2, Math.min(yv, bareR ? y(st.vb) : yv) - 6, st.v >= 1 ? Math.round(st.v).toLocaleString("en-GB") : fmtSci(st.v), { size: 10, anchor: "middle", weight: 600, mono: true });
    s += txt(bx + bwid / 2, m.t + ph + 16, st.lab, { size: 10.5, anchor: "middle", weight: 600 });
    if (st.p != null) s += txt(bx + bwid / 2, m.t + ph + 30, "x " + (st.p > 0.9999 ? "0.9999+" : st.p > 0.001 ? st.p.toFixed(3) : fmtSci(st.p)), { size: 9.5, anchor: "middle", fill: C.muted, mono: true });
  });
  s += `</svg>`;
  return s;
}

// Z4. T3 against the joint chance of passing every rung, one line per scenario.
export function t3CurveSvg(results, env, params, w = 900, selIdx = 0) {
  const h = 420;
  const m = { l: 74, r: 215, t: 66, b: 56 };
  const pw = w - m.l - m.r, ph = h - m.t - m.b;
  const pLo = 1e-24, pHi = 1;
  const tLo = 1e-3, tHi = 1e19;
  const x = logAxis(pLo, pHi, m.l, m.l + pw);
  const y = (t) => m.t + ph - ((Math.log10(Math.min(tHi, Math.max(tLo, t))) - Math.log10(tLo)) / (Math.log10(tHi) - Math.log10(tLo))) * ph;
  let s = svgOpen(w, h, "Waiting time T3 against the joint chance of passing");
  s += txt(14, 22, "T3 grows as the chance of passing every rung shrinks", { size: 14, weight: 600 });
  s += txt(14, 39, `T3 = successes needed x cycle period / (joint p x number of sites). ${params.successesNeeded === 1 ? "One success" : fmtSci(params.successesNeeded) + " successes"} needed. Dots are where each scenario sits now.`, { size: 10.5, fill: C.muted });
  for (const [v, lab] of LANDMARKS) {
    if (v < tLo || v > tHi) continue;
    s += `<line x1="${m.l}" y1="${y(v)}" x2="${m.l + pw}" y2="${y(v)}" stroke="${C.border}" stroke-width="0.7"/>`;
    s += txt(m.l - 8, y(v) + 4, lab, { size: 9.5, anchor: "end", fill: C.muted });
  }
  const bud = env.budgetMyr * 1e6 * S_YR;
  if (bud > 0) {
    s += `<rect x="${m.l}" y="${m.t}" width="${pw}" height="${Math.max(0, y(bud) - m.t)}" fill="${C.fail}" opacity="0.07"/>`;
    s += `<line x1="${m.l}" y1="${y(bud)}" x2="${m.l + pw}" y2="${y(bud)}" stroke="${C.fail}" stroke-width="1.3" stroke-dasharray="4 3"/>`;
    s += txt(m.l + 6, y(bud) - 6, "budget " + fmtMyr(env.budgetMyr) + " Myr. Above this line T3 alone is too long", { size: 10, fill: C.fail, weight: 600 });
  }
  for (let e = -24; e <= 0; e += 4) {
    s += `<line x1="${x(10 ** e)}" y1="${m.t + ph}" x2="${x(10 ** e)}" y2="${m.t + ph + 5}" stroke="${C.muted}"/>`;
    s += txt(x(10 ** e), m.t + ph + 18, e === 0 ? "1" : "10^" + e, { size: 10, anchor: "middle", fill: C.muted, mono: true });
  }
  s += txt(m.l + pw / 2, h - 14, "joint chance of passing every rung, p", { size: 11, anchor: "middle", fill: C.muted, weight: 600 });
  const cols = [C.teal, C.terra, C.darkTeal, C.gold, C.mauve, C.olive, C.brown];
  const labels = [];
  results.forEach((r, i) => {
    const k = params.successesNeeded * r.tCycleS / r.nSites; // T3 in seconds = k / p
    const sel = i === selIdx;
    const col = cols[i % cols.length];
    const a = [pLo, k / tHi].reduce((u, v) => Math.max(u, v)), b = pHi;
    s += `<line x1="${x(a)}" y1="${y(k / a)}" x2="${x(b)}" y2="${y(k / b)}" stroke="${col}" stroke-width="${sel ? 3 : 1.4}" opacity="${sel ? 1 : 0.55}"/>`;
    const t3s = r.t3 * 1e6 * S_YR;
    s += `<circle cx="${x(Math.max(pLo, r.pJoint))}" cy="${y(t3s)}" r="${sel ? 7 : 5}" fill="${col}" stroke="${C.surface}" stroke-width="1.4"/>`;
    labels.push({ y: y(k) + 4, name: r.scenario.name, col, sel });
    if (sel && bud > 0) {
      const pStar = k / bud;
      if (pStar > pLo && pStar < 1) {
        s += `<line x1="${x(pStar)}" y1="${y(bud)}" x2="${x(pStar)}" y2="${m.t + ph}" stroke="${col}" stroke-width="1" stroke-dasharray="2 3"/>`;
        s += txt(x(pStar) + 4, m.t + ph - 8, "p " + fmtSci(pStar) + " fills the budget", { size: 10, fill: col, weight: 600 });
      }
    }
  });
  for (const L of spread(labels, 12, m.t + 4, m.t + ph)) s += txt(m.l + pw + 8, L.y, L.name, { size: 10, fill: L.col, weight: L.sel ? 700 : 400 });
  s += `</svg>`;
  return s;
}

export function downloadSvg(svgString, filename) {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(URL.createObjectURL(blob), filename);
}

export async function downloadPng(svgString, filename, scale = 2) {
  try {
    const m = svgString.match(/width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/);
    const w = m ? parseFloat(m[1]) : 900, h = m ? parseFloat(m[2]) : 600;
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const cv = document.createElement("canvas");
    cv.width = w * scale; cv.height = h * scale;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = C.surface; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const out = cv.toDataURL("image/png");
    triggerDownload(out, filename);
    return true;
  } catch (e) {
    downloadSvg(svgString, filename.replace(/\.png$/, ".svg"));
    return false;
  }
}

export function downloadText(text, filename, mime = "text/plain") {
  const blob = new Blob([text], { type: mime + ";charset=utf-8" });
  triggerDownload(URL.createObjectURL(blob), filename);
}

function triggerDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); if (href.startsWith("blob:")) URL.revokeObjectURL(href); }, 1500);
}

export { geomean };
