# FACTS: every claim in the film, with its source or measurement

Research done 2026-10-17 with web search. Wikipedia and several primary sites could not be opened from the build machine, so some wordings below are search-result extracts of the cited pages. Check them against the pages before publishing.

## Stated facts

| On screen / spoken | Source | Wording |
|---|---|---|
| "31 hectares" (reading "SITE AREA 31 ha", VO2) | Wikipedia, *Msheireb Downtown Doha*, https://en.wikipedia.org/wiki/Msheireb_Downtown_Doha; also Rawlplug project page, https://rawlplug.com/global/en/reference-objects/object/msheireb-downtown-doha | "Project area: 31 hectares (310,000 square metres)". One 2010 report gives 35 ha; most sources give 31 ha. |
| "Construction began here in January 2010" (VO3) | Wikipedia (as above) | "Initial construction began in January 2010". A Frontiers paper (https://www.frontiersin.org/journals/sustainable-cities/articles/10.3389/frsc.2023.1186781/full) dates the project's *launch* to 2008. The film says *construction*. |
| "Four restored houses open as museums", "OCT 2015" (VO6, reading) | Gulf Times, *Sheikha Moza opens Msheireb Museums*, https://www.gulf-times.com/story/459644/sheikha-moza-opens-msheireb-museums; Wikipedia, *Msheireb Museums*, https://en.wikipedia.org/wiki/Msheireb_Museums; Sheikha Moza office, https://www.mozabintnasser.qa/en-gb/news/hh-sheikha-moza-opens-msheireb-museums-heritage-quarter-msheireb-downtown | Formally opened to the public in October 2015. The four houses are Bin Jelmood House, Company House, Mohamed bin Jassim House and Radwani House. |
| "MSHEIREB METRO STATION OPENS 8 MAY 2019", "The metro opens beneath it" (VO7) | Qatar Ministry of Transport, https://www.mot.gov.qa/en/news/doha-metro-red-line-south-initial-operation-open-public-wednesday; Wikipedia, *Msheireb station*, https://en.wikipedia.org/wiki/Msheireb_station | Red Line South opened to the public on 8 May 2019, with Msheireb listed as an interchange station. |
| "Doha Metro Red Line · largest station" (reading note) | Wikipedia, *Msheireb station*; Farrells, https://farrells.com/project/doha-metro/ | "considered the largest station in the city"; "the largest in the network". |
| "Souq Waqif" label, "Al Rayyan Road" label | Placed by hand on the imagery, matching the user's reference screenshot | Labels only. No claim is made. |

## Measured in this film

| On screen | Method |
|---|---|
| Outline of the site; "traced outline 32.2 ha" | Polygon traced by hand on the Landsat 8 pan band of 2020-02-17 (scene LC08_L1TP_163042_20200217_20200225_01_T1) and checked against 2013-11-28, following the area the user marked. Vertices are in `tools/aoi.py`. Area is geodesic (pyproj, WGS84). The outline is approximate (±1 pan pixel, 15 m), which explains most of the gap to the published 31 ha. |
| Range line "625 m" along Al Rayyan Road | Geodesic distance between the traced north-west (51.5234° E, 25.2891° N) and north-east (51.5296° E, 25.2889° N) vertices. |
| "ONE EXCAVATION ACROSS THE SITE · NOV 2013 · seen" | Visual reading of the 2013-11-28 Landsat 8 image: the whole outline is a uniform dark surface, unlike the cleared ground of 2010–12 and the block pattern from 2015 on. The film marks this as "seen", not measured. |
| Year plates 2010–2020 | 2010–2012: Landsat 7 ETM+ composites (median of 3–4 same-season dates, to fill the SLC-off scan gaps). 2013–2020: one Landsat 8 OLI date each. All pan-sharpened to 15 m (Brovey) and histogram-matched to 2020 on ground outside the site. Scene IDs are in `plates/plates.json` and `tools/plates.py`. |
| "25.286° N 51.527° E" | Centre of the traced outline. |

## Not claimed

- No building, street or excavation is drawn. Everything on the ground is the satellite picture.
- The film does not say when demolition began. Demolition dates were not found in public sources, and the 2010 plate (February–April) already shows the ground cleared.
- The film does not give a project completion date. Sources disagree ("2012–2016", "2020").
