-- ═══════════════════════════════════════════════════════════════════════════
-- Copy stg_looker_csv_form → observations (the flat 80-field store).
--
-- Idempotent: MERGE on map_record_id, so re-running won't duplicate rows.
-- Every value is CAST to STRING so it works whether the staging table was
-- loaded all-STRING or with auto-detected types.
--
-- If you kept the table named `map_points`, just replace `observations` below.
-- If stg_looker_csv_form is missing a column named here, delete that line.
-- ═══════════════════════════════════════════════════════════════════════════

MERGE `seea-2026.tree_census.observations` T
USING (
  SELECT
    CAST(map_record_id AS STRING) AS map_record_id,
    CAST(observation_type AS STRING) AS observation_type,
    CAST(source_row_id AS STRING) AS source_row_id,
    CAST(submission_id AS STRING) AS submission_id,
    CAST(import_batch_id AS STRING) AS import_batch_id,
    CAST(source_file_sha256 AS STRING) AS source_file_sha256,
    CAST(project_id AS STRING) AS project_id,
    CAST(project_no_raw AS STRING) AS project_no_raw,
    CAST(project_no_int AS STRING) AS project_no_int,
    CAST(plot_id AS STRING) AS plot_id,
    CAST(plot_no_raw AS STRING) AS plot_no_raw,
    CAST(plot_no_int AS STRING) AS plot_no_int,
    CAST(subplot_id AS STRING) AS subplot_id,
    CAST(subplot_raw AS STRING) AS subplot_raw,
    CAST(subplot_no AS STRING) AS subplot_no,
    CAST(subplot_name AS STRING) AS subplot_name,
    CAST(subplot_code AS STRING) AS subplot_code,
    CAST(dataset_type AS STRING) AS dataset_type,
    CAST(item_tag_id_raw AS STRING) AS item_tag_id_raw,
    CAST(added_time AS STRING) AS added_time,
    CAST(offline_added_time AS STRING) AS offline_added_time,
    CAST(task_owner AS STRING) AS task_owner,
    CAST(source_status AS STRING) AS source_status,
    CAST(local_x_m AS STRING) AS local_x_m,
    CAST(local_y_m AS STRING) AS local_y_m,
    CAST(utm_easting AS STRING) AS utm_easting,
    CAST(utm_northing AS STRING) AS utm_northing,
    CAST(utm_zone AS STRING) AS utm_zone,
    CAST(utm_hemisphere AS STRING) AS utm_hemisphere,
    CAST(latitude AS STRING) AS latitude,
    CAST(longitude AS STRING) AS longitude,
    CAST(geo_ready AS STRING) AS geo_ready,
    CAST(coordinate_note AS STRING) AS coordinate_note,
    CAST(species_id AS STRING) AS species_id,
    CAST(species_raw AS STRING) AS species_raw,
    CAST(thai_name AS STRING) AS thai_name,
    CAST(scientific_name AS STRING) AS scientific_name,
    CAST(scientific_author AS STRING) AS scientific_author,
    CAST(normalized_species_name AS STRING) AS normalized_species_name,
    CAST(tree_id AS STRING) AS tree_id,
    CAST(stem_id AS STRING) AS stem_id,
    CAST(seedling_id AS STRING) AS seedling_id,
    CAST(woody_debris_id AS STRING) AS woody_debris_id,
    CAST(size_class_raw AS STRING) AS size_class_raw,
    CAST(size_class_code AS STRING) AS size_class_code,
    CAST(azimuth_deg AS STRING) AS azimuth_deg,
    CAST(distance_m AS STRING) AS distance_m,
    CAST(stem_no AS STRING) AS stem_no,
    CAST(stand_fall_raw AS STRING) AS stand_fall_raw,
    CAST(stand_fall_code AS STRING) AS stand_fall_code,
    CAST(live_dead_raw AS STRING) AS live_dead_raw,
    CAST(live_dead_code AS STRING) AS live_dead_code,
    CAST(gbh_cm AS STRING) AS gbh_cm,
    CAST(gbh_method_raw AS STRING) AS gbh_method_raw,
    CAST(gbh_method_code AS STRING) AS gbh_method_code,
    CAST(total_height_m AS STRING) AS total_height_m,
    CAST(height_method_raw AS STRING) AS height_method_raw,
    CAST(height_method_code AS STRING) AS height_method_code,
    CAST(crown_class_raw AS STRING) AS crown_class_raw,
    CAST(crown_class_code AS STRING) AS crown_class_code,
    CAST(crown_condition_raw AS STRING) AS crown_condition_raw,
    CAST(crown_condition_code AS STRING) AS crown_condition_code,
    CAST(tree_health_raw AS STRING) AS tree_health_raw,
    CAST(tree_health_code AS STRING) AS tree_health_code,
    CAST(lichen_pct AS STRING) AS lichen_pct,
    CAST(seedling_count AS STRING) AS seedling_count,
    CAST(transect_raw AS STRING) AS transect_raw,
    CAST(transect_deg AS STRING) AS transect_deg,
    CAST(large_woody_condition_raw AS STRING) AS large_woody_condition_raw,
    CAST(large_woody_condition_code AS STRING) AS large_woody_condition_code,
    CAST(tip_diameter_cm AS STRING) AS tip_diameter_cm,
    CAST(middle_diameter_cm AS STRING) AS middle_diameter_cm,
    CAST(base_diameter_cm AS STRING) AS base_diameter_cm,
    CAST(medium_piece_count AS STRING) AS medium_piece_count,
    CAST(small_piece_count AS STRING) AS small_piece_count,
    CAST(fine_piece_count AS STRING) AS fine_piece_count,
    CAST(remarks AS STRING) AS remarks,
    CAST(validation_flag_count AS STRING) AS validation_flag_count,
    CAST(validation_flag_codes AS STRING) AS validation_flag_codes,
    CAST(validation_flag_severities AS STRING) AS validation_flag_severities
  FROM `seea-2026.tree_census.stg_looker_csv_form`
) S
ON T.map_record_id = S.map_record_id
WHEN NOT MATCHED THEN INSERT ROW;

-- Verify
-- SELECT COUNT(*) AS observations_rows FROM `seea-2026.tree_census.observations`;
-- SELECT observation_type, COUNT(*) FROM `seea-2026.tree_census.observations` GROUP BY 1;
