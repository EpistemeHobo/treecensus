'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] text-muted uppercase tracking-widest font-medium">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full bg-ghost border rounded-sm px-4 py-3 text-[15px] text-neutral',
            'placeholder:text-muted/50 outline-none transition-all duration-200',
            error
              ? 'border-rose/50 focus:border-rose'
              : 'border-dim focus:border-coral/40 focus:bg-dim',
            className
          )}
          {...props}
        />
        {error && <p className="text-[12px] text-rose">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
