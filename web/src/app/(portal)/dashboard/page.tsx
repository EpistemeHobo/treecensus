import { DashboardContent } from '@/components/portal/DashboardContent'
import { getDashboardStats, getObservationTypeCounts } from '@/lib/bigquery'
import type { DashboardStats } from '@/types'

// Always render fresh — these are live counts from BigQuery.
export const dynamic = 'force-dynamic'

const ZERO_STATS: DashboardStats = {
  totalTrees: 0,
  totalSites: 0,
  totalSpecies: 0,
  totalSubmissions: 0,
  pendingSubmissions: 0,
  lastSyncAt: '—',
}

export default async function DashboardPage() {
  let stats = ZERO_STATS
  let typeCounts: { type: string; count: number }[] = []
  let connected = false

  try {
    ;[stats, typeCounts] = await Promise.all([
      getDashboardStats(),
      getObservationTypeCounts(),
    ])
    connected = true
  } catch (err) {
    console.error('[dashboard] BigQuery unavailable:', err)
  }

  return <DashboardContent stats={stats} typeCounts={typeCounts} connected={connected} />
}
