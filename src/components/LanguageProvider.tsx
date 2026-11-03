'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

export type Language = 'no' | 'en'

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

function routeLanguage(pathname: string | null): Language | null {
  if (pathname === '/en' || pathname?.startsWith('/en/')) return 'en'
  if (pathname === '/') return 'no'
  return null
}

function readLangFromLocation(): Language | null {
  if (typeof window === 'undefined') return null
  try {
    const lang = new URLSearchParams(window.location.search).get('lang')
    if (lang === 'en' || lang === 'no' || lang === 'nb') {
      return lang === 'nb' ? 'no' : lang
    }
  } catch {
    // Ignore malformed query strings
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
  const pathname = usePathname()
  // The /en route must render English on the server, before hydration.
  const [language, setLanguageState] = useState<Language>(() => routeLanguage(pathname) ?? 'no')

  useEffect(() => {
    const fromRoute = routeLanguage(pathname)
    const fromUrl = readLangFromLocation()
    const stored = window.localStorage.getItem('language')
    const resolved = fromRoute ?? fromUrl ?? (stored === 'no' || stored === 'en' ? stored : 'no')
    setLanguageState(resolved)
    window.localStorage.setItem('language', resolved)
    document.documentElement.lang = resolved === 'en' ? 'en' : 'nb'
  }, [pathname])

  const setLanguage = (nextLanguage: Language) => {
    if (typeof window === 'undefined') return

    // Homepage languages are separate, indexable routes.
    if (pathname === '/' || pathname === '/en') {
      const destination = nextLanguage === 'en' ? '/en' : '/'
      if (window.location.pathname !== destination) {
        window.localStorage.setItem('language', nextLanguage)
        window.location.assign(destination)
      }
      return
    }

    // Other pages still use the existing language selection until migrated.
    setLanguageState(nextLanguage)
    window.localStorage.setItem('language', nextLanguage)
    document.documentElement.lang = nextLanguage === 'en' ? 'en' : 'nb'
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
