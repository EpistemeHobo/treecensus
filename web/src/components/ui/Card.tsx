import { ReactNode } from 'react'
import clsx from 'clsx'
import { TiltCard } from './TiltCard'

interface CardProps {
  children: ReactNode
  className?: string
  gradient?: boolean
  tilt?: boolean
}

export function Card({ children, className, gradient, tilt }: CardProps) {
  if (tilt) {
    return <TiltCard className={className} gradient={gradient}>{children}</TiltCard>
  }

  if (gradient) {
    return (
      <div
        className="rounded-lg p-px"
        style={{
          background: 'linear-gradient(135deg, rgba(168,204,58,0.75), rgba(196,149,106,0.75), rgba(134,163,46,0.5))',
        }}
      >
        <div className={clsx('bg-white/5 dark:bg-surface backdrop-blur-sm rounded-[15px] p-6', className)}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={clsx(
      'bg-white/5 dark:bg-surface backdrop-blur-sm border border-dim rounded-lg p-6',
      className
    )}>
      {children}
    </div>
  )
}
