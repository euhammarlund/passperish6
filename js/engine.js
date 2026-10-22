// Engine. Every number the app shows is produced here, so the chain from a
// parameter to a duration can be traced in one file.

export const R_GAS = 8.314; // J per mol per K
const TREF_K = 298.15; // 25 C, the temperature at which the tabulated tau values apply
const SEC_PER_YR = 3.15576e7;
const SEC_PER_MYR = SEC_PER_YR * 1e6;

export const secPerYr = SEC_PER_YR;
export const secPerMyr = SEC_PER_MYR;

export const geomean = (a, b) => Math.sqrt(a * b);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------------- temperature ---------------- */

// tau(T) = tau(Tref) * exp( (Ea/R) * (1/T - 1/Tref) ).
// Cooling below Tref makes 1/T larger, so tau grows. Heating shrinks it.
export function arrhenius(tau, tempC, EaKJ) {
  const T = tempC + 273.15;
  if (T <= 0) return Infinity;
  return tau * Math.exp((EaKJ * 1000 / R_GAS) * (1 / T - 1 / TREF_K));
}

// Activation energy derived from two measured half-lives of the same reaction.
// Used in the app for RNA phosphodiester hydrolysis: 4 yr at 25 C, 9 days at 100 C.
export function eaFromTwoPoints(tau1, t1C, tau2, t2C) {
  const T1 = t1C + 273.15, T2 = t2C + 273.15;
  return (R_GAS * Math.log(tau1 / tau2)) / (1 / T1 - 1 / T2) / 1000; // kJ per mol
}

// Illustrative Hadean cooling curve. Tier C. Log-linear interpolation in
// temperature between editable anchor points, which are ages in Ga.
export function tempAtAge(anchors, ageGa) {
  const a = [...anchors].sort((x, y) => y.age - x.age); // oldest first
  if (ageGa >= a[0].age) return a[0].t;
  if (ageGa <= a[a.length - 1].age) return a[a.length - 1].t;
  for (let i = 0; i < a.length - 1; i++) {
    const p = a[i], q = a[i + 1];
    if (ageGa <= p.age && ageGa >= q.age) {
      const f = (p.age - ageGa) / (p.age - q.age);
      return Math.exp(Math.log(p.t) * (1 - f) + Math.log(q.t) * f);
    }
  }
  return a[a.length - 1].t;
}

// Oldest age at which the surface was already at or below a chosen temperature.
export function ageAtTemp(anchors, tempC) {
  const a = [...anchors].sort((x, y) => y.age - x.age);
  if (tempC >= a[0].t) return a[0].age;
  if (tempC <= a[a.length - 1].t) return a[a.length - 1].age;
  for (let i = 0; i < a.length - 1; i++) {
    const p = a[i], q = a[i + 1];
    if (tempC <= p.t && tempC >= q.t) {
      const f = (Math.log(p.t) - Math.log(tempC)) / (Math.log(p.t) - Math.log(q.t));
      return p.age - f * (p.age - q.age);
    }
  }
  return a[a.length - 1].age;
}

/* ---------------- envelope ---------------- */

export function computeEnvelope(p) {
  let nearGa, nearLabel, nearBasis;
  if (p.nearMode === "temperature") {
    nearGa = ageAtTemp(p.coolingAnchors, p.startTempC);
    nearLabel = "Surface at or below " + p.startTempC + " C";
    nearBasis = "Read off the cooling curve, which is Tier C and illustrative.";
  } else if (p.nearMode === "build") {
    const b = buildStart(p);
    nearGa = b.startGa;
    nearLabel = "Built from accretion and volatiles";
    nearBasis = `Moon-forming impact at ${b.moonGa.toFixed(2)} Ga, then ${fmtMyr(b.solid)} Myr for the surface to solidify, then ${fmtMyr(b.wait)} Myr until the surface is clement (${b.limiting === "resupply" ? "set by volatiles being re-supplied" : "set by CO2 being taken back into the rock"}).`;
  } else if (p.nearMode === "manual") {
    nearGa = p.nearManualGa;
    nearLabel = "Set by hand";
    nearBasis = "Typed in directly.";
  } else {
    const ev = p.nearOptions.find((o) => o.id === p.nearEventId) || p.nearOptions[0];
    nearGa = ev.age;
    nearLabel = ev.label;
    nearBasis = ev.basis;
  }
  let farGa, farLabel, farBasis;
  if (p.farMode === "manual") {
    farGa = p.farManualGa;
    farLabel = "Set by hand";
    farBasis = "Typed in directly.";
  } else {
    const ev = p.farOptions.find((o) => o.id === p.farEventId) || p.farOptions[0];
    farGa = ev.age;
    farLabel = ev.label;
    farBasis = ev.basis;
  }
  const budgetMyr = (nearGa - farGa) * 1000;
  const tempAtNear = tempAtAge(p.coolingAnchors, nearGa);
  return {
    nearGa, farGa, nearLabel, farLabel, nearBasis, farBasis,
    budgetMyr,
    valid: budgetMyr > 0,
    tempAtNear,
    workingTempC: p.tempMode === "curve" ? tempAtNear : p.chemTempC,
    build: p.nearMode === "build" ? buildStart(p) : null,
  };
}

/* ---------------- version 7: the start of the clock, from accretion and volatiles ---------------- */
// The start is built from three clocks after the last giant impact:
//   start = Moon-forming impact age - (surface solidifies + the later of: CO2 taken back into the rock,
//           volatiles re-supplied by late accretion).
// The two waits run at the same time after the surface solidifies, so the later one sets the start.
// Re-supply only applies when the accretion path loses its volatiles in giant impacts.
export const ACCRETION_PATHS = {
  pebble: {
    label: "Pebble accretion", keeps: true, stars: 2,
    plain: "Earth grows within about 3 to 5 Myr from millimetre pebbles drifting in the gas disc. Icy pebbles from beyond the snowline bring water and carbon in while Earth grows, so most volatiles are built in and kept. Only the Moon-forming impact comes later.",
    refs: ["Johansen et al. 2021", "Onyett et al. 2023", "Johansen et al. 2023"],
  },
  collisional_kept: {
    label: "Slow growth, volatiles kept", keeps: true, stars: 2,
    plain: "Earth grows over 30 to 100 Myr by collisions between planetesimals and embryos. Most water arrives before the last giant impact and much of it survives in the mantle, so nothing has to be re-supplied.",
    refs: ["Jacobsen 2005", "Nature Reviews 2022 on the accretion of Earth"],
  },
  collisional_lost: {
    label: "Slow growth, volatiles lost and re-supplied", keeps: false, stars: 1,
    plain: "Earth grows over 30 to 100 Myr by collisions, and the giant impacts strip much of the atmosphere and surface water. Volatiles must come back from late accretion, so the start waits for enough of that late material to arrive.",
    refs: ["Jacobsen 2005", "Abramov et al. 2026 (impact chronology)"],
  },
};
// Late accretion after the last giant impact follows a stretched exponential, as in the impact
// chronology used by Abramov et al. 2026 (after Brasser et al.): N(t) ~ exp(-(t / tau)^beta).
export const LATE_ACCRETION = { tauMyr: 47, beta: 0.8 };
export function resupplyMyr(share) {
  const f = Math.min(Math.max(share, 1e-6), 0.999);
  return LATE_ACCRETION.tauMyr * Math.pow(-Math.log(1 - f), 1 / LATE_ACCRETION.beta);
}
export function buildStart(p) {
  const path = ACCRETION_PATHS[p.accretionPath] || ACCRETION_PATHS.pebble;
  const solid = Math.max(0, p.solidifyMyr);
  const draw = Math.max(0, p.co2DrawdownMyr);
  const resup = path.keeps ? 0 : resupplyMyr(p.lateShare);
  const wait = Math.max(draw, resup);
  const startGa = p.moonAgeGa - (solid + wait) / 1000;
  return { path, moonGa: p.moonAgeGa, solid, draw, resup, wait, limiting: resup > draw ? "resupply" : "drawdown", startGa };
}
// Evidence the start can be checked against. Ages in Ga.
export const START_EVIDENCE = [
  { id: "zircon_water", age: 4.404, label: "Oldest zircon with a liquid-water signal", stars: 2, ref: "Wilde et al. 2001; Mojzsis et al. 2001", plain: "Heavy oxygen in a 4.40 Ga Jack Hills zircon points to crust that had been in contact with liquid water. One grain, so the date is a minimum for water somewhere, not for oceans everywhere." },
  { id: "no_sterilize", age: 4.40, label: "End of global sterilising impacts", stars: 1, ref: "Abramov et al. 2026", plain: "Impact models find that the near surface was not sterilised as a whole after about 4.4 Ga." },
  { id: "oceans", age: 4.30, label: "Water widely present", stars: 2, ref: "Mojzsis et al. 2001; Cavosie et al. 2005", plain: "Several zircons from 4.3 Ga onward carry the signal of low-temperature water, so oceans or at least widespread water are generally accepted by then." },
  { id: "sweet_spot", age: 4.33, label: "Middle of the RNA-chemistry sweet spot", stars: 1, ref: "Abramov et al. 2026", plain: "Impact-made hot springs and crater lakes are most abundant between about 4.4 and 4.2 Ga, with a middle at about 4.33 Ga." },
  { id: "fresh_land", age: 4.00, label: "Fresh water and emerged land", stars: 2, ref: "Gamaleldien et al. 2024", plain: "Very light oxygen in zircons near 4.0 Ga needs rain water on land, so dry land and a fresh water cycle existed by then." },
];

