'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/LanguageProvider'
import { useCookieConsent } from '@/components/CookieConsentProvider'

export default function CookieConsentBanner() {
  const { language } = useLanguage()
  const { saveConsent } = useCookieConsent()
  const [isSaving, setIsSaving] = useState(false)
  const isEnglish = language === 'en'
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)

  const handleChoice = async (decision: 'accepted' | 'declined') => {
    if (isSaving) return
    setIsSaving(true)
    try {
      await saveConsent(decision, language)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6"
      role="dialog"
      aria-live="polite"
      aria-label={t('Informasjon om informasjonskapsler', 'Cookie information')}
    >
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-600/70 bg-slate-900/95 backdrop-blur-md shadow-2xl p-4 sm:p-5">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
          {t('Vi bruker informasjonskapsler', 'We use cookies')}
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-3">
          {t(
            'PRO11 bruker nødvendige informasjonskapsler for innlogging og sikkerhet. Med ditt samtykke bruker vi også Google Analytics for anonym trafikkstatistikk (sidevisninger, enhetstype og hvordan siden brukes). Vi selger ikke data videre.',
            'PRO11 uses essential cookies for login and security. With your consent, we also use Google Analytics for anonymous traffic statistics (page views, device type, and how the site is used). We do not sell your data.'
          )}
        </p>
        <p className="text-xs text-slate-400 mb-4">
          {t('Les mer i ', 'Read more in our ')}
          <Link href="/personvern" className="text-blue-400 hover:text-blue-300 underline">
            {t('personvernerklæringen', 'privacy policy')}
          </Link>
          .
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => handleChoice('declined')}
            disabled={isSaving}
            className="pro11-button-secondary text-sm disabled:opacity-50"
          >
            {isSaving ? t('Lagrer...', 'Saving...') : t('Avslå analyse', 'Decline analytics')}
          </button>
          <button
            type="button"
            onClick={() => handleChoice('accepted')}
            disabled={isSaving}
            className="pro11-button text-sm disabled:opacity-50"
          >
            {isSaving ? t('Lagrer...', 'Saving...') : t('Godta analyse', 'Accept analytics')}
          </button>
        </div>
      </div>
    </div>
  )
}
