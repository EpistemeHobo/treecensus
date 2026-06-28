import { ReactNode } from 'react'
import { TiltCard } from '@/components/ui/TiltCard'
import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  accent?: 'coral' | 'violet' | 'neutral'
}

const accentClasses = {
  coral:   'text-coral',
  violet:  'text-violet',
  neutral: 'text-neutral',
}

export function StatCard({ label, value, sub, icon, accent = 'neutral' }: StatCardProps) {
  return (
    <TiltCard maxTilt={10} glare>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-2">{label}</p>
          <p className={clsx('text-[28px] font-semibold leading-none', accentClasses[accent])}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {sub && <p className="text-[12px] text-muted mt-1.5">{sub}</p>}
        </div>
        {icon && (
          <div className="w-9 h-9 rounded-sm bg-ghost border border-dim flex items-center justify-center text-muted shrink-0">
            {icon}
          </div>
        )}
      </div>
    </TiltCard>
  )
}
