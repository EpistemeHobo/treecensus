'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { TiltCard } from '@/components/ui/TiltCard'

export function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <TiltCard gradient maxTilt={6} glare className="w-full max-w-sm px-8 py-9">
      <div className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-coral mb-1">Tree Census</p>
        <h2 className="text-[22px] font-semibold text-neutral leading-tight">Sign in to continue</h2>
        <p className="text-[13px] text-muted mt-1.5">Portal access is restricted to authorised users.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@organisation.org"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && (
          <p className="text-[13px] text-rose border border-rose/20 bg-rose/5 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full mt-2" loading={loading}>
          Sign in
        </Button>
      </form>
    </TiltCard>
  )
}
