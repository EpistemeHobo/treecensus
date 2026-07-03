import { BigQuery } from '@google-cloud/bigquery'
import type { TreeRecord, Submission, DashboardStats, QueryResult, Species, Site } from '@/types'

import { getGcpCredentials } from './gcp-credentials'

const bq = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
  ...getGcpCredentials(),
})

const DATASET = process.env.BIGQUERY_DATASET ?? 'tree_census'
const RAW_TABLE = () => `\`${process.env.GCP_PROJECT_ID}.${DATASET}.raw_form_rows\``

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

export async function getTrees(opts?: {
  siteId?: string
  species?: string
  limit?: number
  offset?: number
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

export async function getSubmissions(opts?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<{ rows: Submission[]; total: number }> {
  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0

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
}

// ─── SQL Query Interface (Analyst / Admin only) ───────────────────────────────

export async function runUserQuery(sql: string): Promise<QueryResult> {
  const trimmed = sql.trim().toUpperCase()
  if (!trimmed.startsWith('SELECT')) {
    throw new Error('Only SELECT statements are permitted.')
  }

  const start = Date.now()
  const [rows] = await bq.query({ query: sql, maximumBytesBilled: '1073741824' })
  const executionMs = Date.now() - start

  const columns = rows.length > 0 ? Object.keys(rows[0]) : []

  return {
    columns,
    rows: rows as Record<string, unknown>[],
    rowCount: rows.length,
    executionMs,
  }
}
