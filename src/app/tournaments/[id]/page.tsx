'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Trophy, Users, Calendar, Clock, CheckCircle, XCircle, ExternalLink, Plus } from 'lucide-react'
import { fetchTournamentById } from '../../../lib/tournaments'
import { useLanguage } from '@/components/LanguageProvider'
import Header from '@/components/Header'
import GroupStandingsTable, { type StandingsRow } from '@/components/GroupStandingsTable'
import { calculateGroupStandings, toStandingsMatchInputs } from '@/lib/group-standings'
import { buildKnockoutBracketPreview, type BracketPreviewRound } from '@/lib/knockout-bracket'

interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  date: string
  time: string
  status: 'scheduled' | 'live' | 'completed' | 'pending_result' | 'pending_confirmation'
  group?: string
  round?: string
  groupRound?: number
}

interface Tournament {
  id: string
  title: string
  date: string
  time: string
  prize: string
  entryFee?: number
  registeredTeams: number
  maxTeams: number
  status: 'open' | 'ongoing' | 'closed' | 'completed'
  statusText?: string
  format: 'group' | 'knockout' | 'league' | 'mixed' | 'group_stage'
  description: string
  description_en?: string
}

const GEN_TAG_REGEX = /\[GEN:\s*(NEW GEN|OLD GEN|BOTH)\]/i
const FORMAT_TAG_REGEX = /\[FORMAT\]([\s\S]*?)\[\/FORMAT\]/i

const stripGenFromDescription = (description?: string) => {
  return (description || '').replace(GEN_TAG_REGEX, '').replace(FORMAT_TAG_REGEX, '').trim()
}

const getFormatFromDescription = (description?: string) => {
  const match = description?.match(FORMAT_TAG_REGEX)
  return match?.[1]?.trim() || ''
}

