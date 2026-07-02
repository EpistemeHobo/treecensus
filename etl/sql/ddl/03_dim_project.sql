CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_project` (
  id             STRING NOT NULL,
  project_no_raw STRING,
  project_no_int INT64,
  name           STRING,
  province       STRING,
  first_seen_at  TIMESTAMP,
  last_seen_at   TIMESTAMP
);
