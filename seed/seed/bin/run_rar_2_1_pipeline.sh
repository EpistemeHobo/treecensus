#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
RAR_ARCHIVE="$REPO_ROOT/Excel/สำรวจประเมิน 2.1.rar"
RAR_STAGE="$REPO_ROOT/dmcr_rar_2_1_source"
RAR_INPUT_DIR="$RAR_STAGE/สำรวจประเมิน 2.1"
SPECIES_CROSSWALK="$REPO_ROOT/รายชื่อพันธุ์ไม้-2026-2.xlsx"

python3 -m pip install -r "$REPO_ROOT/requirements.txt"

if [[ ! -d "$RAR_INPUT_DIR" ]]; then
  mkdir -p "$RAR_STAGE"
  bsdtar -xf "$RAR_ARCHIVE" -C "$RAR_STAGE"
fi

python3 "$REPO_ROOT/scripts/etl_dmcr_excel_templates.py" \
  --input-dir "$RAR_INPUT_DIR" \
  --outdir "$REPO_ROOT/dmcr_excel_2_1_etl" \
  --sqlite "$REPO_ROOT/dmcr_excel_2_1_etl/dmcr_excel_2_1_clean.sqlite" \
  --species-crosswalk "$SPECIES_CROSSWALK"

python3 "$REPO_ROOT/scripts/build_looker_map_dataset.py" \
  --input-dir "$REPO_ROOT/dmcr_excel_2_1_etl" \
  --output "$REPO_ROOT/dmcr_excel_2_1_etl/dmcr_excel_2_1_looker_map_points.csv"
