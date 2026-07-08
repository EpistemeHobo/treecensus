'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TopBar } from '@/components/layout/TopBar'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { Search, Plus, X, SlidersHorizontal, ChevronRight, Eye, EyeOff, Columns3, Maximize, Minimize, Sun, Moon, BarChart3, Download, CalendarRange } from 'lucide-react'
import FIELD_DICTIONARY from '@/data/field-dictionary.json'
import DATA_DICTIONARY from '@/data/data-dictionary.json'
import { InsightsModal } from '@/components/data/InsightsModal'
import { exportObservationsXlsx, MAX_EXPORT_ROWS } from '@/lib/export-xlsx'
import { useI18n } from '@/context/LanguageContext'
import type { TranslationKey } from '@/i18n/translations'

const DICT_BY_NAME = new Map<string, {
  name: string
  label: string
  th_label?: string | null
  description: string
  th_description?: string | null
  unit?: string
  th_unit?: string | null
}>(
  (DATA_DICTIONARY.fields as any[]).map(f => [f.name, f])
)

const VALUE_SUGGESTIONS = FIELD_DICTIONARY.fields as Record<string, string[]>
const DICT_GENERATED_AT = FIELD_DICTIONARY.generatedAt as string

type Row = Record<string, string | null>
type FilterOp = 'contains' | 'equals' | 'not_equals' | 'starts_with' | 'gt' | 'lt' | 'not_empty' | 'empty'
interface Filter { field: string; op: FilterOp; value: string }

const PAGE_SIZE = 50

const OPERATORS: { value: FilterOp; labelKey: TranslationKey; noValue?: boolean }[] = [
  { value: 'contains', labelKey: 'op.contains' },
  { value: 'equals', labelKey: 'op.equals' },
  { value: 'not_equals', labelKey: 'op.not_equals' },
  { value: 'starts_with', labelKey: 'op.starts_with' },
  { value: 'gt', labelKey: 'op.gt' },
  { value: 'lt', labelKey: 'op.lt' },
  { value: 'not_empty', labelKey: 'op.not_empty', noValue: true },
  { value: 'empty', labelKey: 'op.empty', noValue: true },
]

// Field-group names are internal identifiers; translate only when displayed.
type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string
function groupLabel(t: Translate, name: string): string {
  return t(`group.${name}` as TranslationKey)
}

const TYPE_BADGE: Record<string, 'coral' | 'success' | 'violet' | 'default'> = {
  tree_stem: 'coral', seedling: 'success', woody_debris: 'violet',
}

// Human-readable description of a condition, e.g. `species_raw contains “oak”`.
function describeFilter(f: Filter, t: Translate): string {
  const op = OPERATORS.find(o => o.value === f.op)
  const label = op ? t(op.labelKey) : f.op
  return op?.noValue ? `${f.field} ${label}` : `${f.field} ${label} “${f.value}”`
}

// Column grouping — ordered; columns render in this order, with the group header spanning them.
const FIELD_GROUPS: { name: string; fields: string[] }[] = [
  {
    name: 'Core',
    fields: [
      'map_record_id', 'observation_type', 'source_status',
      'plot_id', 'plot_no_raw', 'plot_no_int',
      'subplot_id', 'subplot_raw', 'subplot_no', 'subplot_name', 'subplot_code',
      'dataset_type', 'item_tag_id_raw',
      'local_x_m', 'local_y_m',
      'utm_easting', 'utm_northing', 'utm_zone', 'utm_hemisphere',
      'latitude', 'longitude', 'geo_ready', 'coordinate_note',
      'azimuth_deg', 'distance_m',
      'species_id', 'species_raw', 'thai_name',
      'scientific_name', 'scientific_author', 'normalized_species_name',
    ],
  },
  {
    name: 'Tree stem',
    fields: [
      'tree_id', 'stem_id', 'stem_no',
      'size_class_raw', 'size_class_code',
      'stand_fall_raw', 'stand_fall_code',
      'live_dead_raw', 'live_dead_code',
      'gbh_cm', 'gbh_method_raw', 'gbh_method_code',
      'total_height_m', 'height_method_raw', 'height_method_code',
      'crown_class_raw', 'crown_class_code',
      'crown_condition_raw', 'crown_condition_code',
      'tree_health_raw', 'tree_health_code',
      'lichen_pct',
    ],
  },
  {
    name: 'Seedling',
    fields: ['seedling_id', 'seedling_count'],
  },
  {
    name: 'Woody debris',
    fields: [
      'woody_debris_id',
      'transect_raw', 'transect_deg',
      'large_woody_condition_raw', 'large_woody_condition_code',
      'tip_diameter_cm', 'middle_diameter_cm', 'base_diameter_cm',
      'medium_piece_count', 'small_piece_count', 'fine_piece_count',
    ],
  },
  {
    name: 'Metadata',
    fields: [
      'source_row_id', 'submission_id', 'import_batch_id', 'source_file_sha256',
      'project_id', 'project_no_raw', 'project_no_int',
      'added_time', 'offline_added_time', 'task_owner',
      'validation_flag_count', 'validation_flag_codes', 'validation_flag_severities',
    ],
  },
  {
    name: 'Miscellaneous',
    fields: ['remarks'],
  },
]

