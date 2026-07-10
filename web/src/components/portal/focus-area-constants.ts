// Shared constants for the Focus Area Statistics tab.

// Two layer families: quantitative "structure" (shared ramp) and categorical
// "conservation" (IUCN palette).
export type FocusLayer = 'structure' | 'endangered'

// The metric shown by the Structure layer.
export type StructureMetric = 'gbh' | 'height' | 'biomass' | 'volume'

export interface ClassBin {
  /** i18n key suffix and legend id. */
  key: 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c7'
  /** Inclusive lower bound; upper bound is the next class's min. */
  min: number
  /** Human range label (English fallback). */
  range: string
}

// Uniform dot radius (px) for every classified marker — level shown by colour.
export const GBH_DOT_RADIUS = 4

// ONE shared sequential ramp for every quantitative layer (viridis, 7 steps).
// Colour-blind safe, perceptually uniform; low → high = dark purple → yellow.
// Colour comes from this array by class index, so GBH and Height (and any
// future quantitative layer) always speak the same visual language.
export const VIRIDIS: string[] = [
  '#440154', // c1 – lowest
  '#443983', // c2
  '#31688e', // c3
  '#21918c', // c4
  '#35b779', // c5
  '#90d743', // c6
  '#fde725', // c7 – highest
]

// GBH (girth) class thresholds (cm). Colour = VIRIDIS[index].
export const GBH_CLASSES: ClassBin[] = [
  { key: 'c1', min: 0, range: '< 10 cm' },
  { key: 'c2', min: 10, range: '10–20 cm' },
  { key: 'c3', min: 20, range: '20–30 cm' },
  { key: 'c4', min: 30, range: '30–45 cm' },
  { key: 'c5', min: 45, range: '45–60 cm' },
  { key: 'c6', min: 60, range: '60–90 cm' },
  { key: 'c7', min: 90, range: '≥ 90 cm' },
]

// Height class thresholds (m). Colour = VIRIDIS[index].
export const HEIGHT_CLASSES: ClassBin[] = [
  { key: 'c1', min: 0, range: '< 3 m' },
  { key: 'c2', min: 3, range: '3–6 m' },
  { key: 'c3', min: 6, range: '6–9 m' },
  { key: 'c4', min: 9, range: '9–12 m' },
  { key: 'c5', min: 12, range: '12–16 m' },
  { key: 'c6', min: 16, range: '16–20 m' },
  { key: 'c7', min: 20, range: '≥ 20 m' },
]

// Biomass class thresholds (kg). Colour = VIRIDIS[index].
export const BIOMASS_CLASSES: ClassBin[] = [
  { key: 'c1', min: 0, range: '< 20 kg' },
  { key: 'c2', min: 20, range: '20–50 kg' },
  { key: 'c3', min: 50, range: '50–100 kg' },
  { key: 'c4', min: 100, range: '100–200 kg' },
  { key: 'c5', min: 200, range: '200–400 kg' },
  { key: 'c6', min: 400, range: '400–800 kg' },
  { key: 'c7', min: 800, range: '≥ 800 kg' },
]

// Volume class thresholds (m³). Colour = VIRIDIS[index].
export const VOLUME_CLASSES: ClassBin[] = [
  { key: 'c1', min: 0, range: '< 0.02 m³' },
  { key: 'c2', min: 0.02, range: '0.02–0.1 m³' },
  { key: 'c3', min: 0.1, range: '0.1–0.25 m³' },
  { key: 'c4', min: 0.25, range: '0.25–0.5 m³' },
  { key: 'c5', min: 0.5, range: '0.5–1.0 m³' },
  { key: 'c6', min: 1.0, range: '1.0–2.0 m³' },
  { key: 'c7', min: 2.0, range: '≥ 2.0 m³' },
]

/** Bins + i18n key prefix + legend title-key for a Structure metric. */
export function metricConfig(metric: StructureMetric): {
  bins: ClassBin[]
  labelPrefix: string
  legendKey: string
} {
  if (metric === 'height') {
    return { bins: HEIGHT_CLASSES, labelPrefix: 'maps.heightClass', legendKey: 'maps.legendHeight' }
  }
  if (metric === 'biomass') {
    return { bins: BIOMASS_CLASSES, labelPrefix: 'maps.biomassClass', legendKey: 'maps.legendBiomass' }
  }
  if (metric === 'volume') {
    return { bins: VOLUME_CLASSES, labelPrefix: 'maps.volumeClass', legendKey: 'maps.legendVolume' }
  }
  return { bins: GBH_CLASSES, labelPrefix: 'maps.gbhClass', legendKey: 'maps.legendGbh' }
}

/** Index into a class array for a value, or -1 when unusable. */
export function classIndex(bins: ClassBin[], value: number | null): number {
  if (value == null || Number.isNaN(value) || value <= 0) return -1
  let idx = 0
  for (let i = 0; i < bins.length; i++) {
    if (value >= bins[i].min) idx = i
    else break
  }
  return idx
}
