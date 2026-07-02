-- ==============================================================
-- Treecensus BigQuery schema — one-shot script for BigQuery Studio
--
-- HOW TO USE
-- 1. Replace YOUR_PROJECT_ID below with your GCP project id.
-- 2. (Optional) Replace tree_census with a different dataset name.
-- 3. Paste the whole file into BigQuery Studio and hit Run.
--
-- Idempotent — safe to re-run. Uses CREATE TABLE IF NOT EXISTS and
-- CREATE OR REPLACE VIEW.
-- ==============================================================

-- Create the dataset if it doesn't exist.
CREATE SCHEMA IF NOT EXISTS `YOUR_PROJECT_ID.tree_census`;
-- Dataset region defaults to the region of the current BigQuery query editor.
-- To create it in a specific region, change your editor location in
-- Query Settings → Additional settings → Data location, then re-run.


-- ─── 01_raw_import_batch.sql ─────────────────────────────────────────
-- One row per ingest batch. Sources: zoho_webhook, zoho_poll, csv_form,
-- excel_batch1, excel_rar_2_1, seed_backfill.
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.raw_import_batch` (
  id          STRING    NOT NULL,
  source      STRING    NOT NULL,
  imported_at TIMESTAMP NOT NULL,
  row_count   INT64,
  sha256      STRING,
  notes       STRING
);

-- ─── 02_raw_form_rows.sql ─────────────────────────────────────────
-- Unified raw landing table. Every source (Zoho webhook, Zoho poll, Excel/CSV
-- backfill) writes here. `payload` is the source JSON (or JSON-encoded row).
-- Downstream transforms MERGE into dim/fact tables using external_id as the
-- stable identifier.
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.raw_form_rows` (
  id              STRING    NOT NULL,
  import_batch_id STRING    NOT NULL,
  source          STRING    NOT NULL, -- must match raw_import_batch.source
  source_row_id   STRING,              -- original row / cell reference
  external_id     STRING,              -- Zoho record id / excel row hash
  payload         JSON      NOT NULL,
  sha256          STRING    NOT NULL, -- hash of payload for dedupe
  received_at     TIMESTAMP NOT NULL
)
PARTITION BY DATE(received_at)
CLUSTER BY source, external_id;

