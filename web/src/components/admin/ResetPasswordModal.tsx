'use client'

import { FormEvent, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Props {
  userId: string | null
  userEmail?: string
  onClose: () => void
  onDone: () => void
}

export function ResetPasswordModal({ userId, userEmail, onClose, onDone }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to reset password.')
      }
      setPassword('')
      onDone()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={!!userId}
      onClose={() => { if (!loading) { setPassword(''); setError(''); onClose() } }}
      title={`Reset password${userEmail ? ` — ${userEmail}` : ''}`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} loading={loading}>Set password</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="New password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          required
          autoFocus
        />
        {error && (
          <p className="text-[13px] text-rose border border-rose/20 bg-rose/5 rounded-sm px-3 py-2">
            {error}
          </p>
        )}
        <p className="text-[12px] text-muted">
          The user's current password will be replaced immediately. Share the new password with them over a secure channel.
        </p>
      </form>
    </Modal>
  )
}
