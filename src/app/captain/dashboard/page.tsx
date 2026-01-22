'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Shield, Trophy, Users, Calendar, Edit, CheckCircle, XCircle, ArrowRight, LogOut } from 'lucide-react'
import Toast, { ToastContainer } from '@/components/Toast'
import type { ToastType } from '@/components/Toast'

interface Team {
  id: string
  teamName: string
  captainEmail: string
  captainName: string
  discordUsername?: string
  tournaments: string[]
}

interface Match {
  id: string
  team1: string
  team2: string
  score1: number
  score2: number
  status: 'scheduled' | 'live' | 'completed' | 'pending_result' | 'pending_confirmation'
  time: string
  round: string
  group?: string
  groupRound?: number
  tournamentId: string
  canSubmitResult: boolean
  submittedBy: string | null
  submittedScore1: number | null
  submittedScore2: number | null
  opponentSubmittedScore1: number | null
  opponentSubmittedScore2: number | null
  canConfirmResult: boolean
}

interface Tournament {
  id: string
  title: string
  status: 'upcoming' | 'live' | 'completed'
  matches: Match[]
  startDate: string
  endDate: string
  position?: number
  totalTeams?: number
}

interface GroupStandingRow {
  team: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

interface TeamStats {
  wins: number
  losses: number
  draws: number
  goalsFor: number
  goalsAgainst: number
  tournamentsPlayed: number
  bestFinish: string
  currentRanking: number
}

interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

export default function CaptainDashboardPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [resultScore1, setResultScore1] = useState(0)
  const [resultScore2, setResultScore2] = useState(0)
  const [discordUsername, setDiscordUsername] = useState('')
  const [isSavingDiscord, setIsSavingDiscord] = useState(false)
  const [showDiscordEditor, setShowDiscordEditor] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const previousMatchesRef = useRef<Match[]>([])