export default function TournamentDetailPage() {
  const params = useParams()
  const tournamentId = params.id as string
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'bracket' | 'info'>('standings')
  const { language } = useLanguage()
  const isEnglish = language === 'en'
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)
  const locale = isEnglish ? 'en-US' : 'nb-NO'

  const [tournament, setTournament] = useState<any>(null)
  const [registeredTeams, setRegisteredTeams] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [groupStandings, setGroupStandings] = useState<Record<string, StandingsRow[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const matchesSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    const loadTournament = async () => {
      const t = await fetchTournamentById(tournamentId)
      setTournament(t)
      setIsLoading(false)
    }
    loadTournament()
  }, [tournamentId])

  const loadTeams = useCallback(async () => {
    try {
      const response = await fetch(`/api/teams?tournamentId=${tournamentId}`)
      if (response.ok) {
        const data = await response.json()
        const teams = (data.teams || []).filter((team: any) =>
          team.status === 'approved' || team.payment_status === 'completed'
        )
        setRegisteredTeams(teams)
      }
    } catch (error) {
      console.warn('Error loading teams:', error)
    }
  }, [tournamentId])

  const loadMatches = useCallback(async () => {
    try {
      const response = await fetch(`/api/matches?tournament_id=${tournamentId}`)
      if (response.ok) {
        const data = await response.json()
        const loadedMatches = data.matches || []
        const signature = loadedMatches
          .map((m: any) => [
            m.id,
            m.status,
            m.score1 ?? '',
            m.score2 ?? '',
            m.scheduled_time ?? '',
            m.round ?? '',
            m.group_name ?? '',
            m.group_round ?? ''
          ].join('|'))
          .sort()
          .join('||')

        if (signature !== matchesSignatureRef.current) {
          matchesSignatureRef.current = signature
          setMatches(loadedMatches)
          setGroupStandings(calculateGroupStandings(toStandingsMatchInputs(loadedMatches)))
          setLastUpdated(new Date())
        }
      }
    } catch (error) {
      console.warn('Error loading matches:', error)
    }
  }, [tournamentId])

  useEffect(() => {
    if (!tournamentId) return
    loadTeams()
    loadMatches()
  }, [tournamentId, loadTeams, loadMatches])

  useEffect(() => {
    if (!tournamentId) return
    const pollMs = tournament?.status === 'ongoing' ? 12000 : 30000
    const interval = setInterval(loadMatches, pollMs)
    return () => clearInterval(interval)
  }, [tournamentId, loadMatches, tournament?.status])

  const buildGroupRoundMap = (groupMatches: any[]) => {
    const teamSet = new Set<string>()
    groupMatches.forEach(match => {
      teamSet.add(match.team1_name)
      teamSet.add(match.team2_name)
    })
    const teams = Array.from(teamSet).sort()
    if (teams.length < 2) return {}

    const buildKey = (teamA: string, teamB: string) => [teamA, teamB].sort().join('|')

    const scheduleTeams = [...teams]
    if (scheduleTeams.length % 2 === 1) {
      scheduleTeams.push('__BYE__')
    }

    const rounds: Array<Array<[string, string]>> = []
    const totalRounds = scheduleTeams.length - 1
    const half = scheduleTeams.length / 2
    let rotation = [...scheduleTeams]

    for (let round = 0; round < totalRounds; round += 1) {
      const pairs: Array<[string, string]> = []
      for (let i = 0; i < half; i += 1) {
        const home = rotation[i]
        const away = rotation[rotation.length - 1 - i]
        if (home !== '__BYE__' && away !== '__BYE__') {
          pairs.push([home, away])
        }
      }
      rounds.push(pairs)
      const fixed = rotation[0]
      const rest = rotation.slice(1)
      rest.unshift(rest.pop() as string)
      rotation = [fixed, ...rest]
    }

    const roundMap: Record<string, number> = {}
    rounds.forEach((pairs, index) => {
      pairs.forEach(([home, away]) => {
        roundMap[buildKey(home, away)] = index + 1
      })
    })

    return roundMap
  }

  if (isLoading || !tournament) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header backButton backHref="/tournaments" title={t('Pro Clubs Turneringer', 'Pro Clubs Tournaments')} />
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">{t('Laster turnering...', 'Loading tournament...')}</p>
          </div>
        </main>
      </div>
    )
  }

  const mapMatchStatus = (rawStatus: string): Match['status'] => {
    if (
      rawStatus === 'completed' ||
      rawStatus === 'live' ||
      rawStatus === 'pending_result' ||
      rawStatus === 'pending_confirmation'
    ) {
      return rawStatus
    }
    return 'scheduled'
  }

  // Transform database matches to display format
  const displayMatches: Match[] = matches.map((m: any) => ({
    id: m.id,
    homeTeam: m.team1_name,
    awayTeam: m.team2_name,
    homeScore: m.score1 ?? null,
    awayScore: m.score2 ?? null,
    date: m.scheduled_time ? new Date(m.scheduled_time).toLocaleDateString(locale, { day: 'numeric', month: 'numeric', year: 'numeric' }) : '',
    time: m.scheduled_time ? new Date(m.scheduled_time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '',
    status: mapMatchStatus(m.status),
    group: m.group_name || undefined,
    round: m.round || undefined,
    groupRound: m.group_round ?? undefined
  }))

  const completedCount = matches.filter((m: any) => m.status === 'completed').length
  const liveCount = matches.filter((m: any) => m.status === 'live').length
  const pendingCount = matches.filter(
    (m: any) => m.status === 'pending_confirmation' || m.status === 'pending_result'
  ).length
  const matchProgress = matches.length > 0 ? Math.round((completedCount / matches.length) * 100) : 0

  const groupRoundMaps: Record<string, Record<string, number>> = {}
  const groupedGroupMatches = matches
    .filter((m: any) => m.round === 'Gruppespill')
    .reduce((acc: Record<string, any[]>, match: any) => {
      const groupName = match.group_name || t('Ukjent gruppe', 'Unknown group')
      if (!acc[groupName]) acc[groupName] = []
      acc[groupName].push(match)
      return acc
    }, {})
  Object.entries(groupedGroupMatches).forEach(([groupName, groupMatches]) => {
    groupRoundMaps[groupName] = buildGroupRoundMap(groupMatches)
  })

  const buildKey = (teamA: string, teamB: string) => [teamA, teamB].sort().join('|')
  const sortedDisplayMatches = [...displayMatches].sort((a, b) => {
    const aIsGroup = a.round === 'Gruppespill' && a.group
    const bIsGroup = b.round === 'Gruppespill' && b.group
    if (aIsGroup && bIsGroup) {
      const roundA = a.groupRound || groupRoundMaps[a.group!]?.[buildKey(a.homeTeam, a.awayTeam)] || 999
      const roundB = b.groupRound || groupRoundMaps[b.group!]?.[buildKey(b.homeTeam, b.awayTeam)] || 999
      if (roundA !== roundB) return roundA - roundB
    }
    return a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-slate-600'
      case 'live':
        return 'bg-red-600'
      case 'completed':
        return 'bg-green-600'
      case 'pending_confirmation':
        return 'bg-yellow-600'
      case 'pending_result':
        return 'bg-orange-600'
      default:
        return 'bg-slate-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return t('Planlagt', 'Scheduled')
      case 'live':
        return 'LIVE'
      case 'completed':
        return t('Ferdig', 'Finished')
      case 'pending_confirmation':
        return t('Venter bekreftelse', 'Pending')
      case 'pending_result':
        return t('Venter resultat', 'Awaiting')
      default:
        return t('Planlagt', 'Scheduled')
    }
  }

  const getMatchMeta = (match: Match) => {
    const parts: string[] = []
    if (match.date && match.time) parts.push(`${match.date} ${match.time}`)
    if (match.group) {
      const groupLabel = match.group.startsWith('Gruppe')
        ? (isEnglish ? match.group.replace('Gruppe', 'Group') : match.group)
        : `${t('Gruppe', 'Group')} ${match.group}`
      parts.push(groupLabel)
    }
    if (match.round && match.round !== 'Gruppespill') parts.push(translateRoundName(match.round))
    if (match.round === 'Gruppespill' && match.group) {
      const roundNo =
        match.groupRound || groupRoundMaps[match.group]?.[buildKey(match.homeTeam, match.awayTeam)]
      if (roundNo) parts.push(`${t('Runde', 'Round')} ${roundNo}`)
    }
    return parts.join(' · ')
  }

  const translateRoundName = (round?: string) => {
    if (!round) return ''
    if (!isEnglish) return round
    const map: Record<string, string> = {
      'Gruppespill': 'Group stage',
      'Sluttspill': 'Knockout',
      'Kvartfinaler': 'Quarterfinals',
      'Semifinaler': 'Semifinals',
      'Finale': 'Final',
      'Åttendelsfinaler': 'Round of 16',
      '16-delsfinaler': 'Round of 32',
      'Ukjent runde': 'Unknown round'
    }
    return map[round] || round
  }

  const getMatchScheduleMeta = (match: Match) => {
    if (match.date && match.time) return `${match.date} ${match.time}`
    return ''
  }

  const formatGroupLabel = (group: string) =>
    group.startsWith('Gruppe')
      ? (isEnglish ? group.replace('Gruppe', 'Group') : group)
      : `${t('Gruppe', 'Group')} ${group}`

  const knockoutRoundOrder: Record<string, number> = {
    '16-delsfinaler': 1,
    'Åttendelsfinaler': 2,
    'Kvartfinaler': 3,
    'Semifinaler': 4,
    'Finale': 5,
    'Sluttspill': 0
  }

  type MatchListSection = { key: string; title: string; matches: Match[] }

  const buildMatchListSections = (): MatchListSection[] => {
    const groupByRound: Record<string, Record<number, Match[]>> = {}
    const knockoutByRound: Record<string, Match[]> = {}

    sortedDisplayMatches.forEach(match => {
      if (match.round === 'Gruppespill' && match.group) {
        const groupName = match.group
        const roundNo =
          match.groupRound ||
          groupRoundMaps[groupName]?.[buildKey(match.homeTeam, match.awayTeam)] ||
          0
        if (!groupByRound[groupName]) groupByRound[groupName] = {}
        if (!groupByRound[groupName][roundNo]) groupByRound[groupName][roundNo] = []
        groupByRound[groupName][roundNo].push(match)
        return
      }
      const roundKey = match.round || t('Annet', 'Other')
      if (!knockoutByRound[roundKey]) knockoutByRound[roundKey] = []
      knockoutByRound[roundKey].push(match)
    })

    const sections: MatchListSection[] = []

    Object.keys(groupByRound)
      .sort((a, b) => a.localeCompare(b, locale))
      .forEach(groupName => {
        const rounds = groupByRound[groupName]
        Object.keys(rounds)
          .map(Number)
          .sort((a, b) => a - b)
          .forEach(roundNo => {
            sections.push({
              key: `group-${groupName}-r${roundNo}`,
              title:
                roundNo > 0
                  ? `${formatGroupLabel(groupName)} · ${t('Runde', 'Round')} ${roundNo}`
                  : formatGroupLabel(groupName),
              matches: rounds[roundNo]
            })
          })
      })

    Object.keys(knockoutByRound)
      .sort((a, b) => (knockoutRoundOrder[a] ?? 999) - (knockoutRoundOrder[b] ?? 999))
      .forEach(roundKey => {
        sections.push({
          key: `ko-${roundKey}`,
          title: translateRoundName(roundKey),
          matches: knockoutByRound[roundKey]
        })
      })

    return sections
  }

  const matchListSections = buildMatchListSections()

  const renderMatchRow = (match: Match, meta?: string) => {
    const showScore = match.status === 'completed' || match.status === 'live'
    const metaLine = meta ?? getMatchMeta(match)
    return (
      <div
        key={match.id}
        className={`flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm min-h-[2rem] ${
          match.status === 'live' ? 'bg-red-950/10' : ''
        }`}
      >
        <span
          className="w-[28%] sm:w-[22%] min-w-0 truncate text-right font-medium"
          title={match.homeTeam}
        >
          {match.homeTeam}
        </span>
        <span
          className={`w-5 text-center font-bold tabular-nums ${
            showScore && match.status === 'live' ? 'text-red-400' : 'text-slate-200'
          }`}
        >
          {showScore ? match.homeScore : '·'}
        </span>
        <span className="text-slate-600">-</span>
        <span
          className={`w-5 text-center font-bold tabular-nums ${
            showScore && match.status === 'live' ? 'text-red-400' : 'text-slate-200'
          }`}
        >
          {showScore ? match.awayScore : '·'}
        </span>
        <span
          className="w-[28%] sm:w-[22%] min-w-0 truncate font-medium"
          title={match.awayTeam}
        >
          {match.awayTeam}
        </span>
        <span
          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${getStatusColor(match.status)}`}
        >
          {getStatusText(match.status)}
        </span>
        {metaLine && (
          <span
            className="hidden sm:inline text-[10px] text-slate-500 truncate min-w-0 flex-1"
            title={metaLine}
          >
            {metaLine}
          </span>
        )}
      </div>
    )
  }

  const renderBracketPreview = (preview: BracketPreviewRound[], isProvisional: boolean) => {
    const getRoundColor = (round: string) => {
      if (round.includes('Kvartfinal')) return 'text-blue-400 border-blue-500'
      if (round.includes('Semifinal')) return 'text-green-400 border-green-500'
      if (round.includes('Finale')) return 'text-yellow-400 border-yellow-500'
      return 'text-purple-400 border-purple-500'
    }

    return (
      <div className="pro11-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold">{t('Sluttspill-bracket', 'Knockout bracket')}</h3>
          <span className="text-xs text-slate-500">
            {isProvisional
              ? t('Foreløpig — seeding-logikk', 'Preview — seeding logic')
              : t('Oppdateres automatisk', 'Updates automatically')}
          </span>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          {t(
            '1A = 1. plass i gruppe A, 2B = 2. plass i gruppe B, osv. Lagnavn fylles inn etter hvert som tabellen spiller seg ut.',
            '1A = 1st in group A, 2B = 2nd in group B, etc. Team names fill in as standings develop.'
          )}
        </p>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="w-max min-w-full grid grid-flow-col auto-cols-[minmax(200px,1fr)] gap-6 pb-2">
            {preview.map(round => {
              const roundColor = getRoundColor(round.round)
              return (
                <div key={round.round} className="min-w-[200px] pro11-card p-4 bg-slate-900/40">
                  <div className={`border-l-4 ${roundColor.split(' ')[1]} pl-3 mb-4`}>
                    <h4 className={`text-lg font-bold ${roundColor.split(' ')[0]}`}>
                      {translateRoundName(round.round)}
                    </h4>
                    <p className="text-slate-400 text-xs">
                      {round.matches.length}{' '}
                      {round.matches.length === 1 ? t('kamp', 'match') : t('kamper', 'matches')}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {round.matches.map((match, index) => (
                      <div
                        key={match.id}
                        className="p-3 rounded-lg border border-dashed border-slate-600/60 bg-slate-800/30"
                      >
                        <div className="text-xs text-slate-500 font-medium mb-2">
                          {t('Kamp', 'Match')} {index + 1}
                        </div>
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <div className="flex-1 min-w-0 text-right">
                            <div className="text-yellow-300/90 text-xs font-semibold">{match.team1.label}</div>
                            {match.team1.team && (
                              <div className="truncate font-medium text-slate-200">{match.team1.team}</div>
                            )}
                          </div>
                          <span className="text-slate-500 shrink-0">vs</span>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-yellow-300/90 text-xs font-semibold">{match.team2.label}</div>
                            {match.team2.team && (
                              <div className="truncate font-medium text-slate-200">{match.team2.team}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header backButton backHref="/tournaments" title={t('Pro Clubs Turneringer', 'Pro Clubs Tournaments')} />

      <main className="w-full px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-none">
          {/* Tournament Header */}
          <div className="pro11-card p-8 mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4">{tournament.title}</h1>
            <div className="flex flex-wrap items-center justify-center gap-4 text-slate-300">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span className="text-sm sm:text-base">{tournament.date} - {tournament.time}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="text-sm sm:text-base">{t('Premie', 'Prize')}: {tournament.prize}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-400" />
                <span className="text-sm sm:text-base">{tournament.registeredTeams}/{tournament.maxTeams} {t('lag', 'teams')}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(tournament.status)}`}>
                {tournament.status === 'open'
                  ? t('Åpen for påmelding', 'Open for registration')
                  : tournament.status === 'ongoing'
                    ? t('Pågående', 'Ongoing')
                    : tournament.status === 'closed'
                      ? t('Stengt', 'Closed')
                      : t('Fullført', 'Completed')}
              </span>
              {tournament.status === 'open' && (
                <Link
                  href={`/add-team?tournament=${encodeURIComponent(tournament.id)}`}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
                >
                  <Plus className="w-4 h-4" />
                  {t('Legg til lag', 'Add team')}
                </Link>
              )}
            </div>
          </div>

          {matches.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-6 text-sm text-slate-300">
              <span>
                <span className="font-semibold text-white">{completedCount}/{matches.length}</span>{' '}
                {t('kamper', 'matches')}
              </span>
              <span className="text-blue-400 font-semibold">{matchProgress}%</span>
              {liveCount > 0 && (
                <span className="text-red-400 font-semibold">{liveCount} LIVE</span>
              )}
              {pendingCount > 0 && (
                <span className="text-yellow-400">
                  {pendingCount} {t('venter', 'pending')}
                </span>
              )}
              {lastUpdated && (
                <span className="text-xs text-slate-500">
                  {t('Oppdatert', 'Updated')}{' '}
                  {lastUpdated.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="pro11-card p-6 mb-8">
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setActiveTab('standings')}
                className={`px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors ${
                  activeTab === 'standings' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('Tabell', 'Standings')}
              </button>
              <button
                onClick={() => setActiveTab('matches')}
                className={`px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors ${
                  activeTab === 'matches' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('Kamper', 'Matches')}
              </button>
              <button
                onClick={() => setActiveTab('bracket')}
                className={`px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors ${
                  activeTab === 'bracket' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('Sluttspill', 'Knockout')}
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors ${
                  activeTab === 'info' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('Info', 'Info')}
              </button>
            </div>

            {activeTab === 'standings' && (
              <div>
                {Object.keys(groupStandings).length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(groupStandings).map(([groupName, standings]) => (
                      <div key={groupName} className="pro11-card p-4">
                        <h3 className="font-semibold mb-3 text-lg">{groupName}</h3>
                        <GroupStandingsTable rows={standings} isEnglish={isEnglish} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-slate-400 mb-4">
                      <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">
                        {t('Ingen kamper generert', 'No matches generated')}
                      </h3>
                      <p>{t('Kamper må genereres før tabellen kan vises.', 'Matches must be generated before standings can be shown.')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'matches' && (
              <div>
                {matchListSections.length > 0 ? (
                  <div className="space-y-4">
                    {matchListSections.map(section => (
                      <div key={section.key}>
                        <h3 className="text-sm font-semibold text-slate-300 mb-1.5 px-1">{section.title}</h3>
                        <div className="divide-y divide-slate-700/50 rounded border border-slate-700/40 overflow-hidden">
                          {section.matches.map(match => renderMatchRow(match, getMatchScheduleMeta(match)))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-slate-400 mb-4">
                      <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">
                        {t('Ingen kamper planlagt', 'No matches scheduled')}
                      </h3>
                      <p>{t('Det må være minst 2 godkjente lag for å generere kamper.', 'At least 2 approved teams are required to generate matches.')}</p>
                      <p className="text-sm mt-2">
                        {t('Antall registrerte lag', 'Registered teams')}: {registeredTeams.length}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

             {activeTab === 'bracket' && (() => {
               const desc = isEnglish && tournament.description_en ? tournament.description_en : tournament.description
               const formatText = getFormatFromDescription(desc)
               const bracketPreview = buildKnockoutBracketPreview(groupStandings, formatText, isEnglish)

               // Filter knockout matches (not group stage)
               const knockoutMatches = matches.filter((m: any) => m.round && m.round !== 'Gruppespill')
               
               // Group matches by round
                 const matchesByRound = knockoutMatches.reduce((acc: any, match: any) => {
                 const round = match.round || t('Ukjent runde', 'Unknown round')
                 if (!acc[round]) acc[round] = []
                 acc[round].push(match)
                 return acc
               }, {} as Record<string, any[]>)
               
               // Check if group stage is complete (only show knockout if group stage is done or no group matches)
               const groupMatches = matches.filter((m: any) => m.round === 'Gruppespill')
               const allGroupMatchesCompleted = groupMatches.length > 0 && 
                 groupMatches.every((m: any) => m.status === 'completed')
               const shouldShowKnockout = groupMatches.length === 0 || allGroupMatchesCompleted

               if (knockoutMatches.length === 0 && bracketPreview && groupMatches.length > 0) {
                 return renderBracketPreview(bracketPreview, !allGroupMatchesCompleted)
               }
               
               if (!shouldShowKnockout && groupMatches.length > 0) {
                 if (bracketPreview) {
                   return renderBracketPreview(bracketPreview, true)
                 }
                 return (
                   <div className="text-center py-12">
                     <div className="text-slate-400 mb-4">
                       <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                       <h3 className="text-xl font-semibold mb-2">
                         {t('Sluttspill ikke tilgjengelig ennå', 'Knockout not available yet')}
                       </h3>
                       <p>{t('Sluttspill vil bli vist når alle gruppespillkamper er ferdig.', 'The knockout bracket will be shown when all group stage matches are completed.')}</p>
                       <p className="text-sm mt-2">
                         {t('Ferdig', 'Completed')}: {groupMatches.filter((m: any) => m.status === 'completed').length} / {groupMatches.length} {t('kamper', 'matches')}
                       </p>
                     </div>
                   </div>
                 )
               }
               
               // Helper function to get winners from a round
               const getWinnersFromRound = (roundMatches: any[]): string[] => {
                 const winners: string[] = []
                 roundMatches.forEach((m: any) => {
                   if (m.status === 'completed' && m.score1 !== null && m.score2 !== null) {
                     if (m.score1 > m.score2) {
                       winners.push(m.team1_name)
                     } else if (m.score2 > m.score1) {
                       winners.push(m.team2_name)
                     } else {
                       winners.push(m.team1_name) // Draw - use team1
                     }
                   }
                 })
                 return winners
               }
               
               // Helper function to check if a round is completed
               const isRoundCompleted = (roundMatches: any[]): boolean => {
                 return roundMatches.length > 0 && 
                   roundMatches.every((m: any) => m.status === 'completed' && m.score1 !== null && m.score2 !== null)
               }
               
               // Helper function to add placeholder matches for next round
               const addPlaceholderForNextRound = (currentRoundName: string, nextRoundName: string) => {
                 const currentRoundMatches = knockoutMatches.filter((m: any) => m.round === currentRoundName)
                 const nextRoundExists = knockoutMatches.some((m: any) => m.round === nextRoundName)
                 
                 if (isRoundCompleted(currentRoundMatches) && !nextRoundExists && currentRoundMatches.length > 0) {
                   const winners = getWinnersFromRound(currentRoundMatches)
                   
                   // Generate placeholder matches for next round
                   const placeholderMatches: any[] = []
                   for (let i = 0; i < winners.length; i += 2) {
                     if (i + 1 < winners.length) {
                       placeholderMatches.push({
                         id: `placeholder-${nextRoundName.toLowerCase()}-${i}`,
                         team1_name: winners[i],
                         team2_name: winners[i + 1],
                         round: nextRoundName,
                         status: 'scheduled',
                         score1: null,
                         score2: null,
                         isPlaceholder: true
                       })
                     }
                   }
                   
                   if (placeholderMatches.length > 0) {
                     matchesByRound[nextRoundName] = placeholderMatches
                   }
                 }
               }
               
               // Check and add placeholders for all rounds in order
               // 16-delsfinaler -> Åttendelsfinaler -> Kvartfinaler -> Semifinaler -> Finale
               addPlaceholderForNextRound('16-delsfinaler', 'Åttendelsfinaler')
               addPlaceholderForNextRound('Åttendelsfinaler', 'Kvartfinaler')
               addPlaceholderForNextRound('Kvartfinaler', 'Semifinaler')
               addPlaceholderForNextRound('Semifinaler', 'Finale')

              const semifinalMatches = knockoutMatches.filter((m: any) => m.round === 'Semifinaler')
              const allSemifinalsCompleted = isRoundCompleted(semifinalMatches)
               
               if (knockoutMatches.length === 0 && !allSemifinalsCompleted) {
                 return (
                   <div className="text-center py-12">
                     <div className="text-slate-400 mb-4">
                       <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                       <h3 className="text-xl font-semibold mb-2">
                         {t('Ingen sluttspillkamper generert', 'No knockout matches generated')}
                       </h3>
                       <p>{t('Sluttspillkamper må genereres før de kan vises.', 'Knockout matches must be generated before they can be shown.')}</p>
                     </div>
                   </div>
                 )
               }
               
               // Sort rounds in order: Kvartfinaler -> Semifinaler -> Finale
               const roundOrder: Record<string, number> = {
                 'Kvartfinaler': 1,
                 'Semifinaler': 2,
                 'Finale': 3,
                 'Sluttspill': 0 // Generic fallback
               }
               
               const sortedRounds = Object.entries(matchesByRound).sort(([a], [b]) => {
                 const orderA = roundOrder[a] ?? 999
                 const orderB = roundOrder[b] ?? 999
                 return orderA - orderB
               })
               
              return (
                <div className="pro11-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{t('Sluttspill', 'Knockout')}</h3>
                    <span className="text-xs text-slate-500">{t('Oppdateres automatisk', 'Updates automatically')}</span>
                  </div>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="w-max min-w-full grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-6 pb-2">
                      {sortedRounds.map(([roundName, roundMatches]) => {
                        const typedRoundMatches = roundMatches as any[]
                        
                        const getRoundColor = (round: string) => {
                          if (round.includes('Kvartfinal')) return 'text-blue-400 border-blue-500'
                          if (round.includes('Semifinal')) return 'text-green-400 border-green-500'
                          if (round.includes('Finale')) return 'text-yellow-400 border-yellow-500'
                          return 'text-purple-400 border-purple-500'
                        }
                        
                        const roundColor = getRoundColor(roundName)
                        
                        return (
                          <div key={roundName} className="min-w-[220px] pro11-card p-4 bg-slate-900/40">
                            <div className={`border-l-4 ${roundColor.split(' ')[1]} pl-3 mb-4`}>
                              <h4 className={`text-lg font-bold ${roundColor.split(' ')[0]}`}>{translateRoundName(roundName)}</h4>
                              <p className="text-slate-400 text-xs">
                                {typedRoundMatches.length} {typedRoundMatches.length === 1 ? t('kamp', 'match') : t('kamper', 'matches')}
                              </p>
                            </div>
                            <div className="space-y-3">
                              {typedRoundMatches.map((match: any, index: number) => {
                                const matchDate = match.scheduled_time 
                                  ? new Date(match.scheduled_time).toLocaleDateString(locale, { day: 'numeric', month: 'numeric', year: 'numeric' })
                                  : ''
                                const matchTime = match.scheduled_time 
                                  ? new Date(match.scheduled_time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
                                  : ''
                                
                                const isPlaceholder = match.isPlaceholder || false
                                
                                return (
                                  <div 
                                    key={match.id} 
                                    className={`p-3 rounded-lg border ${
                                      isPlaceholder 
                                        ? 'bg-yellow-900/20 border-yellow-600/50 border-dashed' 
                                        : 'bg-slate-800/50 border-slate-700/50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="text-xs text-slate-500 font-medium">
                                        {t('Kamp', 'Match')} {index + 1}
                                      </div>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        match.status === 'completed' ? 'bg-green-700/50 text-green-300' :
                                        match.status === 'live' ? 'bg-red-700/50 text-red-300' :
                                        isPlaceholder ? 'bg-yellow-700/50 text-yellow-200' : 'bg-slate-700/50 text-slate-300'
                                      }`}>
                                        {match.status === 'completed' ? t('Ferdig', 'Finished') :
                                         match.status === 'live' ? 'LIVE' :
                                         isPlaceholder ? t('Venter', 'Waiting') : t('Planlagt', 'Scheduled')}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className={`font-medium ${isPlaceholder ? 'text-yellow-300' : ''}`}>
                                        {match.team1_name}
                                      </span>
                                      {match.status === 'completed' && match.score1 !== undefined && match.score2 !== undefined ? (
                                        <span className="text-base font-bold">
                                          {match.score1} - {match.score2}
                                        </span>
                                      ) : match.status === 'live' && match.score1 !== undefined && match.score2 !== undefined ? (
                                        <span className="text-base font-bold text-red-400">
                                          {match.score1} - {match.score2}
                                        </span>
                                      ) : isPlaceholder ? (
                                        <span className="text-yellow-400 font-semibold">TBD</span>
                                      ) : (
                                        <span className="text-slate-500">vs</span>
                                      )}
                                      <span className={`font-medium ${isPlaceholder ? 'text-yellow-300' : ''}`}>
                                        {match.team2_name}
                                      </span>
                                    </div>
                                    {matchTime && (
                                      <div className="text-xs text-slate-400 mt-2">
                                        {matchDate} {matchTime}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
             })()}

             {activeTab === 'info' && (() => {
                const desc = isEnglish && tournament.description_en ? tournament.description_en : tournament.description
                return (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">{t('Om turneringen', 'About the tournament')}</h3>
                  <p className="text-slate-300 leading-relaxed">
                    {stripGenFromDescription(desc)}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4">{t('Format', 'Format')}</h3>
                  <div className="pro11-card p-4">
                    {getFormatFromDescription(desc) ? (
                      <div className="space-y-2">
                        {getFormatFromDescription(desc)
                          .split('\n')
                          .filter(Boolean)
                          .map((line, index) => (
                            <p key={index} className="text-slate-300">
                              {line}
                            </p>
                          ))}
                      </div>
                    ) : (
                      <p className="text-slate-300">
                        {t(
                          'Turneringens format og oppsett oppdateres av admin ved behov.',
                          'The tournament format and setup are updated by admin when needed.'
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">{t('Premier', 'Prizes')}</h3>
                  <div className="pro11-card p-4">
                    <p className="text-slate-300">
                      {t(
                        'Premiepotten oppgis av admin og oppdateres ved behov.',
                        'The prize pool is provided by admin and updated as needed.'
                      )}
                    </p>
                    {tournament.prize && (
                      <p className="text-slate-300 mt-2">
                        {t('Premie', 'Prize')}: {tournament.prize}
                      </p>
                    )}
                  </div>
                </div>
              </div>
                )
              })()}
          </div>
        </div>
      </main>
    </div>
  )
} 