'use client'

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { translations, DEFAULT_LANG, LANG_STORAGE_KEY, type Lang, type TranslationKey } from '@/i18n/translations'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Thai is the default; the stored preference is applied after mount so the
  // server-rendered markup (always Thai) matches the first client render.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)

  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    if (stored === 'th' || stored === 'en') setLangState(stored)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try { localStorage.setItem(LANG_STORAGE_KEY, next) } catch { /* private mode */ }
  }, [])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      let text = translations[lang][key] ?? translations.en[key] ?? key
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value))
        }
      }
      return text
    },
    [lang],
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider')
  return ctx
}
