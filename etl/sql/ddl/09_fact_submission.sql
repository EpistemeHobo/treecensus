-- One row per form submission. Links to project/plot/subplot/species. All
-- observation tables (obs_tree, obs_seedling, obs_woody_debris) reference this.
CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.fact_submission` (
  id                  STRING    NOT NULL,
  import_batch_id     STRING    NOT NULL,
  source              STRING    NOT NULL,
  source_row_id       STRING,
  source_file_sha256  STRING,
  external_id         STRING,
  project_id          STRING,
  plot_id             STRING,
  subplot_id          STRING,
  species_id          STRING,
  species_raw         STRING,
  item_tag_id_raw     STRING,
  dataset_type        STRING, -- tree | seedling | woody_debris
  added_time          TIMESTAMP,
  offline_added_time  TIMESTAMP,
  task_owner          STRING,
  source_status       STRING,
  local_x_m           FLOAT64,
  local_y_m           FLOAT64,
  utm_easting         FLOAT64,
  utm_northing        FLOAT64,
  utm_zone            INT64,
  utm_hemisphere      STRING,
  latitude            FLOAT64,
  longitude           FLOAT64,
  geo_ready           BOOL,
  coordinate_note     STRING,
  remarks             STRING,
  ingested_at         TIMESTAMP NOT NULL
)
PARTITION BY DATE(ingested_at)
CLUSTER BY project_id, plot_id, subplot_id;
