'use client'

import { FormEvent, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { UserRole } from '@/types'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'field_user',   label: 'Field User' },
  { value: 'data_viewer',  label: 'Data Viewer' },
  { value: 'data_manager', label: 'Data Manager' },
  { value: 'analyst',      label: 'Analyst' },
  { value: 'admin',        label: 'Admin' },
]

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function AddUserModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('data_viewer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function reset() {
    setName(''); setEmail(''); setPassword(''); setRole('data_viewer'); setError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to create user.')
      }
      reset()
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!loading) { reset(); onClose() } }}
      title="Add User"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => { if (!loading) { reset(); onClose() } }}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} loading={loading}>
            Create user
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Full name"
          required
          autoFocus
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="user@organisation.org"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] text-muted uppercase tracking-widest font-medium">Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            className="w-full bg-ghost border border-dim rounded-sm px-4 py-3 text-[15px] text-neutral outline-none focus:border-coral/40 focus:bg-dim"
          >
            {ROLE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-[13px] text-rose border border-rose/20 bg-rose/5 rounded-sm px-3 py-2">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
