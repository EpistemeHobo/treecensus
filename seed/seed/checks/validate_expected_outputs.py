#!/usr/bin/env python3
"""Validate current generated outputs against the seed expected count summary."""

from __future__ import annotations

import csv
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
EXPECTED_PATH = REPO_ROOT / "seed" / "checks" / "expected_output_summary.json"

RUNS = {
    "csv_form": {
        "outdir": REPO_ROOT / "dmcr_milestone1_etl",
        "looker": "dmcr_looker_map_points.csv",
    },
    "excel_batch1": {
        "outdir": REPO_ROOT / "dmcr_excel_milestone1_etl",
        "looker": "dmcr_excel_looker_map_points.csv",
    },
    "excel_rar_2_1": {
        "outdir": REPO_ROOT / "dmcr_excel_2_1_etl",
        "looker": "dmcr_excel_2_1_looker_map_points.csv",
    },
}

TABLES = [
    "raw_import_batch",
    "raw_form_rows",
    "dim_project",
    "dim_plot",
    "dim_subplot",
    "dim_species",
    "dim_species_crosswalk",
    "dim_codebook",
    "fact_submission",
    "obs_tree",
    "obs_tree_stem",
    "obs_seedling",
    "obs_woody_debris",
    "etl_validation_flags",
]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def nonblank(value: str) -> bool:
    return value is not None and str(value).strip() != ""


def count_table(path: Path) -> int | None:
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return max(sum(1 for _ in handle) - 1, 0)


def summarize_run(outdir: Path, looker_name: str) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for table in TABLES:
        count = count_table(outdir / f"{table}.csv")
        if count is not None:
            result[table] = count

    looker_rows = read_csv(outdir / looker_name)
    obs_counts = Counter(row["observation_type"] for row in looker_rows)
    geo_counts = Counter(row["geo_ready"] for row in looker_rows)
    species_rows = [
        row for row in looker_rows if row["observation_type"] in {"tree_stem", "seedling"}
    ]

    result.update(
        {
            "looker_rows": len(looker_rows),
            "looker_tree_stem": obs_counts.get("tree_stem", 0),
            "looker_seedling": obs_counts.get("seedling", 0),
            "looker_woody_debris": obs_counts.get("woody_debris", 0),
            "geo_ready_true": geo_counts.get("true", 0),
            "geo_ready_false": geo_counts.get("false", 0),
            "local_xy_complete": sum(
                nonblank(row["local_x_m"]) and nonblank(row["local_y_m"])
                for row in looker_rows
            ),
            "latlon_complete": sum(
                nonblank(row["latitude"]) and nonblank(row["longitude"])
                for row in looker_rows
            ),
            "species_applicable_rows": len(species_rows),
            "species_id_complete": sum(nonblank(row["species_id"]) for row in species_rows),
            "scientific_name_complete": sum(
                nonblank(row["scientific_name"]) for row in species_rows
            ),
        }
    )

    dim_subplot_path = outdir / "dim_subplot.csv"
    if dim_subplot_path.exists():
        result["subplot_distribution"] = dict(
            sorted(Counter(row["subplot_code"] for row in read_csv(dim_subplot_path)).items())
        )

    flags_path = outdir / "etl_validation_flags.csv"
    if flags_path.exists():
        result["validation_flags"] = dict(
            Counter(row["flag_code"] for row in read_csv(flags_path)).most_common()
        )
    return result


def main() -> int:
    expected = json.loads(EXPECTED_PATH.read_text(encoding="utf-8"))
    mismatches: list[str] = []
    for run_name, run in RUNS.items():
        actual = summarize_run(run["outdir"], run["looker"])
        expected_run = expected[run_name]
        for key, expected_value in expected_run.items():
            if key == "label":
                continue
            actual_value = actual.get(key)
            if actual_value != expected_value:
                mismatches.append(
                    f"{run_name}.{key}: expected {expected_value!r}, got {actual_value!r}"
                )
    if mismatches:
        print("Output validation failed:")
        for mismatch in mismatches:
            print(f"- {mismatch}")
        return 1
    print("Output validation passed for all seed summaries.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
