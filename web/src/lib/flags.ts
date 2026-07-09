import { BigQuery } from '@google-cloud/bigquery'
import { randomUUID } from 'crypto'
import { getGcpCredentials } from './gcp-credentials'
import { isLocalMode, readCollection, writeCollection } from './local-store'
import { OBSERVATIONS_TABLE } from './bigquery'
import { sendMessage } from './messages'

const DATASET = process.env.BIGQUERY_DATASET ?? 'tree_census'
const TABLE = 'data_flags'
const FQN = () => `\`${process.env.GCP_PROJECT_ID}.${DATASET}.${TABLE}\``

function bq() {
  return new BigQuery({
    projectId: process.env.GCP_PROJECT_ID,
    ...getGcpCredentials(),
  })
}

export interface DataFlag {
  id: string
  mapRecordId: string
  field: string
  oldValue: string | null
  newValue: string | null
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  flaggedBy: string
  flaggedAt: string
  reviewedBy?: string | null
  reviewedAt?: string | null
  reviewNotes?: string | null
}

export async function createFlag(input: {
  mapRecordId: string
  field: string
  oldValue: string | null
  newValue: string | null
  reason: string | null
  flaggedBy: string
}): Promise<DataFlag> {
  const flag: DataFlag = {
    id: randomUUID(),
    mapRecordId: input.mapRecordId,
    field: input.field,
    oldValue: input.oldValue,
    newValue: input.newValue,
    reason: input.reason,
    status: 'pending',
    flaggedBy: input.flaggedBy,
    flaggedAt: new Date().toISOString(),
  }

  if (isLocalMode()) {
    const rows = await readCollection<DataFlag>('flags')
    rows.push(flag)
    await writeCollection('flags', rows)
  } else {
    const query = `
      INSERT INTO ${FQN()} (id, mapRecordId, field, oldValue, newValue, reason, status, flaggedBy, flaggedAt)
      VALUES (@id, @mapRecordId, @field, @oldValue, @newValue, @reason, @status, @flaggedBy, TIMESTAMP(@flaggedAt))
    `
    await bq().query({
      query,
      params: {
        id: flag.id,
        mapRecordId: flag.mapRecordId,
        field: flag.field,
        oldValue: flag.oldValue,
        newValue: flag.newValue,
        reason: flag.reason,
        status: flag.status,
        flaggedBy: flag.flaggedBy,
        flaggedAt: flag.flaggedAt,
      },
    })
  }

  return flag
}

export async function listFlags(opts?: { status?: string }): Promise<DataFlag[]> {
  if (isLocalMode()) {
    const rows = await readCollection<DataFlag>('flags')
    let filtered = rows.slice()
    if (opts?.status) {
      filtered = filtered.filter(f => f.status === opts.status)
    }
    return filtered.sort((a, b) => b.flaggedAt.localeCompare(a.flaggedAt))
  }

  let query = `SELECT id, mapRecordId, field, oldValue, newValue, reason, status, flaggedBy, flaggedAt, reviewedBy, reviewedAt, reviewNotes FROM ${FQN()}`
  const params: Record<string, string> = {}
  if (opts?.status) {
    query += ' WHERE status = @status'
    params.status = opts.status
  }
  query += ' ORDER BY flaggedAt DESC'

  const [rows] = await bq().query({ query, params })
  return rows as DataFlag[]
}

export async function getFlagById(id: string): Promise<DataFlag | null> {
  if (isLocalMode()) {
    const rows = await readCollection<DataFlag>('flags')
    return rows.find(r => r.id === id) ?? null
  }

  const query = `SELECT id, mapRecordId, field, oldValue, newValue, reason, status, flaggedBy, flaggedAt, reviewedBy, reviewedAt, reviewNotes FROM ${FQN()} WHERE id = @id LIMIT 1`
  const [rows] = await bq().query({ query, params: { id } })
  return rows.length > 0 ? (rows[0] as DataFlag) : null
}

export async function reviewFlag(
  id: string,
  reviewerEmail: string,
  status: 'approved' | 'rejected',
  reviewNotes?: string
): Promise<DataFlag | null> {
  const flag = await getFlagById(id)
  if (!flag) return null

  const now = new Date().toISOString()
  const patch: Partial<DataFlag> = {
    status,
    reviewedBy: reviewerEmail,
    reviewedAt: now,
    reviewNotes: reviewNotes ?? null,
  }

  // 1. Update flag status
  if (isLocalMode()) {
    const rows = await readCollection<DataFlag>('flags')
    const idx = rows.findIndex(r => r.id === id)
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...patch }
      await writeCollection('flags', rows)
    }
  } else {
    const query = `UPDATE ${FQN()} SET status = @status, reviewedBy = @reviewedBy, reviewedAt = @reviewedAt, reviewNotes = @reviewNotes WHERE id = @id`
    await bq().query({
      query,
      params: {
        status,
        reviewedBy: reviewerEmail,
        reviewedAt: now,
        reviewNotes: reviewNotes ?? null,
        id,
      },
    })
  }

  // 2. If approved, update observations table in BigQuery!
  if (status === 'approved') {
    const field = flag.field.replace(/[^a-zA-Z0-9_]/g, '')
    const query = `UPDATE \`${process.env.GCP_PROJECT_ID}.${DATASET}.${OBSERVATIONS_TABLE}\` SET \`${field}\` = @newValue WHERE map_record_id = @mapRecordId`
    await bq().query({
      query,
      params: {
        newValue: flag.newValue,
        mapRecordId: flag.mapRecordId,
      },
    })
  }
 
  // 3. Send notification message to the user who flagged the data
  try {
    const title = status === 'approved' 
      ? `Data Correction Approved: Record #${flag.mapRecordId}`
      : `Data Correction Rejected: Record #${flag.mapRecordId}`
    
    const content = `Your request to correct the field "${flag.field}" from "${flag.oldValue ?? ''}" to "${flag.newValue ?? ''}" has been ${status}.\n\nReason for flag: ${flag.reason ?? 'No reason provided'}`

    await sendMessage({
      userEmail: flag.flaggedBy,
      title,
      content,
      adminComment: reviewNotes ?? null,
      status,
    })
  } catch (err) {
    console.error('[flags] Failed to send notification message:', err)
  }

  return { ...flag, ...patch }
}
