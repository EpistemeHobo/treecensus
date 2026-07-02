-- ═══════════════════════════════════════════════════════════════════════════
-- Backfill: CSV electronic form (DMCR) from a Looker map-points staging table
-- Source:   dmcr_looker_map_points.csv → seea-2026.tree_census.stg_looker_csv_form
--
-- Prereq: staging table exists (upload dmcr_looker_map_points.csv via BQ Studio
-- with auto-detect schema). Safe to re-run: dedupes on primary keys.
-- ═══════════════════════════════════════════════════════════════════════════

DECLARE batch_id         STRING  DEFAULT 'batch_csv_form_backfill';
DECLARE source_tag       STRING  DEFAULT 'csv_form';
DECLARE imported_at_ts   TIMESTAMP DEFAULT CURRENT_TIMESTAMP();

-- ─── 1. Record the batch ───────────────────────────────────────────────────
MERGE `seea-2026.tree_census.raw_import_batch` T
USING (SELECT batch_id AS id, source_tag AS source, imported_at_ts AS imported_at,
              (SELECT COUNT(*) FROM `seea-2026.tree_census.stg_looker_csv_form`) AS row_count,
              (SELECT ANY_VALUE(source_file_sha256) FROM `seea-2026.tree_census.stg_looker_csv_form`) AS sha256,
              'Backfilled from seed Looker CSV (dmcr_milestone1_etl)' AS notes) S
ON T.id = S.id
WHEN NOT MATCHED THEN INSERT (id, source, imported_at, row_count, sha256, notes)
VALUES (S.id, S.source, S.imported_at, S.row_count, S.sha256, S.notes);

-- ─── 2. Dimensions (distinct rows) ─────────────────────────────────────────
MERGE `seea-2026.tree_census.dim_project` T
USING (
  SELECT DISTINCT project_id AS id, project_no_raw,
         SAFE_CAST(project_no_int AS INT64) AS project_no_int,
         CAST(NULL AS STRING) AS name, CAST(NULL AS STRING) AS province,
         imported_at_ts AS first_seen_at, imported_at_ts AS last_seen_at
  FROM `seea-2026.tree_census.stg_looker_csv_form`
  WHERE project_id IS NOT NULL
) S ON T.id = S.id
WHEN NOT MATCHED THEN INSERT ROW
WHEN MATCHED THEN UPDATE SET last_seen_at = S.last_seen_at;

MERGE `seea-2026.tree_census.dim_plot` T
USING (
  SELECT DISTINCT plot_id AS id, project_id, plot_no_raw,
         SAFE_CAST(plot_no_int AS INT64) AS plot_no_int,
         SAFE_CAST(ANY_VALUE(utm_easting) AS FLOAT64) AS utm_easting,
         SAFE_CAST(ANY_VALUE(utm_northing) AS FLOAT64) AS utm_northing,
         SAFE_CAST(ANY_VALUE(utm_zone) AS INT64) AS utm_zone,
         ANY_VALUE(utm_hemisphere) AS utm_hemisphere,
         imported_at_ts AS first_seen_at, imported_at_ts AS last_seen_at
  FROM `seea-2026.tree_census.stg_looker_csv_form`
  WHERE plot_id IS NOT NULL
  GROUP BY plot_id, project_id, plot_no_raw, plot_no_int
) S ON T.id = S.id
WHEN NOT MATCHED THEN INSERT ROW
WHEN MATCHED THEN UPDATE SET last_seen_at = S.last_seen_at;

MERGE `seea-2026.tree_census.dim_subplot` T
USING (
  SELECT DISTINCT subplot_id AS id, plot_id, subplot_raw,
         SAFE_CAST(subplot_no AS INT64) AS subplot_no,
         subplot_name, subplot_code,
         imported_at_ts AS first_seen_at, imported_at_ts AS last_seen_at
  FROM `seea-2026.tree_census.stg_looker_csv_form`
  WHERE subplot_id IS NOT NULL
) S ON T.id = S.id
WHEN NOT MATCHED THEN INSERT ROW
WHEN MATCHED THEN UPDATE SET last_seen_at = S.last_seen_at;

