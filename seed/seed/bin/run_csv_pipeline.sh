#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

python3 -m pip install -r "$REPO_ROOT/requirements.txt"

python3 "$REPO_ROOT/scripts/audit_dmcr_form.py" \
  --input "$REPO_ROOT/DMCR_Report.csv" \
  --outdir "$REPO_ROOT/dmcr_milestone0_audit"

python3 "$REPO_ROOT/scripts/etl_dmcr_form.py" \
  --input "$REPO_ROOT/DMCR_Report.csv" \
  --column-map "$REPO_ROOT/dmcr_milestone0_audit/dmcr_column_map.yaml" \
  --outdir "$REPO_ROOT/dmcr_milestone1_etl" \
  --sqlite "$REPO_ROOT/dmcr_milestone1_etl/dmcr_clean.sqlite"

python3 "$REPO_ROOT/scripts/build_looker_map_dataset.py" \
  --input-dir "$REPO_ROOT/dmcr_milestone1_etl" \
  --output "$REPO_ROOT/dmcr_milestone1_etl/dmcr_looker_map_points.csv" \
  --plot-info "$REPO_ROOT/DMCRcensusform1_Report_PlotInfo.csv"
