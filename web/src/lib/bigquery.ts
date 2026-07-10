import { BigQuery } from '@google-cloud/bigquery'
import type { DashboardStats, PlotLocation, QueryResult } from '@/types'

// ─── Client ──────────────────────────────────────────────────────────────────
// Credentials come from GOOGLE_APPLICATION_CREDENTIALS env var (service account
// JSON path) or Application Default Credentials when running on GCP.

import { getGcpCredentials } from './gcp-credentials'
import { WOOD_MATRIC, metricLookupArrays } from './wood-matric'
import { provinceCoords } from './thai-provinces'

const bq = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
  ...getGcpCredentials(),
})

const PROJECT = process.env.GCP_PROJECT_ID
const DATASET = process.env.BIGQUERY_DATASET ?? 'tree_census'
const RAW_TABLE = () => `\`${process.env.GCP_PROJECT_ID}.${DATASET}.raw_form_rows\``

// The single flat source-of-truth table (see etl/sql/observations.sql).
export const OBSERVATIONS_TABLE = 'observations'
export const OBSERVATIONS_FQN = `${PROJECT}.${DATASET}.${OBSERVATIONS_TABLE}`

/** One observation row — every column is STRING in BigQuery. */
export type ObservationRow = Record<string, string | null>

export interface ColumnMeta {
  name: string
  type: string
}

// Text columns worth scanning for the free-text search box on the data browser.
const SEARCH_COLUMNS = [
  'map_record_id', 'submission_id', 'plot_no_raw', 'subplot_name',
  'species_raw', 'thai_name', 'scientific_name', 'task_owner', 'remarks',
]

// ─── Schema (the field pool — source of truth) ────────────────────────────────

/** Column names + types of `observations`, straight from INFORMATION_SCHEMA. */
export async function getObservationSchema(): Promise<ColumnMeta[]> {
  const query = `
    SELECT column_name, data_type
    FROM \`${PROJECT}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = @table
    ORDER BY ordinal_position
  `
  const [rows] = await bq.query({
    query,
    params: { table: OBSERVATIONS_TABLE },
  })
  return (rows as { column_name: string; data_type: string }[]).map(r => ({
    name: r.column_name,
    type: r.data_type,
  }))
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const { keys, densities, formFactors } = metricLookupArrays()
  const query = `
    WITH density AS (
      SELECT k AS species, v AS density
      FROM UNNEST(@densKeys) AS k WITH OFFSET ko
      JOIN UNNEST(@densValues) AS v WITH OFFSET vo ON ko = vo
    ),
    form_factor AS (
      SELECT k AS species, v AS ff
      FROM UNNEST(@densKeys) AS k WITH OFFSET ko
      JOIN UNNEST(@ffValues) AS v WITH OFFSET vo ON ko = vo
    ),
    raw_stats AS (
      SELECT
        observation_type,
        tree_id,
        plot_id,
        species_id,
        submission_id,
        added_time,
        LOWER(COALESCE(NULLIF(normalized_species_name, ''), NULLIF(scientific_name, ''))) AS species_key,
        SAFE_CAST(gbh_cm AS FLOAT64) / ACOS(-1) AS dbh,
        SAFE_CAST(total_height_m AS FLOAT64) AS h
      FROM \`${OBSERVATIONS_FQN}\`
    ),
    biomass AS (
      SELECT
        0.251 * COALESCE(d.density, @defaultDensity) * POW(s.dbh, 2.46) AS komi_agb,
        IF(s.h > 0, COALESCE(f.ff, @defaultFF) * (ACOS(-1) * POW(s.dbh / 100, 2) / 4) * s.h, 0) AS wood_volume
      FROM raw_stats s
      LEFT JOIN density d ON d.species = s.species_key
      LEFT JOIN form_factor f ON f.species = s.species_key
      WHERE s.observation_type = 'tree_stem' AND s.dbh IS NOT NULL AND s.dbh > 0
    )
    SELECT
      COUNT(DISTINCT IF(observation_type = 'tree_stem', tree_id, NULL))        AS totalTrees,
      COUNT(DISTINCT plot_id)                                                  AS totalSites,
      COUNT(DISTINCT species_id)                                               AS totalSpecies,
      COUNT(DISTINCT submission_id)                                            AS totalSubmissions,
      (SELECT SUM(komi_agb) FROM biomass)                                      AS totalBiomass,
      (SELECT SUM(wood_volume) FROM biomass)                                    AS totalVolume,
      MAX(NULLIF(added_time, ''))                                              AS lastSyncAt
    FROM raw_stats
  `
  const [rows] = await bq.query({
    query,
    params: {
      densKeys: keys,
      densValues: densities,
      ffValues: formFactors,
      defaultDensity: WOOD_MATRIC.defaultDensity,
      defaultFF: WOOD_MATRIC.defaultFormFactor,
    },
  })
  const r = (rows[0] ?? {}) as Record<string, unknown>
  return {
    totalTrees: Number(r.totalTrees ?? 0),
    totalSites: Number(r.totalSites ?? 0),
    totalSpecies: Number(r.totalSpecies ?? 0),
    totalSubmissions: Number(r.totalSubmissions ?? 0),
    totalBiomass: Number(r.totalBiomass ?? 0),
    totalVolume: Number(r.totalVolume ?? 0),
    lastSyncAt: (r.lastSyncAt as string) ?? '—',
  }
}

/** Per-plot GPS centroid + counts — feeds the dashboard firefly maps.
 *  Returns every plot; lat/lng are NULL when the plot has no usable GPS row,
 *  so the dashboard can split GPS vs estimated-location maps. */
