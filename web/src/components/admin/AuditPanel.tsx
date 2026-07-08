'use client'

import { useEffect, useState } from 'react'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { useI18n } from '@/context/LanguageContext'

interface AuditEvent {
  id: string
  actorEmail?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  meta?: string | null
  createdAt: string
  [key: string]: unknown
}

function fmt(ts: string) {
  try { return new Date(ts).toLocaleString() } catch { return ts }
}

function actionVariant(action: string): 'default' | 'coral' | 'violet' | 'danger' | 'success' {
  if (action.startsWith('auth.login_failed')) return 'danger'
  if (action.startsWith('auth.')) return 'violet'
  if (action.startsWith('user.delete') || action.endsWith('_reset')) return 'danger'
  if (action.startsWith('user.')) return 'coral'
  return 'default'
}

export function AuditPanel() {
  const { t } = useI18n()
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/audit')
      .then(async r => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? t('audit.loadFailed'))
        return r.json()
      })
      .then(d => setEvents(d.events ?? []))
      .catch(e => setError(e instanceof Error ? e.message : t('audit.loadFailed')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once; error text uses the language active at load time
  }, [])

  return (
    <MangroveCard variant="sand">
      <h2 className="text-[14px] font-semibold text-neutral mb-5">{t('audit.title')}</h2>
      {error && (
        <p className="text-[13px] text-rose border border-rose/20 bg-rose/5 rounded-sm px-3 py-2 mb-4">
          {error}
        </p>
      )}
      <Table<AuditEvent>
        loading={loading}
        keyField="id"
        columns={[
          { key: 'createdAt', label: t('audit.when'), render: e => (
            <span className="text-[12px] text-muted whitespace-nowrap">{fmt(e.createdAt)}</span>
          )},
          { key: 'actorEmail', label: t('audit.actor'), render: e => (
            <span className="text-[12px] text-neutral">{e.actorEmail ?? '—'}</span>
          )},
          { key: 'action', label: t('audit.action'), render: e => (
            <Badge variant={actionVariant(e.action)}>{e.action}</Badge>
          )},
          { key: 'targetType', label: t('audit.target'), render: e => (
            <span className="text-[12px] text-muted">
              {e.targetType ? `${e.targetType}${e.targetId ? ` · ${e.targetId.slice(0, 8)}` : ''}` : '—'}
            </span>
          )},
          { key: 'meta', label: t('audit.details'), render: e => (
            <span className="text-[11px] font-mono text-muted">{e.meta ?? ''}</span>
          )},
        ]}
        rows={events}
        emptyMessage={t('audit.none')}
        />
    </MangroveCard>
  )
}
