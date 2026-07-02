# Current Output Baseline

This file summarizes the current generated outputs used by the seed validation scripts.

## One-Table Summary

| Metric | CSV electronic form | Excel batch 1 | Excel RAR 2.1 |
| --- | ---: | ---: | ---: |
| Raw rows preserved | 10,720 | 107,381 | 252,757 |
| Projects/provinces | 1 | 6 | 5 |
| Real plots | 1 | 19 | 25 |
| Subplots | 4 | 76 | 95 |
| Canonical species rows | 9 | 41 | 77 |
| Species crosswalk rows | 0 | 100 | 100 |
| Fact submissions | 243 | 2,600 | 7,348 |
| Tree observations | 216 | 2,024 | 6,048 |
| Tree stem observations | 236 | 2,883 | 6,838 |
| Seedling observations | 4 | 391 | 1,005 |
| Woody debris observations | 23 | 185 | 295 |
| Looker output rows | 263 | 3,459 | 8,138 |
| Looker tree stems | 236 | 2,883 | 6,838 |
| Looker seedlings | 4 | 391 | 1,005 |
| Looker woody debris | 23 | 185 | 295 |
| Rows with local x/y | 263 | 3,454 | 8,096 |
| Rows with latitude/longitude | 259 | 0 | 0 |
| `geo_ready=true` | 259 | 0 | 0 |
| `geo_ready=false` | 4 | 3,459 | 8,138 |
| Tree/seedling rows with `species_id` | 239 / 240 | 3,264 / 3,274 | 7,843 / 7,843 |
| Tree/seedling rows with scientific name | 239 / 240 | 3,244 / 3,274 | 7,618 / 7,843 |
| Validation flag rows | 297 | 4,249 | 8,787 |

## Subplot Distributions

| Output | Distribution |
| --- | --- |
| CSV electronic form | blank=1, C=1, N=1, SW=1 |
| Excel batch 1 | C=19, N=19, SE=19, SW=19 |
| Excel RAR 2.1 | C=25, N=23, SE=25, SW=22 |

## Top Validation Flags

| Output | Top flags |
| --- | --- |
| CSV electronic form | `duplicate_or_nonunique_item_tag_id=263`; `unusual_stem_number_sequence=25`; `unknown_row_removed=4`; `missing_required_project_plot_subplot=4`; `subheader_row_removed=1` |
| Excel batch 1 | `duplicate_or_nonunique_item_tag_id=3268`; `excel_stem_continuation_row=859`; `excel_tree_species_inferred_from_dominant_code=77`; `excel_species_scientific_name_missing=19`; `excel_tree_species_inferred_from_code=16` |
| Excel RAR 2.1 | `duplicate_or_nonunique_item_tag_id=7296`; `excel_stem_continuation_row=790`; `excel_species_scientific_name_missing=661`; `excel_tree_local_coordinates_missing=39`; `excel_template_batch_import=1` |

## Interpretation

- The electronic-form CSV output is the only current output with latitude/longitude populated because it uses `DMCRcensusform1_Report_PlotInfo.csv`.
- The two Excel-derived outputs have strong local `x/y` coverage but need a plot/subplot UTM origin source before they are map-ready by latitude/longitude.
- The species crosswalk greatly improves scientific-name coverage for Excel-derived outputs, but spelling variants and non-standard entries still need review.
