'use client'

import { useEffect, useState, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const LeafletMapCanvas = dynamic(
  () => import('./LeafletMapCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="relative rounded-md border border-dim overflow-hidden bg-[#0A0A10] flex items-center justify-center text-muted text-[13px]" style={{ height: 320 }}>
        <span className="w-6 h-6 border-2 border-coral border-t-transparent rounded-full animate-spin mr-2" />
        Loading GIS Map...
      </div>
    )
  }
)

import { TopBar } from '@/components/layout/TopBar'
import { StatCard } from '@/components/portal/StatCard'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { Badge } from '@/components/ui/Badge'
import { TreePine, MapPin, Leaf, Scale, Maximize, Minimize, FileCheck } from 'lucide-react'
import { useI18n } from '@/context/LanguageContext'
import { provinceCoords } from '@/lib/thai-provinces'
import type { TranslationKey } from '@/i18n/translations'
import type { DashboardStats, PlotLocation } from '@/types'
import FIELD_DICTIONARY from '@/data/field-dictionary.json'
import IUCN_DATA from '@/data/iucn.json'

interface ActivityStats {
  latestAccessEmail: string
  latestAccessTime: string
  totalLogins: number
  totalQueries: number
  exportedFiles: number
  exportedRecords: number
  approvedFlags: number
}

interface DashboardContentProps {
  stats: DashboardStats
  activityStats: ActivityStats
  plots: PlotLocation[]
  typeCounts: { type: string; count: number }[]
  iucnCounts: { code: string; count: number }[]
  connected: boolean
}

const TYPE_KEYS: Record<string, TranslationKey> = {
  tree_stem: 'type.tree_stem',
  seedling: 'type.seedling',
  woody_debris: 'type.woody_debris',
}

const SYSTEM_STATUS = (connected: boolean): { label: TranslationKey; ok: boolean }[] => [
  { label: 'dash.statusBigQuery', ok: connected },
  { label: 'dash.statusZoho', ok: false },
  { label: 'dash.statusIngestion', ok: false },
]

// ─── Cards ────────────────────────────────────────────────────────────────────

function CoreStatsRow({ stats, onPlotsIconClick, plots, typeCounts }: { stats: DashboardStats; onPlotsIconClick?: () => void; plots: PlotLocation[]; typeCounts: { type: string; count: number }[] }) {
  const { t, lang } = useI18n()
  const router = useRouter()
  const gpsCount = plots.filter(p => p.lat != null && p.lng != null).length
  const noGpsCount = plots.filter(p => p.lat == null || p.lng == null).length
  const seedlingCount = typeCounts.find(t => t.type === 'seedling')?.count ?? 0
  const woodyDebrisCount = typeCounts.find(t => t.type === 'woody_debris')?.count ?? 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label={t('dash.treeStems')}
        value={stats.totalTrees}
        sub={t('dash.treeStemsSub', {
          seedling: seedlingCount.toLocaleString(),
          woodyDebris: woodyDebrisCount.toLocaleString()
        })}
        icon={<TreePine size={16} />}
        accent="coral"
        options={[
          { label: t('type.tree_stem'), onClick: () => router.push('/data?field=observation_type&op=equals&value=tree_stem') },
          { label: t('type.seedling'), onClick: () => router.push('/data?field=observation_type&op=equals&value=seedling') },
          { label: t('type.woody_debris'), onClick: () => router.push('/data?field=observation_type&op=equals&value=woody_debris') },
        ]}
      />
      <StatCard
        label={t('dash.plots')}
        value={stats.totalSites}
        sub={t('dash.plotsSub', { gps: gpsCount.toLocaleString(), noGps: noGpsCount.toLocaleString() })}
        icon={<MapPin size={16} />}
        accent="violet"
        onIconClick={onPlotsIconClick}
      />
      <StatCard
        label={t('dash.species')}
        value={stats.totalSpecies}
        sub={t('dash.speciesSub')}
        icon={<Leaf size={16} />}
        options={(() => {
          const isTh = lang === 'th'
          const field = isTh ? 'thai_name' : 'scientific_name'
          const list = (FIELD_DICTIONARY.fields as Record<string, string[]>)[field] || []
          return list.slice(0, 10).map(name => ({
            label: name,
            onClick: () => router.push(`/data?field=${field}&op=equals&value=${encodeURIComponent(name)}`)
          }))
        })()}
      />
      <StatCard
        label={t('dash.biomass')}
        value={`${Math.round(stats.totalBiomass).toLocaleString()} kg`}
        sub={t('dash.biomassSub')}
        icon={<Scale size={16} />}
        onIconClick={() => router.push('/data?insights=biomass')}
      />
    </div>
  )
}

