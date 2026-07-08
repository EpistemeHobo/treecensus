'use client'

import { TopBar } from '@/components/layout/TopBar'
import { StatCard } from '@/components/portal/StatCard'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { Badge } from '@/components/ui/Badge'
import { TreePine, MapPin, Leaf, FileCheck, AlertCircle } from 'lucide-react'
import { useI18n } from '@/context/LanguageContext'
import type { TranslationKey } from '@/i18n/translations'
import type { DashboardStats } from '@/types'

interface DashboardContentProps {
  stats: DashboardStats
  typeCounts: { type: string; count: number }[]
  connected: boolean
}

const TYPE_KEYS: Record<string, TranslationKey> = {
  tree_stem: 'type.tree_stem',
  seedling: 'type.seedling',
  woody_debris: 'type.woody_debris',
}

export function DashboardContent({ stats, typeCounts, connected }: DashboardContentProps) {
  const { t } = useI18n()
  const totalObservations = typeCounts.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={t('dash.title')}
        subtitle={t('dash.subtitle')}
        actions={<Badge variant={connected ? 'success' : 'warning'}>{connected ? t('dash.live') : t('dash.offline')}</Badge>}
      />

      <div className="flex-1 p-8 flex flex-col gap-8 overflow-auto">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard label={t('dash.treeStems')} value={stats.totalTrees} icon={<TreePine size={16} />} accent="coral" />
          <StatCard label={t('dash.plots')} value={stats.totalSites} icon={<MapPin size={16} />} accent="violet" />
          <StatCard label={t('dash.species')} value={stats.totalSpecies} icon={<Leaf size={16} />} />
          <StatCard label={t('dash.submissions')} value={stats.totalSubmissions} icon={<FileCheck size={16} />} />
          <StatCard
            label={t('dash.needsReview')}
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
                <h2 className="text-[14px] font-semibold text-neutral">{t('dash.obsByType')}</h2>
                <Badge variant="default">{t('dash.totalBadge', { n: totalObservations.toLocaleString() })}</Badge>
              </div>
              {typeCounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted text-[13px] gap-2">
                  <FileCheck size={28} className="opacity-30" />
                  <p>{t('dash.noObs')}</p>
                  <p className="text-[12px] opacity-60">{t('dash.noObsHint')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {typeCounts.map(item => {
                    const pct = totalObservations > 0 ? (item.count / totalObservations) * 100 : 0
                    return (
                      <div key={item.type} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-neutral">{TYPE_KEYS[item.type] ? t(TYPE_KEYS[item.type]) : item.type}</span>
                          <span className="text-muted">{item.count.toLocaleString()} · {pct.toFixed(1)}%</span>
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
            <h2 className="text-[14px] font-semibold text-neutral mb-5">{t('dash.systemStatus')}</h2>
            <div className="flex flex-col gap-3">
              {([
                { label: 'dash.statusBigQuery', ok: connected },
                { label: 'dash.statusZoho', ok: false },
                { label: 'dash.statusIngestion', ok: false },
              ] as { label: TranslationKey; ok: boolean }[]).map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[13px] text-muted">{t(item.label)}</span>
                  <Badge variant={item.ok ? 'success' : 'warning'}>{item.ok ? t('dash.connected') : t('dash.setupNeeded')}</Badge>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted/50 mt-5">{t('dash.lastSubmission', { t: stats.lastSyncAt })}</p>
          </MangroveCard>
        </div>
      </div>
    </div>
  )
}
