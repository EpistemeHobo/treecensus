"""Sandbox-safe smoke test: exercises hashing + ingest without importing
FastAPI or google-cloud-bigquery. Run with:

  ETL_DRY_RUN=1 python etl/tests/test_smoke.py
"""
import os
import sys
import types
from pathlib import Path

os.environ.setdefault("ETL_DRY_RUN", "1")
os.environ.setdefault("BIGQUERY_DATASET", "tree_census")

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# Stub google-cloud-bigquery so bigquery_client imports without the real dep.
gc = types.ModuleType("google.cloud")
bq_stub = types.ModuleType("google.cloud.bigquery")
class _Client:
    def __init__(self, *a, **k): pass
    def insert_rows_json(self, *a, **k): return []
bq_stub.Client = _Client
class _QueryJobConfig: pass
bq_stub.QueryJobConfig = _QueryJobConfig
class _ScalarQueryParameter:
    def __init__(self, *a, **k): pass
bq_stub.ScalarQueryParameter = _ScalarQueryParameter
gc.bigquery = bq_stub
google_mod = types.ModuleType("google")
google_mod.cloud = gc
sys.modules["google"] = google_mod
sys.modules["google.cloud"] = gc
sys.modules["google.cloud.bigquery"] = bq_stub

from app.hashing import sha256_of, verify_hmac
from app.ingest import land_payload

def test_sha256_stable():
    a = {"x": 1, "y": [1,2,3]}
    b = {"y": [1,2,3], "x": 1}
    assert sha256_of(a) == sha256_of(b)

def test_hmac_verify():
    import hmac, hashlib
    body = b'{"hello":"world"}'
    secret = "s3cr3t"
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    assert verify_hmac(secret, sig, body)
    assert not verify_hmac(secret, "badsig", body)

def test_land_payload_dry_run():
    payload = {"record_id": "abc123", "species_raw": "Avicennia marina", "gbh_cm": 12.5}
    r = land_payload(payload, source="zoho_webhook")
    assert r["status"] == "landed"
    assert r["external_id"] == "abc123"
    assert len(r["sha256"]) == 64

def test_reject_bad_source():
    try:
        land_payload({"a": 1}, source="unknown")
    except ValueError:
        return
    raise AssertionError("expected ValueError")

if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"PASS {name}")
    print("all ok")
