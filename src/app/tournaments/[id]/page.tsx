'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Trophy, Users, Calendar, Clock, CheckCircle, XCircle, ExternalLink, Plus, Radio, Share2, User } from 'lucide-react'
import { fetchTournamentById } from '../../../lib/tournaments'
import { useLanguage } from '@/components/LanguageProvider'
import Header from '@/components/Header'
import { PrizePoolText, formatTournamentPrize } from '@/components/PrizePoolText'
import GroupStandingsTable, { type StandingsRow } from '@/components/GroupStandingsTable'
import TeamStreamPanel, { getStreamsForTeamName, type TeamStream } from '@/components/TeamStreamPanel'
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
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'bracket' | 'streams' | 'info'>('standings')
  const [matchFilter, setMatchFilter] = useState<'all' | 'live' | 'completed' | 'upcoming' | 'pending'>('all')
  const initialTabSetRef = useRef(false)
  const initialGroupFilterSetRef = useRef(false)
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

  const followTeamStorageKey = `pro11_follow_team_${tournamentId}`
  const [followTeam, setFollowTeam] = useState<string | null>(null)
  const [followTeamDraft, setFollowTeamDraft] = useState<string>('')
  const [followCounts, setFollowCounts] = useState<Record<string, number>>({})
  const visitorIdRef = useRef<string>('')
  const [groupFilter, setGroupFilter] = useState<'all' | string>('all')
  const [teamStreams, setTeamStreams] = useState<TeamStream[]>([])

  const registeredTeamNames = registeredTeams
    .map((t: any) => t.teamName || t.team_name)
    .filter((name: any) => typeof name === 'string' && name.trim().length > 0)

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

  const loadTeamStreams = useCallback(async () => {
    try {
      const response = await fetch(`/api/streams?tournament_id=${tournamentId}`)
      if (!response.ok) return
      const data = await response.json()
      setTeamStreams(data.streams || [])
    } catch {
      // Ignore stream load errors (table may not exist yet)
    }
  }, [tournamentId])

  useEffect(() => {
    if (!tournamentId) return
    loadTeams()
    loadMatches()
    loadTeamStreams()
  }, [tournamentId, loadTeams, loadMatches, loadTeamStreams])

  const syncFollow = useCallback(
    async (teamName: string | null) => {
      if (!visitorIdRef.current || !tournamentId) return
      try {
        const response = await fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tournamentId,
            visitorId: visitorIdRef.current,
            teamName
          })
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          console.warn('Follow sync failed:', data.error || response.status)
          return
        }
        if (data.counts && typeof data.counts === 'object') {
          setFollowCounts(data.counts)
        }
      } catch (error) {
        console.warn('Follow sync failed:', error)
      }
    },
    [tournamentId]
  )

  useEffect(() => {
    let savedFollow: string | null = null
    try {
      let visitorId = window.localStorage.getItem('pro11_visitor_id')
      if (!visitorId || visitorId.length < 8) {
        visitorId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID().replace(/-/g, '')
            : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
        window.localStorage.setItem('pro11_visitor_id', visitorId)
      }
      visitorIdRef.current = visitorId

      const saved = window.localStorage.getItem(followTeamStorageKey)
      if (saved && typeof saved === 'string' && saved.trim()) {
        savedFollow = saved.trim()
        setFollowTeam(savedFollow)
        setFollowTeamDraft(savedFollow)
      }
    } catch {
      // Ignore storage issues (private mode etc.)
    }

    const loadFollowCounts = async () => {
      try {
        const response = await fetch(`/api/follows?tournament_id=${tournamentId}`)
        if (!response.ok) return
        const data = await response.json()
        if (data.counts && typeof data.counts === 'object') {
          setFollowCounts(data.counts)
        }
      } catch {
        // Ignore
      }
    }

    const syncSavedFollow = async () => {
      if (!savedFollow || !visitorIdRef.current) return
      try {
        const response = await fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tournamentId,
            visitorId: visitorIdRef.current,
            teamName: savedFollow
          })
        })
        if (!response.ok) return
        const data = await response.json()
        if (data.counts && typeof data.counts === 'object') {
          setFollowCounts(data.counts)
        }
      } catch {
        // Ignore
      }
    }

    loadFollowCounts().then(() => syncSavedFollow())
  }, [followTeamStorageKey, tournamentId])

  useEffect(() => {
    // Persist followed team selection.
    try {
      if (followTeam && followTeam.trim()) {
        window.localStorage.setItem(followTeamStorageKey, followTeam)
      } else {
        window.localStorage.removeItem(followTeamStorageKey)
      }
    } catch {
      // Ignore storage issues
    }
  }, [followTeam, followTeamStorageKey])

  useEffect(() => {
    // Ensure followed team still exists in current tournament data.
    if (followTeam && registeredTeamNames.length > 0 && !registeredTeamNames.includes(followTeam)) {
      setFollowTeam(null)
      setFollowTeamDraft('')
      syncFollow(null)
    }
  }, [followTeam, registeredTeamNames, syncFollow])

  useEffect(() => {
    const groupNames = Object.keys(groupStandings)
    if (groupFilter !== 'all' && groupNames.length > 0 && !groupNames.includes(groupFilter)) {
      setGroupFilter('all')
    }
    if (!initialGroupFilterSetRef.current && groupNames.length > 0) {
      const sorted = [...groupNames].sort((a, b) => a.localeCompare(b, locale, { numeric: true }))
      setGroupFilter(sorted[0])
      initialGroupFilterSetRef.current = true
    }
  }, [groupStandings, groupFilter, locale])

  useEffect(() => {
    if (!tournamentId) return
    const pollMs = tournament?.status === 'ongoing' ? 12000 : 30000
    const interval = setInterval(() => {
      loadMatches()
      loadTeamStreams()
      fetch(`/api/follows?tournament_id=${tournamentId}`)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.counts && typeof data.counts === 'object') {
            setFollowCounts(data.counts)
          }
        })
        .catch(() => {})
    }, pollMs)
    return () => clearInterval(interval)
  }, [tournamentId, loadMatches, loadTeamStreams, tournament?.status])

  useEffect(() => {
    if (tournament?.status === 'ongoing' && matches.length > 0 && !initialTabSetRef.current) {
      setActiveTab('matches')
      initialTabSetRef.current = true
    }
  }, [tournament?.status, matches.length])

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/tournaments/${tournamentId}`
      const title = tournament?.title || 'PRO11'
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      alert(t(isEnglish ? 'Link copied.' : 'Lenke kopiert.', 'Link copied.'))
    } catch {
      alert(t(isEnglish ? 'Could not share link.' : 'Kunne ikke dele lenken.', 'Could not share link.'))
    }
  }

  const handleFollowSelect = (value: string) => {
    const next = value.trim()
    setFollowTeamDraft(next)
    setFollowTeam(next || null)
    syncFollow(next || null)
  }

  const handleClearFollowTeam = () => {
    setFollowTeam(null)
    setFollowTeamDraft('')
    syncFollow(null)
  }

  const topFollowedTeams = useMemo(() => {
    return Object.entries(followCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], locale))
      .slice(0, 5)
  }, [followCounts, locale])

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

  const tournamentWinner = useMemo(() => {
    if (!tournament || tournament.status !== 'completed') return null
    const finalMatch =
      matches.find((m: any) => (m.round === 'Finale' || m.round === 'Final') && m.status === 'completed') ||
      null

    if (!finalMatch) return null
    const s1 = typeof finalMatch.score1 === 'number' ? finalMatch.score1 : finalMatch.score1 ?? null
    const s2 = typeof finalMatch.score2 === 'number' ? finalMatch.score2 : finalMatch.score2 ?? null
    if (s1 === null || s2 === null) return null
    if (s1 > s2) return finalMatch.team1_name
    if (s2 > s1) return finalMatch.team2_name
    return finalMatch.team1_name
  }, [tournament, matches])

  if (isLoading || !tournament) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header backButton backHref="/tournaments" title={t('Pro Clubs Turneringer', 'Pro Clubs Tournaments')} />
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-3xl animate-pulse">
            <div className="h-10 bg-slate-800/70 rounded-lg mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="h-8 bg-slate-800/70 rounded-lg" />
              <div className="h-8 bg-slate-800/70 rounded-lg" />
              <div className="h-8 bg-slate-800/70 rounded-lg" />
              <div className="h-8 bg-slate-800/70 rounded-lg" />
            </div>
            <div className="h-10 bg-slate-800/70 rounded-lg mb-4" />
            <div className="h-6 bg-slate-800/70 rounded-lg w-2/3 mb-3" />
            <div className="h-6 bg-slate-800/70 rounded-lg w-1/2" />
            <p className="mt-6 text-slate-400 text-sm">
              {t('Laster turnering...', 'Loading tournament...')}
            </p>
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

  const getGroupShortLabel = (group: string) => {
    const trimmed = (group || '').trim()
    if (!trimmed) return t('Ukjent', 'Unknown')
    const stripped = trimmed
      .replace(/^gruppe\s*/i, '')
      .replace(/^group\s*/i, '')
      .trim()
    return stripped || trimmed
  }

  const formatGroupLabel = (group: string) => {
    const short = getGroupShortLabel(group)
    return `${t('Gruppe', 'Group')} ${short}`
  }

  const sortGroupNames = (names: string[]) =>
    [...names].sort((a, b) => {
      const aKey = getGroupShortLabel(a)
      const bKey = getGroupShortLabel(b)
      const aNum = Number(aKey)
      const bNum = Number(bKey)
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum
      return aKey.localeCompare(bKey, locale, { numeric: true, sensitivity: 'base' })
    })

  const getMatchMeta = (match: Match) => {
    const parts: string[] = []
    if (match.date && match.time) parts.push(`${match.date} ${match.time}`)
    if (match.group) {
      parts.push(formatGroupLabel(match.group))
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

  const knockoutRoundOrder: Record<string, number> = {
    '16-delsfinaler': 1,
    'Åttendelsfinaler': 2,
    'Kvartfinaler': 3,
    'Semifinaler': 4,
    'Finale': 5,
    'Sluttspill': 0
  }

  type MatchListSection = {
    key: string
    title: string
    matches: Match[]
    kind: 'group' | 'knockout'
  }

  const buildMatchListSections = (sourceMatches: Match[]): MatchListSection[] => {
    const groupByRound: Record<string, Record<number, Match[]>> = {}
    const knockoutByRound: Record<string, Match[]> = {}

    sourceMatches.forEach(match => {
      if (match.round === 'Gruppespill' && match.group) {
        if (groupFilter !== 'all' && match.group !== groupFilter) return
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
      if (groupFilter !== 'all') return
      const roundKey = match.round || t('Annet', 'Other')
      if (!knockoutByRound[roundKey]) knockoutByRound[roundKey] = []
      knockoutByRound[roundKey].push(match)
    })

    const sections: MatchListSection[] = []
    const singleGroupView = groupFilter !== 'all'

    sortGroupNames(Object.keys(groupByRound)).forEach(groupName => {
      const rounds = groupByRound[groupName]
      Object.keys(rounds)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(roundNo => {
          sections.push({
            key: `group-${groupName}-r${roundNo}`,
            title: singleGroupView
              ? roundNo > 0
                ? `${t('Runde', 'Round')} ${roundNo}`
                : formatGroupLabel(groupName)
              : roundNo > 0
                ? `${formatGroupLabel(groupName)} · ${t('Runde', 'Round')} ${roundNo}`
                : formatGroupLabel(groupName),
            matches: rounds[roundNo],
            kind: 'group'
          })
        })
    })

    Object.keys(knockoutByRound)
      .sort((a, b) => (knockoutRoundOrder[a] ?? 999) - (knockoutRoundOrder[b] ?? 999))
      .forEach(roundKey => {
        sections.push({
          key: `ko-${roundKey}`,
          title: translateRoundName(roundKey),
          matches: knockoutByRound[roundKey],
          kind: 'knockout'
        })
      })

    return sections
  }

  const filteredDisplayMatches = sortedDisplayMatches.filter(match => {
    if (matchFilter === 'all') return true
    if (matchFilter === 'live') return match.status === 'live'
    if (matchFilter === 'completed') return match.status === 'completed'
    if (matchFilter === 'upcoming') return match.status === 'scheduled'
    if (matchFilter === 'pending') {
      return match.status === 'pending_result' || match.status === 'pending_confirmation'
    }
    return true
  })

  const matchFilterCounts = {
    all: sortedDisplayMatches.length,
    live: sortedDisplayMatches.filter(m => m.status === 'live').length,
    completed: sortedDisplayMatches.filter(m => m.status === 'completed').length,
    upcoming: sortedDisplayMatches.filter(m => m.status === 'scheduled').length,
    pending: sortedDisplayMatches.filter(
      m => m.status === 'pending_result' || m.status === 'pending_confirmation'
    ).length
  }

  const matchListSections = buildMatchListSections(filteredDisplayMatches)

  const renderMatchStreams = (teamName: string) => {
    const teamStreamLinks = getStreamsForTeamName(teamStreams, teamName)
    if (teamStreamLinks.length === 0) return null

    return (
      <div className="flex flex-wrap gap-1 px-2 pb-1.5">
        {teamStreamLinks.map(stream => (
          <a
            key={stream.id}
            href={stream.streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-900/40 text-red-200 border border-red-700/40 hover:bg-red-900/60"
            title={stream.displayName || teamName}
          >
            <Radio className="w-3 h-3" />
            {stream.displayName || teamName}
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
        ))}
      </div>
    )
  }

  const renderMatchRow = (match: Match, meta?: string) => {
    const showScore = match.status === 'completed' || match.status === 'live'
    const metaLine = meta ?? getMatchMeta(match)
    const isFollow = Boolean(followTeam) && (match.homeTeam === followTeam || match.awayTeam === followTeam)
    const homeIsFollow = Boolean(followTeam) && match.homeTeam === followTeam
    const awayIsFollow = Boolean(followTeam) && match.awayTeam === followTeam
    const homeStreams = getStreamsForTeamName(teamStreams, match.homeTeam)
    const awayStreams = getStreamsForTeamName(teamStreams, match.awayTeam)
    const hasStreams = homeStreams.length > 0 || awayStreams.length > 0
    return (
      <div
        key={match.id}
        className={[
          match.status === 'live' ? 'bg-red-950/20' : '',
          isFollow
            ? 'bg-blue-600/15 border-l-2 border-l-blue-400'
            : 'border-l-2 border-l-transparent'
        ].join(' ')}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm min-h-[2rem]">
          <span
            className={`w-[28%] sm:w-[22%] min-w-0 truncate text-right font-medium ${
              homeIsFollow ? 'text-blue-300 font-semibold' : ''
            }`}
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
            className={`w-[28%] sm:w-[22%] min-w-0 truncate font-medium ${
              awayIsFollow ? 'text-blue-300 font-semibold' : ''
            }`}
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
        {metaLine && (
          <div className="sm:hidden px-2 pb-1.5 text-[10px] text-slate-500 truncate" title={metaLine}>
            {metaLine}
          </div>
        )}
        {hasStreams && (
          <div className="border-t border-slate-700/30">
            {homeStreams.length > 0 && renderMatchStreams(match.homeTeam)}
            {awayStreams.length > 0 && renderMatchStreams(match.awayTeam)}
          </div>
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
              <div className="flex items-start space-x-2">
                <Trophy className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                <PrizePoolText
                  tournament={tournament}
                  isEnglish={isEnglish}
                  className="text-sm sm:text-base text-left"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-400" />
                <span className="text-sm sm:text-base">{tournament.registeredTeams}/{tournament.maxTeams} {t('lag', 'teams')}</span>
              </div>
              {typeof tournament.entryFee === 'number' && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <span className="text-sm sm:text-base">
                    {t('Avgift', 'Fee')}:{' '}
                    {tournament.entryFee === 0
                      ? t('Gratis', 'Free')
                      : `${tournament.entryFee} NOK`}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  tournament.status === 'ongoing' ? 'bg-red-600 animate-pulse' : getStatusColor(tournament.status)
                }`}
              >
                {tournament.status === 'open'
                  ? t('Åpen for påmelding', 'Open for registration')
                  : tournament.status === 'ongoing'
                    ? 'LIVE'
                    : tournament.status === 'closed'
                      ? t('Stengt', 'Closed')
                      : t('Fullført', 'Completed')}
              </span>
              {tournament.isDemo && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-600/30 text-purple-200 border border-purple-500/40">
                  DEMO
                </span>
              )}
              {tournament.status === 'open' && !tournament.isDemo && (
                <Link
                  href={`/register?tournament=${encodeURIComponent(tournament.id)}`}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
                >
                  <Plus className="w-4 h-4" />
                  {t('Meld på lag', 'Register team')}
                </Link>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
              >
                <Share2 className="w-4 h-4" />
                {t('Del turnering', 'Share tournament')}
              </button>

              {tournament.status === 'completed' && (
                <Link
                  href="/hall-of-fame"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('Hall of Fame', 'Hall of Fame')}
                </Link>
              )}
            </div>

            {registeredTeamNames.length > 0 && (
              <div className="mt-3 flex flex-col items-center justify-center gap-2">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <User className="w-4 h-4 text-blue-300" />
                    {t('Følger lag', 'Following team')}:
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
                    <select
                      value={followTeamDraft}
                      onChange={(e) => handleFollowSelect(e.target.value)}
                      className="bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none max-w-full"
                    >
                      <option value="">{t('Ingen valgt', 'None selected')}</option>
                      {registeredTeamNames.map(name => {
                        const count = followCounts[name] || 0
                        return (
                          <option key={name} value={name}>
                            {count > 0 ? `${name} (${count})` : name}
                          </option>
                        )
                      })}
                    </select>

                    <button
                      type="button"
                      onClick={handleClearFollowTeam}
                      disabled={!followTeam}
                      className="pro11-button-secondary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('Slutt å følge', 'Unfollow')}
                    </button>
                  </div>
                </div>

                <div className="w-full max-w-xl rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-xs text-slate-300">
                  <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
                    <span className="text-slate-400 font-medium mr-1">
                      {t('Mest fulgt', 'Most followed')}:
                    </span>
                    {topFollowedTeams.length > 0 ? (
                      topFollowedTeams.map(([name, count], index) => (
                        <span
                          key={name}
                          className={
                            followTeam === name
                              ? 'text-blue-300 font-medium'
                              : 'text-slate-300'
                          }
                        >
                          {index > 0 && <span className="text-slate-600 mx-1">·</span>}
                          {index + 1}. {name}
                          <span className="text-slate-500 ml-1">({count})</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">
                        {followTeam
                          ? t(
                              'Følging lagres ikke ennå — kjør SETUP_TOURNAMENT_FOLLOWERS.sql i Supabase.',
                              'Follows are not saving yet — run SETUP_TOURNAMENT_FOLLOWERS.sql in Supabase.'
                            )
                          : t(
                              'Ingen følgere ennå — velg et lag for å starte.',
                              'No followers yet — pick a team to start.'
                            )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {matches.length > 0 && (
            <div className="pro11-card p-4 sm:p-5 mb-6">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-300 mb-3">
                {tournament.status === 'ongoing' && liveCount > 0 && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 text-red-400 font-semibold">
                    <Radio className="w-3.5 h-3.5" />
                    {liveCount} LIVE
                  </span>
                )}
                <span>
                  <span className="font-semibold text-white">{completedCount}/{matches.length}</span>{' '}
                  {t('kamper', 'matches')}
                </span>
                <span className="text-blue-400 font-semibold">{matchProgress}%</span>
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
              <div className="w-full bg-slate-700/80 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-600 to-green-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${matchProgress}%` }}
                />
              </div>
            </div>
          )}

          {tournament.status === 'completed' && tournamentWinner && (
            <div className="pro11-card p-6 mb-6 text-center border border-yellow-600/30 bg-yellow-900/10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-200 uppercase tracking-wide">
                  {t('Vinner', 'Winner')}
                </span>
              </div>
              <div className="text-2xl font-bold text-yellow-200 break-words">
                {tournamentWinner}
              </div>
              {tournament.prize && (
                <div className="mt-2 text-sm text-slate-300">
                  {t('Premie', 'Prize')}: {tournament.prize}
                </div>
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
                onClick={() => setActiveTab('streams')}
                className={`px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors ${
                  activeTab === 'streams'
                    ? 'bg-red-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('Streams', 'Streams')}
                {teamStreams.length > 0 && (
                  <span className="ml-1 opacity-80">({teamStreams.length})</span>
                )}
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
                  <>
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                      <button
                        type="button"
                        onClick={() => setGroupFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                          groupFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {t('Alle', 'All')}
                      </button>
                      {sortGroupNames(Object.keys(groupStandings)).map(groupName => (
                        <button
                          key={groupName}
                          type="button"
                          onClick={() => setGroupFilter(groupName)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            groupFilter === groupName
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {getGroupShortLabel(groupName)}
                        </button>
                      ))}
                    </div>

                    <div
                      className={
                        groupFilter === 'all'
                          ? 'grid md:grid-cols-2 gap-4'
                          : 'space-y-4'
                      }
                    >
                      {(groupFilter === 'all'
                        ? sortGroupNames(Object.keys(groupStandings)).map(
                            name => [name, groupStandings[name]] as const
                          )
                        : Object.entries(groupStandings).filter(([name]) => name === groupFilter)
                      ).map(([groupName, standings]) => (
                        <div key={groupName} className="pro11-card p-4">
                          <h3 className="font-semibold mb-3 text-lg">{formatGroupLabel(groupName)}</h3>
                          <GroupStandingsTable
                            rows={standings}
                            isEnglish={isEnglish}
                            highlightTeam={followTeam ?? undefined}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-slate-400 mb-4">
                      <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">
                        {t('Ingen kamper generert', 'No matches generated')}
                      </h3>
                      <p>
                        {t(
                          'Kamper må genereres før tabellen kan vises.',
                          'Matches must be generated before standings can be shown.'
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'matches' && (
              <div>
                {Object.keys(groupStandings).length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => setGroupFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        groupFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {t('Alle', 'All')}
                    </button>
                    {sortGroupNames(Object.keys(groupStandings)).map(groupName => (
                      <button
                        key={groupName}
                        type="button"
                        onClick={() => setGroupFilter(groupName)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                          groupFilter === groupName
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {getGroupShortLabel(groupName)}
                      </button>
                    ))}
                  </div>
                )}
                {sortedDisplayMatches.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(
                      [
                        ['all', t('Alle', 'All')],
                        ['live', 'LIVE'],
                        ['upcoming', t('Kommende', 'Upcoming')],
                        ['pending', t('Venter', 'Pending')],
                        ['completed', t('Ferdig', 'Done')]
                      ] as const
                    ).map(([key, label]) => {
                      const count = matchFilterCounts[key]
                      if (key !== 'all' && count === 0) return null
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setMatchFilter(key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            matchFilter === key
                              ? key === 'live'
                                ? 'bg-red-600 text-white'
                                : 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {label}
                          {count > 0 && (
                            <span className="ml-1 opacity-80">({count})</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
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
                ) : sortedDisplayMatches.length > 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p>{t('Ingen kamper matcher filteret.', 'No matches match this filter.')}</p>
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

            {activeTab === 'streams' && (
              <TeamStreamPanel
                tournamentId={tournamentId}
                teams={registeredTeams}
                isEnglish={isEnglish}
                onStreamsChange={setTeamStreams}
              />
            )}

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
                    {tournament.isDynamicPrize ? (
                      <p className="text-slate-300">
                        {t(
                          'Premiepotten er live og øker med antall påmeldte lag. Tallet viser nåværende pott av maks pott ved fullt felt.',
                          'The prize pool is live and grows with registered teams. The number shows current pot of max pot at a full field.'
                        )}
                      </p>
                    ) : (
                      <p className="text-slate-300">
                        {t(
                          'Premiepotten oppgis av admin og oppdateres ved behov.',
                          'The prize pool is provided by admin and updated as needed.'
                        )}
                      </p>
                    )}
                    {(tournament.prize || typeof tournament.prizeAmount === 'number') && (
                      <p className="text-slate-300 mt-2 font-medium">
                        {t('Premiepott', 'Prize pool')}: {formatTournamentPrize(tournament, isEnglish)}
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