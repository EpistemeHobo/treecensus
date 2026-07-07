import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => ReactNode
  className?: string
  group?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  emptyMessage?: string
  keyField?: keyof T
}

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  loading,
  emptyMessage = 'No records found.',
  keyField,
}: TableProps<T>) {
  // Collapse contiguous columns with the same `group` into a spanning header cell.
  const groupRuns: { group: string | undefined; span: number }[] = []
  for (const col of columns) {
    const last = groupRuns[groupRuns.length - 1]
    if (last && last.group === col.group) last.span += 1
    else groupRuns.push({ group: col.group, span: 1 })
  }
  const hasGroups = groupRuns.some(r => r.group)

  // Mirror the bottom table's horizontal scroll with a scrollbar rendered above the header.
  const topScrollRef = useRef<HTMLDivElement>(null)
  const bottomScrollRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const [tableWidth, setTableWidth] = useState(0)
  const syncingRef = useRef<'top' | 'bottom' | null>(null)

  useLayoutEffect(() => {
    if (!tableRef.current) return
    const el = tableRef.current
    const measure = () => setTableWidth(el.scrollWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [columns.length, rows.length])

  useEffect(() => {
    const top = topScrollRef.current
    const bottom = bottomScrollRef.current
    if (!top || !bottom) return
    const onTop = () => {
      if (syncingRef.current === 'bottom') { syncingRef.current = null; return }
      syncingRef.current = 'top'
      bottom.scrollLeft = top.scrollLeft
    }
    const onBottom = () => {
      if (syncingRef.current === 'top') { syncingRef.current = null; return }
      syncingRef.current = 'bottom'
      top.scrollLeft = bottom.scrollLeft
    }
    top.addEventListener('scroll', onTop)
    bottom.addEventListener('scroll', onBottom)
    return () => {
      top.removeEventListener('scroll', onTop)
      bottom.removeEventListener('scroll', onBottom)
    }
  }, [])

  return (
    <div className="rounded-lg border border-dim">
      <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden border-b border-dim">
        <div style={{ width: tableWidth || '100%', height: 1 }} />
      </div>
      <div ref={bottomScrollRef} className="overflow-x-auto">
      <table ref={tableRef} className="w-full text-sm">
        <thead>
          {hasGroups && (
            <tr className="border-b border-dim">
              {groupRuns.map((run, i) => (
                <th
                  key={i}
                  colSpan={run.span}
                  className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-[color:var(--c-th)]/80 border-r border-dim last:border-r-0 bg-ghost/40"
                >
                  {run.group ?? ''}
                </th>
              ))}
            </tr>
          )}
          <tr className="border-b border-dim">
            {columns.map(col => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[color:var(--c-th)]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted">
                <span className="inline-block w-5 h-5 border-2 border-muted border-t-transparent rounded-full animate-spin" />
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
          {!loading && rows.map((row, i) => (
            <tr
              key={keyField ? String(row[keyField]) : i}
              className="border-b border-dim last:border-0 hover:bg-ghost transition-colors duration-150"
            >
              {columns.map(col => (
                <td key={String(col.key)} className={clsx('px-4 py-3 text-neutral', col.className)}>
                  {col.render
                    ? col.render(row)
                    : String(row[col.key as keyof T] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