  const buildGroupRoundMap = (groupMatches: Match[]) => {
    const teamSet = new Set<string>()
    groupMatches.forEach(match => {
      teamSet.add(match.team1)
      teamSet.add(match.team2)
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

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  useEffect(() => {
    // Hent lag-data fra localStorage
    const teamData = localStorage.getItem('captainTeam')
    if (teamData) {
      const parsedTeam = JSON.parse(teamData)
      setTeam(parsedTeam)
      setDiscordUsername(parsedTeam.discordUsername || '')
      setShowDiscordEditor(!parsedTeam.discordUsername)
      
      // Hent faktiske turneringer fra databasen
      const loadTournaments = async () => {
        try {
          // Hent turneringer som laget er registrert på
          const tournamentIds = parsedTeam.tournaments || []
          
          if (tournamentIds.length === 0) {
            setTournaments([])
            setTeamStats({
              wins: 0,
              losses: 0,
              draws: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              tournamentsPlayed: 0,
              bestFinish: 'Ingen',
              currentRanking: 0
            })
            return
          }
          
          // Hent hver turnering med kamper
          const tournamentPromises = tournamentIds.map(async (tournamentId: string) => {
            try {
              const [tournamentResponse, matchesResponse] = await Promise.all([
                fetch(`/api/tournaments?id=${tournamentId}`),
                fetch(`/api/matches?tournament_id=${tournamentId}`)
              ])
              
              let tournament = null
              let matches: Match[] = []
              
              if (tournamentResponse.ok) {
                const data = await tournamentResponse.json()
                tournament = data.tournament
              }
              
              if (matchesResponse.ok) {
                const matchesData = await matchesResponse.json()
                matches = (matchesData.matches || []).map((m: any) => {
                  const isTeam1 = m.team1_name === parsedTeam.teamName
                  const isTeam2 = m.team2_name === parsedTeam.teamName
                  const isMyMatch = isTeam1 || isTeam2
                  
                  if (!isMyMatch) return null
                  
                  // Determine if this team can submit result (not completed, and hasn't submitted yet)
                  const hasTeam1Submitted = m.team1_submitted_score1 !== null && m.team1_submitted_score1 !== undefined
                  const hasTeam2Submitted = m.team2_submitted_score1 !== null && m.team2_submitted_score1 !== undefined
                  const thisTeamHasSubmitted = (isTeam1 && hasTeam1Submitted) || (isTeam2 && hasTeam2Submitted)
                  
                  // Determine if this team can confirm (opponent has submitted, waiting for confirmation)
                  // Can confirm if opponent has submitted but this team hasn't
                  const opponentHasSubmitted = (isTeam1 && hasTeam2Submitted) || (isTeam2 && hasTeam1Submitted)
                  
                  const canSubmit = (m.status === 'scheduled' || m.status === 'live' || m.status === 'pending_result' || m.status === 'pending_confirmation') && 
                                    !thisTeamHasSubmitted &&
                                    !opponentHasSubmitted &&
                                    m.status !== 'completed'
                  
                  // Can confirm if:
                  // 1. Opponent has submitted their result (checked via team1/team2_submitted_score1)
                  // 2. This team hasn't submitted yet
                  // 3. Match is not completed
                  // 4. Status is pending_confirmation (meaning someone has submitted)
                  const canConfirm = opponentHasSubmitted && 
                                     !thisTeamHasSubmitted &&
                                     m.status !== 'completed'
                  
                  const opponentSubmittedScore1 = isTeam1
                    ? (m.team2_submitted_score2 ?? null)
                    : (m.team1_submitted_score1 ?? null)
                  const opponentSubmittedScore2 = isTeam1
                    ? (m.team2_submitted_score1 ?? null)
                    : (m.team1_submitted_score2 ?? null)

                  return {
                    id: m.id,
                    team1: m.team1_name,
                    team2: m.team2_name,
                    score1: m.score1 || 0,
                    score2: m.score2 || 0,
                    status: m.status as 'scheduled' | 'live' | 'completed' | 'pending_result' | 'pending_confirmation',
                    time: m.scheduled_time ? new Date(m.scheduled_time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : '',
                    round: m.round,
                    group: m.group_name || undefined,
                    groupRound: m.group_round ?? undefined,
                    tournamentId: m.tournament_id,
                    canSubmitResult: canSubmit,
                    submittedBy: m.submitted_by || null,
                    submittedScore1: isTeam1 ? (m.team1_submitted_score1 ?? m.submitted_score1 ?? null) : (m.team2_submitted_score1 ?? m.submitted_score1 ?? null),
                    submittedScore2: isTeam1 ? (m.team1_submitted_score2 ?? m.submitted_score2 ?? null) : (m.team2_submitted_score2 ?? m.submitted_score2 ?? null),
                    opponentSubmittedScore1,
                    opponentSubmittedScore2,
                    canConfirmResult: canConfirm
                  }
                }).filter((match: Match | null): match is Match => match !== null)
              }
              
              return tournament ? { tournament, matches } : null
            } catch (error) {
              console.error(`Error loading tournament ${tournamentId}:`, error)
              return null
            }
          })
          
          const tournamentData = await Promise.all(tournamentPromises)
          const validTournaments = tournamentData.filter(t => t !== null)
          
          // Transform database tournaments to frontend format
          const transformedTournaments: Tournament[] = validTournaments.map((t: any) => {
            const tournament = t.tournament
            const startDate = new Date(tournament.start_date)
            const endDate = new Date(tournament.end_date)
            
              // Filter out knockout matches if group stage is not completed
              const allMatches = t.matches || []
              const groupMatches = allMatches.filter((m: Match) => m.round === 'Gruppespill')
              const knockoutMatches = allMatches.filter((m: Match) => m.round !== 'Gruppespill')
              
              // Check if all group stage matches are completed
              const allGroupMatchesCompleted = groupMatches.length > 0 && 
                groupMatches.every((m: Match) => m.status === 'completed')
              
              // Only show knockout matches if group stage is complete or if there are no group matches
              const shouldShowKnockout = groupMatches.length === 0 || allGroupMatchesCompleted
              
              // Filter matches based on knockout visibility
              const filteredMatches = shouldShowKnockout 
                ? allMatches 
                : allMatches.filter((m: Match) => m.round === 'Gruppespill')
              
              return {
                id: tournament.id,
                title: tournament.title,
                status: tournament.status === 'active' ? 'live' : tournament.status === 'completed' ? 'completed' : 'upcoming',
                startDate: startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }),
                endDate: endDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }),
                position: 0, // TODO: Calculate position from standings
                totalTeams: tournament.max_teams,
                matches: filteredMatches
              }
          })
          
          setTournaments(transformedTournaments)
          
          // Check for new notifications (opponent submitted result)
          const allMatches = transformedTournaments.flatMap(t => t.matches)
          const previousMatches = previousMatchesRef.current
          
          // Check if any match now has canConfirmResult = true that didn't before
          allMatches.forEach(match => {
            const previousMatch = previousMatches.find(pm => pm.id === match.id)
            if (match.canConfirmResult && (!previousMatch || !previousMatch.canConfirmResult)) {
              // Opponent has just submitted a result
              const opponentName = match.team1 === parsedTeam.teamName ? match.team2 : match.team1
              const opponentScore = match.team1 === parsedTeam.teamName 
                ? (match.opponentSubmittedScore2 || 0) 
                : (match.opponentSubmittedScore1 || 0)
              const myScore = match.team1 === parsedTeam.teamName 
                ? (match.opponentSubmittedScore1 || 0) 
                : (match.opponentSubmittedScore2 || 0)
              
              addToast({
                message: `${opponentName} har sendt inn resultat: ${opponentScore} - ${myScore}. Bekreft eller avvis resultatet.`,
                type: 'info'
              })
            }
          })
          
          previousMatchesRef.current = allMatches
          
          // Beregn lagstatistikk (foreløpig tom siden vi ikke har matches)
          const stats = calculateTeamStats(transformedTournaments, parsedTeam.teamName)
      setTeamStats(stats)
        } catch (error) {
          console.error('Error loading tournaments:', error)
          setTournaments([])
        }
      }
      
      loadTournaments()
      
      // Auto-refresh every 10 seconds to see updated match results
      const interval = setInterval(() => {
        loadTournaments()
      }, 10000)
      
      return () => clearInterval(interval)
    } else {
      // Ikke logget inn, redirect til login
      window.location.href = '/captain/login'
    }
  }, [])

