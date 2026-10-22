# Adds the mineral surface layer to data/model.json.
# Phosphate is the model adsorbate. Every mineral row carries its numbers, a tier
# and the sources behind them. Run once; running again replaces the same rows.
import json, pathlib

P = pathlib.Path(__file__).parent / "data" / "model.json"
m = json.loads(P.read_text())

REFS = [
 ("R90", "Freeman, C. L., Dieudonne, L., Agbaje, O. B. A., Zure, M., Sanz, J. Q., Collins, M. and Sand, K. K. Survival of environmental DNA in sediments: mineralogic control on DNA taphonomy. Environmental DNA 5, 1691 to 1705, 2023.",
  "https://doi.org/10.1002/edn3.482", "Mineral surfaces: cation bridging, topography, damage from strong binding"),
 ("R91", "Verma, T., Hendiani, S., Carbajo, C., Andersen, S. B., Hammarlund, E. U., Burmolle, M. and Sand, K. K. Recurrence and propagation of past functions through mineral facilitated horizontal gene transfer. Frontiers in Microbiology 15, 1449094, 2024.",
  "https://doi.org/10.3389/fmicb.2024.1449094", "Mineral surfaces: DNA adsorption capacity by mineral, active sites, bulk point of zero charge is not enough"),
 ("R92", "Sand, K. K., Jelavic, S., Kjaer, K. H. and Prohaska, A. Importance of eDNA taphonomy and sediment provenance for robust ecological inference: insights from interfacial geochemistry. Environmental DNA 6, e519, 2024.",
  "https://doi.org/10.1002/edn3.519", "Mineral surfaces: clays hold almost all adsorbed DNA, DNA binds to brucite-like layers of chlorite in seawater"),
 ("R93", "Kjaer, K. H., Pedersen, M. W., De Sanctis, B., ... Sand, K. K., Jelavic, S., ... and Willerslev, E. A 2-million-year-old ecosystem in Greenland uncovered by environmental DNA. Nature 612, 283 to 291, 2022.",
  "https://www.nature.com/articles/s41586-022-05453-y", "Mineral surfaces: smectite holds 200 times more DNA than quartz, mineral binding as the reason for 2 Myr survival"),
 ("R94", "Singh, V. V., Kumar, N., Kimber, R. L., Weiser, A., Pinhasi, R. and Kraemer, S. M. Polymer length governs DNA adsorption dynamics on mineral surfaces. Environmental Science and Technology 59, 20462 to 20473, 2025.",
  "https://doi.org/10.1021/acs.est.5c08180", "Mineral surfaces: points of zero charge, pH dependence, Ca bridging on hydroxyapatite"),
 ("R95", "Amadou, I., Faucon, M.-P. and Houben, D. New insights into sorption and desorption of organic phosphorus on goethite, gibbsite, kaolinite and montmorillonite. Applied Geochemistry 143, 105378, 2022.",
  "https://hal.science/hal-03711164/document", "Mineral surfaces: Langmuir affinity ratios between minerals, desorbable fraction, surface areas"),
 ("R96", "Luengo, C., Brigante, M., Antelo, J. and Avena, M. Kinetics of phosphate adsorption on goethite: comparing batch adsorption and ATR-IR measurements. Journal of Colloid and Interface Science 300, 511 to 518, 2006.",
  "https://ri.conicet.gov.ar/bitstream/handle/11336/95169/CONICET_Digital_Nro.079324db-ab2a-4d97-bc0e-4c59c2c096cf_A.pdf?sequence=2&isAllowed=y", "Mineral surfaces: phosphate uptake on goethite is fast (minutes) then slow (days), and falls with pH"),
 ("R97", "Desorption of phosphate from goethite. CSIC Digital repository.",
  "https://digital.csic.es/bitstream/10261/78052/1/Desorption%20of%20phosphate.pdf", "Mineral surfaces: apparent irreversibility, slow release, less phosphate held at 68 C than at 25 C"),
 ("R98", "Hansen, H. C. B. and Poulsen, I. F. Interaction of synthetic sulphate green rust with phosphate and the crystallization of vivianite. Clays and Clay Minerals 47, 312 to 318, 1999.",
  "https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=9f4cdeb1cff1ebd5465f01fb7520d97c37d2ce71", "Mineral surfaces: green rust as an anion exchanger and phosphate sorbent in anoxic settings"),
 ("R99", "Pokrovsky, O. S. and Schott, J. Experimental study of brucite dissolution and precipitation in aqueous solutions: surface speciation and chemical affinity control. Geochimica et Cosmochimica Acta 68, 31 to 45, 2004.",
  "https://repository.geologyscience.ru/server/api/core/bitstreams/8a1d2212-f707-4b72-ac62-57610eac1df4/content", "Mineral surfaces: brucite point of zero charge close to pH 11"),
 ("R100", "Wolthers, M., Charlet, L., van der Linde, P. R., Rickard, D. and van der Weijden, C. H. Surface chemistry of disordered mackinawite (FeS). Geochimica et Cosmochimica Acta 69, 3469 to 3481, 2005. Summary of the pH 7.5 point of zero charge in Kim et al. 2020.",
  "https://koreascience.kr/article/JAKO202011263333142.pdf", "Mineral surfaces: mackinawite point of zero charge about pH 7.5"),
 ("R101", "Adsorptive removal of phosphate from aqueous solutions using low-cost volcanic rocks: kinetics and equilibrium approaches. Materials, 2021.",
  "https://pmc.ncbi.nlm.nih.gov/articles/PMC7967176/", "Mineral surfaces: pumice holds very little phosphate, 294 mg per kg"),
 ("R102", "Why is calcite a strong phosphorus sink in freshwater? Investigating the adsorption mechanism using batch experiments and surface complexation modeling. NOAA institutional repository.",
  "https://repository.library.noaa.gov/view/noaa/45178/noaa_45178_DS1.pdf", "Mineral surfaces: calcite surface area 0.68 m2 per g, Ca and carbonate sites"),
 ("R103", "Pedreira-Segade, U. et al. How do nucleotides adsorb onto clays? Life 8, 59, 2018.",
  "https://pmc.ncbi.nlm.nih.gov/articles/PMC6316844/", "Mineral surfaces: nucleotides bind clay edges through their phosphate group by ligand exchange, which is why phosphate is a fair proxy"),
 ("R105", "Arroyave, J. M. et al. Surface speciation of phosphate on goethite as seen by infrared surface titrations. CONICET Digital.",
  "https://ri.conicet.gov.ar/bitstream/handle/11336/91353/CONICET_Digital_Nro.079a4150-f1c6-47e4-9c09-787246f14bdf_A.pdf?sequence=2&isAllowed=y", "Mineral surfaces: goethite holds 2.4, 2.2 and 1.3 umol phosphate per m2 at pH 4.5, 7.0 and 9.5"),
 ("R106", "A real time in situ ATR-FTIR spectroscopic study of glyphosate desorption from goethite as induced by phosphate adsorption: effect of surface coverage. CONICET Digital.",
  "https://ri.conicet.gov.ar/bitstream/handle/11336/5466/CONICET_Digital_Nro.7455_A.pdf?sequence=2", "Mineral surfaces: Langmuir K 0.45 per uM and maximum 2.82 umol per m2 for phosphate on goethite"),
 ("R104", "Wilke, C. A conversation with Karina Sand. ACS Central Science, 2024.",
  "https://pmc.ncbi.nlm.nih.gov/articles/PMC10823508/", "Mineral surfaces: immobilised DNA has fewer groups open to attack, but is harder to extract"),
]

