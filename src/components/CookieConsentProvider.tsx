'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import CookieConsentBanner from '@/components/CookieConsentBanner'
import {
  COOKIE_CONSENT_STORAGE_KEY,
  isCookieConsentDecision,
  type CookieConsentDecision
} from '@/lib/cookie-consent'

interface CookieConsentContextValue {
  consent: CookieConsentDecision | null
  ready: boolean
  saveConsent: (decision: CookieConsentDecision, language: string) => Promise<void>
  resetConsent: () => void
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

export function useCookieConsent() {
  const context = useContext(CookieConsentContext)
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider')
  }
  return context
}

async function logConsentDecision(decision: CookieConsentDecision, language: string) {
  try {
    await fetch('/api/cookie-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, language })
    })
  } catch (error) {
    console.error('Failed to log cookie consent:', error)
  }
}

export default function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentDecision | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    if (isCookieConsentDecision(stored)) {
      setConsent(stored)
    }
    setReady(true)
  }, [])

  const saveConsent = async (decision: CookieConsentDecision, language: string) => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, decision)
    setConsent(decision)
    await logConsentDecision(decision, language)
  }

  const resetConsent = () => {
    localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY)
    setConsent(null)
  }

  return (
    <CookieConsentContext.Provider value={{ consent, ready, saveConsent, resetConsent }}>
      {children}
      {ready && consent === null && <CookieConsentBanner />}
      {consent === 'accepted' && <GoogleAnalytics />}
    </CookieConsentContext.Provider>
  )
}
