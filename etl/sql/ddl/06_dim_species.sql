CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.dim_species` (
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
