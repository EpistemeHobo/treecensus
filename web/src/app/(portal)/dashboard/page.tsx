import { DashboardContent } from '@/components/portal/DashboardContent'
import { getDashboardStats, getObservationTypeCounts } from '@/lib/bigquery'
import { getActivityLogStats } from '@/lib/audit'
import type { DashboardStats } from '@/types'

// Always render fresh — these are live counts from BigQuery.
export const dynamic = 'force-dynamic'

const ZERO_STATS: DashboardStats = {
  totalTrees: 0,
  totalSites: 0,
  totalSpecies: 0,
  totalSubmissions: 0,
  totalBiomass: 0,
  lastSyncAt: '—',
}

export default async function DashboardPage() {
  let stats = ZERO_STATS
  let typeCounts: { type: string; count: number }[] = []
  let activityStats = {
    latestAccessEmail: '—',
    latestAccessTime: '—',
    totalLogins: 0,
    totalQueries: 0,
    exportedFiles: 0,
    exportedRecords: 0,
    approvedFlags: 0,
  }
  let connected = false

  try {
    const results = await Promise.allSettled([
      getDashboardStats(),
      getObservationTypeCounts(),
      getActivityLogStats(),
    ])
    
    if (results[0].status === 'fulfilled') stats = results[0].value
    if (results[1].status === 'fulfilled') typeCounts = results[1].value
    if (results[2].status === 'fulfilled') activityStats = results[2].value
    
    connected = true
  } catch (err) {
    console.error('[dashboard] BigQuery unavailable:', err)
  }

  return (
    <DashboardContent
      stats={stats}
      typeCounts={typeCounts}
      activityStats={activityStats}
      connected={connected}
    />
  )
}
