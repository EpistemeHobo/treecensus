'use client'

import { FormEvent, useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/LanguageContext'
import type { TranslationKey } from '@/i18n/translations'
import { User as UserIcon, KeyRound, Mail, ChevronDown, ChevronUp } from 'lucide-react'

interface Message {
  id: string
  userEmail: string
  title: string
  content: string
  adminComment: string | null
  status: 'approved' | 'rejected'
  createdAt: string
  read: boolean
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const [activeTab, setActiveTab] = useState<'account' | 'messages'>('account')
  const isTh = lang === 'th'

  // Manage Account state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Message Box state
  const [messages, setMessages] = useState<Message[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [msgLoading, setMsgLoading] = useState(false)
  const [msgError, setMsgError] = useState('')

  // Fetch messages
  useEffect(() => {
    if (activeTab !== 'messages') return
    let cancelled = false
    setMsgLoading(true)
    setMsgError('')
    fetch('/api/messages')
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        if (j.error) throw new Error(j.error)
        setMessages(j.messages || [])
      })
      .catch(err => {
        if (!cancelled) setMsgError(err instanceof Error ? err.message : 'Failed to load messages')
      })
      .finally(() => {
        if (!cancelled) setMsgLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeTab])

  // Handle password submit
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError(t('settings.min8'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('settings.mismatch'))
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
        throw new Error(err.error ?? t('settings.updateFailed'))
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess(t('settings.updated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.updateFailed'))
    } finally {
      setLoading(false)
    }
  }

  // Handle expanding / reading a message
  async function handleToggleExpand(msg: Message) {
    if (expandedId === msg.id) {
      setExpandedId(null)
      return
    }

    setExpandedId(msg.id)

    if (!msg.read) {
      try {
        const res = await fetch(`/api/messages/${msg.id}/read`, { method: 'POST' })
        if (res.ok) {
          setMessages(prev =>
            prev.map(m => (m.id === msg.id ? { ...m, read: true } : m))
          )
        }
      } catch (err) {
        console.error('Failed to mark message as read:', err)
      }
    }
  }

  const unreadCount = messages.filter(m => !m.read).length

  return (
    <div className="flex flex-col flex-1">
      <TopBar title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="flex-1 p-8 flex gap-6 overflow-auto items-start">
        {/* Sidebar tabs */}
        <nav className="w-64 shrink-0 sticky top-0 flex flex-col gap-0.5">
          <p className="text-[11px] text-muted uppercase tracking-widest font-medium px-3 pb-2">
            {isTh ? 'การตั้งค่าระบบ' : 'System Settings'}
          </p>

          <button
            onClick={() => setActiveTab('account')}
            className={
              'flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[13px] font-medium text-left transition-all duration-150 border ' +
              (activeTab === 'account'
                ? 'bg-coral/10 text-[#5E7D18] border-coral/10'
                : 'text-muted hover:text-neutral hover:bg-ghost border-transparent')
            }
          >
            <UserIcon size={15} className="shrink-0" />
            {t('settings.tabAccount')}
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={
              'flex items-center justify-between px-3 py-2.5 rounded-sm text-[13px] font-medium text-left transition-all duration-150 border ' +
              (activeTab === 'messages'
                ? 'bg-coral/10 text-[#5E7D18] border-coral/10'
                : 'text-muted hover:text-neutral hover:bg-ghost border-transparent')
            }
          >
            <span className="flex items-center gap-2.5">
              <Mail size={15} className="shrink-0" />
              {t('settings.tabMessages')}
            </span>
            {unreadCount > 0 && (
              <span className="bg-coral text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount}
              </span>
            )}
          </button>
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 max-w-2xl">
          {/* Tab content: Manage Account */}
          {activeTab === 'account' && (
            <>
              {/* Profile Info */}
              <MangroveCard variant="brown" seed={23} subtle>
                <h2 className="text-[14px] font-semibold text-neutral mb-4">
                  <span className="flex items-center gap-2">
                    <UserIcon size={14} className="text-muted" /> {t('settings.profile')}
                  </span>
                </h2>
                <div className="flex flex-col gap-3 text-[13px]">
                  <div className="flex justify-between border-b border-white/[0.04] pb-2">
                    <span className="text-muted uppercase tracking-widest text-[11px]">{t('settings.name')}</span>
                    <span className="text-neutral">{user?.name ?? '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.04] pb-2">
                    <span className="text-muted uppercase tracking-widest text-[11px]">{t('settings.email')}</span>
                    <span className="text-neutral">{user?.email ?? '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted uppercase tracking-widest text-[11px]">{t('settings.role')}</span>
                    <Badge variant={user?.role === 'admin' ? 'coral' : user?.role === 'analyst' ? 'violet' : 'default'}>
                      {user?.role ? t(`role.${user.role}` as TranslationKey) : '—'}
                    </Badge>
                  </div>
                </div>
                <p className="text-[12px] text-muted mt-4">
                  {t('settings.adminOnlyNote')}
                </p>
              </MangroveCard>

              {/* Change Password */}
              <MangroveCard variant="sand">
                <h2 className="text-[14px] font-semibold text-neutral mb-4">
                  <span className="flex items-center gap-2">
                    <KeyRound size={14} className="text-muted" /> {t('settings.changePassword')}
                  </span>
                </h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <Input
                    label={t('settings.currentPassword')}
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <Input
                    label={t('settings.newPassword')}
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={t('settings.min8Ph')}
                    required
                    autoComplete="new-password"
                  />
                  <Input
                    label={t('settings.confirmPassword')}
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
                    {t('settings.update')}
                  </Button>
                </form>
              </MangroveCard>
            </>
          )}

          {/* Tab content: Message Box */}
          {activeTab === 'messages' && (
            <div className="flex flex-col gap-4">
              {msgLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="w-6 h-6 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {msgError && (
                <p className="text-[13px] text-rose py-8 text-center">{msgError}</p>
              )}

              {!msgLoading && !msgError && messages.length === 0 && (
                <p className="text-[13px] text-muted py-12 text-center">
                  {t('settings.noMessages')}
                </p>
              )}

              {!msgLoading && !msgError && messages.map(msg => {
                const isExpanded = expandedId === msg.id
                const formattedDate = new Date(msg.createdAt).toLocaleString(
                  t('common.close') === 'Close' ? 'en-US' : 'th-TH',
                  {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )

                return (
                  <div
                    key={msg.id}
                    className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                      msg.read
                        ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                        : 'border-coral/30 bg-coral/5 hover:bg-coral/[0.08]'
                    }`}
                    onClick={() => handleToggleExpand(msg)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {!msg.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-coral inline-block shrink-0" />
                          )}
                          <span className="text-[13px] font-semibold text-neutral">
                            {msg.title}
                          </span>
                          <Badge variant={msg.status === 'approved' ? 'success' : 'warning'}>
                            {msg.status === 'approved' ? t('flag.approve') : t('flag.reject')}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted">{formattedDate}</p>
                      </div>

                      <div className="text-muted shrink-0 mt-1">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-white/[0.06] text-[12px] text-neutral space-y-3 cursor-default" onClick={e => e.stopPropagation()}>
                        <div className="whitespace-pre-wrap leading-relaxed text-neutral/80 bg-black/20 p-3 rounded-md border border-white/[0.03]">
                          {msg.content}
                        </div>

                        {msg.adminComment && (
                          <div className="bg-white/[0.03] p-3 rounded-md border border-white/[0.03]">
                            <span className="block font-semibold text-muted text-[11px] uppercase tracking-widest mb-1">
                              {t('settings.adminComment')}
                            </span>
                            <p className="text-neutral/90 whitespace-pre-wrap">{msg.adminComment}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
