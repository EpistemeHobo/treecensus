"""Thin BigQuery insert helpers.

Uses google-cloud-bigquery's streaming insert (`insert_rows_json`) for small,
frequent inserts (webhook path). Batched jobs stay a follow-up for backfill.

In dry-run mode nothing is written; rows are logged so local tests work
without cloud access.
"""
from __future__ import annotations

import logging
from typing import Iterable

from google.cloud import bigquery

from .config import settings

log = logging.getLogger(__name__)

_client: bigquery.Client | None = None


def client() -> bigquery.Client:
    global _client
    if _client is None:
        _client = bigquery.Client(project=settings.gcp_project_id or None)
    return _client


def fqn(table: str) -> str:
    if not settings.gcp_project_id:
        raise RuntimeError(
            "GCP_PROJECT_ID is not set. Set it or run with ETL_DRY_RUN=1."
        )
    return f"{settings.gcp_project_id}.{settings.bigquery_dataset}.{table}"


def insert_rows(table: str, rows: Iterable[dict]) -> None:
    rows = list(rows)
    if not rows:
        return
    if settings.dry_run:
        log.info("[dry_run] would insert %d rows into %s: %s", len(rows), table, rows)
        return
    errors = client().insert_rows_json(fqn(table), rows)
    if errors:
        raise RuntimeError(f"BigQuery insert into {table} failed: {errors}")