/* ---------------- version 7: boron, the ribose step ---------------- */
// Borate binds ribose and slows its loss. Furukawa et al. 2013, 45 C, pH 12: k = 0.032 per min without
// borate, 0.015 at 40 mM and 0.002 at 80 mM, so the survival time grows 2.1 and 16 times. Benner et al. 2010
// report about 48 times for branched pentoses at 40 mM. Seawater today has about 0.4 mM, too little to matter.
export const BORATE_LEVELS = {
  none: { factor: 1, label: "No borate, or seawater level", plain: "About 0.4 mM, as in seawater today. Too little to change how long ribose lasts." },
  b40: { factor: 2.1, label: "40 mM", plain: "Furukawa et al. 2013: ribose lasts 2.1 times longer." },
  b80: { factor: 16, label: "80 mM", plain: "Furukawa et al. 2013: ribose lasts 16 times longer." },
  branched: { factor: 48, label: "Upper bound, 48 times", plain: "Benner et al. 2010 saw about 48 times for branched pentoses at 40 mM. Not ribose, so an upper bound." },
};
export function borateFor(sc, p) {
  const applies = p.borateWhere === "all" || !!sc.borate_concentrates;
  let factor = applies ? Math.max(1, p.borateFactor) : 1;
  // Version 8: borate minerals come from felsic (granite-like) crust (Grew et al. 2011). With the
  // link on, the gain is scaled by the felsic share relative to today's upper crust, about 0.7.
  let felsic = null;
  if (applies && p.crustSetsBoron === "on") {
    felsic = felsicAt(p, chemAgeFor(p));
    factor = 1 + (factor - 1) * Math.min(1, felsic / 0.7);
  }
  return { applies, factor, felsic };
}

/* ---------------- version 7: delivery from space as a shortcut ---------------- */
// A delivery adds a second, parallel route. Each delivery event into a receiving site gives a window of
// m = window / T_cycle tries in which the steps it covers are already done (chance 1). The rest must
// still pass. Successes per second = in-place tries * p_joint + deliveries per second * q,
// with q = 1 - (1 - p_rest)^m. Pearce et al. 2017: about 15 to 3,840 meteorite deliveries into warm
// little ponds over the Hadean, which is about 0.02 to 11 per Myr; each stays usable for 0.5 to 7 years.
export const DELIVERY_SOURCES = {
  none: { label: "No delivery", covers: [], stars: 0, plain: "Everything is made in place." },
  meteorite: {
    label: "Meteorites into ponds", covers: ["S2", "S2r"], stars: 2,
    plain: "Carbonaceous meteorites bring nucleobases, and some ribose, ready made. In a pond they replace the nitrogen step (S2) and the ribose step if it is on. Phosphate, sorting, making more and copying still have to happen in place.",
    refs: ["Pearce et al. 2017", "Glavin et al. 2025", "Furukawa et al. 2025"],
  },
  interstellar: {
    label: "Interstellar organics and peptides", covers: ["S4"], stars: 1,
    plain: "Amino acids and short peptides form on cold dust and ice before the Solar System, and some reach Earth inside meteorites and comets. Here they stand in for the carbon step (S4): ready-made organic carbon instead of CO2 pulled out on a sulfide surface.",
    refs: ["Ioppolo et al. 2021", "Krasnokutski et al. 2022", "InterCat 2026 (glycylglycine in ice)"],
  },
  comet: {
    label: "Comet HCN", covers: [], stars: 2,
    plain: "A comet can leave HCN in local ponds for up to millions of years. That changes access at S0 (getting the element) but none of the rates, so the totals do not move.",
    refs: ["Todd and Oberg 2020"],
  },
};
export function deliveryFor(sc, p) {
  const src = DELIVERY_SOURCES[p.deliverySource] || DELIVERY_SOURCES.none;
  const covers = Array.isArray(p.deliveryCovers) ? p.deliveryCovers : src.covers;
  const receives = p.deliveryWhere === "all" || !!sc.receives_delivery;
  return { src, covers, receives, on: p.deliverySource !== "none" && receives && covers.length > 0 };
}

/* ---------------- chemistry to probability ---------------- */

// Da = tau_loss / tau_transfer. p = Da / (1 + Da). This is the handoff criterion
// restated as a probability, not an extra assumption.
export function handoffState(h, tempC, eaTransfer, eaLoss) {
  const ttRef = geomean(h.tau_transfer_low_s, h.tau_transfer_high_s);
  const tlRef = geomean(h.tau_loss_low_s, h.tau_loss_high_s);
  const tt = arrhenius(ttRef, tempC, eaTransfer);
  const tl = arrhenius(tlRef, tempC, eaLoss);
  const da = tl / tt;
  const p = da / (1 + da);
  const l = Math.log10(da);
  let verdict = "marginal, on the diagonal", cls = "v-marginal";
  if (l >= 2) { verdict = "clear pass"; cls = "v-pass"; }
  else if (l >= 1) { verdict = "pass, narrow margin"; cls = "v-pass"; }
  else if (l <= -1) { verdict = "perish"; cls = "v-fail"; }
  return { tauTransferRef: ttRef, tauLossRef: tlRef, tauTransfer: tt, tauLoss: tl, da, p, logDa: l, verdict, verdictClass: cls };
}

