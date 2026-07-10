'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { MapPin, Layers, Search, Loader2, Maximize, Minimize } from 'lucide-react'
import { TransparentCard } from '@/components/ui/TransparentCard'
import { Badge } from '@/components/ui/Badge'
import { useI18n } from '@/context/LanguageContext'
import { provinceCoords } from '@/lib/thai-provinces'
import { WOOD_MATRIC } from '@/lib/wood-matric'
import IUCN_DATA from '@/data/iucn.json'
import AREA_CODES from '@/data/area-codes.json'
import { VIRIDIS, metricConfig, type ClassBin, type FocusLayer, type StructureMetric } from './focus-area-constants'
import type { FocusStem } from './FocusAreaMap'

const FocusAreaMap = dynamic(() => import('./FocusAreaMap').catch(err => {
  console.error('Failed to load FocusAreaMap chunk, reloading page...', err)
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
  return { default: () => null }
}), {
  ssr: false,
  loading: () => (
    <div className="relative rounded-md border border-dim overflow-hidden bg-[#EAEAEA] flex items-center justify-center text-neutral/60 text-[13px]" style={{ height: 460 }}>
      <Loader2 size={16} className="animate-spin mr-2" /> Loading map…
    </div>
  ),
})

type Level = 'province' | 'amphoe' | 'tambol' | 'plot' | 'subplot'

interface AreaItem {
  code: string
  label?: string
  labelTh?: string
  labelEn?: string
  provinceRaw?: string
  plotId?: string
}

// Which levels are selectable this version. Amphoe/Tambol are disabled; Sub-Plot
// is no longer a level — sub-plots are picked as checkboxes once a Plot is chosen.
const LEVELS: { value: Level; dataKey?: 'province' | 'plot'; disabled?: boolean }[] = [
  { value: 'province', dataKey: 'province' },
  { value: 'amphoe', disabled: true },
  { value: 'tambol', disabled: true },
  { value: 'plot', dataKey: 'plot' },
]

// Canonical display order for the four sub-plot positions.
const SUBPLOT_ORDER = ['C', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
function subplotCode(label = ''): string {
  const m = /\(([^)]+)\)\s*$/.exec(label)
  return m ? m[1] : label
}

const LAYERS: FocusLayer[] = ['structure', 'endangered']
const METRICS: StructureMetric[] = ['gbh', 'height', 'biomass', 'volume']

const LEVELS_DATA = AREA_CODES.levels as Record<string, AreaItem[]>

interface FocusAreaResult {
  level: string
  code: string
  stems: FocusStem[]
  total: number
  withGps: number
  withoutGps: number
  iucnCounts: { code: string; count: number }[]
}

function itemLabel(it: AreaItem): string {
  return it.label ?? it.labelTh ?? it.labelEn ?? it.code
}