def ref_row(rid, cit, url, note):
    return {"id": rid, "citation": cit, "url": url, "used_in": ["Mineral surfaces"], "tier": "Tier B", "note": note}

refs = [r for r in m["references"] if r["id"] not in {x[0] for x in REFS}]
refs += [ref_row(*x) for x in REFS]
m["references"] = refs

U = {r[0]: r[2] for r in REFS}

# Each mineral: phosphate as the model adsorbate, 25 C, reference pH 7.
#   pzc            point of zero charge (bulk), pH units
#   ssa_m2_g       specific surface area exposed to water
#   gmax_umol_m2   maximum phosphate held per square metre
#   k7_l_umol      Langmuir affinity at pH 7, litres per micromole (1 L per umol = 10^6 per M)
#   ph_slope       how many log units the affinity drops per pH unit above 7
#   f_locked       fraction of what is bound that does not come off again on a useful time
MINERALS = [
 dict(id="none", name="No surface", group="none", formula="", pzc=7, ssa_m2_g=0, gmax_umol_m2=0, k7_l_umol=0, ph_slope=0, f_locked=0,
      hadean="Free solution. The baseline for every handoff that does not already assume a surface.", tier="A",
      why="Nothing is held, nothing is protected and nothing is gathered.", source_urls=[]),
 dict(id="goethite", name="Goethite", group="Fe(III) oxyhydroxide", formula="alpha-FeOOH", pzc=7.5, ssa_m2_g=50, gmax_umol_m2=2.2, k7_l_umol=0.3, ph_slope=0.25, f_locked=0.67,
      hadean="Needs oxidised iron. Rare on an anoxic Hadean surface, though UV photo-oxidation of Fe(II) could make some in sunlit water. Kept as the best measured benchmark.",
      tier="A", why="The best characterised phosphate sorbent. About 2.2 umol per m2 at pH 7, falling to 1.3 at pH 9.5. Langmuir K 0.15 to 0.45 per uM in different studies. Inner-sphere bidentate complexes. Only about a third of bound phosphate comes off easily.",
      source_urls=[U["R105"], U["R106"], U["R96"], U["R95"], U["R97"], U["R94"]]),
 dict(id="ferrihydrite", name="Ferrihydrite", group="Fe(III) oxyhydroxide", formula="Fe(OH)3, poorly ordered", pzc=7.9, ssa_m2_g=250, gmax_umol_m2=2.0, k7_l_umol=0.3, ph_slope=0.25, f_locked=0.7,
      hadean="The first iron oxide to form when Fe(II) meets an oxidant. Same caveat as goethite, but more likely to appear briefly.",
      tier="B", why="Same chemistry as goethite on a much larger surface, so it holds more per gram. Point of zero charge 7.9.",
      source_urls=[U["R94"], U["R96"]]),
 dict(id="greenrust", name="Green rust (fougerite)", group="Fe(II)-Fe(III) layered hydroxide", formula="Fe(II)4Fe(III)2(OH)12 X", pzc=8.0, ssa_m2_g=40, gmax_umol_m2=2.0, k7_l_umol=0.2, ph_slope=0.15, f_locked=0.5,
      hadean="Forms where Fe(II)-rich water meets alkaline fluid, so it is the iron mineral most at home in an anoxic Hadean ocean and in alkaline vent chimneys.",
      tier="C", why="Positively charged layers that exchange anions, so phosphate is taken up by exchange and surface complexation. Affinity and site density are set below goethite as a judgement, and part of the uptake can be released by exchange.",
      source_urls=[U["R98"]]),
 dict(id="brucite", name="Brucite and brucite-like layers", group="Mg hydroxide", formula="Mg(OH)2", pzc=11.0, ssa_m2_g=20, gmax_umol_m2=1.5, k7_l_umol=0.1, ph_slope=0.1, f_locked=0.4,
      hadean="Made by serpentinisation of olivine, so common in alkaline vent systems. The brucite-like sheet in chlorite is where Sand and co-workers saw DNA bind in seawater.",
      tier="C", why="Positive up to about pH 11, so it attracts phosphate across the whole Hadean range. Numbers are a judgement, held below goethite.",
      source_urls=[U["R99"], U["R92"]]),
 dict(id="apatite", name="Hydroxyapatite", group="Ca phosphate", formula="Ca5(PO4)3OH", pzc=7.6, ssa_m2_g=60, gmax_umol_m2=1.5, k7_l_umol=0.05, ph_slope=0.02, f_locked=0.6,
      hadean="Present as an accessory mineral in basalt and granite. It is also where free phosphate ends up, so it is both a store and a trap.",
      tier="B", why="Binding hardly depends on pH, because Ca-rich faces and Ca2+ bridges hold the phosphate group. Singh and co-workers saw almost no change in DNA uptake between pH 6.7 and 8.9.",
      source_urls=[U["R94"]]),
 dict(id="calcite", name="Calcite", group="carbonate", formula="CaCO3", pzc=8.5, ssa_m2_g=0.7, gmax_umol_m2=2.0, k7_l_umol=0.05, ph_slope=0.1, f_locked=0.8,
      hadean="Precipitates wherever CO2-rich water meets Ca. Common, but with a small surface per gram.",
      tier="B", why="Positive below about pH 8 to 9.5, with charge-dense step edges where DNA does not move. Bound phosphate tends to turn into calcium phosphate, so most of it is locked.",
      source_urls=[U["R102"], U["R91"], U["R90"]]),
 dict(id="kaolinite", name="Kaolinite", group="1:1 clay", formula="Al2Si2O5(OH)4", pzc=4.5, ssa_m2_g=19, gmax_umol_m2=2.9, k7_l_umol=0.075, ph_slope=0.2, f_locked=0.4,
      hadean="A weathering product of feldspar under acidic, CO2-rich conditions.",
      tier="B", why="Phosphate binds at the Al-OH edges, not the faces. Affinity set at a quarter of goethite, the ratio Amadou and co-workers measured for inorganic phosphate. About 60 per cent desorbs easily.",
      source_urls=[U["R95"], U["R91"], U["R103"]]),
 dict(id="smectite", name="Smectite (montmorillonite)", group="2:1 clay", formula="(Na,Ca)0.3(Al,Mg)2Si4O10(OH)2", pzc=2.5, ssa_m2_g=83, gmax_umol_m2=1.44, k7_l_umol=0.094, ph_slope=0.3, f_locked=0.5,
      hadean="The first clay to form when basalt weathers or is altered by warm water, so it is the most likely clay on the Hadean Earth and in carbonaceous chondrites.",
      tier="B", why="Faces are negative, edges are positive up to about pH 9 to 10, so binding falls steeply with pH (88 per cent less DNA at pH 9 than at pH 5). Smectite held 200 times more DNA than quartz in the Kap Kobenhavn work.",
      source_urls=[U["R95"], U["R94"], U["R93"], U["R92"]]),
 dict(id="glass", name="Volcanic glass and pumice", group="silicate glass", formula="SiO2-rich glass", pzc=3.0, ssa_m2_g=2, gmax_umol_m2=1.0, k7_l_umol=0.02, ph_slope=0.2, f_locked=0.3,
      hadean="Everywhere volcanoes erupt, and floating pumice rafts carry it across the ocean. This is the reference surface behind handoff H12.",
      tier="C", why="Small surface and a weak, mostly negative surface, so on its own it holds little phosphate (294 mg per kg in one test). Cation bridges do much of the work.",
      source_urls=[U["R101"]]),
 dict(id="quartz", name="Quartz and silica", group="silicate", formula="SiO2", pzc=2.0, ssa_m2_g=0.5, gmax_umol_m2=0.3, k7_l_umol=0.002, ph_slope=0.1, f_locked=0.2,
      hadean="Rare in the Hadean, because there was little granite. Kept as the weak end of the scale.",
      tier="B", why="Negative at every relevant pH, so it binds phosphate groups only through cation bridges. DNA on quartz is easy to extract again, about 40 per cent comes back.",
      source_urls=[U["R91"], U["R93"]]),
 dict(id="mica", name="Mica and illite faces", group="2:1 sheet silicate face", formula="KAl2(AlSi3O10)(OH)2", pzc=2.5, ssa_m2_g=10, gmax_umol_m2=0.5, k7_l_umol=0.001, ph_slope=0, f_locked=0.2,
      hadean="Stands in for the flat negative faces of any sheet silicate.",
      tier="A", why="The clearest case of cation bridging. Plasmid DNA did not bind to mica in NaCl but did bind in 10 mM MgCl2, and adhesion in 10 mM Mg was stronger than in 100 mM Na.",
      source_urls=[U["R90"]]),
 dict(id="mackinawite", name="Mackinawite and Fe-Ni sulfide", group="sulfide", formula="FeS, (Fe,Ni)S", pzc=7.5, ssa_m2_g=50, gmax_umol_m2=0.8, k7_l_umol=0.02, ph_slope=0.2, f_locked=0.2,
      hadean="The chimney wall mineral of an alkaline vent. This is the reference surface behind handoff H9.",
      tier="C", why="Point of zero charge about 7.5. Holds anions weakly and labile, so it gathers little phosphate but lets go easily.",
      source_urls=[U["R100"]]),
]
m["minerals"] = MINERALS

