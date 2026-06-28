import { ReactNode } from 'react'
import clsx from 'clsx'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => ReactNode
  className?: string
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
  return (
    <div className="overflow-x-auto rounded-lg border border-dim">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dim">
            {columns.map(col => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted"
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
                <td key={String(col.key)} className={clsx('px-4 py-3 text-neutral/80', col.className)}>
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
  )
}
