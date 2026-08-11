'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ExternalLink, Radio, Trash2 } from 'lucide-react'
import Toast from '@/components/Toast'
import {
  getStreamServiceLabel,
  MAX_STREAMS_PER_TEAM,
  type StreamService
} from '@/lib/stream-links'

export interface TeamStream {
  id: string
  tournamentId: string
  teamId: string
  teamName: string
  service: StreamService
  streamUrl: string
  displayName: string | null
  createdAt: string
}

interface RegisteredTeam {
  id: string
  teamName?: string
  team_name?: string
}

interface TeamStreamPanelProps {
  tournamentId: string
  teams: RegisteredTeam[]
  isEnglish: boolean
  compact?: boolean
  onStreamsChange?: (streams: TeamStream[]) => void
}

const DELETE_TOKENS_KEY = 'pro11_stream_delete_tokens'

function readDeleteTokens(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(DELETE_TOKENS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function storeDeleteToken(streamId: string, token: string) {
  const tokens = readDeleteTokens()
  tokens[streamId] = token
  localStorage.setItem(DELETE_TOKENS_KEY, JSON.stringify(tokens))
}

function removeDeleteToken(streamId: string) {
  const tokens = readDeleteTokens()
  delete tokens[streamId]
  localStorage.setItem(DELETE_TOKENS_KEY, JSON.stringify(tokens))
}

export default function TeamStreamPanel({
  tournamentId,
  teams,
  isEnglish,
  compact = false,
  onStreamsChange
}: TeamStreamPanelProps) {
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)

  const [streams, setStreams] = useState<TeamStream[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(!compact)
  const [teamId, setTeamId] = useState('')
  const [service, setService] = useState<StreamService>('twitch')
  const [streamUrl, setStreamUrl] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [deleteTokens, setDeleteTokens] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const teamOptions = useMemo(
    () =>
      teams
        .map(team => ({
          id: team.id,
          name: team.teamName || team.team_name || ''
        }))
        .filter(team => team.id && team.name)
        .sort((a, b) => a.name.localeCompare(b.name, isEnglish ? 'en' : 'nb')),
    [teams, isEnglish]
  )

  const streamsByTeam = useMemo(() => {
    const map: Record<string, TeamStream[]> = {}
    for (const stream of streams) {
      if (!map[stream.teamName]) map[stream.teamName] = []
      map[stream.teamName].push(stream)
    }
    return map
  }, [streams])

  const teamStreamCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const stream of streams) {
      counts[stream.teamId] = (counts[stream.teamId] || 0) + 1
    }
    return counts
  }, [streams])

  const loadStreams = useCallback(async () => {
    try {
      const response = await fetch(`/api/streams?tournament_id=${tournamentId}`)
      if (!response.ok) {
        setStreams([])
        return
      }
      const data = await response.json()
      const loaded = data.streams || []
      setStreams(loaded)
      onStreamsChange?.(loaded)
    } catch {
      setStreams([])
    } finally {
      setLoading(false)
    }
  }, [tournamentId, onStreamsChange])

  useEffect(() => {
    setDeleteTokens(readDeleteTokens())
    loadStreams()
  }, [loadStreams])

  const selectedTeamCount = teamId ? teamStreamCounts[teamId] || 0 : 0
  const selectedTeamFull = selectedTeamCount >= MAX_STREAMS_PER_TEAM

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!teamId || !streamUrl.trim()) {
      setToast({
        message: t('Velg lag og fyll inn stream-lenke.', 'Choose a team and enter a stream link.'),
        type: 'error'
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId,
          teamId,
          service,
          streamUrl: streamUrl.trim(),
          displayName: displayName.trim() || undefined
        })
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message =
          data.error === 'This stream link is already registered'
            ? t('Denne lenken er allerede registrert.', 'This link is already registered.')
            : data.error === 'URL does not match the selected streaming service'
              ? t(
                  'Lenken matcher ikke valgt streamingtjeneste.',
                  'The link does not match the selected streaming service.'
                )
              : data.error === `Maximum ${MAX_STREAMS_PER_TEAM} streams per team reached`
                ? t(
                    `Maks ${MAX_STREAMS_PER_TEAM} streams per lag er nådd.`,
                    `Maximum ${MAX_STREAMS_PER_TEAM} streams per team reached.`
                  )
                : data.error || t('Kunne ikke legge til stream.', 'Could not add stream.')
        setToast({ message, type: 'error' })
        return
      }

      if (data.deleteToken && data.stream?.id) {
        storeDeleteToken(data.stream.id, data.deleteToken)
        setDeleteTokens(readDeleteTokens())
      }

      setStreamUrl('')
      setDisplayName('')
      setToast({
        message: t(
          'Stream lagt til. Du kan slette den her så lenge du er på samme enhet/nettleser.',
          'Stream added. You can remove it here while using the same device/browser.'
        ),
        type: 'success'
      })
      await loadStreams()
    } catch {
      setToast({ message: t('Kunne ikke legge til stream.', 'Could not add stream.'), type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (streamId: string) => {
    const token = deleteTokens[streamId]
    if (!token) {
      setToast({
        message: t(
          'Sletting krever samme nettleser som du la inn streamen fra.',
          'Deletion requires the same browser you used when adding the stream.'
        ),
        type: 'error'
      })
      return
    }

    if (
      !window.confirm(
        t('Slette denne streamen?', 'Delete this stream?')
      )
    ) {
      return
    }

    setDeletingId(streamId)
    try {
      const response = await fetch(`/api/streams/${streamId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteToken: token })
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setToast({
          message: data.error || t('Kunne ikke slette stream.', 'Could not delete stream.'),
          type: 'error'
        })
        return
      }

      removeDeleteToken(streamId)
      setDeleteTokens(readDeleteTokens())
      setToast({ message: t('Stream slettet.', 'Stream deleted.'), type: 'success' })
      await loadStreams()
    } catch {
      setToast({ message: t('Kunne ikke slette stream.', 'Could not delete stream.'), type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  const serviceBadgeClass = (svc: StreamService) => {
    if (svc === 'twitch') return 'bg-purple-900/50 text-purple-200 border-purple-700/50'
    if (svc === 'youtube') return 'bg-red-900/50 text-red-200 border-red-700/50'
    return 'bg-green-900/50 text-green-200 border-green-700/50'
  }

  return (
    <div className={compact ? '' : 'space-y-6'}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-400" />
            {t('Streams', 'Streams')}
          </h3>
          {!compact && (
            <p className="text-sm text-slate-400 mt-1">
              {t(
                `Spillere kan legge inn én stream per lag (maks ${MAX_STREAMS_PER_TEAM}).`,
                `Players can add one stream per team slot (max ${MAX_STREAMS_PER_TEAM}).`
              )}
            </p>
          )}
        </div>
        {compact && (
          <button
            type="button"
            onClick={() => setShowForm(prev => !prev)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            {showForm ? t('Skjul skjema', 'Hide form') : t('Legg til stream', 'Add stream')}
          </button>
        )}
      </div>

      {showForm && teamOptions.length > 0 && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-300 mb-1 block">{t('Lag', 'Team')}</span>
              <select
                value={teamId}
                onChange={event => setTeamId(event.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-white"
              >
                <option value="">{t('Velg lag', 'Select team')}</option>
                {teamOptions.map(team => {
                  const count = teamStreamCounts[team.id] || 0
                  const full = count >= MAX_STREAMS_PER_TEAM
                  return (
                    <option key={team.id} value={team.id} disabled={full}>
                      {team.name}
                      {count > 0 ? ` (${count}/${MAX_STREAMS_PER_TEAM})` : ''}
                      {full ? (isEnglish ? ' — full' : ' — fullt') : ''}
                    </option>
                  )
                })}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-slate-300 mb-1 block">{t('Tjeneste', 'Service')}</span>
              <select
                value={service}
                onChange={event => setService(event.target.value as StreamService)}
                className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-white"
              >
                <option value="twitch">Twitch</option>
                <option value="youtube">YouTube</option>
                <option value="kick">Kick</option>
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-slate-300 mb-1 block">{t('Stream-lenke', 'Stream link')}</span>
            <input
              type="url"
              value={streamUrl}
              onChange={event => setStreamUrl(event.target.value)}
              placeholder={
                service === 'twitch'
                  ? 'https://twitch.tv/kanalnavn'
                  : service === 'youtube'
                    ? 'https://youtube.com/watch?v=...'
                    : 'https://kick.com/kanalnavn'
              }
              className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-white"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-300 mb-1 block">
              {t('Visningsnavn (valgfritt)', 'Display name (optional)')}
            </span>
            <input
              type="text"
              value={displayName}
              onChange={event => setDisplayName(event.target.value)}
              maxLength={100}
              placeholder={t('F.eks. spillerens navn', 'E.g. player name')}
              className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-white"
            />
          </label>

          {selectedTeamFull && (
            <p className="text-sm text-yellow-300">
              {t(
                `Dette laget har allerede ${MAX_STREAMS_PER_TEAM} streams.`,
                `This team already has ${MAX_STREAMS_PER_TEAM} streams.`
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !teamId || selectedTeamFull}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            {submitting ? t('Legger til…', 'Adding…') : t('Legg inn stream', 'Submit stream')}
          </button>
        </form>
      )}

      {showForm && teamOptions.length === 0 && (
        <p className="text-sm text-slate-400">
          {t('Ingen godkjente lag ennå.', 'No approved teams yet.')}
        </p>
      )}

      <div>
        {loading ? (
          <p className="text-sm text-slate-400">{t('Laster streams…', 'Loading streams…')}</p>
        ) : streams.length === 0 ? (
          <p className="text-sm text-slate-400">
            {t('Ingen streams registrert ennå.', 'No streams registered yet.')}
          </p>
        ) : (
          <div className="space-y-4">
            {Object.keys(streamsByTeam)
              .sort((a, b) => a.localeCompare(b, isEnglish ? 'en' : 'nb'))
              .map(teamName => (
                <div key={teamName}>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">{teamName}</h4>
                  <div className="space-y-2">
                    {streamsByTeam[teamName].map(stream => {
                      const canDelete = Boolean(deleteTokens[stream.id])
                      return (
                        <div
                          key={stream.id}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-900/30 px-3 py-2"
                        >
                          <span
                            className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${serviceBadgeClass(stream.service)}`}
                          >
                            {getStreamServiceLabel(stream.service, isEnglish)}
                          </span>
                          {stream.displayName && (
                            <span className="text-sm text-slate-200">{stream.displayName}</span>
                          )}
                          <a
                            href={stream.streamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200"
                          >
                            {t('Se stream', 'Watch stream')}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(stream.id)}
                              disabled={deletingId === stream.id}
                              className="ml-auto inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {deletingId === stream.id
                                ? t('Sletter…', 'Deleting…')
                                : t('Slett min', 'Delete mine')}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function getStreamsForTeamName(streams: TeamStream[], teamName: string) {
  return streams.filter(stream => stream.teamName === teamName)
}
