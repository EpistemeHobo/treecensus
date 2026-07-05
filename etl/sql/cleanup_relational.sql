-- ═══════════════════════════════════════════════════════════════════════════
-- Tear down the abandoned star schema.  Run observations.sql FIRST.
--
-- ⚠ Dropping is irreversible. Work top to bottom and read each section:
--   STEP 0 — rescue any real webhook rows sitting in raw_form_rows.
--   STEP 1 — drop the relational objects.
-- Comment out anything you want to keep.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── STEP 0. (Optional) Migrate webhook payloads → observations ───────────────
-- The old webhook landed raw JSON in raw_form_rows.payload. If that JSON's keys
-- are the 80 field names, this lifts them into observations before you drop it.
-- Inspect first:  SELECT source, COUNT(*) FROM `seea-2026.tree_census.raw_form_rows` GROUP BY source;
--
-- INSERT INTO `seea-2026.tree_census.observations`
-- (map_record_id, observation_type, source_row_id, submission_id, import_batch_id,
--  source_file_sha256, project_id, latitude, longitude, species_raw, gbh_cm, remarks)
-- SELECT
--   JSON_VALUE(payload, '$.map_record_id'),
--   JSON_VALUE(payload, '$.observation_type'),
--   source_row_id,
--   JSON_VALUE(payload, '$.submission_id'),
--   import_batch_id,
--   JSON_VALUE(payload, '$.source_file_sha256'),
--   JSON_VALUE(payload, '$.project_id'),
--   JSON_VALUE(payload, '$.latitude'),
--   JSON_VALUE(payload, '$.longitude'),
--   JSON_VALUE(payload, '$.species_raw'),
--   JSON_VALUE(payload, '$.gbh_cm'),
--   JSON_VALUE(payload, '$.remarks')
-- FROM `seea-2026.tree_census.raw_form_rows`;
--   -- (extend the column list to all 80 fields if you need a full copy)

-- ─── STEP 1. Drop the relational objects ───────────────────────────────────
-- Staging + raw landing
DROP TABLE IF EXISTS `seea-2026.tree_census.stg_looker_csv_form`;
DROP TABLE IF EXISTS `seea-2026.tree_census.raw_form_rows`;
DROP TABLE IF EXISTS `seea-2026.tree_census.raw_import_batch`;

-- Dimensions
DROP TABLE IF EXISTS `seea-2026.tree_census.dim_project`;
DROP TABLE IF EXISTS `seea-2026.tree_census.dim_plot`;
DROP TABLE IF EXISTS `seea-2026.tree_census.dim_subplot`;
DROP TABLE IF EXISTS `seea-2026.tree_census.dim_species`;
DROP TABLE IF EXISTS `seea-2026.tree_census.dim_species_crosswalk`;
DROP TABLE IF EXISTS `seea-2026.tree_census.dim_codebook`;

-- Facts / observations
DROP TABLE IF EXISTS `seea-2026.tree_census.fact_submission`;
DROP TABLE IF EXISTS `seea-2026.tree_census.obs_tree`;
DROP TABLE IF EXISTS `seea-2026.tree_census.obs_tree_stem`;
DROP TABLE IF EXISTS `seea-2026.tree_census.obs_seedling`;
DROP TABLE IF EXISTS `seea-2026.tree_census.obs_woody_debris`;

-- ETL bookkeeping
DROP TABLE IF EXISTS `seea-2026.tree_census.etl_validation_flags`;
DROP TABLE IF EXISTS `seea-2026.tree_census.etl_watermark`;

-- NOTE: the looker_map_points VIEW is recreated by observations.sql to point at
-- the new table, so it is intentionally NOT dropped here.
