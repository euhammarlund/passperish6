#!/usr/bin/env python3
"""Add the T5 ecosystem term, the remaining-time rule and their sources to data/model.json. Safe to run twice."""
import json
P = "/home/user/workspace/luca-model/data/model.json"
m = json.load(open(P, encoding="utf-8"))
refs = [
  ("R105", "Louca, S. et al. Bacterial diversification through geological time. Nature Ecology and Evolution 2, 1458 to 1467, 2018.",
   "https://pubmed.ncbi.nlm.nih.gov/30061564/", "Tier B",
   "T5: recent bacterial extinction 0.03 to 0.05 per lineage per Myr, only slightly below speciation. Anchors the splitting rate lambda."),
  ("R106", "Marin, J., Battistuzzi, F. U., Brown, A. C. and Hedges, S. B. The Timetree of Prokaryotes. Molecular Biology and Evolution 34, 437 to 446, 2017.",
   "https://pubmed.ncbi.nlm.nih.gov/27965376/", "Tier B",
   "T5: prokaryote lineages grow exponentially at a constant net rate, with no sign of filling up. Supports the pure splitting (Yule) rule."),
  ("R107", "Cross-feeding E. coli in laboratory evolution: Helling et al. 1987 (about 800 generations) and Rozen and Lenski 2000 (about 6,500 generations), as summarised in PMC7728234, 2020.",
   "https://pmc.ncbi.nlm.nih.gov/articles/PMC7728234/", "Tier B",
   "T5: one interaction can evolve within years in a laboratory population, so the link rate has a fast upper end."),
  ("R108", "Smith, N. W. et al. The classification and evolution of bacterial cross-feeding. Frontiers in Ecology and Evolution 7, 153, 2019.",
   "https://www.frontiersin.org/journals/ecology-and-evolution/articles/10.3389/fevo.2019.00153/full", "Tier B",
   "T5: what counts as an ecological interaction (one partner living on what another releases)."),
  ("R109", "Moody, E. R. R. et al. 2024, ecology section: LUCA was part of an established ecological system, with a genome of about 2.75 Mb and about 2,657 proteins.",
   "https://discovery.ucl.ac.uk/id/eprint/10195667/1/Moody%20et%20al%20(2024)%20LUCA%20paper.pdf", "Tier A",
   "T5: the reason LUCA is modelled as a community and not a single cell. Sets the default community of a few metabolic kinds."),
]
have = {r["id"] for r in m["references"]}
for rid, cit, url, tier, note in refs:
    if rid not in have:
        m["references"].append({"id": rid, "citation": cit, "url": url, "used_in": ["T5 ecosystem"], "tier": tier, "note": note})
terms = m["audit_method"]["terms"]
if not any(t["id"] == "T5" for t in terms):
    terms.append({"id": "T5", "name": "Building LUCA's ecosystem",
      "what_it_measures": "The time from the first cells to a community of X kinds of organisms linked by Y ecological interactions, which is what LUCA was part of when its first evidence appears.",
      "how_estimated": "Splitting into X kinds takes ln(X) divided by the splitting rate per lineage per Myr (a Yule process). Linking Y of the X(X-1)/2 possible pairs takes minus ln(1 minus C) divided by the link rate per pair per Myr, where C is the share of pairs linked. The two run at the same time by default, so the longer counts. An extra time can be added, or the whole term set directly. Same for every scenario, like T4.",
      "tier": "Tier C"})
m["audit_method"]["remaining_note"] = ("Time left is the window minus the total. One full try takes T2 plus T3 plus T4 plus T5, because the setting "
  "stays once it exists; a switch adds T1 to every restart. Tries that fit is the time open for tries divided by one try, rounded down; "
  "the tries that stopped are all of them except ours. The chance to fit treats only T3 as random (waiting for n successes, a gamma "
  "distribution with mean T3) and takes every other term at its central value. Origins running in parallel at different sites are not counted.")
m["meta"]["ecosystem_addition"] = "T5, LUCA's ecosystem, and the time-left rule were added in model version 6. Both are Tier C."
json.dump(m, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("references", len(m["references"]), "terms", [t["id"] for t in terms])