# Which handoffs already assume a particular surface. For those, the layer applies
# the ratio of the chosen surface to the reference surface, so nothing is counted twice.
SURF_REF = {"H9": "mackinawite", "H11": "smectite", "H12": "glass"}
for h in m["handoffs"]:
    h.pop("surface_reference", None)
    if h["id"] in SURF_REF:
        h["surface_reference"] = SURF_REF[h["id"]]

DEFAULTS = {
 "SC1": ("greenrust", 9.0, 100, "Chimney pores are packed with green rust and brucite, and the mixing zone between vent fluid and ocean sits near pH 9."),
 "SC2": ("smectite", 7.0, 10, "Basalt weathers to smectite on land, and a drying pool is muddy."),
 "SC3": ("smectite", 8.0, 10, "Warm water alters impact melt and basalt to smectite."),
 "SC4": ("glass", 7.0, 10, "The pumice itself, beached in a tidal zone. This reproduces handoff H12 exactly."),
 "SC5": ("smectite", 7.0, 0.1, "Dust in ice. Little solid per litre of brine."),
 "SC6": ("smectite", 7.0, 0.1, "Clay-rich carbonaceous chondrite material, thinly spread."),
}
for sc in m["scenarios"]:
    mid, ph, load, why = DEFAULTS[sc["id"]]
    sc["surface_mineral"] = mid
    sc["surface_ph"] = ph
    sc["surface_loading_g_l"] = load
    sc["surface_note"] = "Tier C, new to this model. " + why

