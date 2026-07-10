/**
 * Build the area-code hierarchy that powers the Focus Area Statistics tab's
 * area selector (level dropdown + area-code autosuggest).
 *
 * Scans BigQuery `observations` for the distinct Province / Plot / Sub-Plot
 * values, canonicalising province names via the shared thai-provinces map, and
 * writes the result to `src/data/area-codes.json`.
 *
 * The District (Amphoe) / Sub-District (Tambol) levels are precomputed from a
 * bundled Thai admin-boundary GeoJSON + coastline, keeping only the coastal
 * amphoes/tambons of the provinces present in the data. Those two levels are
 * disabled in the UI for now, so this step is OPTIONAL: if the GeoJSON assets
 * are absent under scripts/data/, the script emits empty district/subdistrict
 * lists and continues.
 *
 * Usage:
 *   npm run build:area-codes
 */

import { BigQuery } from '@google-cloud/bigquery'
import { promises as fs } from 'fs'
import { existsSync } from 'fs'
import { join } from 'path'
import { config as loadEnv } from 'dotenv'
import { getGcpCredentials } from '../src/lib/gcp-credentials'
import { provinceCoords } from '../src/lib/thai-provinces'

// Pull env from web/.env.local so this works standalone.
loadEnv({ path: join(__dirname, '..', '.env.local') })

const OUT_FILE = join(__dirname, '..', 'src', 'data', 'area-codes.json')
const DATA_DIR = join(__dirname, 'data')

// English display names for the 11 coastal provinces seen in project_no_raw.
const PROVINCE_EN: Record<string, string> = {
  จันทบุรี: 'Chanthaburi',
  ตราด: 'Trat',
  ประจวบคีรีขันธ์: 'Prachuap Khiri Khan',
  ชลบุรี: 'Chonburi',
  สุราษฎร์ธานี: 'Surat Thani',
  ระยอง: 'Rayong',
  ชุมพร: 'Chumphon',
  นราธิวาส: 'Narathiwat',
  สงขลา: 'Songkhla',
  นครศรีธรรมราช: 'Nakhon Si Thammarat',
  ปัตตานี: 'Pattani',
}

interface AreaItem {
  code: string
  label?: string
  labelTh?: string
  labelEn?: string
  provinceCode?: string
  provinceRaw?: string
  districtCode?: string
  plotId?: string
  coastal?: boolean
}

async function buildDistricts(
  provinceNames: Set<string>,
): Promise<{ district: AreaItem[]; subdistrict: AreaItem[] }> {
  // The two admin levels need boundary geometry we don't ship in the repo.
  // Drop `thailand-amphoe-tambon.geojson` + `thailand-coastline.geojson` into
  // scripts/data/ to enable coastal auto-detection; otherwise skip cleanly.
  const adminPath = join(DATA_DIR, 'thailand-amphoe-tambon.geojson')
  const coastPath = join(DATA_DIR, 'thailand-coastline.geojson')
  if (!existsSync(adminPath) || !existsSync(coastPath)) {
    console.log(
      '  [districts] admin/coastline GeoJSON not found under scripts/data/ — ' +
        'emitting empty district/subdistrict lists (levels are disabled in UI).',
    )
    return { district: [], subdistrict: [] }
  }

  // Lazy-load turf only when the assets are actually present. Optional dev
  // dependency — install `@turf/boolean-intersects` to enable this branch.
  // @ts-ignore optional dependency, may be absent
  const { default: booleanIntersects } = await import('@turf/boolean-intersects')
  const admin = JSON.parse(await fs.readFile(adminPath, 'utf8'))
  const coast = JSON.parse(await fs.readFile(coastPath, 'utf8'))
  const coastLines = (coast.features ?? []) as any[]

  const district: AreaItem[] = []
  const subdistrict: AreaItem[] = []
  const seenDistrict = new Set<string>()

  for (const f of (admin.features ?? []) as any[]) {
    const p = f.properties ?? {}
    // Property keys vary by dataset; try the common GADM / HDX spellings.
    const provTh: string = p.NAME_1 ?? p.pro_th ?? p.province ?? ''
    const ampTh: string = p.NAME_2 ?? p.amp_th ?? p.amphoe ?? ''
    const tamTh: string = p.NAME_3 ?? p.tam_th ?? p.tambon ?? ''
    if (!provinceNames.has(provTh)) continue

    const isCoastal = coastLines.some(c => {
      try {
        return booleanIntersects(f, c)
      } catch {
        return false
      }
    })
    if (!isCoastal) continue

    const dcode = `${provTh}/${ampTh}`
    if (ampTh && !seenDistrict.has(dcode)) {
      seenDistrict.add(dcode)
      district.push({ code: dcode, labelTh: ampTh, provinceCode: provTh, coastal: true })
    }
    if (tamTh) {
      subdistrict.push({ code: `${dcode}/${tamTh}`, labelTh: tamTh, districtCode: dcode })
    }
  }
  console.log(`  [districts] ${district.length} coastal amphoes, ${subdistrict.length} tambons`)
  return { district, subdistrict }
}

