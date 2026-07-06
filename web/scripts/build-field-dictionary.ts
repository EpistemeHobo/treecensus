/**
 * Build the field-value dictionary that powers filter-value autocomplete
 * on the Data page.
 *
 * Scans BigQuery `observations` once, extracting the top 30 most-frequent
 * non-empty values per column via a single UNION-ALL query, and writes the
 * result to `src/data/field-dictionary.json`.
 *
 * Usage:
 *   npm run build:dictionary
 */

import { BigQuery } from '@google-cloud/bigquery'
import { promises as fs } from 'fs'
import { join } from 'path'
import { config as loadEnv } from 'dotenv'
import { getGcpCredentials } from '../src/lib/gcp-credentials'

// Pull env from web/.env.local so this works standalone.
loadEnv({ path: join(__dirname, '..', '.env.local') })

const TOP_N = 30
const OUT_FILE = join(__dirname, '..', 'src', 'data', 'field-dictionary.json')

async function main() {
  const projectId = process.env.GCP_PROJECT_ID
  const dataset   = process.env.BIGQUERY_DATASET ?? 'tree_census'
  if (!projectId) {
    console.error('GCP_PROJECT_ID not set — cannot query BigQuery.')
    process.exit(1)
  }

  const bq = new BigQuery({ projectId, ...getGcpCredentials() })

  console.log(`Reading schema for ${projectId}.${dataset}.observations…`)
  const [colRows] = await bq.query({
    query: `
      SELECT column_name
      FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = 'observations'
      ORDER BY ordinal_position
    `,
  })
  const columns = (colRows as { column_name: string }[]).map(r => r.column_name)
  console.log(`  ${columns.length} columns found.`)

  // One UNION-ALL query so the observations table is scanned exactly once.
  // Each branch tags rows with the column name and its stringified value.
  const branches = columns
    .map(c => `SELECT '${c}' AS field, CAST(\`${c}\` AS STRING) AS value FROM \`${projectId}.${dataset}.observations\``)
    .join('\n      UNION ALL\n      ')

  const query = `
    WITH exploded AS (
      ${branches}
    )
    SELECT field, value, COUNT(*) AS c
    FROM exploded
    WHERE value IS NOT NULL AND value != ''
    GROUP BY field, value
  `

  console.log('Running dictionary query (single pass over observations)…')
  const t0 = Date.now()
  const [rows] = await bq.query({ query })
  console.log(`  returned ${rows.length} (field, value) pairs in ${Date.now() - t0} ms.`)

  // Bucket by field, sort by count desc, keep top N per field.
  const byField = new Map<string, { value: string; c: number }[]>()
  for (const r of rows as { field: string; value: string; c: number | string }[]) {
    const list = byField.get(r.field) ?? []
    list.push({ value: r.value, c: Number(r.c) })
    byField.set(r.field, list)
  }

  const dict: Record<string, string[]> = {}
  const skipped: string[] = []
  let totalValues = 0
  for (const col of columns) {
    const list = byField.get(col) ?? []
    if (list.length === 0) { skipped.push(col + ' (empty)'); continue }
    list.sort((a, b) => b.c - a.c)
    // Skip essentially-unique fields (ids, coords, timestamps): if the
    // most-common value has fewer than 3 occurrences, autocomplete would just
    // surface noise.
    if (list[0].c < 3) { skipped.push(col + ' (unique)'); continue }
    const top = list.slice(0, TOP_N).map(x => x.value)
    dict[col] = top
    totalValues += top.length
  }
  if (skipped.length > 0) {
    console.log(`  skipped ${skipped.length} fields: ${skipped.join(', ')}`)
  }

  await fs.mkdir(join(__dirname, '..', 'src', 'data'), { recursive: true })
  await fs.writeFile(
    OUT_FILE,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: `${projectId}.${dataset}.observations`,
        topN: TOP_N,
        fields: dict,
      },
      null,
      2,
    ),
  )

  console.log(`Wrote ${totalValues} values across ${Object.keys(dict).length} fields → ${OUT_FILE}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
