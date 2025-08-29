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
      
      // Mock tournament data for laget
      const mockTournaments: Tournament[] = [
        {
          id: 'fc26-launch-cup',
          title: 'PRO11 FC 26 Launch Cup',
          status: 'live',
          startDate: '15. september 2025',
          endDate: '15. september 2025',
          position: 2,
          totalTeams: 8,
          matches: [
            {
              id: '1',
              team1: 'Oslo United',
              team2: 'Bergen Elite',
              score1: 2,
              score2: 1,
              status: 'completed',
              time: '19:00',
              round: 'Kvartfinaler',
              tournamentId: 'fc26-launch-cup',
              canSubmitResult: false,
              submittedBy: null,
              submittedScore1: null,
              submittedScore2: null,
              canConfirmResult: false
            },
            {
              id: '2',
              team1: 'Oslo United',
              team2: 'Trondheim Titans',
              score1: 0,
              score2: 0,
              status: 'pending_result',
              time: '20:30',
              round: 'Semifinaler',
              tournamentId: 'fc26-launch-cup',
              canSubmitResult: true,
              submittedBy: null,
              submittedScore1: null,
              submittedScore2: null,
              canConfirmResult: false
            },
            {
              id: '3',
              team1: 'Oslo United',
              team2: 'Stavanger Stars',
              score1: 0,
              score2: 0,
              status: 'pending_confirmation',
              time: '21:00',
              round: 'Finale',
              tournamentId: 'fc26-launch-cup',
              canSubmitResult: false,
              submittedBy: 'Stavanger Stars',
              submittedScore1: 1,
              submittedScore2: 2,
              canConfirmResult: true
            }
          ]
        },
        {
          id: 'winter-cup-2024',
          title: 'PRO11 Winter Cup 2024',
          status: 'completed',
          startDate: '1. desember 2024',
          endDate: '15. desember 2024',
          position: 1,
          totalTeams: 16,
          matches: [
            {
              id: 'w1',
              team1: 'Oslo United',
              team2: 'Drammen Dragons',
              score1: 3,
              score2: 1,
              status: 'completed',
              time: '19:00',
              round: 'Gruppespill',
              tournamentId: 'winter-cup-2024',
              canSubmitResult: false,
              submittedBy: null,
              submittedScore1: null,
              submittedScore2: null,
              canConfirmResult: false
            },
            {
              id: 'w2',
              team1: 'Oslo United',
              team2: 'Kristiansand Kings',
              score1: 2,
              score2: 0,
              status: 'completed',
              time: '20:30',
              round: 'Gruppespill',
              tournamentId: 'winter-cup-2024',
              canSubmitResult: false,
              submittedBy: null,
              submittedScore1: null,
              submittedScore2: null,
              canConfirmResult: false
            },
            {
              id: 'w3',
              team1: 'Oslo United',
              team2: 'Tromsø Titans',
              score1: 4,
              score2: 2,
              status: 'completed',
              time: '21:00',
              round: 'Finale',
              tournamentId: 'winter-cup-2024',
              canSubmitResult: false,
              submittedBy: null,
              submittedScore1: null,
              submittedScore2: null,
              canConfirmResult: false
            }
          ]
        }
      ]
      
      // Filtrer kamper for dette laget
      const filteredTournaments = mockTournaments.map(tournament => ({
        ...tournament,
        matches: tournament.matches.filter(match => 
          match.team1 === parsedTeam.teamName || match.team2 === parsedTeam.teamName
        )
      })).filter(tournament => tournament.matches.length > 0)
      
      setTournaments(filteredTournaments)
      
      // Beregn lagstatistikk
      const stats = calculateTeamStats(filteredTournaments, parsedTeam.teamName)
      setTeamStats(stats)
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

  const submitResult = () => {
    if (!selectedMatch || !team) return

    // Oppdater match resultat til pending_confirmation
    setTournaments(prev => 
      prev.map(tournament => ({
        ...tournament,
        matches: tournament.matches.map(match =>
          match.id === selectedMatch.id
            ? {
                ...match,
                status: 'pending_confirmation' as const,
                canSubmitResult: false,
                canConfirmResult: true,
                submittedBy: team.teamName,
                submittedScore1: resultScore1,
                submittedScore2: resultScore2
              }
            : match
        )
      }))
    )

    alert(`Resultat innsendt: ${selectedMatch.team1} ${resultScore1} - ${resultScore2} ${selectedMatch.team2}\n\nVenter på bekreftelse fra motstanderlaget.`)
    setShowResultModal(false)
  }

  const confirmResult = (match: Match) => {
    if (!match.submittedScore1 || !match.submittedScore2) return

    // Bekreft resultatet og gjør det offisielt
    setTournaments(prev => 
      prev.map(tournament => ({
        ...tournament,
        matches: tournament.matches.map(m =>
          m.id === match.id
            ? {
                ...m,
                score1: match.submittedScore1!,
                score2: match.submittedScore2!,
                status: 'completed' as const,
                canSubmitResult: false,
                canConfirmResult: false,
                submittedBy: null,
                submittedScore1: null,
                submittedScore2: null
              }
            : m
        )
      }))
    )

    alert(`Resultat bekreftet: ${match.team1} ${match.submittedScore1} - ${match.submittedScore2} ${match.team2}`)
  }

  const rejectResult = (match: Match) => {
    // Avvis resultatet og tilbakestill til pending_result
    setTournaments(prev => 
      prev.map(tournament => ({
        ...tournament,
        matches: tournament.matches.map(m =>
          m.id === match.id
            ? {
                ...m,
                status: 'pending_result' as const,
                canSubmitResult: true,
                canConfirmResult: false,
                submittedBy: null,
                submittedScore1: null,
                submittedScore2: null
              }
            : m
        )
      }))
    )

    alert('Resultat avvist. Begge lag må legge inn resultatet på nytt.')
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
          {tournaments.filter(t => t.status === 'live' || t.status === 'upcoming').map(tournament => (
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