CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.obs_woody_debris` (
  id                          STRING NOT NULL,
  submission_id               STRING NOT NULL,
  import_batch_id             STRING NOT NULL,
  transect_raw                STRING,
  transect_deg                FLOAT64,
  large_woody_condition_code  STRING,
  tip_diameter_cm             FLOAT64,
  middle_diameter_cm          FLOAT64,
  base_diameter_cm            FLOAT64,
  medium_piece_count          INT64,
  small_piece_count           INT64,
  fine_piece_count            INT64,
  ingested_at                 TIMESTAMP NOT NULL
);
