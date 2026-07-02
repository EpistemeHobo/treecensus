"""Runtime config loaded from environment variables.

Values marked "required in prod" are checked lazily so a local `pytest` run
without a GCP project can still import the module.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    gcp_project_id: str
    bigquery_dataset: str
    dry_run: bool  # if true, log rows instead of writing to BigQuery
    zoho_webhook_secret: str | None
    zoho_form_link_name: str | None
    zoho_oauth_refresh_token: str | None
    zoho_oauth_client_id: str | None
    zoho_oauth_client_secret: str | None
    zoho_accounts_domain: str  # e.g. accounts.zoho.com

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            gcp_project_id=os.getenv("GCP_PROJECT_ID", ""),
            bigquery_dataset=os.getenv("BIGQUERY_DATASET", "tree_census"),
            dry_run=os.getenv("ETL_DRY_RUN", "").lower() in {"1", "true", "yes"},
            zoho_webhook_secret=os.getenv("ZOHO_WEBHOOK_SECRET") or None,
            zoho_form_link_name=os.getenv("ZOHO_FORM_LINK_NAME") or None,
            zoho_oauth_refresh_token=os.getenv("ZOHO_OAUTH_REFRESH_TOKEN") or None,
            zoho_oauth_client_id=os.getenv("ZOHO_OAUTH_CLIENT_ID") or None,
            zoho_oauth_client_secret=os.getenv("ZOHO_OAUTH_CLIENT_SECRET") or None,
            zoho_accounts_domain=os.getenv("ZOHO_ACCOUNTS_DOMAIN", "accounts.zoho.com"),
        )


settings = Settings.from_env()
