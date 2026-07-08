import DATA_DICTIONARY_JSON from '@/data/data-dictionary.json'

/**
 * Typed access to data-dictionary.json (BigQuery field documentation).
 *
 * The JSON stays JSON — it is a versioned data document, not code — but this
 * module gives every consumer one shared, compile-checked shape instead of
 * per-file `as any[]` casts. If the JSON's shape ever drifts from DictField,
 * the assignment below fails the build.
 */

export interface DictField {
  name: string
  label: string
  group: string
  type: string
  unit: string
  appliesTo: string
  description: string
  /** Present only on enum-typed fields. */
  values?: string[]
  th_label?: string | null
  th_description?: string | null
  th_unit?: string | null
}

export interface DataDictionary {
  title: string
  source: string
  note: string
  version: string
  fields: DictField[]
}

export const DATA_DICTIONARY: DataDictionary = DATA_DICTIONARY_JSON

/** Dictionary entries keyed by BigQuery field name. */
export const DICT_BY_NAME = new Map<string, DictField>(
  DATA_DICTIONARY.fields.map(f => [f.name, f]),
)
