import { ReactNode } from 'react'
import clsx from 'clsx'

type BadgeVariant = 'default' | 'coral' | 'violet' | 'success' | 'warning' | 'danger'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-ghost text-muted border-dim',
  coral:   'bg-coral/10 text-coral border-coral/20',
  violet:  'bg-violet/10 text-violet border-violet/20',
  success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  danger:  'bg-rose/10 text-rose border-rose/20',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-widest border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
