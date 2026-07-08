import { BigQuery } from '@google-cloud/bigquery'
import { randomUUID } from 'crypto'
import { getGcpCredentials } from './gcp-credentials'
import { isLocalMode, readCollection, writeCollection } from './local-store'

const DATASET = process.env.BIGQUERY_DATASET ?? 'tree_census'
const TABLE = 'audit_log'
const FQN = () => `\`${process.env.GCP_PROJECT_ID}.${DATASET}.${TABLE}\``

function bq() {
  return new BigQuery({
    projectId: process.env.GCP_PROJECT_ID,
    ...getGcpCredentials(),
  })
}

export interface AuditEvent {
  id: string
  actorId?: string | null
  actorEmail?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  meta?: string | null
  createdAt: string
}

export async function logAudit(input: {
  actorId?: string | null
  actorEmail?: string | null
  action: string
  targetType?: string
  targetId?: string
  meta?: Record<string, unknown>
}): Promise<void> {
  const row: AuditEvent = {
    id: randomUUID(),
    actorId: input.actorId ?? null,
    actorEmail: input.actorEmail ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    meta: input.meta ? JSON.stringify(input.meta) : null,
    createdAt: new Date().toISOString(),
  }
  try {
    if (isLocalMode()) {
      const rows = await readCollection<AuditEvent>('audit')
      rows.push(row)
      // Cap local file so it doesn't grow without bound in dev.
      const trimmed = rows.slice(-1000)
      await writeCollection('audit', trimmed)
    } else {
      await bq().dataset(DATASET).table(TABLE).insert([row])
    }
  } catch (err) {
    // Audit failures must never break the primary action.
    console.error('[audit] insert failed', err)
  }
}

export async function listAudit(opts?: { limit?: number }): Promise<AuditEvent[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500)
  if (isLocalMode()) {
    const rows = await readCollection<AuditEvent>('audit')
    return rows
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit)
  }
  const [rows] = await bq().query({
    query: `SELECT id, actorId, actorEmail, action, targetType, targetId, meta, createdAt
            FROM ${FQN()} ORDER BY createdAt DESC LIMIT ${limit}`,
  })
  return rows as AuditEvent[]
}

export interface ActivityLogStats {
  latestAccessEmail: string
  latestAccessTime: string
  totalLogins: number
  totalQueries: number
  exportedFiles: number
  exportedRecords: number
  approvedFlags: number
}

export async function getActivityLogStats(): Promise<ActivityLogStats> {
  if (isLocalMode()) {
    const rows = await readCollection<AuditEvent>('audit')
    const loginEvents = rows
      .filter(r => r.action === 'auth.login')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const latestAccessEmail = loginEvents[0]?.actorEmail ?? '—'
    const latestAccessTime = loginEvents[0]?.createdAt ?? '—'

    const totalLogins = loginEvents.length
    const totalQueries = rows.filter(r => r.action === 'data.query').length

    const exportEvents = rows.filter(r => r.action === 'data.export')
    const exportedFiles = exportEvents.length
    let exportedRecords = 0
    for (const ev of exportEvents) {
      try {
        const meta = ev.meta ? JSON.parse(ev.meta) : {}
        exportedRecords += Number(meta.recordsCount ?? 0)
      } catch {}
    }

    const flagRows = await readCollection<any>('flags')
    const approvedFlags = flagRows.filter((f: any) => f.status === 'approved').length

    return {
      latestAccessEmail,
      latestAccessTime,
      totalLogins,
      totalQueries,
      exportedFiles,
      exportedRecords,
      approvedFlags,
    }
  }

  const query = `
    WITH
      latest_login AS (
        SELECT actorEmail, createdAt
        FROM ${FQN()}
        WHERE action = 'auth.login'
        ORDER BY createdAt DESC
        LIMIT 1
      ),
      counts AS (
        SELECT
          COUNTIF(action = 'auth.login') AS totalLogins,
          COUNTIF(action = 'data.query') AS totalQueries,
          COUNTIF(action = 'data.export') AS exportedFiles,
          SUM(CASE WHEN action = 'data.export' THEN SAFE_CAST(JSON_VALUE(meta, '$.recordsCount') AS INT64) ELSE 0 END) AS exportedRecords
        FROM ${FQN()}
      )
    SELECT
      c.totalLogins,
      c.totalQueries,
      c.exportedFiles,
      COALESCE(c.exportedRecords, 0) AS exportedRecords,
      l.actorEmail AS latestEmail,
      l.createdAt AS latestTime
    FROM counts c
    LEFT JOIN latest_login l ON 1=1
  `

  const [rows] = await bq().query({ query })
  const r = (rows[0] ?? {}) as Record<string, unknown>
  
  let latestTimeStr = '—'
  if (r.latestTime) {
    if (typeof r.latestTime === 'object' && r.latestTime !== null && 'value' in (r.latestTime as any)) {
      latestTimeStr = String((r.latestTime as any).value)
    } else {
      latestTimeStr = String(r.latestTime)
    }
  }

  // Count approved flags in data_flags table
  const flagsQuery = `SELECT COUNT(*) AS approvedFlags FROM \`${process.env.GCP_PROJECT_ID}.${DATASET}.data_flags\` WHERE status = 'approved'`
  const [flagRows] = await bq().query({ query: flagsQuery })
  const approvedFlags = Number(flagRows[0]?.approvedFlags ?? 0)

  return {
    latestAccessEmail: (r.latestEmail as string) ?? '—',
    latestAccessTime: latestTimeStr,
    totalLogins: Number(r.totalLogins ?? 0),
    totalQueries: Number(r.totalQueries ?? 0),
    exportedFiles: Number(r.exportedFiles ?? 0),
    exportedRecords: Number(r.exportedRecords ?? 0),
    approvedFlags,
  }
}
