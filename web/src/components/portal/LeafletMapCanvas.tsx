'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { useRouter } from 'next/navigation'
import 'leaflet/dist/leaflet.css'

interface MapPoint {
  plotId: string
  tooltip: string
  lat: number
  lng: number
  treeCount: number
}

interface LeafletMapCanvasProps {
  points: MapPoint[]
  labels?: { text: string; lat: number; lng: number }[]
  color: string
  height: number | string
}

function FitBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30] })
    }
  }, [map, bounds])
  return null
}

export default function LeafletMapCanvas({ points, labels = [], color, height }: LeafletMapCanvasProps) {
  const router = useRouter()
  const all = [...points, ...labels]

  if (all.length === 0) return null

  const maxTrees = Math.max(...points.map(p => p.treeCount), 1)

  // Compute bounds
  const bounds: [number, number][] = all.map(p => [p.lat, p.lng])

  // Center coordinate as fallback
  const centerLat = all.reduce((sum, p) => sum + p.lat, 0) / all.length
  const centerLng = all.reduce((sum, p) => sum + p.lng, 0) / all.length

  return (
    <div
      className="relative rounded-md border border-dim overflow-hidden bg-[#0A0A10]"
      style={{ height }}
    >
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={6}
        style={{ height: '100%', width: '100%', background: '#0A0A10' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <FitBounds bounds={bounds} />

        {points.map(p => {
          const radius = 6 + 16 * Math.sqrt(p.treeCount / maxTrees)
          return (
            <CircleMarker
              key={p.plotId}
              center={[p.lat, p.lng]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.5,
                weight: 1.5,
              }}
              eventHandlers={{
                click: () => {
                  router.push(`/data?field=plot_id&op=equals&value=${encodeURIComponent(p.plotId)}`)
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
                <span className="font-sans text-[12px] text-[#0D0D14] font-medium leading-none">
                  {p.tooltip}
                </span>
              </Tooltip>
            </CircleMarker>
          )
        })}

        {labels.map(l => (
          <CircleMarker
            key={l.text}
            center={[l.lat, l.lng]}
            radius={2}
            pathOptions={{
              color: 'rgba(255, 255, 255, 0.3)',
              fillColor: 'transparent',
              weight: 1,
            }}
          >
            <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none text-white/50 text-[10px] pointer-events-none">
              {l.text}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
