'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Tooltip, useMap, Marker } from 'react-leaflet'
import { useRouter } from 'next/navigation'
import L from 'leaflet'
import IUCN_DATA from '@/data/iucn.json'

interface MapPoint {
  plotId: string
  tooltip: string
  lat: number
  lng: number
  treeCount: number
  iucnCodes?: string
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

function getFireflyHtml(radius: number, baseColor: string, activeIucns: { code: string; color: string }[]) {
  const size = (radius + 4) * 2
  const center = size / 2
  
  let dotsSvg = ''
  if (activeIucns.length > 0) {
    const dotRadius = 2.5
    const gap = 1
    const totalW = activeIucns.length * (dotRadius * 2) + (activeIucns.length - 1) * gap
    const startX = center - totalW / 2 + dotRadius
    
    dotsSvg = activeIucns.map((iucn, idx) => {
      const x = startX + idx * (dotRadius * 2 + gap)
      return `<circle cx="${x}" cy="${center}" r="${dotRadius}" fill="${iucn.color}" stroke="#000" stroke-width="0.5" />`
    }).join('')
  }
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow: visible; display: block;">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="${baseColor}" fill-opacity="0.35" stroke="${baseColor}" stroke-opacity="0.8" stroke-width="1.5" />
      ${dotsSvg}
    </svg>
  `
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
          const codes = p.iucnCodes ? p.iucnCodes.split(',').map(c => c.trim().toUpperCase()) : []
          const activeIucns = IUCN_DATA.filter(item => item.code.toUpperCase() !== 'LC' && codes.includes(item.code.toUpperCase()))
          
          const icon = L.divIcon({
            html: getFireflyHtml(radius, color, activeIucns),
            className: 'bg-transparent border-none',
            iconSize: [(radius + 4) * 2, (radius + 4) * 2],
            iconAnchor: [radius + 4, radius + 4]
          })

          return (
            <Marker
              key={p.plotId}
              position={[p.lat, p.lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  router.push(`/maps?level=plot&code=${encodeURIComponent(p.plotId)}`)
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -radius]} opacity={0.9}>
                <span className="font-sans text-[12px] text-[#0D0D14] font-medium leading-none">
                  {p.tooltip}
                </span>
              </Tooltip>
            </Marker>
          )
        })}

        {labels.map(l => {
          // Render a custom small circle marker using L.divIcon to bypass typescript mismatch with dynamic Marker
          const icon = L.divIcon({
            html: `<svg width="4" height="4" viewBox="0 0 4 4"><circle cx="2" cy="2" r="2" fill="none" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1" /></svg>`,
            className: 'bg-transparent border-none',
            iconSize: [4, 4],
            iconAnchor: [2, 2]
          })
          
          return (
            <Marker
              key={l.text}
              position={[l.lat, l.lng]}
              icon={icon}
            >
              <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none text-white/50 text-[10px] pointer-events-none">
                {l.text}
              </Tooltip>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
