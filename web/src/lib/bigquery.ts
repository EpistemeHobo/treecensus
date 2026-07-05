import { BigQuery } from '@google-cloud/bigquery'
import type { DashboardStats, QueryResult } from '@/types'

<<<<<<< HEAD
=======
// ─── Client ──────────────────────────────────────────────────────────────────
// Credentials come from GOOGLE_APPLICATION_CREDENTIALS env var (service account
// JSON path) or Application Default Credentials when running on GCP.

>>>>>>> 145f6d1 (Connecting data)
import { getGcpCredentials } from './gcp-credentials'

const bq = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
  ...getGcpCredentials(),
})

const PROJECT = process.env.GCP_PROJECT_ID
const DATASET = process.env.BIGQUERY_DATASET ?? 'tree_census'
const RAW_TABLE = () => `\`${process.env.GCP_PROJECT_ID}.${DATASET}.raw_form_rows\``

<<<<<<< HEAD
// ─── Dashboard Stats ─────────────────────────────────────────────────────────
// Milestone 3 phase A: derive stats directly from raw_form_rows via JSON
// functions. Once the dim/fact/obs pipeline is built, swap these for reads
// against fact_submission + obs_tree + dim_species.

export async function getDashboardStats(): Promise<DashboardStats> {
  const sql = `
    WITH parsed AS (
      SELECT
        external_id,
        received_at,
        JSON_QUERY_ARRAY(payload, "$.diameters")          AS diameters,
        JSON_QUERY_ARRAY(payload, "$.seedlings")          AS seedlings,
        JSON_QUERY_ARRAY(payload, "$.large_woody_debris") AS large_woody_debris,
        COALESCE(
          JSON_VALUE(payload, "$.plot_no"),
          JSON_VALUE(payload, "$.plot_id"),
          JSON_VALUE(payload, "$.Plot_No"),
          JSON_VALUE(payload, "$.plotId")
        ) AS plot_no
      FROM ${RAW_TABLE()}
      WHERE source IN ('zoho_webhook', 'zoho_poll')
    ),
    all_species AS (
      SELECT JSON_VALUE(d, "$.species") AS species FROM parsed, UNNEST(parsed.diameters) AS d
      UNION ALL
      SELECT JSON_VALUE(s, "$.species") AS species FROM parsed, UNNEST(parsed.seedlings) AS s
    )
    SELECT
      (SELECT COUNT(*) FROM parsed)                                              AS totalSubmissions,
      (SELECT IFNULL(SUM(ARRAY_LENGTH(diameters)), 0) FROM parsed)                AS totalTrees,
      (SELECT COUNT(DISTINCT plot_no) FROM parsed WHERE plot_no IS NOT NULL)      AS totalSites,
      (SELECT COUNT(DISTINCT species) FROM all_species WHERE species IS NOT NULL AND species != '') AS totalSpecies,
      (SELECT FORMAT_TIMESTAMP('%Y-%m-%d %H:%M UTC', MAX(received_at)) FROM parsed) AS lastSyncAt,
      0                                                                          AS pendingSubmissions
  `
  const [rows] = await bq.query({ query: sql })
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

// ─── Recent Submissions (dashboard sidebar) ─────────────────────────────────

export async function getRecentSubmissions(limit = 10): Promise<Submission[]> {
  const sql = `
    SELECT
      external_id                                                    AS id,
      source                                                         AS formProvider,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', received_at)             AS submittedAt,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', received_at)             AS syncedAt,
      ARRAY_LENGTH(JSON_QUERY_ARRAY(payload, "$.diameters"))          AS treeCount
    FROM ${RAW_TABLE()}
    WHERE source IN ('zoho_webhook', 'zoho_poll')
    ORDER BY received_at DESC
    LIMIT @limit
  `
  const [rows] = await bq.query({
    query: sql,
    params: { limit },
  })
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    rawRef: '',
    formProvider: String(r.formProvider ?? ''),
    submittedAt: String(r.submittedAt ?? ''),
    syncedAt: String(r.syncedAt ?? ''),
    status: 'processed' as const,
    treeCount: Number(r.treeCount ?? 0),
  }))
}

