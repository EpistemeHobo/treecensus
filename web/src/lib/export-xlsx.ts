import * as XLSX from 'xlsx'
import { DICT_BY_NAME } from '@/lib/data-dictionary'

// ── Types ────────────────────────────────────────────────────────────────────

interface Filter { field: string; op: string; value: string }

export interface ExportColumn { key: string; label: string }

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
  query: { search: string; filters: Filter[]; dateFrom?: string; dateTo?: string }
  columns: ExportColumn[]           // active/visible columns, in UI order
  lang?: 'th' | 'en'                // user's active language
  onProgress?: (loaded: number, total: number) => void
}): Promise<{ rowCount: number }> {
  const { query, columns, lang = 'th', onProgress } = opts
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
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
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

  const isTh = lang === 'th'

  // ── Sheet 1: records (active fields only) ───────────────────────────────────
  // Use localized labels for headers to match UI columns in case of TH mode
  const recordsHeader = columns.map(c => c.label)
  const recordsAoa: (string | null)[][] = [
    recordsHeader,
    ...all.map(row => fieldKeys.map(k => row[k] ?? '')),
  ]
  const wsRecords = XLSX.utils.aoa_to_sheet(recordsAoa)
  wsRecords['!cols'] = columns.map(c => ({ wch: Math.min(Math.max(c.label.length + 4, 12), 40) }))

  // ── Sheet 2: dictionary for the active fields ───────────────────────────────
  const dictHeader = isTh
    ? ['ฟิลด์', 'ป้ายกำกับ', 'กลุ่ม', 'ประเภท', 'หน่วย', 'ใช้กับ', 'คำอธิบาย']
    : ['Field', 'Label', 'Group', 'Type', 'Unit', 'Applies To', 'Description']

  const dictAoa: string[][] = [
    dictHeader,
    ...fieldKeys.map(k => {
      const d = DICT_BY_NAME.get(k)
      if (!d) {
        return [k, '', '', '', '', '', isTh ? '(ไม่มีฟิลด์นี้ในพจนานุกรมข้อมูล)' : '(field not present in data dictionary)']
      }
      const label = isTh ? (d.th_label || d.label) : d.label
      const unit = isTh ? (d.th_unit !== null && d.th_unit !== undefined ? d.th_unit : d.unit) : d.unit
      const desc = isTh ? (d.th_description || d.description) : d.description
      return [d.name, label, d.group, d.type, unit, d.appliesTo, desc]
    }),
  ]
  const wsDict = XLSX.utils.aoa_to_sheet(dictAoa)
  wsDict['!cols'] = [
    { wch: 26 }, { wch: 22 }, { wch: 14 }, { wch: 12 },
    { wch: 8 }, { wch: 12 }, { wch: 70 },
  ]

  // ── Assemble + download ─────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsRecords, isTh ? 'ข้อมูลการสำรวจ' : 'Records')
  XLSX.utils.book_append_sheet(wb, wsDict, isTh ? 'พจนานุกรมข้อมูล' : 'Data Dictionary')

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const filename = isTh ? `mangrove-census-export-${stamp}.xlsx` : `mangrove-census-export-${stamp}.xlsx`
  XLSX.writeFile(wb, filename)

  return { rowCount: all.length }
}
