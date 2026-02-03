'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Trophy, Users, Calendar, Edit, Save, X, RefreshCw, Wrench } from 'lucide-react'
import { ToastContainer } from '@/components/Toast'
import type { ToastType } from '@/components/Toast'
import { useLanguage } from '@/components/LanguageProvider'

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
  const [isBulkSaving, setIsBulkSaving] = useState(false)
  const [showBulkTool, setShowBulkTool] = useState(true)
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

  const getRoundNameForTeams = (numTeams: number): string => {
    if (numTeams === 2) return t('Finale', 'Final')
    if (numTeams === 4) return t('Semifinaler', 'Semifinals')
    if (numTeams === 8) return t('Kvartfinaler', 'Quarterfinals')
    if (numTeams > 8) return t('Kvartfinaler', 'Quarterfinals')
    if (numTeams > 4) return t('Semifinaler', 'Semifinals')
    return t('Sluttspill', 'Knockout')
  }

  const generateSeededBracket = (teams: string[], roundName: string) => {
    const matchesToCreate: any[] = []
    for (let i = 0; i < Math.floor(teams.length / 2); i++) {
      const highSeed = teams[i]
      const lowSeed = teams[teams.length - 1 - i]
      if (highSeed && lowSeed && highSeed !== lowSeed) {
        matchesToCreate.push({
          tournament_id: tournamentId,
          team1_name: highSeed,
          team2_name: lowSeed,
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
        const response = await fetch('/api/matches', {
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

  const runGroupRoundBackfill = async () => {
    groupRoundBackfillRef.current = false
    await backfillGroupRounds(matches)
    await loadData()
  }

  const loadData = useCallback(async () => {
      if (!tournamentId) {
        console.error('No tournament ID provided')
        setIsLoading(false)
        return
      }

      console.log('Loading data for tournament:', tournamentId)
      
      try {
        // Load tournament
        const tournamentResponse = await fetch(`/api/tournaments?id=${tournamentId}`)
        console.log('Tournament API response status:', tournamentResponse.status)
        if (tournamentResponse.ok) {
          const tournamentData = await tournamentResponse.json()
          console.log('Tournament data received:', tournamentData)
          if (tournamentData.tournament) {
            setTournament(tournamentData.tournament)
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
        const matchesResponse = await fetch(matchesUrl)
        console.log('Matches API response status:', matchesResponse.status)
        
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

              const qualifiers: Array<GroupStanding & { position: number }> = []
              Object.values(standings).forEach(groupStandings => {
                groupStandings.slice(0, teamsToKnockout).forEach((team, index) => {
                  qualifiers.push({ ...team, position: index + 1 })
                })
              })

              if (config.useBestRunnersUp && config.numBestRunnersUp > 0) {
                const runnersUp = Object.values(standings)
                  .map(group => group[1])
                  .filter(Boolean)
                  .sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points
                    const aDiff = a.goalsFor - a.goalsAgainst
                    const bDiff = b.goalsFor - b.goalsAgainst
                    if (bDiff !== aDiff) return bDiff - aDiff
                    return b.goalsFor - a.goalsFor
                  })

                const extraTeams = runnersUp.slice(0, config.numBestRunnersUp)
                extraTeams.forEach(team => {
                  if (!qualifiers.some(q => q.team === team.team)) {
                    qualifiers.push({ ...team, position: 2 })
                  }
                })
              }

              if (qualifiers.length >= 2) {
                const rankedTeams = [...qualifiers].sort((a, b) => {
                  if (a.position !== b.position) return a.position - b.position
                  if (b.points !== a.points) return b.points - a.points
                  const aDiff = a.goalsFor - a.goalsAgainst
                  const bDiff = b.goalsFor - b.goalsAgainst
                  if (bDiff !== aDiff) return bDiff - aDiff
                  return b.goalsFor - a.goalsFor
                })

                const teamNames = rankedTeams.map(team => team.team)
                const roundName = getRoundNameForTeams(teamNames.length)
                const matchesToCreate = generateSeededBracket(teamNames, roundName)

                if (matchesToCreate.length > 0) {
                  const insertPromises = matchesToCreate.map(async (match) => {
                    const response = await fetch('/api/matches', {
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
                  addToast({
                    message: t(
                      `Sluttspill generert automatisk: ${roundName} (${matchesToCreate.length} kamper).`,
                      `Knockout generated automatically: ${roundName} (${matchesToCreate.length} matches).`
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
        return 'bg-orange-600'
      case 'pending_result':
        return 'bg-yellow-600'
      default:
        return 'bg-yellow-600'
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
        if (match?.submitted_by) {
          return t(`Venter bekreftelse (${match.submitted_by})`, `Waiting for confirmation (${match.submitted_by})`)
        }
        return t('Venter bekreftelse', 'Waiting for confirmation')
      case 'pending_result':
        return t('Venter resultat', 'Waiting for result')
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
          const response = await fetch('/api/matches', {
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
      scheduled_time: match.scheduled_time ? new Date(match.scheduled_time).toISOString().slice(0, 16) : '',
      status: match.status
    })
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
      
      const response = await fetch('/api/matches', {
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
      const response = await fetch('/api/matches', {
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
          const response = await fetch('/api/matches', {
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

  const groupMatches = matches.filter(m => m.round === 'Gruppespill')
  const knockoutMatches = matches.filter(m => m.round !== 'Gruppespill')

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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="pro11-button-secondary flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>{t('Tilbake', 'Back')}</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{tournament.title}</h1>
              <p className="text-slate-400 text-sm">
                {new Date(tournament.start_date).toLocaleDateString(locale, { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={loadData} className="pro11-button-secondary flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>{t('Oppdater', 'Refresh')}</span>
            </button>
            <button
              onClick={runGroupRoundBackfill}
              className="pro11-button-secondary flex items-center space-x-2"
              title={t('Oppdater manglende runder for gruppespill', 'Update missing rounds for group stage')}
            >
              <Wrench className="w-4 h-4" />
              <span>{t('Fiks runder', 'Fix rounds')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
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
        {/* Group Stage Standings */}
        {Object.keys(groupStandings).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>{t('Gruppespill - Tabeller', 'Group stage - Standings')}</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(groupStandings).map(([groupName, standings]) => (
                <div key={groupName} className="pro11-card p-4">
                  <h3 className="font-semibold mb-3 text-lg">{groupName}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 px-2">{t('Lag', 'Team')}</th>
                          <th className="text-center py-2 px-2">{t('K', 'P')}</th>
                          <th className="text-center py-2 px-2">{t('S', 'W')}</th>
                          <th className="text-center py-2 px-2">{t('U', 'D')}</th>
                          <th className="text-center py-2 px-2">{t('T', 'L')}</th>
                          <th className="text-center py-2 px-2">{t('M+', 'GF')}</th>
                          <th className="text-center py-2 px-2">{t('M-', 'GA')}</th>
                          <th className="text-center py-2 px-2 font-bold">{t('P', 'Pts')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((standing, index) => (
                          <tr 
                            key={standing.team} 
                            className={`border-b border-slate-700/50 ${
                              index < 2 ? 'bg-green-900/20' : ''
                            }`}
                          >
                            <td className="py-2 px-2 font-medium">{standing.team}</td>
                            <td className="text-center py-2 px-2">{standing.played}</td>
                            <td className="text-center py-2 px-2 text-green-400">{standing.wins}</td>
                            <td className="text-center py-2 px-2 text-yellow-400">{standing.draws}</td>
                            <td className="text-center py-2 px-2 text-red-400">{standing.losses}</td>
                            <td className="text-center py-2 px-2">{standing.goalsFor}</td>
                            <td className="text-center py-2 px-2">{standing.goalsAgainst}</td>
                            <td className="text-center py-2 px-2 font-bold text-blue-400">{standing.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {showBulkTool && (
          <div className="pro11-card p-4 mb-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{t('Bulk dato/klokkeslett', 'Bulk date/time')}</h2>
                <p className="text-sm text-slate-400">
                  {t('Velg kamper i listene under, sett tid og oppdater flere samtidig.', 'Select matches below, set time, and update multiple at once.')}
                </p>
              </div>
              <button
                onClick={() => setShowBulkTool(false)}
                className="pro11-button-secondary text-sm"
              >
                {t('Skjul', 'Hide')}
              </button>
            </div>
            <>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="datetime-local"
                  lang={isEnglish ? 'en' : 'no'}
                  value={bulkScheduledTime}
                  onChange={(e) => setBulkScheduledTime(e.target.value)}
                  className="px-3 py-2 bg-slate-700 rounded text-sm"
                />
                <button
                  onClick={applyBulkSchedule}
                  disabled={isBulkSaving}
                  className="pro11-button-secondary text-sm"
                >
                  {isBulkSaving
                    ? t('Oppdaterer...', 'Updating...')
                    : t(`Oppdater valgte (${selectedMatchIds.size})`, `Update selected (${selectedMatchIds.size})`)}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => selectMatches(groupMatches.map(match => match.id))}
                  className="pro11-button-secondary text-xs"
                >
                  {t('Velg alle gruppespill', 'Select all group stage')}
                </button>
                <button
                  onClick={() => selectMatches(knockoutMatches.map(match => match.id))}
                  className="pro11-button-secondary text-xs"
                >
                  {t('Velg alle sluttspill', 'Select all knockout')}
                </button>
                <button
                  onClick={clearSelectedMatches}
                  className="pro11-button-secondary text-xs"
                >
                  {t('Tøm utvalg', 'Clear selection')}
                </button>
              </div>
            </>
          </div>
        )}

        {/* Group Stage Matches */}
        {groupMatches.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-xl font-bold flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>{t('Gruppespill - Kamper', 'Group stage - Matches')}</span>
              </h2>
              {!showBulkTool && (
                <button
                  onClick={() => setShowBulkTool(true)}
                  className="pro11-button-secondary text-xs"
                >
                  {t('Vis bulk', 'Show bulk')}
                </button>
              )}
            </div>
            <div className="pro11-card p-4">
              <div className="space-y-3">
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
                  return (
                  <div key={groupName} className="mb-6">
                    <h3 className="font-semibold mb-3 text-lg">{groupName}</h3>
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                      <table className="w-max min-w-full text-sm table-fixed">
                        <thead className="text-xs text-slate-400">
                          <tr>
                            <th className="py-2 px-2 text-left w-10">{t('Velg', 'Select')}</th>
                            <th className="py-2 pr-3 text-right w-48">{t('Lag 1', 'Team 1')}</th>
                            <th className="py-2 px-2 text-center w-12">Score</th>
                            <th className="py-2 px-2 text-center w-10">vs</th>
                            <th className="py-2 px-2 text-center w-12">Score</th>
                            <th className="py-2 pl-3 text-left w-48">{t('Lag 2', 'Team 2')}</th>
                            <th className="py-2 px-2 text-left w-64">Innsendt</th>
                            <th className="py-2 px-2 text-left w-32">Info</th>
                            <th className="py-2 px-2 text-left w-28">Status</th>
                            <th className="py-2 px-2 text-left w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedGroupMatches.map(match => {
                            const showFinalScore = match.status === 'completed' && match.score1 !== undefined && match.score2 !== undefined
                            const hasSubmittedScores = match.team1_submitted_score1 !== null || match.team2_submitted_score1 !== null
                            const submittedMismatch = match.team1_submitted_score1 !== null && match.team2_submitted_score1 !== null && 
                              (match.team1_submitted_score1 !== match.team2_submitted_score2 || match.team1_submitted_score2 !== match.team2_submitted_score1)
                            const submittedText = hasSubmittedScores
                              ? `${match.team1_name}: ${match.team1_submitted_score1 ?? '-'}-${match.team1_submitted_score2 ?? '-'} | ${match.team2_name}: ${match.team2_submitted_score1 ?? '-'}-${match.team2_submitted_score2 ?? '-'}${submittedMismatch ? ' ⚠' : ''}`
                              : '-'
                            const infoText = [
                              (match.group_round || roundMap[buildKey(match.team1_name, match.team2_name)]) ? `Runde ${match.group_round || roundMap[buildKey(match.team1_name, match.team2_name)]}` : null,
                              match.scheduled_time ? new Date(match.scheduled_time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : null
                            ].filter(Boolean).join(' • ')

                            return (
                              <tr key={match.id} className="border-b border-slate-700/50 bg-slate-800/50">
                                {editingMatch === match.id ? (
                                  <>
                                    <td className="py-3 px-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedMatchIds.has(match.id)}
                                        onChange={() => toggleMatchSelection(match.id)}
                                        className="h-4 w-4"
                                      />
                                    </td>
                                    <td className="py-3 pr-3 text-right font-medium truncate max-w-[12rem]" title={match.team1_name}>{match.team1_name}</td>
                                    <td className="py-3 px-2">
                                      <input
                                        type="number"
                                        min="0"
                                        value={editForm.score1 ?? ''}
                                        onChange={(e) => setEditForm({ ...editForm, score1: parseInt(e.target.value) || 0 })}
                                        className="w-12 px-2 py-1 bg-slate-700 rounded text-center"
                                        placeholder="0"
                                      />
                                    </td>
                                    <td className="py-3 px-2 text-center text-slate-500">vs</td>
                                    <td className="py-3 px-2">
                                      <input
                                        type="number"
                                        min="0"
                                        value={editForm.score2 ?? ''}
                                        onChange={(e) => setEditForm({ ...editForm, score2: parseInt(e.target.value) || 0 })}
                                        className="w-12 px-2 py-1 bg-slate-700 rounded text-center"
                                        placeholder="0"
                                      />
                                    </td>
                                    <td className="py-3 pl-3 font-medium truncate max-w-[12rem]" title={match.team2_name}>{match.team2_name}</td>
                                    <td className="py-3 px-2 text-xs text-slate-400">-</td>
                                    <td className="py-3 px-2">
                                      <input
                                        type="datetime-local"
                                        lang="no"
                                        value={editForm.scheduled_time || ''}
                                        onChange={(e) => setEditForm({ ...editForm, scheduled_time: e.target.value })}
                                        className="px-2 py-1 bg-slate-700 rounded text-sm w-full"
                                      />
                                    </td>
                                    <td className="py-3 px-2">
                                      <select
                                        value={editForm.status || 'scheduled'}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="px-2 py-1 bg-slate-700 rounded text-sm w-full"
                                      >
                                        <option value="scheduled">{t('Planlagt', 'Scheduled')}</option>
                                        <option value="live">LIVE</option>
                                        <option value="completed">{t('Ferdig', 'Finished')}</option>
                                      </select>
                                    </td>
                                    <td className="py-3 px-2">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => saveMatch(match.id)}
                                          className="text-green-400 hover:text-green-300"
                                          title={t('Lagre', 'Save')}
                                        >
                                          <Save className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={cancelEditing}
                                          className="text-red-400 hover:text-red-300"
                                          title={t('Avbryt', 'Cancel')}
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-3 px-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedMatchIds.has(match.id)}
                                        onChange={() => toggleMatchSelection(match.id)}
                                        className="h-4 w-4"
                                      />
                                    </td>
                                    <td className="py-3 pr-3 text-right font-medium truncate max-w-[12rem]" title={match.team1_name}>{match.team1_name}</td>
                                    <td className="py-3 px-2 text-center text-lg font-bold">{showFinalScore ? match.score1 : '-'}</td>
                                    <td className="py-3 px-2 text-center text-slate-500">vs</td>
                                    <td className="py-3 px-2 text-center text-lg font-bold">{showFinalScore ? match.score2 : '-'}</td>
                                    <td className="py-3 pl-3 font-medium truncate max-w-[12rem]" title={match.team2_name}>{match.team2_name}</td>
                                    <td className="py-3 px-2 text-xs text-slate-400 truncate" title={submittedText}>{submittedText}</td>
                                    <td className="py-3 px-2 text-xs text-slate-400 truncate" title={infoText || '-'}>{infoText || '-'}</td>
                                    <td className="py-3 px-2">
                                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                                        {getStatusText(match.status, match)}
                                      </span>
                                    </td>
                                    <td className="py-3 px-2">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => startEditing(match)}
                                          className="text-blue-400 hover:text-blue-300"
                                          title={t('Rediger kamp', 'Edit match')}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => setWalkover(match, 'team1')}
                                          className="text-slate-300 hover:text-white text-xs"
                                          title={t('Sett WO til lag 1', 'Set walkover to team 1')}
                                        >
                                          {t('WO 1', 'WO 1')}
                                        </button>
                                        <button
                                          onClick={() => setWalkover(match, 'team2')}
                                          className="text-slate-300 hover:text-white text-xs"
                                          title={t('Sett WO til lag 2', 'Set walkover to team 2')}
                                        >
                                          {t('WO 2', 'WO 2')}
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </div>
        )}

            {/* Knockout Stage Matches */}
            {knockoutMatches.length > 0 && (
              <div className="mb-8">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h2 className="text-xl font-bold flex items-center space-x-2">
                    <Trophy className="w-5 h-5" />
                    <span>{t('Sluttspill - Kamper', 'Knockout - Matches')}</span>
                  </h2>
                  {!showBulkTool && (
                    <button
                      onClick={() => setShowBulkTool(true)}
                      className="pro11-button-secondary text-xs"
                    >
                      {t('Vis bulk', 'Show bulk')}
                    </button>
                  )}
                </div>
                {!shouldShowKnockout && groupMatches.length > 0 ? (
                  <div className="pro11-card p-4 mb-4 bg-yellow-900/20 border border-yellow-600/30">
                    <p className="text-yellow-400">
                      {t(
                        '⚠️ Sluttspill vil bli vist når alle gruppespillkamper er ferdig.',
                        '⚠️ Knockout matches will be shown when all group stage matches are completed.'
                      )}
                    </p>
                    <p className="text-slate-400 text-sm mt-2">
                      {t('Ferdig', 'Completed')}: {groupMatches.filter(m => m.status === 'completed').length} / {groupMatches.length} {t('kamper', 'matches')}
                    </p>
                  </div>
                ) : shouldShowKnockout ? (
            <div className="pro11-card p-4">
              <div className="space-y-3">
                {Object.entries(
                  knockoutMatches.reduce((acc, match) => {
                    const round = match.round || t('Ukjent runde', 'Unknown round')
                    if (!acc[round]) acc[round] = []
                    acc[round].push(match)
                    return acc
                  }, {} as Record<string, Match[]>)
                ).map(([roundName, roundMatches]) => (
                  <div key={roundName} className="mb-6">
                    <h3 className="font-semibold mb-3 text-lg">{roundName}</h3>
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                      <table className="w-max min-w-full text-sm table-fixed">
                        <thead className="text-xs text-slate-400">
                          <tr>
                            <th className="py-2 px-2 text-left w-10">{t('Velg', 'Select')}</th>
                            <th className="py-2 pr-3 text-right w-48">{t('Lag 1', 'Team 1')}</th>
                            <th className="py-2 px-2 text-center w-12">{t('Score', 'Score')}</th>
                            <th className="py-2 px-2 text-center w-10">vs</th>
                            <th className="py-2 px-2 text-center w-12">{t('Score', 'Score')}</th>
                            <th className="py-2 pl-3 text-left w-48">{t('Lag 2', 'Team 2')}</th>
                            <th className="py-2 px-2 text-left w-64">{t('Innsendt', 'Submitted')}</th>
                            <th className="py-2 px-2 text-left w-32">{t('Info', 'Info')}</th>
                            <th className="py-2 px-2 text-left w-28">{t('Status', 'Status')}</th>
                            <th className="py-2 px-2 text-left w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {roundMatches.map(match => {
                            const showFinalScore = match.status === 'completed' && match.score1 !== undefined && match.score2 !== undefined
                            const hasSubmittedScores = match.team1_submitted_score1 !== null || match.team2_submitted_score1 !== null
                            const submittedMismatch = match.team1_submitted_score1 !== null && match.team2_submitted_score1 !== null && 
                              (match.team1_submitted_score1 !== match.team2_submitted_score2 || match.team1_submitted_score2 !== match.team2_submitted_score1)
                            const submittedText = hasSubmittedScores
                              ? `${match.team1_name}: ${match.team1_submitted_score1 ?? '-'}-${match.team1_submitted_score2 ?? '-'} | ${match.team2_name}: ${match.team2_submitted_score1 ?? '-'}-${match.team2_submitted_score2 ?? '-'}${submittedMismatch ? ' ⚠' : ''}`
                              : '-'
                            const infoText = match.scheduled_time
                              ? new Date(match.scheduled_time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
                              : null

                            return (
                              <tr key={match.id} className="border-b border-slate-700/50 bg-slate-800/50">
                                {editingMatch === match.id ? (
                                  <>
                                    <td className="py-3 px-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedMatchIds.has(match.id)}
                                        onChange={() => toggleMatchSelection(match.id)}
                                        className="h-4 w-4"
                                      />
                                    </td>
                                    <td className="py-3 pr-3 text-right font-medium truncate max-w-[12rem]" title={match.team1_name}>{match.team1_name}</td>
                                    <td className="py-3 px-2">
                                      <input
                                        type="number"
                                        min="0"
                                        value={editForm.score1 ?? ''}
                                        onChange={(e) => setEditForm({ ...editForm, score1: parseInt(e.target.value) || 0 })}
                                        className="w-12 px-2 py-1 bg-slate-700 rounded text-center"
                                        placeholder="0"
                                      />
                                    </td>
                                    <td className="py-3 px-2 text-center text-slate-500">vs</td>
                                    <td className="py-3 px-2">
                                      <input
                                        type="number"
                                        min="0"
                                        value={editForm.score2 ?? ''}
                                        onChange={(e) => setEditForm({ ...editForm, score2: parseInt(e.target.value) || 0 })}
                                        className="w-12 px-2 py-1 bg-slate-700 rounded text-center"
                                        placeholder="0"
                                      />
                                    </td>
                                    <td className="py-3 pl-3 font-medium truncate max-w-[12rem]" title={match.team2_name}>{match.team2_name}</td>
                                    <td className="py-3 px-2 text-xs text-slate-400">-</td>
                                    <td className="py-3 px-2">
                                      <input
                                        type="datetime-local"
                                        lang="no"
                                        value={editForm.scheduled_time || ''}
                                        onChange={(e) => setEditForm({ ...editForm, scheduled_time: e.target.value })}
                                        className="px-2 py-1 bg-slate-700 rounded text-sm w-full"
                                      />
                                    </td>
                                    <td className="py-3 px-2">
                                      <select
                                        value={editForm.status || 'scheduled'}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="px-2 py-1 bg-slate-700 rounded text-sm w-full"
                                      >
                                        <option value="scheduled">{t('Planlagt', 'Scheduled')}</option>
                                        <option value="live">LIVE</option>
                                        <option value="completed">{t('Ferdig', 'Finished')}</option>
                                      </select>
                                    </td>
                                    <td className="py-3 px-2">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => saveMatch(match.id)}
                                          className="text-green-400 hover:text-green-300"
                                          title={t('Lagre', 'Save')}
                                        >
                                          <Save className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={cancelEditing}
                                          className="text-red-400 hover:text-red-300"
                                          title={t('Avbryt', 'Cancel')}
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-3 px-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedMatchIds.has(match.id)}
                                        onChange={() => toggleMatchSelection(match.id)}
                                        className="h-4 w-4"
                                      />
                                    </td>
                                    <td className="py-3 pr-3 text-right font-medium truncate max-w-[12rem]" title={match.team1_name}>{match.team1_name}</td>
                                    <td className="py-3 px-2 text-center text-lg font-bold">{showFinalScore ? match.score1 : '-'}</td>
                                    <td className="py-3 px-2 text-center text-slate-500">vs</td>
                                    <td className="py-3 px-2 text-center text-lg font-bold">{showFinalScore ? match.score2 : '-'}</td>
                                    <td className="py-3 pl-3 font-medium truncate max-w-[12rem]" title={match.team2_name}>{match.team2_name}</td>
                                    <td className="py-3 px-2 text-xs text-slate-400 truncate" title={submittedText}>{submittedText}</td>
                                    <td className="py-3 px-2 text-xs text-slate-400 truncate" title={infoText || '-'}>{infoText || '-'}</td>
                                    <td className="py-3 px-2">
                                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                                        {getStatusText(match.status, match)}
                                      </span>
                                    </td>
                                    <td className="py-3 px-2">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => startEditing(match)}
                                          className="text-blue-400 hover:text-blue-300"
                                          title={t('Rediger kamp', 'Edit match')}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => setWalkover(match, 'team1')}
                                          className="text-slate-300 hover:text-white text-xs"
                                          title={t('Sett WO til lag 1', 'Set walkover to team 1')}
                                        >
                                          {t('WO 1', 'WO 1')}
                                        </button>
                                        <button
                                          onClick={() => setWalkover(match, 'team2')}
                                          className="text-slate-300 hover:text-white text-xs"
                                          title={t('Sett WO til lag 2', 'Set walkover to team 2')}
                                        >
                                          {t('WO 2', 'WO 2')}
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
              </div>
                ) : null}
              </div>
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
                    const matchesResponse = await fetch(`/api/matches?tournament_id=${tournamentId}`)
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

