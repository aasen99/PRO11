'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Radio,
  RefreshCw,
  AlertTriangle,
  Clock,
  Trophy,
  ChevronRight,
  Activity,
  CheckCircle2,
  Swords
} from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { apiFetch } from '@/lib/client-fetch'

interface TournamentOption {
  id: string
  title: string
  status: string
}

interface LiveEvent {
  id: string
  event_type: string
  title: string
  detail?: string | null
  actor_name?: string | null
  created_at: string
  match_id?: string | null
}

interface AttentionItem {
  id: string
  type: string
  title: string
  description: string
  matchId: string
  tournamentId: string
}

interface LiveStats {
  totalMatches: number
  completedMatches: number
  liveMatches: number
  pendingConfirmation: number
  conflicts: number
  progress: number
}

const REFRESH_MS = 12_000

export default function LiveTournamentPage() {
  const { language } = useLanguage()
  const isEnglish = language === 'en'
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)

  const [tournaments, setTournaments] = useState<TournamentOption[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [tournamentTitle, setTournamentTitle] = useState('')
  const [tournamentStatus, setTournamentStatus] = useState('')
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [attention, setAttention] = useState<AttentionItem[]>([])
  const [stats, setStats] = useState<LiveStats | null>(null)
  const [eventsAvailable, setEventsAvailable] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadLiveData = useCallback(async (tournamentId?: string, silent = false) => {
    if (!silent) setIsRefreshing(true)
    try {
      const query = tournamentId ? `?tournament_id=${tournamentId}` : ''
      const response = await apiFetch(`/api/admin/live${query}`, { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) {
        console.error('Live data error:', data.error)
        return
      }

      setTournaments(data.tournaments || [])
      setEventsAvailable(data.eventsAvailable !== false)
      setEvents(data.events || [])
      setAttention(data.attention || [])
      setStats(data.stats || null)
      setLastUpdated(new Date())

      if (data.tournament) {
        setSelectedId(data.tournament.id)
        setTournamentTitle(data.tournament.title)
        setTournamentStatus(data.tournament.status)
      }
    } catch (error) {
      console.error('Failed to load live data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadLiveData()
  }, [loadLiveData])

  useEffect(() => {
    const timer = setInterval(() => loadLiveData(selectedId || undefined, true), REFRESH_MS)
    return () => clearInterval(timer)
  }, [loadLiveData, selectedId])

  const eventIcon = (type: string) => {
    switch (type) {
      case 'result_conflict':
        return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
      case 'walkover_claimed':
        return <Swords className="w-4 h-4 text-orange-400 shrink-0" />
      case 'match_completed':
      case 'result_confirmed':
        return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
      case 'match_live':
        return <Radio className="w-4 h-4 text-green-400 shrink-0" />
      default:
        return <Activity className="w-4 h-4 text-blue-400 shrink-0" />
    }
  }

  const attentionStyle = (type: string) => {
    switch (type) {
      case 'conflict':
        return 'border-red-500/40 bg-red-900/20'
      case 'walkover_eligible':
        return 'border-orange-500/40 bg-orange-900/20'
      case 'schedule_delay':
        return 'border-yellow-500/40 bg-yellow-900/20'
      default:
        return 'border-slate-600 bg-slate-800/40'
    }
  }

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(isEnglish ? 'en-GB' : 'nb-NO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return ''
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!selectedId && tournaments.length === 0) {
    return (
      <div className="min-h-screen">
        <header className="pro11-card mx-4 mt-4 p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-400" />
            {t('Livesenter', 'Live center')}
          </h1>
          <Link href="/admin" className="pro11-button-secondary text-sm">
            {t('Tilbake til admin', 'Back to admin')}
          </Link>
        </header>
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="text-slate-300 mb-4">{t('Ingen aktiv turnering akkurat nå.', 'No active tournament right now.')}</p>
          <p className="text-slate-500 text-sm mb-6">
            {t('Opprett en demo-turnering under Innstillinger for å teste.', 'Create a demo tournament under Settings to test.')}
          </p>
          <Link href="/admin" className="pro11-button">{t('Gå til admin', 'Go to admin')}</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-8">
      <header className="pro11-card mx-4 mt-4 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-400 animate-pulse" />
              {t('Livesenter', 'Live center')}
            </h1>
            <p className="text-slate-400 text-sm mt-1">{tournamentTitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tournaments.length > 1 && (
              <select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value)
                  loadLiveData(e.target.value)
                }}
                className="pro11-input text-sm py-2"
              >
                {tournaments.map(tr => (
                  <option key={tr.id} value={tr.id}>{tr.title}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => loadLiveData(selectedId)}
              disabled={isRefreshing}
              className="pro11-button-secondary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('Oppdater', 'Refresh')}
            </button>
            <Link href={`/admin/matches/${selectedId}`} className="pro11-button text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              {t('Kamper', 'Matches')}
            </Link>
            <Link href="/admin" className="pro11-button-secondary text-sm">
              {t('Admin', 'Admin')}
            </Link>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-xs text-slate-500 mt-3">
            {t('Sist oppdatert', 'Last updated')}: {formatTime(lastUpdated.toISOString())}
            {' · '}
            {t('Auto hvert 12. sek', 'Auto every 12s')}
          </p>
        )}
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="pro11-card p-4 text-center">
              <p className="text-xs text-slate-400 uppercase">{t('Fremgang', 'Progress')}</p>
              <p className="text-2xl font-bold text-green-400">{stats.progress}%</p>
            </div>
            <div className="pro11-card p-4 text-center">
              <p className="text-xs text-slate-400 uppercase">{t('Ferdig', 'Done')}</p>
              <p className="text-2xl font-bold">{stats.completedMatches}/{stats.totalMatches}</p>
            </div>
            <div className="pro11-card p-4 text-center">
              <p className="text-xs text-slate-400 uppercase">Live</p>
              <p className="text-2xl font-bold text-green-400">{stats.liveMatches}</p>
            </div>
            <div className="pro11-card p-4 text-center">
              <p className="text-xs text-slate-400 uppercase">{t('Konflikter', 'Conflicts')}</p>
              <p className="text-2xl font-bold text-red-400">{stats.conflicts}</p>
            </div>
            <div className="pro11-card p-4 text-center col-span-2 md:col-span-1">
              <p className="text-xs text-slate-400 uppercase">{t('Trenger handling', 'Needs action')}</p>
              <p className="text-2xl font-bold text-yellow-400">{attention.length}</p>
            </div>
          </div>
        )}

        {!eventsAvailable && (
          <div className="pro11-card p-4 mb-6 border border-yellow-500/30 bg-yellow-900/10 text-sm text-yellow-200">
            {t(
              'Kjør SETUP_TOURNAMENT_EVENTS.sql i Supabase for full aktivitetslogg. «Trenger handling» fungerer uansett.',
              'Run SETUP_TOURNAMENT_EVENTS.sql in Supabase for the full activity log. «Needs action» still works.'
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="pro11-card p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              {t('Aktivitetslogg', 'Activity log')}
            </h2>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <p className="text-slate-500 text-sm py-8 text-center">
                  {t('Ingen hendelser ennå. Resultater og WO vises her.', 'No events yet. Results and walkovers will appear here.')}
                </p>
              ) : (
                events.map(event => (
                  <div key={event.id} className="flex gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    {eventIcon(event.event_type)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium break-words">{event.title}</p>
                      {event.detail && <p className="text-xs text-slate-400 mt-0.5 break-words">{event.detail}</p>}
                      <p className="text-xs text-slate-500 mt-1">{formatTime(event.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pro11-card p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              {t('Trenger handling', 'Needs action')}
              {attention.length > 0 && (
                <span className="text-xs bg-yellow-600/30 text-yellow-200 px-2 py-0.5 rounded-full">{attention.length}</span>
              )}
            </h2>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {attention.length === 0 ? (
                <p className="text-slate-500 text-sm py-8 text-center flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-green-500/50" />
                  {t('Alt ser bra ut akkurat nå.', 'Everything looks good right now.')}
                </p>
              ) : (
                attention.map(item => (
                  <Link
                    key={item.id}
                    href={`/admin/matches/${item.tournamentId}`}
                    className={`block p-3 rounded-lg border transition-colors hover:brightness-110 ${attentionStyle(item.type)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium break-words">{item.title}</p>
                        <p className="text-xs text-slate-300 mt-1">{item.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="pro11-card p-4 mt-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" />
            {t('Hva overvåkes', 'What is monitored')}
          </h3>
          <ul className="text-xs text-slate-400 space-y-1 grid sm:grid-cols-2 gap-x-4">
            <li>• {t('Nye resultater og bekreftelser', 'New results and confirmations')}</li>
            <li>• {t('Uenighet mellom lag', 'Disagreements between teams')}</li>
            <li>• {t('Avviste resultater', 'Rejected results')}</li>
            <li>• {t('WO-registrering', 'Walkover claims')}</li>
            <li>• {t('Kamper 10+ min bak plan', 'Matches 10+ min behind schedule')}</li>
            <li>• {t('Venter på motstander', 'Waiting for opponent')}</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
