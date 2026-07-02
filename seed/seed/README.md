# DMCR ETL Handoff Seed

This folder is the quick-start handoff for reproducing the current DMCR outputs on another system.

It does not replace the milestone docs in `docs/`; it condenses the workflow, commands, dependencies, expected output counts, and small example output files that a colleague can use for validation.

## Repository Root

Expected repository path in the current workstation:

```text
/tree_census
```

The wrapper scripts also work from another path because they resolve the repository root from their own location. If needed, set `REPO_ROOT=/path/to/tree_census`.

## Inputs

Required runtime input files and folders:

| Input | Purpose | Tracked |
| --- | --- | --- |
| `DMCR_Report.csv` | Wide electronic-form CSV export | No |
| `DMCRcensusform1_Report_PlotInfo.csv` | UTM origin source for the CSV Looker map output | No |
| `Excel/` | First batch filled Excel templates plus the RAR archive | No |
| `Excel/สำรวจประเมิน 2.1.rar` | RAR 2.1 Excel template archive | No |
| `รายชื่อพันธุ์ไม้-2026-2.xlsx` | Species crosswalk: Thai/common name, scientific name, habit abbreviation, IUCN, `SP CODE` | Yes |

## Dependencies

Install the Python dependencies:

```bash
python3 -m pip install -r requirements.txt
```

Current requirements:

```text
PyYAML>=6.0.2
openpyxl>=3.1
pytest>=8.2
```

RAR extraction uses local `bsdtar`.

## Reproduce Outputs

Run all pipelines:

```bash
seed/bin/run_all_pipelines.sh
```

Run individual pipelines:

```bash
seed/bin/run_csv_pipeline.sh
seed/bin/run_excel_batch1_pipeline.sh
seed/bin/run_rar_2_1_pipeline.sh
```

Validate current generated output counts against the seed baseline:

```bash
python3 seed/checks/validate_expected_outputs.py
```

## Generated Output Directories

| Output directory | Description |
| --- | --- |
| `dmcr_milestone0_audit/` | Audit outputs for the electronic-form CSV |
| `dmcr_milestone1_etl/` | Relational CSV/SQLite/Looker output for the electronic-form CSV |
| `dmcr_excel_milestone1_etl/` | Relational CSV/SQLite/Looker output for first batch Excel workbooks |
| `dmcr_rar_2_1_source/` | Extracted RAR 2.1 staging directory |
| `dmcr_excel_2_1_etl/` | Relational CSV/SQLite/Looker output for RAR 2.1 workbooks |

These runtime outputs are ignored by git.

## Key Rules

- Do not use D2/item/tag ID as a primary key. It is preserved only as raw data.
- Tree stem continuation rows are separate stem records linked to the nearest preceding tree item.
- For RAR 2.1, the real plot is the parent plot folder, not the C/N/E/W workbook filename.
- For RAR 2.1, filename `E` means subplot `SE`; filename `W` means subplot `SW`.
- Excel-derived outputs have local plot-relative `x/y`; latitude/longitude require a plot/subplot UTM origin source.
- `รายชื่อพันธุ์ไม้-2026-2.xlsx` should be supplied through `--species-crosswalk` to enrich species names and numeric `SP CODE` values.

## Seed Output Examples

Small example Looker CSV files are in `seed/examples/`:

| Example | Source output |
| --- | --- |
| `csv_form_looker_sample.csv` | `dmcr_milestone1_etl/dmcr_looker_map_points.csv` |
| `excel_batch1_looker_sample.csv` | `dmcr_excel_milestone1_etl/dmcr_excel_looker_map_points.csv` |
| `excel_rar_2_1_looker_sample.csv` | `dmcr_excel_2_1_etl/dmcr_excel_2_1_looker_map_points.csv` |

Expected output summaries:

| File | Purpose |
| --- | --- |
| `checks/expected_output_summary.csv` | Human-readable count baseline |
| `checks/expected_output_summary.json` | Machine-readable validation baseline |

## Main Implementation Files

| File | Purpose |
| --- | --- |
| `scripts/audit_dmcr_form.py` | Milestone 0 audit for the wide electronic-form CSV |
| `scripts/etl_dmcr_form.py` | Relational ETL for the wide electronic-form CSV |
| `scripts/etl_dmcr_excel_templates.py` | Relational ETL for filled Excel templates and RAR 2.1 |
| `scripts/build_looker_map_dataset.py` | Builds a single flat Looker map CSV from relational outputs |

## Deeper Context

Read these when more detail is needed:

- `docs/milestone_0_dmcr_etl_audit.md`
- `docs/milestone_1_dmcr_relational_etl.md`
- `docs/milestone_2_dmcr_excel_template_etl.md`
- `docs/milestone_3_dmcr_rar_2_1_etl.md`
- `docs/agent_coordination.md`
