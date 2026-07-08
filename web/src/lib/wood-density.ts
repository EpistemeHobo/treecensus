import RAW from '@/data/wood-density.json'

/**
 * Typed access to the provisional wood-density reference table.
 *
 * Density (ρ, oven-dry g/cm³) is required by every allometric biomass equation
 * but is not stored per-observation, so it is looked up by species name. These
 * values are PROVISIONAL and pending expert review — see the JSON's `note`.
 */

export interface WoodDensitySpecies {
  scientific_name: string
  thai_name: string
  density: number
}

export interface WoodDensityTable {
  title: string
  note: string
  version: string
  reviewed: boolean
  defaultDensity: number
  source: string
  species: WoodDensitySpecies[]
}

export const WOOD_DENSITY: WoodDensityTable = RAW

/**
 * Parallel arrays for a keyed lookup in BigQuery (UNNEST + WITH OFFSET join).
 * Keys are lowercased scientific names; the SQL matches them against
 * lower(normalized_species_name) or lower(scientific_name).
 */
export function densityLookupArrays(): { keys: string[]; values: number[] } {
  const keys: string[] = []
  const values: number[] = []
  for (const s of WOOD_DENSITY.species) {
    keys.push(s.scientific_name.toLowerCase())
    values.push(s.density)
  }
  return { keys, values }
}
