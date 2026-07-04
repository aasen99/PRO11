'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Trophy, RefreshCw, Radio } from 'lucide-react'
import { ToastContainer } from '@/components/Toast'
import type { ToastType } from '@/components/Toast'
import { useLanguage } from '@/components/LanguageProvider'
import { apiFetch } from '@/lib/client-fetch'
import GroupStandingsTable from '@/components/GroupStandingsTable'
import AdminMatchCard from '@/components/admin/AdminMatchCard'
import { buildAttentionItems } from '@/lib/tournament-events'

interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

interface Match {
  id: string
  team1_name: string
  team2_name: string
  round: string
  group_name?: string
  group_round?: number
  status: 'scheduled' | 'live' | 'completed' | 'pending_result' | 'pending_confirmation'
  score1?: number
  score2?: number
  scheduled_time?: string
  submitted_by?: string
  submitted_score1?: number
  submitted_score2?: number
  team1_submitted_score1?: number
  team1_submitted_score2?: number
  team2_submitted_score1?: number
  team2_submitted_score2?: number
  team1_proof_url?: string | null
  team2_proof_url?: string | null
}

interface Tournament {
  id: string
  title: string
  status: string
  start_date: string
  end_date: string
}

interface GroupStanding {
  team: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

interface StoredMatchConfig {
  teamsToKnockout: number
  useBestRunnersUp: boolean
  numBestRunnersUp: number
}

/** Format date for datetime-local input (local time), not UTC */
function toLocalDatetimeLocal(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

function MatchProofLinks({ match }: { match: Match }) {
  if (!match.team1_proof_url && !match.team2_proof_url) return null
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {match.team1_proof_url && (
        <a
          href={match.team1_proof_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 underline truncate max-w-[10rem] inline-block"
          title={match.team1_name}
        >
          📷 {match.team1_name}
        </a>
      )}
      {match.team2_proof_url && (
        <a
          href={match.team2_proof_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 underline truncate max-w-[10rem] inline-block"
          title={match.team2_name}
        >
          📷 {match.team2_name}
        </a>
      )}
    </div>
  )
}

export default function TournamentMatchesPage() {
  const params = useParams()
  const tournamentId = params.id as string
  const { language } = useLanguage()
  const isEnglish = language === 'en'
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)
  const locale = isEnglish ? 'en-US' : 'nb-NO'
  
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [groupStandings, setGroupStandings] = useState<Record<string, GroupStanding[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [editingMatch, setEditingMatch] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    score1?: number
    score2?: number
    scheduled_time?: string
    status?: string
  }>({})
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set())
  const [bulkScheduledTime, setBulkScheduledTime] = useState('')
  const [roundScheduleStart, setRoundScheduleStart] = useState('')
  const [roundScheduleInterval, setRoundScheduleInterval] = useState('20')
  const [isBulkSaving, setIsBulkSaving] = useState(false)
  const [showBulkTool, setShowBulkTool] = useState(false)
  const [matchFilter, setMatchFilter] = useState<'all' | 'attention' | 'live' | 'pending'>('all')
  const [matchLog, setMatchLog] = useState<Array<{ id?: string; action: string; actor_type?: string; actor_name?: string; old_score1?: number | null; old_score2?: number | null; new_score1?: number | null; new_score2?: number | null; created_at: string }>>([])
  const [teamDiscordByName, setTeamDiscordByName] = useState<Record<string, string>>({})
  const previousMatchesRef = useRef<Match[]>([])
  const autoKnockoutInProgressRef = useRef(false)
  const groupRoundBackfillRef = useRef(false)

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const toggleMatchSelection = (matchId: string) => {
    setSelectedMatchIds(prev => {
      const next = new Set(prev)
      if (next.has(matchId)) {
        next.delete(matchId)
      } else {
        next.add(matchId)
      }
      return next
    })
  }

  const selectMatches = (matchIds: string[]) => {
    setSelectedMatchIds(prev => {
      const next = new Set(prev)
      matchIds.forEach(id => next.add(id))
      return next
    })
  }

  const clearSelectedMatches = () => {
    setSelectedMatchIds(new Set())
  }

  const getStoredMatchConfig = (): StoredMatchConfig => {
    try {
      const raw = localStorage.getItem(`matchConfig:${tournamentId}`)
      if (!raw) {
        return { teamsToKnockout: 2, useBestRunnersUp: false, numBestRunnersUp: 0 }
      }
      const parsed = JSON.parse(raw)
      return {
        teamsToKnockout: Number(parsed.teamsToKnockout) || 2,
        useBestRunnersUp: Boolean(parsed.useBestRunnersUp),
        numBestRunnersUp: Number(parsed.numBestRunnersUp) || 0
      }
    } catch (error) {
      console.warn('Could not read match config, using defaults:', error)
      return { teamsToKnockout: 2, useBestRunnersUp: false, numBestRunnersUp: 0 }
    }
  }

  // Canonical round names for DB/API (Norwegian) – API only recognises these for next-round generation
  const getRoundNameForTeamsCanonical = (numTeams: number): string => {
    if (numTeams === 2) return 'Finale'
    if (numTeams === 4) return 'Semifinaler'
    if (numTeams === 8) return 'Kvartfinaler'
    if (numTeams > 8) return 'Kvartfinaler'
    if (numTeams > 4) return 'Semifinaler'
    return 'Sluttspill'
  }

  const getRoundNameForTeams = (numTeams: number): string => {
    if (numTeams === 2) return t('Finale', 'Final')
    if (numTeams === 4) return t('Semifinaler', 'Semifinals')
    if (numTeams === 8) return t('Kvartfinaler', 'Quarterfinals')
    if (numTeams > 8) return t('Kvartfinaler', 'Quarterfinals')
    if (numTeams > 4) return t('Semifinaler', 'Semifinals')
    return t('Sluttspill', 'Knockout')
  }

  const generateSeededBracket = (
    teams: string[],
    roundName: string,
    teamToGroup?: Record<string, string>
  ) => {
    const n = teams.length
    const half = Math.floor(n / 2)
    const highSeeds = teams.slice(0, half)
    const lowPool = teams.slice(half).reverse()

    let lowSeeds: string[] = lowPool
    if (teamToGroup && Object.keys(teamToGroup).length > 0) {
      const usedLow = new Set<number>()
      lowSeeds = highSeeds.map((highSeed) => {
        const highGroup = teamToGroup[highSeed]
        let chosen = -1
        for (let j = 0; j < lowPool.length; j++) {
          if (usedLow.has(j)) continue
          if (highGroup && teamToGroup[lowPool[j]] === highGroup) continue
          chosen = j
          break
        }
        if (chosen === -1) {
          for (let j = 0; j < lowPool.length; j++) {
            if (!usedLow.has(j)) { chosen = j; break }
          }
        }
        if (chosen >= 0) usedLow.add(chosen)
        return chosen >= 0 ? lowPool[chosen] : ''
      })
    }

    const matchesToCreate: any[] = []
    for (let i = 0; i < highSeeds.length; i++) {
      const team1 = highSeeds[i]
      const team2 = lowSeeds[i]
      if (team1 && team2 && team1 !== team2) {
        matchesToCreate.push({
          tournament_id: tournamentId,
          team1_name: team1,
          team2_name: team2,
          round: roundName,
          status: 'scheduled'
        })
      }
    }
    return matchesToCreate
  }

  const backfillGroupRounds = async (loadedMatches: Match[]) => {
    const groupMatches = loadedMatches.filter(match => match.round === 'Gruppespill' && match.group_name)
    if (groupMatches.length === 0) return
    if (!groupMatches.some(match => match.group_round === undefined || match.group_round === null)) return
    if (groupRoundBackfillRef.current) return

    groupRoundBackfillRef.current = true
    try {
      const grouped = groupMatches.reduce((acc: Record<string, Match[]>, match) => {
        const groupName = match.group_name as string
        if (!acc[groupName]) acc[groupName] = []
        acc[groupName].push(match)
        return acc
      }, {})

      const updates: Array<{ id: string; group_round: number }> = []
      Object.entries(grouped).forEach(([groupName, groupList]) => {
        const roundMap = buildGroupRoundMap(groupList)
        const buildKey = (teamA: string, teamB: string) => [teamA, teamB].sort().join('|')
        groupList.forEach(match => {
          if (match.group_round === undefined || match.group_round === null) {
            const round = roundMap[buildKey(match.team1_name, match.team2_name)]
            if (round) {
              updates.push({ id: match.id, group_round: round })
            }
          }
        })
      })

      if (updates.length === 0) return

      let hasError = false
      await Promise.all(updates.map(async update => {
        const response = await apiFetch('/api/matches', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        })
        if (!response.ok) {
          hasError = true
          const errorData = await response.json().catch(() => ({ error: t('Ukjent feil', 'Unknown error') }))
          console.error('Failed to backfill group_round:', update, errorData)
          if (String(errorData.error || '').includes('group_round')) {
            addToast({
              message: t(
                'Klarte ikke oppdatere group_round. Kjør SQL: alter table public.matches add column if not exists group_round integer;',
                'Could not update group_round. Run SQL: alter table public.matches add column if not exists group_round integer;'
              ),
              type: 'warning'
            })
          }
        }
      }))

      if (hasError) {
        groupRoundBackfillRef.current = false
      } else {
        addToast({
          message: t(`Oppdaterte group_round for ${updates.length} kamper.`, `Updated group_round for ${updates.length} matches.`),
          type: 'success'
        })
      }
    } catch (error) {
      groupRoundBackfillRef.current = false
      console.error('Error backfilling group rounds:', error)
    }
  }

