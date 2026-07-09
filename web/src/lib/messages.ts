import { BigQuery } from '@google-cloud/bigquery'
import { randomUUID } from 'crypto'
import { getGcpCredentials } from './gcp-credentials'
import { isLocalMode, readCollection, writeCollection } from './local-store'

const DATASET = process.env.BIGQUERY_DATASET ?? 'tree_census'
const TABLE = 'data_messages'
const FQN = () => `\`${process.env.GCP_PROJECT_ID}.${DATASET}.${TABLE}\``

function bq() {
  return new BigQuery({
    projectId: process.env.GCP_PROJECT_ID,
    ...getGcpCredentials(),
  })
}

export interface Message {
  id: string
  userEmail: string
  title: string
  content: string
  adminComment: string | null
  status: 'approved' | 'rejected'
  createdAt: string
  read: boolean
}

let tableEnsured = false

async function ensureMessagesTable() {
  if (isLocalMode() || tableEnsured) return
  const query = `
    CREATE TABLE IF NOT EXISTS ${FQN()} (
      id STRING,
      userEmail STRING,
      title STRING,
      content STRING,
      adminComment STRING,
      status STRING,
      createdAt TIMESTAMP,
      read BOOL
    )
  `
  try {
    await bq().query({ query })
    tableEnsured = true
  } catch (err) {
    console.error('[messages] Failed to ensure BigQuery messages table:', err)
  }
}

export async function sendMessage(input: {
  userEmail: string
  title: string
  content: string
  adminComment: string | null
  status: 'approved' | 'rejected'
}): Promise<Message> {
  const msg: Message = {
    id: randomUUID(),
    userEmail: input.userEmail,
    title: input.title,
    content: input.content,
    adminComment: input.adminComment,
    status: input.status,
    createdAt: new Date().toISOString(),
    read: false,
  }

  if (isLocalMode()) {
    const rows = await readCollection<Message>('messages')
    rows.push(msg)
    await writeCollection('messages', rows)
  } else {
    await ensureMessagesTable()
    const query = `
      INSERT INTO ${FQN()} (id, userEmail, title, content, adminComment, status, createdAt, read)
      VALUES (@id, @userEmail, @title, @content, @adminComment, @status, TIMESTAMP(@createdAt), @read)
    `
    await bq().query({
      query,
      params: {
        id: msg.id,
        userEmail: msg.userEmail,
        title: msg.title,
        content: msg.content,
        adminComment: msg.adminComment,
        status: msg.status,
        createdAt: msg.createdAt,
        read: msg.read,
      },
    })
  }

  return msg
}

export async function listMessages(userEmail: string): Promise<Message[]> {
  if (isLocalMode()) {
    const rows = await readCollection<Message>('messages')
    return rows
      .filter(r => r.userEmail.toLowerCase() === userEmail.toLowerCase())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  await ensureMessagesTable()
  const query = `
    SELECT id, userEmail, title, content, adminComment, status, FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%E3SZ', createdAt) AS createdAt, read
    FROM ${FQN()}
    WHERE LOWER(userEmail) = @userEmail
    ORDER BY createdAt DESC
  `
  try {
    const [rows] = await bq().query({
      query,
      params: { userEmail: userEmail.toLowerCase() },
    })
    return rows.map((r: any) => ({
      id: String(r.id),
      userEmail: String(r.userEmail),
      title: String(r.title),
      content: String(r.content),
      adminComment: r.adminComment ? String(r.adminComment) : null,
      status: r.status as 'approved' | 'rejected',
      createdAt: String(r.createdAt),
      read: Boolean(r.read),
    }))
  } catch (err) {
    console.error('[messages] Failed to list messages:', err)
    return []
  }
}

export async function markAsRead(id: string, userEmail: string): Promise<boolean> {
  if (isLocalMode()) {
    const rows = await readCollection<Message>('messages')
    const idx = rows.findIndex(r => r.id === id && r.userEmail.toLowerCase() === userEmail.toLowerCase())
    if (idx >= 0) {
      rows[idx].read = true
      await writeCollection('messages', rows)
      return true
    }
    return false
  }

  await ensureMessagesTable()
  const query = `
    UPDATE ${FQN()}
    SET read = true
    WHERE id = @id AND LOWER(userEmail) = @userEmail
  `
  try {
    await bq().query({
      query,
      params: { id, userEmail: userEmail.toLowerCase() },
    })
    return true
  } catch (err) {
    console.error('[messages] Failed to mark message as read:', err)
    return false
  }
}
