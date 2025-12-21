'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Trophy, Users, Calendar, Edit, CheckCircle, XCircle, ArrowRight, LogOut } from 'lucide-react'

interface Team {
  id: string
  teamName: string
  captainEmail: string
  captainName: string
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
  tournamentId: string
  canSubmitResult: boolean
  submittedBy: string | null
  submittedScore1: number | null
  submittedScore2: number | null
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

export default function CaptainDashboardPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [resultScore1, setResultScore1] = useState(0)
  const [resultScore2, setResultScore2] = useState(0)

  useEffect(() => {
    // Hent lag-data fra localStorage
    const teamData = localStorage.getItem('captainTeam')
    if (teamData) {
      const parsedTeam = JSON.parse(teamData)
      setTeam(parsedTeam)
      
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
                  const canSubmit = (m.status === 'scheduled' || m.status === 'live' || m.status === 'pending_result') && 
                                    m.submitted_by !== parsedTeam.teamName
                  
                  // Determine if this team can confirm (opponent has submitted, waiting for confirmation)
                  const canConfirm = m.status === 'pending_confirmation' && 
                                     m.submitted_by && 
                                     m.submitted_by !== parsedTeam.teamName
                  
                  return {
                    id: m.id,
                    team1: m.team1_name,
                    team2: m.team2_name,
                    score1: m.score1 || 0,
                    score2: m.score2 || 0,
                    status: m.status as 'scheduled' | 'live' | 'completed' | 'pending_result' | 'pending_confirmation',
                    time: m.scheduled_time ? new Date(m.scheduled_time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : '',
                    round: m.round,
                    tournamentId: m.tournament_id,
                    canSubmitResult: canSubmit,
                    submittedBy: m.submitted_by || null,
                    submittedScore1: m.submitted_score1 || null,
                    submittedScore2: m.submitted_score2 || null,
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
            
            return {
              id: tournament.id,
              title: tournament.title,
              status: tournament.status === 'active' ? 'live' : tournament.status === 'completed' ? 'completed' : 'upcoming',
              startDate: startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }),
              endDate: endDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }),
              position: 0, // TODO: Calculate position from standings
              totalTeams: tournament.max_teams,
              matches: t.matches || []
            }
          })
          
          setTournaments(transformedTournaments)
          
          // Beregn lagstatistikk (foreløpig tom siden vi ikke har matches)
          const stats = calculateTeamStats(transformedTournaments, parsedTeam.teamName)
          setTeamStats(stats)
        } catch (error) {
          console.error('Error loading tournaments:', error)
          setTournaments([])
        }
      }
      
      loadTournaments()
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
      // Send resultat til API
      // If team1 is submitting: resultScore1 is their score, resultScore2 is opponent's score
      // If team2 is submitting: resultScore1 is their score (which is team2's perspective), resultScore2 is opponent's score
      const response = await fetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedMatch.id,
          team_name: team.teamName,
          team_score1: resultScore1, // This team's score
          team_score2: resultScore2   // Opponent's score
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

  const confirmResult = async (match: Match) => {
    if (!match.submittedScore1 || !match.submittedScore2 || !team) return

    // When confirming, the team needs to submit their own result
    // If it matches the opponent's result, the match will be automatically completed
    // If it doesn't match, it will wait for admin review
    const isTeam1 = match.team1 === team.teamName
    const isTeam2 = match.team2 === team.teamName
    
    if (!isTeam1 && !isTeam2) {
      alert('Du er ikke del av denne kampen.')
      return
    }

    // Open the result modal so they can submit their result
    // The API will automatically check if results match when both teams have submitted
    setSelectedMatch(match)
    setResultScore1(match.submittedScore2) // Opponent's score becomes this team's score
    setResultScore2(match.submittedScore1) // This team's score becomes opponent's score
    setShowResultModal(true)
    
    alert('Vennligst send inn ditt eget resultat. Hvis det matcher motstanderens resultat, vil kampen automatisk bli fullført.')
  }

  const rejectResult = async (match: Match) => {
    if (!team) return

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
        alert(`Feil ved avvisning av resultat: ${error.error || 'Ukjent feil'}`)
        return
      }

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
        <div className="max-w-4xl w-full">
          {/* Welcome Section */}
          <div className="pro11-card p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">Velkommen, {team.captainName}!</h1>
            <p className="text-slate-300">
              Her kan du administrere {team.teamName} og legge inn resultater for dine kamper.
            </p>
          </div>

          {/* Quick Actions for Active Tournaments */}
          {tournaments.filter(t => t.status === 'live').length > 0 && (
            <div className="pro11-card p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Hurtig-handlinger</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournaments.filter(t => t.status === 'live').map(tournament => {
                  const pendingMatches = tournament.matches.filter(m => 
                    m.canSubmitResult || m.canConfirmResult
                  )
                  return (
                    <div key={tournament.id} className="p-4 bg-slate-800/50 rounded-lg">
                      <h3 className="font-semibold mb-3">{tournament.title}</h3>
                      <div className="space-y-2">
                        {pendingMatches.length > 0 ? (
                          pendingMatches.map(match => (
                            <div key={match.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                              <div className="flex-1">
                                <div className="text-sm font-medium">
                                  {match.team1} vs {match.team2}
                                </div>
                                <div className="text-xs text-slate-400">{match.round}</div>
                              </div>
                              <div className="flex space-x-2">
                                {match.canSubmitResult && (
                                  <button
                                    onClick={() => openResultModal(match)}
                                    className="pro11-button-secondary text-xs px-3 py-1"
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Legg inn
                                  </button>
                                )}
                                {match.canConfirmResult && match.submittedBy && match.submittedBy !== team.teamName && (
                                  <>
                                    <button
                                      onClick={() => confirmResult(match)}
                                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                    >
                                      Bekreft
                                    </button>
                                    <button
                                      onClick={() => rejectResult(match)}
                                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                    >
                                      Avvis
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
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
          {tournaments.filter(t => t.status === 'live' || t.status === 'upcoming' || t.status === 'completed').map(tournament => (
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

              {/* Matches */}
              <div className="space-y-3">
                {tournament.matches.map(match => (
                  <div key={match.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <span className="font-medium">{match.team1}</span>
                        <span className="text-slate-400">vs</span>
                        <span className="font-medium">{match.team2}</span>
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        {match.time} • {match.round}
                      </div>
                    </div>
                    
                                         <div className="flex items-center space-x-4">
                       <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-medium ${getMatchStatusColor(match.status)}`}>
                         {getMatchStatusText(match.status)}
                       </span>
                       
                       {match.status === 'completed' && (
                         <div className="text-sm font-medium px-4 py-2 bg-slate-700/50 rounded">
                           {match.score1} - {match.score2}
                         </div>
                       )}
                       
                       {match.status === 'pending_confirmation' && match.submittedScore1 !== null && match.submittedScore2 !== null && (
                         <div className="text-sm font-medium px-4 py-2 bg-orange-700/50 rounded">
                           {match.submittedScore1} - {match.submittedScore2}
                         </div>
                       )}
                       
                       <div className="flex items-center space-x-3">
                         {match.canSubmitResult && (
                           <button
                             onClick={() => openResultModal(match)}
                             className="pro11-button-secondary flex items-center space-x-1 text-xs px-3 py-1.5"
                           >
                             <Edit className="w-3 h-3" />
                             <span>Legg inn resultat</span>
                           </button>
                         )}
                         
                         {match.canConfirmResult && match.submittedBy && match.submittedBy !== team.teamName && (
                           <div className="flex space-x-2">
                             <button
                               onClick={() => confirmResult(match)}
                               className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                             >
                               Bekreft
                             </button>
                             <button
                               onClick={() => rejectResult(match)}
                               className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                             >
                               Avvis
                             </button>
                           </div>
                         )}
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="flex space-x-3">
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