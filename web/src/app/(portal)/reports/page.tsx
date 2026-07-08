'use client'

import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FileText, Plus } from 'lucide-react'
import { useI18n } from '@/context/LanguageContext'
import type { TranslationKey } from '@/i18n/translations'

const SECTION_TYPES: { type: TranslationKey; desc: TranslationKey }[] = [
  { type: 'reports.summaryTable', desc: 'reports.summaryTableDesc' },
  { type: 'reports.chart',        desc: 'reports.chartDesc' },
  { type: 'reports.mapSnapshot',  desc: 'reports.mapSnapshotDesc' },
  { type: 'reports.textBlock',    desc: 'reports.textBlockDesc' },
  { type: 'reports.image',        desc: 'reports.imageDesc' },
  { type: 'reports.signature',    desc: 'reports.signatureDesc' },
]

export default function ReportsPage() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={
          <Button size="sm">
            <Plus size={13} />
            {t('reports.new')}
          </Button>
        }
      />

      <div className="flex-1 p-8 flex flex-col gap-6 overflow-auto">

        {/* Report list */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[14px] font-semibold text-neutral">{t('reports.your')}</h2>
            <Badge variant="warning">Milestone 9</Badge>
          </div>

          <div className="flex flex-col items-center justify-center py-14 text-muted gap-3">
            <FileText size={32} className="opacity-25" />
            <p className="text-[13px]">{t('reports.none')}</p>
            <p className="text-[12px] opacity-60 max-w-xs text-center">
              {t('reports.noneHint')}
            </p>
          </div>
        </Card>

        {/* Report builder placeholder */}
        <Card>
          <h2 className="text-[14px] font-semibold text-neutral mb-4">{t('reports.builder')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SECTION_TYPES.map(s => (
              <div
                key={s.type}
                className="border border-dashed border-white/[0.08] rounded-sm p-4 opacity-50"
              >
                <p className="text-[13px] font-medium text-neutral">{t(s.type)}</p>
                <p className="text-[12px] text-muted mt-1">{t(s.desc)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
