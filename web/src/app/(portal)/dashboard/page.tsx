import { TopBar } from '@/components/layout/TopBar'
import { StatCard } from '@/components/portal/StatCard'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { Badge } from '@/components/ui/Badge'
import { TreePine, MapPin, Leaf, FileCheck, AlertCircle } from 'lucide-react'
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

const TYPE_LABELS: Record<string, string> = {
  tree_stem: 'Tree stems',
  seedling: 'Seedlings',
  woody_debris: 'Woody debris',
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

  const totalObservations = typeCounts.reduce((sum, t) => sum + t.count, 0)

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Dashboard"
        subtitle="Overview of the tree census programme"
        actions={<Badge variant={connected ? 'success' : 'warning'}>{connected ? 'Live' : 'Offline'}</Badge>}
      />

      <div className="flex-1 p-8 flex flex-col gap-8 overflow-auto">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard label="Tree Stems" value={stats.totalTrees} icon={<TreePine size={16} />} accent="coral" />
          <StatCard label="Plots" value={stats.totalSites} icon={<MapPin size={16} />} accent="violet" />
          <StatCard label="Species" value={stats.totalSpecies} icon={<Leaf size={16} />} />
          <StatCard label="Submissions" value={stats.totalSubmissions} icon={<FileCheck size={16} />} />
          <StatCard
            label="Needs Review"
            value={stats.pendingSubmissions}
            icon={<AlertCircle size={16} />}
            accent={stats.pendingSubmissions > 0 ? 'coral' : 'neutral'}
          />
        </div>

        {/* Observation breakdown + system status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MangroveCard variant="sand">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[14px] font-semibold text-neutral">Observations by Type</h2>
                <Badge variant="default">{totalObservations.toLocaleString()} total</Badge>
              </div>
              {typeCounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted text-[13px] gap-2">
                  <FileCheck size={28} className="opacity-30" />
                  <p>No observations yet.</p>
                  <p className="text-[12px] opacity-60">Load the observations table to populate this dashboard.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {typeCounts.map(t => {
                    const pct = totalObservations > 0 ? (t.count / totalObservations) * 100 : 0
                    return (
                      <div key={t.type} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-neutral">{TYPE_LABELS[t.type] ?? t.type}</span>
                          <span className="text-muted">{t.count.toLocaleString()} · {pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-ghost overflow-hidden">
                          <div className="h-full bg-coral/70 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </MangroveCard>
          </div>

          <MangroveCard variant="sand">
            <h2 className="text-[14px] font-semibold text-neutral mb-5">System Status</h2>
            <div className="flex flex-col gap-3">
              {[
                { label: 'BigQuery (observations)', ok: connected },
                { label: 'Zoho Forms', ok: false },
                { label: 'Cloud Ingestion', ok: false },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[13px] text-muted">{item.label}</span>
                  <Badge variant={item.ok ? 'success' : 'warning'}>{item.ok ? 'Connected' : 'Setup needed'}</Badge>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted/50 mt-5">Last submission: {stats.lastSyncAt}</p>
          </MangroveCard>
        </div>
      </div>
    </div>
  )
}
