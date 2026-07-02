# Deploying treecensus-etl to seea-2026

One-time setup and the recurring deploy loop, for Cloud Shell inside the
seea-2026 project. Assumes you've already applied `sql/apply_all.sql` in
BigQuery Studio.

## 0. Which project?

```bash
gcloud config set project seea-2026
gcloud config get-value project   # should print seea-2026
```

## 1. Enable APIs (one-time)

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  bigquery.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com
```

## 2. Service account for the ETL service (one-time)

```bash
gcloud iam service-accounts create etl-writer \
  --display-name="Treecensus ETL writer"

# Let the SA write into BigQuery.
gcloud projects add-iam-policy-binding seea-2026 \
  --member="serviceAccount:etl-writer@seea-2026.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding seea-2026 \
  --member="serviceAccount:etl-writer@seea-2026.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

## 3. Store Zoho secrets (once you have them from your work laptop)

```bash
# Webhook HMAC secret (any random string; also paste into Zoho form's webhook config)
openssl rand -hex 32 | gcloud secrets create zoho-webhook-secret --data-file=-

# OAuth trio for the poll job
printf 'YOUR_CLIENT_ID'      | gcloud secrets create zoho-oauth-client-id --data-file=-
printf 'YOUR_CLIENT_SECRET'  | gcloud secrets create zoho-oauth-client-secret --data-file=-
printf 'YOUR_REFRESH_TOKEN'  | gcloud secrets create zoho-oauth-refresh-token --data-file=-

# Let the ETL SA read them.
for S in zoho-webhook-secret zoho-oauth-client-id zoho-oauth-client-secret zoho-oauth-refresh-token; do
  gcloud secrets add-iam-policy-binding $S \
    --member="serviceAccount:etl-writer@seea-2026.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

Then uncomment the `--set-secrets=…` line in `cloudbuild.yaml` so the next
deploy picks them up.

## 4. Deploy

From the repo root on Cloud Shell:

```bash
gcloud builds submit --config etl/cloudbuild.yaml etl
```

That's it. Cloud Build will:
1. `docker build` the ETL image
2. push to `gcr.io/seea-2026/treecensus-etl:<sha>`
3. `gcloud run deploy` it as service `treecensus-etl` in `us-central1`
   with `GCP_PROJECT_ID=seea-2026`, `BIGQUERY_DATASET=tree_census`

After deploy, bind the runtime SA:

```bash
gcloud run services update treecensus-etl \
  --region=us-central1 \
  --service-account=etl-writer@seea-2026.iam.gserviceaccount.com
```

## 5. Sanity checks

Get the URL:

```bash
gcloud run services describe treecensus-etl \
  --region=us-central1 --format='value(status.url)'
```

Health:

```bash
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  "$(gcloud run services describe treecensus-etl --region=us-central1 --format='value(status.url)')/healthz"
```

Should return `{"ok": true, "project": "seea-2026", ...}`.

## 6. Wire the Zoho webhook (once you have Zoho access)

In Zoho Forms → Integrations → Webhooks:
- URL: `<CLOUD_RUN_URL>/webhook/zoho`
- Method: POST
- Signature header: `X-Zoho-Signature`, HMAC-SHA256 of the raw body using
  the value of `zoho-webhook-secret`

Then flip the webhook endpoint to `--allow-unauthenticated` OR keep it
authenticated and use a signed URL (Cloud Run auth). For a public webhook,
run:

```bash
gcloud run services update treecensus-etl \
  --region=us-central1 --allow-unauthenticated
```

The HMAC check on our side is the security boundary once the endpoint is
public.

## 7. Scheduled poll (safety net)

Create a Cloud Scheduler job hitting `/sync/zoho` every 10 minutes with an
OIDC token so it stays authenticated:

```bash
SVC_URL=$(gcloud run services describe treecensus-etl \
  --region=us-central1 --format='value(status.url)')

gcloud scheduler jobs create http treecensus-etl-poll \
  --location=us-central1 \
  --schedule='*/10 * * * *' \
  --http-method=POST \
  --uri="$SVC_URL/sync/zoho" \
  --oidc-service-account-email=etl-writer@seea-2026.iam.gserviceaccount.com
```
