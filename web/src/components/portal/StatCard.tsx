import { ReactNode } from 'react'
import { MangroveCard } from '@/components/ui/MangroveCard'
import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  accent?: 'coral' | 'violet' | 'neutral'
  seed?: number
}

const accentClasses = {
  coral:   'text-coral',
  violet:  'text-violet',
  neutral: 'text-neutral',
}

// Stable per-label seed so each stat card grows a distinct root cluster
// without the caller needing to pick numbers manually.
function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0 }
  return h
}

export function StatCard({ label, value, sub, icon, accent = 'neutral', seed }: StatCardProps) {
  const s = seed ?? hashSeed(label)
  // Stagger the firefly animation per card so they don't pulse in lock-step.
  const delay = -((s % 3200) / 1000) + 7   // old -0…-3.2s, shifted +7s
  return (
    <MangroveCard seed={s}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-2">{label}</p>
          <p className={clsx('text-[28px] font-semibold leading-none', accentClasses[accent])}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {sub && <p className="text-[12px] text-muted mt-1.5">{sub}</p>}
        </div>
        {icon && (
          <div
            className="firefly w-[37px] h-[37px] rounded-sm bg-ghost border border-coral/30 flex items-center justify-center text-coral shrink-0 [&>svg]:w-[19px] [&>svg]:h-[19px]"
            style={{ animationDelay: `${delay}s` }}
          >
            {icon}
          </div>
        )}
      </div>
    </MangroveCard>
  )
}
