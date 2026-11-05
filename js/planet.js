// Version 9: the planet layer. The same model, read for Earth or for Mars.
//
// Nothing in the chemistry itself changes between planets: the handoffs, their rates and the
// biology terms are the same. What changes are the boundary conditions: the window, the
// temperature the chemistry runs at, how common each kind of setting is (T1 and the number of
// sites), the length of the day, the strength of the tides, and how much iron, phosphate and
// borate the rocks can supply. Each change is listed in PLANET_FACTS with its source and with how
// the model uses it, so a reader can see what is measured and what is our judgement.

export const MARS_NEAR = [
  { id: "mars_water", label: "Hot water in the crust, 4.45 Ga (Gillespie et al. 2024)", age: 4.45,
    basis: "A 4.45 Ga zircon in the Martian meteorite NWA 7034 (Black Beauty) grew from hot, water-rich fluid, the oldest direct sign of water on Mars. It shows water in the crust, not that surface water was stable.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11584009/" },
  { id: "mars_crust", label: "Solid crust, 4.547 Ga (Bouvier et al. 2018)", age: 4.547,
    basis: "Zircons in Martian meteorites show that the first crust had solidified by 4.547 Ga, about 20 Myr after the Solar System formed. This is the earliest possible start; it says nothing about water yet.",
    url: "https://www.sciencenews.org/article/mars-got-its-crust-quickly" },
];

export const MARS_FAR = [
  { id: "mars_same", rel: 0.2, label: "Same length as Earth's default window, 200 Myr", age: null,
    basis: "Mars has no LUCA date, so the far end is a choice. This one gives Mars the same 200 Myr as Earth's default window, so the two planets are compared on their conditions alone and not on the length of the window.",
    url: null },
  { id: "mars_dynamo_early", label: "Magnetic field gone, early estimate, 4.0 Ga (Lillis et al.)", age: 4.0,
    basis: "Large impact basins without crustal magnetism point to the Martian dynamo shutting down between 4.1 and 4.0 Ga. Without a field the solar wind strips the atmosphere faster, and surface water becomes harder to keep.",
    url: "https://dash.harvard.edu/entities/publication/69fb4a58-655a-4507-9219-86b557c88126" },
  { id: "mars_dynamo_late", label: "Magnetic field gone, late estimate, 3.7 Ga", age: 3.7,
    basis: "Newer work finds that the weak magnetism of the basins can form while a reversing dynamo is still running, so the field may have lasted until 3.9 to 3.7 Ga (Nature Communications 2024; Mittelholz et al. 2020).",
    url: "https://www.nature.com/articles/s41467-024-51092-4" },
  { id: "mars_valleys", label: "Most river valleys done, 3.6 Ga", age: 3.6,
    basis: "About 91 per cent of mapped valley segments lie on Noachian terrain older than about 3.7 Ga, and most networks formed near the Noachian to Hesperian boundary, about 3.8 to 3.6 Ga (Hynek et al. 2010).",
    url: "https://onlinelibrary.wiley.com/doi/abs/10.1029/2009JE003548" },
  { id: "mars_last_valleys", label: "Last minor valleys, 2.8 Ga", age: 2.8,
    basis: "Minor valley formation continued through the Hesperian into the early Amazonian, about 2.8 Ga (Hynek et al. 2010). A generous end: water was local and short-lived by then.",
    url: "https://onlinelibrary.wiley.com/doi/abs/10.1029/2009JE003548" },
];

// The guided window choices on Mars.
export const MARS_WINDOWS = [
  { id: "mars_same", near: "mars_water", far: "mars_same", label: "200 Myr, same as Earth", conf: [1, "The far end is a choice made so that Earth and Mars can be compared fairly"], hint: "From the first hot water, 4.45 Ga, for the same 200 Myr as Earth's default. The fairest way to compare the conditions of the two planets." },
  { id: "mars_dynamo_early", near: "mars_water", far: "mars_dynamo_early", label: "450 Myr, until the field went (early)", conf: [2, "Crustal magnetism of dated basins; the dating is from crater counts"], hint: "From 4.45 Ga until the magnetic field shut down, early estimate 4.0 Ga." },
  { id: "mars_dynamo_late", near: "mars_water", far: "mars_dynamo_late", label: "750 Myr, until the field went (late)", conf: [2, "Paleomagnetism of meteorites and models of basin magnetism"], hint: "From 4.45 Ga until the magnetic field shut down, late estimate 3.7 Ga." },
  { id: "mars_valleys", near: "mars_water", far: "mars_valleys", label: "850 Myr, until the rivers stopped", conf: [2, "Crater-count ages of mapped valley networks"], hint: "From 4.45 Ga until most river valleys had formed, about 3.6 Ga." },
];