-- ─── 03_dim_project.sql ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.dim_project` (
  id             STRING NOT NULL,
  project_no_raw STRING,
  project_no_int INT64,
  name           STRING,
  province       STRING,
  first_seen_at  TIMESTAMP,
  last_seen_at   TIMESTAMP
);

-- ─── 04_dim_plot.sql ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.dim_plot` (
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

-- ─── 05_dim_subplot.sql ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.dim_subplot` (
  id            STRING NOT NULL,
  plot_id       STRING NOT NULL,
  subplot_raw   STRING,
  subplot_no    INT64,
  subplot_name  STRING,
  subplot_code  STRING,
  first_seen_at TIMESTAMP,
  last_seen_at  TIMESTAMP
);

-- ─── 06_dim_species.sql ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.dim_species` (
  id                      STRING NOT NULL,
  species_code            STRING,
  thai_name               STRING,
  scientific_name         STRING,
  scientific_author       STRING,
  normalized_species_name STRING,
  habit_abbrev            STRING,
  iucn_status             STRING,
  first_seen_at           TIMESTAMP,
  last_seen_at            TIMESTAMP
);

-- ─── 07_dim_species_crosswalk.sql ─────────────────────────────────────────
-- Reference table loaded from รายชื่อพันธุ์ไม้-2026-2.xlsx once, then joined at
-- transform time to enrich raw species text.
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.dim_species_crosswalk` (
  source_code             STRING,
  thai_name               STRING,
  scientific_name         STRING,
  scientific_author       STRING,
  normalized_species_name STRING,
  habit_abbrev            STRING,
  iucn_status             STRING,
  species_code            STRING,
  loaded_at               TIMESTAMP
);

-- ─── 08_dim_codebook.sql ─────────────────────────────────────────
-- Categorical vocabulary: size_class, stand_fall, live_dead, gbh_method,
-- height_method, crown_class, crown_condition, tree_health, large_woody_condition.
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.dim_codebook` (
  category  STRING NOT NULL,
  raw       STRING,
  code      STRING NOT NULL,
  label     STRING,
  loaded_at TIMESTAMP
);

-- ─── 09_fact_submission.sql ─────────────────────────────────────────
-- One row per form submission. Links to project/plot/subplot/species. All
-- observation tables (obs_tree, obs_seedling, obs_woody_debris) reference this.
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.fact_submission` (
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

-- ─── 10_obs_tree.sql ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.obs_tree` (
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

-- ─── 11_obs_tree_stem.sql ─────────────────────────────────────────
-- Stems are linked to the nearest preceding tree in the same submission.
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.obs_tree_stem` (
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

-- ─── 12_obs_seedling.sql ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.obs_seedling` (
  id              STRING NOT NULL,
  submission_id   STRING NOT NULL,
  import_batch_id STRING NOT NULL,
  species_id      STRING,
  species_raw     STRING,
  size_class_code STRING,
  seedling_count  INT64,
  ingested_at     TIMESTAMP NOT NULL
);

-- ─── 13_obs_woody_debris.sql ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.obs_woody_debris` (
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

-- ─── 14_etl_validation_flags.sql ─────────────────────────────────────────
-- Every quality issue detected during transform lands here so admins can audit
-- data quality without re-running the pipeline.
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.etl_validation_flags` (
  id              STRING    NOT NULL,
  entity_type     STRING    NOT NULL, -- submission | tree | stem | seedling | woody_debris | batch
  entity_id       STRING,
  import_batch_id STRING    NOT NULL,
  flag_code       STRING    NOT NULL,
  severity        STRING    NOT NULL, -- info | warn | error
  notes           STRING,
  created_at      TIMESTAMP NOT NULL
);

-- ─── 15_watermark.sql ─────────────────────────────────────────
-- Per-source poll watermark used by /sync/zoho. One row per source.
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.tree_census.etl_watermark` (
  source          STRING    NOT NULL,
  last_synced_at  TIMESTAMP NOT NULL,
  updated_at      TIMESTAMP NOT NULL
);


-- ─── VIEW looker_map_points.sql ───────────────────────────────────────
-- Flat 80-column map dataset matching seed/examples/*_looker_sample.csv.
-- Web app's Maps page reads from this view. Rebuilt every time the underlying
-- fact/obs tables change (BigQuery views are logical).
CREATE OR REPLACE VIEW `YOUR_PROJECT_ID.tree_census.looker_map_points` AS
WITH stems AS (
  SELECT
    s.id                                                    AS map_record_id,
    'tree_stem'                                             AS observation_type,
    fs.source_row_id                                        AS source_row_id,
    fs.id                                                   AS submission_id,
    fs.import_batch_id                                      AS import_batch_id,
    fs.source_file_sha256                                   AS source_file_sha256,
    fs.project_id, fs.plot_id, fs.subplot_id,
    dp.project_no_raw, dp.project_no_int,
    dpl.plot_no_raw, dpl.plot_no_int,
    dsp.subplot_raw, dsp.subplot_no, dsp.subplot_name, dsp.subplot_code,
    fs.dataset_type, fs.item_tag_id_raw,
    fs.added_time, fs.offline_added_time, fs.task_owner, fs.source_status,
    fs.local_x_m, fs.local_y_m,
    fs.utm_easting, fs.utm_northing, fs.utm_zone, fs.utm_hemisphere,
    fs.latitude, fs.longitude, fs.geo_ready, fs.coordinate_note,
    fs.species_id, fs.species_raw,
    dsps.thai_name, dsps.scientific_name, dsps.scientific_author, dsps.normalized_species_name,
    s.tree_id, s.id AS stem_id,
    CAST(NULL AS STRING) AS seedling_id,
    CAST(NULL AS STRING) AS woody_debris_id,
    ot.size_class_code,
    ot.azimuth_deg, ot.distance_m,
    s.stem_no, s.stand_fall_code, s.live_dead_code,
    s.gbh_cm, s.gbh_method_code,
    s.total_height_m, s.height_method_code,
    s.crown_class_code, s.crown_condition_code, s.tree_health_code, s.lichen_pct,
    CAST(NULL AS INT64)   AS seedling_count,
    CAST(NULL AS STRING)  AS transect_raw,
    CAST(NULL AS FLOAT64) AS transect_deg,
    CAST(NULL AS STRING)  AS large_woody_condition_code,
    CAST(NULL AS FLOAT64) AS tip_diameter_cm,
    CAST(NULL AS FLOAT64) AS middle_diameter_cm,
    CAST(NULL AS FLOAT64) AS base_diameter_cm,
    CAST(NULL AS INT64)   AS medium_piece_count,
    CAST(NULL AS INT64)   AS small_piece_count,
    CAST(NULL AS INT64)   AS fine_piece_count,
    fs.remarks
  FROM `YOUR_PROJECT_ID.tree_census.obs_tree_stem` s
  JOIN `YOUR_PROJECT_ID.tree_census.obs_tree` ot ON ot.id = s.tree_id
  JOIN `YOUR_PROJECT_ID.tree_census.fact_submission` fs ON fs.id = s.submission_id
  LEFT JOIN `YOUR_PROJECT_ID.tree_census.dim_project`  dp  ON dp.id = fs.project_id
  LEFT JOIN `YOUR_PROJECT_ID.tree_census.dim_plot`     dpl ON dpl.id = fs.plot_id
  LEFT JOIN `YOUR_PROJECT_ID.tree_census.dim_subplot`  dsp ON dsp.id = fs.subplot_id
  LEFT JOIN `YOUR_PROJECT_ID.tree_census.dim_species`  dsps ON dsps.id = fs.species_id
),
seedlings AS (
  SELECT
    sd.id                                                   AS map_record_id,
    'seedling'                                              AS observation_type,
    fs.source_row_id, fs.id AS submission_id, fs.import_batch_id, fs.source_file_sha256,
    fs.project_id, fs.plot_id, fs.subplot_id,
    dp.project_no_raw, dp.project_no_int,
    dpl.plot_no_raw, dpl.plot_no_int,
    dsp.subplot_raw, dsp.subplot_no, dsp.subplot_name, dsp.subplot_code,
    fs.dataset_type, fs.item_tag_id_raw,
    fs.added_time, fs.offline_added_time, fs.task_owner, fs.source_status,
    fs.local_x_m, fs.local_y_m,
    fs.utm_easting, fs.utm_northing, fs.utm_zone, fs.utm_hemisphere,
    fs.latitude, fs.longitude, fs.geo_ready, fs.coordinate_note,
    fs.species_id, fs.species_raw,
    dsps.thai_name, dsps.scientific_name, dsps.scientific_author, dsps.normalized_species_name,
    CAST(NULL AS STRING) AS tree_id,
    CAST(NULL AS STRING) AS stem_id,
    sd.id                AS seedling_id,
    CAST(NULL AS STRING) AS woody_debris_id,
    sd.size_class_code,
    CAST(NULL AS FLOAT64) AS azimuth_deg,
    CAST(NULL AS FLOAT64) AS distance_m,
    CAST(NULL AS INT64)   AS stem_no,
    CAST(NULL AS STRING)  AS stand_fall_code,
    CAST(NULL AS STRING)  AS live_dead_code,
    CAST(NULL AS FLOAT64) AS gbh_cm,
    CAST(NULL AS STRING)  AS gbh_method_code,
    CAST(NULL AS FLOAT64) AS total_height_m,
    CAST(NULL AS STRING)  AS height_method_code,
    CAST(NULL AS STRING)  AS crown_class_code,
    CAST(NULL AS STRING)  AS crown_condition_code,
    CAST(NULL AS STRING)  AS tree_health_code,
    CAST(NULL AS FLOAT64) AS lichen_pct,
    sd.seedling_count,
    CAST(NULL AS STRING)  AS transect_raw,
    CAST(NULL AS FLOAT64) AS transect_deg,
    CAST(NULL AS STRING)  AS large_woody_condition_code,
    CAST(NULL AS FLOAT64) AS tip_diameter_cm,
    CAST(NULL AS FLOAT64) AS middle_diameter_cm,
    CAST(NULL AS FLOAT64) AS base_diameter_cm,
    CAST(NULL AS INT64)   AS medium_piece_count,
    CAST(NULL AS INT64)   AS small_piece_count,
    CAST(NULL AS INT64)   AS fine_piece_count,
    fs.remarks
  FROM `YOUR_PROJECT_ID.tree_census.obs_seedling` sd
  JOIN `YOUR_PROJECT_ID.tree_census.fact_submission` fs ON fs.id = sd.submission_id
  LEFT JOIN `YOUR_PROJECT_ID.tree_census.dim_project`  dp  ON dp.id = fs.project_id
  LEFT JOIN `YOUR_PROJECT_ID.tree_census.dim_plot`     dpl ON dpl.id = fs.plot_id
  LEFT JOIN `YOUR_PROJECT_ID.tree_census.dim_subplot`  dsp ON dsp.id = fs.subplot_id
  LEFT JOIN `YOUR_PROJECT_ID.tree_census.dim_species`  dsps ON dsps.id = fs.species_id
),
woody AS (
  SELECT
    wd.id                                                   AS map_record_id,
    'woody_debris'                                          AS observation_type,
    fs.source_row_id, fs.id AS submission_id, fs.import_batch_id, fs.source_file_sha256,
    fs.project_id, fs.plot_id, fs.subplot_id,
    dp.project_no_raw, dp.project_no_int,
    dpl.plot_no_raw, dpl.plot_no_int,
    dsp.subplot_raw, dsp.subplot_no, dsp.subplot_name, dsp.subplot_code,
    fs.dataset_type, fs.item_tag_id_raw,
    fs.added_time, fs.offline_added_time, fs.task_owner, fs.source_status,
    fs.local_x_m, fs.local_y_m,
    fs.utm_easting, fs.utm_northing, fs.utm_zone, fs.utm_hemisphere,
    fs.latitude, fs.longitude, fs.geo_ready, fs.coordinate_note,
    fs.species_id, fs.species_raw,
    CAST(NULL AS STRING) AS thai_name,
    CAST(NULL AS STRING) AS scientific_name,
    CAST(NULL AS STRING) AS scientific_author,
    CAST(NULL AS STRING) AS normalized_species_name,
    CAST(NULL AS STRING) AS tree_id,
    CAST(NULL AS STRING) AS stem_id,
    CAST(NULL AS STRING) AS seedling_id,
    wd.id                AS woody_debris_id,
    CAST(NULL AS STRING)  AS size_class_code,
    CAST(NULL AS FLOAT64) AS azimuth_deg,
    CAST(NULL AS FLOAT64) AS distance_m,
    CAST(NULL AS INT64)   AS stem_no,
    CAST(NULL AS STRING)  AS stand_fall_code,
    CAST(NULL AS STRING)  AS live_dead_code,
    CAST(NULL AS FLOAT64) AS gbh_cm,
    CAST(NULL AS STRING)  AS gbh_method_code,
    CAST(NULL AS FLOAT64) AS total_height_m,
    CAST(NULL AS STRING)  AS height_method_code,
    CAST(NULL AS STRING)  AS crown_class_code,
    CAST(NULL AS STRING)  AS crown_condition_code,
    CAST(NULL AS STRING)  AS tree_health_code,
    CAST(NULL AS FLOAT64) AS lichen_pct,
    CAST(NULL AS INT64)   AS seedling_count,
    wd.transect_raw, wd.transect_deg,
    wd.large_woody_condition_code,
    wd.tip_diameter_cm, wd.middle_diameter_cm, wd.base_diameter_cm,
    wd.medium_piece_count, wd.small_piece_count, wd.fine_piece_count,
    fs.remarks
  FROM `YOUR_PROJECT_ID.tree_census.obs_woody_debris` wd
  JOIN `YOUR_PROJECT_ID.tree_census.fact_submission` fs ON fs.id = wd.submission_id
  LEFT JOIN `YOUR_PROJECT_ID.tree_census.dim_project`  dp  ON dp.id = fs.project_id
  LEFT JOIN `YOUR_PROJECT_ID.tree_census.dim_plot`     dpl ON dpl.id = fs.plot_id
  LEFT JOIN `YOUR_PROJECT_ID.tree_census.dim_subplot`  dsp ON dsp.id = fs.subplot_id
)
SELECT * FROM stems
UNION ALL SELECT * FROM seedlings
UNION ALL SELECT * FROM woody;