export function FocusAreaStatistics() {
  const { t, lang } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [level, setLevel] = useState<Level>('province')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<AreaItem | null>(null)

  useEffect(() => {
    const qLevel = searchParams.get('level') as Level | null
    const qCode = searchParams.get('code')
    if (qLevel && LEVELS.some(l => l.value === qLevel && !l.disabled)) {
      setLevel(qLevel)
      const dataKey = LEVELS.find(l => l.value === qLevel)?.dataKey
      const pool = dataKey ? LEVELS_DATA[dataKey] ?? [] : []
      const match = pool.find(item => item.code === qCode)
      if (match) {
        setSelected(match)
        setQuery(itemLabel(match))
      }
    }
  }, [searchParams])
  const [open, setOpen] = useState(false)
  const [layer, setLayer] = useState<FocusLayer>('structure')
  const [metric, setMetric] = useState<StructureMetric>('gbh')
  const [showLc, setShowLc] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [checkedUnits, setCheckedUnits] = useState<Set<string>>(new Set())
  const [data, setData] = useState<FocusAreaResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  const dataKey = LEVELS.find(l => l.value === level)?.dataKey
  const pool = dataKey ? LEVELS_DATA[dataKey] ?? [] : []

  // Child units shown as checkboxes for the current selection:
  //  • Province → the plots under it   (filter stems by plot_id)
  //  • Plot     → its sub-plots         (filter stems by subplot_id)
  const { filterKind, filterItems } = useMemo(() => {
    if (level === 'plot' && selected) {
      const items = ((LEVELS_DATA.subplot ?? []) as AreaItem[])
        .filter(s => s.plotId === selected.code)
        .sort((a, b) => {
          const oa = SUBPLOT_ORDER.indexOf(subplotCode(itemLabel(a)))
          const ob = SUBPLOT_ORDER.indexOf(subplotCode(itemLabel(b)))
          return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob)
        })
      return { filterKind: 'subplot' as const, filterItems: items }
    }
    if (level === 'province' && selected) {
      const items = ((LEVELS_DATA.plot ?? []) as AreaItem[])
        .filter(p => (provinceCoords(p.provinceRaw ?? '')?.name ?? (p.provinceRaw ?? '')) === selected.code)
        .sort((a, b) => a.code.localeCompare(b.code))
      return { filterKind: 'plot' as const, filterItems: items }
    }
    return { filterKind: null as 'plot' | 'subplot' | null, filterItems: [] as AreaItem[] }
  }, [level, selected])

  // Reset to all-checked whenever the unit set changes (new area) — the full set
  // of children is equivalent to the parent area.
  useEffect(() => {
    setCheckedUnits(new Set(filterItems.map(u => u.code)))
  }, [filterItems])

  const stemUnitCode = (s: FocusStem) =>
    filterKind === 'plot' ? s.plotId : filterKind === 'subplot' ? s.subplotId : ''

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? pool.filter(it => it.code.toLowerCase().includes(q) || itemLabel(it).toLowerCase().includes(q))
      : pool
    return list.slice(0, 50)
  }, [pool, query])

  // Close the suggestion list on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Escape exits fullscreen.
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  // Fetch stems whenever a concrete area is selected.
  useEffect(() => {
    if (!selected || !dataKey) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    fetch('/api/data/focus-area', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: dataKey, code: selected.code }),
    })
      .then(async res => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Request failed')
        if (!cancelled) setData(json.data as FocusAreaResult)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Request failed')
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selected, dataKey])

  function onLevelChange(next: Level) {
    setLevel(next)
    setQuery('')
    setSelected(null)
    setData(null)
    setError('')
    setOpen(false)
  }

  function pick(it: AreaItem) {
    setSelected(it)
    setQuery(itemLabel(it))
    setOpen(false)
  }

  const fallbackCenter =
    dataKey === 'province' && selected ? provinceCoords(selected.code)?.coords ?? null : null

  // Unit filtering: all-checked (or no units) shows everything; a subset narrows
  // the dots to stems whose plot/sub-plot is checked.
  const allUnitsChecked =
    filterItems.length > 0 && checkedUnits.size === filterItems.length
  const visibleStems = useMemo(() => {
    if (!data) return []
    if (filterItems.length > 0 && !allUnitsChecked) {
      return data.stems.filter(s => checkedUnits.has(stemUnitCode(s)))
    }
    return data.stems
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filterItems, checkedUnits, allUnitsChecked, filterKind])

  const visTotal = visibleStems.length
  const visGps = visibleStems.filter(s => s.lat != null && s.lng != null).length

  function toggleUnit(code: string) {
    setCheckedUnits(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const handleViewTable = () => {
    if (!selected) return
    const field = dataKey === 'plot' ? 'plot_id' : 'project_no_raw'
    router.push(`/data?field=${field}&op=equals&value=${encodeURIComponent(selected.code)}`)
  }

  const handleViewInsights = () => {
    if (!selected) return
    const field = dataKey === 'plot' ? 'plot_id' : 'project_no_raw'
    router.push(`/data?field=${field}&op=equals&value=${encodeURIComponent(selected.code)}&insights=biomass`)
  }

  const { sum, avg, unit } = useMemo(() => {
    if (visibleStems.length === 0) return { sum: 0, avg: 0, unit: '' }
    let values: number[] = []
    let unitStr = ''
    if (metric === 'height') {
      values = visibleStems.map(s => s.heightM ?? 0).filter(v => v > 0)
      unitStr = 'm'
    } else if (metric === 'biomass') {
      values = visibleStems.map(s => {
        const dbh = s.gbhCm ? s.gbhCm / Math.PI : 0
        const spKey = s.scientificName ? s.scientificName.toLowerCase() : ''
        const match = WOOD_MATRIC.species.find(sp => sp.scientific_name.toLowerCase() === spKey)
        const rho = match ? match.density : WOOD_MATRIC.defaultDensity
        return dbh > 0 ? 0.251 * rho * Math.pow(dbh, 2.46) : 0
      })
      unitStr = 'kg'
    } else if (metric === 'volume') {
      values = visibleStems.map(s => {
        const dbh = s.gbhCm ? s.gbhCm / Math.PI : 0
        const spKey = s.scientificName ? s.scientificName.toLowerCase() : ''
        const match = WOOD_MATRIC.species.find(sp => sp.scientific_name.toLowerCase() === spKey)
        const f = match ? match.form_factor : WOOD_MATRIC.defaultFormFactor
        const dbhM = dbh / 100
        const g = (Math.PI * dbhM * dbhM) / 4
        return (s.heightM && s.heightM > 0 && dbh > 0) ? f * g * s.heightM : 0
      })
      unitStr = 'm³'
    } else {
      values = visibleStems.map(s => s.gbhCm ?? 0).filter(v => v > 0)
      unitStr = 'cm'
    }
    const total = values.reduce((a, b) => a + b, 0)
    const average = values.length > 0 ? total / values.length : 0
    return { sum: total, avg: average, unit: unitStr }
  }, [visibleStems, metric])

  const iucnColor = new Map(IUCN_DATA.map(d => [d.code.toUpperCase(), d.color]))
  const iucnStatus = new Map(IUCN_DATA.map(d => [d.code.toUpperCase(), d.status]))
  const mapHeight = fullscreen ? 'calc(100vh - 320px)' : 460

  // Renders the shared viridis-ramp legend for the Structure layer. Colour comes
  // from VIRIDIS by index, so GBH and Height look identical bar the numbers.
  const classLegend = (prefix: string, classes: ClassBin[], title: string) => (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-muted/80">{title}</span>
      {classes.map((c, i) => (
        <span key={c.key} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full border border-black/40 shrink-0"
            style={{ backgroundColor: VIRIDIS[i] }}
          />
          {t(`${prefix}.${c.key}` as never)} <span className="text-muted/70">({c.range})</span>
        </span>
      ))}
    </div>
  )

  const endangeredCodes = showLc ? ['CR', 'EN', 'NT', 'DD', 'LC'] : ['CR', 'EN', 'NT', 'DD']

  return (
    <FullscreenWrap active={fullscreen}>
      <TransparentCard
        overflowVisible
        className={'!p-5' + (fullscreen ? ' min-h-full' : '')}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold text-dark flex items-center gap-2">
            <MapPin size={15} /> {t('maps.focusTitle')}
          </h2>
          <div className="flex items-center gap-2">
            {data && (
              <Badge variant="youngleaf">
                {t('maps.focusSummary', {
                  total: visTotal.toLocaleString(),
                  gps: visGps.toLocaleString(),
                })}
              </Badge>
            )}
            <button
              type="button"
              onClick={() => setFullscreen(f => !f)}
              className="p-1.5 text-dark/80 hover:text-coral transition-colors rounded-sm hover:bg-white/10"
              title={fullscreen ? t('data.exitFullscreen') : t('data.fullscreen')}
              aria-label={fullscreen ? t('data.exitFullscreen') : t('data.fullscreen')}
            >
              {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>

        {/* ── Controls ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          {/* Level dropdown */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-widest text-muted/80">{t('maps.levelLabel')}</span>
            <select
              value={level}
              onChange={e => onLevelChange(e.target.value as Level)}
              className="w-32 px-3 py-2 bg-[#0A0A10] border border-dim rounded-sm text-[13px] text-neutral outline-none focus:border-coral/40 transition-colors"
            >
              {LEVELS.map(l => (
                <option key={l.value} value={l.value} disabled={l.disabled}>
                  {t(`maps.level.${l.value}` as never)}
                  {l.disabled ? ` — ${t('maps.levelSoon')}` : ''}
                </option>
              ))}
            </select>
          </label>

          {/* Area-code autosuggest */}
          <div ref={boxRef} className="relative flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-widest text-muted/80">{t('maps.codeLabel')}</span>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value)
                  setSelected(null)
                  setOpen(true)
                }}
                onFocus={() => setOpen(true)}
                placeholder={t('maps.codePlaceholder')}
                spellCheck={false}
                className="w-52 pl-8 pr-3 py-2 bg-[#0A0A10] border border-dim rounded-sm text-[13px] text-neutral outline-none focus:border-coral/40 transition-colors"
              />
            </div>
            {open && (
              <div className="absolute z-[500] top-full left-0 mt-1 w-52 max-h-72 overflow-y-auto rounded-sm border border-[rgba(255,255,255,0.12)] bg-[#0A0A10] shadow-2xl">
                {suggestions.length === 0 ? (
                  <p className="px-3 py-3 text-[12px] text-muted text-center">{t('maps.noMatches')}</p>
                ) : (
                  <ul>
                    {suggestions.map(it => (
                      <li key={it.code}>
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => pick(it)}
                          className={`w-full px-3 py-1.5 text-left text-[12px] hover:bg-coral/10 ${selected?.code === it.code ? 'text-coral' : 'text-neutral'}`}
                        >
                          {itemLabel(it)} <span className="text-[10px] text-muted ml-1">({it.code})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Layer toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-widest text-muted/80 flex items-center gap-1">
              <Layers size={12} /> {t('maps.layerLabel')}
            </span>
            <div className="flex rounded-sm border border-dim overflow-hidden">
              {LAYERS.map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLayer(l)}
                  className={
                    'px-3 py-2 text-[12px] font-medium transition-colors ' +
                    (layer === l ? 'bg-black text-green-400' : 'text-muted hover:text-gray-800 hover:bg-ghost/40')
                  }
                  style={layer === l ? { textShadow: '0 0 8px #e4ff69ff, 0 0 5px #89a34bff' } : undefined}
                >
                  {t(`maps.layer.${l}` as never)}
                </button>
              ))}
            </div>
          </div>

          {/* Metric sub-toggle (Structure layer only) */}
          {layer === 'structure' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-widest text-muted/80">{t('maps.metricLabel')}</span>
              <div className="flex items-center gap-3">
                <div className="flex rounded-sm border border-dim overflow-hidden">
                  {METRICS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetric(m)}
                      className={
                        'px-3 py-2 text-[12px] font-medium transition-colors ' +
                        (metric === m ? 'bg-black text-green-400' : 'text-muted hover:text-gray-800 hover:bg-ghost/40')
                      }
                      style={metric === m ? { textShadow: '0 0 8px #e9ff69ff, 0 0 5px #84a34bff' } : undefined}
                    >
                      {t(`maps.metric.${m}` as never)}
                    </button>
                  ))}
                </div>

                {/* Sum & Avg stats */}
                {selected && (
                  <div className="flex items-center gap-3 text-[12px] border-l border-dim pl-3 h-8">
                    <span className="text-dark/80">{lang === 'th' ? 'รวม:' : 'Sum:'}</span>
                    <span className="font-semibold text-dark">
                      {metric === 'volume'
                        ? `${sum.toFixed(4)} ${unit} (${(sum * 1000000).toLocaleString(undefined, { maximumFractionDigits: 0 })} cm³)`
                        : `${Math.round(sum).toLocaleString()} ${unit}`}
                    </span>
                    <span className="text-dark/40">|</span>
                    <span className="text-dark/80">{lang === 'th' ? 'เฉลี่ย:' : 'Avg:'}</span>
                    <span className="font-semibold text-dark">
                      {metric === 'volume'
                        ? `${avg.toFixed(4)} ${unit} (${(avg * 1000000).toLocaleString(undefined, { maximumFractionDigits: 0 })} cm³)`
                        : `${avg.toFixed(1)} ${unit}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Show-LC checkbox (endangered layer only) */}
          {layer === 'endangered' && (
            <label className="flex items-center gap-2 pb-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showLc}
                onChange={e => setShowLc(e.target.checked)}
                className="accent-coral w-3.5 h-3.5"
              />
              <span className="text-[12px] text-dark/90">{t('maps.showLc')}</span>
            </label>
          )}
        </div>

        {/* Action buttons + Sub-area checkboxes row */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {filterItems.length > 0 && (
              <>
                <span className="text-[11px] uppercase tracking-widest text-muted/80">
                  {t(filterKind === 'plot' ? 'maps.plotsLabel' : 'maps.subplotsLabel')}
                </span>
                {filterItems.map(u => (
                  <label key={u.code} className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checkedUnits.has(u.code)}
                      onChange={() => toggleUnit(u.code)}
                      className="accent-coral w-3.5 h-3.5"
                    />
                    <span className="text-[12px] text-dark/90">{itemLabel(u)}</span>
                  </label>
                ))}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={!selected}
              onClick={handleViewTable}
              className="px-4 py-2 text-[12px] font-semibold tracking-wide border border-white/20 rounded-sm transition-all duration-150 bg-black/60 hover:bg-black text-white hover:text-coral hover:border-coral disabled:opacity-20 disabled:pointer-events-none"
            >
              {t('maps.viewTable')}
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={handleViewInsights}
              className="px-4 py-2 text-[12px] font-semibold tracking-wide border border-white/20 rounded-sm transition-all duration-150 bg-black/60 hover:bg-black text-white hover:text-coral hover:border-coral disabled:opacity-20 disabled:pointer-events-none"
            >
              {t('maps.viewInsights')}
            </button>
          </div>
        </div>

        {/* ── Map + states ─────────────────────────────────────────── */}
        {!selected ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted text-[13px] gap-2 border border-dim rounded-md bg-[#0A0A10]/60">
            <MapPin size={26} className="opacity-30" />
            <p>{t('maps.selectPrompt')}</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-[13px] text-red-400 border border-dim rounded-md bg-[#0A0A10]/60">
            {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20 text-muted text-[13px] border border-dim rounded-md bg-[#0A0A10]/60">
            <Loader2 size={16} className="animate-spin mr-2" /> {t('maps.loading')}
          </div>
        ) : data ? (
          <>
            <FocusAreaMap
              stems={visibleStems}
              layer={layer}
              metric={metric}
              lang={lang}
              showLc={showLc}
              fallbackCenter={fallbackCenter}
              height={mapHeight}
            />

            {/* Legend + caption */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[11px] text-dark border-t border-white/10 pt-3">
              {layer === 'structure' &&
                (() => {
                  const { bins, labelPrefix, legendKey } = metricConfig(metric)
                  return classLegend(labelPrefix, bins, t(legendKey as never))
                })()}
              {layer === 'endangered' && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-muted/80">{t('maps.legendEndangered')}</span>
                  {endangeredCodes.map(code => (
                    <span key={code} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: iucnColor.get(code) }} />
                      {iucnStatus.get(code) ?? code} ({code})
                    </span>
                  ))}
                </div>
              )}
              <div className="ml-auto text-muted/70">
                {t('maps.focusCaption', {
                  total: visTotal.toLocaleString(),
                  gps: visGps.toLocaleString(),
                  noGps: (visTotal - visGps).toLocaleString(),
                })}
              </div>
            </div>
          </>
        ) : null}
      </TransparentCard>
    </FullscreenWrap>
  )
}

// Expands the card to a full-screen overlay when active.
function FullscreenWrap({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      className={active ? 'fullscreen-bg fixed inset-0 z-50 overflow-y-auto p-6' : ''}
    >
      {children}
    </div>
  )
}