// ─── Trees / Submissions / Species / Sites ──────────────────────────────────
// These target the future dim/fact/obs pipeline. They currently query
// raw_form_rows as a best-effort so pages don't 500. Once the pipeline is
// live (Milestone 3 phase B), point them at the proper tables.
=======
// The single flat source-of-truth table (see etl/sql/observations.sql).
export const OBSERVATIONS_TABLE = 'observations'
export const OBSERVATIONS_FQN = `${PROJECT}.${DATASET}.${OBSERVATIONS_TABLE}`
>>>>>>> 145f6d1 (Connecting data)

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
<<<<<<< HEAD
}): Promise<{ rows: TreeRecord[]; total: number }> {
  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0

  const sql = `
    WITH exploded AS (
      SELECT
        external_id AS submissionId,
        received_at,
        JSON_VALUE(d, "$.species") AS species,
        SAFE_CAST(JSON_VALUE(d, "$.gbh_cm") AS FLOAT64) AS gbh_cm,
        SAFE_CAST(JSON_VALUE(d, "$.total_height_m") AS FLOAT64) AS height,
        JSON_VALUE(d, "$.live_or_dead") AS live_or_dead,
        JSON_VALUE(d, "$.stem") AS stem
      FROM ${RAW_TABLE()},
      UNNEST(JSON_QUERY_ARRAY(payload, "$.diameters")) AS d
      WHERE source IN ('zoho_webhook', 'zoho_poll')
    )
    SELECT
      GENERATE_UUID() AS id,
      submissionId,
      '' AS plotId,
      '' AS siteId,
      species,
      species AS speciesCode,
      -- convert GBH (girth) → DBH (diameter) ≈ GBH / PI
      IFNULL(SAFE_DIVIDE(gbh_cm, ACOS(-1)), 0) AS dbh,
      height,
      CASE WHEN LOWER(live_or_dead) LIKE '%dead%' THEN 'dead' ELSE 'good' END AS condition,
      0.0 AS lat,
      0.0 AS lng,
      '' AS collectedBy,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', received_at) AS collectedAt,
      '' AS notes,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', received_at) AS processedAt
    FROM exploded
    ORDER BY collectedAt DESC
    LIMIT @limit OFFSET @offset
  `
  const [rows] = await bq.query({ query: sql, params: { limit, offset } })

  const countSql = `
    SELECT COUNT(*) AS total FROM ${RAW_TABLE()},
    UNNEST(JSON_QUERY_ARRAY(payload, "$.diameters")) AS d
    WHERE source IN ('zoho_webhook','zoho_poll')
  `
  const [countRows] = await bq.query({ query: countSql })
  const total = Number((countRows[0] as { total: number })?.total ?? 0)

  return { rows: rows as TreeRecord[], total }
}

export async function getTreeById(_id: string): Promise<TreeRecord | null> {
  // Not implemented: obs_tree has no stable id yet. Wait for pipeline (phase B).
  return null
}

=======
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
>>>>>>> 145f6d1 (Connecting data)
export async function getSubmissions(opts?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<{ rows: ObservationRow[]; total: number }> {
  const limit = Math.min(opts?.limit ?? 50, 10_000)
  const offset = opts?.offset ?? 0

<<<<<<< HEAD
  const sql = `
    SELECT
      external_id AS id,
      source AS formProvider,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', received_at) AS submittedAt,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', received_at) AS syncedAt,
      ARRAY_LENGTH(JSON_QUERY_ARRAY(payload, "$.diameters")) AS treeCount
    FROM ${RAW_TABLE()}
    WHERE source IN ('zoho_webhook', 'zoho_poll')
    ORDER BY received_at DESC
    LIMIT @limit OFFSET @offset
  `
  const [rows] = await bq.query({ query: sql, params: { limit, offset } })

  const countSql = `SELECT COUNT(*) AS total FROM ${RAW_TABLE()} WHERE source IN ('zoho_webhook','zoho_poll')`
  const [countRows] = await bq.query({ query: countSql })
  const total = Number((countRows[0] as { total: number })?.total ?? 0)

  const submissions: Submission[] = rows.map((r) => ({
    id: String(r.id ?? ''),
    rawRef: '',
    formProvider: String(r.formProvider ?? ''),
    submittedAt: String(r.submittedAt ?? ''),
    syncedAt: String(r.syncedAt ?? ''),
    status: 'processed',
    treeCount: Number(r.treeCount ?? 0),
  }))

  // Best-effort status filter (all rows are 'processed' for now).
  const filtered = opts?.status ? submissions.filter((s) => s.status === opts.status) : submissions
  return { rows: filtered, total }
}

// ─── Reference Tables ─────────────────────────────────────────────────────────

export async function getSpecies(): Promise<Species[]> {
  const sql = `
    WITH s AS (
      SELECT DISTINCT JSON_VALUE(d, "$.species") AS name
      FROM ${RAW_TABLE()}, UNNEST(JSON_QUERY_ARRAY(payload, "$.diameters")) AS d
      WHERE source IN ('zoho_webhook','zoho_poll')
      UNION DISTINCT
      SELECT DISTINCT JSON_VALUE(s, "$.species") AS name
      FROM ${RAW_TABLE()}, UNNEST(JSON_QUERY_ARRAY(payload, "$.seedlings")) AS s
      WHERE source IN ('zoho_webhook','zoho_poll')
    )
    SELECT name FROM s WHERE name IS NOT NULL AND name != '' ORDER BY name
  `
  const [rows] = await bq.query({ query: sql })
  return rows.map((r) => ({
    code: String((r as { name: string }).name),
    commonName: String((r as { name: string }).name),
    scientificName: '',
    family: '',
  }))
}

export async function getSites(): Promise<Site[]> {
  // Not implemented until PlotInfo field names are stable in the payload.
  return []
=======
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
>>>>>>> 145f6d1 (Connecting data)
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
