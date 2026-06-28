import { BigQuery } from '@google-cloud/bigquery'
import type { TreeRecord, Submission, DashboardStats, QueryResult, Species, Site } from '@/types'

// ─── Client ──────────────────────────────────────────────────────────────────
// Credentials come from GOOGLE_APPLICATION_CREDENTIALS env var (service account JSON path)
// or from Application Default Credentials when running on GCP.

import { getGcpCredentials } from './gcp-credentials'

const bq = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
  ...getGcpCredentials(),
})

const DATASET = process.env.BIGQUERY_DATASET ?? 'tree_census'

// ─── Trees ───────────────────────────────────────────────────────────────────

export async function getTrees(opts?: {
  siteId?: string
  species?: string
  limit?: number
  offset?: number
}): Promise<{ rows: TreeRecord[]; total: number }> {
  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0

  let whereClause = 'WHERE 1=1'
  if (opts?.siteId) whereClause += ` AND siteId = '${opts.siteId}'`
  if (opts?.species) whereClause += ` AND speciesCode = '${opts.species}'`

  // TODO: implement once BigQuery dataset is provisioned
  const query = `
    SELECT * FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.trees\`
    ${whereClause}
    ORDER BY collectedAt DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const [rows] = await bq.query({ query })

  const countQuery = `
    SELECT COUNT(*) as total FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.trees\`
    ${whereClause}
  `
  const [countRows] = await bq.query({ query: countQuery })

  return {
    rows: rows as TreeRecord[],
    total: (countRows[0] as { total: number }).total,
  }
}

export async function getTreeById(id: string): Promise<TreeRecord | null> {
  const query = `
    SELECT * FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.trees\`
    WHERE id = '${id}'
    LIMIT 1
  `
  const [rows] = await bq.query({ query })
  return rows.length > 0 ? (rows[0] as TreeRecord) : null
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export async function getSubmissions(opts?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<{ rows: Submission[]; total: number }> {
  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0

  let whereClause = 'WHERE 1=1'
  if (opts?.status) whereClause += ` AND status = '${opts.status}'`

  const query = `
    SELECT * FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.submissions\`
    ${whereClause}
    ORDER BY submittedAt DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  const [rows] = await bq.query({ query })

  const countQuery = `
    SELECT COUNT(*) as total FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.submissions\`
    ${whereClause}
  `
  const [countRows] = await bq.query({ query: countQuery })

  return {
    rows: rows as Submission[],
    total: (countRows[0] as { total: number }).total,
  }
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  // TODO: implement once BigQuery dataset is provisioned
  const query = `
    SELECT
      (SELECT COUNT(*) FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.trees\`) AS totalTrees,
      (SELECT COUNT(DISTINCT siteId) FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.trees\`) AS totalSites,
      (SELECT COUNT(DISTINCT speciesCode) FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.trees\`) AS totalSpecies,
      (SELECT COUNT(*) FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.submissions\`) AS totalSubmissions,
      (SELECT COUNT(*) FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.submissions\` WHERE status = 'pending') AS pendingSubmissions,
      (SELECT MAX(syncedAt) FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.submissions\`) AS lastSyncAt
  `
  const [rows] = await bq.query({ query })
  return rows[0] as DashboardStats
}

// ─── Reference Tables ─────────────────────────────────────────────────────────

export async function getSpecies(): Promise<Species[]> {
  const query = `SELECT * FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.species\` ORDER BY commonName`
  const [rows] = await bq.query({ query })
  return rows as Species[]
}

export async function getSites(): Promise<Site[]> {
  const query = `SELECT * FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.locations\` ORDER BY name`
  const [rows] = await bq.query({ query })
  return rows as Site[]
}

// ─── SQL Query Interface (Analyst / Admin only) ───────────────────────────────

export async function runUserQuery(sql: string): Promise<QueryResult> {
  // Safety: only allow SELECT statements
  const trimmed = sql.trim().toUpperCase()
  if (!trimmed.startsWith('SELECT')) {
    throw new Error('Only SELECT statements are permitted.')
  }

  const start = Date.now()
  const [rows] = await bq.query({ query: sql, maximumBytesBilled: '1073741824' }) // 1 GB cap
  const executionMs = Date.now() - start

  const columns = rows.length > 0 ? Object.keys(rows[0]) : []

  return {
    columns,
    rows: rows as Record<string, unknown>[],
    rowCount: rows.length,
    executionMs,
  }
}
