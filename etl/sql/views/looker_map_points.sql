-- Flat 80-column map dataset matching seed/examples/*_looker_sample.csv.
-- Web app's Maps page reads from this view. Rebuilt every time the underlying
-- fact/obs tables change (BigQuery views are logical).
CREATE OR REPLACE VIEW `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.looker_map_points` AS
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
  FROM `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.obs_tree_stem` s
  JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.obs_tree` ot ON ot.id = s.tree_id
  JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.fact_submission` fs ON fs.id = s.submission_id
  LEFT JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_project`  dp  ON dp.id = fs.project_id
  LEFT JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_plot`     dpl ON dpl.id = fs.plot_id
  LEFT JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_subplot`  dsp ON dsp.id = fs.subplot_id
  LEFT JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_species`  dsps ON dsps.id = fs.species_id
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
  FROM `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.obs_seedling` sd
  JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.fact_submission` fs ON fs.id = sd.submission_id
  LEFT JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_project`  dp  ON dp.id = fs.project_id
  LEFT JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_plot`     dpl ON dpl.id = fs.plot_id
  LEFT JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_subplot`  dsp ON dsp.id = fs.subplot_id
  LEFT JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_species`  dsps ON dsps.id = fs.species_id
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
  FROM `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.obs_woody_debris` wd
  JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.fact_submission` fs ON fs.id = wd.submission_id
  LEFT JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_project`  dp  ON dp.id = fs.project_id
  LEFT JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_plot`     dpl ON dpl.id = fs.plot_id
  LEFT JOIN `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_subplot`  dsp ON dsp.id = fs.subplot_id
)
SELECT * FROM stems
UNION ALL SELECT * FROM seedlings
UNION ALL SELECT * FROM woody;
