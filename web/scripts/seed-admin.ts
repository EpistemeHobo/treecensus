/**
 * Bootstrap one admin user.
 *
 * Local mode (no GCP_PROJECT_ID set): writes to .data/users.json — no cloud
 * required. Great for local development.
 *
 * BigQuery mode (GCP_PROJECT_ID set): creates users + audit_log tables if
 * missing, then inserts the admin. Safe to re-run.
 *
 * Usage:
 *   npm run seed:admin -- \
 *     --email admin@treecensus.local \
 *     --name  "Admin User" \
 *     --password 'some-strong-password'
 */

import { BigQuery } from '@google-cloud/bigquery'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getGcpCredentials } from '../src/lib/gcp-credentials'

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

interface UserRow {
  id: string
  email: string
  name: string
  role: string
  status: 'active' | 'disabled'
  passwordHash: string
  createdAt: string
  updatedAt: string
  lastLogin?: string
}

async function seedLocal(email: string, name: string, password: string) {
  const dir = join(process.cwd(), '.data')
  const path = join(dir, 'users.json')
  await fs.mkdir(dir, { recursive: true })

  let rows: UserRow[] = []
  try {
    rows = JSON.parse(await fs.readFile(path, 'utf8')) as UserRow[]
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  if (rows.some(r => r.email.toLowerCase() === email.toLowerCase())) {
    console.log(`User ${email} already exists — nothing to do.`)
    console.log(`Local store: ${path}`)
    return
  }

  const now = new Date().toISOString()
  rows.push({
    id: randomUUID(),
    email: email.toLowerCase(),
    name,
    role: 'admin',
    status: 'active',
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: now,
    updatedAt: now,
  })

  const tmp = `${path}.tmp`
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2))
  await fs.rename(tmp, path)
  console.log(`Created admin: ${email}`)
  console.log(`Local store: ${path}`)
}

async function seedBigQuery(
  projectId: string,
  dataset: string,
  email: string,
  name: string,
  password: string,
) {
  const bq = new BigQuery({ projectId, ...getGcpCredentials() })

  const schemaPath = join(__dirname, '..', 'db', 'schema.sql')
  const raw = readFileSync(schemaPath, 'utf8')
  const ddl = raw
    .replace(/\$\{GCP_PROJECT_ID\}/g, projectId)
    .replace(/\$\{BIGQUERY_DATASET\}/g, dataset)

  console.log('Applying schema…')
  for (const stmt of ddl.split(/;\s*$/m).map(s => s.trim()).filter(Boolean)) {
    await bq.query({ query: stmt })
  }

  const fqn = `\`${projectId}.${dataset}.users\``
  const [rows] = await bq.query({
    query: `SELECT id FROM ${fqn} WHERE LOWER(email) = LOWER(@email) LIMIT 1`,
    params: { email },
  })
  if (rows.length > 0) {
    console.log(`User ${email} already exists — nothing to do.`)
    return
  }

  const now = new Date().toISOString()
  await bq.dataset(dataset).table('users').insert([{
    id: randomUUID(),
    email: email.toLowerCase(),
    name,
    role: 'admin',
    status: 'active',
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: now,
    updatedAt: now,
  }])
  console.log(`Created admin: ${email}`)
}

async function main() {
  const email = arg('email')
  const name = arg('name') ?? 'Admin User'
  const password = arg('password')

  if (!email || !password) {
    console.error('Missing --email or --password')
    process.exit(1)
  }

  const projectIdRaw = process.env.GCP_PROJECT_ID
  const projectId = projectIdRaw && !projectIdRaw.startsWith('REPLACE_WITH_') ? projectIdRaw : ''
  const dataset = process.env.BIGQUERY_DATASET ?? 'tree_census'

  if (!projectId) {
    console.log('GCP_PROJECT_ID not set → using local file store (.data/users.json).')
    await seedLocal(email, name, password)
    return
  }

  await seedBigQuery(projectId, dataset, email, name, password)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