export async function getPlotLocations(): Promise<PlotLocation[]> {
  const query = `
    SELECT
      plot_id AS plotId,
      MAX(NULLIF(project_no_raw, '')) AS projectNo,
      AVG(IF(valid, lat, NULL)) AS lat,
      AVG(IF(valid, lng, NULL)) AS lng,
      COUNT(DISTINCT IF(observation_type = 'tree_stem', tree_id, NULL)) AS treeCount,
      COUNT(*) AS obsCount,
      ARRAY_TO_STRING(ARRAY_AGG(DISTINCT NULLIF(iucn_code, '')), ',') AS iucnCodes
    FROM (
      SELECT
        plot_id,
        project_no_raw,
        observation_type,
        tree_id,
        iucn_code,
        lat,
        lng,
        (lat IS NOT NULL AND lng IS NOT NULL
          AND lat BETWEEN -90 AND 90
          AND lng BETWEEN -180 AND 180
          AND NOT (lat = 0 AND lng = 0)) AS valid
      FROM (
        SELECT
          plot_id,
          project_no_raw,
          observation_type,
          tree_id,
          iucn_code,
          SAFE_CAST(latitude AS FLOAT64) AS lat,
          SAFE_CAST(longitude AS FLOAT64) AS lng
        FROM \`${OBSERVATIONS_FQN}\`
        WHERE NULLIF(plot_id, '') IS NOT NULL
      )
    )
    GROUP BY plot_id
    ORDER BY treeCount DESC
    LIMIT 1000
  `
  const [rows] = await bq.query({ query })
  return (rows as Record<string, unknown>[]).map(r => ({
    plotId: String(r.plotId),
    projectNo: r.projectNo == null ? '' : String(r.projectNo),
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
    treeCount: Number(r.treeCount),
    obsCount: Number(r.obsCount),
    iucnCodes: r.iucnCodes == null ? '' : String(r.iucnCodes),
  }))
}

/** Row count per observation_type — for dashboard breakdown charts. */
export async function getObservationTypeCounts(): Promise<{ type: string; count: number }[]> {
  const query = `
    SELECT observation_type AS type, COUNT(*) AS count
    FROM \`${OBSERVATIONS_FQN}\`
    GROUP BY observation_type
    ORDER BY count DESC
  `
  const [rows] = await bq.query({ query })
  return (rows as { type: string; count: number | string }[]).map(r => ({
    type: r.type,
    count: Number(r.count),
  }))
}

/** Row count per iucn_code — for dashboard conservation status card. */
export async function getIucnStatusCounts(): Promise<{ code: string; count: number; species: { scientific_name: string; thai_name: string }[] }[]> {
  const query = `
    WITH species_by_iucn AS (
      SELECT DISTINCT
        iucn_code AS code,
        COALESCE(NULLIF(normalized_species_name, ''), NULLIF(scientific_name, ''), '(unspecified)') AS scientific_name,
        COALESCE(NULLIF(thai_name, ''), '(ไม่มีชื่อไทย)') AS thai_name
      FROM \`${OBSERVATIONS_FQN}\`
      WHERE NULLIF(iucn_code, '') IS NOT NULL
    ),
    species_grouped AS (
      SELECT
        code,
        ARRAY_AGG(STRUCT(scientific_name, thai_name)) AS species
      FROM species_by_iucn
      GROUP BY code
    ),
    counts AS (
      SELECT iucn_code AS code, COUNT(DISTINCT tree_id) AS count
      FROM \`${OBSERVATIONS_FQN}\`
      WHERE NULLIF(iucn_code, '') IS NOT NULL
      GROUP BY iucn_code
    )
    SELECT
      c.code,
      c.count,
      g.species
    FROM counts c
    LEFT JOIN species_grouped g ON c.code = g.code
    ORDER BY c.count DESC
  `
  const [rows] = await bq.query({ query })
  return (rows as any[]).map(r => ({
    code: r.code,
    count: Number(r.count),
    species: (r.species || []).map((s: any) => ({
      scientific_name: String(s.scientific_name),
      thai_name: String(s.thai_name),
    })),
  }))
}

// ─── Focus Area Statistics (maps page) ────────────────────────────────────────

export type FocusAreaLevel = 'province' | 'plot' | 'subplot'

/** One tree stem placed on the focus-area map. lat/lng are null without GPS. */
export interface FocusAreaStem {
  /** Unique per row (map_record_id) — a tree_id may span several stems. */
  id: string
  treeId: string
  lat: number | null
  lng: number | null
  gbhCm: number | null
  heightM: number | null
  iucnCode: string
  scientificName: string
  thaiName: string
  liveDead: string
  plotId: string
  subplotId: string
}

export interface FocusAreaResult {
  level: FocusAreaLevel
  code: string
  stems: FocusAreaStem[]
  total: number
  withGps: number
  withoutGps: number
  /** Count of stems per IUCN code (non-empty codes only). */
  iucnCounts: { code: string; count: number }[]
}

const FOCUS_STEM_LIMIT = 5000

/**
 * Tree stems inside one selected focus area, for the Maps page map.
 *   province → all raw project_no_raw values that canonicalise to `code`
 *   plot     → plot_id = code
 *   subplot  → subplot_id = code
 */
