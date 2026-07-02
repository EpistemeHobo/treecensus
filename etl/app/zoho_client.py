"""Zoho Forms Records API — OAuth refresh + records fetch since watermark.

Skeleton only. The real HTTP calls should be finalised once we have the
form's link name and account domain from the Zoho console.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Iterable
from urllib.parse import urlencode

import httpx

from .config import settings

log = logging.getLogger(__name__)


@dataclass
class OAuthToken:
    access_token: str
    expires_at: float  # epoch seconds


_cached: OAuthToken | None = None


def _get_access_token() -> str:
    global _cached
    now = time.time()
    if _cached and _cached.expires_at - 60 > now:
        return _cached.access_token

    if not (settings.zoho_oauth_refresh_token and settings.zoho_oauth_client_id
            and settings.zoho_oauth_client_secret):
        raise RuntimeError("Zoho OAuth env vars are not fully configured.")

    url = f"https://{settings.zoho_accounts_domain}/oauth/v2/token"
    data = {
        "refresh_token": settings.zoho_oauth_refresh_token,
        "client_id": settings.zoho_oauth_client_id,
        "client_secret": settings.zoho_oauth_client_secret,
        "grant_type": "refresh_token",
    }
    with httpx.Client(timeout=15) as c:
        r = c.post(url, data=data)
        r.raise_for_status()
        body = r.json()

    _cached = OAuthToken(
        access_token=body["access_token"],
        expires_at=now + float(body.get("expires_in", 3000)),
    )
    return _cached.access_token


def fetch_records_since(since_iso: str) -> Iterable[dict]:
    """
    Placeholder. Once we know the exact Zoho Forms REST endpoint shape (it's
    likely https://forms.zoho.com/api/v2/... /records with a `modified_after`
    filter), fill this in. For now returns an empty iterator so /sync/zoho is
    safe to call.
    """
    if not settings.zoho_form_link_name:
        log.warning("ZOHO_FORM_LINK_NAME not set; poll is a no-op.")
        return []

    _ = _get_access_token()  # will raise if OAuth env is missing
    log.info("zoho poll: would fetch records since %s for %s", since_iso, settings.zoho_form_link_name)
    return []