  const calculateTeamStats = (tournaments: Tournament[], teamName: string): TeamStats => {
    let wins = 0
    let losses = 0
    let draws = 0
    let goalsFor = 0
    let goalsAgainst = 0
    let tournamentsPlayed = 0
    let bestFinish = 'Ingen'
    let currentRanking = 0

    tournaments.forEach(tournament => {
      if (tournament.status === 'completed' || tournament.status === 'live') {
        tournamentsPlayed++
        
        tournament.matches.forEach(match => {
          if (match.status === 'completed') {
            const isHomeTeam = match.team1 === teamName
            const teamScore = isHomeTeam ? match.score1 : match.score2
            const opponentScore = isHomeTeam ? match.score2 : match.score1
            
            goalsFor += teamScore
            goalsAgainst += opponentScore
            
            if (teamScore > opponentScore) {
              wins++
            } else if (teamScore < opponentScore) {
              losses++
            } else {
              draws++
            }
          }
        })
        
        // Mock rangering basert på antall kamper
        if (tournament.position) {
          currentRanking = tournament.position
          if (tournament.position === 1) bestFinish = 'Vinner'
          else if (tournament.position <= 4) bestFinish = 'Semifinale'
          else if (tournament.position <= 8) bestFinish = 'Kvartfinale'
        }
      }
    })

    return {
      wins,
      losses,
      draws,
      goalsFor,
      goalsAgainst,
      tournamentsPlayed,
      bestFinish,
      currentRanking
    }
  }

