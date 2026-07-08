'use client'

import { useI18n } from '@/context/LanguageContext'
import { LANGUAGES } from '@/i18n/translations'
import clsx from 'clsx'

// TH | ENG pill switch. Thai is the default language.
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n()

  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-full border border-dim bg-ghost/60 p-0.5',
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={clsx(
            'px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider transition-all duration-150',
            lang === code
              ? 'bg-coral/15 text-coral border border-coral/25'
              : 'text-muted hover:text-neutral border border-transparent',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
