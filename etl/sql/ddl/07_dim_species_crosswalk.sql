-- Reference table loaded from รายชื่อพันธุ์ไม้-2026-2.xlsx once, then joined at
-- transform time to enrich raw species text.
CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_species_crosswalk` (
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