async function main() {
  const projectId = process.env.GCP_PROJECT_ID
  const dataset = process.env.BIGQUERY_DATASET ?? 'tree_census'
  if (!projectId) {
    console.error('GCP_PROJECT_ID not set — cannot query BigQuery.')
    process.exit(1)
  }

  const bq = new BigQuery({ projectId, ...getGcpCredentials() })
  const TABLE = `\`${projectId}.${dataset}.observations\``

  console.log(`Reading area codes from ${projectId}.${dataset}.observations…`)

  // ── Province: distinct project_no_raw, canonicalised. ──────────────────────
  const [provRows] = await bq.query({
    query: `SELECT DISTINCT project_no_raw FROM ${TABLE} WHERE NULLIF(project_no_raw, '') IS NOT NULL`,
  })
  const provinceMap = new Map<string, AreaItem>()
  for (const r of provRows as { project_no_raw: string }[]) {
    const pc = provinceCoords(r.project_no_raw)
    const name = pc?.name ?? r.project_no_raw.trim()
    if (!provinceMap.has(name)) {
      provinceMap.set(name, { code: name, labelTh: name, labelEn: PROVINCE_EN[name] ?? name })
    }
  }
  const province = Array.from(provinceMap.values()).sort((a, b) => a.code.localeCompare(b.code, 'th'))

  // ── Plot: distinct plot_id + a human label + owning province. ──────────────
  const [plotRows] = await bq.query({
    query: `
      SELECT plot_id AS code,
             ANY_VALUE(NULLIF(plot_no_raw, ''))    AS label,
             ANY_VALUE(NULLIF(project_no_raw, '')) AS provinceRaw
      FROM ${TABLE}
      WHERE NULLIF(plot_id, '') IS NOT NULL
      GROUP BY plot_id
      ORDER BY plot_id
    `,
  })
  const plot: AreaItem[] = (plotRows as any[]).map(r => ({
    code: String(r.code),
    label: r.label ? String(r.label) : String(r.code),
    provinceRaw: r.provinceRaw ? String(r.provinceRaw) : '',
  }))

  // ── Sub-Plot: distinct subplot_id + name/code + owning plot. ───────────────
  const [subRows] = await bq.query({
    query: `
      SELECT subplot_id AS code,
             ANY_VALUE(NULLIF(subplot_name, '')) AS name,
             ANY_VALUE(NULLIF(subplot_code, '')) AS scode,
             ANY_VALUE(NULLIF(plot_id, ''))      AS plotId
      FROM ${TABLE}
      WHERE NULLIF(subplot_id, '') IS NOT NULL
      GROUP BY subplot_id
      ORDER BY subplot_id
    `,
  })
  const subplot: AreaItem[] = (subRows as any[]).map(r => {
    const name = r.name ? String(r.name) : ''
    const scode = r.scode ? String(r.scode) : ''
    const label = name && scode ? `${name} (${scode})` : name || scode || String(r.code)
    return { code: String(r.code), label, plotId: r.plotId ? String(r.plotId) : '' }
  })

  // ── District / Sub-District (optional, coastal auto-detect). ────────────────
  const provinceNames = new Set(province.map(p => p.code))
  const { district, subdistrict } = await buildDistricts(provinceNames)

  const out = {
    generatedAt: new Date().toISOString(),
    source: `${projectId}.${dataset}.observations`,
    levels: { province, district, subdistrict, plot, subplot },
  }

  await fs.mkdir(join(__dirname, '..', 'src', 'data'), { recursive: true })
  await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2))

  console.log(
    `Wrote area-codes.json → ${province.length} provinces, ${plot.length} plots, ` +
      `${subplot.length} sub-plots, ${district.length} districts, ${subdistrict.length} sub-districts`,
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
