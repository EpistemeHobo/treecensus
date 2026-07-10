import RAW from '@/data/wood-matric.json'

/**
 * Typed access to the provisional wood-metric reference table.
 *
 * Density (ρ, oven-dry g/cm³) is required by every allometric biomass equation
 * but is not stored per-observation, so it is looked up by species name.
 * Form factor (f) is used for wood volume calculations.
 * These values are PROVISIONAL and pending expert review.
 */

export interface WoodMetricSpecies {
  scientific_name: string
  thai_name: string
  density: number
  form_factor: number
}

export interface WoodMetricTable {
  title: string
  note: string
  version: string
  reviewed: boolean
  defaultDensity: number
  defaultFormFactor: number
  source: string
  species: WoodMetricSpecies[]
}

export const WOOD_MATRIC: WoodMetricTable = RAW

/**
 * Parallel arrays for a keyed lookup in BigQuery (UNNEST + WITH OFFSET join).
 * Keys are lowercased scientific names; the SQL matches them against
 * lower(normalized_species_name) or lower(scientific_name).
 */
export function metricLookupArrays(): { keys: string[]; densities: number[]; formFactors: number[] } {
  const keys: string[] = []
  const densities: number[] = []
  const formFactors: number[] = []
  for (const s of WOOD_MATRIC.species) {
    keys.push(s.scientific_name.toLowerCase())
    densities.push(s.density)
    formFactors.push(s.form_factor)
  }
  return { keys, densities, formFactors }
}
