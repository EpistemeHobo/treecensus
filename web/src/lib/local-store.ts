/**
 * Tiny file-backed store for local development, activated when GCP_PROJECT_ID
 * is not set. Persists to <cwd>/.data/*.json — see .gitignore.
 *
 * Not suitable for production. Concurrent writes are not serialised.
 */
import { promises as fs } from 'fs'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), '.data')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

export async function readCollection<T>(name: string): Promise<T[]> {
  await ensureDir()
  const path = join(DATA_DIR, `${name}.json`)
  try {
    const raw = await fs.readFile(path, 'utf8')
    return JSON.parse(raw) as T[]
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

export async function writeCollection<T>(name: string, rows: T[]): Promise<void> {
  await ensureDir()
  const path = join(DATA_DIR, `${name}.json`)
  const tmp = `${path}.tmp`
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2))
  await fs.rename(tmp, path)
}

export function isLocalMode(): boolean {
  const id = process.env.GCP_PROJECT_ID
  // Treat unset, empty, or the placeholder value as "not configured".
  return !id || id.startsWith("REPLACE_WITH_")
}
