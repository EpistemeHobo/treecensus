'use client'

import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { BarChart3, ExternalLink } from 'lucide-react'
import { useI18n } from '@/context/LanguageContext'

// Looker Studio embed (maps + statistics report).
const LOOKER_EMBED = 'https://datastudio.google.com/embed/reporting/b2bc645b-119e-425e-9bc2-dc7147e83604/page/p_slwi2rm84d'
const LOOKER_OPEN = LOOKER_EMBED.replace('/embed/reporting/', '/reporting/')

export default function MapsPage() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={t('maps.title')}
        subtitle={t('maps.subtitle')}
        actions={<Badge variant="violet">Looker Studio</Badge>}
      />

      <div className="flex-1 p-8 overflow-auto">
        {/* Mangrove-green card chrome with root texture; the report sits on a
            white panel inside so the light Looker theme reads as intentional. */}
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
      </div>
    </div>
  )
}
