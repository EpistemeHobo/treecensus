'use client'

import { FormEvent, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/context/LanguageContext'

interface Props {
  userId: string | null
  userEmail?: string
  onClose: () => void
  onDone: () => void
}

export function ResetPasswordModal({ userId, userEmail, onClose, onDone }: Props) {
  const { t } = useI18n()
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
        throw new Error(err.error ?? t('reset.failed'))
      }
      setPassword('')
      onDone()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reset.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={!!userId}
      onClose={() => { if (!loading) { setPassword(''); setError(''); onClose() } }}
      title={`${t('reset.title')}${userEmail ? ` — ${userEmail}` : ''}`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button size="sm" onClick={handleSubmit} loading={loading}>{t('reset.setPassword')}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t('reset.newPassword')}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={t('settings.min8Ph')}
          required
          autoFocus
        />
        {error && (
          <p className="text-[13px] text-rose border border-rose/20 bg-rose/5 rounded-sm px-3 py-2">
            {error}
          </p>
        )}
        <p className="text-[12px] text-muted">
          {t('reset.note')}
        </p>
      </form>
    </Modal>
  )
}