// Same as handoffState, but with multipliers on the two times, applied after the
// temperature correction. Used by the mineral surface layer.
export function handoffStateScaled(h, tempC, eaTransfer, eaLoss, mTransfer = 1, mLoss = 1) {
  const base = handoffState(h, tempC, eaTransfer, eaLoss);
  if (mTransfer === 1 && mLoss === 1) return { ...base, mTransfer: 1, mLoss: 1, base };
  const tt = base.tauTransfer * mTransfer;
  const tl = base.tauLoss * mLoss;
  const da = tl / tt;
  const pp = da / (1 + da);
  const l = Math.log10(da);
  let verdict = "marginal, on the diagonal", cls = "v-marginal";
  if (l >= 2) { verdict = "clear pass"; cls = "v-pass"; }
  else if (l >= 1) { verdict = "pass, narrow margin"; cls = "v-pass"; }
  else if (l <= -1) { verdict = "perish"; cls = "v-fail"; }
  return { ...base, tauTransfer: tt, tauLoss: tl, da, p: pp, logDa: l, verdict, verdictClass: cls, mTransfer, mLoss, base };
}

/* ---------------- mineral surfaces, S2 to S4 ---------------- */

// Phosphate is the model adsorbate. All affinities in litres per micromole.
// Returns how strongly the surface holds, how much it protects and how much it
// gathers, plus the three rung multipliers. Every step is written out so the UI
// can show it.
export const SURFACE_RUNGS = ["S2", "S3", "S4"];

// Version 8: one mineral, the core of the surface layer. Salinity, temperature and confinement
// act here. With salinity 35 g per kg, no heat of adsorption and no confinement, the numbers are
// exactly those of version 7.
function oneMineral(mineral, pH, loading, p, tempC) {
  const C = p.phosphateUM;
  const kDirect0 = mineral.k7_l_umol * Math.pow(10, mineral.ph_slope * (7 - pH));
  const negFrac = 1 / (1 + Math.pow(10, mineral.pzc - pH));
  const bridgeSat = p.divalentMM / (p.divalentMM + p.bridgeHalfMM);
  // Salt screens the repulsion between a negative surface and a negative phosphate group, and
  // helps cations bridge. Sand et al. 2024: seawater salinity raises DNA adsorption. Tier C: the
  // square root of salinity relative to seawater (35 g per kg).
  const sal = p.salinityGkg != null ? p.salinityGkg : 35;
  const salF = Math.sqrt(Math.max(sal, 0.1) / 35);
  // Heat of adsorption (van 't Hoff). Zero by default, so temperature does not change binding.
  const dH = p.adsDH || 0;
  const T = (tempC != null ? tempC : 25) + 273.15;
  const tF = dH ? Math.exp(-(dH * 1000 / R_GAS) * (1 / T - 1 / TREF_K)) : 1;
  const kDirect = kDirect0 * tF;
  const kBridge = p.bridgeK * bridgeSat * negFrac * salF * tF;
  const K = kDirect + kBridge;
  const theta = (K * C) / (1 + K * C);
  const qmax = mineral.gmax_umol_m2 * mineral.ssa_m2_g;
  const kd = (qmax * K) / (1 + K * C);
  const x = kd * loading;
  const pf0 = 1 + (p.protectionFactor - 1) / (1 + K / p.damageK);
  return { mineral, kDirect, kBridge, bridgeSat, salF, tF, K, negFrac, theta, qmax, kd, x, pf0 };
}

export function surfaceState(mineral, cond, p) {
  const comps = mineral && Array.isArray(mineral.components) ? mineral.components.filter((c) => c.w > 0 && c.mineral && c.mineral.ssa_m2_g > 0) : null;
  const none = comps ? comps.length === 0 : (!mineral || mineral.id === "none" || !(mineral.ssa_m2_g > 0));
  const pH = cond.pH, loading = cond.loading;
  if (none) {
    return { none: true, mineral, pH, loading, kDirect: 0, kBridge: 0, K: 0, negFrac: 0, theta: 0, qmax: 0, kd: 0, x: 0,
      fBound: 0, cf: 1, pfEff: 1, lossGain: 1, s4Gain: 1, parts: [],
      mult: { S2: { t: 1, l: 1 }, S3: { t: 1, l: 1 }, S4: { t: 1, l: 1 } } };
  }
  const tempC = cond.tempC != null ? cond.tempC : p.effectiveTempC;
  // Confinement: the share of bound molecules held in interlayers, pores or edge sites.
  // More protection, less activity. Zero by default.
  const c = Math.min(1, Math.max(0, p.confinement || 0));
  const confPF = 1 + c * ((p.confProtect || 1) - 1);
  const confAct = 1 - c * (1 - (p.confActivity != null ? p.confActivity : 1));
  const list = comps ? comps : [{ mineral, w: 1 }];
  const wsum = list.reduce((a, b) => a + b.w, 0);
  const parts = list.map((cpt) => {
    const o = oneMineral(cpt.mineral, pH, loading * (cpt.w / wsum), p, tempC);
    return { ...o, w: cpt.w / wsum, pfEff: o.pf0 * confPF };
  });
  let x = 0, xPf = 0, xTh = 0, s4x = 0, K = 0, kDirect = 0, kBridge = 0, negFrac = 0, theta = 0, qmax = 0, kd = 0;
  for (const q of parts) {
    x += q.x; xPf += q.x * q.pfEff; xTh += q.x * q.theta;
    s4x += q.x * (1 - q.theta) * (1 - q.mineral.f_locked) * confAct;
    K += q.w * q.K; kDirect += q.w * q.kDirect; kBridge += q.w * q.kBridge; negFrac += q.w * q.negFrac;
    theta += q.w * q.theta; qmax += q.w * q.qmax; kd += q.w * q.kd;
  }
  const single = parts.length === 1 ? parts[0] : null;
  const fBound = x / (1 + x);
  const cf = 1 + x;
  const pfEff = single ? single.pfEff : (x > 0 ? xPf / x : 1);
  const lossGain = (1 - fBound) + fBound * pfEff;
  const s4Gain = single ? 1 + (cf - 1) * (1 - single.theta) * (1 - single.mineral.f_locked) * confAct : 1 + s4x;
  return {
    none: false, mineral, pH, loading, kDirect: single ? single.kDirect : kDirect, kBridge: single ? single.kBridge : kBridge,
    bridgeSat: parts[0].bridgeSat, salF: parts[0].salF, tF: parts[0].tF,
    K: single ? single.K : K, negFrac: single ? single.negFrac : negFrac, theta: single ? single.theta : theta,
    qmax: single ? single.qmax : qmax, kd: single ? single.kd : kd, x,
    fBound, cf, pfEff, lossGain, s4Gain, confinement: c, confPF, confAct, parts,
    mult: {
      S2: { t: 1, l: lossGain },
      S3: { t: 1 / cf, l: lossGain },
      S4: { t: 1 / s4Gain, l: lossGain },
    },
  };
}

// Multipliers for one handoff on one rung. If the handoff already assumes a
// surface, apply the ratio chosen / reference, so the surface is not counted twice.
export function surfaceMultipliers(h, rungId, sChosen, model, cond, p) {
  if (!SURFACE_RUNGS.includes(rungId) || !p.surfaceRungs || !p.surfaceRungs[rungId]) return { t: 1, l: 1, ref: null, applied: false };
  const mc = sChosen.mult[rungId];
  if (h && h.surface_reference) {
    const refMin = (model.minerals || []).find((m) => m.id === h.surface_reference);
    const sRef = surfaceState(refMin, cond, p);
    const mr = sRef.mult[rungId];
    return { t: mc.t / mr.t, l: mc.l / mr.l, ref: refMin ? refMin.name : h.surface_reference, applied: true };
  }
  return { t: mc.t, l: mc.l, ref: null, applied: !sChosen.none };
}

