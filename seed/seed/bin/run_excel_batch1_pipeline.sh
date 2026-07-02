#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SPECIES_CROSSWALK="$REPO_ROOT/รายชื่อพันธุ์ไม้-2026-2.xlsx"

python3 -m pip install -r "$REPO_ROOT/requirements.txt"

python3 "$REPO_ROOT/scripts/etl_dmcr_excel_templates.py" \
  --input-dir "$REPO_ROOT/Excel" \
  --outdir "$REPO_ROOT/dmcr_excel_milestone1_etl" \
  --sqlite "$REPO_ROOT/dmcr_excel_milestone1_etl/dmcr_excel_clean.sqlite" \
  --species-crosswalk "$SPECIES_CROSSWALK"

python3 "$REPO_ROOT/scripts/build_looker_map_dataset.py" \
  --input-dir "$REPO_ROOT/dmcr_excel_milestone1_etl" \
  --output "$REPO_ROOT/dmcr_excel_milestone1_etl/dmcr_excel_looker_map_points.csv"