function SystemStatusCard({ connected, stats }: { connected: boolean; stats: DashboardStats }) {
  const { t } = useI18n()
  return (
    <MangroveCard variant="sand">
      <h2 className="text-[14px] font-semibold text-neutral mb-5">{t('dash.systemStatus')}</h2>
      <div className="flex flex-col gap-3">
        {SYSTEM_STATUS(connected).map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-[13px] text-muted">{t(item.label)}</span>
            <Badge variant={item.ok ? 'success' : 'warning'}>{item.ok ? t('dash.connected') : t('dash.setupNeeded')}</Badge>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted/50 mt-5">{t('dash.lastSubmission', { t: stats.lastSyncAt })}</p>
    </MangroveCard>
  )
}

function ActivityRailCard({ activityStats, submissions }: { activityStats: ActivityStats; submissions: number }) {
  const { t } = useI18n()
  const rows: { label: TranslationKey; value: string }[] = [
    { label: 'dash.submissions', value: submissions.toLocaleString() },
    { label: 'dash.totalLogins', value: activityStats.totalLogins.toLocaleString() },
    { label: 'dash.filteredQueries', value: activityStats.totalQueries.toLocaleString() },
    { label: 'dash.dataExports', value: `${activityStats.exportedFiles} files` },
    { label: 'dash.dataVerified', value: `${activityStats.approvedFlags} records` },
  ]
  return (
    <MangroveCard variant="sand">
      <h2 className="text-[14px] font-semibold text-neutral mb-5">{t('dash.portalActivity')}</h2>
      <div className="flex flex-col gap-3">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-[13px] text-muted">{t(row.label)}</span>
            <span className="text-[13px] font-semibold text-neutral">{row.value}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted/50 mt-5">
        {t('dash.recordsExported', { n: activityStats.exportedRecords.toLocaleString() })}
      </p>
    </MangroveCard>
  )
}



function ConservationStatusCard({ iucnCounts }: { iucnCounts: { code: string; count: number }[] }) {
  const { t } = useI18n()
  const total = iucnCounts.reduce((sum, item) => sum + item.count, 0)
  const statusMap = new Map(IUCN_DATA.map(d => [d.code.toUpperCase(), d]))
  
  const order = ['CR', 'EN', 'NT', 'LC', 'DD']
  const sortedCounts = [...iucnCounts].sort((a, b) => {
    const idxA = order.indexOf(a.code.toUpperCase())
    const idxB = order.indexOf(b.code.toUpperCase())
    if (idxA === -1 && idxB === -1) return b.count - a.count
    if (idxA === -1) return 1
    if (idxB === -1) return -1
    return idxA - idxB
  })

  return (
    <MangroveCard variant="sand">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[14px] font-semibold text-neutral">{t('dash.iucnStatus')}</h2>
        {total > 0 && <Badge variant="default">{t('dash.totalBadge', { n: total.toLocaleString() })}</Badge>}
      </div>
      <p className="text-[11px] text-muted/60 mb-4">{t('dash.iucnStatusSub')}</p>
      {sortedCounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted text-[13px] gap-2">
          <Leaf size={28} className="opacity-30" />
          <p>{t('dash.noIucnData')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedCounts.map(item => {
            const pct = total > 0 ? (item.count / total) * 100 : 0
            const codeUpper = item.code.toUpperCase()
            const meta = statusMap.get(codeUpper)
            const color = meta?.color ?? '#757575'
            const labelNode = meta ? (
              <span>
                {meta.status} <span style={{ color }} className="font-semibold">({meta.code})</span>
              </span>
            ) : (
              <span style={{ color }} className="font-semibold">{item.code}</span>
            )

            return (
              <div key={item.code} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral font-medium">{labelNode}</span>
                  <span className="text-muted">{t('dash.iucnTrees', { n: item.count.toLocaleString() })} · {pct.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-ghost overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ width: `${pct}%`, backgroundColor: color }} 
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </MangroveCard>
  )
}

// ─── Firefly plot maps ────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0 }
  return h
}

interface MapPoint {
  plotId: string
  tooltip: string
  lat: number
  lng: number
  treeCount: number
  iucnCodes?: string
}

// Exit fullscreen with Escape — same behaviour as the data-page table.
function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onClose])
}

function FullscreenWrap({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      className={active ? 'fixed inset-0 z-50 overflow-y-auto p-6' : ''}
      style={active ? { background: 'var(--c-bg)' } : undefined}
    >
      {children}
    </div>
  )
}

function FullscreenButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const { t } = useI18n()
  const label = active ? t('data.exitFullscreen') : t('data.fullscreen')
  return (
    <button
      type="button"
      onClick={onToggle}
      className="p-1.5 text-dark hover:text-light-500 transition-colors rounded-sm hover:bg-ghost"
      title={label}
      aria-label={label}
    >
      {active ? <Minimize size={16} /> : <Maximize size={16} />}
    </button>
  )
}

