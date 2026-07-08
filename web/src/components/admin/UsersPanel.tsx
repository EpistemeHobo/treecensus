'use client'

import { useCallback, useEffect, useState } from 'react'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { UserPlus, KeyRound, Trash2 } from 'lucide-react'
import { AddUserModal } from './AddUserModal'
import { ResetPasswordModal } from './ResetPasswordModal'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/LanguageContext'
import type { TranslationKey } from '@/i18n/translations'
import type { UserRole } from '@/types'

interface AdminUser {
  id: string
  email: string
  name: string
  role: UserRole
  status: 'active' | 'disabled'
  createdAt: string
  lastLogin?: string
  [key: string]: unknown
}

const ROLES: UserRole[] = ['field_user', 'data_viewer', 'data_manager', 'analyst', 'admin']

function fmt(ts?: string) {
  if (!ts) return '—'
  try { return new Date(ts).toLocaleString() } catch { return ts }
}

export function UsersPanel() {
  const { user: me } = useAuth()
  const { t } = useI18n()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? t('users.loadFailed'))
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  async function changeRole(id: string, role: UserRole) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? t('users.roleFailed'))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.roleFailed'))
    } finally {
      setBusyId(null)
    }
  }

  async function toggleStatus(u: AdminUser) {
    const next = u.status === 'active' ? 'disabled' : 'active'
    setBusyId(u.id)
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? t('users.statusFailed'))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.statusFailed'))
    } finally {
      setBusyId(null)
    }
  }

  async function deleteUser(u: AdminUser) {
    if (!confirm(t('users.deleteConfirm', { email: u.email }))) return
    setBusyId(u.id)
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? t('users.deleteFailed'))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.deleteFailed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <MangroveCard seed={91} subtle>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[14px] font-semibold text-neutral">{t('users.title')}</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus size={13} />
          {t('users.add')}
        </Button>
      </div>

      {error && (
        <p className="text-[13px] text-rose border border-rose/20 bg-rose/5 rounded-sm px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <Table<AdminUser>
        loading={loading}
        keyField="id"
        columns={[
          { key: 'name', label: t('users.name'), render: u => (
            <div className="flex flex-col">
              <span className="text-neutral">{u.name}</span>
              <span className="text-[11px] text-muted">{u.email}</span>
            </div>
          )},
          { key: 'role', label: t('users.role'), render: u => (
            <select
              value={u.role}
              disabled={busyId === u.id || me?.id === u.id}
              onChange={e => changeRole(u.id, e.target.value as UserRole)}
              className="bg-ghost border border-dim rounded-sm px-2 py-1 text-[12px] text-neutral outline-none focus:border-coral/40"
              title={me?.id === u.id ? t('users.cantChangeOwnRole') : undefined}
            >
              {ROLES.map(r => <option key={r} value={r}>{t(`role.${r}` as TranslationKey)}</option>)}
            </select>
          )},
          { key: 'status', label: t('users.status'), render: u => (
            <button
              onClick={() => toggleStatus(u)}
              disabled={busyId === u.id || me?.id === u.id}
              className="cursor-pointer disabled:cursor-not-allowed"
              title={me?.id === u.id ? t('users.cantDisableSelf') : t('users.clickToToggle')}
            >
              <Badge variant={u.status === 'active' ? 'success' : 'danger'}>
                {t(`status.${u.status}` as TranslationKey)}
              </Badge>
            </button>
          )},
          { key: 'lastLogin', label: t('users.lastLogin'), render: u => (
            <span className="text-[12px] text-muted">{fmt(u.lastLogin)}</span>
          )},
          { key: 'actions', label: '', className: 'w-24', render: u => (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setResetTarget(u)}
                className="p-1.5 rounded-sm text-muted hover:text-neutral hover:bg-ghost transition-colors"
                title={t('users.resetPassword')}
              >
                <KeyRound size={13} />
              </button>
              <button
                onClick={() => deleteUser(u)}
                disabled={me?.id === u.id}
                className="p-1.5 rounded-sm text-muted hover:text-rose hover:bg-rose/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={me?.id === u.id ? t('users.cantDeleteSelf') : t('users.deleteUser')}
              >
                <Trash2 size={13} />
              </button>
            </div>
          )},
        ]}
        rows={users}
        emptyMessage={t('users.none')}
      />

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
      <ResetPasswordModal
        userId={resetTarget?.id ?? null}
        userEmail={resetTarget?.email}
        onClose={() => setResetTarget(null)}
        onDone={load}
        />
    </MangroveCard>
  )
}