// What differs on Mars, with sources, and how (or whether) the model uses it.
export const PLANET_FACTS = [
  { prop: "Distance from the Sun", earth: "1.00 AU", mars: "1.52 AU", used: "Sets the sunlight below.", url: "https://nssdc.gsfc.nasa.gov/planetary//factsheet/marsfact.html", src: "NASA Mars fact sheet" },
  { prop: "Sunlight at the top of the atmosphere", earth: "1361 W per m2 today", mars: "586 W per m2 today, 0.43 of Earth's", used: "With the young Sun about a quarter fainter than today, the steady climate of early Mars was most likely cold, with warm episodes. The model runs the chemistry at a lower temperature on Mars (20 C instead of 70 C). You can change it.", url: "https://ntrs.nasa.gov/api/citations/20230001221/downloads/annurev-earth-060115-012355.pdf", src: "Wordsworth 2016" },
  { prop: "Size and gravity", earth: "1 g", mars: "0.38 g, 0.11 of Earth's mass", used: "Not used directly. A small planet cools faster, holds its atmosphere less well and has no plate tectonics (a stagnant lid), so there are no spreading ridges. This is why vents get fewer sites on Mars.", url: "https://nssdc.gsfc.nasa.gov/planetary//factsheet/marsfact.html", src: "NASA Mars fact sheet" },
  { prop: "Cooling and first crust", earth: "Moon-forming impact, then first water near 4.40 Ga", mars: "Magma ocean solid in under 10 Myr; crust by 4.547 Ga; hot water in the crust by 4.45 Ga", used: "Sets the start of the window on Mars (4.45 Ga by default).", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11584009/", src: "Gillespie et al. 2024" },
  { prop: "Magnetic field", earth: "Present throughout", mars: "Gone by 4.1 to 4.0 Ga, or by 3.9 to 3.7 Ga", used: "One choice for the end of the window on Mars: when the field went, the atmosphere and surface water began to be lost.", url: "https://www.nature.com/articles/s41467-024-51092-4", src: "Nature Communications 2024" },
  { prop: "Ozone and UV", earth: "No ozone in the Hadean", mars: "No ozone; for a CO2 and H2O atmosphere at 3.9 Ga, surface UV comparable to young Earth", used: "No change: UV is treated the same on both planets.", url: "https://people.seas.harvard.edu/~rwordsworth/papers/ranjan2017atmospheric.pdf", src: "Ranjan et al. 2017" },
  { prop: "Length of the day", earth: "Shorter in the Hadean, about 6 to 17 h in the model", mars: "24.66 h, and fairly constant because Mars has no large moon", used: "The day and night cycle lasts one sol (88,800 s) on Mars.", url: "https://nssdc.gsfc.nasa.gov/planetary//factsheet/marsfact.html", src: "NASA Mars fact sheet" },
  { prop: "Tides", earth: "Strong, from a close Moon", mars: "Only weak solar tides of a few cm; Phobos is tiny", used: "The tidal cycle is marked as weak on Mars and is left out of scenario 7. Pumice rafts get fewer beaching events.", url: "https://onlinelibrary.wiley.com/doi/10.1029/2026JE009849", src: "JGR Planets commentary on Jolley et al. 2026" },
  { prop: "Iron", earth: "About 8 wt% FeO in the silicate Earth", mars: "About 18 wt% FeO", used: "Handoffs that use iron (H1, H3, H5 and H9) form 2.25 times faster by default, the ratio of the FeO contents. That a richer feed speeds the step in proportion is our judgement.", url: "http://www.psrd.hawaii.edu/Oct12/Mantle-of-Mars.html", src: "PSRD, Exploring the mantle of Mars" },
  { prop: "Phosphate", earth: "Mostly fluorapatite, slow to dissolve", mars: "Chlorapatite and merrillite: phosphate released up to 45 times faster, concentrations more than twice Earth's", used: "Handoffs that use phosphate (H7 and H12) form 2 times faster by default (range 1 to 45), in proportion to the higher concentration (our judgement).", url: "https://www.nature.com/articles/ngeo1923", src: "Adcock et al. 2013" },
  { prop: "Boron", earth: "Borate from felsic crust and evaporites", mars: "Boron found in calcium sulfate veins at Gale crater, most likely from evaporites", used: "Borate can collect in drying settings on Mars as on Earth. The ribose step and its borate level work the same way.", url: "https://www.usgs.gov/publications/situ-detection-boron-chemcam-mars", src: "Gasda et al. 2017" },
  { prop: "Crust", earth: "Some felsic crust in the Hadean, more later", mars: "Basaltic, with almost no granite-like crust", used: "The felsic share is set by hand to 5 per cent on Mars (our judgement), instead of an Earth curve.", url: null, src: "Tier C" },
  { prop: "Serpentinising rock", earth: "Ocean floor at spreading ridges", mars: "Serpentine in Noachian rocks (Nili Fossae, Claritas Rise, some craters)", used: "Alkaline vents are possible on Mars, but with a smaller, uncertain ocean and no ridges; the model gives them 100 times fewer sites.", url: "https://doi.org/10.1029/2010GL042596", src: "Ehlmann et al. 2010" },
  { prop: "Ocean", earth: "Global ocean", mars: "A northern ocean is possible but debated", used: "Settings that need open sea (vents, pumice rafts) get fewer sites and, for rafts, a longer wait.", url: "https://en.wikipedia.org/wiki/Noachian", src: "Overview of the Noachian" },
  { prop: "Impact hydrothermal systems", earth: "About 100,000 years for a mid-sized crater, in the model", mars: "67,000 years for a 30 km crater, 290,000 to 380,000 years for 100 to 180 km, about 10 Myr for a Hellas-sized basin", used: "Similar to Earth, so the impact setting is left as on Earth.", url: "https://agupubs.onlinelibrary.wiley.com/doi/pdfdirect/10.1029/2005JE002453?download=true", src: "Abramov and Kring 2005" },
  { prop: "Dry land", earth: "Little land early on (Korenaga 2021)", mars: "Mostly land from the start", used: "Pools on land do not wait for land on Mars: the extra land factor and the later land start do not apply.", url: null, src: "Tier C" },
];

// How each setting changes on Mars: multipliers on T1 (time to appear) and on the number of sites,
// and the reason. All Tier C, our judgement from the facts above.
export const MARS_SETTINGS = {
  SC1: { t1: 1, sites: 0.01, needsLand: null, note: "Serpentinising rock existed, but the ocean was smaller and uncertain and there were no spreading ridges: 100 times fewer vent sites." },
  SC2: { t1: 1, sites: 1, needsLand: false, note: "Land everywhere from the start, so no wait for land; water came in episodes." },
  SC3: { t1: 1, sites: 1, needsLand: null, note: "Impact hydrothermal systems lasted about as long as on Earth (Abramov and Kring 2005), and craters were common." },
  SC4: { t1: 10, sites: 0.001, needsLand: null, note: "Needs open sea and waves or tides to beach the pumice; Mars had at most a northern sea and weak tides: 1,000 times fewer sites and a 10 times longer wait." },
  SC5: { t1: 0.1, sites: 10, needsLand: null, note: "A cold planet: ice and brine are common from the start, so the wait is 10 times shorter and there are 10 times more sites." },
  SC6: { t1: 1, sites: 1, needsLand: null, note: "Delivery from space works about as on Earth." },
};

const SOL_S = 88775;

// Parameter values that belong to a planet rather than to the chemistry.
export const PLANET_KEYS = ["nearMode", "farMode", "nearEventId", "farEventId", "tempMode", "chemTempC", "feedFe", "feedP",
  "felsicCurve", "felsicManual", "landStart"];

export function planetDefaults(id, earthDefaults) {
  if (id !== "mars") return { ...earthDefaults };
  return { ...earthDefaults, nearMode: "event", farMode: "event", nearEventId: "mars_water", farEventId: "mars_same",
    tempMode: "manual", chemTempC: 20, feedFe: 2.25, feedP: 2, felsicCurve: "manual", felsicManual: 0.05, landStart: "same" };
}

// Builds the scenario and cycle lists for a planet from the Earth originals.
export function planetModel(earth, id) {
  if (id !== "mars") return { scenarios: earth.scenarios, cycles: earth.cycles };
  const scenarios = earth.scenarios.map((sc) => {
    const m = MARS_SETTINGS[sc.id];
    if (!m) return sc;
    return { ...sc, t1_low: sc.t1_low * m.t1, t1_high: sc.t1_high * m.t1,
      n_parallel_sites_low: sc.n_parallel_sites_low * m.sites, n_parallel_sites_high: sc.n_parallel_sites_high * m.sites,
      requires_subaerial_land: m.needsLand === false ? false : sc.requires_subaerial_land, mars_note: m.note };
  });
  const cycles = earth.cycles.map((c) => {
    if (c.name === "Day and night") return { ...c, hadean_period_s_low: SOL_S, hadean_period_s_high: SOL_S, mars_note: "One sol, 24.66 h." };
    if (c.name === "Tides") return { ...c, hadean_period_s_low: SOL_S / 2, hadean_period_s_high: SOL_S / 2, weak: true, mars_note: "Solar tides only, a few cm: weak." };
    return c;
  });
  return { scenarios, cycles };
}

export const PLANETS = {
  earth: { id: "earth", label: "Earth", nearOptions: null, farOptions: null },
  mars: { id: "mars", label: "Mars", nearOptions: MARS_NEAR, farOptions: MARS_FAR },
};
