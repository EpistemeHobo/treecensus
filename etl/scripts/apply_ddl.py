"""Apply every SQL file in etl/sql/ddl (and views/) to BigQuery.

Templating: `${GCP_PROJECT_ID}` and `${BIGQUERY_DATASET}` are substituted from
env vars. Statements are split on `;` at line-end and run one by one.

Usage:
  GCP_PROJECT_ID=my-proj BIGQUERY_DATASET=tree_census \
    python etl/scripts/apply_ddl.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from google.cloud import bigquery

ROOT = Path(__file__).resolve().parents[1]
DDL_DIRS = [ROOT / "sql" / "ddl", ROOT / "sql" / "views"]


def render(sql: str, project: str, dataset: str) -> str:
    return sql.replace("${GCP_PROJECT_ID}", project).replace("${BIGQUERY_DATASET}", dataset)


def main() -> int:
    project = os.environ.get("GCP_PROJECT_ID")
    dataset = os.environ.get("BIGQUERY_DATASET", "tree_census")
    if not project:
        print("GCP_PROJECT_ID must be set", file=sys.stderr)
        return 1

    client = bigquery.Client(project=project)

    # Ensure dataset exists.
    dataset_ref = f"{project}.{dataset}"
    try:
        client.get_dataset(dataset_ref)
    except Exception:
        print(f"Creating dataset {dataset_ref}")
        client.create_dataset(bigquery.Dataset(dataset_ref))

    for directory in DDL_DIRS:
        for path in sorted(directory.glob("*.sql")):
            print(f"Applying {path.relative_to(ROOT)}")
            sql = render(path.read_text(), project, dataset)
            for stmt in [s.strip() for s in sql.split(";") if s.strip()]:
                client.query(stmt).result()

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
