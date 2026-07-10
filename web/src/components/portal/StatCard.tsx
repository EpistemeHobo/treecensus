import { ReactNode, useState } from 'react'
import { MangroveCard } from '@/components/ui/MangroveCard'
import clsx from 'clsx'

interface OptionItem {
  label: string
  onClick: () => void
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: ReactNode
  icon?: ReactNode
  accent?: 'coral' | 'violet' | 'neutral'
  seed?: number
  variant?: 'green' | 'brown' | 'sand'
  onIconClick?: () => void
  options?: OptionItem[]
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

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'neutral',
  seed,
  variant,
  onIconClick,
  options,
}: StatCardProps) {
  const s = seed ?? hashSeed(label)
  // Stagger the firefly animation per card so they don't pulse in lock-step.
  const delay = -((s % 3200) / 1000) + 7   // old -0…-3.2s, shifted +7s
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <MangroveCard seed={s} variant={variant} overflowVisible={true} className={clsx(showDropdown && 'z-30')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-2">{label}</p>
          <p className={clsx('text-[28px] font-semibold leading-none', accentClasses[accent])}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {sub && <p className="text-[12px] text-muted mt-1.5">{sub}</p>}
        </div>
        {icon && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (options && options.length > 0) {
                  setShowDropdown(!showDropdown)
                } else if (onIconClick) {
                  onIconClick()
                }
              }}
              className="firefly w-[37px] h-[37px] rounded-sm bg-ghost border border-coral/30 flex items-center justify-center text-coral shrink-0 [&>svg]:w-[19px] [&>svg]:h-[19px] hover:bg-coral/10 hover:border-coral/60 transition-all cursor-pointer active:scale-95"
              style={{ animationDelay: `${delay}s` }}
            >
              {icon}
            </button>
            {showDropdown && options && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDropdown(false)
                  }}
                />
                <div className="absolute left-0 mt-1.5 w-44 bg-surface border border-dim rounded-sm shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {options.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDropdown(false)
                        opt.onClick()
                      }}
                      className="w-full text-left px-3 py-2 text-[12px] font-semibold text-neutral hover:bg-ghost transition-colors cursor-pointer"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </MangroveCard>
  )
}
