CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_subplot` (
  id            STRING NOT NULL,
  plot_id       STRING NOT NULL,
  subplot_raw   STRING,
  subplot_no    INT64,
  subplot_name  STRING,
  subplot_code  STRING,
  first_seen_at TIMESTAMP,
  last_seen_at  TIMESTAMP
);