// Which surface and conditions apply to a scenario under the current mode.
export function surfaceForScenario(sc, p, model) {
  const mins = model.minerals || [];
  if (p.surfaceMode === "off") return { mineral: mins.find((m) => m.id === "none"), cond: { pH: 7, loading: 0 }, off: true };
  if (p.surfaceMode === "one") {
    return { mineral: mins.find((m) => m.id === p.surfaceMineral) || mins[0], cond: { pH: p.surfacePH, loading: p.surfaceLoading } };
  }
  if (p.surfaceMode === "mix") {
    return { mineral: mixMineral(p.mineralMix, mins, "Your mineral mix"), cond: { pH: p.surfacePH, loading: p.surfaceLoading } };
  }
  const o = (p.scenarioSurface && p.scenarioSurface[sc.id]) || {};
  if (p.crustSetsMix === "on" && sc.requires_subaerial_land && !o.mineral) {
    const f = felsicAt(p, chemAgeFor(p));
    return { mineral: crustMix(f, mins), crust: f,
      cond: { pH: o.pH != null ? o.pH : (sc.surface_ph != null ? sc.surface_ph : 7), loading: o.loading != null ? o.loading : (sc.surface_loading_g_l != null ? sc.surface_loading_g_l : 1) } };
  }
  const id = o.mineral || sc.surface_mineral || "none";
  return {
    mineral: mins.find((m) => m.id === id) || mins[0],
    cond: { pH: o.pH != null ? o.pH : (sc.surface_ph != null ? sc.surface_ph : 7), loading: o.loading != null ? o.loading : (sc.surface_loading_g_l != null ? sc.surface_loading_g_l : 1) },
  };
}

/* ---------------- the five terms ---------------- */

// T4. Class 3. Crossing the error threshold, then fixing a trait in a population.
export function computeT4(p) {
  const genPerYr = SEC_PER_YR / p.generationTimeS;
  const gensToFix = p.genFixFactor * p.popSize; // neutral fixation scales with N
  const fixYr = gensToFix / genPerYr;
  const errorYr = p.errorThresholdMyr * 1e6;
  return {
    fixMyr: fixYr / 1e6,
    errorMyr: p.errorThresholdMyr,
    totalMyr: fixYr / 1e6 + p.errorThresholdMyr,
    genPerYr, gensToFix,
  };
}

// A whole scenario. Returns every intermediate so the UI can show the chain.
export function auditScenario(sc, p, model) {
  const temp = p.effectiveTempC;

  // T1. Setting availability. Scenario range, geometric mean, times the land factor.
  const landFactor = sc.requires_subaerial_land ? p.landUncertaintyFactor : 1;
  // Version 8: settings that need dry land can be given a later land start (Korenaga 2021).
  const landDelay = sc.requires_subaerial_land ? landDelayMyr(p) : 0;
  const t1 = geomean(sc.t1_low, sc.t1_high) * landFactor * p.t1Scale + landDelay;

  // The driving cycle, needed first because it can also pay for a step.
  const cycle = model.cycles.find((c) => c.name === p.cycleName);
  const tCycleS = cycle ? geomean(cycle.hadean_period_s_low, cycle.hadean_period_s_high) : 43200;

  // T2. Chemistry. Sum of temperature-corrected transfer times over the chosen rungs.
  const rungs = [];
  let t2Sec = 0, pJoint = 1;
  const surf = model.minerals ? surfaceForScenario(sc, p, model) : null;
  const sState = surf && !surf.off ? surfaceState(surf.mineral, surf.cond, p) : null;
  for (const rid of p.activeRungs) {
    const hid = p.rungHandoff[rid];
    const rung = model.rungs.find((r) => r.id === rid);
    if (!hid || hid === "none") {
      rungs.push({ rung: rid, rungName: rung ? rung.name : rid, handoff: null, p: 1, da: Infinity, tauTransfer: 0, verdict: "no rate gate", verdictClass: "v-pass" });
      continue;
    }
    const h = model.handoffs.find((x) => x.id === hid);
    if (!h) continue;
    const sm = sState ? surfaceMultipliers(h, rid, sState, model, surf.cond, p) : { t: 1, l: 1, ref: null, applied: false };
    const boost = p.hypoBoost && p.hypoBoost[rid] ? p.hypoBoost[rid] : 1;
    const st = handoffStateScaled(h, temp, p.eaTransfer, p.eaLoss, sm.t / boost, sm.l);
    const cur = cycleCurrency(h, st, cycle, tCycleS, p);
    if (cur.on) {
      t2Sec += cur.tauTransfer * cur.bonds;
      pJoint *= cur.p;
      rungs.push({ rung: rid, rungName: rung ? rung.name : rid, handoff: h, ...st,
        tauTransfer: cur.tauTransfer, tauLoss: cur.tauLoss, da: cur.da, logDa: Math.log10(cur.da), p: cur.p,
        verdict: cur.verdict, verdictClass: cur.verdictClass, surface: sm, pNoSurface: st.base.p, currency: cur, pClock: st.p });
      continue;
    }
    t2Sec += st.tauTransfer;
    pJoint *= st.p;
    rungs.push({ rung: rid, rungName: rung ? rung.name : rid, handoff: h, ...st, surface: sm, pNoSurface: st.base.p, currency: cur, pClock: st.p });
  }
  // Version 7: the ribose step (H6), kept longer by borate where borate can collect.
  let borate = null;
  if (p.riboseStep === "on" && p.activeRungs.includes("S2")) {
    const h = model.handoffs.find((x) => x.id === "H6");
    if (h) {
      borate = borateFor(sc, p);
      const bR = p.hypoBoost && p.hypoBoost.S2r ? p.hypoBoost.S2r : 1;
      const st = handoffStateScaled(h, temp, p.eaTransfer, p.eaLoss, 1 / bR, borate.factor);
      const noB = handoffStateScaled(h, temp, p.eaTransfer, p.eaLoss, 1, 1);
      t2Sec += st.tauTransfer;
      pJoint *= st.p;
      const at = rungs.findIndex((x) => x.rung === "S2");
      rungs.splice(at + 1, 0, { rung: "S2r", rungName: "ribose kept (the sugar step)", handoff: h, ...st,
        surface: { t: 1, l: 1, ref: null, applied: false }, pNoSurface: st.p, pNoBorate: noB.p, borate, extra: true, pClock: st.p });
    }
  }
  // Version 8: molecular build-up, from joined units to a chain of useful length.
  let buildup = null;
  if (p.buildupOn === "on" && p.activeRungs.includes("S5")) {
    buildup = buildupFor(sc, p, model, tCycleS);
    t2Sec += buildup.timeS;
    pJoint *= buildup.p;
    rungs.push({ rung: "S5b", rungName: "molecular build-up (to a useful length)", handoff: null, p: buildup.p,
      da: buildup.p >= 1 ? Infinity : buildup.p / (1 - buildup.p), logDa: Math.log10(buildup.p / Math.max(1e-300, 1 - buildup.p)),
      tauTransfer: buildup.timeS, verdict: buildup.p > 0.9 ? "clear pass" : (buildup.p > 0.5 ? "pass, narrow margin" : (buildup.p > 0.1 ? "marginal, on the diagonal" : "perish")),
      verdictClass: buildup.p > 0.5 ? "v-pass" : (buildup.p > 0.1 ? "v-marginal" : "v-fail"), buildup, extra: true, pClock: buildup.p,
      surface: { t: 1, l: 1, ref: null, applied: false } });
  }
  const tStep = (x) => (x.currency && x.currency.on ? x.currency.tauTransfer * x.currency.bonds : x.tauTransfer || 0);

  // T3. Coincidence waiting time.
  //   T3 = n_successes * T_cycle / (p_joint * N_sites)
  // Version 7: delivery adds a parallel route; see deliveryFor above.
  const nSites = geomean(sc.n_parallel_sites_low, sc.n_parallel_sites_high) * p.siteScale;
  const attemptsPerS = (pJoint * nSites) / tCycleS;
  const del = deliveryFor(sc, p);
  let rateDel = 0, pRest = pJoint, t2SecDel = t2Sec, perDelivery = 0, triesPerDelivery = 0;
  if (del.on) {
    pRest = 1; t2SecDel = 0;
    for (const x of rungs) {
      x.delivered = del.covers.includes(x.rung);
      if (!x.delivered) { pRest *= x.p; t2SecDel += tStep(x); }
    }
    triesPerDelivery = Math.max(1, (p.deliveryWindowYr * SEC_PER_YR) / tCycleS);
    perDelivery = pRest >= 1 ? 1 : -Math.expm1(triesPerDelivery * Math.log1p(-pRest));
    rateDel = (p.deliveryRatePerMyr / SEC_PER_MYR) * perDelivery;
  }
  // If the covered steps cannot happen in place at all, only the delivered route is left.
  const blocked = del.on && p.deliveryBlocked === "yes";
  const inPlacePerS = blocked ? 0 : attemptsPerS;
  const viaDelivery = rateDel > inPlacePerS;
  if (viaDelivery) t2Sec = t2SecDel;
  const t2 = (t2Sec / SEC_PER_MYR) * p.t2Scale;
  const t3Sec = p.successesNeeded / (inPlacePerS + rateDel);
  const t3 = t3Sec / SEC_PER_MYR;
  const t3InPlace = blocked ? Infinity : p.successesNeeded / attemptsPerS / SEC_PER_MYR;
  // Break-even: delivery wins when the covered steps, made in place, have a joint chance below this.
  const pCovered = del.on && pRest > 0 ? pJoint / pRest : 1;
  const breakEven = del.on && pRest > 0 ? rateDel / ((pRest * nSites) / tCycleS) : 0;

  // T4. The Class 3 floor. Same for every scenario, by design.
  const t4obj = computeT4(p);
  const t4 = t4obj.totalMyr;

  // T5. Building LUCA's ecosystem. Same for every scenario, like T4.
  const t5obj = computeT5(p);
  const t5 = t5obj.totalMyr;

  const total = t1 + t2 + t3 + t4 + t5;
  const terms = { T1: t1, T2: t2, T3: t3, T4: t4, T5: t5 };
  let dominant = "T1";
  for (const k of ["T2", "T3", "T4", "T5"]) if (terms[k] > terms[dominant]) dominant = k;

  return {
    scenario: sc, t1, t2, t3, t4, t5, t5detail: t5obj, total, terms, dominant,
    landFactor, landDelay, buildup, nSites, tCycleS, cycleName: cycle ? cycle.name : "unknown",
    pJoint, attemptsPerS, rungs, t4detail: t4obj, tempC: temp,
    currencyOn: rungs.some((x) => x.currency && x.currency.on),
    borate, delivery: { ...del, rateDel, pRest, perDelivery, triesPerDelivery, viaDelivery, t3InPlace, blocked, pCovered, breakEven, share: (inPlacePerS + rateDel) > 0 ? rateDel / (inPlacePerS + rateDel) : 0 },
    surface: surf, surfaceState: sState,
    workbookLow: sc.plotted_low_myr, workbookHigh: sc.plotted_high_myr,
  };
}


