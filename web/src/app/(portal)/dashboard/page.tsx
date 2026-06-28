import { TopBar } from '@/components/layout/TopBar'
import { StatCard } from '@/components/portal/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TreePine, MapPin, Leaf, FileCheck, AlertCircle } from 'lucide-react'

// TODO: replace with real data from /api/data/stats
const PLACEHOLDER_STATS = {
  totalTrees: 0,
  totalSites: 0,
  totalSpecies: 0,
  totalSubmissions: 0,
  pendingSubmissions: 0,
  lastSyncAt: '—',
}

export default function DashboardPage() {
  const stats = PLACEHOLDER_STATS

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Dashboard"
        subtitle="Overview of the tree census programme"
      />

      <div className="flex-1 p-8 flex flex-col gap-8 overflow-auto">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            label="Total Trees"
            value={stats.totalTrees}
            icon={<TreePine size={16} />}
            accent="coral"
          />
          <StatCard
            label="Sites"
            value={stats.totalSites}
            icon={<MapPin size={16} />}
            accent="violet"
          />
          <StatCard
            label="Species"
            value={stats.totalSpecies}
            icon={<Leaf size={16} />}
          />
          <StatCard
            label="Submissions"
            value={stats.totalSubmissions}
            icon={<FileCheck size={16} />}
          />
          <StatCard
            label="Pending Sync"
            value={stats.pendingSubmissions}
            icon={<AlertCircle size={16} />}
            accent={stats.pendingSubmissions > 0 ? 'coral' : 'neutral'}
          />
        </div>

        {/* Recent activity + system status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent submissions */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[14px] font-semibold text-neutral">Recent Submissions</h2>
                <Badge variant="default">Live</Badge>
              </div>
              <div className="flex flex-col items-center justify-center py-10 text-muted text-[13px] gap-2">
                <FileCheck size={28} className="opacity-30" />
                <p>No submissions yet.</p>
                <p className="text-[12px] opacity-60">Data will appear here once Zoho Forms is connected.</p>
              </div>
            </Card>
          </div>

          {/* System status */}
          <Card>
            <h2 className="text-[14px] font-semibold text-neutral mb-5">System Status</h2>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Zoho Forms', status: 'pending' },
                { label: 'Cloud Ingestion', status: 'pending' },
                { label: 'BigQuery', status: 'pending' },
                { label: 'GCS Raw Bucket', status: 'pending' },
                { label: 'On-Premise Backup', status: 'pending' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[13px] text-muted">{item.label}</span>
                  <Badge variant="warning">Setup needed</Badge>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted/50 mt-5">
              Last sync: {stats.lastSyncAt}
            </p>
          </Card>
        </div>

        {/* Charts placeholder */}
        <Card>
          <h2 className="text-[14px] font-semibold text-neutral mb-2">Tree Count Over Time</h2>
          <p className="text-[13px] text-muted mb-6">Species distribution and collection trend</p>
          <div className="flex items-center justify-center h-40 border border-dashed border-white/[0.08] rounded-sm text-muted text-[13px]">
            Charts will render here — connect BigQuery to populate data (Milestone 4)
          </div>
        </Card>

      </div>
    </div>
  )
}
