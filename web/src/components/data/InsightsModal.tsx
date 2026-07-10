'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { X, BarChart3, Leaf, Download } from 'lucide-react'
import { useI18n } from '@/context/LanguageContext'
import { WOOD_MATRIC } from '@/lib/wood-matric'
import { DICT_BY_NAME } from '@/lib/data-dictionary'
import type { TranslationKey } from '@/i18n/translations'

type FilterOp = 'contains' | 'equals' | 'not_equals' | 'starts_with' | 'gt' | 'lt' | 'not_empty' | 'empty'

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

function humanize(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getFieldLabel(name: string, lang: string): string {
  const d = DICT_BY_NAME.get(name)
  if (!d) return humanize(name)
  if (lang === 'th') {
    return d.th_label || d.label
  }
  return d.label
}

function describeFilter(f: Filter, t: any, lang: string): string {
  const op = OPERATORS.find(o => o.value === f.op)
  const label = op ? t(op.labelKey) : f.op
  const fieldLabel = getFieldLabel(f.field, lang)
  return op?.noValue ? `${fieldLabel} ${label}` : `${fieldLabel} ${label} “${f.value}”`
}

function getQueryDescription(
  query: { search: string; filters: Filter[]; dateFrom?: string; dateTo?: string },
  t: any,
  lang: string
): string {
  const activeConditions = query.filters.filter(f => f.field)
  const parts: string[] = []

  if (activeConditions.length > 0) {
    parts.push(
      activeConditions.map(f => describeFilter(f, t, lang)).join(', ')
    )
  }

  if (query.search) {
    const keywordText = `${t('data.keyword')} “${query.search}”`
    parts.push(keywordText)
  }

  if (query.dateFrom || query.dateTo) {
    const dateText = query.dateFrom && query.dateTo
      ? t('data.betweenDates', { a: query.dateFrom, b: query.dateTo })
      : query.dateFrom
        ? t('data.onAfter', { d: query.dateFrom })
        : t('data.onBefore', { d: query.dateTo })
    parts.push(`${t('data.added')} ${dateText}`)
  }

  if (parts.length === 0) {
    return t('insights.wholeData')
  }

  const separator = lang === 'th' ? ' และ ' : ' and '
  if (parts.length <= 2) {
    return parts.join(separator)
  } else {
    const last = parts[parts.length - 1]
    const rest = parts.slice(0, -1).join(', ')
    return `${rest}${separator}${last}`
  }
}

// Build and download the wood-metric table as CSV: thai_name, scientific_name, ρ, form_factor.
// A UTF-8 BOM is prepended so Excel renders the Thai names correctly.
function downloadMetricCsv() {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ['thai_name', 'scientific_name', 'density_g_cm3', 'form_factor_f']
  const lines = [
    header.join(','),
    ...WOOD_MATRIC.species.map(s => [esc(s.thai_name), esc(s.scientific_name), s.density, s.form_factor].join(',')),
  ]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wood-matric-${WOOD_MATRIC.version}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface CategoryCount { label: string; count: number }
interface Insights {
  total: number
  distinctSpecies: number
  distinctPlots: number
  avgGbhCm: number | null
  avgHeightM: number | null
  byObservationType: CategoryCount[]
  topSpecies: CategoryCount[]
  bySizeClass: CategoryCount[]
  byLiveDead: CategoryCount[]
  heightHistogram: CategoryCount[]
  topPlots: CategoryCount[]
  gbhHistogram: CategoryCount[]
}

interface BiomassGroup {
  label: string
  trees: number
  komiAgbSum: number; komiAgbAvg: number
  komiTotalSum: number; komiTotalAvg: number
  chaveSum: number; chaveAvg: number
  woodVolumeSum: number; woodVolumeAvg: number
}
interface Biomass {
  trees: number
  defaultDensity: number
  densityVersion: string
  densityReviewed: boolean
  defaultFormFactor: number
  formFactorVersion: string
  formFactorReviewed: boolean
  densityMatchedFrac: number
  grandKomiAgb: number
  grandKomiTotal: number
  grandChave: number
  grandWoodVolume: number
  bySpecies: BiomassGroup[]
  byProject: BiomassGroup[]
  byPlot: BiomassGroup[]
}

type Equation = 'komiAgb' | 'komiTotal' | 'chave' | 'volume'

interface Filter { field: string; op: string; value: string }

interface InsightsModalProps {
  open: boolean
  onClose: () => void
  query: { search: string; filters: Filter[]; dateFrom?: string; dateTo?: string }
  defaultTab?: 'overview' | 'biomass'
}

// Firefly-green through sand-amber — the app's two accent hues plus supporting tones.
const PALETTE = ['#A8CC3A', '#C4956A', '#7CC6A6', '#E0B15E', '#8FA8E0', '#D98B8B', '#6FB8CF', '#B48CD1']
const AXIS = 'rgba(255,255,255,0.45)'
const GRID = 'rgba(255,255,255,0.06)'
const CARBON_FRACTION = 0.47

function fmt(n: number | null, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: digits })
}