/* ---------------- the cycle as currency ---------------- */

// Second role of a cycle. As a clock it only sets how often a place gets a try (T3).
// As a currency it also pays for a step: each drying joins a share y of the
// building blocks, and each cycle breaks a share d of what was made.
//   time to form one bond   tau_f = T_cycle / y
//   time it survives        1 / tau_s = 1 / tau_chem + d / T_cycle
//   Da = tau_s / tau_f, chance per bond = Da / (1 + Da), chance per product = that ^ bonds
// When the chemical loss is slow, Da is close to y / d and does not depend on the
// cycle length. A long cycle only hurts when the product also breaks down in water
// between dryings. In a long series of cycles the yield levels off at y / (y + d),
// which is the same chance per bond: the plateau of a yield-against-cycles curve
// measures it directly.
export const CURRENCY_SOURCES = {
  eiby: { label: "Eiby 2025, no catalyst", y: 0.00069, lo: 0.0002, hi: 0.0024, stars: 2,
    note: "Five one-hour cycles at 80 C, pH 2 to 3, AMP, dAMP and UMP with no added catalyst: 0.1 to 1.2 per cent by mass, at most four units. Per cycle 0.02 to 0.24 per cent." },
  rajamani: { label: "With lipids, Rajamani 2008", y: 0.0086, lo: 0.0086, hi: 0.0086, stars: 2,
    note: "Up to seven one-hour cycles at 90 C with phospholipid: up to 6 per cent by mass, 25 to 100 units, as summarised by Eiby 2025. Per cycle about 0.9 per cent at most." },
  caimi: { label: "Activated, Caimi 2025", y: 0.065, lo: 0.02, hi: 0.65, stars: 2,
    note: "Activated 2',3'-cyclic nucleotides, pH 9 to 12, room temperature, 1 to 10 one-day cycles: about 20 to 65 per cent, up to 10 units, as summarised by Eiby 2025. Per cycle about 2 to 65 per cent; the default takes 6.5. These nucleotides already carry their own energy, which is a separate supply question." },
};

export function cycleCurrency(h, st, cycle, tCycleS, p) {
  const eligible = !!(h && h.cycle_currency);
  const dries = !!(cycle && cycle.dries);
  const wanted = p.cycleRole === "currency";
  const on = eligible && wanted && (dries || p.currencyCycles === "all");
  const why = !eligible ? "this step is not paid for by the cycle"
    : !wanted ? "the cycle is used as a clock only"
    : !dries && p.currencyCycles !== "all" ? "this cycle does not dry, so it does not pay for joining"
    : "paid for by the cycle";
  if (!on) return { on: false, eligible, dries, why };
  const y = clamp(p.yieldPerCycle, 1e-12, 1);
  const d = clamp(p.lossPerCycle, 0, 1);
  const bonds = Math.max(1, Math.round(p.bondsNeeded));
  const tauTransfer = tCycleS / y;
  const tauChem = st.tauLoss;
  const tauLoss = 1 / (1 / tauChem + d / tCycleS);
  const da = tauLoss / tauTransfer;
  const pBond = da / (1 + da);
  const pp = Math.pow(pBond, bonds);
  const plateau = y / (y + d + tCycleS / tauChem);
  const l = Math.log10(da);
  let verdict = "marginal, on the diagonal", cls = "v-marginal";
  if (l >= 2) { verdict = "clear pass"; cls = "v-pass"; }
  else if (l >= 1) { verdict = "pass, narrow margin"; cls = "v-pass"; }
  else if (l <= -1) { verdict = "perish"; cls = "v-fail"; }
  const chemShare = (tCycleS / tauChem) / (tCycleS / tauChem + d); // how much of the loss is chemistry between dryings
  return { on: true, eligible, dries, why, y, d, bonds, tCycleS, tauTransfer, tauChem, tauLoss, da, pBond, p: pp, plateau,
    chemShare, verdict, verdictClass: cls };
}

/* ---------------- T5, LUCA's ecosystem ---------------- */

