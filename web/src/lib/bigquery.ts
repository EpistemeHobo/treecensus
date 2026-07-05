import { BigQuery } from '@google-cloud/bigquery'
import type { DashboardStats, QueryResult } from '@/types'

// ─── Client ──────────────────────────────────────────────────────────────────
// Credentials come from GOOGLE_APPLICATION_CREDENTIALS env var (service account
// JSON path) or Application Default Credentials when running on GCP.

import { getGcpCredentials } from './gcp-credentials'

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

export async function filterObservations(opts: {
  search?: string
  filters?: ObservationFilter[]
  limit?: number
  offset?: number
}): Promise<{ rows: ObservationRow[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 1000)
  const offset = opts.offset ?? 0
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
