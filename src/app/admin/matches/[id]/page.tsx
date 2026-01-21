'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Trophy, Users, Calendar, Edit, Save, X, RefreshCw } from 'lucide-react'
import { ToastContainer } from '@/components/Toast'
import type { ToastType } from '@/components/Toast'

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
    if (numTeams === 2) return 'Finale'
    if (numTeams === 4) return 'Semifinaler'
    if (numTeams === 8) return 'Kvartfinaler'
    if (numTeams > 8) return 'Kvartfinaler'
    if (numTeams > 4) return 'Semifinaler'
    return 'Sluttspill'
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

      await Promise.all(updates.map(async update => {
        await fetch('/api/matches', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        })
      }))
    } catch (error) {
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
          
          const loadedMatches = matchesData.matches || []
          
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
          setMatches(loadedMatches)
          
          if (loadedMatches.length === 0) {
            console.warn('No matches found for tournament:', tournamentId)
          }
          
          // Calculate group standings
          const standings = calculateGroupStandings(loadedMatches)
          setGroupStandings(standings)

          // Auto-generate knockout when all group matches are completed
          const groupMatches = loadedMatches.filter((m: Match) => m.round === 'Gruppespill')
          const knockoutMatches = loadedMatches.filter((m: Match) => m.round !== 'Gruppespill')
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
                    message: `Sluttspill generert automatisk: ${roundName} (${matchesToCreate.length} kamper).`,
                    type: 'success'
                  })
                }
              }
            } catch (error) {
              console.error('Error auto-generating knockout:', error)
              addToast({
                message: 'Kunne ikke generere sluttspill automatisk. Prøv å oppdatere.',
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
      result[groupName] = Object.values(standings[groupName]).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        const aDiff = a.goalsFor - a.goalsAgainst
        const bDiff = b.goalsFor - b.goalsAgainst
        if (bDiff !== aDiff) return bDiff - aDiff
        return b.goalsFor - a.goalsFor
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
        return 'Ferdig'
      case 'live':
        return 'LIVE'
      case 'scheduled':
        return 'Planlagt'
      case 'pending_confirmation':
        if (match?.submitted_by) {
          return `Venter bekreftelse (${match.submitted_by})`
        }
        return 'Venter bekreftelse'
      case 'pending_result':
        return 'Venter resultat'
      default:
        return 'Venter'
    }
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
        alert('Kamp oppdatert!')
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Ukjent feil' }))
        console.error('Error response:', errorData)
        alert(`Kunne ikke oppdatere kamp: ${errorData.error || 'Ukjent feil'}`)
      }
    } catch (error: any) {
      console.error('Error saving match:', error)
      alert(`Noe gikk galt ved oppdatering av kamp: ${error.message || 'Ukjent feil'}`)
    }
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
          <p className="text-red-400 mb-4">Turnering ikke funnet</p>
          <Link href="/admin" className="pro11-button">Tilbake til admin</Link>
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
              <span>Tilbake</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{tournament.title}</h1>
              <p className="text-slate-400 text-sm">
                {new Date(tournament.start_date).toLocaleDateString('nb-NO', { 
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
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {(scheduleDiagnostics.missingGroupRound.length > 0 || scheduleDiagnostics.duplicates.length > 0) && (
          <div className="pro11-card p-4 mb-6 border border-orange-500/40 bg-orange-900/10">
            <h2 className="text-lg font-semibold text-orange-300 mb-2">Feilsøking: kampprogram</h2>
            {scheduleDiagnostics.missingGroupRound.length > 0 && (
              <p className="text-sm text-orange-200">
                Mangler `group_round` på {scheduleDiagnostics.missingGroupRound.length} gruppespill‑kamper.
              </p>
            )}
            {scheduleDiagnostics.duplicates.length > 0 && (
              <div className="mt-2 text-sm text-orange-200 space-y-1">
                {scheduleDiagnostics.duplicates.map(item => (
                  <div key={`${item.group}-${item.round}-${item.team}`}>
                    {item.group} • {item.round}: {item.team} har flere kamper (ID: {item.matchIds.join(', ')})
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
              <span>Gruppespill - Tabeller</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(groupStandings).map(([groupName, standings]) => (
                <div key={groupName} className="pro11-card p-4">
                  <h3 className="font-semibold mb-3 text-lg">{groupName}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 px-2">Lag</th>
                          <th className="text-center py-2 px-2">K</th>
                          <th className="text-center py-2 px-2">S</th>
                          <th className="text-center py-2 px-2">U</th>
                          <th className="text-center py-2 px-2">T</th>
                          <th className="text-center py-2 px-2">M+</th>
                          <th className="text-center py-2 px-2">M-</th>
                          <th className="text-center py-2 px-2 font-bold">P</th>
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

        {/* Group Stage Matches */}
        {groupMatches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Gruppespill - Kamper</span>
            </h2>
            <div className="pro11-card p-4">
              <div className="space-y-3">
                {Object.entries(
                  groupMatches.reduce((acc, match) => {
                    const group = match.group_name || 'Ukjent gruppe'
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
                    <div className="space-y-2">
                      {sortedGroupMatches.map(match => (
                        <div 
                          key={match.id} 
                          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                        >
                          {editingMatch === match.id ? (
                            <div className="flex-1 flex items-center space-x-4">
                              <span className="font-medium w-32 text-right">{match.team1_name}</span>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.score1 ?? ''}
                                  onChange={(e) => setEditForm({ ...editForm, score1: parseInt(e.target.value) || 0 })}
                                  className="w-16 px-2 py-1 bg-slate-700 rounded text-center"
                                  placeholder="0"
                                />
                                <span className="px-2">-</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.score2 ?? ''}
                                  onChange={(e) => setEditForm({ ...editForm, score2: parseInt(e.target.value) || 0 })}
                                  className="w-16 px-2 py-1 bg-slate-700 rounded text-center"
                                  placeholder="0"
                                />
                              </div>
                              <span className="font-medium w-32">{match.team2_name}</span>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="datetime-local"
                                  value={editForm.scheduled_time || ''}
                                  onChange={(e) => setEditForm({ ...editForm, scheduled_time: e.target.value })}
                                  className="px-2 py-1 bg-slate-700 rounded text-sm"
                                />
                                <select
                                  value={editForm.status || 'scheduled'}
                                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                  className="px-2 py-1 bg-slate-700 rounded text-sm"
                                >
                                  <option value="scheduled">Planlagt</option>
                                  <option value="live">LIVE</option>
                                  <option value="completed">Ferdig</option>
                                </select>
                                <button
                                  onClick={() => saveMatch(match.id)}
                                  className="text-green-400 hover:text-green-300"
                                  title="Lagre"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="text-red-400 hover:text-red-300"
                                  title="Avbryt"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 flex items-center space-x-4">
                                <span className="font-medium w-32 text-right">{match.team1_name}</span>
                                {match.status === 'completed' && match.score1 !== undefined && match.score2 !== undefined ? (
                                  <span className="text-lg font-bold px-4">
                                    {match.score1} - {match.score2}
                                  </span>
                                ) : (match.team1_submitted_score1 !== null || match.team2_submitted_score1 !== null) ? (
                                  <div className="flex flex-col items-center px-4">
                                    <div className="text-xs text-orange-400 mb-1">Innsendte resultater</div>
                                    <div className="text-xs text-slate-400 text-center">
                                      {match.team1_name}: {match.team1_submitted_score1 ?? '-'} - {match.team1_submitted_score2 ?? '-'}
                                    </div>
                                    <div className="text-xs text-slate-400 text-center">
                                      {match.team2_name}: {match.team2_submitted_score1 ?? '-'} - {match.team2_submitted_score2 ?? '-'}
                                    </div>
                                    {match.team1_submitted_score1 !== null && match.team2_submitted_score1 !== null && 
                                     (match.team1_submitted_score1 !== match.team2_submitted_score2 || match.team1_submitted_score2 !== match.team2_submitted_score1) && (
                                      <div className="text-xs text-red-400 mt-1 font-semibold">
                                        ⚠️ Resultater matcher ikke!
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-500 px-4">vs</span>
                                )}
                                <span className="font-medium w-32">{match.team2_name}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                {(match.group_round || roundMap[buildKey(match.team1_name, match.team2_name)]) && (
                                  <span className="text-xs text-slate-400">
                                    Runde {match.group_round || roundMap[buildKey(match.team1_name, match.team2_name)]}
                                  </span>
                                )}
                                {match.scheduled_time && (
                                  <span className="text-xs text-slate-400">
                                    {new Date(match.scheduled_time).toLocaleTimeString('nb-NO', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                                  {getStatusText(match.status, match)}
                                </span>
                                <button
                                  onClick={() => startEditing(match)}
                                  className="text-blue-400 hover:text-blue-300"
                                  title="Rediger kamp"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
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
                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                  <Trophy className="w-5 h-5" />
                  <span>Sluttspill - Kamper</span>
                </h2>
                {!shouldShowKnockout && groupMatches.length > 0 ? (
                  <div className="pro11-card p-4 mb-4 bg-yellow-900/20 border border-yellow-600/30">
                    <p className="text-yellow-400">
                      ⚠️ Sluttspill vil bli vist når alle gruppespillkamper er ferdig.
                    </p>
                    <p className="text-slate-400 text-sm mt-2">
                      Ferdig: {groupMatches.filter(m => m.status === 'completed').length} / {groupMatches.length} kamper
                    </p>
                  </div>
                ) : shouldShowKnockout ? (
            <div className="pro11-card p-4">
              <div className="space-y-3">
                {Object.entries(
                  knockoutMatches.reduce((acc, match) => {
                    const round = match.round || 'Ukjent runde'
                    if (!acc[round]) acc[round] = []
                    acc[round].push(match)
                    return acc
                  }, {} as Record<string, Match[]>)
                ).map(([roundName, roundMatches]) => (
                  <div key={roundName} className="mb-6">
                    <h3 className="font-semibold mb-3 text-lg">{roundName}</h3>
                    <div className="space-y-2">
                      {roundMatches.map(match => (
                        <div 
                          key={match.id} 
                          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                        >
                          {editingMatch === match.id ? (
                            <div className="flex-1 flex items-center space-x-4">
                              <span className="font-medium w-32 text-right">{match.team1_name}</span>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.score1 ?? ''}
                                  onChange={(e) => setEditForm({ ...editForm, score1: parseInt(e.target.value) || 0 })}
                                  className="w-16 px-2 py-1 bg-slate-700 rounded text-center"
                                  placeholder="0"
                                />
                                <span className="px-2">-</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.score2 ?? ''}
                                  onChange={(e) => setEditForm({ ...editForm, score2: parseInt(e.target.value) || 0 })}
                                  className="w-16 px-2 py-1 bg-slate-700 rounded text-center"
                                  placeholder="0"
                                />
                              </div>
                              <span className="font-medium w-32">{match.team2_name}</span>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="datetime-local"
                                  value={editForm.scheduled_time || ''}
                                  onChange={(e) => setEditForm({ ...editForm, scheduled_time: e.target.value })}
                                  className="px-2 py-1 bg-slate-700 rounded text-sm"
                                />
                                <select
                                  value={editForm.status || 'scheduled'}
                                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                  className="px-2 py-1 bg-slate-700 rounded text-sm"
                                >
                                  <option value="scheduled">Planlagt</option>
                                  <option value="live">LIVE</option>
                                  <option value="completed">Ferdig</option>
                                </select>
                                <button
                                  onClick={() => saveMatch(match.id)}
                                  className="text-green-400 hover:text-green-300"
                                  title="Lagre"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="text-red-400 hover:text-red-300"
                                  title="Avbryt"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 flex items-center space-x-4">
                                <span className="font-medium w-32 text-right">{match.team1_name}</span>
                                {match.status === 'completed' && match.score1 !== undefined && match.score2 !== undefined ? (
                                  <span className="text-lg font-bold px-4">
                                    {match.score1} - {match.score2}
                                  </span>
                                ) : (match.team1_submitted_score1 !== null || match.team2_submitted_score1 !== null) ? (
                                  <div className="flex flex-col items-center px-4">
                                    <div className="text-xs text-orange-400 mb-1">Innsendte resultater</div>
                                    <div className="text-xs text-slate-400 text-center">
                                      {match.team1_name}: {match.team1_submitted_score1 ?? '-'} - {match.team1_submitted_score2 ?? '-'}
                                    </div>
                                    <div className="text-xs text-slate-400 text-center">
                                      {match.team2_name}: {match.team2_submitted_score1 ?? '-'} - {match.team2_submitted_score2 ?? '-'}
                                    </div>
                                    {match.team1_submitted_score1 !== null && match.team2_submitted_score1 !== null && 
                                     (match.team1_submitted_score1 !== match.team2_submitted_score2 || match.team1_submitted_score2 !== match.team2_submitted_score1) && (
                                      <div className="text-xs text-red-400 mt-1 font-semibold">
                                        ⚠️ Resultater matcher ikke!
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-500 px-4">vs</span>
                                )}
                                <span className="font-medium w-32">{match.team2_name}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                {match.scheduled_time && (
                                  <span className="text-xs text-slate-400">
                                    {new Date(match.scheduled_time).toLocaleTimeString('nb-NO', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                                  {getStatusText(match.status, match)}
                                </span>
                                <button
                                  onClick={() => startEditing(match)}
                                  className="text-blue-400 hover:text-blue-300"
                                  title="Rediger kamp"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
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
            <p className="text-slate-400 mb-2">Ingen kamper er generert for denne turneringen ennå.</p>
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
                Oppdater kamper
              </button>
              <Link href="/admin" className="pro11-button">
                Gå til admin panel
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
                  <h2 className="text-xl font-bold">Seeding (foreløpig)</h2>
                  <p className="text-slate-400 text-sm">
                    {preview.allGroupsComplete
                      ? `Klar for sluttspill: ${preview.roundName}`
                      : 'Oppdateres fortløpende når gruppene ferdigspilles.'}
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
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Matchups (seedet)</h3>
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
                      <div className="text-sm text-slate-400">Ingen matchups ennå.</div>
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

