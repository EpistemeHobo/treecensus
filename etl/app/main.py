"""FastAPI entrypoint. Deployed to Cloud Run.

Endpoints:
  GET  /health            liveness
  POST /webhook/zoho       Zoho Forms webhook receiver
  POST /sync/zoho          scheduled poll (called by Cloud Scheduler)
"""
from __future__ import annotations

import hmac
import logging
import os
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException, Request

from .config import settings
from .hashing import verify_hmac
from .ingest import land_payload
from .zoho_client import fetch_records_since

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
log = logging.getLogger(__name__)

app = FastAPI(title="treecensus-etl")


@app.get("/health")
async def healthz() -> dict:
    return {
        "ok": True,
        "project": settings.gcp_project_id or None,
        "dataset": settings.bigquery_dataset,
        "dry_run": settings.dry_run,
    }


@app.post("/webhook/zoho")
async def zoho_webhook(request: Request) -> dict:
    raw = await request.body()

    if settings.zoho_webhook_secret:
        # Zoho Forms only supports static Custom Headers, so accept a shared
        # token in X-Auth-Token. Also accept HMAC for other callers.
        token = request.headers.get("X-Auth-Token") or ""
        signature = (
            request.headers.get("X-Zoho-Signature")
            or request.headers.get("X-Zoho-Webhook-Signature")
            or request.headers.get("X-Signature")
            or ""
        )
        token_ok = token and hmac.compare_digest(token, settings.zoho_webhook_secret)
        hmac_ok = signature and verify_hmac(settings.zoho_webhook_secret, signature, raw)
        if not (token_ok or hmac_ok):
            raise HTTPException(status_code=401, detail="unauthorized")

    try:
        payload = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"invalid json: {e}") from e

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be a JSON object")

    result = land_payload(payload, source="zoho_webhook")
    return {"ok": True, **result}


@app.post("/sync/zoho")
async def zoho_sync() -> dict:
    """Scheduled reconciliation poll. Never fails loud — Cloud Scheduler will
    retry the next tick."""
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    fetched = 0
    landed = 0
    for record in fetch_records_since(since):
        fetched += 1
        r = land_payload(record, source="zoho_poll")
        if r.get("status") == "landed":
            landed += 1
    return {"ok": True, "fetched": fetched, "landed": landed, "since": since}
