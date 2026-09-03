'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Language = 'no' | 'en'

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

function readLangFromLocation(): Language | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const lang = params.get('lang')
    if (lang === 'en' || lang === 'no' || lang === 'nb') {
      return lang === 'nb' ? 'no' : lang
    }
  } catch {
    // Ignore
  }
  return null
}

function syncLangToUrl(language: Language) {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    if (language === 'en') {
      url.searchParams.set('lang', 'en')
    } else {
      url.searchParams.delete('lang')
    }
    window.history.replaceState({}, '', url.toString())
  } catch {
    // Ignore
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('no')

  useEffect(() => {
    const fromUrl = readLangFromLocation()
    if (fromUrl) {
      setLanguageState(fromUrl)
      return
    }
    const stored = localStorage.getItem('language')
    if (stored === 'no' || stored === 'en') {
      setLanguageState(stored)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('language', language)
    document.documentElement.lang = language === 'en' ? 'en' : 'nb'
  }, [language])

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage)
    syncLangToUrl(nextLanguage)
  }

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
