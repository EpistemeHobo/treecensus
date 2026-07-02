# Reproducibility Notes

## Baseline Validation

After running the pipelines, validate counts:

```bash
python3 seed/checks/validate_expected_outputs.py
```

The validator compares:

- relational table row counts,
- Looker output row counts,
- observation-type counts,
- geocoding completeness,
- species/scientific-name completeness,
- subplot distributions,
- validation flag counts.

## Expected Small Examples

The files in `seed/examples/` contain the first five rows from each current Looker output. They are not meant to be analytical samples. Their purpose is schema and formatting validation:

- each has the same 80-column Looker schema,
- CSV quoting/encoding can be tested,
- downstream import tools can be smoke-tested without loading the full output.

## Known Non-Reproducible Fields

Most table contents should reproduce exactly from the same input files. The main exception is timestamp-like metadata:

- `raw_import_batch.imported_at`
- generated file modification times

The seed validator intentionally focuses on row counts and quality summaries rather than byte-for-byte output identity.

## Source Data Caveats

- Input source files are intentionally not all tracked because they are runtime data.
- The small species crosswalk workbook is tracked because it is a compact reference artifact required to reproduce the current species mapping.
- The RAR 2.1 extraction is staged in `dmcr_rar_2_1_source/`, which is ignored by git and can be recreated from `Excel/สำรวจประเมิน 2.1.rar`.
