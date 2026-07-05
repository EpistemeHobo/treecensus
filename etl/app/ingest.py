"""Land an incoming Zoho payload directly into the flat `observations` table.

The project abandoned the star schema: there is now ONE table with the 80
DMCR Looker map-point fields, and every source (webhook, poll, CSV) writes
the same shape. This module maps a submission payload onto those 80 fields
and streams a single row in.

ASSUMPTION: the payload's keys are the 80 field names below. If Zoho delivers
different key names, populate FIELD_ALIASES to translate them (left = our
field, right = the key Zoho actually sends). Derived fields that a raw
submission may not carry (map_record_id, latitude/longitude, *_code, the
validation_flag_* columns) simply land as NULL until upstream provides them.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from .bigquery_client import client, fqn, insert_rows
from .config import settings
from .hashing import sha256_of

log = logging.getLogger(__name__)

MAP_TABLE = "observations"

# The 80 columns of observations, in table order.
FIELDS: tuple[str, ...] = (
    "map_record_id", "observation_type", "source_row_id", "submission_id",
    "import_batch_id", "source_file_sha256", "project_id", "project_no_raw",
    "project_no_int", "plot_id", "plot_no_raw", "plot_no_int", "subplot_id",
    "subplot_raw", "subplot_no", "subplot_name", "subplot_code", "dataset_type",
    "item_tag_id_raw", "added_time", "offline_added_time", "task_owner",
    "source_status", "local_x_m", "local_y_m", "utm_easting", "utm_northing",
    "utm_zone", "utm_hemisphere", "latitude", "longitude", "geo_ready",
    "coordinate_note", "species_id", "species_raw", "thai_name",
    "scientific_name", "scientific_author", "normalized_species_name",
    "tree_id", "stem_id", "seedling_id", "woody_debris_id", "size_class_raw",
    "size_class_code", "azimuth_deg", "distance_m", "stem_no", "stand_fall_raw",
    "stand_fall_code", "live_dead_raw", "live_dead_code", "gbh_cm",
    "gbh_method_raw", "gbh_method_code", "total_height_m", "height_method_raw",
    "height_method_code", "crown_class_raw", "crown_class_code",
    "crown_condition_raw", "crown_condition_code", "tree_health_raw",
    "tree_health_code", "lichen_pct", "seedling_count", "transect_raw",
    "transect_deg", "large_woody_condition_raw", "large_woody_condition_code",
    "tip_diameter_cm", "middle_diameter_cm", "base_diameter_cm",
    "medium_piece_count", "small_piece_count", "fine_piece_count", "remarks",
    "validation_flag_count", "validation_flag_codes", "validation_flag_severities",
)

# our_field_name -> key Zoho actually sends. Add entries only where they differ.
FIELD_ALIASES: dict[str, str] = {}


def _stringify(value: Any) -> str | None:
    """Store everything verbatim as STRING; NULL stays NULL."""
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def _row_from_payload(payload: dict[str, Any]) -> dict[str, str | None]:
    return {
        field: _stringify(payload.get(FIELD_ALIASES.get(field, field)))
        for field in FIELDS
    }


def _already_landed(map_record_id: str | None) -> bool:
    """Idempotency guard, keyed on map_record_id when present."""
    if settings.dry_run or not settings.gcp_project_id or not map_record_id:
        return False

    from google.cloud import bigquery as bq

    sql = f"SELECT 1 FROM `{fqn(MAP_TABLE)}` WHERE map_record_id = @id LIMIT 1"
    job = client().query(
        sql,
        job_config=bq.QueryJobConfig(
            query_parameters=[bq.ScalarQueryParameter("id", "STRING", map_record_id)]
        ),
    )
    return any(True for _ in job.result())


def land_payload(payload: dict[str, Any], *, source: str, notes: str | None = None) -> dict:
    """Persist one submission as a single row in observations."""
    if source not in {"zoho_webhook", "zoho_poll"}:
        raise ValueError(f"unsupported source: {source}")

    row = _row_from_payload(payload)
    map_record_id = row.get("map_record_id")
    payload_sha = sha256_of(payload)

    if _already_landed(map_record_id):
        log.info("skipping duplicate map_record_id=%s", map_record_id)
        return {"status": "duplicate", "map_record_id": map_record_id, "sha256": payload_sha}

    insert_rows(MAP_TABLE, [row])
    return {"status": "landed", "map_record_id": map_record_id, "sha256": payload_sha}