MERGE `seea-2026.tree_census.dim_species` T
USING (
  SELECT DISTINCT species_id AS id,
         CAST(NULL AS STRING) AS species_code,
         thai_name, scientific_name, scientific_author, normalized_species_name,
         CAST(NULL AS STRING) AS habit_abbrev,
         CAST(NULL AS STRING) AS iucn_status,
         imported_at_ts AS first_seen_at, imported_at_ts AS last_seen_at
  FROM `seea-2026.tree_census.stg_looker_csv_form`
  WHERE species_id IS NOT NULL
) S ON T.id = S.id
WHEN NOT MATCHED THEN INSERT ROW
WHEN MATCHED THEN UPDATE SET last_seen_at = S.last_seen_at;

-- ─── 3. fact_submission (one row per submission_id) ────────────────────────
MERGE `seea-2026.tree_census.fact_submission` T
USING (
  SELECT
    submission_id AS id,
    batch_id AS import_batch_id,
    source_tag AS source,
    ANY_VALUE(source_row_id) AS source_row_id,
    ANY_VALUE(source_file_sha256) AS source_file_sha256,
    submission_id AS external_id,
    ANY_VALUE(project_id) AS project_id,
    ANY_VALUE(plot_id) AS plot_id,
    ANY_VALUE(subplot_id) AS subplot_id,
    ANY_VALUE(species_id) AS species_id,
    ANY_VALUE(species_raw) AS species_raw,
    ANY_VALUE(item_tag_id_raw) AS item_tag_id_raw,
    ANY_VALUE(dataset_type) AS dataset_type,
    SAFE.PARSE_TIMESTAMP('%d-%b-%Y %H:%M:%S', ANY_VALUE(added_time)) AS added_time,
    SAFE.PARSE_TIMESTAMP('%d-%b-%Y %H:%M:%S', ANY_VALUE(offline_added_time)) AS offline_added_time,
    ANY_VALUE(task_owner) AS task_owner,
    ANY_VALUE(source_status) AS source_status,
    SAFE_CAST(ANY_VALUE(local_x_m) AS FLOAT64) AS local_x_m,
    SAFE_CAST(ANY_VALUE(local_y_m) AS FLOAT64) AS local_y_m,
    SAFE_CAST(ANY_VALUE(utm_easting) AS FLOAT64) AS utm_easting,
    SAFE_CAST(ANY_VALUE(utm_northing) AS FLOAT64) AS utm_northing,
    SAFE_CAST(ANY_VALUE(utm_zone) AS INT64) AS utm_zone,
    ANY_VALUE(utm_hemisphere) AS utm_hemisphere,
    SAFE_CAST(ANY_VALUE(latitude) AS FLOAT64) AS latitude,
    SAFE_CAST(ANY_VALUE(longitude) AS FLOAT64) AS longitude,
    SAFE_CAST(ANY_VALUE(geo_ready) AS BOOL) AS geo_ready,
    ANY_VALUE(coordinate_note) AS coordinate_note,
    ANY_VALUE(remarks) AS remarks,
    imported_at_ts AS ingested_at
  FROM `seea-2026.tree_census.stg_looker_csv_form`
  WHERE submission_id IS NOT NULL
  GROUP BY submission_id
) S ON T.id = S.id
WHEN NOT MATCHED THEN INSERT ROW;

-- ─── 4. obs_tree (one row per tree_id) ─────────────────────────────────────
MERGE `seea-2026.tree_census.obs_tree` T
USING (
  SELECT
    tree_id AS id,
    ANY_VALUE(submission_id) AS submission_id,
    batch_id AS import_batch_id,
    ANY_VALUE(species_id) AS species_id,
    ANY_VALUE(species_raw) AS species_raw,
    ANY_VALUE(size_class_code) AS size_class_code,
    SAFE_CAST(ANY_VALUE(azimuth_deg) AS FLOAT64) AS azimuth_deg,
    SAFE_CAST(ANY_VALUE(distance_m) AS FLOAT64) AS distance_m,
    imported_at_ts AS ingested_at
  FROM `seea-2026.tree_census.stg_looker_csv_form`
  WHERE tree_id IS NOT NULL
  GROUP BY tree_id
) S ON T.id = S.id
WHEN NOT MATCHED THEN INSERT ROW;

