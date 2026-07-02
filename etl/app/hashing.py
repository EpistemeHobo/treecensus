import hashlib
import hmac
import json
from typing import Any


def canonical_json(payload: Any) -> str:
    """Stable JSON serialisation used for hashing."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_of(payload: Any) -> str:
    return hashlib.sha256(canonical_json(payload).encode("utf-8")).hexdigest()


def verify_hmac(secret: str, provided_signature: str, raw_body: bytes) -> bool:
    """
    Zoho Forms webhooks can be signed with HMAC-SHA256. The exact header name
    depends on how the integration is configured in the Zoho console; we accept
    the raw hex digest and compare in constant time.
    """
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, (provided_signature or "").strip().lower())