// LUCA did not live alone (Moody et al. 2024). Before the first evidence of LUCA
// there had to be X kinds of organisms (species) linked by Y interactions.
//   Diversification: one lineage splits into X at rate lambda per lineage per Myr.
//     For pure splitting (a Yule process) the expected time is ln(X) / lambda.
//   Interactions: X species give X(X-1)/2 possible pairs. Each pair that does not
//     yet interact starts to interact at rate r per Myr. To reach Y links, a
//     fraction C = Y / pairs must be linked, which takes -ln(1 - C) / r.
//     This grows very fast as C nears 1: the last links are the slowest.
//   The two can run at the same time (overlap, take the longer) or one after the other.
//   An extra evolution time can be added on top, or the whole term set directly.
export function computeT5(p) {
  const on = p.ecoOn !== false;
  const X = Math.max(1, Math.round(p.ecoSpecies));
  const pairs = X * (X - 1) / 2;
  const Yasked = Math.max(0, Math.round(p.ecoInteractions));
  const Y = Math.min(Yasked, pairs);
  const C = pairs > 0 ? Y / pairs : 0;
  const tDiv = X > 1 ? Math.log(X) / p.ecoDivRate : 0;
  const Ccap = Math.min(C, 0.999999);
  const tInt = C > 0 ? -Math.log(1 - Ccap) / p.ecoLinkRate : 0;
  const overlap = p.ecoOverlap !== false;
  const built = overlap ? Math.max(tDiv, tInt) : tDiv + tInt;
  const direct = p.ecoMode === "direct";
  let totalMyr = direct ? p.ecoDirectMyr : built + p.ecoExtraMyr;
  if (!on) totalMyr = 0;
  return { on, X, Y, Yasked, pairs, C, tDiv, tInt, overlap, direct, extra: p.ecoExtraMyr,
    totalMyr, capped: Yasked > pairs, nearFull: C > 0.9 };
}

/* ---------------- remaining time, restarts and the chance to fit ---------------- */

// Regularised lower incomplete gamma P(a, x). Series below a+1, continued fraction above.
function lgamma(z) {
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1; let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function gammaP(a, x) {
  if (x <= 0) return 0;
  if (a > 2e4) { // normal approximation, fine for many required successes
    const z = (x - a) / Math.sqrt(a);
    return 0.5 * (1 + erf(z / Math.SQRT2));
  }
  const lg = lgamma(a);
  if (x < a + 1) {
    let sum = 1 / a, del = sum, ap = a;
    for (let n = 0; n < 10000; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break; }
    return Math.min(1, sum * Math.exp(-x + a * Math.log(x) - lg));
  }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 10000; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-14) break;
  }
  return Math.max(0, 1 - Math.exp(-x + a * Math.log(x) - lg) * h);
}
function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}

// What the window leaves over, and how many times the whole run could have
// happened, one after another, inside the window.
//   remaining = budget - total
//   one full try = T2 + T3 + T4 + T5 (the setting stays, so T1 is paid once)
//   if a restart has to wait for the setting again, one try = T1 + T2 + T3 + T4 + T5
//   tries that fit = floor(time open for tries / one try); tries that stopped = tries - 1
// The chance to fit treats only T3 as random: waiting for n successes is a gamma
// distribution with mean T3. Everything else is taken at its central value.
export function timeLeft(r, budgetMyr, p) {
  const needT1 = !!p.restartNeedsT1;
  const run = needT1 ? r.total : r.total - r.t1;
  const open = needT1 ? budgetMyr : budgetMyr - r.t1;
  const remaining = budgetMyr - r.total;
  const tries = run > 0 && open > 0 ? Math.floor(open / run) : 0;
  const stopped = Math.max(0, tries - 1);
  const fixed = r.t1 + r.t2 + r.t4 + r.t5;
  const forT3 = budgetMyr - fixed;
  const n = Math.max(1, p.successesNeeded);
  let pFit = 0;
  if (forT3 > 0 && r.t3 > 0) pFit = gammaP(n, n * forT3 / r.t3);
  else if (forT3 > 0) pFit = 1;
  return { remaining, run, open, tries, stopped, pFit, fixed, forT3, needT1,
    shareUsed: budgetMyr > 0 ? r.total / budgetMyr : Infinity };
}

// Run every scenario under every driving cycle. Used by the cycle map.
export function cycleSweep(model, p, auditFn = auditScenario) {
  return model.scenarios.map((sc) => model.cycles.map((c) => auditFn(sc, { ...p, cycleName: c.name }, model)));
}

export function verdictAgainstBudget(totalMyr, budgetMyr) {
  if (!(budgetMyr > 0)) return { text: "no budget, the envelope is inverted", cls: "v-fail" };
  if (totalMyr <= budgetMyr) return { text: "fits", cls: "v-pass" };
  if (totalMyr <= budgetMyr * 3) return { text: "fits only at the fast end", cls: "v-marginal" };
  return { text: "needs a longer budget", cls: "v-fail" };
}

/* ---------------- S6, preservation ---------------- */

export function ecosystemGate(p) {
  const turnovers = (p.vesselLifetimeYr / p.recycleTimeYr);
  const ratio = turnovers / p.turnoversForEcosystem;
  let verdict = "a population, not an ecosystem", cls = "v-fail";
  if (ratio >= 10) { verdict = "an ecosystem with room to spare", cls = "v-pass"; }
  else if (ratio >= 1) { verdict = "just an ecosystem", cls = "v-marginal"; }
  return { turnovers, ratio, verdict, verdictClass: cls };
}

// Does a molecule class survive burial for the age of the rock.
export function preservationGate(mc, p) {
  const known = mc.half_life_value != null && mc.half_life_temp_c != null;
  let tauMyr = null, ratio = null;
  if (known) {
    const halfYr = mc.half_life_unit && mc.half_life_unit.startsWith("Myr")
      ? mc.half_life_value * 1e6 : mc.half_life_value;
    const tauRefS = halfYr * SEC_PER_YR;
    // Step 1: re-reference the measured half-life from its reported temperature to 25 C.
    // Step 2: push it from 25 C out to the burial temperature.
    const tauAt25 = tauRefS / Math.exp(
      (p.eaDegradation * 1000 / R_GAS) * (1 / (mc.half_life_temp_c + 273.15) - 1 / TREF_K)
    );
    const tauBurial = arrhenius(tauAt25, p.burialTempC, p.eaDegradation);
    tauMyr = tauBurial / SEC_PER_MYR;
    ratio = tauMyr / p.rockAgeMyr;
  }
  // The thermal ceiling is a separate and harder gate than slow chemistry.
  const overOilWindow = p.burialTempC > 150;
  const overGreenschist = p.burialTempC > 400;
  let verdict, cls;
  if (mc.verdict.startsWith("preserved") && !overGreenschist) { verdict = "passes S6b"; cls = "v-pass"; }
  else if (mc.verdict.startsWith("preserved") && overGreenschist) { verdict = "isotopic signal only"; cls = "v-marginal"; }
  else if (ratio != null && ratio >= 1) { verdict = "passes on the half-life, but see the note"; cls = "v-marginal"; }
  else { verdict = "fails S6b"; cls = "v-fail"; }
  return { tauMyr, ratio, verdict, verdictClass: cls, overOilWindow, overGreenschist };
}

/* ---------------- formatting ---------------- */

export function fmtSci(v, dp = 2) {
  if (v === Infinity) return "infinity";
  if (v === 0) return "0";
  if (v == null || Number.isNaN(v)) return "n.a.";
  const a = Math.abs(v);
  if (a >= 1e-3 && a < 1e5) {
    if (a >= 100) return v.toFixed(0);
    if (a >= 10) return v.toFixed(1);
    if (a >= 1) return v.toFixed(2);
    return v.toPrecision(2);
  }
  const e = Math.floor(Math.log10(a));
  const m = v / Math.pow(10, e);
  return m.toFixed(dp) + " x 10^" + e;
}