/** Sum + average of the plotted bars — shown as a caption under every chart. */
function chartStats(data: CategoryCount[]): { sum: number; avg: number } {
  if (!data.length) return { sum: 0, avg: 0 }
  const sum = data.reduce((a, d) => a + d.count, 0)
  return { sum, avg: sum / data.length }
}

function ChartTooltip({ active, payload, label, unit }: {
  active?: boolean; payload?: { value?: number | string; name?: string }[]; label?: string; unit?: string
}) {
  const { t } = useI18n()
  if (!active || !payload?.length) return null
  const v = Number(payload[0]?.value)
  const isVolume = unit === 'm³'
  return (
    <div className="rounded-sm border border-[rgba(255,255,255,0.12)] bg-[#0A0A10] px-3 py-2 text-[12px] text-neutral shadow-xl">
      <div className="font-semibold">{label ?? payload[0]?.name}</div>
      <div className="text-coral">
        {unit
          ? (isVolume ? `${fmt(v, 4)} m³ (${fmt(v * 1000000, 0)} cm³)` : `${fmt(v)} ${unit}`)
          : t('insights.tooltipRecords', { n: v.toLocaleString() })}
      </div>
    </div>
  )
}

function Panel({ title, subtitle, stats, unit, children }: {
  title: string; subtitle?: string; stats?: { sum: number; avg: number }; unit?: string; children: React.ReactNode
}) {
  const { t } = useI18n()
  const isVolume = unit === 'm³'
  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0d0d14] p-4">
      <div className="mb-3">
        <h4 className="text-[12px] uppercase tracking-widest font-semibold text-coral/90">{title}</h4>
        {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
      {stats && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] text-[11px]">
          <span className="text-muted">
            {t('insights.chartSum')}: <span className="text-neutral font-semibold tabular-nums">
              {isVolume ? `${fmt(stats.sum, 3)} m³` : `${fmt(stats.sum)}${unit ? ` ${unit}` : ''}`}
            </span>
          </span>
          <span className="text-muted">
            {t('insights.chartAvg')}: <span className="text-neutral font-semibold tabular-nums">
              {isVolume ? `${fmt(stats.avg, 4)} m³ (${fmt(stats.avg * 1000000, 0)} cm³)` : `${fmt(stats.avg)}${unit ? ` ${unit}` : ''}`}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0d0d14] px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className="text-[20px] font-semibold text-neutral mt-1 tabular-nums">{value}</div>
    </div>
  )
}

