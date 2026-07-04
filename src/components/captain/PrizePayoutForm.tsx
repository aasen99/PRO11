'use client'

import React, { useState } from 'react'
import { Award, CheckCircle } from 'lucide-react'
import { apiFetch } from '@/lib/client-fetch'
import {
  normalizeIban,
  normalizeNorwegianBankAccount,
  type PrizePayoutRecord,
  type PrizePayoutType,
  validatePrizePayoutInput
} from '@/lib/prize-payout'

interface PrizePayoutFormProps {
  teamId: string
  tournamentTitle: string
  prizeAmount: number
  initialPayout: PrizePayoutRecord
  isEnglish: boolean
  onSaved: (record: PrizePayoutRecord) => void
}

export default function PrizePayoutForm({
  teamId,
  tournamentTitle,
  prizeAmount,
  initialPayout,
  isEnglish,
  onSaved
}: PrizePayoutFormProps) {
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)
  const [payoutType, setPayoutType] = useState<PrizePayoutType>(
    initialPayout.type || 'norwegian'
  )
  const [bankAccount, setBankAccount] = useState(initialPayout.bankAccount || '')
  const [iban, setIban] = useState(initialPayout.iban || '')
  const [swiftBic, setSwiftBic] = useState(initialPayout.swiftBic || '')
  const [accountHolder, setAccountHolder] = useState(initialPayout.accountHolder || '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(Boolean(initialPayout.submittedAt))

  const prizeLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0
  }).format(prizeAmount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validation = validatePrizePayoutInput(
      {
        type: payoutType,
        bankAccount,
        iban,
        swiftBic,
        accountHolder
      },
      isEnglish
    )
    if (!validation.valid) {
      setError(validation.error || t('Ugyldig kontoinformasjon.', 'Invalid account information.'))
      return
    }

    setIsSaving(true)
    try {
      const response = await apiFetch('/api/teams', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: teamId,
          prizePayout: {
            type: payoutType,
            bankAccount: payoutType === 'norwegian' ? normalizeNorwegianBankAccount(bankAccount) : undefined,
            iban: payoutType === 'international' ? normalizeIban(iban) : undefined,
            swiftBic: payoutType === 'international' ? swiftBic.replace(/\s/g, '').toUpperCase() : undefined,
            accountHolder: payoutType === 'international' ? accountHolder.trim() : undefined
          }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || t('Kunne ikke lagre kontoinformasjon.', 'Could not save account information.'))
        return
      }

      const record: PrizePayoutRecord = {
        type: data.team?.prizePayoutType || data.team?.prize_payout_type || payoutType,
        bankAccount: data.team?.prizeBankAccount || data.team?.prize_bank_account || null,
        iban: data.team?.prizeIban || data.team?.prize_iban || null,
        swiftBic: data.team?.prizeSwiftBic || data.team?.prize_swift_bic || null,
        accountHolder: data.team?.prizeAccountHolder || data.team?.prize_account_holder || null,
        submittedAt: data.team?.prizePayoutSubmittedAt || data.team?.prize_payout_submitted_at || new Date().toISOString()
      }
      setSaved(true)
      onSaved(record)
    } catch {
      setError(t('Noe gikk galt. Prøv igjen.', 'Something went wrong. Please try again.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="pro11-card p-6 mb-6 border border-green-500/40 bg-green-900/10">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xl font-bold mb-1">{t('Premieinformasjon mottatt', 'Prize information received')}</h2>
            <p className="text-slate-300 text-sm mb-2">
              {t(
                `${tournamentTitle} · Premie ${prizeLabel}. Utbetaling skjer innen 1–3 virkedager.`,
                `${tournamentTitle} · Prize ${prizeLabel}. Payout within 1–3 business days.`
              )}
            </p>
            <p className="text-xs text-slate-400">
              {t(
                'Kontakt admin på Discord hvis du må endre kontoinformasjon.',
                'Contact admin on Discord if you need to change your account details.'
              )}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pro11-card p-6 mb-6 border border-yellow-500/40 bg-yellow-900/10">
      <div className="flex items-start gap-3 mb-4">
        <Award className="w-7 h-7 text-yellow-400 shrink-0" />
        <div>
          <h2 className="text-xl font-bold mb-1">{t('Gratulerer, du vant!', 'Congratulations, you won!')}</h2>
          <p className="text-slate-300 text-sm">
            {t(
              `Du vant ${tournamentTitle} og premien på ${prizeLabel}. Fyll inn kontoinformasjon for utbetaling.`,
              `You won ${tournamentTitle} and the prize of ${prizeLabel}. Enter your account details for payout.`
            )}
          </p>
          <p className="text-amber-200/90 text-sm mt-2">
            {t(
              'Premien utbetales innen 1–3 virkedager etter at informasjonen er registrert.',
              'The prize is paid out within 1–3 business days after the information is submitted.'
            )}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPayoutType('norwegian')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              payoutType === 'norwegian' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {t('Norsk bankkonto', 'Norwegian bank account')}
          </button>
          <button
            type="button"
            onClick={() => setPayoutType('international')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              payoutType === 'international'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {t('Utenlandsk konto (IBAN)', 'International account (IBAN)')}
          </button>
        </div>

        {payoutType === 'norwegian' ? (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('Kontonummer', 'Account number')} *
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={bankAccount}
              onChange={e => setBankAccount(e.target.value)}
              className="pro11-input w-full max-w-md"
              placeholder="12345678901"
              required
            />
            <p className="text-xs text-slate-400 mt-2">
              {t('11 siffer uten mellomrom.', '11 digits without spaces.')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">IBAN *</label>
              <input
                type="text"
                value={iban}
                onChange={e => setIban(e.target.value)}
                className="pro11-input w-full"
                placeholder="NO93 8601 1117 947"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">SWIFT/BIC *</label>
              <input
                type="text"
                value={swiftBic}
                onChange={e => setSwiftBic(e.target.value)}
                className="pro11-input w-full"
                placeholder="DNBANOKK"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('Kontoinnehaver', 'Account holder')} *
              </label>
              <input
                type="text"
                value={accountHolder}
                onChange={e => setAccountHolder(e.target.value)}
                className="pro11-input w-full"
                placeholder={t('Navn på konto', 'Name on account')}
                required
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={isSaving} className="pro11-button disabled:opacity-50">
          {isSaving
            ? t('Lagrer...', 'Saving...')
            : t('Send inn kontoinformasjon', 'Submit account information')}
        </button>
      </form>
    </div>
  )
}