export function fmtMyr(v) {
  if (v == null || Number.isNaN(v)) return "n.a.";
  if (v === Infinity) return "infinity";
  if (v >= 1000) return fmtSci(v);
  if (v >= 10) return v.toFixed(0);
  if (v >= 1) return v.toFixed(2);
  if (v >= 1e-3) return v.toPrecision(2);
  return fmtSci(v);
}

export function fmtDuration(sec) {
  if (sec === Infinity) return "infinity";
  if (sec < 1e-3) return fmtSci(sec) + " s";
  if (sec < 120) return fmtSci(sec) + " s";
  if (sec < 7200) return (sec / 60).toFixed(1) + " min";
  if (sec < 2 * 86400) return (sec / 3600).toFixed(1) + " h";
  if (sec < 2 * SEC_PER_YR) return (sec / 86400).toFixed(1) + " days";
  const yr = sec / SEC_PER_YR;
  if (yr < 1e6) return fmtSci(yr) + " yr";
  return fmtSci(yr / 1e6) + " Myr";
}

/* ---------------- version 8: crust, land, mixes and molecular build-up ---------------- */

// The felsic (granite-like) share of the rock exposed at the surface, as a fraction, through time.
// Each curve is our reading of a published record; the conversion to a share is Tier C.
export const FELSIC_CURVES = {
  tang: { label: "Mafic until 3.0 Ga, then felsic (Tang et al. 2016)", stars: 2,
    pts: [[4.5, 0.2], [3.0, 0.2], [2.5, 0.8], [2.0, 0.8]],
    plain: "Ni/Co and Cr/Zn ratios in Archean shales and igneous rocks say the upper crust was mostly mafic (basalt-like, MgO above 11 wt%) before 3.0 Ga and turned felsic by 2.5 Ga, with a fivefold growth of granite-like rock. We draw that as a felsic share of 0.2 before 3.0 Ga rising to 0.8 by 2.5 Ga." },
  greber: { label: "Felsic since 3.5 Ga (Greber et al. 2017)", stars: 2,
    pts: [[4.5, 0.58], [3.5, 0.58], [2.25, 0.72], [2.0, 0.72]],
    plain: "Titanium isotopes in shales say felsic rock already made up 58 per cent of the exposed crust at 3.5 Ga and 72 per cent at 2.25 Ga, with mafic rock steady near 30 per cent. Before 3.5 Ga the line is held flat, which is an extrapolation." },
  dhuime: { label: "New crust turns felsic after 3.0 Ga (Dhuime et al. 2015)", stars: 2,
    pts: [[4.5, 0.05], [3.0, 0.05], [2.0, 0.28]],
    plain: "Rb/Sr in new crust gives SiO2 near 48 wt% (basalt) before 3.0 Ga, rising toward 57 wt% later. Read as a felsic share by mixing basalt (48) and granite (72). This curve is for newly made crust, so it is the most mafic of the four." },
  bernadet: { label: "Early felsic crust in the Hadean (Bernadet et al. 2025)", stars: 1,
    pts: [[4.5, 0.4], [3.5, 0.58], [2.25, 0.72], [2.0, 0.72]],
    plain: "Zircon trace elements suggest extensive felsic crust by 4.4 to 4.5 Ga, perhaps up to half of today's continental mass. We draw a felsic share of 0.4 in the Hadean joining the Greber line at 3.5 Ga. The share is our reading." },
  manual: { label: "Set by hand", stars: 0, pts: null, plain: "A constant felsic share that you choose." },
};
export function felsicAt(p, ageGa) {
  const c = FELSIC_CURVES[p.felsicCurve] || FELSIC_CURVES.tang;
  if (!c.pts) return clamp(p.felsicManual != null ? p.felsicManual : 0.3, 0, 1);
  const a = c.pts;
  if (ageGa >= a[0][0]) return a[0][1];
  for (let i = 0; i < a.length - 1; i++) {
    if (ageGa <= a[i][0] && ageGa >= a[i + 1][0]) {
      const f = (a[i][0] - ageGa) / (a[i][0] - a[i + 1][0]);
      return a[i][1] * (1 - f) + a[i + 1][1] * f;
    }
  }
  return a[a.length - 1][1];
}
// The age at which the chemistry is read: the start date unless the timeline sets one.
export function chemAgeFor(p) {
  if (p.chemAgeGa != null && isFinite(p.chemAgeGa)) return p.chemAgeGa;
  return computeEnvelope(p).nearGa;
}

// Weathering products of each kind of crust, in weight per cent. Tier C, from general clay
// mineralogy: basalt weathers to smectite, iron oxides and glass; granite to kaolinite, illite and quartz.
export const MIX_PRESETS = {
  basalt: { label: "Basalt-derived sediment", mix: { smectite: 45, ferrihydrite: 15, glass: 25, goethite: 5, quartz: 10 } },
  felsic: { label: "Granite-derived sediment", mix: { kaolinite: 30, mica: 25, quartz: 35, goethite: 5, smectite: 5 } },
  river: { label: "River mud, mixed sources", mix: { smectite: 30, kaolinite: 15, mica: 15, chlorite: 15, quartz: 15, ferrihydrite: 10 } },
  vent: { label: "Vent chimney", mix: { greenrust: 35, ldh: 25, brucite: 20, mackinawite: 20 } },
  raft: { label: "Pumice raft", mix: { glass: 85, smectite: 10, ferrihydrite: 5 } },
  clay: { label: "Clay only (smectite)", mix: { smectite: 100 } },
};
export function blendMix(f) {
  const out = {};
  const b = MIX_PRESETS.basalt.mix, g = MIX_PRESETS.felsic.mix;
  for (const k of new Set([...Object.keys(b), ...Object.keys(g)])) out[k] = (1 - f) * (b[k] || 0) + f * (g[k] || 0);
  return out;
}
export function mixMineral(mix, mins, name) {
  const comps = Object.entries(mix || {}).map(([id, w]) => ({ mineral: mins.find((m) => m.id === id), w: +w || 0 })).filter((c) => c.mineral && c.w > 0);
  return { id: "mix", name: name || "Mineral mix", ssa_m2_g: comps.length ? 1 : 0, components: comps, mix };
}
export function crustMix(f, mins) {
  return mixMineral(blendMix(f), mins, `Sediment from crust with ${Math.round(f * 100)} per cent felsic rock`);
}

// When dry land is available for settings that need it. Korenaga 2021: up to 20 (or 40) per cent
// land in the mid-Hadean, then land limited to isolated ocean islands in the late Hadean and early
// Archean, and no accepted record of regionally expansive land before 3.0 Ga.
export const LAND_STARTS = {
  same: { age: null, label: "Same as the start date", plain: "Dry land is there when the clock starts. This is the version 7 behaviour." },
  islands: { age: 4.0, label: "After the mid-Hadean land is gone, 4.0 Ga", plain: "Read with Korenaga 2021: if the mid-Hadean land is not counted, the next sure land for wet and dry chemistry is the island and fresh-water evidence near 4.0 Ga (Gamaleldien et al. 2024). Our interpretation." },
  expansive: { age: 3.0, label: "First regionally expansive land, 3.0 Ga", plain: "Korenaga 2021: there is no accepted record of regionally expansive exposed land before 3.0 Ga." },
  emergence: { age: 2.5, label: "Rapid emergence of land, 2.5 Ga", plain: "Bindeman et al. 2018: oxygen isotopes in shales show land rising quickly near 2.5 Ga." },
};
export function landDelayMyr(p) {
  const L = LAND_STARTS[p.landStart] || LAND_STARTS.same;
  if (L.age == null) return 0;
  return Math.max(0, (computeEnvelope(p).nearGa - L.age) * 1000);
}