  const calculateGroupStandings = (matches: Match[]): Record<string, GroupStandingRow[]> => {
    const standings: Record<string, Record<string, GroupStandingRow>> = {}
    matches.forEach(match => {
      if (match.round !== 'Gruppespill' || !match.group) return
      const group = match.group
      if (!standings[group]) standings[group] = {}

      const ensureTeam = (name: string) => {
        if (!standings[group][name]) {
          standings[group][name] = {
            team: name,
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

      ensureTeam(match.team1)
      ensureTeam(match.team2)

      if (match.status === 'completed') {
        const team1 = standings[group][match.team1]
        const team2 = standings[group][match.team2]
        const score1 = match.score1 ?? 0
        const score2 = match.score2 ?? 0

        team1.played += 1
        team2.played += 1
        team1.goalsFor += score1
        team1.goalsAgainst += score2
        team2.goalsFor += score2
        team2.goalsAgainst += score1

        if (score1 > score2) {
          team1.wins += 1
          team1.points += 3
          team2.losses += 1
        } else if (score2 > score1) {
          team2.wins += 1
          team2.points += 3
          team1.losses += 1
        } else {
          team1.draws += 1
          team2.draws += 1
          team1.points += 1
          team2.points += 1
        }
      }
    })

    return Object.fromEntries(
      Object.entries(standings).map(([group, rows]) => {
        const sorted = Object.values(rows).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points
          const diffA = a.goalsFor - a.goalsAgainst
          const diffB = b.goalsFor - b.goalsAgainst
          if (diffB !== diffA) return diffB - diffA
          return b.goalsFor - a.goalsFor
        })
        return [group, sorted]
      })
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('captainTeam')
    window.location.href = '/captain/login'
  }

  const openResultModal = (match: Match) => {
    setSelectedMatch(match)
    setResultScore1(match.score1)
    setResultScore2(match.score2)
    setShowResultModal(true)
    // Scroll to top when modal opens
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitResult = async () => {
    if (!selectedMatch || !team) return

    // Determine which team is submitting and adjust scores accordingly
    const isTeam1 = selectedMatch.team1 === team.teamName
    const isTeam2 = selectedMatch.team2 === team.teamName
    
    if (!isTeam1 && !isTeam2) {
      alert('Du er ikke del av denne kampen.')
      return
    }

    try {
      // Send resultat til API fra riktig perspektiv
      // UI viser alltid team1/team2, så vi må mappe til "mitt lag" før vi sender
      const teamScore1 = isTeam1 ? resultScore1 : resultScore2
      const teamScore2 = isTeam1 ? resultScore2 : resultScore1

      const response = await fetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedMatch.id,
          team_name: team.teamName,
          team_score1: teamScore1, // This team's score
          team_score2: teamScore2  // Opponent's score
        })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Feil ved innsending av resultat: ${error.error || 'Ukjent feil'}`)
        return
      }

      const result = await response.json()
      const updatedMatch = result.match

      // Check if match was automatically completed (both teams submitted matching results)
      if (updatedMatch.status === 'completed') {
        alert(`Resultat bekreftet og fullført: ${selectedMatch.team1} ${updatedMatch.score1} - ${updatedMatch.score2} ${selectedMatch.team2}\n\nBegge lag har bekreftet samme resultat.`)
      } else {
    alert(`Resultat innsendt: ${selectedMatch.team1} ${resultScore1} - ${resultScore2} ${selectedMatch.team2}\n\nVenter på bekreftelse fra motstanderlaget.`)
      }
      
    setShowResultModal(false)
      
      // Reload page to get updated match status
      window.location.reload()
    } catch (error) {
      console.error('Error submitting result:', error)
      alert('Noe gikk galt ved innsending av resultat. Prøv igjen.')
    }
  }

  const saveDiscordUsername = async () => {
    if (!team) return
    setIsSavingDiscord(true)
    try {
      const response = await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: team.id,
          discordUsername: discordUsername.trim()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Kunne ikke oppdatere Discord: ${error.error || 'Ukjent feil'}`)
        return
      }

      const result = await response.json()
      const updatedTeam = { ...team, discordUsername: result.team?.discordUsername || discordUsername.trim() }
      setTeam(updatedTeam)
      localStorage.setItem('captainTeam', JSON.stringify(updatedTeam))
      addToast({ message: 'Discord-brukernavn oppdatert.', type: 'success' })
      setShowDiscordEditor(false)
    } catch (error) {
      console.error('Error updating discord username:', error)
      alert('Noe gikk galt ved oppdatering av Discord-brukernavn.')
    } finally {
      setIsSavingDiscord(false)
    }
  }

  const confirmResult = async (match: Match) => {
    if (!team) return

    // When confirming, the team needs to submit their own result
    // If it matches the opponent's result, the match will be automatically completed
    // If it doesn't match, it will wait for admin review
    const isTeam1 = match.team1 === team.teamName
    const isTeam2 = match.team2 === team.teamName
    
    if (!isTeam1 && !isTeam2) {
      alert('Du er ikke del av denne kampen.')
      return
    }

    // Get opponent's submitted result from the match data
    // We need to fetch the latest match data to get the correct submitted scores
    try {
      const matchResponse = await fetch(`/api/matches?tournament_id=${match.tournamentId}`)
      if (!matchResponse.ok) {
        alert('Kunne ikke hente kampdata. Prøv igjen.')
        return
      }
      
      const matchesData = await matchResponse.json()
      const currentMatch = matchesData.matches?.find((m: any) => m.id === match.id)
      
      if (!currentMatch) {
        alert('Kamp ikke funnet.')
        return
      }

      // Get opponent's submitted scores
      let opponentScore1: number | null = null
      let opponentScore2: number | null = null
      
      if (isTeam1) {
        // Team1 is confirming, so opponent is Team2
        opponentScore1 = currentMatch.team2_submitted_score1 // Team2's score (from their perspective)
        opponentScore2 = currentMatch.team2_submitted_score2 // Team1's score (from Team2's perspective)
      } else {
        // Team2 is confirming, so opponent is Team1
        opponentScore1 = currentMatch.team1_submitted_score1 // Team1's score (from their perspective)
        opponentScore2 = currentMatch.team1_submitted_score2 // Team2's score (from Team1's perspective)
      }

      if (opponentScore1 === null || opponentScore2 === null) {
        alert('Motstanderens resultat ikke funnet. Prøv å oppdatere siden.')
        return
      }

      // For confirming team: we need to submit the same result from our perspective
      // If Team2 reported "3-1" (they scored 3, we scored 1), we should report "1-3" (we scored 1, they scored 3)
      const myScore = isTeam1 ? opponentScore2 : opponentScore1 // What opponent reported as our score
      const opponentScore = isTeam1 ? opponentScore1 : opponentScore2 // What opponent reported as their score

      // Submit our result - if it matches, match will be completed automatically
      const response = await fetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: match.id,
          team_name: team.teamName,
          team_score1: myScore, // Our score
          team_score2: opponentScore // Opponent's score
        })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Feil ved bekreftelse av resultat: ${error.error || 'Ukjent feil'}`)
        return
      }

      const result = await response.json()
      const updatedMatch = result.match

      // Check if match was automatically completed (both teams submitted matching results)
      if (updatedMatch.status === 'completed') {
        alert(`Resultat bekreftet og fullført: ${match.team1} ${updatedMatch.score1} - ${updatedMatch.score2} ${match.team2}\n\nBegge lag har bekreftet samme resultat.`)
      } else {
        alert(`Resultat sendt inn: ${match.team1} ${myScore} - ${opponentScore} ${match.team2}\n\nHvis resultatene ikke matcher, vil admin se på det.`)
      }
      
      // Reload page to get updated match status
      window.location.reload()
    } catch (error) {
      console.error('Error confirming result:', error)
      alert('Noe gikk galt ved bekreftelse av resultat. Prøv igjen.')
    }
  }

  const rejectResult = async (match: Match) => {
    if (!team) return

    if (!confirm('Er du sikker på at du vil avvise dette resultatet? Begge lag må legge inn resultatet på nytt.')) {
      return
    }

    try {
      // Reset the match to pending_result by clearing submitted fields
      const response = await fetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: match.id,
          status: 'pending_result',
          // Clear all submitted fields
          team1_submitted_score1: null,
          team1_submitted_score2: null,
          team2_submitted_score1: null,
          team2_submitted_score2: null,
          submitted_by: null,
          submitted_score1: null,
          submitted_score2: null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Reject result error:', error)
        alert(`Feil ved avvisning av resultat: ${error.error || 'Ukjent feil'}`)
        return
      }

      const result = await response.json()
      console.log('Reject result success:', result)

    alert('Resultat avvist. Begge lag må legge inn resultatet på nytt.')
      
      // Reload page to get updated match status
      window.location.reload()
    } catch (error) {
      console.error('Error rejecting result:', error)
      alert('Noe gikk galt ved avvisning av resultat. Prøv igjen.')
    }
  }

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-slate-600'
      case 'live':
        return 'bg-green-600'
      case 'completed':
        return 'bg-blue-600'
      case 'pending_result':
        return 'bg-yellow-600'
      case 'pending_confirmation':
        return 'bg-orange-600'
      default:
        return 'bg-slate-600'
    }
  }

  const getMatchStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Planlagt'
      case 'live':
        return 'Live'
      case 'completed':
        return 'Ferdig'
      case 'pending_result':
        return 'Venter resultat'
      case 'pending_confirmation':
        return 'Venter bekreftelse'
      default:
        return 'Ukjent'
    }
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Laster...</p>
        </div>
      </div>
    )
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
              <p className="text-slate-400 text-sm">Lagleder Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-blue-400 text-sm">{team.teamName}</span>
            <button
              onClick={handleLogout}
              className="pro11-button-secondary flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Logg ut</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex flex-col items-center">
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <div className="max-w-6xl w-full">
          {/* Welcome Section */}
          <div className="pro11-card p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">Velkommen, {team.captainName}!</h1>
                <p className="text-slate-300">
                  Her kan du administrere {team.teamName} og legge inn resultater for dine kamper.
                </p>
              </div>
              {team.discordUsername && (
                <button
                  type="button"
                  onClick={() => setShowDiscordEditor(true)}
                  className="flex items-center space-x-2 text-slate-400 text-sm hover:text-slate-200 transition-colors"
                  style={{ background: 'transparent', border: 'none', padding: 0 }}
                  title="Rediger Discord-brukernavn"
                >
                  <svg className="w-5 h-5" viewBox="0 0 127.14 96.36" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6,.54,80.21a105.73,105.73,0,0,0,32.1,16.15,77.7,77.7,0,0,0,6.89-11.13,68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.35,2.66-2.07a75.57,75.57,0,0,0,64.32,0c.87.72,1.76,1.41,2.66,2.07a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.12,105.25,105.25,0,0,0,32.12-16.16C130.49,56.9,126.18,32.94,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,52.91S36,40.13,42.45,40.13c6.48,0,11.66,5.8,11.56,12.78C54,60,48.93,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.27,60,73.27,52.91S78.41,40.13,84.69,40.13c6.49,0,11.67,5.8,11.56,12.78C96.25,60,91.18,65.69,84.69,65.69Z"
                    />
                  </svg>
                  <span className="text-blue-400">{team.discordUsername}</span>
                </button>
              )}
            </div>
          </div>

          {(showDiscordEditor || !team.discordUsername) && (
            <div className="pro11-card p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Lagleder</h2>
              <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Discord brukernavn</label>
                  <input
                    type="text"
                    value={discordUsername}
                    onChange={(e) => setDiscordUsername(e.target.value)}
                    className="pro11-input w-full"
                    placeholder="f.eks. brukernavn#1234"
                  />
                </div>
                <button
                  onClick={saveDiscordUsername}
                  disabled={isSavingDiscord}
                  className="pro11-button-secondary"
                >
                  {isSavingDiscord ? 'Lagrer...' : 'Lagre'}
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions for Active Tournaments */}
          {tournaments.filter(t => t.status === 'live').length > 0 && (
            <div className="pro11-card p-6 md:p-8 mb-6">
              <h2 className="text-xl font-bold mb-4">Hurtig-handlinger</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {tournaments.filter(t => t.status === 'live').map(tournament => {
                  // Filter out knockout matches if group stage is not completed
                  const groupMatches = tournament.matches.filter(m => m.round === 'Gruppespill')
                  const allGroupMatchesCompleted = groupMatches.length > 0 && 
                    groupMatches.every(m => m.status === 'completed')
                  const shouldShowKnockout = groupMatches.length === 0 || allGroupMatchesCompleted
                  
                  // Filter matches based on knockout visibility
                  const visibleMatches = shouldShowKnockout 
                    ? tournament.matches 
                    : tournament.matches.filter(m => m.round === 'Gruppespill')
                  
                  const groupRoundMap = buildGroupRoundMap(groupMatches)
                  const buildKey = (teamA: string, teamB: string) => [teamA, teamB].sort().join('|')
                  const sortedMatches = [...visibleMatches].sort((a, b) => {
                    const aIsGroup = a.round === 'Gruppespill'
                    const bIsGroup = b.round === 'Gruppespill'
                    if (aIsGroup && bIsGroup) {
                      const roundA = a.groupRound || groupRoundMap[buildKey(a.team1, a.team2)] || 999
                      const roundB = b.groupRound || groupRoundMap[buildKey(b.team1, b.team2)] || 999
                      if (roundA !== roundB) return roundA - roundB
                    }
                    return a.time.localeCompare(b.time)
                  })
                  const pendingMatches = sortedMatches.filter(m => 
                    m.canSubmitResult || m.canConfirmResult
                  )
                  const nextMatch = pendingMatches[0] || null
                  return (
                    <div key={tournament.id} className="p-4 md:p-5 bg-slate-800/50 rounded-lg">
                      <h3 className="font-semibold mb-3">{tournament.title}</h3>
                      <div className="space-y-2">
                        {nextMatch ? (
                          <div key={nextMatch.id} className="p-3 md:p-4 bg-slate-700/30 rounded">
                            <div className="flex flex-col gap-2 md:grid md:grid-cols-[1.6fr_0.7fr_1.4fr_auto] md:items-center md:gap-4">
                              <div className="text-sm font-medium">
                                {nextMatch.team1} vs {nextMatch.team2}
                              </div>
                              <div className="text-xs text-slate-400 md:text-sm">
                                {nextMatch.round}
                              </div>
                              <div className="text-xs md:text-sm text-slate-300">
                                {nextMatch.canConfirmResult &&
                                  nextMatch.opponentSubmittedScore1 !== null &&
                                  nextMatch.opponentSubmittedScore2 !== null && (
                                    <>Innsendt: {nextMatch.opponentSubmittedScore1} - {nextMatch.opponentSubmittedScore2}</>
                                  )}
                              </div>
                              <div className="flex flex-wrap gap-2 md:justify-end">
                                {nextMatch.canSubmitResult && (
                                  <button
                                    onClick={() => openResultModal(nextMatch)}
                                    className="pro11-button-secondary text-xs px-3 py-1"
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Legg inn
                                  </button>
                                )}
                                {nextMatch.canConfirmResult && (
                                  <>
                                    <button
                                      onClick={() => confirmResult(nextMatch)}
                                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                    >
                                      Bekreft
                                    </button>
                                    {nextMatch.submittedBy && nextMatch.submittedBy !== team.teamName && (
                                      <button
                                        onClick={() => rejectResult(nextMatch)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                      >
                                        Avvis
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400 text-center py-2">
                            Ingen ventende handlinger
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Team Statistics */}
          {teamStats && (
            <div className="pro11-card p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Lagstatistikk</h2>
              <div className="flex items-center justify-center space-x-8 mb-6">
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">{teamStats.wins}</div>
                  <div className="text-sm text-slate-400">Seiere</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-red-400">{teamStats.losses}</div>
                  <div className="text-sm text-slate-400">Tap</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">{teamStats.draws}</div>
                  <div className="text-sm text-slate-400">Uavgjort</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{teamStats.tournamentsPlayed}</div>
                  <div className="text-sm text-slate-400">Turneringer spilt</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h3 className="font-semibold mb-2">Målstatistikk</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mål for:</span>
                      <span className="font-medium">{teamStats.goalsFor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mål mot:</span>
                      <span className="font-medium">{teamStats.goalsAgainst}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Målforskjell:</span>
                      <span className={`font-medium ${teamStats.goalsFor - teamStats.goalsAgainst >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {teamStats.goalsFor - teamStats.goalsAgainst > 0 ? '+' : ''}{teamStats.goalsFor - teamStats.goalsAgainst}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h3 className="font-semibold mb-2">Prestasjoner</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Beste plassering:</span>
                      <span className="font-medium">{teamStats.bestFinish}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nåværende rangering:</span>
                      <span className="font-medium">{teamStats.currentRanking || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h3 className="font-semibold mb-2">Vinnprosent</h3>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">
                      {teamStats.wins + teamStats.losses + teamStats.draws > 0 
                        ? Math.round((teamStats.wins / (teamStats.wins + teamStats.losses + teamStats.draws)) * 100)
                        : 0}%
                    </div>
                    <div className="text-sm text-slate-400">
                      {teamStats.wins} av {teamStats.wins + teamStats.losses + teamStats.draws} kamper
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tournament History */}
          <div className="pro11-card p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Turneringshistorikk</h2>
            <div className="space-y-4">
              {tournaments.filter(t => t.status === 'completed').map(tournament => (
                <div key={tournament.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{tournament.title}</h3>
                    <p className="text-slate-400 text-sm">{tournament.startDate} - {tournament.endDate}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{tournament.position}</div>
                      <div className="text-xs text-slate-400">av {tournament.totalTeams}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-green-400">
                        {tournament.matches.filter(m => m.status === 'completed').length} kamper
                      </div>
                      <div className="text-xs text-slate-400">spilt</div>
                    </div>
                    <Trophy className={`w-6 h-6 ${tournament.position === 1 ? 'text-yellow-400' : 'text-slate-400'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Tournaments */}
          {tournaments.filter(t => t.status === 'live' || t.status === 'upcoming' || t.status === 'completed').map(tournament => {
            // Filter out knockout matches if group stage is not completed
            const groupMatches = tournament.matches.filter(m => m.round === 'Gruppespill')
            const allGroupMatchesCompleted = groupMatches.length > 0 && 
              groupMatches.every(m => m.status === 'completed')
            const shouldShowKnockout = groupMatches.length === 0 || allGroupMatchesCompleted
            const teamKnockoutMatches = tournament.matches.filter(m => 
              m.round !== 'Gruppespill' && (m.team1 === team.teamName || m.team2 === team.teamName)
            )
            const didNotAdvance = shouldShowKnockout && groupMatches.length > 0 && teamKnockoutMatches.length === 0
            
            // Filter matches based on knockout visibility
            const visibleMatches = shouldShowKnockout 
              ? tournament.matches 
              : tournament.matches.filter(m => m.round === 'Gruppespill')

            const groupedMatches = tournament.matches.filter(m => m.round === 'Gruppespill' && m.group)
            const standingsByGroup = calculateGroupStandings(groupedMatches)
            const teamGroup = groupedMatches.find(m => m.team1 === team.teamName || m.team2 === team.teamName)?.group
            const activeGroup = teamGroup && standingsByGroup[teamGroup]
              ? teamGroup
              : Object.keys(standingsByGroup)[0]
            const activeStandings = activeGroup ? standingsByGroup[activeGroup] : []
            
            const groupRoundMap = buildGroupRoundMap(groupMatches)
            const buildKey = (teamA: string, teamB: string) => [teamA, teamB].sort().join('|')
            const sortedMatches = [...visibleMatches].sort((a, b) => {
              const aIsGroup = a.round === 'Gruppespill'
              const bIsGroup = b.round === 'Gruppespill'
              if (aIsGroup && bIsGroup) {
                const roundA = a.groupRound || groupRoundMap[buildKey(a.team1, a.team2)] || 999
                const roundB = b.groupRound || groupRoundMap[buildKey(b.team1, b.team2)] || 999
                if (roundA !== roundB) return roundA - roundB
              }
              return a.time.localeCompare(b.time)
            })
            
            return (
            <div key={tournament.id} className="pro11-card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{tournament.title}</h2>
                  <p className="text-slate-400 text-sm">
                    {tournament.startDate} - {tournament.endDate}
                  </p>
                </div>
                                 <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-medium ${
                   tournament.status === 'live' ? 'bg-green-600' : 
                   tournament.status === 'completed' ? 'bg-blue-600' : 'bg-yellow-600'
                 }`}>
                   {tournament.status === 'live' ? 'Live' : 
                    tournament.status === 'completed' ? 'Fullført' : 'Kommende'}
                 </span>
              </div>

              <div className="space-y-6">
                {didNotAdvance && (
                  <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-lg md:col-span-2">
                    <p className="text-slate-300 text-sm">
                      Takk for innsatsen! Gruppen er ferdigspilt, og dere gikk ikke videre til sluttspill denne gangen.
                    </p>
                  </div>
                )}
                {!shouldShowKnockout && groupMatches.length > 0 && (
                  <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg md:col-span-2">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ Sluttspillkamper vil bli vist når alle gruppespillkamper er ferdig.
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      Ferdig: {groupMatches.filter(m => m.status === 'completed').length} / {groupMatches.length} kamper
                    </p>
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2 md:gap-4 md:items-start">
                  {sortedMatches.map(match => (
                    <div key={match.id} className="min-w-0 flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 md:p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center">
                          <span className="font-medium break-words">{match.team1}</span>
                          <span className="text-slate-400 mx-2">{'\u00a0vs\u00a0'}</span>
                          <span className="font-medium break-words">{match.team2}</span>
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                          {match.time} • {match.round}
                          {match.round === 'Gruppespill' && (match.groupRound || groupRoundMap[buildKey(match.team1, match.team2)]) && (
                            <> • Runde {match.groupRound || groupRoundMap[buildKey(match.team1, match.team2)]}</>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-row flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch md:flex-wrap md:justify-end md:gap-4">
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-medium ${getMatchStatusColor(match.status)}`}>
                          {getMatchStatusText(match.status)}
                        </span>
                        
                        {match.status === 'completed' && (
                          <div className="text-sm font-medium px-4 py-2 bg-slate-700/50 rounded">
                            {match.score1} - {match.score2}
                          </div>
                        )}
                        
                        {match.status === 'pending_confirmation' && match.opponentSubmittedScore1 !== null && match.opponentSubmittedScore2 !== null && (
                          <div className="text-sm font-medium px-4 py-2 bg-orange-700/50 rounded">
                            {match.opponentSubmittedScore1} - {match.opponentSubmittedScore2}
                          </div>
                        )}
                        
                        <div className="flex flex-row flex-wrap items-center gap-2 max-sm:flex-col md:justify-end">
                          {match.canSubmitResult && (
                            <button
                              onClick={() => openResultModal(match)}
                              className="pro11-button-secondary flex items-center space-x-1 text-xs px-3 py-1.5 max-sm:w-full justify-center"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Legg inn resultat</span>
                            </button>
                          )}
                          
                          {match.canConfirmResult && match.submittedBy && match.submittedBy !== team.teamName && (
                            <>
                              <button
                                onClick={() => confirmResult(match)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors max-sm:w-full"
                              >
                                Bekreft
                              </button>
                              <button
                                onClick={() => rejectResult(match)}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors max-sm:w-full"
                              >
                                Avvis
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {activeStandings.length > 0 && (
                  <div className="pro11-card p-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">
                      Tabell {activeGroup ? `• ${activeGroup}` : ''}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="text-left py-2">Lag</th>
                            <th className="text-center py-2">K</th>
                            <th className="text-center py-2">M+</th>
                            <th className="text-center py-2">M-</th>
                            <th className="text-center py-2">P</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeStandings.map(row => (
                            <tr key={row.team} className="border-t border-slate-700/50">
                              <td className="py-2 text-slate-200">{row.team}</td>
                              <td className="py-2 text-center text-slate-300">{row.played}</td>
                              <td className="py-2 text-center text-slate-300">{row.goalsFor}</td>
                              <td className="py-2 text-center text-slate-300">{row.goalsAgainst}</td>
                              <td className="py-2 text-center font-semibold text-blue-400">{row.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )
          })}

          {tournaments.length === 0 && (
            <div className="pro11-card p-8 text-center">
              <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ingen aktive turneringer</h3>
              <p className="text-slate-300 mb-4">
                Du har ingen turneringer å administrere for øyeblikket.
              </p>
              <Link href="/tournaments" className="pro11-button flex items-center space-x-2 mx-auto w-fit">
                <span>Se alle turneringer</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Result Modal */}
      {showResultModal && selectedMatch && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowResultModal(false)}
        >
          <div 
            className="pro11-card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Legg inn resultat</h2>
              <button
                onClick={() => setShowResultModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-slate-300 mb-2">{selectedMatch.team1} vs {selectedMatch.team2}</p>
                <p className="text-sm text-slate-400">{selectedMatch.round} • {selectedMatch.time}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {selectedMatch.team1} mål
                  </label>
                  <input
                    type="number"
                    value={resultScore1}
                    onChange={(e) => setResultScore1(parseInt(e.target.value) || 0)}
                    className="pro11-input text-center"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {selectedMatch.team2} mål
                  </label>
                  <input
                    type="number"
                    value={resultScore2}
                    onChange={(e) => setResultScore2(parseInt(e.target.value) || 0)}
                    className="pro11-input text-center"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={submitResult}
                  className="pro11-button flex items-center space-x-2 flex-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Send inn</span>
                </button>
                <button
                  onClick={() => setShowResultModal(false)}
                  className="pro11-button-secondary flex items-center space-x-2 flex-1"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Avbryt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 