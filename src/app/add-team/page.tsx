'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Users, ArrowLeft } from 'lucide-react'
import Header from '@/components/Header'
import { useLanguage } from '@/components/LanguageProvider'

function AddTeamContent() {
  const searchParams = useSearchParams()
  const tournamentParam = searchParams.get('tournament')
  const { language } = useLanguage()
  const isEnglish = language === 'en'
  const t = (no: string, en: string) => (isEnglish ? en : no)

  const [form, setForm] = useState({
    teamName: '',
    captainName: '',
    captainEmail: '',
    captainPhone: '',
    discordUsername: '',
    expectedPlayers: 11
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ teamName: string; password: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const name = form.teamName?.trim()
    const captain = form.captainName?.trim()
    const email = form.captainEmail?.trim()
    if (!name) {
      setError(t('Lagnavn er påkrevd.', 'Team name is required.'))
      return
    }
    if (!captain) {
      setError(t('Kapteinens navn er påkrevd.', 'Captain name is required.'))
      return
    }
    if (!email) {
      setError(t('Kapteinens e-post er påkrevd.', 'Captain email is required.'))
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        teamName: name,
        captainName: captain,
        captainEmail: email,
        captainPhone: form.captainPhone || undefined,
        discordUsername: form.discordUsername || undefined,
        expectedPlayers: Number(form.expectedPlayers) || 11
      }
      if (tournamentParam) body.tournamentId = tournamentParam
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccess({ teamName: name, password: data.password || '' })
      } else {
        setError(data.error || t('Kunne ikke opprette lag.', 'Could not create team.'))
      }
    } catch {
      setError(t('Noe gikk galt. Prøv igjen.', 'Something went wrong. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header backButton backHref="/" title={t('Legg til lag', 'Add team')} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="pro11-card p-6 md:p-8">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-400" />
            {t('Legg til lag', 'Add team')}
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            {tournamentParam
              ? t(
                  'Registrer et lag til denne turneringen.',
                  'Register a team for this tournament.'
                )
              : t(
                  'Opprett et lag uten turnering. Logg inn som lagleder når du vil melde på til en turnering.',
                  'Create a team without a tournament. Log in as captain when you want to register for a tournament.'
                )}
          </p>

          {success ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-900/30 border border-green-700/50 text-green-200">
                <p className="font-semibold">{t('Lag opprettet', 'Team created')}</p>
                <p className="mt-2 text-sm">
                  {t('Lag', 'Team')}: <strong>{success.teamName}</strong>
                </p>
                {success.password && (
                  <p className="mt-2 text-sm">
                    {t('Passord til kaptein', 'Captain password')}: <strong className="select-all">{success.password}</strong>
                  </p>
                )}
                {!tournamentParam && (
                  <p className="mt-3 text-sm opacity-90">
                    {t('Når du vil melde på en turnering, logg inn som lagleder og velg turnering.', 'When you want to register for a tournament, log in as captain and choose a tournament.')}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/captain/login" className="pro11-button text-sm">
                  {t('Logg inn som lagleder', 'Captain login')}
                </Link>
                <Link href={tournamentParam ? `/add-team?tournament=${encodeURIComponent(tournamentParam)}` : '/add-team'} className="pro11-button-secondary text-sm" onClick={() => setSuccess(null)}>
                  {t('Legg til et lag til', 'Add another team')}
                </Link>
                <Link href="/" className="pro11-button-secondary text-sm">
                  {t('Til forsiden', 'Home')}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('Lagnavn', 'Team name')} *</label>
                <input
                  type="text"
                  value={form.teamName}
                  onChange={(e) => setForm(f => ({ ...f, teamName: e.target.value }))}
                  className="pro11-input w-full"
                  placeholder={t('F.eks. FC Example', 'e.g. FC Example')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('Kaptein', 'Captain')} *</label>
                <input
                  type="text"
                  value={form.captainName}
                  onChange={(e) => setForm(f => ({ ...f, captainName: e.target.value }))}
                  className="pro11-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('E-post kaptein', 'Captain email')} *</label>
                <input
                  type="email"
                  value={form.captainEmail}
                  onChange={(e) => setForm(f => ({ ...f, captainEmail: e.target.value }))}
                  className="pro11-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('Telefon (valgfritt)', 'Phone (optional)')}</label>
                <input
                  type="text"
                  value={form.captainPhone}
                  onChange={(e) => setForm(f => ({ ...f, captainPhone: e.target.value }))}
                  className="pro11-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('Discord (valgfritt)', 'Discord (optional)')}</label>
                <input
                  type="text"
                  value={form.discordUsername}
                  onChange={(e) => setForm(f => ({ ...f, discordUsername: e.target.value }))}
                  className="pro11-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('Forventet antall spillere', 'Expected players')}</label>
                <input
                  type="number"
                  min={1}
                  max={22}
                  value={form.expectedPlayers}
                  onChange={(e) => setForm(f => ({ ...f, expectedPlayers: parseInt(e.target.value, 10) || 11 }))}
                  className="pro11-input w-full"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="pro11-button flex items-center gap-2">
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('Oppretter...', 'Creating...')}
                    </>
                  ) : (
                    t('Opprett lag', 'Create team')
                  )}
                </button>
                <Link href="/" className="pro11-button-secondary text-sm flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" />
                  {t('Tilbake', 'Back')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

function AddTeamFallback() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Header backButton backHref="/" title="Legg til lag" />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="pro11-card p-6 md:p-8 flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    </div>
  )
}

export default function AddTeamPage() {
  return (
    <Suspense fallback={<AddTeamFallback />}>
      <AddTeamContent />
    </Suspense>
  )
}