-- ─── 5. obs_tree_stem (one row per stem_id) ────────────────────────────────
MERGE `seea-2026.tree_census.obs_tree_stem` T
USING (
  SELECT
    stem_id AS id, tree_id, submission_id, batch_id AS import_batch_id,
    SAFE_CAST(stem_no AS INT64) AS stem_no,
    stand_fall_code, live_dead_code,
    SAFE_CAST(gbh_cm AS FLOAT64) AS gbh_cm, gbh_method_code,
    SAFE_CAST(total_height_m AS FLOAT64) AS total_height_m, height_method_code,
    crown_class_code, crown_condition_code, tree_health_code,
    SAFE_CAST(lichen_pct AS FLOAT64) AS lichen_pct,
    imported_at_ts AS ingested_at
  FROM `seea-2026.tree_census.stg_looker_csv_form`
  WHERE observation_type = 'tree_stem' AND stem_id IS NOT NULL
) S ON T.id = S.id
WHEN NOT MATCHED THEN INSERT ROW;

-- ─── 6. obs_seedling ────────────────────────────────────────────────────────
MERGE `seea-2026.tree_census.obs_seedling` T
USING (
  SELECT
    seedling_id AS id, submission_id, batch_id AS import_batch_id,
    species_id, species_raw, size_class_code,
    SAFE_CAST(seedling_count AS INT64) AS seedling_count,
    imported_at_ts AS ingested_at
  FROM `seea-2026.tree_census.stg_looker_csv_form`
  WHERE observation_type = 'seedling' AND seedling_id IS NOT NULL
) S ON T.id = S.id
WHEN NOT MATCHED THEN INSERT ROW;

-- ─── 7. obs_woody_debris ────────────────────────────────────────────────────
MERGE `seea-2026.tree_census.obs_woody_debris` T
USING (
  SELECT
    woody_debris_id AS id, submission_id, batch_id AS import_batch_id,
    transect_raw, SAFE_CAST(transect_deg AS FLOAT64) AS transect_deg,
    large_woody_condition_code,
    SAFE_CAST(tip_diameter_cm AS FLOAT64) AS tip_diameter_cm,
    SAFE_CAST(middle_diameter_cm AS FLOAT64) AS middle_diameter_cm,
    SAFE_CAST(base_diameter_cm AS FLOAT64) AS base_diameter_cm,
    SAFE_CAST(medium_piece_count AS INT64) AS medium_piece_count,
    SAFE_CAST(small_piece_count AS INT64) AS small_piece_count,
    SAFE_CAST(fine_piece_count AS INT64) AS fine_piece_count,
    imported_at_ts AS ingested_at
  FROM `seea-2026.tree_census.stg_looker_csv_form`
  WHERE observation_type = 'woody_debris' AND woody_debris_id IS NOT NULL
) S ON T.id = S.id
WHEN NOT MATCHED THEN INSERT ROW;

-- ─── 8. etl_validation_flags (unnest comma-delimited codes) ────────────────
INSERT INTO `seea-2026.tree_census.etl_validation_flags`
(id, entity_type, entity_id, import_batch_id, flag_code, severity, notes, created_at)
SELECT
  GENERATE_UUID() AS id,
  'looker_row' AS entity_type,
  map_record_id AS entity_id,
  batch_id AS import_batch_id,
  TRIM(flag_code) AS flag_code,
  COALESCE(TRIM(SPLIT(validation_flag_severities, ',')[SAFE_OFFSET(off)]), 'info') AS severity,
  CAST(NULL AS STRING) AS notes,
  imported_at_ts AS created_at
FROM `seea-2026.tree_census.stg_looker_csv_form`,
UNNEST(SPLIT(validation_flag_codes, ',')) AS flag_code WITH OFFSET off
WHERE validation_flag_codes IS NOT NULL AND validation_flag_codes != '';