export async function getFocusAreaStems(
  level: FocusAreaLevel,
  code: string,
): Promise<FocusAreaResult> {
  const params: Record<string, unknown> = { limit: FOCUS_STEM_LIMIT }
  let areaWhere: string

  if (level === 'plot') {
    areaWhere = 'plot_id = @code'
    params.code = code
  } else if (level === 'subplot') {
    areaWhere = 'subplot_id = @code'
    params.code = code
  } else {
    // Province: the picker uses the canonical name, but project_no_raw holds
    // abbreviated/misspelled variants (e.g. "สุราษฯ"). Resolve the distinct raw
    // values that map to this canonical province, then match on that set.
    const [rawRows] = await bq.query({
      query: `SELECT DISTINCT project_no_raw FROM \`${OBSERVATIONS_FQN}\` WHERE NULLIF(project_no_raw, '') IS NOT NULL`,
    })
    const rawValues = (rawRows as { project_no_raw: string }[])
      .map(r => r.project_no_raw)
      .filter(raw => (provinceCoords(raw)?.name ?? raw.trim()) === code)
    if (rawValues.length === 0) {
      return { level, code, stems: [], total: 0, withGps: 0, withoutGps: 0, iucnCounts: [] }
    }
    areaWhere = 'project_no_raw IN UNNEST(@rawValues)'
    params.rawValues = rawValues
  }

  const [rows] = await bq.query({
    query: `
      SELECT
        map_record_id AS id,
        tree_id AS treeId,
        IF(valid, lat, NULL) AS lat,
        IF(valid, lng, NULL) AS lng,
        SAFE_CAST(gbh_cm AS FLOAT64) AS gbhCm,
        SAFE_CAST(total_height_m AS FLOAT64) AS heightM,
        COALESCE(NULLIF(iucn_code, ''), '') AS iucnCode,
        COALESCE(NULLIF(scientific_name, ''), '') AS scientificName,
        COALESCE(NULLIF(thai_name, ''), '') AS thaiName,
        COALESCE(NULLIF(live_dead_code, ''), '') AS liveDead,
        COALESCE(NULLIF(plot_id, ''), '') AS plotId,
        COALESCE(NULLIF(subplot_id, ''), '') AS subplotId
      FROM (
        SELECT
          map_record_id, tree_id, gbh_cm, total_height_m, iucn_code,
          scientific_name, thai_name, live_dead_code, plot_id, subplot_id,
          lat, lng,
          (lat IS NOT NULL AND lng IS NOT NULL
            AND lat BETWEEN -90 AND 90
            AND lng BETWEEN -180 AND 180
            AND NOT (lat = 0 AND lng = 0)) AS valid
        FROM (
          SELECT
            map_record_id, tree_id, gbh_cm, total_height_m, iucn_code,
            scientific_name, thai_name, live_dead_code, project_no_raw,
            plot_id, subplot_id,
            SAFE_CAST(latitude AS FLOAT64) AS lat,
            SAFE_CAST(longitude AS FLOAT64) AS lng
          FROM \`${OBSERVATIONS_FQN}\`
          WHERE observation_type = 'tree_stem' AND (${areaWhere})
        )
      )
      LIMIT @limit
    `,
    params,
  })

  const stems: FocusAreaStem[] = (rows as Record<string, unknown>[]).map(r => ({
    id: String(r.id ?? ''),
    treeId: String(r.treeId ?? ''),
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
    gbhCm: r.gbhCm == null ? null : Number(r.gbhCm),
    heightM: r.heightM == null ? null : Number(r.heightM),
    iucnCode: String(r.iucnCode ?? ''),
    scientificName: String(r.scientificName ?? ''),
    thaiName: String(r.thaiName ?? ''),
    liveDead: String(r.liveDead ?? ''),
    plotId: String(r.plotId ?? ''),
    subplotId: String(r.subplotId ?? ''),
  }))

  const withGps = stems.filter(s => s.lat != null && s.lng != null).length
  const iucnMap = new Map<string, number>()
  for (const s of stems) {
    if (!s.iucnCode) continue
    iucnMap.set(s.iucnCode, (iucnMap.get(s.iucnCode) ?? 0) + 1)
  }
  const iucnCounts = Array.from(iucnMap.entries())
    .map(([c, n]) => ({ code: c, count: n }))
    .sort((a, b) => b.count - a.count)

  return {
    level,
    code,
    stems,
    total: stems.length,
    withGps,
    withoutGps: stems.length - withGps,
    iucnCounts,
  }
}

// ─── Row browsing (data page / export) ────────────────────────────────────────

