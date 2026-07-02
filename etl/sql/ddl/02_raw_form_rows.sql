-- Unified raw landing table. Every source (Zoho webhook, Zoho poll, Excel/CSV
-- backfill) writes here. `payload` is the source JSON (or JSON-encoded row).
-- Downstream transforms MERGE into dim/fact tables using external_id as the
-- stable identifier.
CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.raw_form_rows` (
  id              STRING    NOT NULL,
  import_batch_id STRING    NOT NULL,
  source          STRING    NOT NULL, -- must match raw_import_batch.source
  source_row_id   STRING,              -- original row / cell reference
  external_id     STRING,              -- Zoho record id / excel row hash
  payload         JSON      NOT NULL,
  sha256          STRING    NOT NULL, -- hash of payload for dedupe
  received_at     TIMESTAMP NOT NULL
)
PARTITION BY DATE(received_at)
CLUSTER BY source, external_id;
