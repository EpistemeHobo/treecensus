import { BigQuery } from '@google-cloud/bigquery'
import type { DashboardStats, QueryResult } from '@/types'

// ─── Client ──────────────────────────────────────────────────────────────────
// Credentials come from GOOGLE_APPLICATION_CREDENTIALS env var (service account
// JSON path) or Application Default Credentials when running on GCP.

import { getGcpCredentials } from './gcp-credentials'
import { WOOD_DENSITY, densityLookupArrays } from './wood-density'

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
  const query = `
    SELECT
      COUNT(DISTINCT IF(observation_type = 'tree_stem', tree_id, NULL))        AS totalTrees,
      COUNT(DISTINCT plot_id)                                                  AS totalSites,
      COUNT(DISTINCT species_id)                                               AS totalSpecies,
      COUNT(DISTINCT submission_id)                                            AS totalSubmissions,
      COUNT(DISTINCT IF(source_status != 'clean', submission_id, NULL))        AS pendingSubmissions,
      MAX(NULLIF(added_time, ''))                                              AS lastSyncAt
    FROM \`${OBSERVATIONS_FQN}\`
  `
  const [rows] = await bq.query({ query })
  const r = (rows[0] ?? {}) as Record<string, unknown>
  return {
    totalTrees: Number(r.totalTrees ?? 0),
    totalSites: Number(r.totalSites ?? 0),
    totalSpecies: Number(r.totalSpecies ?? 0),
    totalSubmissions: Number(r.totalSubmissions ?? 0),
    pendingSubmissions: Number(r.pendingSubmissions ?? 0),
    lastSyncAt: (r.lastSyncAt as string) ?? '—',
  }
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
  byCrownCondition: CategoryCount[]
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
}): Promise<ObservationInsights> {
  const { where, params } = await buildObservationWhere(opts)
  const FROM = `\`${OBSERVATIONS_FQN}\` WHERE ${where}`

  // Reusable coalesced species label (normalized → scientific → thai → raw).
  const SPECIES_LABEL = `COALESCE(
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
    crownRows,
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
    run(catQuery(`CAST(crown_condition_code AS STRING)`, `observation_type = 'tree_stem' AND NULLIF(CAST(crown_condition_code AS STRING), '') IS NOT NULL`)),
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
    byCrownCondition: toCats(crownRows),
    topPlots: toCats(plotRows),
    gbhHistogram,
  }
}

// ─── Biomass (query-scoped allometric estimation) ─────────────────────────────

/** One group's summed + averaged biomass for each of the three equations (kg). */
export interface BiomassGroup {
  label: string
  trees: number
  komiAgbSum: number
  komiAgbAvg: number
  komiTotalSum: number
  komiTotalAvg: number
  chaveSum: number
  chaveAvg: number
}

export interface BiomassResult {
  /** Tree-stem rows with a usable girth in the current query. */
  trees: number
  /** Wood-density defaults / provenance echoed back for the formula panel. */
  defaultDensity: number
  densityVersion: string
  densityReviewed: boolean
  /** Share (0–1) of stems whose species matched a density-table entry. */
  densityMatchedFrac: number
  /** Grand totals across ALL matched stems (kg), for the summary tiles. */
  grandKomiAgb: number
  grandKomiTotal: number
  grandChave: number
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
}): Promise<BiomassResult> {
  const { where, params } = await buildObservationWhere(opts)
  const { keys, values } = densityLookupArrays()

  const allParams = {
    ...params,
    densKeys: keys,
    densValues: values,
    defaultDensity: WOOD_DENSITY.defaultDensity,
  }

  // Shared CTE chain: girth → DBH, species-keyed density join, per-stem biomass.
  const WITH_STEMS = `
    WITH density AS (
      SELECT k AS species, v AS density
      FROM UNNEST(@densKeys) AS k WITH OFFSET ko
      JOIN UNNEST(@densValues) AS v WITH OFFSET vo ON ko = vo
    ),
    stems AS (
      SELECT
        COALESCE(NULLIF(normalized_species_name, ''), NULLIF(scientific_name, ''), NULLIF(thai_name, ''), NULLIF(species_raw, ''), '(unspecified)') AS species_label,
        COALESCE(NULLIF(project_no_raw, ''), '(blank)') AS project_label,
        COALESCE(NULLIF(plot_no_raw, ''), NULLIF(plot_id, ''), '(blank)') AS plot_label,
        LOWER(COALESCE(NULLIF(normalized_species_name, ''), NULLIF(scientific_name, ''))) AS species_key,
        SAFE_CAST(gbh_cm AS FLOAT64) / ACOS(-1) AS dbh,
        SAFE_CAST(total_height_m AS FLOAT64) AS h
      FROM \`${OBSERVATIONS_FQN}\`
      WHERE ${where} AND observation_type = 'tree_stem'
    ),
    biomass AS (
      SELECT
        s.species_label, s.project_label, s.plot_label,
        (s.species_key IS NOT NULL AND d.density IS NOT NULL) AS density_matched,
        COALESCE(d.density, @defaultDensity) AS rho,
        s.dbh, s.h,
        0.251 * COALESCE(d.density, @defaultDensity) * POW(s.dbh, 2.46) AS komi_agb,
        0.251 * COALESCE(d.density, @defaultDensity) * POW(s.dbh, 2.46)
          + 0.199 * POW(COALESCE(d.density, @defaultDensity), 0.899) * POW(s.dbh, 2.22) AS komi_total,
        CASE WHEN s.h IS NOT NULL AND s.h > 0
          THEN 0.0673 * POW(COALESCE(d.density, @defaultDensity) * s.dbh * s.dbh * s.h, 0.976)
          ELSE NULL END AS chave
      FROM stems s
      LEFT JOIN density d ON d.species = s.species_key
      WHERE s.dbh IS NOT NULL AND s.dbh > 0
    )`

  const groupQuery = (labelCol: string) => `
    ${WITH_STEMS}
    SELECT
      ${labelCol} AS label,
      COUNT(*) AS trees,
      SUM(komi_agb) AS komiAgbSum, AVG(komi_agb) AS komiAgbAvg,
      SUM(komi_total) AS komiTotalSum, AVG(komi_total) AS komiTotalAvg,
      SUM(chave) AS chaveSum, AVG(chave) AS chaveAvg
    FROM biomass
    GROUP BY label
    ORDER BY komiAgbSum DESC
    LIMIT 12
  `

  const run = async (query: string) => {
    const [rows] = await bq.query({ query, params: allParams })
    return rows as Record<string, unknown>[]
  }

  const [speciesRows, projectRows, plotRows, summaryRows] = await Promise.all([
    run(groupQuery('species_label')),
    run(groupQuery('project_label')),
    run(groupQuery('plot_label')),
    run(`
      ${WITH_STEMS}
      SELECT
        COUNT(*) AS trees,
        AVG(CAST(density_matched AS INT64)) AS matchedFrac,
        SUM(komi_agb) AS grandKomiAgb,
        SUM(komi_total) AS grandKomiTotal,
        SUM(chave) AS grandChave
      FROM biomass
    `),
  ])

  const toGroups = (rows: Record<string, unknown>[]): BiomassGroup[] =>
    rows.map(r => ({
      label: String(r.label ?? '—') || '(blank)',
      trees: Number(r.trees ?? 0),
      komiAgbSum: Number(r.komiAgbSum ?? 0),
      komiAgbAvg: Number(r.komiAgbAvg ?? 0),
      komiTotalSum: Number(r.komiTotalSum ?? 0),
      komiTotalAvg: Number(r.komiTotalAvg ?? 0),
      chaveSum: Number(r.chaveSum ?? 0),
      chaveAvg: Number(r.chaveAvg ?? 0),
    }))

  const s = (summaryRows[0] ?? {}) as Record<string, unknown>

  return {
    trees: Number(s.trees ?? 0),
    defaultDensity: WOOD_DENSITY.defaultDensity,
    densityVersion: WOOD_DENSITY.version,
    densityReviewed: WOOD_DENSITY.reviewed,
    densityMatchedFrac: s.matchedFrac == null ? 0 : Number(s.matchedFrac),
    grandKomiAgb: Number(s.grandKomiAgb ?? 0),
    grandKomiTotal: Number(s.grandKomiTotal ?? 0),
    grandChave: Number(s.grandChave ?? 0),
    bySpecies: toGroups(speciesRows),
    byProject: toGroups(projectRows),
    byPlot: toGroups(plotRows),
  }
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
