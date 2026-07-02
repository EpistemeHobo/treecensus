CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_plot` (
  id             STRING NOT NULL,
  project_id     STRING NOT NULL,
  plot_no_raw    STRING,
  plot_no_int    INT64,
  utm_easting    FLOAT64,
  utm_northing   FLOAT64,
  utm_zone       INT64,
  utm_hemisphere STRING,
  first_seen_at  TIMESTAMP,
  last_seen_at   TIMESTAMP
);