m["surface_method"] = {
 "summary": "A mineral surface does three things to a molecule in the model. It holds it, which is binding affinity. It protects it while held, which is stability. And it lets it go again, or not, which decides whether it can react. Phosphate stands in for every phosphate-bearing or anionic molecule, because nucleotides and DNA bind minerals mainly through their phosphate groups.",
 "steps": [
  "Affinity at your pH: K = K7 x 10^(slope x (7 minus pH)), plus a cation bridge term on the negative part of the surface.",
  "Cation bridge: K bridge x [M2+] / ([M2+] + half saturation) x fraction of the surface that is negative, where that fraction is 1 / (1 + 10^(pzc minus pH)).",
  "Coverage: theta = K C / (1 + K C), with C the dissolved phosphate.",
  "Distribution coefficient: Kd = Gamma max x surface area x K / (1 + K C), in litres per gram.",
  "Fraction held: f = Kd x loading / (1 + Kd x loading). The concentration factor is 1 / (1 minus f).",
  "Protection while held: PF effective = 1 + (PF minus 1) / (1 + K / K damage). Very strong binding starts to strain the bound molecule.",
  "S2, persistence: tau loss is multiplied by (1 minus f) + f x PF effective.",
  "S3, accumulation: tau transfer is divided by the concentration factor, and tau loss is multiplied as for S2.",
  "S4, activation: tau transfer is divided by 1 + (concentration factor minus 1) x (1 minus theta) x (1 minus locked fraction). Gathering helps only while free sites remain and the molecule can still move.",
 ],
 "caveats": [
  "Bulk point of zero charge is not enough to explain binding, because real surfaces have steps, edges and defects with different affinities (Verma et al. 2024, Freeman et al. 2023).",
  "Heating weakens phosphate binding on goethite (less held at 68 C than at 25 C), but the model does not yet correct affinity for temperature.",
  "Long polymers bind more strongly per molecule than short ones on oxides and clays, and less on hydroxyapatite (Singh et al. 2025). Phosphate is a small-molecule proxy.",
  "Strong binding can damage DNA and makes it harder to recover, so a high protection factor and a high affinity are not the same thing.",
 ],
}

