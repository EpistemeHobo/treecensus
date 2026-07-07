import * as XLSX from 'xlsx'
import DATA_DICTIONARY from '@/data/data-dictionary.json'

// ── Types ────────────────────────────────────────────────────────────────────

interface DictField {
  name: string
  label: string
  group: string
  type: string
  unit: string
  appliesTo: string
  description: string
}

interface Filter { field: string; op: string; value: string }

export interface ExportColumn { key: string; label: string }

const DICT_BY_NAME = new Map<string, DictField>(
  (DATA_DICTIONARY.fields as DictField[]).map(f => [f.name, f]),
)

const FETCH_PAGE = 1000

// Hard cap on how many records a single XLSX export may contain. Building the
// whole workbook in browser memory and paging every row over the network gets
// slow past a few thousand rows, so we require the user to narrow the filters
// first. Raise this if larger exports become a genuine need.
export const MAX_EXPORT_ROWS = 5000

/**
 * Fetch the entire filtered result set (paging past the browser's 50/page) and
 * download an XLSX with two sheets:
 *   1. "Records"          — one row per observation, only the active (visible) fields.
 *   2. "Data Dictionary"  — dictionary entries for exactly those active fields.
 *
 * `onProgress(loaded, total)` is called after each page so the UI can show progress.
 */
export async function exportObservationsXlsx(opts: {
  query: { search: string; filters: Filter[] }
  columns: ExportColumn[]           // active/visible columns, in UI order
  onProgress?: (loaded: number, total: number) => void
}): Promise<{ rowCount: number }> {
  const { query, columns, onProgress } = opts
  const fieldKeys = columns.map(c => c.key)

  // ── Fetch every filtered row ────────────────────────────────────────────────
  const all: Record<string, string | null>[] = []
  let offset = 0
  let total = Infinity
  while (offset < total) {
    const res = await fetch('/api/data/observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search: query.search,
        filters: query.filters.filter(f => f.field),
        limit: FETCH_PAGE,
        offset,
      }),
    })
    const j = await res.json()
    if (j.error) throw new Error(j.error)
    total = Number(j.meta?.total ?? 0)
    // Bail out before pulling the rest of the pages if the set is too large.
    if (total > MAX_EXPORT_ROWS) {
      throw new Error(
        `Export is limited to ${MAX_EXPORT_ROWS.toLocaleString()} records, but the current view has ${total.toLocaleString()}. Narrow the filters and try again.`,
      )
    }
    const batch = j.data as Record<string, string | null>[]
    all.push(...batch)
    offset += FETCH_PAGE
    onProgress?.(Math.min(all.length, total), total)
    if (batch.length < FETCH_PAGE) break
  }

  // ── Sheet 1: records (active fields only) ───────────────────────────────────
  const recordsHeader = fieldKeys
  const recordsAoa: (string | null)[][] = [
    recordsHeader,
    ...all.map(row => fieldKeys.map(k => row[k] ?? '')),
  ]
  const wsRecords = XLSX.utils.aoa_to_sheet(recordsAoa)
  wsRecords['!cols'] = fieldKeys.map(k => ({ wch: Math.min(Math.max(k.length + 2, 12), 40) }))

  // ── Sheet 2: dictionary for the active fields ───────────────────────────────
  const dictHeader = ['Field', 'Label', 'Group', 'Type', 'Unit', 'Applies To', 'Description']
  const dictAoa: string[][] = [
    dictHeader,
    ...fieldKeys.map(k => {
      const d = DICT_BY_NAME.get(k)
      return d
        ? [d.name, d.label, d.group, d.type, d.unit, d.appliesTo, d.description]
        : [k, '', '', '', '', '', '(field not present in data dictionary)']
    }),
  ]
  const wsDict = XLSX.utils.aoa_to_sheet(dictAoa)
  wsDict['!cols'] = [
    { wch: 26 }, { wch: 22 }, { wch: 14 }, { wch: 12 },
    { wch: 8 }, { wch: 12 }, { wch: 70 },
  ]

  // ── Assemble + download ─────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsRecords, 'Records')
  XLSX.utils.book_append_sheet(wb, wsDict, 'Data Dictionary')

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  XLSX.writeFile(wb, `tree-census-export-${stamp}.xlsx`)

  return { rowCount: all.length }
}
