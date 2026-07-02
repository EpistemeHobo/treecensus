# treecensus-etl

Milestone 1: Cloud Run service that lands Zoho Forms submissions into
BigQuery, plus the BigQuery schema all downstream tables share.

## Layout

```
etl/
  app/                FastAPI service (Cloud Run)
    main.py           /healthz, /webhook/zoho, /sync/zoho
    ingest.py         land_payload() → raw_form_rows + raw_import_batch
    hashing.py        sha256 + HMAC verify
    bigquery_client.py insert_rows() with dry-run mode
    zoho_client.py    OAuth refresh + records fetch (skeleton)
    config.py         env-driven Settings
  sql/
    ddl/              tables (raw_import_batch, raw_form_rows, dim_*, fact_*, obs_*)
    views/            looker_map_points
  scripts/
    apply_ddl.py      run every DDL file against BigQuery
  Dockerfile
  cloudbuild.yaml
  requirements.txt
```

## Apply schema

```bash
export GCP_PROJECT_ID=your-project
export BIGQUERY_DATASET=tree_census
python etl/scripts/apply_ddl.py
```

Idempotent: every table uses `CREATE TABLE IF NOT EXISTS`; the view uses
`CREATE OR REPLACE VIEW`.

## Run locally (no cloud needed)

```bash
python -m pip install -r etl/requirements-dev.txt
ETL_DRY_RUN=1 uvicorn app.main:app --app-dir etl --port 8080
```

Then post a synthetic payload:

```bash
curl -sS -X POST http://localhost:8080/webhook/zoho \
  -H 'Content-Type: application/json' \
  -d '{"record_id": "12345", "project_no_raw": "001", "species_raw": "แสมทะเล (Avicennia marina (Forssk.) Vierh.)"}'
```

Response includes `status: landed` or `status: duplicate`.

## Deploy to Cloud Run

```bash
gcloud builds submit --config etl/cloudbuild.yaml etl
```

Env vars the service expects at runtime:

| Var                          | Purpose                                             |
|------------------------------|-----------------------------------------------------|
| `GCP_PROJECT_ID`             | required                                            |
| `BIGQUERY_DATASET`           | default `tree_census`                               |
| `ETL_DRY_RUN`                | `1` to log-only (no BQ writes)                      |
| `ZOHO_WEBHOOK_SECRET`        | HMAC secret for signature check (optional but rec.) |
| `ZOHO_FORM_LINK_NAME`        | Zoho Forms form link name (poll)                    |
| `ZOHO_OAUTH_CLIENT_ID`       | for poll                                            |
| `ZOHO_OAUTH_CLIENT_SECRET`   | for poll                                            |
| `ZOHO_OAUTH_REFRESH_TOKEN`   | for poll                                            |
| `ZOHO_ACCOUNTS_DOMAIN`       | default `accounts.zoho.com`                         |

Store secrets in Secret Manager, not env vars in the deploy config.

## What is landed vs. transformed

| Layer      | Table                    | Written by                       |
|------------|--------------------------|----------------------------------|
| Landing    | `raw_form_rows`          | Milestone 1 (this service)       |
| Batches    | `raw_import_batch`       | Milestone 1                      |
| Dimensions | `dim_project` / `dim_plot` / `dim_subplot` / `dim_species` / `dim_species_crosswalk` / `dim_codebook` | Milestone 2/3 |
| Facts      | `fact_submission`        | Milestone 3                      |
| Observations | `obs_tree` / `obs_tree_stem` / `obs_seedling` / `obs_woody_debris` | Milestone 3 |
| Quality    | `etl_validation_flags`   | Milestone 3                      |
| Serving    | `looker_map_points` view | Milestone 1 (DDL only, data appears in M3) |

The Zoho payload → dim/fact mapping is Milestone 3 and blocks only on a real
sample submission JSON. The rest of the pipeline can be deployed today.