export async function getObservations(opts?: {
  observationType?: string
  plotId?: string
  speciesId?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ rows: ObservationRow[]; total: number }> {
  const limit = Math.min(opts?.limit ?? 50, 100_000)
  const offset = opts?.offset ?? 0

  const conditions: string[] = ['1=1']
  const params: Record<string, unknown> = {}
  if (opts?.observationType) {
    conditions.push('observation_type = @observationType')
    params.observationType = opts.observationType
  }
  if (opts?.plotId) {
    conditions.push('plot_id = @plotId')
    params.plotId = opts.plotId
  }
  if (opts?.speciesId) {
    conditions.push('species_id = @speciesId')
    params.speciesId = opts.speciesId
  }
  if (opts?.search) {
    const ors = SEARCH_COLUMNS.map(c => `LOWER(${c}) LIKE @search`).join(' OR ')
    conditions.push(`(${ors})`)
    params.search = `%${opts.search.toLowerCase()}%`
  }
  const where = conditions.join(' AND ')

  const [rows] = await bq.query({
    query: `
      SELECT * FROM \`${OBSERVATIONS_FQN}\`
      WHERE ${where}
      ORDER BY map_record_id
      LIMIT @limit OFFSET @offset
    `,
    params: { ...params, limit, offset },
  })

  const [countRows] = await bq.query({
    query: `SELECT COUNT(*) AS total FROM \`${OBSERVATIONS_FQN}\` WHERE ${where}`,
    params,
  })

  return {
    rows: rows as ObservationRow[],
    total: Number((countRows[0] as { total: number | string }).total),
  }
}

/**
 * Back-compat shim for /api/data/trees and /api/export — tree stems only,
 * mapping the old siteId/species params onto the flat columns.
 */
export async function getTrees(opts?: {
  siteId?: string
  species?: string
  limit?: number
  offset?: number
}): Promise<{ rows: ObservationRow[]; total: number }> {
  return getObservations({
    observationType: 'tree_stem',
    plotId: opts?.siteId,
    speciesId: opts?.species,
    limit: opts?.limit,
    offset: opts?.offset,
  })
}

/** Distinct submissions (one row per submission_id) for /api/data/submissions. */
export async function getSubmissions(opts?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<{ rows: ObservationRow[]; total: number }> {
  const limit = Math.min(opts?.limit ?? 50, 100_000)
  const offset = opts?.offset ?? 0
  const conditions: string[] = ['submission_id IS NOT NULL']
  const params: Record<string, unknown> = {}
  if (opts?.status) {
    conditions.push('source_status = @status')
    params.status = opts.status
  }
  const where = conditions.join(' AND ')

  const [rows] = await bq.query({
    query: `
      SELECT
        submission_id,
        ANY_VALUE(project_id)   AS project_id,
        ANY_VALUE(plot_id)      AS plot_id,
        ANY_VALUE(subplot_name) AS subplot_name,
        ANY_VALUE(task_owner)   AS task_owner,
        ANY_VALUE(source_status) AS source_status,
        ANY_VALUE(added_time)   AS added_time,
        COUNT(*)                AS observation_count
      FROM \`${OBSERVATIONS_FQN}\`
      WHERE ${where}
      GROUP BY submission_id
      ORDER BY added_time DESC
      LIMIT @limit OFFSET @offset
    `,
    params: { ...params, limit, offset },
  })

  const [countRows] = await bq.query({
    query: `SELECT COUNT(DISTINCT submission_id) AS total FROM \`${OBSERVATIONS_FQN}\` WHERE ${where}`,
    params,
  })

  return {
    rows: rows as ObservationRow[],
    total: Number((countRows[0] as { total: number | string }).total),
  }
}

// ─── Structured filter (Data page) ────────────────────────────────────────────

// Operator -> human label. Kept in sync with the Data page filter builder.
export const FILTER_OPERATORS = {
  contains: 'contains',
  equals: 'equals',
  not_equals: 'does not equal',
  starts_with: 'starts with',
  gt: '> (number)',
  lt: '< (number)',
  not_empty: 'is not empty',
  empty: 'is empty',
} as const

export type FilterOp = keyof typeof FILTER_OPERATORS

export interface ObservationFilter {
  field: string
  op: FilterOp
  value?: string
}

// The STRING column the Data page "time frame" range filters on (record added date).
const DATE_RANGE_FIELD = 'added_time'

// Intelligent, format-tolerant parse of a free-text date/timestamp STRING column
// into a TIMESTAMP. Tries the formats field data realistically arrives in and
// returns NULL (never errors) when none match, so a row with an unparseable or
// empty value is simply excluded from a range rather than blowing up the query.
function flexibleTimestampExpr(col: string): string {
  const s = `CAST(${col} AS STRING)`
  return `COALESCE(
    SAFE_CAST(${s} AS TIMESTAMP),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', ${s}),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', ${s}),
    SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M:%S', ${s}),
    SAFE.PARSE_TIMESTAMP('%d/%m/%Y', ${s}),
    SAFE.PARSE_TIMESTAMP('%m/%d/%Y %H:%M:%S', ${s}),
    SAFE.PARSE_TIMESTAMP('%m/%d/%Y', ${s}),
    SAFE.PARSE_TIMESTAMP('%d-%b-%Y %H:%M:%S', ${s}),
    SAFE.PARSE_TIMESTAMP('%d-%b-%Y', ${s}),
    SAFE.PARSE_TIMESTAMP('%d %b %Y', ${s}),
    IF(REGEXP_CONTAINS(${s}, r'^[0-9]{13}$'), TIMESTAMP_MILLIS(SAFE_CAST(${s} AS INT64)), NULL),
    IF(REGEXP_CONTAINS(${s}, r'^[0-9]{10}$'), TIMESTAMP_SECONDS(SAFE_CAST(${s} AS INT64)), NULL)
  )`
}

// Whether DATE_RANGE_FIELD has ANY parseable date in the table. Used so the time
// frame is skipped (not applied as a 0-matching predicate) while the column is
// empty. Memoized only once true — re-checked while false so it "wakes up" as
// soon as dated rows land, without needing a server restart.
let _dateColumnHasData = false
async function dateColumnHasData(): Promise<boolean> {
  if (_dateColumnHasData) return true
  const [rows] = await bq.query({
    query: `SELECT COUNT(*) AS n FROM \`${OBSERVATIONS_FQN}\` WHERE ${flexibleTimestampExpr(DATE_RANGE_FIELD)} IS NOT NULL`,
  })
  _dateColumnHasData = Number((rows[0] as { n: number | string }).n) > 0
  return _dateColumnHasData
}

// Column names are interpolated into SQL, so they MUST be validated against the
// real schema (allow-list). Values are always passed as query parameters.
let _fieldSet: Set<string> | null = null
async function observationFieldSet(): Promise<Set<string>> {
  if (!_fieldSet) {
    const cols = await getObservationSchema()
    _fieldSet = new Set(cols.map(c => c.name))
  }
  return _fieldSet
}

// Build the shared WHERE clause + query params for the structured filter used by
// both the row browser and the insights aggregations. Column names are validated
// against the schema allow-list; values always flow through query parameters.
async function buildObservationWhere(opts: {
  search?: string
  filters?: ObservationFilter[]
  dateFrom?: string
  dateTo?: string
}): Promise<{ where: string; params: Record<string, unknown> }> {
  const fieldSet = await observationFieldSet()

  const conditions: string[] = ['1=1']
  const params: Record<string, unknown> = {}
  let i = 0

  for (const f of opts.filters ?? []) {
    if (!f.field) continue
    if (!fieldSet.has(f.field)) throw new Error(`Unknown field: ${f.field}`)
    const col = f.field // safe: validated against the schema allow-list
    const p = `p${i++}`
    switch (f.op) {
      case 'equals':      conditions.push(`${col} = @${p}`); params[p] = f.value ?? ''; break
      case 'not_equals':  conditions.push(`${col} != @${p}`); params[p] = f.value ?? ''; break
      case 'contains':    conditions.push(`LOWER(${col}) LIKE @${p}`); params[p] = `%${(f.value ?? '').toLowerCase()}%`; break
      case 'starts_with': conditions.push(`LOWER(${col}) LIKE @${p}`); params[p] = `${(f.value ?? '').toLowerCase()}%`; break
      case 'gt': { const n = Number(f.value); if (Number.isNaN(n)) continue; conditions.push(`SAFE_CAST(${col} AS FLOAT64) > @${p}`); params[p] = n; break }
      case 'lt': { const n = Number(f.value); if (Number.isNaN(n)) continue; conditions.push(`SAFE_CAST(${col} AS FLOAT64) < @${p}`); params[p] = n; break }
      case 'not_empty':   conditions.push(`(${col} IS NOT NULL AND ${col} != '')`); break
      case 'empty':       conditions.push(`(${col} IS NULL OR ${col} = '')`); break
      default: throw new Error(`Unknown operator: ${f.op}`)
    }
  }

  if (opts.search) {
    const ors = SEARCH_COLUMNS.map(c => `LOWER(${c}) LIKE @search`).join(' OR ')
    conditions.push(`(${ors})`)
    params.search = `%${opts.search.toLowerCase()}%`
  }

  // Time-frame range (inclusive of both endpoints' full day), on added_time.
  // Frontend sends 'YYYY-MM-DD'; the stored value is parsed with the flexible
  // parser. The range is applied ONLY if the column actually has parseable dates,
  // so an all-empty date column never silently zeroes out the results.
  if (opts.dateFrom || opts.dateTo) {
    if (await dateColumnHasData()) {
      const dexpr = flexibleTimestampExpr(DATE_RANGE_FIELD)
      if (opts.dateFrom) {
        conditions.push(`${dexpr} >= TIMESTAMP(@dateFrom)`)
        params.dateFrom = opts.dateFrom
      }
      if (opts.dateTo) {
        conditions.push(`${dexpr} < TIMESTAMP(DATE_ADD(DATE(@dateTo), INTERVAL 1 DAY))`)
        params.dateTo = opts.dateTo
      }
    }
  }

  return { where: conditions.join(' AND '), params }
}

export async function filterObservations(opts: {
  search?: string
  filters?: ObservationFilter[]
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}): Promise<{ rows: ObservationRow[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 1000)
  const offset = opts.offset ?? 0
  const { where, params } = await buildObservationWhere(opts)

  const [rows] = await bq.query({
    query: `
      SELECT * FROM \`${OBSERVATIONS_FQN}\`
      WHERE ${where}
      ORDER BY map_record_id
      LIMIT @limit OFFSET @offset
    `,
    params: { ...params, limit, offset },
  })
  const [countRows] = await bq.query({
    query: `SELECT COUNT(*) AS total FROM \`${OBSERVATIONS_FQN}\` WHERE ${where}`,
    params,
  })

  return {
    rows: rows as ObservationRow[],
    total: Number((countRows[0] as { total: number | string }).total),
  }
}

// ─── Insights (aggregate stats for the Data page "View Data Insight") ─────────

export interface CategoryCount { label: string; count: number }
export interface HistogramBin { label: string; count: number }

export interface ObservationInsights {
  total: number
  distinctSpecies: number
  distinctPlots: number
  avgGbhCm: number | null
  avgHeightM: number | null
  byObservationType: CategoryCount[]
  topSpecies: CategoryCount[]
  bySizeClass: CategoryCount[]
  byLiveDead: CategoryCount[]
  heightHistogram: HistogramBin[]
  topPlots: CategoryCount[]
  gbhHistogram: HistogramBin[]
}

/**
 * Aggregate statistics over the *same* filtered set the row browser shows.
 * Reuses buildObservationWhere so the numbers always match the visible query.
 */
export async function getObservationInsights(opts: {
  search?: string
  filters?: ObservationFilter[]
  dateFrom?: string
  dateTo?: string
  lang?: string
}): Promise<ObservationInsights> {
  const { where, params } = await buildObservationWhere(opts)
  const FROM = `\`${OBSERVATIONS_FQN}\` WHERE ${where}`

  // Reusable coalesced species label. If lang is 'th', prefer thai_name.
  const SPECIES_LABEL = opts.lang === 'th' ? `COALESCE(
    NULLIF(thai_name, ''),
    NULLIF(normalized_species_name, ''),
    NULLIF(scientific_name, ''),
    NULLIF(species_raw, ''),
    '(unspecified)'
  )` : `COALESCE(
    NULLIF(normalized_species_name, ''),
    NULLIF(scientific_name, ''),
    NULLIF(thai_name, ''),
    NULLIF(species_raw, ''),
    '(unspecified)'
  )`

  const catQuery = (expr: string, whereExtra = '') => `
    SELECT ${expr} AS label, COUNT(*) AS count
    FROM ${FROM} ${whereExtra ? `AND ${whereExtra}` : ''}
    GROUP BY label
    ORDER BY count DESC
  `

  const run = async (query: string) => {
    const [rows] = await bq.query({ query, params })
    return rows as Record<string, unknown>[]
  }

  const toCats = (rows: Record<string, unknown>[]): CategoryCount[] =>
    rows.map(r => ({ label: String(r.label ?? '—') || '(blank)', count: Number(r.count) }))

  const [
    summaryRows,
    typeRows,
    speciesRows,
    sizeRows,
    liveDeadRows,
    heightRows,
    plotRows,
    gbhRows,
  ] = await Promise.all([
    run(`
      SELECT
        COUNT(*) AS total,
        COUNT(DISTINCT NULLIF(CAST(species_id AS STRING), '')) AS distinctSpecies,
        COUNT(DISTINCT NULLIF(CAST(plot_id AS STRING), '')) AS distinctPlots,
        AVG(SAFE_CAST(gbh_cm AS FLOAT64)) AS avgGbh,
        AVG(SAFE_CAST(total_height_m AS FLOAT64)) AS avgHeight
      FROM ${FROM}
    `),
    run(catQuery(`COALESCE(NULLIF(CAST(observation_type AS STRING), ''), '(blank)')`)),
    run(`
      SELECT ${SPECIES_LABEL} AS label, COUNT(*) AS count
      FROM ${FROM}
      GROUP BY label
      ORDER BY count DESC
      LIMIT 12
    `),
    // Tree-stem code breakdowns exclude blank codes so a chart only appears when
    // there's real distribution to show.
    run(catQuery(`CAST(size_class_code AS STRING)`, `observation_type = 'tree_stem' AND NULLIF(CAST(size_class_code AS STRING), '') IS NOT NULL`)),
    run(catQuery(`CAST(live_dead_code AS STRING)`, `observation_type = 'tree_stem' AND NULLIF(CAST(live_dead_code AS STRING), '') IS NOT NULL`)),
    run(`
      WITH h AS (
        SELECT SAFE_CAST(total_height_m AS FLOAT64) AS height
        FROM ${FROM} AND observation_type = 'tree_stem'
      )
      SELECT
        CASE
          WHEN height < 2  THEN '0–2'
          WHEN height < 5  THEN '2–5'
          WHEN height < 10 THEN '5–10'
          WHEN height < 15 THEN '10–15'
          WHEN height < 20 THEN '15–20'
          ELSE '20+'
        END AS label,
        COUNT(*) AS count
      FROM h
      WHERE height IS NOT NULL AND height > 0
      GROUP BY label
    `),
    run(`
      SELECT COALESCE(NULLIF(plot_no_raw, ''), NULLIF(plot_id, ''), '(blank)') AS label, COUNT(*) AS count
      FROM ${FROM}
      GROUP BY label
      ORDER BY count DESC
      LIMIT 12
    `),
    run(`
      WITH g AS (
        SELECT SAFE_CAST(gbh_cm AS FLOAT64) AS gbh
        FROM ${FROM} AND observation_type = 'tree_stem'
      )
      SELECT
        CASE
          WHEN gbh < 10  THEN '0–10'
          WHEN gbh < 20  THEN '10–20'
          WHEN gbh < 30  THEN '20–30'
          WHEN gbh < 50  THEN '30–50'
          WHEN gbh < 75  THEN '50–75'
          WHEN gbh < 100 THEN '75–100'
          ELSE '100+'
        END AS label,
        COUNT(*) AS count
      FROM g
      WHERE gbh IS NOT NULL
      GROUP BY label
    `),
  ])

  const s = (summaryRows[0] ?? {}) as Record<string, unknown>

  // Order GBH bins along the size axis rather than by count.
  const GBH_ORDER = ['0–10', '10–20', '20–30', '30–50', '50–75', '75–100', '100+']
  const gbhMap = new Map(toCats(gbhRows).map(c => [c.label, c.count]))
  const gbhHistogram = GBH_ORDER
    .map(label => ({ label, count: gbhMap.get(label) ?? 0 }))
    .filter(b => b.count > 0)

  // Order Height bins along the size axis.
  const HEIGHT_ORDER = ['0–2', '2–5', '5–10', '10–15', '15–20', '20+']
  const heightMap = new Map(toCats(heightRows).map(c => [c.label, c.count]))
  const heightHistogram = HEIGHT_ORDER
    .map(label => ({ label, count: heightMap.get(label) ?? 0 }))
    .filter(b => b.count > 0)

  return {
    total: Number(s.total ?? 0),
    distinctSpecies: Number(s.distinctSpecies ?? 0),
    distinctPlots: Number(s.distinctPlots ?? 0),
    avgGbhCm: s.avgGbh == null ? null : Number(s.avgGbh),
    avgHeightM: s.avgHeight == null ? null : Number(s.avgHeight),
    byObservationType: toCats(typeRows),
    topSpecies: toCats(speciesRows),
    bySizeClass: toCats(sizeRows),
    byLiveDead: toCats(liveDeadRows),
    heightHistogram,
    topPlots: toCats(plotRows),
    gbhHistogram,
  }
}

// ─── Biomass (query-scoped allometric estimation) ─────────────────────────────

/** One group's summed + averaged biomass for each of the three equations (kg) and wood volume (m³). */
export interface BiomassGroup {
  label: string
  trees: number
  komiAgbSum: number
  komiAgbAvg: number
  komiTotalSum: number
  komiTotalAvg: number
  chaveSum: number
  chaveAvg: number
  woodVolumeSum: number
  woodVolumeAvg: number
}

export interface BiomassResult {
  /** Tree-stem rows with a usable girth in the current query. */
  trees: number
  /** Wood-density/metric defaults / provenance echoed back for the formula panel. */
  defaultDensity: number
  densityVersion: string
  densityReviewed: boolean
  defaultFormFactor: number
  formFactorVersion: string
  formFactorReviewed: boolean
  /** Share (0–1) of stems whose species matched a density-table entry. */
  densityMatchedFrac: number
  /** Grand totals across ALL matched stems (kg or m³ for volume), for the summary tiles. */
  grandKomiAgb: number
  grandKomiTotal: number
  grandChave: number
  grandWoodVolume: number
  bySpecies: BiomassGroup[]
  byProject: BiomassGroup[]
  byPlot: BiomassGroup[]
}

/**
 * Query-scoped biomass over the SAME filtered set the row browser shows.
 *
 * All three equations are computed PER STEM in SQL (they are non-linear in DBH,
 * so summing must happen after the per-tree formula), then summed and averaged
 * per group. The client picks which equation to display and optionally scales
 * by the carbon fraction — no refetch needed on toggle.
 *
 *   D (DBH, cm) = gbh_cm / π                      (girth → diameter)
 *   ρ           = wood density from species table (default when unmatched)
 *   H           = total_height_m
 *   Komiyama AGB   = 0.251 · ρ · D^2.46
 *   Komiyama BGB   = 0.199 · ρ^0.899 · D^2.22   (total = AGB + BGB)
 *   Chave (2014)   = 0.0673 · (ρ · D² · H)^0.976  (needs H)
 */
export async function getObservationBiomass(opts: {
  search?: string
  filters?: ObservationFilter[]
  dateFrom?: string
  dateTo?: string
  lang?: string
}): Promise<BiomassResult> {
  const { where, params } = await buildObservationWhere(opts)

  const SPECIES_LABEL = opts.lang === 'th' ? `COALESCE(
    NULLIF(thai_name, ''),
    NULLIF(normalized_species_name, ''),
    NULLIF(scientific_name, ''),
    NULLIF(species_raw, ''),
    '(unspecified)'
  )` : `COALESCE(
    NULLIF(normalized_species_name, ''),
    NULLIF(scientific_name, ''),
    NULLIF(thai_name, ''),
    NULLIF(species_raw, ''),
    '(unspecified)'
  )`

  const query = `
    SELECT
      ${SPECIES_LABEL} AS species_label,
      COALESCE(NULLIF(project_no_raw, ''), '(blank)') AS project_label,
      COALESCE(NULLIF(plot_no_raw, ''), NULLIF(plot_id, ''), '(blank)') AS plot_label,
      LOWER(COALESCE(NULLIF(normalized_species_name, ''), NULLIF(scientific_name, ''))) AS species_key,
      SAFE_CAST(gbh_cm AS FLOAT64) AS gbh_cm,
      SAFE_CAST(total_height_m AS FLOAT64) AS h
    FROM \`${OBSERVATIONS_FQN}\`
    WHERE ${where} AND observation_type = 'tree_stem'
  `

  const [rows] = await bq.query({ query, params })

  const { keys, densities, formFactors } = metricLookupArrays()

  const densityMap = new Map<string, number>()
  const formFactorMap = new Map<string, number>()
  for (const s of WOOD_MATRIC.species) {
    densityMap.set(s.scientific_name.toLowerCase(), s.density)
    formFactorMap.set(s.scientific_name.toLowerCase(), s.form_factor)
  }

  interface Accumulator {
    label: string
    trees: number
    komiAgbSum: number
    komiTotalSum: number
    chaveSum: number
    woodVolumeSum: number
    hCount: number
  }

  const speciesMap = new Map<string, Accumulator>()
  const projectMap = new Map<string, Accumulator>()
  const plotMap = new Map<string, Accumulator>()

  let grandTrees = 0
  let matchedCount = 0
  let grandKomiAgb = 0
  let grandKomiTotal = 0
  let grandChave = 0
  let grandWoodVolume = 0
  let grandChaveCount = 0

  for (const row of rows as any[]) {
    const gbh = Number(row.gbh_cm)
    if (isNaN(gbh) || gbh <= 0) continue

    const dbh = gbh / Math.PI
    const h = row.h !== null && !isNaN(Number(row.h)) ? Number(row.h) : null
    const speciesKey = row.species_key || ''
    
    const densityVal = densityMap.get(speciesKey)
    const isMatched = densityVal !== undefined
    const rho = isMatched ? densityVal : WOOD_MATRIC.defaultDensity

    const formFactorVal = formFactorMap.get(speciesKey)
    const f = formFactorVal !== undefined ? formFactorVal : WOOD_MATRIC.defaultFormFactor

    const komiAgb = 0.251 * rho * Math.pow(dbh, 2.46)
    const komiTotal = komiAgb + 0.199 * Math.pow(rho, 0.899) * Math.pow(dbh, 2.22)
    const hasHeight = h !== null && h > 0
    const chave = hasHeight ? 0.0673 * Math.pow(rho * dbh * dbh * h, 0.976) : 0

    // Volume in m³ = f * g * h = f * (pi * (dbh_cm/100)^2 / 4) * h
    const dbhM = dbh / 100
    const g = (Math.PI * dbhM * dbhM) / 4
    const woodVolume = hasHeight ? f * g * h : 0

    grandTrees++
    if (isMatched) matchedCount++
    grandKomiAgb += komiAgb
    grandKomiTotal += komiTotal
    grandWoodVolume += woodVolume
    if (hasHeight) {
      grandChave += chave
      grandChaveCount++
    }

    const speciesLabel = row.species_label || '(unspecified)'
    const projectLabel = row.project_label || '(blank)'
    const plotLabel = row.plot_label || '(blank)'

    const addToMap = (map: Map<string, Accumulator>, key: string, label: string) => {
      let accum = map.get(key)
      if (!accum) {
        accum = { label, trees: 0, komiAgbSum: 0, komiTotalSum: 0, chaveSum: 0, woodVolumeSum: 0, hCount: 0 }
        map.set(key, accum)
      }
      accum.trees++
      accum.komiAgbSum += komiAgb
      accum.komiTotalSum += komiTotal
      accum.woodVolumeSum += woodVolume
      if (hasHeight) {
        accum.chaveSum += chave
        accum.hCount++
      }
    }

    addToMap(speciesMap, speciesLabel, speciesLabel)
    addToMap(projectMap, projectLabel, projectLabel)
    addToMap(plotMap, plotLabel, plotLabel)
  }

  const mapToBiomassGroup = (map: Map<string, Accumulator>): BiomassGroup[] => {
    return Array.from(map.values())
      .sort((a, b) => b.komiAgbSum - a.komiAgbSum)
      .slice(0, 12)
      .map(item => ({
        label: item.label,
        trees: item.trees,
        komiAgbSum: item.komiAgbSum,
        komiAgbAvg: item.trees > 0 ? item.komiAgbSum / item.trees : 0,
        komiTotalSum: item.komiTotalSum,
        komiTotalAvg: item.trees > 0 ? item.komiTotalSum / item.trees : 0,
        chaveSum: item.chaveSum,
        chaveAvg: item.hCount > 0 ? item.chaveSum / item.hCount : 0,
        woodVolumeSum: item.woodVolumeSum,
        woodVolumeAvg: item.trees > 0 ? item.woodVolumeSum / item.trees : 0,
      }))
  }

  return {
    trees: grandTrees,
    defaultDensity: WOOD_MATRIC.defaultDensity,
    densityVersion: WOOD_MATRIC.version,
    densityReviewed: WOOD_MATRIC.reviewed,
    defaultFormFactor: WOOD_MATRIC.defaultFormFactor,
    formFactorVersion: WOOD_MATRIC.version,
    formFactorReviewed: WOOD_MATRIC.reviewed,
    densityMatchedFrac: grandTrees > 0 ? matchedCount / grandTrees : 0,
    grandKomiAgb,
    grandKomiTotal,
    grandChave,
    grandWoodVolume,
    bySpecies: mapToBiomassGroup(speciesMap),
    byProject: mapToBiomassGroup(projectMap),
    byPlot: mapToBiomassGroup(plotMap),
  }
}

export async function getDashboardGbhDist(): Promise<{ label: string; count: number }[]> {
  const query = `
    WITH g AS (
      SELECT SAFE_CAST(gbh_cm AS FLOAT64) AS gbh
      FROM \`${OBSERVATIONS_FQN}\`
      WHERE observation_type = 'tree_stem'
    )
    SELECT
      CASE
        WHEN gbh < 10  THEN '0–10'
        WHEN gbh < 20  THEN '10–20'
        WHEN gbh < 30  THEN '20–30'
        WHEN gbh < 50  THEN '30–50'
        WHEN gbh < 75  THEN '50–75'
        WHEN gbh < 100 THEN '75–100'
        ELSE '100+'
      END AS label,
      COUNT(*) AS count
    FROM g
    WHERE gbh IS NOT NULL
    GROUP BY label
  `
  const [rows] = await bq.query({ query })
  const GBH_ORDER = ['0–10', '10–20', '20–30', '30–50', '50–75', '75–100', '100+']
  const map = new Map((rows as { label: string; count: string | number }[]).map(r => [r.label, Number(r.count)]))
  return GBH_ORDER.map(label => ({ label, count: map.get(label) ?? 0 })).filter(b => b.count > 0)
}

export async function getDashboardHeightDist(): Promise<{ label: string; count: number }[]> {
  const query = `
    WITH h AS (
      SELECT SAFE_CAST(total_height_m AS FLOAT64) AS height
      FROM \`${OBSERVATIONS_FQN}\`
      WHERE observation_type = 'tree_stem'
    )
    SELECT
      CASE
        WHEN height < 2  THEN '0–2'
        WHEN height < 5  THEN '2–5'
        WHEN height < 10 THEN '5–10'
        WHEN height < 15 THEN '10–15'
        WHEN height < 20 THEN '15–20'
        ELSE '20+'
      END AS label,
      COUNT(*) AS count
    FROM h
    WHERE height IS NOT NULL AND height > 0
    GROUP BY label
  `
  const [rows] = await bq.query({ query })
  const HEIGHT_ORDER = ['0–2', '2–5', '5–10', '10–15', '15–20', '20+']
  const map = new Map((rows as { label: string; count: string | number }[]).map(r => [r.label, Number(r.count)]))
  return HEIGHT_ORDER.map(label => ({ label, count: map.get(label) ?? 0 })).filter(b => b.count > 0)
}

// ─── SQL Query Interface (Analyst / Admin only) ───────────────────────────────

export async function runUserQuery(sql: string): Promise<QueryResult> {
  const trimmed = sql.trim().toUpperCase()
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
    throw new Error('Only SELECT / WITH statements are permitted.')
  }

  const start = Date.now()
  const [rows] = await bq.query({ query: sql, maximumBytesBilled: '1073741824' })
  const executionMs = Date.now() - start

  const columns = rows.length > 0 ? Object.keys(rows[0] as object) : []

  return {
    columns,
    rows: rows as Record<string, unknown>[],
    rowCount: rows.length,
    executionMs,
  }
}
