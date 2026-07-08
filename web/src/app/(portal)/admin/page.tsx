'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { Badge } from '@/components/ui/Badge'
import { Shield, Users, ShieldAlert } from 'lucide-react'
import { UsersPanel } from '@/components/admin/UsersPanel'
import { FlagsPanel } from '@/components/admin/FlagsPanel'
import { AuditPanel } from '@/components/admin/AuditPanel'
import { useI18n } from '@/context/LanguageContext'
import type { TranslationKey } from '@/i18n/translations'
import type { UserRole } from '@/types'

const ROLES: UserRole[] = ['field_user', 'data_viewer', 'data_manager', 'analyst', 'admin']

export default function AdminPage() {
  const { t, lang } = useI18n()
  const [tab, setTab] = useState<'users' | 'verification'>('users')
  const isTh = lang === 'th'

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={t('admin.title')}
        subtitle={t('admin.subtitle')}
        actions={<Badge variant="coral">{t('admin.adminOnly')}</Badge>}
      />

      <div className="flex-1 p-8 flex gap-6 overflow-auto items-start">
        {/* Sidebar tabs */}
        <nav className="w-64 shrink-0 sticky top-0 flex flex-col gap-0.5">
          <p className="text-[11px] text-muted uppercase tracking-widest font-medium px-3 pb-2">
            {isTh ? 'การควบคุมระบบ' : 'System Administration'}
          </p>
          
          <button
            onClick={() => setTab('users')}
            className={
              'flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[13px] font-medium text-left transition-all duration-150 border ' +
              (tab === 'users'
                ? 'bg-coral/10 text-[#5E7D18] border-coral/10'
                : 'text-muted hover:text-neutral hover:bg-ghost border-transparent')
            }
          >
            <Users size={15} className="shrink-0" />
            {t('admin.tabUsers')}
          </button>

          <button
            onClick={() => setTab('verification')}
            className={
              'flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[13px] font-medium text-left transition-all duration-150 border ' +
              (tab === 'verification'
                ? 'bg-coral/10 text-[#5E7D18] border-coral/10'
                : 'text-muted hover:text-neutral hover:bg-ghost border-transparent')
            }
          >
            <ShieldAlert size={15} className="shrink-0" />
            {t('admin.tabVerification')}
          </button>
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {tab === 'users' ? (
            <>
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
            </>
          ) : (
            <FlagsPanel />
          )}
        </div>
      </div>
    </div>
  )
}
