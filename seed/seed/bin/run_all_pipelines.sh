#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

"$REPO_ROOT/seed/bin/run_csv_pipeline.sh"
"$REPO_ROOT/seed/bin/run_excel_batch1_pipeline.sh"
"$REPO_ROOT/seed/bin/run_rar_2_1_pipeline.sh"
python3 "$REPO_ROOT/seed/checks/validate_expected_outputs.py"
