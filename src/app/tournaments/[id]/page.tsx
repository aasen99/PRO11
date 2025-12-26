'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Trophy, Users, Calendar, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { fetchTournamentById } from '../../../lib/tournaments'

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

export default function TournamentDetailPage() {
  const params = useParams()
  const tournamentId = params.id as string
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'bracket' | 'info'>('standings')

  const [tournament, setTournament] = useState<any>(null)
  const [registeredTeams, setRegisteredTeams] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [groupStandings, setGroupStandings] = useState<Record<string, Team[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadTournament = async () => {
      const t = await fetchTournamentById(tournamentId)
      setTournament(t)
      setIsLoading(false)
    }
    loadTournament()
  }, [tournamentId])

  useEffect(() => {
    const loadTeams = async () => {
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
    }
    
    const loadMatches = async () => {
      try {
        const response = await fetch(`/api/matches?tournament_id=${tournamentId}`)
        if (response.ok) {
          const data = await response.json()
          const loadedMatches = data.matches || []
          setMatches(loadedMatches)
          
          // Calculate group standings from actual match results
          const standings = calculateGroupStandings(loadedMatches)
          setGroupStandings(standings)
        }
      } catch (error) {
        console.warn('Error loading matches:', error)
      }
    }
    
    if (tournamentId) {
      loadTeams()
      loadMatches()
    }
  }, [tournamentId])

  // Calculate group standings from actual match results (same logic as admin)
  const calculateGroupStandings = (allMatches: any[]): Record<string, Team[]> => {
    const standings: Record<string, Record<string, Team>> = {}
    
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
    date: m.scheduled_time ? new Date(m.scheduled_time).toLocaleDateString('nb-NO', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '',
    time: m.scheduled_time ? new Date(m.scheduled_time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : '',
    status: m.status === 'completed' ? 'completed' : m.status === 'live' ? 'live' : 'scheduled',
    group: m.group_name || undefined,
    round: m.round || undefined
  }))

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
        return 'Planlagt'
      case 'live':
        return 'LIVE'
      case 'completed':
        return 'Ferdig'
      default:
        return 'Planlagt'
    }
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
              <p className="text-slate-400 text-sm">Pro Clubs Turneringer</p>
            </div>
          </div>
          <Link href="/tournaments" className="pro11-button-secondary flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Tilbake</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="max-w-6xl w-full">
          {/* Tournament Header */}
          <div className="pro11-card p-8 mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4">{tournament.title}</h1>
            <div className="flex items-center justify-center space-x-6 text-slate-300">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span>{tournament.date} - {tournament.time}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span>Premie: {tournament.prize}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-400" />
                <span>{tournament.registeredTeams}/{tournament.maxTeams} lag</span>
              </div>
            </div>
            <div className="mt-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(tournament.status)}`}>
                {tournament.status === 'open' ? 'Åpen for påmelding' : 
                 tournament.status === 'ongoing' ? 'Pågående' : 
                 tournament.status === 'closed' ? 'Stengt' : 'Fullført'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="pro11-card p-6 mb-8">
            <div className="flex space-x-1 mb-6">
              <button
                onClick={() => setActiveTab('standings')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'standings' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tabell
              </button>
              <button
                onClick={() => setActiveTab('matches')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'matches' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Kamper
              </button>
              <button
                onClick={() => setActiveTab('bracket')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'bracket' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sluttspill
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'info' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Info
              </button>
            </div>

            {activeTab === 'standings' && (
              <div>
                {Object.keys(groupStandings).length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(groupStandings).map(([groupName, standings]) => (
                      <div key={groupName} className="pro11-card p-4">
                        <h3 className="font-semibold mb-3 text-lg">{groupName}</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-700">
                                <th className="text-left py-2 px-2">Pos</th>
                                <th className="text-left py-2 px-2">Lag</th>
                                <th className="text-center py-2 px-2">K</th>
                                <th className="text-center py-2 px-2">V</th>
                                <th className="text-center py-2 px-2">U</th>
                                <th className="text-center py-2 px-2">T</th>
                                <th className="text-center py-2 px-2">M+</th>
                                <th className="text-center py-2 px-2">M-</th>
                                <th className="text-center py-2 px-2 font-bold">P</th>
                              </tr>
                            </thead>
                            <tbody>
                              {standings.map((team, index) => (
                                <tr 
                                  key={team.id} 
                                  className={`border-b border-slate-700/50 ${
                                    index < 2 ? 'bg-green-900/20' : ''
                                  }`}
                                >
                                  <td className="py-2 px-2 font-semibold">{index + 1}</td>
                                  <td className="py-2 px-2 font-medium">{team.name}</td>
                                  <td className="text-center py-2 px-2">{team.played}</td>
                                  <td className="text-center py-2 px-2 text-green-400">{team.won}</td>
                                  <td className="text-center py-2 px-2 text-yellow-400">{team.drawn}</td>
                                  <td className="text-center py-2 px-2 text-red-400">{team.lost}</td>
                                  <td className="text-center py-2 px-2">{team.goalsFor}</td>
                                  <td className="text-center py-2 px-2">{team.goalsAgainst}</td>
                                  <td className="text-center py-2 px-2 font-bold text-blue-400">{team.points}</td>
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
                      <h3 className="text-xl font-semibold mb-2">Ingen gruppespillkamper ferdig ennå</h3>
                      <p>Tabellen vil vises når kamper er spilt og resultater er registrert.</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-slate-400 mb-4">
                      <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">Ingen kamper generert</h3>
                      <p>Kamper må genereres før tabellen kan vises.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'matches' && (
              <div>
                {displayMatches.length > 0 ? (
                  <div className="space-y-4">
                    {displayMatches.map(match => (
                  <div key={match.id} className="pro11-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="text-right flex-1">
                          <span className="font-medium">{match.homeTeam}</span>
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
                        <div className="text-left flex-1">
                          <span className="font-medium">{match.awayTeam}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm text-slate-400">{match.date} {match.time}</div>
                        <div className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(match.status)}`}>
                          {getStatusText(match.status)}
                        </div>
                        {match.group && <div className="text-xs text-slate-500 mt-1">Gruppe {match.group}</div>}
                        {match.round && <div className="text-xs text-slate-500 mt-1">{match.round}</div>}
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-slate-400 mb-4">
                      <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">Ingen kamper planlagt</h3>
                      <p>Det må være minst 2 godkjente lag for å generere kamper.</p>
                      <p className="text-sm mt-2">Antall registrerte lag: {registeredTeams.length}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

             {activeTab === 'bracket' && (
               <div>
                 {registeredTeams.length >= 2 ? (
                   <div className="flex justify-center">
                     <div className="w-full max-w-5xl">
                       {/* Bracket Container */}
                       <div className="bg-slate-800/50 rounded-lg p-6">
                         
                         {/* Quarter Finals Row */}
                         <div className="flex justify-between mb-12">
                           <h3 className="text-lg font-semibold text-center w-52">Kvartfinaler</h3>
                           <h3 className="text-lg font-semibold text-center w-56">Semifinaler</h3>
                           <h3 className="text-lg font-semibold text-center w-52">Kvartfinaler</h3>
                         </div>
                         <div className="flex justify-between mb-12">
                           {/* Left Quarter Finals */}
                           <div className="flex flex-col space-y-6 w-52">
                             {registeredTeams.slice(0, 2).map((team: any, index: number) => (
                               <div key={team.id} className="pro11-card p-4 text-center">
                                 <div className="text-sm font-medium">{team.teamName || team.team_name}</div>
                                 <div className="text-xl font-bold text-blue-400">vs</div>
                                 <div className="text-sm font-medium">Motstander</div>
                               </div>
                             ))}
                           </div>
                           
                           {/* Semi Finals in Center */}
                           <div className="flex flex-col justify-center space-y-6 w-56">
                             {registeredTeams.slice(0, 2).map((team: any, index: number) => (
                               <div key={`semi-${team.id}`} className="pro11-card p-5 text-center">
                                 <div className="text-base font-medium">{team.teamName || team.team_name}</div>
                                 <div className="text-xl font-bold text-green-400">vs</div>
                                 <div className="text-base font-medium">Motstander</div>
                               </div>
                             ))}
                           </div>
                           
                           {/* Right Quarter Finals */}
                           <div className="flex flex-col space-y-6 w-52">
                             {registeredTeams.slice(2, 4).map((team: any, index: number) => (
                               <div key={`q2-${team.id}`} className="pro11-card p-4 text-center">
                                 <div className="text-sm font-medium">{team.teamName || team.team_name}</div>
                                 <div className="text-xl font-bold text-blue-400">vs</div>
                                 <div className="text-sm font-medium">Motstander</div>
                               </div>
                             ))}
                           </div>
                         </div>
                         
                         {/* Final Row */}
                         <div className="flex justify-center mb-4">
                           <h3 className="text-lg font-semibold text-center">Finale</h3>
                         </div>
                         <div className="flex justify-center mb-12">
                           <div className="pro11-card p-6 text-center w-72">
                             <div className="text-lg font-medium">Finalist 1</div>
                             <div className="text-3xl font-bold text-yellow-400 my-3">vs</div>
                             <div className="text-lg font-medium">Finalist 2</div>
                             <div className="text-sm text-slate-400 mt-3">27.09.2025 19:00</div>
                           </div>
                         </div>
                         
                         {/* Winner */}
                         <div className="flex justify-center mb-4">
                           <h3 className="text-lg font-semibold text-center">Vinner</h3>
                         </div>
                         <div className="flex justify-center">
                           <div className="pro11-card p-6 text-center w-56">
                             <div className="text-4xl mb-3">🏆</div>
                             <div className="text-lg font-medium">TBD</div>
                             <div className="text-sm text-slate-400 mt-2">{tournament.prize}</div>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 ) : (
                   <div className="text-center py-12">
                     <div className="text-slate-400 mb-4">
                       <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                       <h3 className="text-xl font-semibold mb-2">Ingen sluttspill tilgjengelig</h3>
                       <p>Det må være minst 2 godkjente lag for å vise sluttspill.</p>
                       <p className="text-sm mt-2">Antall registrerte lag: {registeredTeams.length}</p>
                     </div>
                   </div>
                 )}
               </div>
             )}

             {activeTab === 'info' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Om turneringen</h3>
                  <p className="text-slate-300 leading-relaxed">{tournament.description}</p>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4">Format</h3>
                  <div className="pro11-card p-4">
                    <h4 className="font-semibold mb-2">Gruppespill</h4>
                    <p className="text-slate-300 mb-2">8 lag delt i 2 grupper med 4 lag hver</p>
                    <p className="text-slate-300 mb-2">Alle lag møter hverandre én gang i gruppen</p>
                    <p className="text-slate-300">Topp 2 fra hver gruppe går videre til sluttspill</p>
                  </div>
                  
                  <div className="pro11-card p-4 mt-4">
                    <h4 className="font-semibold mb-2">Sluttspill</h4>
                    <p className="text-slate-300 mb-2">Kvartfinaler, semifinaler og finale</p>
                    <p className="text-slate-300">Alle kamper spilles som best-of-3</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Premier</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="pro11-card p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-400 mb-2">🥇</div>
                      <div className="font-semibold">1. plass</div>
                      <div className="text-slate-300">5,000 NOK</div>
                    </div>
                    <div className="pro11-card p-4 text-center">
                      <div className="text-2xl font-bold text-slate-400 mb-2">🥈</div>
                      <div className="font-semibold">2. plass</div>
                      <div className="text-slate-300">3,000 NOK</div>
                    </div>
                    <div className="pro11-card p-4 text-center">
                      <div className="text-2xl font-bold text-amber-600 mb-2">🥉</div>
                      <div className="font-semibold">3. plass</div>
                      <div className="text-slate-300">2,000 NOK</div>
                    </div>
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