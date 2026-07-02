-- Per-source poll watermark used by /sync/zoho. One row per source.
CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.etl_watermark` (
  source          STRING    NOT NULL,
  last_synced_at  TIMESTAMP NOT NULL,
  updated_at      TIMESTAMP NOT NULL
);
