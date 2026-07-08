'use client'

import { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { LanguageToggle } from '@/components/ui/LanguageToggle'

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-dim bg-surface/60 backdrop-blur-sm transition-colors duration-200">
      <div>
        <h1 className="text-[18px] font-semibold text-neutral tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <LanguageToggle />
        <Badge variant="default">{process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0'}</Badge>
        {actions}
      </div>
    </header>
  )
}
