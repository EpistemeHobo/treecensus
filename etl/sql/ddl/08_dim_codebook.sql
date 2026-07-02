-- Categorical vocabulary: size_class, stand_fall, live_dead, gbh_method,
-- height_method, crown_class, crown_condition, tree_health, large_woody_condition.
CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_codebook` (
  category  STRING NOT NULL,
  raw       STRING,
  code      STRING NOT NULL,
  label     STRING,
  loaded_at TIMESTAMP
);