gaps = [g for g in m["measurement_gaps"] if g.get("id") != "Gap 7"]
gaps.append({"id": "Gap 7",
  "gap": "Rungs affected: S2 to S4. Phosphate and nucleotide affinity, protection factor and locked fraction on Hadean-relevant surfaces: green rust, brucite, Fe(II) smectite, volcanic glass and Fe-Ni sulfide, under anoxic water with realistic Mg2+ and Ca2+.",
  "why_it_matters": "These three numbers decide whether a surface speeds S2 to S4 up or locks the molecules away. Almost every Hadean-relevant mineral in the model is Tier C.",
  "what_would_settle_it": "Batch isotherms at pH 6 to 10 with 1 to 50 mM Mg2+, desorption series, and hydrolysis half-lives of adsorbed versus free phosphate esters or oligonucleotides on the same powders.",
  "linked_prediction": "Tier C, new to this model"})
m["measurement_gaps"] = gaps

m["meta"]["surface_addition"] = "Mineral surface layer added in October 2026: minerals array, surface_method, per-scenario surface defaults, handoffs.surface_reference and references R90 to R106. Phosphate is the model adsorbate."
P.write_text(json.dumps(m, indent=1, ensure_ascii=False))
print("minerals", len(MINERALS), "references", len(m["references"]))
