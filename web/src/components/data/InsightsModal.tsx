'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { X, BarChart3 } from 'lucide-react'

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
  byCrownCondition: CategoryCount[]
  topPlots: CategoryCount[]
  gbhHistogram: CategoryCount[]
}

interface Filter { field: string; op: string; value: string }

interface InsightsModalProps {
  open: boolean
  onClose: () => void
  query: { search: string; filters: Filter[] }
}

// Firefly-green through sand-amber — the app's two accent hues plus supporting tones.
const PALETTE = ['#A8CC3A', '#C4956A', '#7CC6A6', '#E0B15E', '#8FA8E0', '#D98B8B', '#6FB8CF', '#B48CD1']
const AXIS = 'rgba(255,255,255,0.45)'
const GRID = 'rgba(255,255,255,0.06)'

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value?: number | string; name?: string }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-sm border border-[rgba(255,255,255,0.12)] bg-[#0A0A10] px-3 py-2 text-[12px] text-neutral shadow-xl">
      <div className="font-semibold">{label ?? payload[0]?.name}</div>
      <div className="text-coral">{Number(payload[0]?.value).toLocaleString()} records</div>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0d0d14] p-4">
      <div className="mb-3">
        <h4 className="text-[12px] uppercase tracking-widest font-semibold text-coral/90">{title}</h4>
        {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
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
function HBar({ data }: { data: CategoryCount[] }) {
  const height = Math.max(140, data.length * 30 + 20)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} allowDecimals={false} />
        <YAxis
          type="category" dataKey="label" width={130}
          tick={{ fill: AXIS, fontSize: 11 }} interval={0}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="count" radius={[0, 3, 3, 0]}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function VBar({ data }: { data: CategoryCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} interval={0} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
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

function fmt(n: number | null, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: digits })
}

export function InsightsModal({ open, onClose, query }: InsightsModalProps) {
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true); setError(''); setData(null)
    fetch('/api/data/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search: query.search, filters: query.filters.filter(f => f.field) }),
    })
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        if (j.error) throw new Error(j.error)
        setData(j.data)
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load insights') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, query])

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
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.08)] rounded-t-lg" style={{ background: '#0A0A10' }}>
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-coral" />
            <h3 className="text-[14px] font-semibold text-neutral">Data Insight</h3>
            {data && (
              <span className="text-[12px] text-muted">
                — {data.total.toLocaleString()} records in current view
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-muted hover:text-neutral transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <span className="w-7 h-7 border-2 border-muted border-t-transparent rounded-full animate-spin" />
              <p className="text-[13px] text-muted">Crunching the filtered records…</p>
            </div>
          )}

          {error && !loading && (
            <p className="text-[13px] text-rose py-12 text-center">{error}</p>
          )}

          {data && !loading && data.total === 0 && (
            <p className="text-[13px] text-muted py-12 text-center">No records in the current view to summarize.</p>
          )}

          {data && !loading && data.total > 0 && (
            <div className="flex flex-col gap-5">
              {/* Summary tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatTile label="Records" value={data.total.toLocaleString()} />
                <StatTile label="Distinct species" value={data.distinctSpecies.toLocaleString()} />
                <StatTile label="Distinct plots" value={data.distinctPlots.toLocaleString()} />
                <StatTile label="Avg GBH (cm)" value={fmt(data.avgGbhCm)} />
                <StatTile label="Avg height (m)" value={fmt(data.avgHeightM)} />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.byObservationType.length > 0 && (
                  <Panel title="Observation types" subtitle="Records by observation_type">
                    <Donut data={data.byObservationType} />
                  </Panel>
                )}
                {data.topSpecies.length > 0 && (
                  <Panel title="Top species" subtitle="Most-recorded species (top 12)">
                    <HBar data={data.topSpecies} />
                  </Panel>
                )}
                {data.gbhHistogram.length > 0 && (
                  <Panel title="GBH distribution" subtitle="Tree stems by girth-at-breast-height (cm)">
                    <VBar data={data.gbhHistogram} />
                  </Panel>
                )}
                {data.byLiveDead.length > 0 && (
                  <Panel title="Live / dead" subtitle="Tree stems by vitality">
                    <Donut data={data.byLiveDead} />
                  </Panel>
                )}
                {data.bySizeClass.length > 0 && (
                  <Panel title="Size classes" subtitle="Tree stems by size_class_code">
                    <VBar data={data.bySizeClass} />
                  </Panel>
                )}
                {data.byCrownCondition.length > 0 && (
                  <Panel title="Crown condition" subtitle="Tree stems by crown_condition_code">
                    <VBar data={data.byCrownCondition} />
                  </Panel>
                )}
                {data.topPlots.length > 0 && (
                  <Panel title="Records per plot" subtitle="Busiest plots (top 12)">
                    <HBar data={data.topPlots} />
                  </Panel>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
