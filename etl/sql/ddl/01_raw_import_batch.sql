-- One row per ingest batch. Sources: zoho_webhook, zoho_poll, csv_form,
-- excel_batch1, excel_rar_2_1, seed_backfill.
CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.raw_import_batch` (
  id          STRING    NOT NULL,
  source      STRING    NOT NULL,
  imported_at TIMESTAMP NOT NULL,
  row_count   INT64,
  sha256      STRING,
  notes       STRING
);
