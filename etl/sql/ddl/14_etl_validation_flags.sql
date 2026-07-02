-- Every quality issue detected during transform lands here so admins can audit
-- data quality without re-running the pipeline.
CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.etl_validation_flags` (
  id              STRING    NOT NULL,
  entity_type     STRING    NOT NULL, -- submission | tree | stem | seedling | woody_debris | batch
  entity_id       STRING,
  import_batch_id STRING    NOT NULL,
  flag_code       STRING    NOT NULL,
  severity        STRING    NOT NULL, -- info | warn | error
  notes           STRING,
  created_at      TIMESTAMP NOT NULL
);