// Legacy MapCanvas removed in favor of dynamic LeafletMapCanvas

function plotTooltip(p: PlotLocation, stems: string): string {
  return `${p.projectNo ? `${p.projectNo} · ` : ''}${p.plotId} — ${stems}`
}

function FireflyMapCard({ plots }: { plots: PlotLocation[] }) {
  const { t } = useI18n()
  const [fullscreen, setFullscreen] = useState(false)
  useEscape(fullscreen, () => setFullscreen(false))
  const gps = plots.filter(p => p.lat != null && p.lng != null)

  return (
    <FullscreenWrap active={fullscreen}>
      <MangroveCard
        variant="tintLen1"
        theme="dark"
        className={fullscreen ? 'min-h-full' : ''}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[14px] font-semibold text-dark">{t('dash.plotMap')}</h2>
          <div className="flex items-center gap-2">
            {gps.length > 0 && (
              <Badge variant="youngleaf">
                {t('dash.plotMapSub', { n: gps.length.toLocaleString() })}
              </Badge>
            )}
            <FullscreenButton active={fullscreen} onToggle={() => setFullscreen(f => !f)} />
          </div>
        </div>

        {gps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted text-[13px] gap-2">
            <MapPin size={28} className="opacity-30" />
            <p>{t('dash.plotMapEmpty')}</p>
            <p className="text-[12px] opacity-60">{t('dash.plotMapEmptyHint')}</p>
          </div>
        ) : (
          <>
            <LeafletMapCanvas
              height={fullscreen ? 'calc(100vh - 220px)' : 380}
              color="#c0ff04ff"
              points={gps.map(p => ({
                plotId: p.plotId,
                lat: p.lat!,
                lng: p.lng!,
                treeCount: p.treeCount,
                iucnCodes: p.iucnCodes,
                tooltip: plotTooltip(p, t('dash.plotStems', { n: p.treeCount.toLocaleString() })),
              }))}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-[11px] text-dark border-t border-white/10 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-coral/70 border border-black shrink-0" />
                <span className="w-3.5 h-3.5 rounded-full bg-coral/70 border border-black shrink-0" />
                <span>{t('dash.plotMapLegend')}</span>
              </div>
              <div className="h-3 w-[1px] bg-white/20 hidden md:block" />
              <div className="flex items-center gap-2">
                <span className="text-muted/80">{t('dash.iucnLegend')}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D32F2F] shrink-0" /> CR</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#E65100] shrink-0" /> EN</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FBC02D] shrink-0" /> NT</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#757575] shrink-0" /> DD</span>
                </div>
              </div>
            </div>
          </>
        )}
      </MangroveCard>
    </FullscreenWrap>
  )
}

