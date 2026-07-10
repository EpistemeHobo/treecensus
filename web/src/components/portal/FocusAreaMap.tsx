'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Tooltip, useMap, Marker } from 'react-leaflet'
import L from 'leaflet'
import IUCN_DATA from '@/data/iucn.json'
import { WOOD_MATRIC } from '@/lib/wood-matric'
import {
  VIRIDIS,
  GBH_DOT_RADIUS,
  classIndex,
  metricConfig,
  type FocusLayer,
  type StructureMetric,
} from './focus-area-constants'

export interface FocusStem {
  id: string
  treeId: string
  lat: number | null
  lng: number | null
  gbhCm: number | null
  heightM: number | null
  iucnCode: string
  scientificName: string
  thaiName: string
  liveDead: string
  plotId: string
  subplotId: string
}

interface FocusAreaMapProps {
  stems: FocusStem[]
  layer: FocusLayer
  /** Which quantity the Structure layer encodes. */
  metric: StructureMetric
  /** Interface language — picks the species name shown in tooltips. */
  lang: 'th' | 'en'
  /** Include Least-Concern (LC) stems on the endangered layer. */
  showLc?: boolean
  /** Fallback centre (province centroid) when no stems have GPS. */
  fallbackCenter?: { lat: number; lng: number } | null
  height: number | string
}

// CARTO Voyager basemap.
const VOYAGER_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const VOYAGER_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

// Endangered layer surfaces the at-risk IUCN classes (+ LC when requested).
const ENDANGERED_CODES = new Set(['CR', 'EN', 'NT', 'DD'])
const IUCN_COLOR = new Map(IUCN_DATA.map(d => [d.code.toUpperCase(), d.color]))
const IUCN_STATUS = new Map(IUCN_DATA.map(d => [d.code.toUpperCase(), d.status]))

const LIGHT_BG = '#EAEAEA'

function FitBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (bounds.length > 0) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 })
  }, [map, bounds])
  return null
}

