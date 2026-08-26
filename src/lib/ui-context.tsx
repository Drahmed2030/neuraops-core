'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Lang, ThemeMode } from '@/types/ui'
import { getTranslations, type Translations } from './i18n'

interface UIContextValue {
  lang: Lang
  theme: ThemeMode
  t: Translations
  isDark: boolean
  toggleLang: () => void
  toggleTheme: () => void
  mounted: boolean
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: React.ReactNode }) {
  // Read initial values synchronously from the DOM attributes the
  // blocking <head> script already set — this guarantees the first
  // React render matches what's already painted (no hydration flash).
  const [lang, setLang] = useState<Lang>('en')
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const htmlEl = document.documentElement
    const currentLang = (htmlEl.lang as Lang) || 'en'
    const currentTheme = htmlEl.classList.contains('dark') ? 'dark' : 'light'
    setLang(currentLang)
    setTheme(currentTheme)
    setMounted(true)
  }, [])

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next: Lang = prev === 'ar' ? 'en' : 'ar'
      const htmlEl = document.documentElement
      htmlEl.lang = next
      htmlEl.dir = next === 'ar' ? 'rtl' : 'ltr'
      localStorage.setItem('neuraops-lang', next)
      return next
    })
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
      const htmlEl = document.documentElement
      if (next === 'dark') {
        htmlEl.classList.add('dark')
      } else {
        htmlEl.classList.remove('dark')
      }
      localStorage.setItem('neuraops-theme', next)
      return next
    })
  }, [])

  const value: UIContextValue = {
    lang,
    theme,
    t: getTranslations(lang),
    isDark: theme === 'dark',
    toggleLang,
    toggleTheme,
    mounted,
  }

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
