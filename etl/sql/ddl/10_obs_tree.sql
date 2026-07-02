CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.obs_tree` (
  id              STRING NOT NULL,
  submission_id   STRING NOT NULL,
  import_batch_id STRING NOT NULL,
  species_id      STRING,
  species_raw     STRING,
  size_class_code STRING,
  azimuth_deg     FLOAT64,
  distance_m      FLOAT64,
  ingested_at     TIMESTAMP NOT NULL
);
