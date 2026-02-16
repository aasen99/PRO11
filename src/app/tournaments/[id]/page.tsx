'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Trophy, Users, Calendar, Clock, CheckCircle, XCircle, ExternalLink, Plus } from 'lucide-react'
import { fetchTournamentById } from '../../../lib/tournaments'
import { useLanguage } from '@/components/LanguageProvider'

interface Team {
  id: string
  name: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  date: string
  time: string
  status: 'scheduled' | 'live' | 'completed'
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
  const [groupStandings, setGroupStandings] = useState<Record<string, Team[]>>({})
  const [isLoading, setIsLoading] = useState(true)
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
          
          // Calculate group standings from actual match results
          const standings = calculateGroupStandings(loadedMatches)
          setGroupStandings(standings)
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
    const interval = setInterval(loadMatches, 30000)
    return () => clearInterval(interval)
  }, [tournamentId, loadTeams, loadMatches])

  // Calculate group standings from actual match results (same logic as admin)
  const calculateGroupStandings = (allMatches: any[]): Record<string, Team[]> => {
    const standings: Record<string, Record<string, Team>> = {}

    const getHeadToHeadComparison = (teamA: string, teamB: string, groupMatches: any[]) => {
      let aPoints = 0
      let bPoints = 0
      let aGoalsFor = 0
      let aGoalsAgainst = 0
      let bGoalsFor = 0
      let bGoalsAgainst = 0
      let hasMatch = false

      groupMatches.forEach(match => {
        if (match.status !== 'completed') return
        const isAHome = match.team1_name === teamA && match.team2_name === teamB
        const isBHome = match.team1_name === teamB && match.team2_name === teamA
        if (!isAHome && !isBHome) return

        hasMatch = true
        const score1 = match.score1 ?? 0
        const score2 = match.score2 ?? 0

        if (isAHome) {
          aGoalsFor += score1
          aGoalsAgainst += score2
          bGoalsFor += score2
          bGoalsAgainst += score1
          if (score1 > score2) aPoints += 3
          else if (score1 < score2) bPoints += 3
          else {
            aPoints += 1
            bPoints += 1
          }
        } else {
          bGoalsFor += score1
          bGoalsAgainst += score2
          aGoalsFor += score2
          aGoalsAgainst += score1
          if (score1 > score2) bPoints += 3
          else if (score1 < score2) aPoints += 3
          else {
            aPoints += 1
            bPoints += 1
          }
        }
      })

      if (!hasMatch) return 0

      if (bPoints !== aPoints) return bPoints - aPoints
      const aDiff = aGoalsFor - aGoalsAgainst
      const bDiff = bGoalsFor - bGoalsAgainst
      if (bDiff !== aDiff) return bDiff - aDiff
      if (bGoalsFor !== aGoalsFor) return bGoalsFor - aGoalsFor
      return 0
    }
    
    // Initialize standings for all teams from matches
    allMatches.forEach(match => {
      if (match.group_name && match.round === 'Gruppespill') {
        if (!standings[match.group_name]) {
          standings[match.group_name] = {}
        }
        
        if (!standings[match.group_name][match.team1_name]) {
          standings[match.group_name][match.team1_name] = {
            id: match.team1_name,
            name: match.team1_name,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0
          }
        }
        
        if (!standings[match.group_name][match.team2_name]) {
          standings[match.group_name][match.team2_name] = {
            id: match.team2_name,
            name: match.team2_name,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0
          }
        }
      }
    })

    // Calculate standings from completed matches
    allMatches.forEach(match => {
      if (match.group_name && match.round === 'Gruppespill' && match.status === 'completed' && match.score1 !== undefined && match.score2 !== undefined) {
        const group = standings[match.group_name]
        const team1 = group[match.team1_name]
        const team2 = group[match.team2_name]

        if (team1 && team2) {
          team1.played++
          team2.played++
          team1.goalsFor += match.score1
          team1.goalsAgainst += match.score2
          team2.goalsFor += match.score2
          team2.goalsAgainst += match.score1

          if (match.score1 > match.score2) {
            team1.won++
            team1.points += 3
            team2.lost++
          } else if (match.score2 > match.score1) {
            team2.won++
            team2.points += 3
            team1.lost++
          } else {
            team1.drawn++
            team2.drawn++
            team1.points += 1
            team2.points += 1
          }
        }
      }
    })

    // Convert to arrays and sort
    const result: Record<string, Team[]> = {}
    Object.keys(standings).forEach(groupName => {
      const groupMatches = allMatches.filter(match =>
        match.group_name === groupName && match.round === 'Gruppespill'
      )
      result[groupName] = Object.values(standings[groupName]).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        const aDiff = a.goalsFor - a.goalsAgainst
        const bDiff = b.goalsFor - b.goalsAgainst
        if (bDiff !== aDiff) return bDiff - aDiff
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
        return getHeadToHeadComparison(a.name, b.name, groupMatches)
      })
    })

    return result
  }

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
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
    status: m.status === 'completed' ? 'completed' : m.status === 'live' ? 'live' : 'scheduled',
    group: m.group_name || undefined,
    round: m.round || undefined,
    groupRound: m.group_round ?? undefined
  }))

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
      default:
        return t('Planlagt', 'Scheduled')
    }
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="pro11-card mx-4 mt-4 h-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="w-24 h-full flex items-center justify-center hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="PRO11 Logo" className="w-full h-full object-contain" />
            </Link>
            <div className="ml-4">
              <p className="text-slate-400 text-sm">
                {t('Pro Clubs Turneringer', 'Pro Clubs Tournaments')}
              </p>
            </div>
          </div>
          <Link href="/tournaments" className="pro11-button-secondary flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>{t('Tilbake', 'Back')}</span>
          </Link>
        </div>
      </header>

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
              <Link
                href={`/add-team?tournament=${encodeURIComponent(tournament.id)}`}
                className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
              >
                <Plus className="w-4 h-4" />
                {t('Legg til lag', 'Add team')}
              </Link>
            </div>
          </div>

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
                        <div className="standings-mobile space-y-2">
                          {standings.map((team, index) => (
                            <div
                              key={team.id}
                              className={`standings-card rounded-lg border border-slate-700/60 px-3 py-2 ${
                                index < 2 ? 'bg-green-900/20' : 'bg-slate-800/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold">{index + 1}</div>
                                <div className="flex-1 px-3 text-sm font-medium break-words">{team.name}</div>
                                <div className="text-sm font-bold text-blue-400">{team.points} {t('p', 'pts')}</div>
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                {t('K', 'P')}: {team.played} · {t('V', 'W')}: {team.won} · {t('U', 'D')}: {team.drawn} · {t('T', 'L')}: {team.lost}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="standings-desktop overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-700">
                                <th className="py-2 px-3 text-left text-sm">{t('Pos', 'Pos')}</th>
                                <th className="py-2 px-3 text-left text-sm">{t('Lag', 'Team')}</th>
                                <th className="py-2 px-3 text-center text-sm">{t('K', 'P')}</th>
                                <th className="py-2 px-3 text-center text-sm">{t('V', 'W')}</th>
                                <th className="py-2 px-3 text-center text-sm">{t('U', 'D')}</th>
                                <th className="py-2 px-3 text-center text-sm">{t('T', 'L')}</th>
                                <th className="py-2 px-3 text-center text-sm">{t('M+', 'GF')}</th>
                                <th className="py-2 px-3 text-center text-sm">{t('M-', 'GA')}</th>
                                <th className="py-2 px-3 text-center text-sm font-semibold">{t('P', 'Pts')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {standings.map((team, index) => (
                                <tr 
                                  key={team.id} 
                                  className={`border-b border-slate-700 ${
                                    index < 2 ? 'bg-green-900/20' : ''
                                  }`}
                                >
                                  <td className="py-2 px-3 text-sm font-semibold">{index + 1}</td>
                                  <td className="py-2 px-3 text-sm font-medium">{team.name}</td>
                                  <td className="py-2 px-3 text-center text-sm">{team.played}</td>
                                  <td className="py-2 px-3 text-center text-sm text-green-400">{team.won}</td>
                                  <td className="py-2 px-3 text-center text-sm text-yellow-400">{team.drawn}</td>
                                  <td className="py-2 px-3 text-center text-sm text-red-400">{team.lost}</td>
                                  <td className="py-2 px-3 text-center text-sm">{team.goalsFor}</td>
                                  <td className="py-2 px-3 text-center text-sm">{team.goalsAgainst}</td>
                                  <td className="py-2 px-3 text-center text-sm font-semibold text-blue-400">{team.points}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : matches.length > 0 ? (
                  <div className="text-center py-12">
                    <div className="text-slate-400 mb-4">
                      <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">
                        {t('Ingen gruppespillkamper ferdig ennå', 'No group stage matches completed yet')}
                      </h3>
                      <p>{t('Tabellen vil vises når kamper er spilt og resultater er registrert.', 'The standings will appear once matches are played and results are registered.')}</p>
                    </div>
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
                {sortedDisplayMatches.length > 0 ? (
                  <div className="space-y-4">
                    {sortedDisplayMatches.map(match => (
                      <div key={match.id} className="pro11-card p-4">
                        <div className="matches-mobile space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-400">{match.date} {match.time}</div>
                            <div className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(match.status)}`}>
                              {getStatusText(match.status)}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-base font-semibold break-words">{match.homeTeam}</div>
                              </div>
                              <div
                                className={`text-2xl font-bold ${
                                  match.status === 'completed' || match.status === 'live'
                                    ? match.status === 'live'
                                      ? 'text-red-400'
                                      : 'text-white'
                                    : 'text-slate-400'
                                }`}
                              >
                                {match.status === 'completed' || match.status === 'live' ? match.homeScore : '-'}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-base font-semibold break-words">{match.awayTeam}</div>
                              </div>
                              <div
                                className={`text-2xl font-bold ${
                                  match.status === 'completed' || match.status === 'live'
                                    ? match.status === 'live'
                                      ? 'text-red-400'
                                      : 'text-white'
                                    : 'text-slate-400'
                                }`}
                              >
                                {match.status === 'completed' || match.status === 'live' ? match.awayScore : '-'}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 space-y-1">
                            {match.group && (
                              <div>
                                {match.group.startsWith('Gruppe')
                                  ? (isEnglish ? match.group.replace('Gruppe', 'Group') : match.group)
                                  : `${t('Gruppe', 'Group')} ${match.group}`}
                              </div>
                            )}
                            {match.round && match.round !== 'Gruppespill' && (
                              <div>{translateRoundName(match.round)}</div>
                            )}
                            {match.round === 'Gruppespill' && match.group && (
                              <div>
                                {t('Runde', 'Round')}{' '}
                                {match.groupRound || groupRoundMaps[match.group]?.[buildKey(match.homeTeam, match.awayTeam)] || '?'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="matches-desktop flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="text-right flex-1 min-w-0">
                              <span className="font-medium break-words">{match.homeTeam}</span>
                            </div>
                            <div className="text-center">
                              {match.status === 'completed' ? (
                                <div className="text-2xl font-bold">
                                  {match.homeScore} - {match.awayScore}
                                </div>
                              ) : match.status === 'live' ? (
                                <div className="text-2xl font-bold text-red-400">
                                  {match.homeScore} - {match.awayScore}
                                </div>
                              ) : (
                                <div className="text-lg text-slate-400">vs</div>
                              )}
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <span className="font-medium break-words">{match.awayTeam}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm text-slate-400">{match.date} {match.time}</div>
                            <div className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(match.status)}`}>
                              {getStatusText(match.status)}
                            </div>
                            {match.group && (
                              <div className="text-xs text-slate-500 mt-1">
                                {match.group.startsWith('Gruppe')
                                  ? (isEnglish ? match.group.replace('Gruppe', 'Group') : match.group)
                                  : `${t('Gruppe', 'Group')} ${match.group}`}
                              </div>
                            )}
                            {match.round && match.round !== 'Gruppespill' && (
                              <div className="text-xs text-slate-500 mt-1">{translateRoundName(match.round)}</div>
                            )}
                            {match.round === 'Gruppespill' && match.group && (
                              <div className="text-xs text-slate-500 mt-1">
                                {t('Runde', 'Round')}{' '}
                                {match.groupRound || groupRoundMaps[match.group]?.[buildKey(match.homeTeam, match.awayTeam)] || '?'}
                              </div>
                            )}
                          </div>
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
               
               if (!shouldShowKnockout && groupMatches.length > 0) {
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

             {activeTab === 'info' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">{t('Om turneringen', 'About the tournament')}</h3>
                  <p className="text-slate-300 leading-relaxed">
                    {stripGenFromDescription(tournament.description)}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4">{t('Format', 'Format')}</h3>
                  <div className="pro11-card p-4">
                    {getFormatFromDescription(tournament.description) ? (
                      <div className="space-y-2">
                        {getFormatFromDescription(tournament.description)
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
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 