  const loadData = useCallback(async () => {
      if (!tournamentId) {
        console.error('No tournament ID provided')
        setIsLoading(false)
        return
      }

      console.log('Loading data for tournament:', tournamentId)
      let tournamentStartDate: string | null = null

      try {
        const tournamentResponse = await apiFetch(`/api/tournaments?id=${tournamentId}`)
        console.log('Tournament API response status:', tournamentResponse.status)
        if (tournamentResponse.ok) {
          const tournamentData = await tournamentResponse.json()
          console.log('Tournament data received:', tournamentData)
          if (tournamentData.tournament) {
            setTournament(tournamentData.tournament)
            tournamentStartDate = tournamentData.tournament.start_date ?? null
          } else {
            console.error('No tournament in response:', tournamentData)
          }
        } else {
          const errorData = await tournamentResponse.json().catch(() => ({}))
          console.error('Error loading tournament:', errorData)
        }

        // Load matches
        const matchesUrl = `/api/matches?tournament_id=${tournamentId}`
        console.log('Fetching matches from:', matchesUrl)
        const [matchesResponse, teamsResponse] = await Promise.all([
          apiFetch(matchesUrl),
          apiFetch(`/api/teams?tournamentId=${tournamentId}`)
        ])
        console.log('Matches API response status:', matchesResponse.status)

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json()
          const discordMap = (teamsData.teams || []).reduce(
            (acc: Record<string, string>, team: { teamName?: string; team_name?: string; discordUsername?: string; discord_username?: string }) => {
              const name = team.teamName || team.team_name
              if (name) {
                acc[name] = team.discordUsername || team.discord_username || ''
              }
              return acc
            },
            {}
          )
          setTeamDiscordByName(discordMap)
        }
        
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json()
          console.log('Matches data received:', {
            tournamentId,
            matchesCount: matchesData.matches?.length || 0,
            matches: matchesData.matches?.map((m: any) => ({
              id: m.id,
              tournament_id: m.tournament_id,
              round: m.round,
              team1: m.team1_name,
              team2: m.team2_name
            }))
          })
          
          const loadedMatches: Match[] = (matchesData.matches || []).map((match: any) => {
            const status: Match['status'] =
              match.status === 'scheduled' ||
              match.status === 'live' ||
              match.status === 'completed' ||
              match.status === 'pending_result' ||
              match.status === 'pending_confirmation'
                ? match.status
                : 'scheduled'
            return { ...match, status } as Match
          })
          
          // Check for new result conflicts
          const previousMatches = previousMatchesRef.current
          loadedMatches.forEach((match: Match) => {
            const previousMatch = previousMatches.find(pm => pm.id === match.id)
            const hasConflict = match.team1_submitted_score1 !== null && 
                                match.team2_submitted_score1 !== null && 
                                (match.team1_submitted_score1 !== match.team2_submitted_score2 || 
                                 match.team1_submitted_score2 !== match.team2_submitted_score1)
            
            const previousHasConflict = previousMatch && 
                                        previousMatch.team1_submitted_score1 !== null && 
                                        previousMatch.team2_submitted_score1 !== null && 
                                        (previousMatch.team1_submitted_score1 !== previousMatch.team2_submitted_score2 || 
                                         previousMatch.team1_submitted_score2 !== previousMatch.team2_submitted_score1)
            
            // If conflict just appeared (wasn't there before)
            if (hasConflict && !previousHasConflict) {
              addToast({
                message: `⚠️ Resultatkonflikt: ${match.team1_name} vs ${match.team2_name}. Begge lag har sendt inn ulike resultater.`,
                type: 'warning'
              })
            }
          })
          
          previousMatchesRef.current = loadedMatches
          
          await backfillGroupRounds(loadedMatches)
          const updatedMatches = await updateMatchesToLive(loadedMatches)
          setMatches(updatedMatches)
          
          if (loadedMatches.length === 0) {
            console.warn('No matches found for tournament:', tournamentId)
          }
          
          // Calculate group standings
          const standings = calculateGroupStandings(updatedMatches)
          setGroupStandings(standings)

          // Auto-generate knockout when all group matches are completed
          const groupMatches = updatedMatches.filter((m: Match) => m.round === 'Gruppespill')
          const knockoutMatches = updatedMatches.filter((m: Match) => m.round !== 'Gruppespill')
          const allGroupMatchesCompleted = groupMatches.length > 0 && groupMatches.every((m: Match) =>
            m.status === 'completed' &&
            m.score1 !== undefined &&
            m.score1 !== null &&
            m.score2 !== undefined &&
            m.score2 !== null
          )

          if (
            allGroupMatchesCompleted &&
            knockoutMatches.length === 0 &&
            !autoKnockoutInProgressRef.current
          ) {
            autoKnockoutInProgressRef.current = true
            try {
              const config = getStoredMatchConfig()
              const teamsToKnockout = Math.max(1, config.teamsToKnockout || 2)

              const groupNames = Object.keys(standings).sort()
              const qualifiers: Array<GroupStanding & { position: number; groupName: string }> = []
              groupNames.forEach(groupName => {
                const groupStandings = standings[groupName] || []
                groupStandings.slice(0, teamsToKnockout).forEach((team, index) => {
                  qualifiers.push({ ...team, position: index + 1, groupName })
                })
              })

              if (config.useBestRunnersUp && config.numBestRunnersUp > 0) {
                const runnersUpWithGroup = groupNames.flatMap(gn => {
                  const group = standings[gn] || []
                  const runner = group[1]
                  return runner ? [{ ...runner, groupName: gn }] : []
                }).sort((a, b) => {
                  if (b.points !== a.points) return b.points - a.points
                  const aDiff = a.goalsFor - a.goalsAgainst
                  const bDiff = b.goalsFor - b.goalsAgainst
                  if (bDiff !== aDiff) return bDiff - aDiff
                  return b.goalsFor - a.goalsFor
                })

                runnersUpWithGroup.slice(0, config.numBestRunnersUp).forEach(team => {
                  if (!qualifiers.some(q => q.team === team.team)) {
                    qualifiers.push({ ...team, position: 2, groupName: team.groupName })
                  }
                })
              }

              if (qualifiers.length >= 2) {
                const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0
                const usePlayInBracket = groupNames.length === 2 && !isPowerOf2(qualifiers.length) && teamsToKnockout === 3 && qualifiers.length === 6

                let matchesToCreate: Array<{ tournament_id: string; team1_name: string; team2_name: string; round: string; status: string }> = []
                let semifinalByes: string[] | null = null

                if (usePlayInBracket) {
                  const firstGroup = standings[groupNames[0]] || []
                  const secondGroup = standings[groupNames[1]] || []
                  const team1A = firstGroup[0]?.team
                  const team1B = secondGroup[0]?.team
                  const team2A = firstGroup[1]?.team
                  const team2B = secondGroup[1]?.team
                  const team3A = firstGroup[2]?.team
                  const team3B = secondGroup[2]?.team
                  if (team1A && team1B && team2A && team2B && team3A && team3B) {
                    const MINUTES_PER_ROUND = 25
                    const maxGroupRound = updatedMatches.some((m: Match) => m.round === 'Gruppespill')
                      ? Math.max(0, ...updatedMatches.filter((m: Match) => m.round === 'Gruppespill').map((m: Match) => m.group_round ?? 0))
                      : 0
                    const kvartfinaleStartMs = tournamentStartDate
                      ? new Date(tournamentStartDate).getTime() + maxGroupRound * MINUTES_PER_ROUND * 60 * 1000
                      : null
                    const scheduledTimeIso = kvartfinaleStartMs != null ? new Date(kvartfinaleStartMs).toISOString() : undefined
                    matchesToCreate = [
                      { tournament_id: tournamentId!, team1_name: team2A, team2_name: team3B, round: 'Kvartfinaler', status: 'scheduled', ...(scheduledTimeIso && { scheduled_time: scheduledTimeIso }) },
                      { tournament_id: tournamentId!, team1_name: team2B, team2_name: team3A, round: 'Kvartfinaler', status: 'scheduled', ...(scheduledTimeIso && { scheduled_time: scheduledTimeIso }) }
                    ]
                    semifinalByes = [team1A, team1B]
                  }
                }

                if (!matchesToCreate.length) {
                  const rankedTeams = [...qualifiers].sort((a, b) => {
                    if (a.position !== b.position) return a.position - b.position
                    if (b.points !== a.points) return b.points - a.points
                    const aDiff = a.goalsFor - a.goalsAgainst
                    const bDiff = b.goalsFor - b.goalsAgainst
                    if (bDiff !== aDiff) return bDiff - aDiff
                    return b.goalsFor - a.goalsFor
                  })
                  const teamNames = rankedTeams.map(q => q.team)
                  const teamToGroup: Record<string, string> = {}
                  rankedTeams.forEach(q => { teamToGroup[q.team] = q.groupName })
                  const roundName = getRoundNameForTeamsCanonical(teamNames.length)
                  const avoidSameGroup = groupNames.length > 1
                  matchesToCreate = generateSeededBracket(
                    teamNames,
                    roundName,
                    avoidSameGroup ? teamToGroup : undefined
                  )
                }

                if (matchesToCreate.length > 0) {
                  const insertPromises = matchesToCreate.map(async (match) => {
                    const response = await apiFetch('/api/matches', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(match)
                    })
                    if (!response.ok) {
                      const errorData = await response.json()
                      throw new Error(errorData.error || 'Kunne ikke opprette kamp')
                    }
                    return response.json()
                  })

                  await Promise.all(insertPromises)

                  if (semifinalByes && semifinalByes.length === 2) {
                    const byeTag = `[KNOCKOUT_BYES:Semifinaler:${semifinalByes.join('§')}]`
                    try {
                      const tRes = await apiFetch(`/api/tournaments?id=${tournamentId}`)
                      const tData = tRes.ok ? await tRes.json() : {}
                      const currentDesc = (tData.tournament?.description || '').replace(/\[KNOCKOUT_BYES:[^\]]+\]/g, '').trim()
                      const newDesc = currentDesc ? `${currentDesc}\n${byeTag}` : byeTag
                      await apiFetch('/api/tournaments', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: tournamentId, description: newDesc })
                      })
                    } catch (e) {
                      console.warn('Could not store semifinal byes:', e)
                    }
                  }

                  const roundLabel = usePlayInBracket ? t('Kvartfinaler (play-in)', 'Quarterfinals (play-in)') : getRoundNameForTeams(matchesToCreate.length * 2)
                  addToast({
                    message: t(
                      `Sluttspill generert automatisk: ${roundLabel} (${matchesToCreate.length} kamper).`,
                      `Knockout generated automatically: ${roundLabel} (${matchesToCreate.length} matches).`
                    ),
                    type: 'success'
                  })
                }
              }
            } catch (error) {
              console.error('Error auto-generating knockout:', error)
              addToast({
                message: t(
                  'Kunne ikke generere sluttspill automatisk. Prøv å oppdatere.',
                  'Could not generate knockout automatically. Try refreshing.'
                ),
                type: 'error'
              })
            } finally {
              autoKnockoutInProgressRef.current = false
            }
          }
        } else {
          const errorData = await matchesResponse.json().catch(() => ({}))
          console.error('Error loading matches:', {
            status: matchesResponse.status,
            error: errorData,
            errorMessage: errorData.error,
            errorDetails: errorData.details,
            errorCode: errorData.code
          })
          
          // If table doesn't exist, just show empty state
          if (errorData.code === '42P01' || errorData.error?.includes('does not exist')) {
            console.warn('Matches table does not exist, showing empty state')
            setMatches([])
            setGroupStandings({})
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
  }, [tournamentId])

  useEffect(() => {
    loadData()
    
    // Auto-refresh every 10 seconds to see updated match results
    const interval = setInterval(() => {
      loadData()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [loadData])

  const calculateGroupStandings = (allMatches: Match[]): Record<string, GroupStanding[]> => {
    const standings: Record<string, Record<string, GroupStanding>> = {}

    const getHeadToHeadComparison = (teamA: string, teamB: string, groupMatches: Match[]) => {
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
    
    // Initialize standings for all teams
    allMatches.forEach(match => {
      if (match.group_name && match.round === 'Gruppespill') {
        if (!standings[match.group_name]) {
          standings[match.group_name] = {}
        }
        
        if (!standings[match.group_name][match.team1_name]) {
          standings[match.group_name][match.team1_name] = {
            team: match.team1_name,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0
          }
        }
        
        if (!standings[match.group_name][match.team2_name]) {
          standings[match.group_name][match.team2_name] = {
            team: match.team2_name,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
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

        team1.played++
        team2.played++
        team1.goalsFor += match.score1
        team1.goalsAgainst += match.score2
        team2.goalsFor += match.score2
        team2.goalsAgainst += match.score1

        if (match.score1 > match.score2) {
          team1.wins++
          team1.points += 3
          team2.losses++
        } else if (match.score2 > match.score1) {
          team2.wins++
          team2.points += 3
          team1.losses++
        } else {
          team1.draws++
          team2.draws++
          team1.points += 1
          team2.points += 1
        }
      }
    })

    // Convert to arrays and sort
    const result: Record<string, GroupStanding[]> = {}
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
        return getHeadToHeadComparison(a.team, b.team, groupMatches)
      })
    })

    return result
  }

  const buildGroupRoundMap = (groupMatchesList: Match[]): Record<string, number> => {
    const teamSet = new Set<string>()
    groupMatchesList.forEach(match => {
      teamSet.add(match.team1_name)
      teamSet.add(match.team2_name)
    })
    const teams = Array.from(teamSet).sort()
    if (teams.length < 2) return {}

    const buildKey = (teamA: string, teamB: string) => {
      return [teamA, teamB].sort().join('|')
    }

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

  const getGroupCompletionMap = (): Record<string, boolean> => {
    const map: Record<string, boolean> = {}
    const groupMatches = matches.filter(m => m.group_name && m.round === 'Gruppespill')
    groupMatches.forEach(match => {
      const groupName = match.group_name as string
      if (map[groupName] === undefined) {
        map[groupName] = true
      }
      const isComplete = match.status === 'completed' &&
        match.score1 !== undefined &&
        match.score1 !== null &&
        match.score2 !== undefined &&
        match.score2 !== null
      if (!isComplete) {
        map[groupName] = false
      }
    })
    return map
  }

  const buildSeedingPreview = () => {
    const config = getStoredMatchConfig()
    const teamsToKnockout = Math.max(1, config.teamsToKnockout || 2)
    const completionMap = getGroupCompletionMap()
    const groupNames = Object.keys(groupStandings).length > 0
      ? Object.keys(groupStandings).sort()
      : Array.from(new Set(matches.map(m => m.group_name).filter(Boolean))) as string[]
    const allGroupsComplete = groupNames.length > 0 && groupNames.every(name => completionMap[name])

    type SeedEntry = {
      label: string
      groupName?: string
      position: number
      points?: number
      goalsFor?: number
      goalsAgainst?: number
      placeholder?: boolean
    }

    const entries: SeedEntry[] = []

    for (let position = 1; position <= teamsToKnockout; position += 1) {
      const positionEntries: SeedEntry[] = groupNames.map(groupName => {
        const group = groupStandings[groupName] || []
        if (completionMap[groupName] && group[position - 1]) {
          const team = group[position - 1]
          return {
            label: team.team,
            groupName,
            position,
            points: team.points,
            goalsFor: team.goalsFor,
            goalsAgainst: team.goalsAgainst
          }
        }
        return {
          label: `Venter: ${groupName} #${position}`,
          groupName,
          position,
          placeholder: true
        }
      })

      positionEntries.sort((a, b) => {
        if (a.placeholder && !b.placeholder) return 1
        if (!a.placeholder && b.placeholder) return -1
        if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0)
        const aDiff = (a.goalsFor ?? 0) - (a.goalsAgainst ?? 0)
        const bDiff = (b.goalsFor ?? 0) - (b.goalsAgainst ?? 0)
        if (bDiff !== aDiff) return bDiff - aDiff
        return (b.goalsFor ?? 0) - (a.goalsFor ?? 0)
      })

      entries.push(...positionEntries)
    }

    if (config.useBestRunnersUp && config.numBestRunnersUp > 0) {
      if (allGroupsComplete) {
        const runnersUp = groupNames
          .map(name => groupStandings[name]?.[1])
          .filter(Boolean) as GroupStanding[]
        runnersUp
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            const aDiff = a.goalsFor - a.goalsAgainst
            const bDiff = b.goalsFor - b.goalsAgainst
            if (bDiff !== aDiff) return bDiff - aDiff
            return b.goalsFor - a.goalsFor
          })
          .slice(0, config.numBestRunnersUp)
          .forEach((team, index) => {
            entries.push({
              label: team.team,
              position: 2,
              points: team.points,
              goalsFor: team.goalsFor,
              goalsAgainst: team.goalsAgainst
            })
          })
      } else {
        for (let i = 1; i <= config.numBestRunnersUp; i += 1) {
          entries.push({
            label: `Venter: Beste 2.-plass #${i}`,
            position: 2,
            placeholder: true
          })
        }
      }
    }

    const roundName = getRoundNameForTeams(entries.filter(entry => !entry.placeholder).length || entries.length)
    const pairings = []
    for (let i = 0; i < Math.floor(entries.length / 2); i += 1) {
      pairings.push([entries[i], entries[entries.length - 1 - i]])
    }

    return { entries, pairings, roundName, allGroupsComplete }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600'
      case 'live':
        return 'bg-red-600'
      case 'scheduled':
        return 'bg-slate-600'
      case 'pending_confirmation':
        return 'bg-yellow-600'
      case 'pending_result':
        return 'bg-orange-600'
      default:
        return 'bg-slate-600'
    }
  }

  const getStatusText = (status: string, match?: Match) => {
    switch (status) {
      case 'completed':
        return t('Ferdig', 'Finished')
      case 'live':
        return 'LIVE'
      case 'scheduled':
        return t('Planlagt', 'Scheduled')
      case 'pending_confirmation':
        return t('Venter bekreftelse', 'Pending')
      case 'pending_result':
        return t('Venter resultat', 'Awaiting')
      default:
        return t('Venter', 'Waiting')
    }
  }

  const updateMatchesToLive = async (loadedMatches: Match[]): Promise<Match[]> => {
    const now = Date.now()
    const groupMatches = loadedMatches.filter(match => match.round === 'Gruppespill' && match.group_name)
    const groupedByGroup = groupMatches.reduce((acc: Record<string, Match[]>, match) => {
      const groupName = match.group_name as string
      if (!acc[groupName]) acc[groupName] = []
      acc[groupName].push(match)
      return acc
    }, {})
    const groupRoundMaps: Record<string, Record<string, number>> = {}
    Object.entries(groupedByGroup).forEach(([groupName, matches]) => {
      groupRoundMaps[groupName] = buildGroupRoundMap(matches)
    })

    const buildKey = (teamA: string, teamB: string) => [teamA, teamB].sort().join('|')
    const getGroupRound = (match: Match) => {
      if (match.group_round) return match.group_round
      if (!match.group_name) return null
      return groupRoundMaps[match.group_name]?.[buildKey(match.team1_name, match.team2_name)] || null
    }

    const isCompleted = (match: Match) => match.status === 'completed'

    const hasCompletedPreviousGroupRound = (match: Match, teamName: string) => {
      const currentRound = getGroupRound(match)
      if (!currentRound || currentRound <= 1) return true
      const previousRound = currentRound - 1
      const previousMatch = groupMatches.find(candidate => {
        if (candidate.group_name !== match.group_name) return false
        const candidateRound = getGroupRound(candidate)
        if (candidateRound !== previousRound) return false
        return candidate.team1_name === teamName || candidate.team2_name === teamName
      })
      return previousMatch ? isCompleted(previousMatch) : false
    }

    const knockoutRoundOrder = ['Sluttspill', 'Kvartfinaler', 'Semifinaler', 'Finale']
    const hasCompletedPreviousKnockoutRound = (match: Match, teamName: string) => {
      const currentIndex = knockoutRoundOrder.indexOf(match.round)
      if (currentIndex <= 0) return true
      const previousRound = knockoutRoundOrder[currentIndex - 1]
      const previousMatch = loadedMatches.find(candidate =>
        candidate.round === previousRound &&
        (candidate.team1_name === teamName || candidate.team2_name === teamName)
      )
      return previousMatch ? isCompleted(previousMatch) : false
    }

    const shouldGoLive = (match: Match) => {
      if (match.status !== 'scheduled') return false
      if (!match.scheduled_time) return false
      if (new Date(match.scheduled_time).getTime() > now) return false

      if (match.round === 'Gruppespill') {
        return (
          hasCompletedPreviousGroupRound(match, match.team1_name) &&
          hasCompletedPreviousGroupRound(match, match.team2_name)
        )
      }

      if (knockoutRoundOrder.includes(match.round)) {
        return (
          hasCompletedPreviousKnockoutRound(match, match.team1_name) &&
          hasCompletedPreviousKnockoutRound(match, match.team2_name)
        )
      }

      return false
    }

    const toUpdate = loadedMatches.filter(shouldGoLive)
    if (toUpdate.length === 0) {
      return loadedMatches
    }

    const results = await Promise.all(
      toUpdate.map(async match => {
        try {
          const response = await apiFetch('/api/matches', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: match.id, status: 'live' })
          })
          return response.ok ? match.id : null
        } catch {
          return null
        }
      })
    )

    const updatedIds = new Set(results.filter(Boolean) as string[])
    if (updatedIds.size === 0) {
      return loadedMatches
    }

    return loadedMatches.map(match =>
      updatedIds.has(match.id) ? { ...match, status: 'live' } : match
    )
  }

  const startEditing = (match: Match) => {
    setEditingMatch(match.id)
    setEditForm({
      score1: match.score1,
      score2: match.score2,
      scheduled_time: match.scheduled_time ? toLocalDatetimeLocal(match.scheduled_time) : '',
      status: match.status
    })
    setMatchLog([])
    apiFetch(`/api/match-log?match_id=${match.id}`)
      .then(r => r.json())
      .then(d => setMatchLog(d.logs || []))
      .catch(() => setMatchLog([]))
  }

  const cancelEditing = () => {
    setEditingMatch(null)
    setEditForm({})
  }

  const saveMatch = async (matchId: string) => {
    try {
      // Build request body - only include defined values
      const requestBody: any = {
        id: matchId
      }
      
      if (editForm.score1 !== undefined && editForm.score1 !== null) {
        requestBody.score1 = parseInt(editForm.score1.toString())
      }
      
      if (editForm.score2 !== undefined && editForm.score2 !== null) {
        requestBody.score2 = parseInt(editForm.score2.toString())
      }
      
      if (editForm.status) {
        requestBody.status = editForm.status
      }
      
      if (editForm.scheduled_time) {
        requestBody.scheduled_time = new Date(editForm.scheduled_time).toISOString()
      }
      
      console.log('Saving match with data:', requestBody)
      
      const response = await apiFetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Match saved successfully:', result)
        
        // Reload all data using loadData function
        await loadData()
        
        setEditingMatch(null)
        setEditForm({})
        alert(t('Kamp oppdatert!', 'Match updated!'))
      } else {
        const errorData = await response.json().catch(() => ({ error: t('Ukjent feil', 'Unknown error') }))
        console.error('Error response:', errorData)
        alert(t(`Kunne ikke oppdatere kamp: ${errorData.error || 'Ukjent feil'}`, `Could not update match: ${errorData.error || 'Unknown error'}`))
      }
    } catch (error: any) {
      console.error('Error saving match:', error)
      alert(t(`Noe gikk galt ved oppdatering av kamp: ${error.message || 'Ukjent feil'}`, `Something went wrong updating match: ${error.message || 'Unknown error'}`))
    }
  }

  const setWalkover = async (match: Match, winner: 'team1' | 'team2') => {
    const winnerName = winner === 'team1' ? match.team1_name : match.team2_name
    const loserName = winner === 'team1' ? match.team2_name : match.team1_name
    if (!confirm(t(`Sett WO 3-0 til ${winnerName}?`, `Set walkover 3-0 to ${winnerName}?`))) {
      return
    }

    const score1 = winner === 'team1' ? 3 : 0
    const score2 = winner === 'team1' ? 0 : 3

    try {
      const response = await apiFetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: match.id,
          status: 'completed',
          score1,
          score2
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t('Ukjent feil', 'Unknown error') }))
        addToast({
          message: t(
            `Kunne ikke sette WO: ${errorData.error || 'Ukjent feil'}`,
            `Could not set walkover: ${errorData.error || 'Unknown error'}`
          ),
          type: 'error'
        })
        return
      }

      addToast({
        message: t(
          `WO registrert: ${winnerName} 3-0 ${loserName}.`,
          `Walkover recorded: ${winnerName} 3-0 ${loserName}.`
        ),
        type: 'success'
      })
      await loadData()
    } catch (error) {
      console.error('Error setting walkover:', error)
      addToast({
        message: t('Noe gikk galt ved WO-registrering.', 'Something went wrong recording the walkover.'),
        type: 'error'
      })
    }
  }

  const applyBulkSchedule = async () => {
    if (!bulkScheduledTime) {
      addToast({ message: t('Velg dato og klokkeslett først.', 'Select date and time first.'), type: 'warning' })
      return
    }
    if (selectedMatchIds.size === 0) {
      addToast({ message: t('Velg minst én kamp.', 'Select at least one match.'), type: 'warning' })
      return
    }

    const scheduledTimeIso = new Date(bulkScheduledTime).toISOString()
    setIsBulkSaving(true)
    const results = await Promise.all(
      Array.from(selectedMatchIds).map(async matchId => {
        try {
          const response = await apiFetch('/api/matches', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: matchId, scheduled_time: scheduledTimeIso })
          })
          return response.ok
        } catch {
          return false
        }
      })
    )

    const failed = results.filter(ok => !ok).length

    await loadData()
    setIsBulkSaving(false)

    if (failed > 0) {
      addToast({ message: `Kunne ikke oppdatere ${failed} kamper.`, type: 'error' })
      return
    }

    addToast({ message: 'Dato og klokkeslett oppdatert for valgte kamper.', type: 'success' })
    clearSelectedMatches()
  }

  const buildMatchPairKey = (teamA: string, teamB: string) => [teamA, teamB].sort().join('|')

  const buildGroupRoundSchedule = (groupList: Match[]) => {
    const roundMap = buildGroupRoundMap(groupList)
    const byRound: Record<number, Match[]> = {}
    let skipped = 0

    groupList.forEach(match => {
      const round =
        match.group_round ?? roundMap[buildMatchPairKey(match.team1_name, match.team2_name)] ?? null
      if (!round) {
        skipped += 1
        return
      }
      if (!byRound[round]) byRound[round] = []
      byRound[round].push(match)
    })

    return { byRound, skipped, roundMap }
  }

  const applyRoundBasedSchedule = async () => {
    if (!roundScheduleStart) {
      addToast({ message: t('Velg starttid for runde 1.', 'Select start time for round 1.'), type: 'warning' })
      return
    }

    const intervalMin = parseInt(roundScheduleInterval, 10)
    if (!Number.isFinite(intervalMin) || intervalMin < 1) {
      addToast({
        message: t('Angi minutter mellom runder (minst 1).', 'Set minutes between rounds (at least 1).'),
        type: 'warning'
      })
      return
    }

    const groupList = matches.filter(m => m.round === 'Gruppespill')
    if (groupList.length === 0) {
      addToast({ message: t('Ingen gruppespillkamper å planlegge.', 'No group stage matches to schedule.'), type: 'warning' })
      return
    }

    const groupedByName = groupList.reduce((acc: Record<string, Match[]>, match) => {
      const group = match.group_name || t('Ukjent gruppe', 'Unknown group')
      if (!acc[group]) acc[group] = []
      acc[group].push(match)
      return acc
    }, {})

    const startMs = new Date(roundScheduleStart).getTime()
    if (Number.isNaN(startMs)) {
      addToast({ message: t('Ugyldig starttid.', 'Invalid start time.'), type: 'warning' })
      return
    }

    const updates: Array<{ id: string; scheduled_time: string }> = []
    let skipped = 0
    const roundCounts: Record<number, number> = {}

    Object.values(groupedByName).forEach(groupMatchesList => {
      const { byRound, skipped: groupSkipped } = buildGroupRoundSchedule(groupMatchesList)
      skipped += groupSkipped
      Object.entries(byRound).forEach(([roundStr, roundMatches]) => {
        const round = Number(roundStr)
        const scheduledTime = new Date(startMs + (round - 1) * intervalMin * 60_000).toISOString()
        roundCounts[round] = (roundCounts[round] || 0) + roundMatches.length
        roundMatches.forEach(match => {
          updates.push({ id: match.id, scheduled_time: scheduledTime })
        })
      })
    })

    if (updates.length === 0) {
      addToast({
        message: t(
          'Fant ingen kamper med runde. Kjør «Oppdater» eller sjekk feilsøking.',
          'No matches with a round found. Try Refresh or check diagnostics.'
        ),
        type: 'warning'
      })
      return
    }

    setIsBulkSaving(true)
    const results = await Promise.all(
      updates.map(async update => {
        try {
          const response = await apiFetch('/api/matches', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update)
          })
          return response.ok
        } catch {
          return false
        }
      })
    )

    const failed = results.filter(ok => !ok).length
    await loadData()
    setIsBulkSaving(false)

    if (failed > 0) {
      addToast({
        message: t(`Kunne ikke oppdatere ${failed} av ${updates.length} kamper.`, `Could not update ${failed} of ${updates.length} matches.`),
        type: 'error'
      })
      return
    }

    const roundSummary = Object.keys(roundCounts)
      .map(Number)
      .sort((a, b) => a - b)
      .map(round => `R${round}: ${roundCounts[round]}`)
      .join(', ')

    addToast({
      message: t(
        `Planla ${updates.length} gruppespillkamper (${roundSummary})${skipped > 0 ? ` · ${skipped} uten runde` : ''}.`,
        `Scheduled ${updates.length} group matches (${roundSummary})${skipped > 0 ? ` · ${skipped} without round` : ''}.`
      ),
      type: 'success'
    })
  }

  const groupMatches = matches.filter(m => m.round === 'Gruppespill')
  const knockoutMatches = matches.filter(m => m.round !== 'Gruppespill')

  const roundSchedulePreview = useMemo(() => {
    if (!roundScheduleStart || groupMatches.length === 0) return null

    const intervalMin = parseInt(roundScheduleInterval, 10)
    if (!Number.isFinite(intervalMin) || intervalMin < 1) return null

    const startMs = new Date(roundScheduleStart).getTime()
    if (Number.isNaN(startMs)) return null

    const groupedByName = groupMatches.reduce((acc: Record<string, Match[]>, match) => {
      const group = match.group_name || 'Ukjent'
      if (!acc[group]) acc[group] = []
      acc[group].push(match)
      return acc
    }, {})

    const roundCounts: Record<number, number> = {}
    let skipped = 0

    Object.values(groupedByName).forEach(groupMatchesList => {
      const { byRound, skipped: groupSkipped } = buildGroupRoundSchedule(groupMatchesList)
      skipped += groupSkipped
      Object.entries(byRound).forEach(([roundStr, roundMatches]) => {
        const round = Number(roundStr)
        roundCounts[round] = (roundCounts[round] || 0) + roundMatches.length
      })
    })

    const rounds = Object.keys(roundCounts).map(Number).sort((a, b) => a - b)
    if (rounds.length === 0) return null

    const maxRound = rounds[rounds.length - 1]
    const total = Object.values(roundCounts).reduce((sum, n) => sum + n, 0)
    const lastStart = new Date(startMs + (maxRound - 1) * intervalMin * 60_000)

    return { rounds, roundCounts, total, skipped, maxRound, lastStart, intervalMin }
  }, [groupMatches, roundScheduleStart, roundScheduleInterval])

  const scheduleDiagnostics = (() => {
    const missingGroupRound = groupMatches.filter(m => m.group_round === null || m.group_round === undefined)
    const duplicates: Array<{ group: string; round: string; team: string; matchIds: string[] }> = []
    const map: Record<string, Record<string, Record<string, string[]>>> = {}

    groupMatches.forEach(match => {
      const group = match.group_name || 'Ukjent gruppe'
      const round = match.group_round !== null && match.group_round !== undefined
        ? `Runde ${match.group_round}`
        : 'Ukjent runde'

      if (!map[group]) map[group] = {}
      if (!map[group][round]) map[group][round] = {}

      const addTeam = (team: string) => {
        if (!map[group][round][team]) map[group][round][team] = []
        map[group][round][team].push(match.id)
      }

      addTeam(match.team1_name)
      addTeam(match.team2_name)
    })

    Object.entries(map).forEach(([group, rounds]) => {
      Object.entries(rounds).forEach(([round, teams]) => {
        Object.entries(teams).forEach(([team, matchIds]) => {
          if (matchIds.length > 1) {
            duplicates.push({ group, round, team, matchIds })
          }
        })
      })
    })

    return { missingGroupRound, duplicates }
  })()
  
  // Check if all group stage matches are completed
  const allGroupMatchesCompleted = groupMatches.length > 0 && 
    groupMatches.every(m => m.status === 'completed')
  
  // Only show knockout matches if group stage is complete or if there are no group matches
  const shouldShowKnockout = groupMatches.length === 0 || allGroupMatchesCompleted
  const attentionItems = useMemo(
    () =>
      buildAttentionItems(
        matches.map(m => ({
          id: m.id,
          tournament_id: tournamentId,
          team1_name: m.team1_name,
          team2_name: m.team2_name,
          status: m.status,
          scheduled_time: m.scheduled_time,
          team1_submitted_score1: m.team1_submitted_score1,
          team1_submitted_score2: m.team1_submitted_score2,
          team2_submitted_score1: m.team2_submitted_score1,
          team2_submitted_score2: m.team2_submitted_score2
        }))
      ),
    [matches, tournamentId]
  )

  const attentionMatchIds = useMemo(
    () => new Set(attentionItems.map(item => item.matchId)),
    [attentionItems]
  )

  const matchStats = useMemo(() => {
    const completed = matches.filter(m => m.status === 'completed').length
    const live = matches.filter(m => m.status === 'live').length
    const pending = matches.filter(
      m => m.status === 'pending_confirmation' || m.status === 'pending_result'
    ).length
    return {
      total: matches.length,
      completed,
      live,
      pending,
      attention: attentionItems.length,
      progress: matches.length ? Math.round((completed / matches.length) * 100) : 0
    }
  }, [matches, attentionItems.length])

  const passesMatchFilter = (match: Match) => {
    if (matchFilter === 'all') return true
    if (matchFilter === 'live') return match.status === 'live'
    if (matchFilter === 'pending') {
      return match.status === 'pending_confirmation' || match.status === 'pending_result'
    }
    if (matchFilter === 'attention') return attentionMatchIds.has(match.id)
    return true
  }

  const renderMatchCards = (matchList: Match[], getMetaLine?: (match: Match) => string | null) => (
    <div className="divide-y divide-slate-700/50 rounded border border-slate-700/40 overflow-hidden">
      {matchList.filter(passesMatchFilter).map(match => (
        <AdminMatchCard
          key={match.id}
          match={match}
          metaLine={getMetaLine ? getMetaLine(match) : null}
          teamDiscordByName={teamDiscordByName}
          isEditing={editingMatch === match.id}
          editForm={editForm}
          setEditForm={setEditForm}
          selected={selectedMatchIds.has(match.id)}
          onToggleSelect={() => toggleMatchSelection(match.id)}
          onStartEdit={() => startEditing(match)}
          onSave={() => saveMatch(match.id)}
          onCancel={cancelEditing}
          onWalkover={winner => setWalkover(match, winner)}
          matchLog={editingMatch === match.id ? matchLog : []}
          locale={locale}
          isEnglish={isEnglish}
          getStatusColor={getStatusColor}
          getStatusLabel={(status) => getStatusText(status)}
        />
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{t('Turnering ikke funnet', 'Tournament not found')}</p>
          <Link href="/admin" className="pro11-button">{t('Tilbake til admin', 'Back to admin')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* Header */}
      <header className="pro11-card mx-4 mt-4 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link href="/admin" className="pro11-button-secondary text-sm flex items-center space-x-2 shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span>{t('Tilbake', 'Back')}</span>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl lg:text-2xl font-bold truncate" title={tournament.title}>{tournament.title}</h1>
              <p className="text-slate-400 text-sm">
                {new Date(tournament.start_date).toLocaleDateString(locale, { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <Link
              href={`/admin/live?tournament=${tournamentId}`}
              className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{t('Live-senter', 'Live center')}</span>
              {matchStats.attention > 0 && (
                <span className="text-orange-400">({matchStats.attention})</span>
              )}
            </Link>
            <button onClick={loadData} className="pro11-button-secondary text-sm flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>{t('Oppdater', 'Refresh')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        {(scheduleDiagnostics.missingGroupRound.length > 0 || scheduleDiagnostics.duplicates.length > 0) && (
          <div className="pro11-card p-4 mb-6 border border-orange-500/40 bg-orange-900/10">
            <h2 className="text-lg font-semibold text-orange-300 mb-2">{t('Feilsøking: kampprogram', 'Diagnostics: match schedule')}</h2>
            {scheduleDiagnostics.missingGroupRound.length > 0 && (
              <p className="text-sm text-orange-200">
                {t(
                  `Mangler \`group_round\` på ${scheduleDiagnostics.missingGroupRound.length} gruppespill‑kamper.`,
                  `Missing \`group_round\` for ${scheduleDiagnostics.missingGroupRound.length} group stage matches.`
                )}
              </p>
            )}
            {scheduleDiagnostics.duplicates.length > 0 && (
              <div className="mt-2 text-sm text-orange-200 space-y-1">
                {scheduleDiagnostics.duplicates.map(item => (
                  <div key={`${item.group}-${item.round}-${item.team}`}>
                    {item.group} • {item.round}: {t(
                      `${item.team} har flere kamper (ID: ${item.matchIds.join(', ')})`,
                      `${item.team} has multiple matches (ID: ${item.matchIds.join(', ')})`
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {matches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 text-xs">
            <h2 className="text-base font-bold text-slate-100 mr-1">{t('Kamper', 'Matches')}</h2>
            <span className="text-slate-500">
              {matchStats.completed}/{matchStats.total} · {matchStats.progress}%
            </span>
            <select
              value={matchFilter}
              onChange={e => setMatchFilter(e.target.value as typeof matchFilter)}
              className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200"
            >
              <option value="all">{t('Alle', 'All')} ({matchStats.total})</option>
              <option value="attention">{t('Handling', 'Action')} ({matchStats.attention})</option>
              <option value="live">LIVE ({matchStats.live})</option>
              <option value="pending">{t('Venter', 'Pending')} ({matchStats.pending})</option>
            </select>
            {!showBulkTool && (
              <button onClick={() => setShowBulkTool(true)} className="pro11-button-secondary text-xs px-2 py-1">
                {t('Planlegg', 'Schedule')}
              </button>
            )}
          </div>
        )}

        {showBulkTool && (
          <div className="pro11-card p-3 mb-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-2">
                {t('Planlegg gruppespill etter runde', 'Schedule group stage by round')}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                  {t('Start runde 1', 'Round 1 start')}
                  <input
                    type="datetime-local"
                    lang={isEnglish ? 'en' : 'no'}
                    value={roundScheduleStart}
                    onChange={e => setRoundScheduleStart(e.target.value)}
                    className="px-2 py-1 bg-slate-700 rounded text-xs"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                  {t('Min mellom runder', 'Min between rounds')}
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={roundScheduleInterval}
                    onChange={e => setRoundScheduleInterval(e.target.value)}
                    className="w-16 px-2 py-1 bg-slate-700 rounded text-xs text-center"
                  />
                </label>
                <button
                  onClick={applyRoundBasedSchedule}
                  disabled={isBulkSaving || groupMatches.length === 0}
                  className="pro11-button text-xs px-3 py-1.5"
                >
                  {isBulkSaving
                    ? t('Planlegger...', 'Scheduling...')
                    : t(`Generer (${groupMatches.length})`, `Generate (${groupMatches.length})`)}
                </button>
              </div>
              {roundSchedulePreview && (
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  {roundSchedulePreview.rounds.map(round => {
                    const start = new Date(
                      new Date(roundScheduleStart).getTime() +
                        (round - 1) * roundSchedulePreview.intervalMin * 60_000
                    )
                    return `R${round}: ${roundSchedulePreview.roundCounts[round]} ${t('kamper', 'matches')} ${start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
                  }).join(' · ')}
                  {roundSchedulePreview.skipped > 0 && (
                    <span className="text-orange-400">
                      {' '}
                      · {roundSchedulePreview.skipped} {t('uten runde', 'without round')}
                    </span>
                  )}
                </p>
              )}
            </div>

            <details className="text-xs text-slate-400">
              <summary className="cursor-pointer hover:text-slate-300 select-none">
                {t('Manuell tid på valgte kamper', 'Manual time for selected matches')}
              </summary>
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-700/50">
                <input
                  type="datetime-local"
                  lang={isEnglish ? 'en' : 'no'}
                  value={bulkScheduledTime}
                  onChange={(e) => setBulkScheduledTime(e.target.value)}
                  className="px-2 py-1 bg-slate-700 rounded text-xs"
                />
                <button
                  onClick={applyBulkSchedule}
                  disabled={isBulkSaving}
                  className="pro11-button-secondary text-xs px-2 py-1"
                >
                  {isBulkSaving
                    ? t('Oppdaterer...', 'Updating...')
                    : t(`Oppdater valgte (${selectedMatchIds.size})`, `Update selected (${selectedMatchIds.size})`)}
                </button>
                <button onClick={() => selectMatches(groupMatches.map(match => match.id))} className="pro11-button-secondary text-xs px-2 py-1">
                  {t('Velg gruppespill', 'Select groups')}
                </button>
                <button onClick={clearSelectedMatches} className="pro11-button-secondary text-xs px-2 py-1">
                  {t('Tøm', 'Clear')}
                </button>
              </div>
            </details>

            <button onClick={() => setShowBulkTool(false)} className="text-xs text-slate-400 hover:text-slate-200">
              {t('Lukk', 'Close')}
            </button>
          </div>
        )}

        {/* Group Stage Matches */}
        {groupMatches.length > 0 && (
          <div className="mb-5">
            <div className="pro11-card p-2 sm:p-3">
              <div className="space-y-4">
                {Object.entries(
                  groupMatches.reduce((acc, match) => {
                    const group = match.group_name || t('Ukjent gruppe', 'Unknown group')
                    if (!acc[group]) acc[group] = []
                    acc[group].push(match)
                    return acc
                  }, {} as Record<string, Match[]>)
                ).map(([groupName, groupMatchesList]) => {
                  const roundMap = buildGroupRoundMap(groupMatchesList)
                  const buildKey = (teamA: string, teamB: string) => [teamA, teamB].sort().join('|')
                  const sortedGroupMatches = [...groupMatchesList].sort((a, b) => {
                    const roundA = a.group_round || roundMap[buildKey(a.team1_name, a.team2_name)] || 999
                    const roundB = b.group_round || roundMap[buildKey(b.team1_name, b.team2_name)] || 999
                    if (roundA !== roundB) return roundA - roundB
                    const timeA = a.scheduled_time ? new Date(a.scheduled_time).getTime() : 0
                    const timeB = b.scheduled_time ? new Date(b.scheduled_time).getTime() : 0
                    if (timeA !== timeB) return timeA - timeB
                    return a.team1_name.localeCompare(b.team1_name)
                  })
                  const visibleMatches = sortedGroupMatches.filter(passesMatchFilter)
                  if (visibleMatches.length === 0) return null

                  return (
                    <div key={groupName}>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 px-1">
                        {groupName}
                      </h3>
                      {renderMatchCards(sortedGroupMatches, match => {
                        const round =
                          match.group_round || roundMap[buildKey(match.team1_name, match.team2_name)]
                        const parts = [
                          round ? `R${round}` : null,
                          match.scheduled_time
                            ? new Date(match.scheduled_time).toLocaleTimeString(locale, {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : null
                        ].filter(Boolean)
                        return parts.length > 0 ? parts.join(' • ') : null
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

            {/* Knockout Stage Matches */}
            {knockoutMatches.length > 0 && (
              <div className="mb-5">
                {!shouldShowKnockout && groupMatches.length > 0 ? (
                  <div className="pro11-card p-3 mb-3 bg-yellow-900/20 border border-yellow-600/30 text-sm">
                    <p className="text-yellow-400">
                      {t('Sluttspill vises når gruppespill er ferdig.', 'Knockout shows when groups are done.')}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      {groupMatches.filter(m => m.status === 'completed').length}/{groupMatches.length}
                    </p>
                  </div>
                ) : shouldShowKnockout ? (
            <div className="pro11-card p-2 sm:p-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                {t('Sluttspill', 'Knockout')}
              </h3>
              <div className="space-y-4">
                {Object.entries(
                  knockoutMatches.reduce((acc, match) => {
                    const round = match.round || t('Ukjent runde', 'Unknown round')
                    if (!acc[round]) acc[round] = []
                    acc[round].push(match)
                    return acc
                  }, {} as Record<string, Match[]>)
                ).map(([roundName, roundMatches]) => {
                  const visibleMatches = roundMatches.filter(passesMatchFilter)
                  if (visibleMatches.length === 0) return null

                  return (
                    <div key={roundName}>
                      <h3 className="text-xs font-semibold text-slate-400 mb-1 px-1">{roundName}</h3>
                      {renderMatchCards(roundMatches, match =>
                        match.scheduled_time
                          ? new Date(match.scheduled_time).toLocaleTimeString(locale, {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : null
                      )}
                    </div>
                  )
                })}
              </div>
              </div>
                ) : null}
              </div>
            )}

        {Object.keys(groupStandings).length > 0 && (
          <details className="mb-6 group">
            <summary className="text-sm font-semibold text-slate-400 cursor-pointer hover:text-slate-300 mb-2 list-none flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              {t('Gruppespill - tabeller', 'Group standings')}
            </summary>
            <div className="grid md:grid-cols-2 gap-3 mt-2">
              {Object.entries(groupStandings).map(([groupName, standings]) => (
                <div key={groupName} className="pro11-card p-3">
                  <h3 className="text-xs font-semibold text-slate-400 mb-2">{groupName}</h3>
                  <GroupStandingsTable rows={standings} isEnglish={isEnglish} />
                </div>
              ))}
            </div>
          </details>
        )}

        {matches.length === 0 && (
          <div className="pro11-card p-8 text-center">
            <p className="text-slate-400 mb-2">{t('Ingen kamper er generert for denne turneringen ennå.', 'No matches have been generated for this tournament yet.')}</p>
            <p className="text-slate-500 text-sm mb-4">Tournament ID: {tournamentId}</p>
            <div className="flex gap-4 justify-center mt-4">
              <button
                onClick={async () => {
                  setIsLoading(true)
                  try {
                    const matchesResponse = await apiFetch(`/api/matches?tournament_id=${tournamentId}`)
                    if (matchesResponse.ok) {
                      const matchesData = await matchesResponse.json()
                      setMatches(matchesData.matches || [])
                      if (matchesData.matches && matchesData.matches.length > 0) {
                        const standings = calculateGroupStandings(matchesData.matches)
                        setGroupStandings(standings)
                      }
                    }
                  } catch (error) {
                    console.error('Error refreshing matches:', error)
                  } finally {
                    setIsLoading(false)
                  }
                }}
                className="pro11-button-secondary"
              >
                {t('Oppdater kamper', 'Refresh matches')}
              </button>
              <Link href="/admin" className="pro11-button">
                {t('Gå til admin panel', 'Go to admin panel')}
              </Link>
            </div>
          </div>
        )}
        {Object.keys(groupStandings).length > 0 && (() => {
          const preview = buildSeedingPreview()
          return (
            <div className="pro11-card p-4 mt-8 max-w-2xl w-full mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{t('Seeding (foreløpig)', 'Seeding (preview)')}</h2>
                  <p className="text-slate-400 text-sm">
                    {preview.allGroupsComplete
                      ? t(`Klar for sluttspill: ${preview.roundName}`, `Ready for knockout: ${preview.roundName}`)
                      : t('Oppdateres fortløpende når gruppene ferdigspilles.', 'Updates continuously as groups finish.')}
                  </p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Seeds</h3>
                  <div className="space-y-2">
                    {preview.entries.map((entry, index) => (
                      <div
                        key={`${entry.label}-${index}`}
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                          entry.placeholder ? 'bg-slate-800/40 text-slate-400' : 'bg-slate-800/70 text-slate-200'
                        }`}
                      >
                        <span className="font-semibold w-10">#{index + 1}</span>
                        <span className="flex-1">{entry.label}</span>
                        {!entry.placeholder && entry.points !== undefined && (
                          <span className="text-xs text-slate-400">
                            {entry.points}p
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">{t('Matchups (seedet)', 'Matchups (seeded)')}</h3>
                  <div className="space-y-2">
                    {preview.pairings.length > 0 ? (
                      preview.pairings.map((pair, index) => (
                        <div key={`pair-${index}`} className="rounded-md border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                          <div className="flex items-center justify-between">
                            <span>{pair[0].label}</span>
                            <span className="text-slate-500">vs</span>
                            <span>{pair[1].label}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-400">{t('Ingen matchups ennå.', 'No matchups yet.')}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </main>
    </div>
  )
}

