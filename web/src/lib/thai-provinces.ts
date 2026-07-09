// Approximate centroids of the Thai coastal provinces that appear in
// `project_no_raw` — used by the dashboard to place plots that lack GPS
// coordinates. Keys are canonical spellings; ALIASES covers the abbreviated
// (ฯ) and misspelled variants seen in the raw data.

export interface LatLng {
  lat: number
  lng: number
}

const CANONICAL: Record<string, LatLng> = {
  'จันทบุรี': { lat: 12.61, lng: 102.1 },
  'ตราด': { lat: 12.24, lng: 102.51 },
  'ประจวบคีรีขันธ์': { lat: 11.81, lng: 99.8 },
  'ชลบุรี': { lat: 13.36, lng: 100.98 },
  'สุราษฎร์ธานี': { lat: 9.14, lng: 99.33 },
  'ระยอง': { lat: 12.68, lng: 101.28 },
  'ชุมพร': { lat: 10.49, lng: 99.18 },
  'นราธิวาส': { lat: 6.43, lng: 101.82 },
  'สงขลา': { lat: 7.19, lng: 100.6 },
  'นครศรีธรรมราช': { lat: 8.43, lng: 99.96 },
  'ปัตตานี': { lat: 6.87, lng: 101.25 },
}

const ALIASES: Record<string, string> = {
  'สุราษฯ': 'สุราษฎร์ธานี',
  'นครศรีฯ': 'นครศรีธรรมราช',
  'นาราธิวาส': 'นราธิวาส',
}

/** Resolve a raw province string to canonical name + centroid, or null. */
export function provinceCoords(raw: string): { name: string; coords: LatLng } | null {
  const s = raw.trim()
  if (!s) return null
  const name = ALIASES[s] ?? s
  if (CANONICAL[name]) return { name, coords: CANONICAL[name] }
  // Abbreviations we haven't listed yet, e.g. "ประจวบฯ" → "ประจวบคีรีขันธ์".
  const stem = name.replace(/ฯ/g, '').trim()
  if (stem.length >= 3) {
    for (const [full, coords] of Object.entries(CANONICAL)) {
      if (full.startsWith(stem)) return { name: full, coords }
    }
  }
  return null
}