// Horizontal bar list — best for long category labels (species, plots).
function HBar({ data, unit }: { data: CategoryCount[]; unit?: string }) {
  const height = Math.max(140, data.length * 30 + 20)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} allowDecimals={!!unit} />
        <YAxis
          type="category" dataKey="label" width={130}
          tick={{ fill: AXIS, fontSize: 11 }} interval={0}
        />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="count" radius={[0, 3, 3, 0]}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function VBar({ data, unit }: { data: CategoryCount[]; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} interval={0} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} allowDecimals={!!unit} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function Donut({ data }: { data: CategoryCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data} dataKey="count" nameKey="label"
          cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2}
        >
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="#0d0d14" />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: AXIS }}
          formatter={(v) => <span style={{ color: AXIS }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function InsightsModal({ open, onClose, query, defaultTab = 'biomass' }: InsightsModalProps) {
  const { t, lang } = useI18n()
  const [tab, setTab] = useState<'overview' | 'biomass'>(defaultTab)

  useEffect(() => {
    if (open) {
      setTab(defaultTab)
    }
  }, [open, defaultTab])

  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [biomass, setBiomass] = useState<Biomass | null>(null)
  const [bmLoading, setBmLoading] = useState(false)
  const [bmError, setBmError] = useState('')

  const [equation, setEquation] = useState<Equation>('komiAgb')
  const [carbon, setCarbon] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExportImage = async () => {
    const { toPng } = await import('html-to-image')
    const containerId = tab === 'overview' ? 'overview-charts-container' : 'biomass-charts-container'
    const node = document.getElementById(containerId)
    if (!node) return

    setExporting(true)
    setTimeout(() => {
      toPng(node, {
        backgroundColor: '#0A0A10',
        style: {
          padding: '24px',
          borderRadius: '8px',
        },
      })
        .then(async dataUrl => {
          const link = document.createElement('a')
          link.download = `tree-census-insights-${tab}-${new Date().toISOString().slice(0, 10)}.png`
          link.href = dataUrl
          link.click()

          // Success: Log the export event as 1 file with 1 record
          await fetch('/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'data.export',
              meta: {
                recordsCount: 1,
                format: 'png',
              },
            }),
          }).catch(err => console.error('[audit] chart export log failed:', err))
        })
        .catch(err => {
          console.error('Failed to export charts:', err)
        })
        .finally(() => {
          setExporting(false)
        })
    }, 150)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Reset to the overview tab and clear both datasets whenever the query changes.
  useEffect(() => {
    if (!open) return
    setTab('biomass')
    setBiomass(null); setBmError('')
    let cancelled = false
    setLoading(true); setError(''); setData(null)
    fetch('/api/data/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search: query.search,
        filters: query.filters.filter(f => f.field),
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        lang,
      }),
    })
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        if (j.error) throw new Error(j.error)
        setData(j.data)
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : t('insights.loadFailed')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- error text uses the language active at load time
  }, [open, query.search, JSON.stringify(query.filters), query.dateFrom, query.dateTo, lang])

  // Biomass is fetched lazily the first time the tab is opened for this query.
  useEffect(() => {
    if (!open || tab !== 'biomass' || biomass || bmLoading) return
    let cancelled = false
    setBmLoading(true); setBmError('')
    fetch('/api/data/biomass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search: query.search,
        filters: query.filters.filter(f => f.field),
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        lang,
      }),
    })
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        if (j.error) throw new Error(j.error)
        setBiomass(j.data)
      })
      .catch(e => { if (!cancelled) setBmError(e instanceof Error ? e.message : t('biomass.loadFailed')) })
      .finally(() => { if (!cancelled) setBmLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, query.search, JSON.stringify(query.filters), query.dateFrom, query.dateTo, lang])

  // Pick the active equation's per-group sum, scaled by the carbon fraction.
  const scale = (equation !== 'volume' && carbon) ? CARBON_FRACTION : 1
  const groupValue = (g: BiomassGroup): number => {
    if (equation === 'volume') return g.woodVolumeSum
    return (equation === 'komiAgb' ? g.komiAgbSum : equation === 'komiTotal' ? g.komiTotalSum : g.chaveSum) * scale
  }

  const toCat = (groups: BiomassGroup[] | undefined): CategoryCount[] =>
    (groups ?? []).map(g => ({ label: g.label, count: groupValue(g) }))

  const bmSpecies = useMemo(() => toCat(biomass?.bySpecies), [biomass, equation, carbon]) // eslint-disable-line react-hooks/exhaustive-deps
  const bmProject = useMemo(() => toCat(biomass?.byProject), [biomass, equation, carbon]) // eslint-disable-line react-hooks/exhaustive-deps
  const bmPlot = useMemo(() => toCat(biomass?.byPlot), [biomass, equation, carbon]) // eslint-disable-line react-hooks/exhaustive-deps

  const grandTotal = biomass
    ? (equation === 'volume'
        ? biomass.grandWoodVolume
        : (equation === 'komiAgb' ? biomass.grandKomiAgb : equation === 'komiTotal' ? biomass.grandKomiTotal : biomass.grandChave) * scale)
    : 0
  const metricWord = equation === 'volume'
    ? t('biomass.metricVolume')
    : (carbon ? t('biomass.metricCarbon') : t('biomass.metricBiomass'))
  const unit = equation === 'volume' ? t('biomass.unitM3') : t('biomass.unitKg')

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="dark fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-lg border border-[rgba(255,255,255,0.10)] shadow-2xl my-auto"
        style={{ background: '#0A0A10' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[rgba(255,255,255,0.08)] rounded-t-lg" style={{ background: '#0A0A10' }}>
          <div className="flex items-center justify-between px-6 pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-coral" />
              <h3 className="text-[14px] font-semibold text-neutral">{t('insights.title')}</h3>
              {data && (
                <span className="text-[12px] text-muted max-w-lg truncate" title={getQueryDescription(query, t, lang)}>
                  — {getQueryDescription(query, t, lang)} ({t('insights.recordsInView', { n: data.total.toLocaleString() }).replace(/^[—\s]*/, '')})
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-muted hover:text-neutral transition-colors" aria-label={t('common.close')}>
              <X size={18} />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex items-center justify-between px-6 mt-3">
            <div className="flex gap-1">
              {([
                { key: 'biomass' as const, label: t('insights.tabBiomass'), icon: Leaf },
                { key: 'overview' as const, label: t('insights.tabOverview'), icon: BarChart3 },
              ]).map(tb => (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  className={
                    'flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors ' +
                    (tab === tb.key
                      ? 'border-coral text-coral'
                      : 'border-transparent text-muted hover:text-neutral')
                  }
                >
                  <tb.icon size={13} /> {tb.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportImage}
              disabled={exporting || (tab === 'overview' ? (loading || !data || data.total === 0) : (bmLoading || !biomass || biomass.trees === 0))}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-muted hover:text-neutral disabled:opacity-40 disabled:hover:text-muted transition-colors -mb-px"
            >
              {exporting ? (
                <span className="w-3.5 h-3.5 border border-muted border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={13} />
              )}
              {exporting ? (lang === 'th' ? 'กำลังส่งออก…' : 'Exporting…') : t('insights.exportChart')}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* ── Overview tab ──────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <>
              {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <span className="w-7 h-7 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                  <p className="text-[13px] text-muted">{t('insights.crunching')}</p>
                </div>
              )}
              {error && !loading && <p className="text-[13px] text-rose py-12 text-center">{error}</p>}
              {data && !loading && data.total === 0 && (
                <p className="text-[13px] text-muted py-12 text-center">{t('insights.noRecords')}</p>
              )}
              {data && !loading && data.total > 0 && (
                <div id="overview-charts-container" className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <StatTile
                      label={`${t('insights.records')} (${getQueryDescription(query, t, lang)})`}
                      value={data.total.toLocaleString()}
                    />
                    <StatTile label={t('insights.distinctSpecies')} value={data.distinctSpecies.toLocaleString()} />
                    <StatTile label={t('insights.distinctPlots')} value={data.distinctPlots.toLocaleString()} />
                    <StatTile label={t('insights.avgGbh')} value={fmt(data.avgGbhCm)} />
                    <StatTile label={t('insights.avgHeight')} value={fmt(data.avgHeightM)} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {data.byObservationType.length > 0 && (
                      <Panel title={t('insights.obsTypes')} subtitle={t('insights.obsTypesSub')} stats={chartStats(data.byObservationType)}>
                        <Donut data={data.byObservationType} />
                      </Panel>
                    )}
                    {data.topSpecies.length > 0 && (
                      <Panel title={t('insights.topSpecies')} subtitle={t('insights.topSpeciesSub')} stats={chartStats(data.topSpecies)}>
                        <HBar data={data.topSpecies} />
                      </Panel>
                    )}
                    {data.gbhHistogram.length > 0 && (
                      <Panel title={t('insights.gbhDist')} subtitle={t('insights.gbhDistSub')} stats={chartStats(data.gbhHistogram)}>
                        <VBar data={data.gbhHistogram} />
                      </Panel>
                    )}
                    {data.byLiveDead.length > 0 && (
                      <Panel title={t('insights.liveDead')} subtitle={t('insights.liveDeadSub')} stats={chartStats(data.byLiveDead)}>
                        <Donut data={data.byLiveDead} />
                      </Panel>
                    )}
                    {data.bySizeClass.length > 0 && (
                      <Panel title={t('insights.sizeClasses')} subtitle={t('insights.sizeClassesSub')} stats={chartStats(data.bySizeClass)}>
                        <VBar data={data.bySizeClass} />
                      </Panel>
                    )}
                    {data.heightHistogram.length > 0 && (
                      <Panel title={t('dash.heightDist')} subtitle={t('dash.heightDistSub')} stats={chartStats(data.heightHistogram)}>
                        <VBar data={data.heightHistogram} />
                      </Panel>
                    )}
                    {data.topPlots.length > 0 && (
                      <Panel title={t('insights.recordsPerPlot')} subtitle={t('insights.recordsPerPlotSub')} stats={chartStats(data.topPlots)}>
                        <HBar data={data.topPlots} />
                      </Panel>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Biomass tab ───────────────────────────────────────────────── */}
          {tab === 'biomass' && (
            <>
              {bmLoading && (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <span className="w-7 h-7 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                  <p className="text-[13px] text-muted">{t('insights.crunching')}</p>
                </div>
              )}
              {bmError && !bmLoading && <p className="text-[13px] text-rose py-12 text-center">{bmError}</p>}
              {biomass && !bmLoading && biomass.trees === 0 && (
                <p className="text-[13px] text-muted py-12 text-center">{t('biomass.noTrees')}</p>
              )}
              {biomass && !bmLoading && biomass.trees > 0 && (
                <div id="biomass-charts-container" className="flex flex-col gap-5">
                  {/* Formula & method — the equation/carbon controls live here */}
                  <FormulaPanel
                    equation={equation} setEquation={setEquation}
                    carbon={carbon} setCarbon={setCarbon}
                    biomass={biomass}
                  />

                  {/* Summary tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatTile label={t('biomass.treeStems')} value={biomass.trees.toLocaleString()} />
                    <StatTile
                      label={t('biomass.totalBiomass', { metric: metricWord })}
                      value={equation === 'volume' ? `${fmt(grandTotal, 3)} m³` : `${fmt(grandTotal)} ${unit}`}
                    />
                    <StatTile
                      label={t('biomass.avgPerTree')}
                      value={
                        equation === 'volume'
                          ? (() => {
                              const avg = biomass.trees ? grandTotal / biomass.trees : 0
                              return `${fmt(avg, 4)} m³ (${fmt(avg * 1000000, 0)} cm³)`
                            })()
                          : `${fmt(biomass.trees ? grandTotal / biomass.trees : 0)} ${unit}`
                      }
                    />
                    <StatTile label={t('insights.distinctSpecies')} value={biomass.bySpecies.length.toLocaleString()} />
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {bmSpecies.length > 0 && (
                      <Panel title={t('biomass.bySpecies')} subtitle={t('biomass.bySpeciesSub', { metric: metricWord })} stats={chartStats(bmSpecies)} unit={unit}>
                        <HBar data={bmSpecies} unit={unit} />
                      </Panel>
                    )}
                    {bmProject.length > 0 && (
                      <Panel title={t('biomass.byProject')} subtitle={t('biomass.byProjectSub', { metric: metricWord })} stats={chartStats(bmProject)} unit={unit}>
                        <HBar data={bmProject} unit={unit} />
                      </Panel>
                    )}
                    {bmPlot.length > 0 && (
                      <Panel title={t('biomass.byPlot')} subtitle={t('biomass.byPlotSub', { metric: metricWord })} stats={chartStats(bmPlot)} unit={unit}>
                        <HBar data={bmPlot} unit={unit} />
                      </Panel>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function FormulaPanel({ equation, setEquation, carbon, setCarbon, biomass }: {
  equation: Equation
  setEquation: (e: Equation) => void
  carbon: boolean
  setCarbon: (b: boolean) => void
  biomass: Biomass
}) {
  const { t } = useI18n()
  const EQ_OPTIONS: { key: Equation; label: string; formula: string }[] = [
    { key: 'komiAgb', label: t('biomass.eqKomiAgb'), formula: t('biomass.eqKomiAgbF') },
    { key: 'komiTotal', label: t('biomass.eqKomiTotal'), formula: t('biomass.eqKomiTotalF') },
    { key: 'chave', label: t('biomass.eqChave'), formula: t('biomass.eqChaveF') },
    { key: 'volume', label: t('biomass.eqVolume'), formula: t('biomass.eqVolumeF') },
  ]
  const activeFormula = EQ_OPTIONS.find(e => e.key === equation)?.formula ?? ''
  const matchPct = Math.round(biomass.densityMatchedFrac * 100)

  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0d0d14] p-4">
      <h4 className="text-[12px] uppercase tracking-widest font-semibold text-coral/90 mb-3">{t('biomass.method')}</h4>

      {/* Equation radios + carbon checkbox */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[11px] text-muted uppercase tracking-widest mr-1">{t('biomass.equation')}:</span>
        {EQ_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setEquation(opt.key)}
            className={
              'px-3 py-1.5 rounded-sm text-[12px] font-medium border transition-colors ' +
              (equation === opt.key
                ? 'bg-coral/15 text-coral border-coral/30'
                : 'text-muted border-dim hover:text-neutral hover:bg-ghost')
            }
          >
            {opt.label}
          </button>
        ))}
        {equation !== 'volume' && (
          <label className="flex items-center gap-1.5 ml-2 text-[12px] text-muted cursor-pointer select-none">
            <input type="checkbox" checked={carbon} onChange={e => setCarbon(e.target.checked)} className="accent-coral" />
            {t('biomass.addCarbon')}
          </label>
        )}
      </div>

      {/* Active formula */}
      <div className="rounded-sm bg-[#0A0A10] border border-dim px-3.5 py-2.5 font-mono text-[12.5px] text-neutral">
        {activeFormula}
        {equation !== 'volume' && carbon && <div className="text-coral/90 mt-1">{t('biomass.carbonF')}</div>}
      </div>

      {/* Symbols / where the numbers come from */}
      <p className="text-[11px] uppercase tracking-widest text-muted mt-4 mb-2">{t('biomass.symbols')}</p>
      <ul className="flex flex-col gap-1.5 text-[12px] text-muted leading-relaxed">
        <li>{t('biomass.symD')}</li>
        {equation !== 'volume' && (
          <li>
            {t('biomass.symRho', { d: biomass.defaultDensity })}{' '}
            <button
              type="button"
              onClick={downloadMetricCsv}
              className="text-coral underline underline-offset-2 hover:text-coral/80 transition-colors"
            >
              {t('biomass.downloadDensity')}
            </button>
          </li>
        )}
        {equation === 'volume' && (
          <li>
            {t('biomass.symF', { f: biomass.defaultFormFactor })}{' '}
            <button
              type="button"
              onClick={downloadMetricCsv}
              className="text-coral underline underline-offset-2 hover:text-coral/80 transition-colors"
            >
              {t('biomass.downloadDensity')}
            </button>
          </li>
        )}
        {(equation === 'chave' || equation === 'volume') && <li>{t('biomass.symH')}</li>}
        {equation === 'volume' && <li>{t('biomass.symVolume')}</li>}
        {equation !== 'volume' && carbon && <li>{t('biomass.symCarbon')}</li>}
      </ul>

      {/* Provenance / provisional warning */}
      <div className="mt-4 flex flex-col gap-1 text-[11px]">
        <p className="text-amber-500/90">{t('biomass.provisional', { v: biomass.densityVersion })}</p>
        <p className="text-muted">{t('biomass.densityMatch', { p: matchPct, d: biomass.defaultDensity })}</p>
      </div>
    </div>
  )
}
