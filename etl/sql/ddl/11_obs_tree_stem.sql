-- Stems are linked to the nearest preceding tree in the same submission.
CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.obs_tree_stem` (
  id                     STRING NOT NULL,
  tree_id                STRING NOT NULL,
  submission_id          STRING NOT NULL,
  import_batch_id        STRING NOT NULL,
  stem_no                INT64,
  stand_fall_code        STRING,
  live_dead_code         STRING,
  gbh_cm                 FLOAT64,
  gbh_method_code        STRING,
  total_height_m         FLOAT64,
  height_method_code     STRING,
  crown_class_code       STRING,
  crown_condition_code   STRING,
  tree_health_code       STRING,
  lichen_pct             FLOAT64,
  ingested_at            TIMESTAMP NOT NULL
);
