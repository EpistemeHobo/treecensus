'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Search, Plus, X, SlidersHorizontal } from 'lucide-react'

type Row = Record<string, string | null>
type FilterOp = 'contains' | 'equals' | 'not_equals' | 'starts_with' | 'gt' | 'lt' | 'not_empty' | 'empty'
interface Filter { field: string; op: FilterOp; value: string }

const PAGE_SIZE = 50

const OPERATORS: { value: FilterOp; label: string; noValue?: boolean }[] = [
  { value: 'contains',    label: 'contains' },
  { value: 'equals',      label: 'equals' },
  { value: 'not_equals',  label: 'does not equal' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'gt',          label: '> (number)' },
  { value: 'lt',          label: '< (number)' },
  { value: 'not_empty',   label: 'is not empty', noValue: true },
  { value: 'empty',       label: 'is empty',     noValue: true },
]

const TYPE_BADGE: Record<string, 'coral' | 'success' | 'violet' | 'default'> = {
  tree_stem: 'coral', seedling: 'success', woody_debris: 'violet',
}

// Curated columns for the table (the rows carry all 80 fields; table scrolls x).
const COLUMNS = [
  { key: 'map_record_id', label: 'Record',  className: 'font-mono text-[12px] text-muted' },
  { key: 'observation_type', label: 'Type',
    render: (r: Row) => <Badge variant={TYPE_BADGE[r.observation_type ?? ''] ?? 'default'}>{r.observation_type ?? '—'}</Badge> },
  { key: 'plot_no_raw',   label: 'Plot' },
  { key: 'subplot_name',  label: 'Subplot' },
  { key: 'scientific_name', label: 'Species',
    render: (r: Row) => r.scientific_name || r.thai_name || '—' },
  { key: 'gbh_cm',        label: 'GBH (cm)' },
  { key: 'total_height_m', label: 'Height (m)' },
  { key: 'source_status', label: 'Status',
    render: (r: Row) => <Badge variant={r.source_status === 'clean' ? 'success' : 'warning'}>{r.source_status ?? '—'}</Badge> },
]

export default function DataPage() {
  const [schemaFields, setSchemaFields] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [draftFilters, setDraftFilters] = useState<Filter[]>([])
  const [applied, setApplied] = useState<{ search: string; filters: Filter[] }>({ search: '', filters: [] })
  const [page, setPage] = useState(0)

  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Field pool for filter auto-suggestion (source of truth = observations schema).
  useEffect(() => {
    fetch('/api/data/schema')
      .then(r => r.json())
      .then(j => { if (j.data) setSchemaFields(j.data.columns.map((c: { name: string }) => c.name)) })
      .catch(() => {})
  }, [])

  // Fetch rows whenever the applied query or page changes.
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    fetch('/api/data/observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search: applied.search,
        filters: applied.filters.filter(f => f.field),
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    })
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        if (j.error) throw new Error(j.error)
        setRows(j.data)
        setTotal(j.meta.total)
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [applied, page])

  // Debounce the keyword search into the applied query.
  useEffect(() => {
    const t = setTimeout(() => {
      setApplied(a => (a.search === searchInput ? a : { ...a, search: searchInput }))
      setPage(0)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  function applyFilters() {
    setApplied(a => ({ ...a, filters: draftFilters }))
    setPage(0)
  }
  function clearFilters() {
    setDraftFilters([])
    setApplied(a => ({ ...a, filters: [] }))
    setPage(0)
  }
  function addFilter() {
    setDraftFilters(f => [...f, { field: '', op: 'contains', value: '' }])
  }
  function updateFilter(i: number, patch: Partial<Filter>) {
    setDraftFilters(f => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))
  }
  function removeFilter(i: number) {
    setDraftFilters(f => f.filter((_, idx) => idx !== i))
  }

  const activeFilterCount = applied.filters.filter(f => f.field).length
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1
  const to = Math.min((page + 1) * PAGE_SIZE, total)
  const hasNext = to < total

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Tree Data" subtitle="Browse, search and filter census observations" />

      <div className="flex-1 p-8 flex flex-col gap-6 overflow-auto">
        {/* Filter builder */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search species, plot, collector, remarks…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-ghost border border-dim rounded-sm text-[13px] text-neutral placeholder:text-muted/50 outline-none focus:border-coral/40 transition-colors"
              />
            </div>
            <span className="flex items-center gap-2 text-[12px] text-muted uppercase tracking-widest font-semibold ml-2">
              <SlidersHorizontal size={13} /> Filters
              {activeFilterCount > 0 && <Badge variant="coral">{activeFilterCount}</Badge>}
            </span>
          </div>

          {/* Condition rows */}
          <div className="flex flex-col gap-2">
            {draftFilters.map((f, i) => {
              const op = OPERATORS.find(o => o.value === f.op)
              return (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    list="obs-field-pool"
                    value={f.field}
                    onChange={e => updateFilter(i, { field: e.target.value })}
                    placeholder="field…"
                    spellCheck={false}
                    className="w-56 px-3 py-2 bg-bg border border-dim rounded-sm text-[13px] font-mono text-neutral outline-none focus:border-coral/40 transition-colors"
                  />
                  <select
                    value={f.op}
                    onChange={e => updateFilter(i, { op: e.target.value as FilterOp })}
                    className="px-3 py-2 bg-bg border border-dim rounded-sm text-[13px] text-neutral outline-none focus:border-coral/40 transition-colors"
                  >
                    {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input
                    type="text"
                    value={f.value}
                    disabled={op?.noValue}
                    onChange={e => updateFilter(i, { value: e.target.value })}
                    placeholder={op?.noValue ? '—' : 'value…'}
                    className="flex-1 min-w-[8rem] px-3 py-2 bg-bg border border-dim rounded-sm text-[13px] text-neutral outline-none focus:border-coral/40 transition-colors disabled:opacity-40"
                  />
                  <button
                    onClick={() => removeFilter(i)}
                    className="p-2 text-muted hover:text-rose transition-colors"
                    title="Remove condition"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>

          <datalist id="obs-field-pool">
            {schemaFields.map(name => <option key={name} value={name} />)}
          </datalist>

          <div className="flex items-center gap-2 mt-4">
            <Button variant="secondary" size="sm" onClick={addFilter}><Plus size={13} />Add condition</Button>
            <Button size="sm" onClick={applyFilters} loading={loading}>Apply</Button>
            {(draftFilters.length > 0 || activeFilterCount > 0) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
            )}
          </div>
        </Card>

        {/* Results */}
        <Card>
          {error && <p className="text-[13px] text-rose mb-4">{error}</p>}

          <Table
            columns={COLUMNS as Parameters<typeof Table>[0]['columns']}
            rows={rows as unknown as Record<string, unknown>[]}
            loading={loading}
            keyField="map_record_id"
            emptyMessage="No observations match. Adjust the search or filters."
          />

          <div className="flex items-center justify-between mt-4 text-[12px] text-muted">
            <span>{total === 0 ? '0 records' : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page === 0 || loading} onClick={() => setPage(p => Math.max(p - 1, 0))}>Previous</Button>
              <Button variant="ghost" size="sm" disabled={!hasNext || loading} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
