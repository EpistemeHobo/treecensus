import { BigQuery } from '@google-cloud/bigquery'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import type { User, UserRole } from '@/types'
import { getGcpCredentials } from './gcp-credentials'
import { isLocalMode, readCollection, writeCollection } from './local-store'

const DATASET = process.env.BIGQUERY_DATASET ?? 'tree_census'
const TABLE = 'users'
const FQN = () => `\`${process.env.GCP_PROJECT_ID}.${DATASET}.${TABLE}\``
const BCRYPT_ROUNDS = 10

function bq() {
  return new BigQuery({
    projectId: process.env.GCP_PROJECT_ID,
    ...getGcpCredentials(),
  })
}

export interface UserRecord extends User {
  status: 'active' | 'disabled'
  updatedAt: string
}

interface UserRow extends UserRecord {
  passwordHash: string
}

function stripHash(row: UserRow): UserRecord {
  const { passwordHash: _drop, ...u } = row
  void _drop
  return u
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function listUsers(): Promise<UserRecord[]> {
  if (isLocalMode()) {
    const rows = await readCollection<UserRow>('users')
    return rows
      .map(stripHash)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }
  const [rows] = await bq().query({
    query: `SELECT id, email, name, role, status, createdAt, updatedAt, lastLogin
            FROM ${FQN()} ORDER BY createdAt DESC`,
  })
  return rows as UserRecord[]
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  if (isLocalMode()) {
    const rows = await readCollection<UserRow>('users')
    const row = rows.find(r => r.id === id)
    return row ? stripHash(row) : null
  }
  const [rows] = await bq().query({
    query: `SELECT id, email, name, role, status, createdAt, updatedAt, lastLogin
            FROM ${FQN()} WHERE id = @id LIMIT 1`,
    params: { id },
  })
  return rows.length > 0 ? (rows[0] as UserRecord) : null
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  if (isLocalMode()) {
    const rows = await readCollection<UserRow>('users')
    return rows.find(r => r.email.toLowerCase() === email.toLowerCase()) ?? null
  }
  const [rows] = await bq().query({
    query: `SELECT * FROM ${FQN()} WHERE LOWER(email) = LOWER(@email) LIMIT 1`,
    params: { email },
  })
  return rows.length > 0 ? (rows[0] as UserRow) : null
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export async function createUser(input: {
  email: string
  name: string
  role: UserRole
  password: string
}): Promise<UserRecord> {
  const existing = await findUserByEmail(input.email)
  if (existing) throw new Error('A user with that email already exists.')
  if (!input.password || input.password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }

  const now = new Date().toISOString()
  const record: UserRow = {
    id: randomUUID(),
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    role: input.role,
    status: 'active',
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    createdAt: now,
    updatedAt: now,
  }

  if (isLocalMode()) {
    const rows = await readCollection<UserRow>('users')
    rows.push(record)
    await writeCollection('users', rows)
  } else {
    await bq().dataset(DATASET).table(TABLE).insert([record])
  }
  return stripHash(record)
}

async function localMutate(id: string, patch: Partial<UserRow>): Promise<UserRecord | null> {
  const rows = await readCollection<UserRow>('users')
  const idx = rows.findIndex(r => r.id === id)
  if (idx < 0) return null
  rows[idx] = { ...rows[idx], ...patch, updatedAt: new Date().toISOString() }
  await writeCollection('users', rows)
  return stripHash(rows[idx])
}

export async function updateUserRole(id: string, role: UserRole): Promise<UserRecord | null> {
  if (isLocalMode()) return localMutate(id, { role })
  const now = new Date().toISOString()
  await bq().query({
    query: `UPDATE ${FQN()} SET role = @role, updatedAt = @now WHERE id = @id`,
    params: { role, now, id },
  })
  return getUserById(id)
}

export async function updateUserStatus(
  id: string,
  status: 'active' | 'disabled',
): Promise<UserRecord | null> {
  if (isLocalMode()) return localMutate(id, { status })
  const now = new Date().toISOString()
  await bq().query({
    query: `UPDATE ${FQN()} SET status = @status, updatedAt = @now WHERE id = @id`,
    params: { status, now, id },
  })
  return getUserById(id)
}

export async function updateUserPassword(id: string, newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  if (isLocalMode()) {
    await localMutate(id, { passwordHash })
    return
  }
  const now = new Date().toISOString()
  await bq().query({
    query: `UPDATE ${FQN()} SET passwordHash = @passwordHash, updatedAt = @now WHERE id = @id`,
    params: { passwordHash, now, id },
  })
}

export async function verifyUserPassword(id: string, password: string): Promise<boolean> {
  if (isLocalMode()) {
    const rows = await readCollection<UserRow>('users')
    const row = rows.find(r => r.id === id)
    return row ? bcrypt.compare(password, row.passwordHash) : false
  }
  const [rows] = await bq().query({
    query: `SELECT passwordHash FROM ${FQN()} WHERE id = @id LIMIT 1`,
    params: { id },
  })
  if (rows.length === 0) return false
  return bcrypt.compare(password, (rows[0] as { passwordHash: string }).passwordHash)
}

export async function touchLastLogin(id: string): Promise<void> {
  const now = new Date().toISOString()
  if (isLocalMode()) {
    await localMutate(id, { lastLogin: now })
    return
  }
  await bq().query({
    query: `UPDATE ${FQN()} SET lastLogin = @now WHERE id = @id`,
    params: { now, id },
  })
}

export async function deleteUser(id: string): Promise<void> {
  if (isLocalMode()) {
    const rows = await readCollection<UserRow>('users')
    await writeCollection('users', rows.filter(r => r.id !== id))
    return
  }
  await bq().query({
    query: `DELETE FROM ${FQN()} WHERE id = @id`,
    params: { id },
  })
}
