'use client'

import { TopBar } from '@/components/layout/TopBar'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { Badge } from '@/components/ui/Badge'
import { Shield } from 'lucide-react'
import { UsersPanel } from '@/components/admin/UsersPanel'
import { AuditPanel } from '@/components/admin/AuditPanel'
import { useI18n } from '@/context/LanguageContext'
import type { TranslationKey } from '@/i18n/translations'
import type { UserRole } from '@/types'

const ROLES: UserRole[] = ['field_user', 'data_viewer', 'data_manager', 'analyst', 'admin']

export default function AdminPage() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={t('admin.title')}
        subtitle={t('admin.subtitle')}
        actions={<Badge variant="coral">{t('admin.adminOnly')}</Badge>}
      />

      <div className="flex-1 p-8 flex flex-col gap-6 overflow-auto">
        <UsersPanel />

        <MangroveCard variant="brown" seed={128} subtle>
          <h2 className="text-[14px] font-semibold text-neutral mb-4">
            <span className="flex items-center gap-2"><Shield size={14} className="text-coral/90" /> {t('admin.roleMatrix')}</span>
          </h2>
          <div className="flex flex-col gap-2">
            {ROLES.map(role => (
              <div key={role} className="flex items-start gap-4 py-3 border-b border-white/[0.04] last:border-0">
                <Badge variant={role === 'admin' ? 'coral' : role === 'analyst' ? 'violet' : 'default'}>
                  {t(`role.${role}` as TranslationKey)}
                </Badge>
                <span className="text-[13px] text-neutral">{t(`admin.roleDesc.${role}` as TranslationKey)}</span>
              </div>
            ))}
          </div>
        </MangroveCard>

        <AuditPanel />
      </div>
    </div>
  )
}
