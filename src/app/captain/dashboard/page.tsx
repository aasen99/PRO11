'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Shield, Trophy, Users, Calendar, Edit, CheckCircle, XCircle, ArrowRight, LogOut } from 'lucide-react'
import Toast, { ToastContainer } from '@/components/Toast'
import type { ToastType } from '@/components/Toast'
import { useLanguage } from '@/components/LanguageProvider'

interface Team {
  id: string
  teamName: string
  captainEmail: string
  captainName: string
  discordUsername?: string
  tournaments: string[]
  tournamentId?: string
  expectedPlayers?: number
  paymentStatus?: string
}

interface Match {
  id: string
  team1: string
  team2: string
  score1: number
  score2: number
  status: 'scheduled' | 'live' | 'completed' | 'pending_result' | 'pending_confirmation'
  time: string
  scheduledTime?: string | null
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
  opponentDiscordUsername?: string | null
}

interface Tournament {
  id: string
  title: string
  status: 'upcoming' | 'live' | 'completed'
  matches: Match[]
  allMatches?: Match[]
  startDate: string
  endDate: string
  position?: number
  totalTeams?: number
  checkInOpen?: boolean
  captainCheckedIn?: boolean
  captainTeamId?: string
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
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const previousMatchesRef = useRef<Match[]>([])
  const { language } = useLanguage()
  const isEnglish = language === 'en'
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)
  const locale = isEnglish ? 'en-US' : 'nb-NO'

  const translateRoundName = (round?: string) => {
    if (!round) return ''
    if (!isEnglish) return round
    const map: Record<string, string> = {
      'Gruppespill': 'Group stage',
      'Sluttspill': 'Knockout',
      'Kvartfinale': 'Quarterfinal',
      'Kvartfinaler': 'Quarterfinals',
      'Semifinale': 'Semifinal',
      'Semifinaler': 'Semifinals',
      'Finale': 'Final',
      'Åttendelsfinaler': 'Round of 16',
      '16-delsfinaler': 'Round of 32'
    }
    return map[round] || round
  }

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

      const refreshPaymentStatus = async () => {
        if (parsedTeam.paymentStatus) return
        try {
          const response = await fetch('/api/teams')
          if (!response.ok) return
          const data = await response.json()
          const freshTeam = (data.teams || []).find((t: any) => t.id === parsedTeam.id)
          if (!freshTeam) return

          const updatedTeam = {
            ...parsedTeam,
            paymentStatus: freshTeam.paymentStatus || freshTeam.payment_status || parsedTeam.paymentStatus,
            expectedPlayers: freshTeam.expectedPlayers || freshTeam.expected_players || parsedTeam.expectedPlayers || 0,
            tournamentId: freshTeam.tournamentId || freshTeam.tournament_id || parsedTeam.tournamentId || parsedTeam.tournaments?.[0] || ''
          }

          setTeam(updatedTeam)
          localStorage.setItem('captainTeam', JSON.stringify(updatedTeam))
        } catch (error) {
          console.error('Error refreshing team payment status:', error)
        }
      }
      
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
              bestFinish: t('Ingen', 'None'),
              currentRanking: 0
            })
            return
          }
          
          // Hent hver turnering med kamper
          const tournamentPromises = tournamentIds.map(async (tournamentId: string) => {
            try {
              const [tournamentResponse, matchesResponse, teamsResponse] = await Promise.all([
                fetch(`/api/tournaments?id=${tournamentId}`),
                fetch(`/api/matches?tournament_id=${tournamentId}`),
                fetch(`/api/teams?tournamentId=${tournamentId}`)
              ])
              
              let tournament = null
              let matches: Match[] = []
              let allMatches: Match[] = []
              let teamDiscordByName: Record<string, string> = {}
              let captainTeamId: string | null = null
              let captainCheckedIn = false
              
              if (tournamentResponse.ok) {
                const data = await tournamentResponse.json()
                tournament = data.tournament
              }

              if (teamsResponse.ok) {
                const teamsData = await teamsResponse.json()
                teamDiscordByName = (teamsData.teams || []).reduce((acc: Record<string, string>, team: any) => {
                  const name = team.teamName || team.team_name
                  if (name) {
                    acc[name] = team.discordUsername || team.discord_username || ''
                  }
                  return acc
                }, {})

                const matchingTeam = (teamsData.teams || []).find((team: any) => {
                  const name = team.teamName || team.team_name
                  const email = team.captainEmail || team.captain_email
                  const teamTournamentId = team.tournamentId || team.tournament_id
                  return name === parsedTeam.teamName && email === parsedTeam.captainEmail && teamTournamentId === tournamentId
                })
                if (matchingTeam) {
                  captainTeamId = matchingTeam.id
                  captainCheckedIn = matchingTeam.checkedIn ?? matchingTeam.checked_in ?? false
                }
              }
              
              if (matchesResponse.ok) {
                const matchesData = await matchesResponse.json()
                const rawMatches = matchesData.matches || []

                allMatches = rawMatches.map((m: any) => ({
                  id: m.id,
                  team1: m.team1_name,
                  team2: m.team2_name,
                  score1: m.score1 ?? 0,
                  score2: m.score2 ?? 0,
                  status: m.status as 'scheduled' | 'live' | 'completed' | 'pending_result' | 'pending_confirmation',
                  time: m.scheduled_time ? new Date(m.scheduled_time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '',
                  scheduledTime: m.scheduled_time ?? null,
                  round: m.round,
                  group: m.group_name || undefined,
                  groupRound: m.group_round ?? undefined,
                  tournamentId: m.tournament_id,
                  canSubmitResult: false,
                  submittedBy: m.submitted_by || null,
                  submittedScore1: null,
                  submittedScore2: null,
                  opponentSubmittedScore1: null,
                  opponentSubmittedScore2: null,
                  canConfirmResult: false,
                  opponentDiscordUsername: null
                }))

                matches = rawMatches.map((m: any) => {
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
                  const opponentTeamName = isTeam1 ? m.team2_name : m.team1_name
                  const opponentDiscordUsername = teamDiscordByName[opponentTeamName] || null

                  return {
                    id: m.id,
                    team1: m.team1_name,
                    team2: m.team2_name,
                    score1: m.score1 || 0,
                    score2: m.score2 || 0,
                    status: m.status as 'scheduled' | 'live' | 'completed' | 'pending_result' | 'pending_confirmation',
                    time: m.scheduled_time ? new Date(m.scheduled_time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '',
                    scheduledTime: m.scheduled_time ?? null,
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
                    canConfirmResult: canConfirm,
                    opponentDiscordUsername
                  }
                }).filter((match: Match | null): match is Match => match !== null)
              }
              
              return tournament ? { tournament, matches, allMatches, captainTeamId, captainCheckedIn } : null
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
              const allMatches = t.allMatches || []
              const groupMatches = allMatches.filter((m: Match) => m.round === 'Gruppespill')
              const knockoutMatches = allMatches.filter((m: Match) => m.round !== 'Gruppespill')
              
              // Check if all group stage matches are completed
              const allGroupMatchesCompleted = groupMatches.length > 0 && 
                groupMatches.every((m: Match) => m.status === 'completed')
              
              // Only show knockout matches if group stage is complete or if there are no group matches
              const shouldShowKnockout = groupMatches.length === 0 || allGroupMatchesCompleted
              
              // Filter matches based on knockout visibility
              const filteredMatches = shouldShowKnockout 
                ? t.matches || []
                : (t.matches || []).filter((m: Match) => m.round === 'Gruppespill')
              
              return {
                id: tournament.id,
                title: tournament.title,
                status: tournament.status === 'active' ? 'live' : tournament.status === 'completed' ? 'completed' : 'upcoming',
                startDate: startDate.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
                endDate: endDate.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
                position: 0, // TODO: Calculate position from standings
                totalTeams: tournament.max_teams,
                matches: filteredMatches,
                allMatches,
                checkInOpen: tournament.check_in_open ?? false,
                captainCheckedIn: t.captainCheckedIn ?? false,
                captainTeamId: t.captainTeamId ?? undefined
              }
          })
          
          setTournaments(transformedTournaments)
          if (!selectedTournamentId) {
            const liveTournament = transformedTournaments.find(t => t.status === 'live')
            if (liveTournament) {
              setSelectedTournamentId(liveTournament.id)
            }
          }
          
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
                message: t(
                  `${opponentName} har sendt inn resultat: ${opponentScore} - ${myScore}. Bekreft eller avvis resultatet.`,
                  `${opponentName} submitted a result: ${opponentScore} - ${myScore}. Confirm or reject the result.`
                ),
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
      refreshPaymentStatus()
      
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
    let bestFinish = t('Ingen', 'None')
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
          if (tournament.position === 1) bestFinish = t('Vinner', 'Winner')
          else if (tournament.position <= 4) bestFinish = t('Semifinale', 'Semifinal')
          else if (tournament.position <= 8) bestFinish = t('Kvartfinale', 'Quarterfinal')
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
        const isAHome = match.team1 === teamA && match.team2 === teamB
        const isBHome = match.team1 === teamB && match.team2 === teamA
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
        const groupMatches = matches.filter(match => match.round === 'Gruppespill' && match.group === group)
        const sorted = Object.values(rows).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points
          const diffA = a.goalsFor - a.goalsAgainst
          const diffB = b.goalsFor - b.goalsAgainst
          if (diffB !== diffA) return diffB - diffA
          if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
          return getHeadToHeadComparison(a.team, b.team, groupMatches)
        })
        return [group, sorted]
      })
    )
  }

  const getFormSummary = (matches: Match[], teamName: string, limit = 5) => {
    const completed = matches.filter(match =>
      match.status === 'completed' &&
      (match.team1 === teamName || match.team2 === teamName)
    )

    const sorted = completed.sort((a, b) => {
      const timeA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : 0
      const timeB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : 0
      return timeA - timeB
    })

    return sorted.slice(-limit).map(match => {
      const teamIsHome = match.team1 === teamName
      const teamScore = teamIsHome ? match.score1 : match.score2
      const oppScore = teamIsHome ? match.score2 : match.score1
      if (teamScore > oppScore) return 'V'
      if (teamScore < oppScore) return 'T'
      return 'U'
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('captainTeam')
    window.location.href = '/captain/login'
  }

  const handlePaymentRedirect = () => {
    if (!team) return
    const tournamentId = team.tournamentId || team.tournaments?.[0]
    if (!tournamentId) {
      alert(t('Mangler turneringsinformasjon for betaling. Kontakt administrator.', 'Missing tournament information for payment. Contact an administrator.'))
      return
    }

    const registrationData = {
      teamName: team.teamName,
      captainName: team.captainName,
      captainEmail: team.captainEmail,
      expectedPlayers: team.expectedPlayers || 0,
      tournamentId,
      teamId: team.id
    }

    localStorage.setItem('teamRegistration', JSON.stringify(registrationData))
    window.location.href = '/payment'
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
      alert(t('Du er ikke del av denne kampen.', 'You are not part of this match.'))
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
        alert(t(`Feil ved innsending av resultat: ${error.error || 'Ukjent feil'}`, `Error submitting result: ${error.error || 'Unknown error'}`))
        return
      }

      const result = await response.json()
      const updatedMatch = result.match

      // Check if match was automatically completed (both teams submitted matching results)
      if (updatedMatch.status === 'completed') {
        alert(t(
          `Resultat bekreftet og fullført: ${selectedMatch.team1} ${updatedMatch.score1} - ${updatedMatch.score2} ${selectedMatch.team2}\n\nBegge lag har bekreftet samme resultat.`,
          `Result confirmed and completed: ${selectedMatch.team1} ${updatedMatch.score1} - ${updatedMatch.score2} ${selectedMatch.team2}\n\nBoth teams confirmed the same result.`
        ))
      } else {
    alert(t(
      `Resultat innsendt: ${selectedMatch.team1} ${resultScore1} - ${resultScore2} ${selectedMatch.team2}\n\nVenter på bekreftelse fra motstanderlaget.`,
      `Result submitted: ${selectedMatch.team1} ${resultScore1} - ${resultScore2} ${selectedMatch.team2}\n\nWaiting for opponent confirmation.`
    ))
      }
      
    setShowResultModal(false)
      
      // Reload page to get updated match status
      window.location.reload()
    } catch (error) {
      console.error('Error submitting result:', error)
      alert(t('Noe gikk galt ved innsending av resultat. Prøv igjen.', 'Something went wrong submitting the result. Please try again.'))
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
        alert(t(`Kunne ikke oppdatere Discord: ${error.error || 'Ukjent feil'}`, `Could not update Discord: ${error.error || 'Unknown error'}`))
        return
      }

      const result = await response.json()
      const updatedTeam = { ...team, discordUsername: result.team?.discordUsername || discordUsername.trim() }
      setTeam(updatedTeam)
      localStorage.setItem('captainTeam', JSON.stringify(updatedTeam))
      addToast({ message: t('Discord-brukernavn oppdatert.', 'Discord username updated.'), type: 'success' })
      setShowDiscordEditor(false)
    } catch (error) {
      console.error('Error updating discord username:', error)
      alert(t('Noe gikk galt ved oppdatering av Discord-brukernavn.', 'Something went wrong updating the Discord username.'))
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
      alert(t('Du er ikke del av denne kampen.', 'You are not part of this match.'))
      return
    }

    // Get opponent's submitted result from the match data
    // We need to fetch the latest match data to get the correct submitted scores
    try {
      const matchResponse = await fetch(`/api/matches?tournament_id=${match.tournamentId}`)
      if (!matchResponse.ok) {
        alert(t('Kunne ikke hente kampdata. Prøv igjen.', 'Could not fetch match data. Please try again.'))
        return
      }
      
      const matchesData = await matchResponse.json()
      const currentMatch = matchesData.matches?.find((m: any) => m.id === match.id)
      
      if (!currentMatch) {
        alert(t('Kamp ikke funnet.', 'Match not found.'))
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
        alert(t('Motstanderens resultat ikke funnet. Prøv å oppdatere siden.', 'Opponent result not found. Try refreshing the page.'))
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
        alert(t(`Feil ved bekreftelse av resultat: ${error.error || 'Ukjent feil'}`, `Error confirming result: ${error.error || 'Unknown error'}`))
        return
      }

      const result = await response.json()
      const updatedMatch = result.match

      // Check if match was automatically completed (both teams submitted matching results)
      if (updatedMatch.status === 'completed') {
        alert(t(
          `Resultat bekreftet og fullført: ${match.team1} ${updatedMatch.score1} - ${updatedMatch.score2} ${match.team2}\n\nBegge lag har bekreftet samme resultat.`,
          `Result confirmed and completed: ${match.team1} ${updatedMatch.score1} - ${updatedMatch.score2} ${match.team2}\n\nBoth teams confirmed the same result.`
        ))
      } else {
        alert(t(
          `Resultat sendt inn: ${match.team1} ${myScore} - ${opponentScore} ${match.team2}\n\nHvis resultatene ikke matcher, vil admin se på det.`,
          `Result submitted: ${match.team1} ${myScore} - ${opponentScore} ${match.team2}\n\nIf results do not match, admin will review it.`
        ))
      }
      
      // Reload page to get updated match status
      window.location.reload()
    } catch (error) {
      console.error('Error confirming result:', error)
      alert(t('Noe gikk galt ved bekreftelse av resultat. Prøv igjen.', 'Something went wrong confirming the result. Please try again.'))
    }
  }

  const rejectResult = async (match: Match) => {
    if (!team) return

    if (!confirm(t('Er du sikker på at du vil avvise dette resultatet? Begge lag må legge inn resultatet på nytt.', 'Are you sure you want to reject this result? Both teams must submit the result again.'))) {
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
        alert(t(`Feil ved avvisning av resultat: ${error.error || 'Ukjent feil'}`, `Error rejecting result: ${error.error || 'Unknown error'}`))
        return
      }

      const result = await response.json()
      console.log('Reject result success:', result)

    alert(t('Resultat avvist. Begge lag må legge inn resultatet på nytt.', 'Result rejected. Both teams must submit the result again.'))
      
      // Reload page to get updated match status
      window.location.reload()
    } catch (error) {
      console.error('Error rejecting result:', error)
      alert(t('Noe gikk galt ved avvisning av resultat. Prøv igjen.', 'Something went wrong rejecting the result. Please try again.'))
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
        return t('Planlagt', 'Scheduled')
      case 'live':
        return t('Live', 'Live')
      case 'completed':
        return t('Ferdig', 'Finished')
      case 'pending_result':
        return t('Venter resultat', 'Waiting for result')
      case 'pending_confirmation':
        return t('Venter bekreftelse', 'Waiting for confirmation')
      default:
        return t('Ukjent', 'Unknown')
    }
  }

    const handleCheckIn = async (teamId: string, tournamentId: string) => {
    try {
      const response = await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: teamId,
            checkedIn: true,
            tournamentId,
            teamName: team?.teamName,
            captainEmail: team?.captainEmail
          })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(t(`Kunne ikke sjekke inn: ${error.error || 'Ukjent feil'}`, `Could not check in: ${error.error || 'Unknown error'}`))
        return
      }

        const shouldUpdate = response.ok
        setTournaments(prev =>
          prev.map(tournament =>
            tournament.id === tournamentId
              ? { ...tournament, captainCheckedIn: shouldUpdate ? true : tournament.captainCheckedIn }
              : tournament
          )
        )
    } catch (error) {
      console.error('Check-in error:', error)
      alert(t('Noe gikk galt ved innsjekk.', 'Something went wrong during check-in.'))
    }
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">{t('Laster...', 'Loading...')}</p>
        </div>
      </div>
    )
  }

  const liveTournaments = tournaments.filter(t => t.status === 'live')
  const allMatchesForForm = tournaments.flatMap(t => t.matches)
  const formResults = getFormSummary(allMatchesForForm, team.teamName)

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
              <p className="text-slate-400 text-sm">{t('Lagleder Dashboard', 'Captain Dashboard')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-blue-400 text-sm">{team.teamName}</span>
            <button
              onClick={handleLogout}
              className="pro11-button-secondary flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('Logg ut', 'Log out')}</span>
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
                <h1 className="text-2xl font-bold mb-2">
                  {t('Velkommen', 'Welcome')}, {team.captainName}!
                </h1>
                <p className="text-slate-300">
                  {t(
                    `Her kan du administrere ${team.teamName} og legge inn resultater for dine kamper.`,
                    `Here you can manage ${team.teamName} and submit results for your matches.`
                  )}
                </p>
              </div>
              {team.discordUsername && (
                <button
                  type="button"
                  onClick={() => setShowDiscordEditor(true)}
                  className="flex items-center space-x-2 text-slate-400 text-sm hover:text-slate-200 transition-colors"
                  style={{ background: 'transparent', border: 'none', padding: 0 }}
                  title={t('Rediger Discord-brukernavn', 'Edit Discord username')}
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

          {team.paymentStatus !== 'completed' && (
            <div className="pro11-card p-6 mb-6 border border-yellow-600/40 bg-yellow-900/10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-2">{t('Betaling ikke fullført', 'Payment not completed')}</h2>
                  <p className="text-slate-300">
                    {t('Registreringen er ikke aktiv før betalingen er gjennomført.', 'Registration is not active until payment is completed.')}
                  </p>
                </div>
                <button
                  onClick={handlePaymentRedirect}
                  className="pro11-button-secondary w-full md:w-auto"
                >
                  {t('Fullfør betaling', 'Complete payment')}
                </button>
              </div>
            </div>
          )}

          {(showDiscordEditor || !team.discordUsername) && (
            <div className="pro11-card p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">{t('Lagleder', 'Captain')}</h2>
              <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('Discord brukernavn', 'Discord username')}</label>
                  <input
                    type="text"
                    value={discordUsername}
                    onChange={(e) => setDiscordUsername(e.target.value)}
                    className="pro11-input w-full"
                    placeholder={t('f.eks. brukernavn#1234', 'e.g. username#1234')}
                  />
                </div>
                <button
                  onClick={saveDiscordUsername}
                  disabled={isSavingDiscord}
                  className="pro11-button-secondary"
                >
                  {isSavingDiscord ? t('Lagrer...', 'Saving...') : t('Lagre', 'Save')}
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions for Active Tournaments */}
          {liveTournaments.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="pro11-card p-6 md:p-8 w-full text-center">
                <h2 className="text-xl font-bold mb-4">{t('Hurtig-handlinger', 'Quick actions')}</h2>
                <div className="grid grid-cols-1 gap-6">
                  {liveTournaments.map(tournament => {
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
                      <div key={tournament.id} className="p-4 md:p-5 bg-slate-800/50 rounded-lg w-full">
                        <h3 className="font-semibold mb-3 text-center">{tournament.title}</h3>
                        <div className="space-y-2">
                          {nextMatch ? (
                            <div key={nextMatch.id} className="p-3 md:p-4 bg-slate-700/30 rounded w-full">
                              <div className="flex flex-col gap-2 items-center">
                                <div className="text-sm font-medium">
                                  {nextMatch.team1} vs {nextMatch.team2}
                                </div>
                                <div className="text-xs text-slate-400 md:text-sm">
                                  {translateRoundName(nextMatch.round)}
                                  {nextMatch.round === 'Gruppespill' && (
                                    <>
                                      {nextMatch.groupRound || groupRoundMap[buildKey(nextMatch.team1, nextMatch.team2)] ? (
                                        <> • {t('Runde', 'Round')} {nextMatch.groupRound || groupRoundMap[buildKey(nextMatch.team1, nextMatch.team2)]}</>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400 md:text-sm">
                                  {nextMatch.opponentDiscordUsername || t('Motstanders discord ikke registrert', 'Opponent Discord not registered')}
                                </div>
                                <div className="text-xs md:text-sm text-slate-300">
                                  {nextMatch.canConfirmResult &&
                                    nextMatch.opponentSubmittedScore1 !== null &&
                                    nextMatch.opponentSubmittedScore2 !== null && (
                                      <>{t('Innsendt', 'Submitted')}: {nextMatch.opponentSubmittedScore1} - {nextMatch.opponentSubmittedScore2}</>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {nextMatch.canSubmitResult && (
                                    <button
                                      onClick={() => openResultModal(nextMatch)}
                                      className="pro11-button-secondary text-xs px-3 py-1"
                                    >
                                      <Edit className="w-3 h-3 mr-1" />
                                      {t('Legg inn', 'Submit')}
                                    </button>
                                  )}
                                  {nextMatch.canConfirmResult && (
                                    <>
                                      <button
                                        onClick={() => confirmResult(nextMatch)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                      >
                                        {t('Bekreft', 'Confirm')}
                                      </button>
                                      {nextMatch.submittedBy && nextMatch.submittedBy !== team.teamName && (
                                        <button
                                          onClick={() => rejectResult(nextMatch)}
                                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                        >
                                          {t('Avvis', 'Reject')}
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-slate-400 text-center py-2">
                              {t('Ingen ventende handlinger', 'No pending actions')}
                            </div>
                          )}
                          {tournament.checkInOpen && !tournament.captainCheckedIn && tournament.captainTeamId && (
                            <div className="flex justify-center">
                              <button
                                onClick={() => handleCheckIn(tournament.captainTeamId as string, tournament.id)}
                                className="pro11-button-secondary text-xs px-3 py-1"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {t('Sjekk inn', 'Check in')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="pro11-card p-6 md:p-8 w-full">
                <h2 className="text-xl font-bold mb-4">{t('Lagleder verktøy', 'Captain tools')}</h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-slate-400 mb-2">{t('Form (siste 5)', 'Form (last 5)')}</div>
                    <div className="flex flex-wrap gap-2">
                      {formResults.length > 0 ? (
                        formResults.map((result, index) => (
                          <span
                            key={`${result}-${index}`}
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              result === 'V' ? 'bg-green-600/20 text-green-400' :
                              result === 'U' ? 'bg-yellow-600/20 text-yellow-400' :
                              'bg-red-600/20 text-red-400'
                            }`}
                          >
                            {result}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">{t('Ingen ferdige kamper', 'No completed matches')}</span>
                      )}
                    </div>
                  </div>

                  {liveTournaments.length > 1 && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-2">{t('Turnering', 'Tournament')}</label>
                      <select
                        value={selectedTournamentId}
                        onChange={(e) => setSelectedTournamentId(e.target.value)}
                        className="pro11-input w-full"
                      >
                        {liveTournaments.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Link href="/rules" className="pro11-button-secondary text-sm text-center w-full sm:w-auto">
                      {t('Regler', 'Rules')}
                    </Link>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Team Statistics */}
          {teamStats && (
            <div className="pro11-card p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">{t('Lagstatistikk', 'Team statistics')}</h2>
              <div className="flex items-center justify-center space-x-8 mb-6">
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">{teamStats.wins}</div>
                  <div className="text-sm text-slate-400">{t('Seiere', 'Wins')}</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-red-400">{teamStats.losses}</div>
                  <div className="text-sm text-slate-400">{t('Tap', 'Losses')}</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">{teamStats.draws}</div>
                  <div className="text-sm text-slate-400">{t('Uavgjort', 'Draws')}</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{teamStats.tournamentsPlayed}</div>
                  <div className="text-sm text-slate-400">{t('Turneringer spilt', 'Tournaments played')}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h3 className="font-semibold mb-2">{t('Målstatistikk', 'Goal stats')}</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t('Mål for:', 'Goals for:')}</span>
                      <span className="font-medium">{teamStats.goalsFor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t('Mål mot:', 'Goals against:')}</span>
                      <span className="font-medium">{teamStats.goalsAgainst}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t('Målforskjell:', 'Goal difference:')}</span>
                      <span className={`font-medium ${teamStats.goalsFor - teamStats.goalsAgainst >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {teamStats.goalsFor - teamStats.goalsAgainst > 0 ? '+' : ''}{teamStats.goalsFor - teamStats.goalsAgainst}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h3 className="font-semibold mb-2">{t('Prestasjoner', 'Performance')}</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t('Beste plassering:', 'Best finish:')}</span>
                      <span className="font-medium">{teamStats.bestFinish}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t('Nåværende rangering:', 'Current ranking:')}</span>
                      <span className="font-medium">{teamStats.currentRanking || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h3 className="font-semibold mb-2">{t('Vinnprosent', 'Win rate')}</h3>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">
                      {teamStats.wins + teamStats.losses + teamStats.draws > 0 
                        ? Math.round((teamStats.wins / (teamStats.wins + teamStats.losses + teamStats.draws)) * 100)
                        : 0}%
                    </div>
                    <div className="text-sm text-slate-400">
                      {teamStats.wins} {t('av', 'of')} {teamStats.wins + teamStats.losses + teamStats.draws} {t('kamper', 'matches')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tournament History */}
          <div className="pro11-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t('Turneringshistorikk', 'Tournament history')}</h2>
              <button
                type="button"
                onClick={() => setShowHistory(prev => !prev)}
                className="pro11-button-secondary text-xs px-3 py-1"
              >
                {showHistory ? t('Skjul historikk', 'Hide history') : t('Vis historikk', 'Show history')}
              </button>
            </div>
            {showHistory && (
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
                        <div className="text-xs text-slate-400">{t('av', 'of')} {tournament.totalTeams}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-green-400">
                          {tournament.matches.filter(m => m.status === 'completed').length} {t('kamper', 'matches')}
                        </div>
                        <div className="text-xs text-slate-400">{t('spilt', 'played')}</div>
                      </div>
                      <Trophy className={`w-6 h-6 ${tournament.position === 1 ? 'text-yellow-400' : 'text-slate-400'}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Tournaments */}
          {(() => {
            const hasActive = tournaments.some(t => t.status === 'live' || t.status === 'upcoming')
            const visibleTournaments = tournaments.filter(t =>
              t.status === 'live' || t.status === 'upcoming' || (!hasActive && t.status === 'completed')
            )
            return visibleTournaments
          })().map(tournament => {
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

            const groupedMatches = (tournament.allMatches || tournament.matches).filter(m => m.round === 'Gruppespill' && m.group)
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
                   {tournament.status === 'live' ? t('Live', 'Live') : 
                    tournament.status === 'completed' ? t('Fullført', 'Completed') : t('Kommende', 'Upcoming')}
                 </span>
              </div>

              <div className="space-y-6">
                {tournament.checkInOpen && !tournament.captainCheckedIn && tournament.captainTeamId && (
                  <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg md:col-span-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <p className="text-blue-300 text-sm">
                        {t(
                          '⚠️ Innsjekk er åpen. Sjekk inn laget ditt for å bli med i trekningen.',
                          '⚠️ Check-in is open. Check in your team to be included in the draw.'
                        )}
                      </p>
                      <button
                        onClick={() => handleCheckIn(tournament.captainTeamId as string, tournament.id)}
                        className="pro11-button-secondary text-sm"
                      >
                        {t('Sjekk inn', 'Check in')}
                      </button>
                    </div>
                  </div>
                )}
                {didNotAdvance && (
                  <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-lg md:col-span-2">
                    <p className="text-slate-300 text-sm">
                      {t(
                        'Takk for innsatsen! Gruppen er ferdigspilt, og dere gikk ikke videre til sluttspill denne gangen.',
                        'Thanks for the effort! The group stage is complete, and you did not advance to the knockout this time.'
                      )}
                    </p>
                  </div>
                )}
                {!shouldShowKnockout && groupMatches.length > 0 && (
                  <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg md:col-span-2">
                    <p className="text-yellow-400 text-sm">
                      {t(
                        '⚠️ Sluttspillkamper vil bli vist når alle gruppespillkamper er ferdig.',
                        '⚠️ Knockout matches will be shown when all group stage matches are completed.'
                      )}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      {t('Ferdig', 'Completed')}: {groupMatches.filter(m => m.status === 'completed').length} / {groupMatches.length} {t('kamper', 'matches')}
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
                          {match.time} • {translateRoundName(match.round)}
                          {match.round === 'Gruppespill' && (match.groupRound || groupRoundMap[buildKey(match.team1, match.team2)]) && (
                            <> • {t('Runde', 'Round')} {match.groupRound || groupRoundMap[buildKey(match.team1, match.team2)]}</>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {match.opponentDiscordUsername || t('Motstanders discord ikke registrert', 'Opponent Discord not registered')}
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
                              <span>{t('Legg inn resultat', 'Submit result')}</span>
                            </button>
                          )}
                          
                          {match.canConfirmResult && match.submittedBy && match.submittedBy !== team.teamName && (
                            <>
                              <button
                                onClick={() => confirmResult(match)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors max-sm:w-full"
                              >
                                {t('Bekreft', 'Confirm')}
                              </button>
                              <button
                                onClick={() => rejectResult(match)}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors max-sm:w-full"
                              >
                                {t('Avvis', 'Reject')}
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
                      {t('Tabell', 'Standings')}{' '}
                      {activeGroup ? `• ${isEnglish ? activeGroup.replace('Gruppe', 'Group') : activeGroup}` : ''}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="text-center py-2 w-6">#</th>
                            <th className="text-left py-2">{t('Lag', 'Team')}</th>
                            <th className="text-center py-2">{t('K', 'P')}</th>
                            <th className="text-center py-2">{t('S', 'W')}</th>
                            <th className="text-center py-2">{t('U', 'D')}</th>
                            <th className="text-center py-2">{t('T', 'L')}</th>
                            <th className="text-center py-2">{t('M+', 'GF')}</th>
                            <th className="text-center py-2">{t('M-', 'GA')}</th>
                            <th className="text-center py-2">{t('P', 'Pts')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeStandings.map((row, index) => (
                            <tr key={row.team} className="border-t border-slate-700/50">
                              <td className="py-2 text-center text-slate-400">{index + 1}</td>
                              <td className="py-2 text-slate-200">{row.team}</td>
                              <td className="py-2 text-center text-slate-300">{row.played}</td>
                              <td className="py-2 text-center text-green-400">{row.wins}</td>
                              <td className="py-2 text-center text-yellow-400">{row.draws}</td>
                              <td className="py-2 text-center text-red-400">{row.losses}</td>
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
              <h3 className="text-lg font-semibold mb-2">{t('Ingen aktive turneringer', 'No active tournaments')}</h3>
              <p className="text-slate-300 mb-4">
                {t('Du har ingen turneringer å administrere for øyeblikket.', 'You have no tournaments to manage at the moment.')}
              </p>
              <Link href="/tournaments" className="pro11-button flex items-center space-x-2 mx-auto w-fit">
                <span>{t('Se alle turneringer', 'See all tournaments')}</span>
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
              <h2 className="text-xl font-bold">{t('Legg inn resultat', 'Submit result')}</h2>
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
                <p className="text-sm text-slate-400">{translateRoundName(selectedMatch.round)} • {selectedMatch.time}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {selectedMatch.team1} {t('mål', 'goals')}
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
                    {selectedMatch.team2} {t('mål', 'goals')}
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
                  <span>{t('Send inn', 'Submit')}</span>
                </button>
                <button
                  onClick={() => setShowResultModal(false)}
                  className="pro11-button-secondary flex items-center space-x-2 flex-1"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{t('Avbryt', 'Cancel')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 