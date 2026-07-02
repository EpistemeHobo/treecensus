'use client'

import { FormEvent, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/context/AuthContext'
import { User as UserIcon, KeyRound } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Could not update password.')
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Password updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Settings" subtitle="Manage your account" />

      <div className="flex-1 p-8 flex flex-col gap-6 overflow-auto max-w-2xl">
        <Card>
          <h2 className="text-[14px] font-semibold text-neutral mb-4">
            <span className="flex items-center gap-2">
              <UserIcon size={14} className="text-muted" /> Profile
            </span>
          </h2>
          <div className="flex flex-col gap-3 text-[13px]">
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span className="text-muted uppercase tracking-widest text-[11px]">Name</span>
              <span className="text-neutral">{user?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span className="text-muted uppercase tracking-widest text-[11px]">Email</span>
              <span className="text-neutral">{user?.email ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted uppercase tracking-widest text-[11px]">Role</span>
              <Badge variant={user?.role === 'admin' ? 'coral' : user?.role === 'analyst' ? 'violet' : 'default'}>
                {user?.role?.replace('_', ' ') ?? '—'}
              </Badge>
            </div>
          </div>
          <p className="text-[12px] text-muted mt-4">
            Name, email, and role can only be changed by an administrator.
          </p>
        </Card>

        <Card>
          <h2 className="text-[14px] font-semibold text-neutral mb-4">
            <span className="flex items-center gap-2">
              <KeyRound size={14} className="text-muted" /> Change password
            </span>
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            {error && (
              <p className="text-[13px] text-rose border border-rose/20 bg-rose/5 rounded-sm px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-[13px] text-emerald-500 border border-emerald-500/20 bg-emerald-500/5 rounded-sm px-3 py-2">
                {success}
              </p>
            )}

            <Button type="submit" loading={loading} className="self-start">
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
