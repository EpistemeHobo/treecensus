import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { BarChart3, ExternalLink } from 'lucide-react'

// Looker Studio embed (maps + statistics report).
const LOOKER_EMBED = 'https://datastudio.google.com/embed/reporting/b2bc645b-119e-425e-9bc2-dc7147e83604/page/p_slwi2rm84d'
const LOOKER_OPEN = LOOKER_EMBED.replace('/embed/reporting/', '/reporting/')

export default function MapsPage() {
  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Maps & Statistics"
        subtitle="Geographic distribution and live statistics"
        actions={<Badge variant="violet">Looker Studio</Badge>}
      />

      <div className="flex-1 p-8 overflow-auto">
        {/* Card chrome matches the portal; the report sits on a white panel
            with clipped corners so the light Looker theme reads as intentional. */}
        <div className="bg-white/5 dark:bg-surface backdrop-blur-sm border border-dim rounded-lg overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-dim">
            <span className="flex items-center gap-2 text-[12px] uppercase tracking-widest font-semibold text-muted">
              <BarChart3 size={13} /> Census Report
            </span>
            <a
              href={LOOKER_OPEN}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] text-muted hover:text-coral transition-colors"
            >
              Open in Looker Studio <ExternalLink size={12} />
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
        </div>
      </div>
    </div>
  )
}
