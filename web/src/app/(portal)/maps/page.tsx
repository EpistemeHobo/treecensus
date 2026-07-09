'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { BarChart3, ExternalLink, Map } from 'lucide-react'
import { useI18n } from '@/context/LanguageContext'

// Looker Studio embed (maps + statistics report).
const LOOKER_EMBED = 'https://datastudio.google.com/embed/reporting/b2bc645b-119e-425e-9bc2-dc7147e83604/page/p_slwi2rm84d'
const LOOKER_OPEN = LOOKER_EMBED.replace('/embed/reporting/', '/reporting/')

export default function MapsPage() {
  const { t, lang } = useI18n()
  const [tab, setTab] = useState<'focus' | 'looker'>('focus')
  const isTh = lang === 'th'

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={t('maps.title')}
        subtitle={t('maps.subtitle')}
        actions={<Badge variant="violet">Looker Studio</Badge>}
      />

      <div className="flex-1 p-8 flex gap-6 overflow-auto items-start">
        {/* Sidebar tabs */}
        <nav className="w-64 shrink-0 sticky top-0 flex flex-col gap-0.5">
          <p className="text-[11px] text-muted uppercase tracking-widest font-medium px-3 pb-2">
            {isTh ? 'สถิติและข้อมูลเชิงพื้นที่' : 'Maps & Statistics'}
          </p>

          <button
            onClick={() => setTab('focus')}
            className={
              'flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[13px] font-medium text-left transition-all duration-150 border ' +
              (tab === 'focus'
                ? 'bg-coral/10 text-[#5E7D18] border-coral/10'
                : 'text-muted hover:text-neutral hover:bg-ghost border-transparent')
            }
          >
            <Map size={15} className="shrink-0" />
            {t('maps.tabFocus')}
          </button>

          <button
            onClick={() => setTab('looker')}
            className={
              'flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[13px] font-medium text-left transition-all duration-150 border ' +
              (tab === 'looker'
                ? 'bg-coral/10 text-[#5E7D18] border-coral/10'
                : 'text-muted hover:text-neutral hover:bg-ghost border-transparent')
            }
          >
            <BarChart3 size={15} className="shrink-0" />
            {t('maps.tabLooker')}
          </button>
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {tab === 'focus' ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted text-[13px] border border-dim rounded-md bg-ghost">
              <p>{isTh ? 'ข้อมูลสถิติพื้นที่มุ่งเน้น' : 'Focus Area Statistics'}</p>
            </div>
          ) : (
            <MangroveCard seed={73} className="!p-0 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1f4b36]/70">
                <span className="flex items-center gap-2 text-[12px] uppercase tracking-widest font-semibold text-coral/90">
                  <BarChart3 size={13} /> {t('maps.censusReport')}
                </span>
                <a
                  href={LOOKER_OPEN}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[12px] text-neutral/70 hover:text-coral transition-colors"
                >
                  {t('maps.openLooker')} <ExternalLink size={12} />
                </a>
              </div>

              <div className="bg-white">
                <iframe
                  title="Tree Census — Maps & Statistics"
                  src={LOOKER_EMBED}
                  className="w-full block"
                  style={{ height: '78vh', minHeight: 540, border: 0 }}
                  allowFullScreen
                  sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
            </MangroveCard>
          )}
        </div>
      </div>
    </div>
  )
}