// Where polymers can be built up. Porosity sets the mineral loading of a sediment:
// loading = 2650 (1 - porosity) / porosity grams of solid per litre of pore water.
export const BUILDUP_VENUES = {
  pond: { label: "Top sediment of a pond", mix: "crust", porosity: 0.9, pH: 7, salinity: 5, drive: 1,
    plain: "Mud at the bottom of a pond that dries and is wetted again. The minerals come from the local crust, so the felsic share matters here." },
  estuary: { label: "River mouth, where fresh water meets the sea", mix: "river", porosity: 0.9, pH: 7.5, salinity: 20, drive: 0.1,
    plain: "Rivers bring a high load of mineral particles; salt makes them hold more as they settle (Sand et al. 2024). The bed stays wet, so there is little drying to drive joining." },
  tidal: { label: "Tidal flat, wet at high tide and dry at low tide", mix: "river", porosity: 0.6, pH: 7.5, salinity: 35, drive: 1,
    plain: "River mud on a flat that floods and drains with each tide. Early tides were 4 to 8 times today's and spring tides came every 5 to 7 days (Alejandre et al. 2025)." },
  raft: { label: "Pumice raft", mix: "raft", porosity: 0.9, pH: 7.5, salinity: 35, drive: 0.5,
    plain: "Floating pumice with pore water. Its top dries in sun and wind and is wetted by waves." },
  smoker: { label: "Vent chimney pores", mix: "vent", porosity: 0.5, pH: 9.5, salinity: 35, drive: 0.1,
    plain: "Alkaline vent minerals: green rust, layered double hydroxides, brucite and iron sulfide. No drying, so joining relies on gradients. Amino acids can enter layered double hydroxides above pH 9.6 (Gregoire et al.)." },
  ice: { label: "Brine veins in ice", mix: "clay", loading: 1, pH: 7, salinity: 100, drive: 0.3,
    plain: "Freezing concentrates salt and molecules into thin veins of brine with little mineral." },
  open: { label: "Open water, few particles", mix: "river", loading: 0.01, pH: 7.5, salinity: 35, drive: 0.01,
    plain: "Away from rivers and the bed, about 0.01 g of particles per litre. A shed chain is almost never caught again." },
};
export const SCENARIO_VENUE = { SC1: "smoker", SC2: "pond", SC3: "pond", SC4: "tidal", SC5: "ice", SC6: "pond" };

// Sand et al. 2024, Table: per cent of DNA left in the pore water after adsorption, at low DNA
// (0.0049 ug per mL), for porosity 0.3 and 0.9. Used to check the model.
export const SAND_PORE = {
  quartz: [5, 53], kfeldspar: [7, 63], amphibole: [3, 36], pyroxene: [1, 16], talc: [0, 1],
  illite: [0, 4], kaolinite: [0, 1], chlorite: [0, 0], smectite: [0, 1],
};
export const SAND_MAP = { quartz: "quartz", kaolinite: "kaolinite", smectite: "smectite", mica: "illite", chlorite: "chlorite" };

export const loadingFromPorosity = (phi) => (2650 * (1 - phi)) / Math.max(phi, 0.01);

export function venueFor(sc, p) {
  const id = p.buildupWhere && p.buildupWhere !== "own" ? p.buildupWhere : (SCENARIO_VENUE[sc.id] || "pond");
  return { id, ...(BUILDUP_VENUES[id] || BUILDUP_VENUES.pond) };
}
export function venueMix(v, p, mins) {
  if (p.buildupMix === "mine") return mixMineral(p.mineralMix, mins, "Your mineral mix");
  if (v.mix === "crust") return crustMix(felsicAt(p, chemAgeFor(p)), mins);
  const pr = MIX_PRESETS[v.mix] || MIX_PRESETS.clay;
  return mixMineral(pr.mix, mins, pr.label);
}

// Build-up. A chain grows one unit at a time. In each cycle it joins one more unit with chance j,
// or is shed from the mineral with chance d = exp(-alpha * l) (Alejandre et al. 2025: longer chains
// hold on harder), and if shed it is caught again with chance r, set by the mineral loading. A bound
// chain also breaks with chance h / protection. The chance of reaching length L is the product over
// lengths of j / (j + loss).
export function buildupFor(sc, p, model, tCycleS, over = {}) {
  const pp = { ...p, ...over };
  const mins = model.minerals || [];
  const v = venueFor(sc, pp);
  const mine = pp.buildupCond === "mine";
  const phi = mine && pp.buildupPorosity != null ? pp.buildupPorosity : v.porosity;
  const loading = !mine && v.loading != null ? v.loading : loadingFromPorosity(phi != null ? phi : 0.9);
  const pH = mine ? pp.surfacePH : v.pH;
  const salinity = mine ? pp.salinityGkg : v.salinity;
  const mineral = venueMix(v, pp, mins);
  const aa = pp.buildupMolecule === "aminoacid";
  const s = surfaceState(mineral, { pH, loading, tempC: pp.effectiveTempC }, { ...pp, salinityGkg: salinity });
  // Amino acids: taken up by layered double hydroxides only as Asp2-, above the amine pKa of 9.6
  // (Gregoire et al.); elsewhere they bind weakly (Tier C: one tenth of phosphate).
  let xAA = s.x;
  if (aa) {
    const asp2 = 1 / (1 + Math.pow(10, 9.6 - pH));
    xAA = s.parts.reduce((a, q) => a + q.x * ((q.mineral.id === "ldh" || q.mineral.id === "greenrust") ? asp2 : 0.1), 0);
  }
  const x1 = aa ? xAA : s.x;
  const L = Math.max(2, Math.round(pp.buildupLength || 20));
  const alpha = pp.buildupAlpha != null ? pp.buildupAlpha : 0.8;
  const boost = pp.hypoBoost && pp.hypoBoost.S5b ? pp.hypoBoost.S5b : 1;
  const j = Math.min(0.999, (pp.yieldPerCycle || 0.00069) * v.drive * (s.confAct != null ? s.confAct : 1) * boost);
  // Breaking scales with temperature from Eiby's 80 C conditions.
  const hFree = Math.min(1, (pp.lossPerCycle || 0.001) * Math.exp((pp.eaLoss * 1000 / R_GAS) * (1 / 353.15 - 1 / ((pp.effectiveTempC != null ? pp.effectiveTempC : 25) + 273.15))));
  const pf = s.pfEff || 1;
  let logP = 0, cycles = 0, pReach = 1, meanLen = 1;
  const steps = [];
  const LMAX = Math.max(L, 200);
  for (let l = 1; l < LMAX; l++) {
    const d = Math.exp(-alpha * l);
    const xl = x1 * Math.exp(alpha * (l - 1));
    const r = xl / (1 + xl);
    const q = d * (1 - r) + hFree / pf;
    const pass = j / (j + q);
    pReach *= pass;
    meanLen += pReach;
    if (l < L) { logP += Math.log(pass); cycles += 1 / (j + q); if (l <= 5 || l === L - 1) steps.push({ l, d, r, q, pass }); }
    if (pReach < 1e-12 && l >= L) break;
  }
  const pL = Math.exp(logP);
  const r1 = x1 / (1 + x1);
  return { venue: v, mineral, loading, porosity: v.loading != null && !mine ? null : phi, pH, salinity, state: s, aa,
    L, alpha, j, hFree, pf, r1, p: pL, cycles, timeS: cycles * tCycleS, meanLen, steps };
}