// Plots with no usable GPS — placed near the centroid of the province named in
// project_no_raw, with a deterministic per-plot scatter so they don't stack.
function EstimatedMapCard({ plots }: { plots: PlotLocation[] }) {
  const { t } = useI18n()
  const [fullscreen, setFullscreen] = useState(false)
  useEscape(fullscreen, () => setFullscreen(false))
  const noGps = plots.filter(p => p.lat == null || p.lng == null)

  const placed: MapPoint[] = []
  const provinces = new Map<string, { lat: number; lng: number }>()
  let unplaced = 0
  for (const p of noGps) {
    const pc = provinceCoords(p.projectNo)
    if (!pc) { unplaced++; continue }
    provinces.set(pc.name, pc.coords)
    const h = hashStr(p.plotId)
    const angle = (h % 360) * (Math.PI / 180)
    const radius = 0.04 + (((h >>> 9) % 100) / 100) * 0.1
    placed.push({
      plotId: p.plotId,
      lat: pc.coords.lat + Math.sin(angle) * radius,
      lng: pc.coords.lng + Math.cos(angle) * radius,
      treeCount: p.treeCount,
      iucnCodes: p.iucnCodes,
      tooltip: plotTooltip(p, t('dash.plotStems', { n: p.treeCount.toLocaleString() })),
    })
  }

  return (
    <FullscreenWrap active={fullscreen}>
      <MangroveCard
        variant="tintLen2"
        theme="dark"
        className={fullscreen ? 'min-h-full' : ''}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[14px] font-semibold text-light-100">{t('dash.plotMapEst')}</h2>
          <div className="flex items-center gap-2">
            {noGps.length > 0 && <Badge variant="darkearth">{t('dash.plotMapEstSub', { n: noGps.length.toLocaleString() })}</Badge>}
            <FullscreenButton active={fullscreen} onToggle={() => setFullscreen(f => !f)} />
          </div>
        </div>

        {noGps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted text-[13px] gap-2">
            <MapPin size={28} className="opacity-30" />
            <p>{t('dash.plotMapEstEmpty')}</p>
          </div>
        ) : (
          <>
            {placed.length > 0 && (
              <LeafletMapCanvas
                height={fullscreen ? 'calc(100vh - 240px)' : 320}
                color="#C4956A"
                points={placed}
              />
            )}
            <div className="flex flex-col gap-2 mt-4 text-[11px] text-dark border-t border-white/10 pt-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet/70 border border-black shrink-0" />
                  <span className="w-3.5 h-3.5 rounded-full bg-violet/70 border border-black shrink-0" />
                  <span>{t('dash.plotMapEstLegend')}</span>
                </div>
                <div className="h-3 w-[1px] bg-white/20 hidden md:block" />
                <div className="flex items-center gap-2">
                  <span className="text-muted/80">{t('dash.iucnLegend')}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D32F2F] shrink-0" /> CR</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#E65100] shrink-0" /> EN</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FBC02D] shrink-0" /> NT</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#757575] shrink-0" /> DD</span>
                  </div>
                </div>
              </div>
              {unplaced > 0 && <p className="text-muted/70">{t('dash.plotMapEstUnplaced', { n: unplaced.toLocaleString() })}</p>}
            </div>
          </>
        )}
      </MangroveCard>
    </FullscreenWrap>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function DashboardContent({ stats, activityStats, plots, typeCounts, iucnCounts, connected }: DashboardContentProps) {
  const { t } = useI18n()
  const mapCardRef = useRef<HTMLDivElement>(null)

  const handleScrollToMap = () => {
    mapCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={t('dash.title')}
        subtitle={t('dash.subtitle')}
        actions={<Badge variant={connected ? 'success' : 'warning'}>{connected ? t('dash.live') : t('dash.offline')}</Badge>}
      />

      <div className="flex-1 p-8 flex flex-col gap-8 overflow-auto">
        <CoreStatsRow stats={stats} onPlotsIconClick={handleScrollToMap} plots={plots} typeCounts={typeCounts} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div ref={mapCardRef}>
              <FireflyMapCard plots={plots} />
            </div>
            <EstimatedMapCard plots={plots} />
          </div>
          <div className="flex flex-col gap-6">
            <ActivityRailCard activityStats={activityStats} submissions={stats.totalSubmissions} />
            <ConservationStatusCard iucnCounts={iucnCounts} />
            <SystemStatusCard connected={connected} stats={stats} />
          </div>
        </div>
      </div>
    </div>
  )
}
