'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { StatCard } from '@/components/portal/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TreePine, MapPin, Leaf, FileCheck, AlertCircle } from 'lucide-react'
<<<<<<< HEAD
import type { DashboardStats, Submission } from '@/types'

const ZERO_STATS: DashboardStats = {
  totalTrees: 0,
  totalSites: 0,
  totalSpecies: 0,
  totalSubmissions: 0,
  pendingSubmissions: 0,
  lastSyncAt: '—',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(ZERO_STATS)
  const [recent, setRecent] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [statsRes, subsRes] = await Promise.all([
          fetch('/api/data/stats'),
          fetch('/api/data/submissions?limit=5'),
        ])
        if (!statsRes.ok) throw new Error(`stats: ${statsRes.status}`)
        const statsJson = await statsRes.json()
        const subsJson = subsRes.ok ? await subsRes.json() : { data: [] }
        if (cancelled) return
        setStats(statsJson.data as DashboardStats)
        const subsData = Array.isArray(subsJson.data) ? subsJson.data : (subsJson.data?.rows ?? [])
        setRecent((subsData as Submission[]).slice(0, 5))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load stats')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Dashboard" subtitle="Overview of the tree census programme" />
=======
import { getDashboardStats, getObservationTypeCounts } from '@/lib/bigquery'
import type { DashboardStats } from '@/types'

// Always render fresh — these are live counts from BigQuery.
export const dynamic = 'force-dynamic'

const ZERO_STATS: DashboardStats = {
  totalTrees: 0, totalSites: 0, totalSpecies: 0,
  totalSubmissions: 0, pendingSubmissions: 0, lastSyncAt: '—',
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
>>>>>>> 145f6d1 (Connecting data)

      <div className="flex-1 p-8 flex flex-col gap-8 overflow-auto">
        {error && (
          <Card>
            <div className="flex items-center gap-2 text-coral text-[13px]">
              <AlertCircle size={16} />
              <span>Failed to load dashboard data: {error}</span>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard label="Tree Stems" value={stats.totalTrees} icon={<TreePine size={16} />} accent="coral" />
          <StatCard label="Plots" value={stats.totalSites} icon={<MapPin size={16} />} accent="violet" />
          <StatCard label="Species" value={stats.totalSpecies} icon={<Leaf size={16} />} />
          <StatCard label="Submissions" value={stats.totalSubmissions} icon={<FileCheck size={16} />} />
          <StatCard
<<<<<<< HEAD
            label="Total Trees"
            value={loading ? '…' : stats.totalTrees}
            icon={<TreePine size={16} />}
            accent="coral"
          />
          <StatCard
            label="Sites"
            value={loading ? '…' : stats.totalSites}
            icon={<MapPin size={16} />}
            accent="violet"
          />
          <StatCard
            label="Species"
            value={loading ? '…' : stats.totalSpecies}
            icon={<Leaf size={16} />}
          />
          <StatCard
            label="Submissions"
            value={loading ? '…' : stats.totalSubmissions}
            icon={<FileCheck size={16} />}
          />
          <StatCard
            label="Pending Sync"
            value={loading ? '…' : stats.pendingSubmissions}
=======
            label="Needs Review"
            value={stats.pendingSubmissions}
>>>>>>> 145f6d1 (Connecting data)
            icon={<AlertCircle size={16} />}
            accent={stats.pendingSubmissions > 0 ? 'coral' : 'neutral'}
          />
        </div>

<<<<<<< HEAD
=======
        {/* Observation breakdown + system status */}
>>>>>>> 145f6d1 (Connecting data)
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-5">
<<<<<<< HEAD
                <h2 className="text-[14px] font-semibold text-neutral">Recent Submissions</h2>
                <Badge variant="default">Live</Badge>
              </div>

              {loading ? (
                <div className="py-10 text-center text-muted text-[13px]">Loading…</div>
              ) : recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted text-[13px] gap-2">
                  <FileCheck size={28} className="opacity-30" />
                  <p>No submissions yet.</p>
                  <p className="text-[12px] opacity-60">Data will appear here once Zoho Forms is connected.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recent.map((s) => (
                    <div
                      key={`${s.id}-${s.submittedAt}`}
                      className="flex items-center justify-between text-[13px] py-2 border-b border-white/[0.05] last:border-0"
                    >
                      <div className="flex flex-col">
                        <span className="text-neutral">{s.id || '(no record id)'}</span>
                        <span className="text-[11px] text-muted">
                          {s.formProvider} · {new Date(s.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      <Badge variant="default">{s.treeCount ?? 0} trees</Badge>
                    </div>
                  ))}
=======
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
>>>>>>> 145f6d1 (Connecting data)
                </div>
              )}
            </Card>
          </div>

          <Card>
            <h2 className="text-[14px] font-semibold text-neutral mb-5">System Status</h2>
            <div className="flex flex-col gap-3">
              {[
<<<<<<< HEAD
                { label: 'Zoho Forms', ok: stats.totalSubmissions > 0 },
                { label: 'Cloud Ingestion', ok: stats.totalSubmissions > 0 },
                { label: 'BigQuery', ok: !error },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[13px] text-muted">{item.label}</span>
                  <Badge variant={item.ok ? 'default' : 'warning'}>
                    {item.ok ? 'Connected' : 'Setup needed'}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted/50 mt-5">Last sync: {stats.lastSyncAt}</p>
          </Card>
        </div>

        <Card>
          <h2 className="text-[14px] font-semibold text-neutral mb-2">Tree Count Over Time</h2>
          <p className="text-[13px] text-muted mb-6">Species distribution and collection trend</p>
          <div className="flex items-center justify-center h-40 border border-dashed border-white/[0.08] rounded-sm text-muted text-[13px]">
            Charts will render here — Milestone 4
          </div>
        </Card>
=======
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
          </Card>
        </div>

>>>>>>> 145f6d1 (Connecting data)
      </div>
    </div>
  )
}
