'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer select-none',
        'rounded-sm tracking-wider uppercase text-[13px]',
        {
          'px-5 py-2.5': size === 'sm',
          'px-6 py-3':   size === 'md',
          'px-8 py-4':   size === 'lg',
        },
        {
          'bg-bg text-neutral border border-dim hover:border-coral/40 hover:shadow-coral':
            variant === 'primary',
          'bg-ghost text-muted border border-dim hover:bg-dim hover:text-neutral':
            variant === 'secondary',
          'bg-transparent text-muted hover:text-neutral':
            variant === 'ghost',
          'bg-rose/10 text-rose border border-rose/20 hover:bg-rose/20':
            variant === 'danger',
        },
        (disabled || loading) && 'opacity-40 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