function circleIcon(radius: number, fill: string, stroke: string, fillOpacity = 0.4) {
  const size = (radius + 3) * 2
  const c = size / 2
  return L.divIcon({
    html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible;display:block;">
      <circle cx="${c}" cy="${c}" r="${radius}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-opacity="0.9" stroke-width="1" />
    </svg>`,
    className: 'bg-transparent border-none',
    iconSize: [size, size],
    iconAnchor: [c, c],
  })
}

export default function FocusAreaMap({
  stems,
  layer,
  metric,
  lang,
  showLc = false,
  fallbackCenter,
  height,
}: FocusAreaMapProps) {
  // Only stems with a valid position can be drawn.
  const gpsStems = useMemo(() => stems.filter(s => s.lat != null && s.lng != null), [stems])

  const stemName = (s: FocusStem) =>
    lang === 'th'
      ? s.thaiName || s.scientificName || '—'
      : s.scientificName || s.thaiName || '—'

  const visible = useMemo(() => {
    if (layer === 'endangered') {
      const list = gpsStems.filter(s => {
        const c = s.iucnCode.toUpperCase()
        return ENDANGERED_CODES.has(c) || (showLc && c === 'LC')
      })
      // Sort so 'LC' (Least Concern) items render first (bottom layer)
      return [...list].sort((a, b) => {
        const aCode = a.iucnCode.toUpperCase()
        const bCode = b.iucnCode.toUpperCase()
        if (aCode === 'LC' && bCode !== 'LC') return -1
        if (aCode !== 'LC' && bCode === 'LC') return 1
        return 0
      })
    }
    return gpsStems
  }, [gpsStems, layer, showLc])

  const bounds = useMemo<[number, number][]>(
    () => visible.map(s => [s.lat as number, s.lng as number]),
    [visible],
  )

  const center: [number, number] = bounds.length
    ? [bounds[0][0], bounds[0][1]]
    : fallbackCenter
      ? [fallbackCenter.lat, fallbackCenter.lng]
      : [9.5, 100]

  return (
    <div
      className="relative rounded-md border border-dim overflow-hidden"
      style={{ height, background: LIGHT_BG }}
    >
      <MapContainer
        center={center}
        zoom={bounds.length ? 12 : 7}
        style={{ height: '100%', width: '100%', background: LIGHT_BG }}
        zoomControl
      >
        <TileLayer url={VOYAGER_URL} attribution={VOYAGER_ATTR} />
        <FitBounds bounds={bounds} />

        {visible.map(s => {
          if (layer === 'endangered') {
            const code = s.iucnCode.toUpperCase()
            const color = IUCN_COLOR.get(code) ?? '#757575'
            const icon = circleIcon(6, color, '#000', 0.75)
            const zIndexOffset = code === 'LC' ? -100 : 100
            return (
              <Marker key={s.id} position={[s.lat as number, s.lng as number]} icon={icon} zIndexOffset={zIndexOffset}>
                <Tooltip direction="top" offset={[0, -6]} opacity={0.9}>
                  <span className="font-sans text-[12px] text-[#0D0D14] font-medium leading-tight">
                    {stemName(s)} — {IUCN_STATUS.get(code) ?? code} ({code})
                  </span>
                </Tooltip>
              </Marker>
            )
          }

          // Structure layer: one shared viridis ramp encodes the class; the
          // metric (GBH, Height, Biomass, or Volume) only changes which value & thresholds bin it.
          const { bins } = metricConfig(metric)
          let value: number | null = null
          let detail = ''
          let dotLabel = ''
          if (metric === 'height') {
            value = s.heightM
            detail = `H ${s.heightM} m`
            dotLabel = value != null ? `${value}m` : ''
          } else if (metric === 'biomass') {
            const dbh = s.gbhCm ? s.gbhCm / Math.PI : 0
            const spKey = s.scientificName ? s.scientificName.toLowerCase() : ''
            const match = WOOD_MATRIC.species.find(sp => sp.scientific_name.toLowerCase() === spKey)
            const rho = match ? match.density : WOOD_MATRIC.defaultDensity
            const val = dbh > 0 ? 0.251 * rho * Math.pow(dbh, 2.46) : 0
            value = val
            detail = `Biomass ${val.toFixed(1)} kg`
            dotLabel = val ? `${val.toFixed(1)}kg` : ''
          } else if (metric === 'volume') {
            const dbh = s.gbhCm ? s.gbhCm / Math.PI : 0
            const spKey = s.scientificName ? s.scientificName.toLowerCase() : ''
            const match = WOOD_MATRIC.species.find(sp => sp.scientific_name.toLowerCase() === spKey)
            const f = match ? match.form_factor : WOOD_MATRIC.defaultFormFactor
            const dbhM = dbh / 100
            const g = (Math.PI * dbhM * dbhM) / 4
            const val = (s.heightM && s.heightM > 0 && dbh > 0) ? f * g * s.heightM : 0
            value = val
            detail = `Volume ${val.toFixed(4)} m³ (${(val * 1000000).toFixed(0)} cm³)`
            dotLabel = val ? `${val.toFixed(3)}m³` : ''
          } else {
            value = s.gbhCm
            detail = `GBH ${s.gbhCm} cm`
            dotLabel = value != null ? `${value}cm` : ''
          }

          const idx = classIndex(bins, value)
          if (idx < 0) return null
          const icon = circleIcon(GBH_DOT_RADIUS, VIRIDIS[idx], '#333', 0.95)
          return (
            <Marker key={s.id} position={[s.lat as number, s.lng as number]} icon={icon}>
              <Tooltip direction="top" offset={[0, -GBH_DOT_RADIUS]} opacity={0.9}>
                <span className="font-sans text-[12px] text-[#0D0D14] font-medium leading-tight">
                  {stemName(s)} — {detail}
                </span>
              </Tooltip>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
