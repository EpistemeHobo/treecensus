"""Land a Zoho payload into raw_form_rows + raw_import_batch.

The transform (payload → dim/fact) is Milestone 3 and lives elsewhere. This
module only cares about capturing the submission durably and idempotently.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from .bigquery_client import client, fqn, insert_rows
from .config import settings
from .hashing import sha256_of

log = logging.getLogger(__name__)

RAW_ROWS_TABLE = "raw_form_rows"
BATCH_TABLE = "raw_import_batch"


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _external_id(payload: dict) -> str | None:
    """Best-effort Zoho record identifier."""
    for key in ("record_id", "recordId", "id", "Record_ID", "zoho_record_id"):
        v = payload.get(key)
        if v:
            return str(v)
    return None


def _already_landed(external_id: str | None, sha256: str) -> bool:
    """Skip if the same payload (by content hash) has already been stored.
    Prefers external_id match; falls back to sha256 alone if no id."""
    if settings.dry_run:
        return False
    if not settings.gcp_project_id:
        return False

    sql = f"""
      SELECT 1 FROM `{fqn(RAW_ROWS_TABLE)}`
      WHERE sha256 = @sha256
        AND (@external_id IS NULL OR external_id = @external_id)
      LIMIT 1
    """
    from google.cloud import bigquery as bq

    job = client().query(
        sql,
        job_config=bq.QueryJobConfig(
            query_parameters=[
                bq.ScalarQueryParameter("sha256", "STRING", sha256),
                bq.ScalarQueryParameter("external_id", "STRING", external_id),
            ]
        ),
    )
    return any(True for _ in job.result())


def land_payload(payload: dict[str, Any], *, source: str, notes: str | None = None) -> dict:
    """Persist one payload. Returns the batch descriptor."""
    if source not in {"zoho_webhook", "zoho_poll"}:
        raise ValueError(f"unsupported source: {source}")

    payload_sha = sha256_of(payload)
    ext_id = _external_id(payload)
    if _already_landed(ext_id, payload_sha):
        log.info("skipping duplicate payload: external_id=%s sha=%s", ext_id, payload_sha)
        return {"status": "duplicate", "external_id": ext_id, "sha256": payload_sha}

    batch_id = f"batch_{uuid.uuid4().hex[:16]}"
    now = _iso_now()

    insert_rows(
        BATCH_TABLE,
        [
            {
                "id": batch_id,
                "source": source,
                "imported_at": now,
                "row_count": 1,
                "sha256": payload_sha,
                "notes": notes,
            }
        ],
    )
    insert_rows(
        RAW_ROWS_TABLE,
        [
            {
                "id": f"row_{uuid.uuid4().hex[:16]}",
                "import_batch_id": batch_id,
                "source": source,
                "source_row_id": ext_id,
                "external_id": ext_id,
                "payload": json.dumps(payload, ensure_ascii=False),
                "sha256": payload_sha,
                "received_at": now,
            }
        ],
    )
    return {
        "status": "landed",
        "batch_id": batch_id,
        "external_id": ext_id,
        "sha256": payload_sha,
    }