// Fields with custom rendering; every other schema field falls through to the default cell.
const CUSTOM_RENDERERS: Record<string, { label?: string; className?: string; render?: (r: Row) => React.ReactNode }> = {
  map_record_id: { label: 'Record', className: 'font-mono text-[12px] text-neutral/80' },
  observation_type: {
    label: 'Type',
    render: (r) => <Badge variant={TYPE_BADGE[r.observation_type ?? ''] ?? 'default'}>{r.observation_type ?? '—'}</Badge>,
  },
  source_status: {
    label: 'Status',
    render: (r) => <Badge variant={r.source_status === 'clean' ? 'success' : 'warning'}>{r.source_status ?? '—'}</Badge>,
  },
}

function humanize(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Searchable field picker for the condition builder — groups collapsed by
// default, portal-rendered so it survives the card's overflow: hidden.
interface FieldSelectProps {
  value: string
  onChange: (v: string) => void
  fields: string[]
}
function FieldSelect({ value, onChange, fields }: FieldSelectProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => {
    const groupOf = new Map<string, string>()
    for (const g of FIELD_GROUPS) for (const f of g.fields) groupOf.set(f, g.name)
    const order = [...FIELD_GROUPS.map(g => g.name), 'Miscellaneous']
    const bucket = new Map<string, string[]>(order.map(n => [n, []]))
    for (const f of fields) {
      const g = groupOf.get(f) ?? 'Miscellaneous'
      bucket.get(g)!.push(f)
    }
    return order.map(n => ({ name: n, fields: bucket.get(n)! })).filter(g => g.fields.length > 0)
  }, [fields])

  function openPopover() {
    if (inputRef.current) setAnchor(inputRef.current.getBoundingClientRect())
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t) || inputRef.current?.contains(t)) return
      setOpen(false)
    }
    const reposition = () => {
      if (inputRef.current) setAnchor(inputRef.current.getBoundingClientRect())
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  const q = search.trim().toLowerCase()
  const isSearching = q.length > 0

  function toggleGroup(name: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setSearch(e.target.value); openPopover() }}
        onFocus={openPopover}
        placeholder={t('data.fieldPlaceholder')}
        spellCheck={false}
        className="w-56 px-3 py-2 bg-bg border border-dim rounded-sm text-[13px] font-mono text-neutral outline-none focus:border-coral/40 transition-colors"
      />
      {open && anchor && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          className="dark fixed z-50 rounded-sm border border-[rgba(255,255,255,0.10)] shadow-2xl overflow-hidden"
          style={{
            left: anchor.left,
            top: anchor.bottom + 4,
            width: Math.max(anchor.width, 288),
            background: '#0A0A10',
          }}
        >
          <div className="p-2 border-b border-[rgba(255,255,255,0.08)]">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('data.searchFields')}
                autoFocus
                className="w-full pl-7 pr-2 py-1.5 bg-transparent border border-[rgba(255,255,255,0.08)] rounded-sm text-[12px] text-neutral placeholder:text-muted/60 outline-none focus:border-coral/40"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {groups.map(g => {
              const shown = isSearching ? g.fields.filter(f => f.toLowerCase().includes(q)) : g.fields
              if (isSearching && shown.length === 0) return null
              const isOpen = isSearching || expanded.has(g.name)
              return (
                <div key={g.name} className="border-b border-[rgba(255,255,255,0.05)] last:border-0">
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.name)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-ghost/40"
                  >
                    <ChevronRight
                      size={11}
                      className={`text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-coral/80">{groupLabel(t, g.name)}</span>
                    <span className="ml-auto text-[10px] text-muted">{shown.length}</span>
                  </button>
                  {isOpen && (
                    <ul>
                      {shown.map(f => (
                        <li key={f}>
                          <button
                            type="button"
                            onMouseDown={e => e.preventDefault()}   // keep input focus
                            onClick={() => { onChange(f); setSearch(''); setOpen(false) }}
                            className={`w-full px-8 py-1.5 text-left font-mono text-[12px] hover:bg-coral/10 ${value === f ? 'text-coral' : 'text-neutral'}`}
                          >
                            {f}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
            {isSearching && groups.every(g => g.fields.filter(f => f.toLowerCase().includes(q)).length === 0) && (
              <p className="px-3 py-4 text-[12px] text-muted text-center">{t('data.noFieldsMatch', { q: search })}</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default function DataPage() {
  const { t, lang } = useI18n()
  const [schemaFields, setSchemaFields] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [draftFilters, setDraftFilters] = useState<Filter[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [applied, setApplied] = useState<{ search: string; filters: Filter[]; dateFrom: string; dateTo: string }>({ search: '', filters: [], dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(0)

  const dateRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo)

  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set())
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [fieldPanelOpen, setFieldPanelOpen] = useState(false)
  const [tableFullscreen, setTableFullscreen] = useState(false)
  const [tableTheme, setTableTheme] = useState<'dark' | 'light'>('dark')
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<{ loaded: number; total: number } | null>(null)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    if (!tableFullscreen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTableFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tableFullscreen])

  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Field pool for filter auto-suggestion (source of truth = observations schema).
  useEffect(() => {
    fetch('/api/data/schema')
      .then(r => r.json())
      .then(j => { if (j.data) setSchemaFields(j.data.columns.map((c: { name: string }) => c.name)) })
      .catch(() => { })
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
        dateFrom: applied.dateFrom,
        dateTo: applied.dateTo,
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
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : t('data.loadFailed')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language; no refetch on language switch
  }, [applied, page])

  // Debounce the keyword search into the applied query.
  useEffect(() => {
    const t = setTimeout(() => {
      setApplied(a => (a.search === searchInput ? a : { ...a, search: searchInput }))
      setPage(0)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Debounce the time-frame range into the applied query (1.5s), so it fires
  // alongside the current filters + keyword. Skipped while the range is invalid.
  useEffect(() => {
    if (dateRangeInvalid) return
    const t = setTimeout(() => {
      if (applied.dateFrom === dateFrom && applied.dateTo === dateTo) return
      setApplied(a => ({ ...a, dateFrom, dateTo }))
      setPage(0)
    }, 1500)
    return () => clearTimeout(t)
  }, [dateFrom, dateTo, dateRangeInvalid, applied.dateFrom, applied.dateTo])

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

  // Build one column per schema field, ordered by group so the group header spans them.
  const columns = useMemo(() => {
    const available = new Set(
      schemaFields.length > 0
        ? schemaFields
        : rows.flatMap(r => Object.keys(r))
    )
    const groupOf = new Map<string, string>()
    for (const g of FIELD_GROUPS) for (const f of g.fields) groupOf.set(f, g.name)

    const ordered: { name: string; group: string }[] = []
    const seen = new Set<string>()
    for (const g of FIELD_GROUPS) {
      for (const f of g.fields) {
        if (available.has(f) && !seen.has(f)) {
          ordered.push({ name: f, group: g.name })
          seen.add(f)
        }
      }
    }
    // Any schema field not explicitly mapped drops into Miscellaneous.
    for (const f of Array.from(available)) {
      if (!seen.has(f)) {
        ordered.push({ name: f, group: groupOf.get(f) ?? 'Miscellaneous' })
        seen.add(f)
      }
    }

    return ordered.map(({ name, group }) => {
      const custom = CUSTOM_RENDERERS[name] ?? {}
      const d = DICT_BY_NAME.get(name)
      let resolvedLabel = custom.label ?? humanize(name)
      if (d) {
        if (lang === 'th') {
          resolvedLabel = d.th_label || d.label
        } else {
          resolvedLabel = d.label
        }
      }
      return {
        key: name,
        label: resolvedLabel,
        className: custom.className,
        render: custom.render,
        group: groupLabel(t, group),
      }
    })
  }, [schemaFields, rows, t, lang])

  // Group → list of available fields, used to render the collapsible field picker.
  const groupedFields = useMemo(() => {
    const byGroup = new Map<string, string[]>()
    for (const col of columns) {
      const g = col.group ?? 'Miscellaneous'
      const list = byGroup.get(g) ?? []
      list.push(col.key)
      byGroup.set(g, list)
    }
    return Array.from(byGroup.entries()).map(([name, fields]) => ({ name, fields }))
  }, [columns])

  const visibleColumns = useMemo(
    () => columns.filter(c => !hiddenFields.has(c.key)),
    [columns, hiddenFields],
  )

  function toggleField(field: string) {
    setHiddenFields(prev => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field); else next.add(field)
      return next
    })
  }
  function setGroupHidden(fields: string[], hidden: boolean) {
    setHiddenFields(prev => {
      const next = new Set(prev)
      for (const f of fields) { if (hidden) next.add(f); else next.delete(f) }
      return next
    })
  }
  function toggleGroupOpen(name: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  async function handleExport() {
    if (exporting || total === 0) return
    if (total > MAX_EXPORT_ROWS) {
      setExportError(t('data.exportTooManyErr', { n: total.toLocaleString(), limit: MAX_EXPORT_ROWS.toLocaleString() }))
      return
    }
    setExporting(true); setExportError(''); setExportProgress({ loaded: 0, total })
    try {
      await exportObservationsXlsx({
        query: { search: applied.search, filters: applied.filters, dateFrom: applied.dateFrom, dateTo: applied.dateTo },
        columns: visibleColumns.map(c => ({ key: c.key, label: c.label })),
        lang,
        onProgress: (loaded, t) => setExportProgress({ loaded, total: t }),
      })
    } catch (e) {
      setExportError(e instanceof Error ? e.message : t('data.exportFailed'))
    } finally {
      setExporting(false); setExportProgress(null)
    }
  }

  const activeFilterCount = applied.filters.filter(f => f.field).length
  const activeConditions = applied.filters.filter(f => f.field)
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1
  const to = Math.min((page + 1) * PAGE_SIZE, total)
  const hasNext = to < total

  return (
    <div className="flex flex-col flex-1">
      <TopBar title={t('data.title')} subtitle={t('data.subtitle')} />

      <div className="flex-1 p-8 flex flex-col gap-6 overflow-auto">
        {/* Filter builder */}
        <MangroveCard seed={17}>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder={t('data.searchPlaceholder')}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-ghost border border-dim rounded-sm text-[13px] text-neutral placeholder:text-muted/50 outline-none focus:border-coral/40 transition-colors"
              />
            </div>
            <span className="flex flex-col items-start ml-2">
              <span className="flex items-center gap-2 text-[12px] text-coral/90 uppercase tracking-widest font-semibold">
                <SlidersHorizontal size={13} /> {t('data.filters')}
                {activeFilterCount > 0 && <Badge variant="coral">{activeFilterCount}</Badge>}
              </span>
              <span
                className="text-[10px] text-white/50 mt-0.5"
                title={t('data.suggestionsTip', { d: DICT_GENERATED_AT })}
              >
                {t('data.suggestionsFrom', { d: new Date(DICT_GENERATED_AT).toLocaleDateString() })}
              </span>
            </span>
          </div>

          {/* Condition rows */}
          <div className="flex flex-col gap-2">
            {draftFilters.map((f, i) => {
              const op = OPERATORS.find(o => o.value === f.op)
              return (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  <FieldSelect
                    value={f.field}
                    onChange={v => updateFilter(i, { field: v })}
                    fields={schemaFields}
                  />
                  <select
                    value={f.op}
                    onChange={e => updateFilter(i, { op: e.target.value as FilterOp })}
                    className="px-3 py-2 bg-bg border border-dim rounded-sm text-[13px] text-neutral outline-none focus:border-coral/40 transition-colors"
                  >
                    {OPERATORS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
                  </select>
                  <input
                    type="text"
                    value={f.value}
                    disabled={op?.noValue}
                    onChange={e => updateFilter(i, { value: e.target.value })}
                    placeholder={op?.noValue ? '—' : t('data.valuePlaceholder')}
                    list={VALUE_SUGGESTIONS[f.field] ? `vals-${f.field}` : undefined}
                    className="flex-1 min-w-[8rem] px-3 py-2 bg-bg border border-dim rounded-sm text-[13px] text-neutral outline-none focus:border-coral/40 transition-colors disabled:opacity-40"
                  />
                  <button
                    onClick={() => removeFilter(i)}
                    className="p-2 text-muted hover:text-rose transition-colors"
                    title={t('data.removeCondition')}
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* One datalist per dictionary field — the value input picks the right one via its `list` prop. */}
          {Object.entries(VALUE_SUGGESTIONS).map(([field, values]) => (
            <datalist key={field} id={`vals-${field}`}>
              {values.map(v => <option key={v} value={v} />)}
            </datalist>
          ))}

          <div className="flex items-center gap-2 mt-4">
            <Button variant="secondary" size="sm" onClick={addFilter}><Plus size={13} />{t('data.addCondition')}</Button>
            <Button size="sm" onClick={applyFilters} loading={loading}>{t('data.apply')}</Button>
            {(draftFilters.length > 0 || activeFilterCount > 0) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>{t('data.clear')}</Button>
            )}
          </div>

          {/* Time frame — a date range on the record's added date. Applied
              automatically 1.5s after a change, together with filters + keyword.
          <div className="mt-5 pt-5 border-t border-dim">
            <div className="flex items-center gap-2 mb-3">
              <CalendarRange size={14} className="text-coral/90" />
              <span className="text-[12px] uppercase tracking-widest font-semibold text-coral/90">{t('data.timeFrame')}</span>
              <span className="text-[10px] text-muted">{t('data.recordAddedDate')}</span>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-muted">{t('data.beginDate')}</label>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={e => setDateFrom(e.target.value)}
                  className="px-3 py-2 bg-bg border border-dim rounded-sm text-[13px] text-neutral outline-none focus:border-coral/40 transition-colors [color-scheme:dark]"
                />
              </div>
              <span className="text-muted pb-2.5">→</span>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-muted">{t('data.finishDate')}</label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={e => setDateTo(e.target.value)}
                  className="px-3 py-2 bg-bg border border-dim rounded-sm text-[13px] text-neutral outline-none focus:border-coral/40 transition-colors [color-scheme:dark]"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => { setDateFrom(''); setDateTo('') }}
                  className="pb-2 p-2 text-muted hover:text-rose transition-colors"
                  title={t('data.clearTimeFrame')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {dateRangeInvalid && (
              <p className="text-[11px] text-rose mt-2">{t('data.dateRangeInvalid')}</p>
            )}
            <p className="text-[11px] text-muted mt-2">
              {t('data.timeFrameHint')}
            </p>
          </div>
          */}
        </MangroveCard>

        {/* Field picker — collapsible folders per group, chips per field. */}
        <MangroveCard seed={42}>
          <button
            type="button"
            onClick={() => setFieldPanelOpen(o => !o)}
            className="flex items-center gap-2 w-full text-left"
          >
            <ChevronRight
              size={14}
              className={`text-coral/90 transition-transform ${fieldPanelOpen ? 'rotate-90' : ''}`}
            />
            <Columns3 size={14} className="text-coral/90" />
            <span className="text-[12px] uppercase tracking-widest font-semibold text-coral/90">{t('data.fields')}</span>
            <Badge variant="default">{visibleColumns.length} / {columns.length}</Badge>
          </button>

          {fieldPanelOpen && (
            <div className="mt-4 flex flex-col gap-2">
              {groupedFields.map(g => {
                const open = openGroups.has(g.name)
                const hiddenInGroup = g.fields.filter(f => hiddenFields.has(f)).length
                const shownInGroup = g.fields.length - hiddenInGroup
                return (
                  <div key={g.name} className="border border-dim rounded-sm">
                    <div className="flex items-center gap-2 px-3 py-2 bg-ghost/40">
                      <button
                        type="button"
                        onClick={() => toggleGroupOpen(g.name)}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <ChevronRight
                          size={13}
                          className={`text-muted transition-transform ${open ? 'rotate-90' : ''}`}
                        />
                        <span className="text-[12px] font-semibold uppercase tracking-widest text-coral/80">{g.name}</span>
                        <span className="text-[11px] text-muted">{shownInGroup} / {g.fields.length}</span>
                      </button>
                      {(() => {
                        const allHidden = shownInGroup === 0
                        return (
                          <button
                            type="button"
                            onClick={() => setGroupHidden(g.fields, !allHidden)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold transition-all"
                            style={
                              allHidden
                                ? {
                                  // Show all → bright glowing green, like a firefly.
                                  color: '#7CFF6B',
                                  textShadow: '0 0 6px rgba(124,255,107,0.75), 0 0 14px rgba(124,255,107,0.35)',
                                  filter: 'drop-shadow(0 0 4px rgba(124,255,107,0.6))',
                                }
                                : {
                                  // Hide all → bright saturated red glyph with a dimmer red halo.
                                  // Mirrors the Show-all lime treatment (bright core, softer aura)
                                  // so contrast against the glow stays high.
                                  color: '#FF3B3B',
                                  textShadow: '0 0 6px rgba(255,59,59,0.80), 0 0 14px rgba(255,59,59,0.40)',
                                  filter: 'drop-shadow(0 0 4px rgba(255,59,59,0.65))',
                                }
                            }
                            title={allHidden ? t('data.showAllInGroup') : t('data.hideAllInGroup')}
                          >
                            {allHidden ? <><Eye size={12} /> {t('data.clickToShowAll')}</> : <><EyeOff size={12} /> {t('data.clickToHideAll')}</>}
                          </button>
                        )
                      })()}
                    </div>
                    {open && (
                      <div className="flex flex-wrap gap-1.5 p-3">
                        {g.fields.map(f => {
                          const visible = !hiddenFields.has(f)
                          return (
                            <button
                              key={f}
                              type="button"
                              onClick={() => toggleField(f)}
                              className={`px-2 py-1 text-[11px] font-mono rounded-sm border transition-colors ${visible
                                  ? 'bg-coral/10 border-coral/30 text-neutral'
                                  : 'bg-bg border-dim text-gray-300 line-through'
                                }`}
                              title={visible ? t('data.clickToHide') : t('data.clickToShow')}
                            >
                              {f}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </MangroveCard>

        {/* Results */}
        <div
          className={tableFullscreen ? 'fixed inset-0 z-50 overflow-y-auto p-6' : ''}
          style={tableFullscreen ? { background: tableTheme === 'light' ? '#F7F8F6' : '#0A0A10' } : undefined}
        >
          <MangroveCard variant="sand" theme={tableTheme} className={tableFullscreen ? 'min-h-full' : ''}>
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div className="min-w-0">
                <span className="text-[12px] uppercase tracking-widest font-semibold text-[color:var(--c-th)]">{t('data.results')}</span>
                {!loading && !error && (
                  <p className="text-[12px] text-muted mt-1 leading-relaxed">
                    {t('data.foundPrefix')} <span className="font-semibold text-neutral">{total.toLocaleString()}</span>{' '}
                    {total === 1 ? t('data.record') : t('data.records')}
                    {(activeConditions.length > 0 || applied.search || applied.dateFrom || applied.dateTo) && t('data.fromFilters')}
                    {activeConditions.map((f, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-muted">, </span>}
                        <span className="font-mono text-[11px] text-neutral">{describeFilter(f, t)}</span>
                      </span>
                    ))}
                    {applied.search && (
                      <span>
                        {activeConditions.length > 0 && <span className="text-muted">{t('data.and')}</span>}
                        {t('data.keyword')} <span className="font-mono text-[11px] text-neutral">“{applied.search}”</span>
                      </span>
                    )}
                    {(applied.dateFrom || applied.dateTo) && (
                      <span>
                        {(activeConditions.length > 0 || applied.search) && <span className="text-muted">{t('data.and')}</span>}
                        {t('data.added')}{' '}
                        <span className="font-mono text-[11px] text-neutral">
                          {applied.dateFrom && applied.dateTo
                            ? t('data.betweenDates', { a: applied.dateFrom, b: applied.dateTo })
                            : applied.dateFrom
                              ? t('data.onAfter', { d: applied.dateFrom })
                              : t('data.onBefore', { d: applied.dateTo })}
                        </span>
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setTableTheme(t => (t === 'dark' ? 'light' : 'dark'))}
                  className="p-1.5 text-muted hover:text-neutral transition-colors rounded-sm hover:bg-ghost"
                  title={tableTheme === 'dark' ? t('data.switchDay') : t('data.switchNight')}
                  aria-label={tableTheme === 'dark' ? t('data.switchDay') : t('data.switchNight')}
                >
                  {tableTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setInsightsOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-widest font-semibold text-muted hover:text-neutral border border-dim rounded-sm hover:border-coral/40 hover:bg-ghost transition-colors"
                  title={t('data.viewInsightTip')}
                >
                  <BarChart3 size={13} /> {t('data.viewInsight')}
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting || total === 0 || total > MAX_EXPORT_ROWS}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-widest font-semibold text-muted hover:text-neutral border border-dim rounded-sm hover:border-coral/40 hover:bg-ghost transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  title={
                    total > MAX_EXPORT_ROWS
                      ? t('data.exportTooManyTip', { n: total.toLocaleString(), limit: MAX_EXPORT_ROWS.toLocaleString() })
                      : t('data.exportTip')
                  }
                >
                  {exporting
                    ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> {t('data.exporting')}</>
                    : <><Download size={13} /> {t('data.exportXlsx')}</>}
                </button>
                <button
                  type="button"
                  onClick={() => setTableFullscreen(f => !f)}
                  className="p-1.5 text-muted hover:text-neutral transition-colors rounded-sm hover:bg-ghost"
                  title={tableFullscreen ? t('data.exitFullscreen') : t('data.fullscreen')}
                  aria-label={tableFullscreen ? t('data.exitFullscreen') : t('data.fullscreen')}
                >
                  {tableFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-[13px] text-rose mb-4">{error}</p>}
            {!loading && !error && total > MAX_EXPORT_ROWS && (
              <p className="text-[12px] text-amber-500 mb-4">
                {t('data.exportDisabledBanner', { limit: MAX_EXPORT_ROWS.toLocaleString(), n: total.toLocaleString() })}
              </p>
            )}
            {exportError && <p className="text-[13px] text-rose mb-4">{t('data.exportFailed')}: {exportError}</p>}
            {exporting && exportProgress && (
              <p className="text-[12px] text-muted mb-4">
                {t('data.exportFetching', { a: exportProgress.loaded.toLocaleString(), b: exportProgress.total.toLocaleString() })}
              </p>
            )}

            <Table
              columns={visibleColumns as Parameters<typeof Table>[0]['columns']}
              rows={rows as unknown as Record<string, unknown>[]}
              loading={loading}
              keyField="map_record_id"
              emptyMessage={t('data.noMatch')}
            />

            <div className="flex items-center justify-between mt-4 text-[12px] text-muted">
              <span>{total === 0 ? t('data.zeroRecords') : t('data.rangeOf', { from: from.toLocaleString(), to: to.toLocaleString(), total: total.toLocaleString() })}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={page === 0 || loading} onClick={() => setPage(p => Math.max(p - 1, 0))}>{t('common.previous')}</Button>
                <Button variant="ghost" size="sm" disabled={!hasNext || loading} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
              </div>
            </div>
          </MangroveCard>
        </div>
      </div>

      <InsightsModal
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        query={{ search: applied.search, filters: applied.filters, dateFrom: applied.dateFrom, dateTo: applied.dateTo }}
      />
    </div>
  )
}
