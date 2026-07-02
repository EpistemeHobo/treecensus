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
