'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Trophy, Users, Calendar, Award, Edit, Save, X } from 'lucide-react'

interface Match {
  id: string
  team1_name: string
  team2_name: string
  round: string
  group_name?: string
  status: 'scheduled' | 'live' | 'completed' | 'pending_result' | 'pending_confirmation'
  score1?: number
  score2?: number
  scheduled_time?: string
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

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load tournament
        const tournamentResponse = await fetch(`/api/tournaments?id=${tournamentId}`)
        if (tournamentResponse.ok) {
          const tournamentData = await tournamentResponse.json()
          setTournament(tournamentData.tournament)
        }

        // Load matches
        const matchesResponse = await fetch(`/api/matches?tournament_id=${tournamentId}`)
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json()
          setMatches(matchesData.matches || [])
          
          // Calculate group standings
          const standings = calculateGroupStandings(matchesData.matches || [])
          setGroupStandings(standings)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (tournamentId) {
      loadData()
    }
  }, [tournamentId])

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600'
      case 'live':
        return 'bg-red-600'
      case 'scheduled':
        return 'bg-slate-600'
      default:
        return 'bg-yellow-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ferdig'
      case 'live':
        return 'LIVE'
      case 'scheduled':
        return 'Planlagt'
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
      const response = await fetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: matchId,
          score1: editForm.score1 !== undefined ? parseInt(editForm.score1.toString()) : undefined,
          score2: editForm.score2 !== undefined ? parseInt(editForm.score2.toString()) : undefined,
          status: editForm.status,
          scheduled_time: editForm.scheduled_time ? new Date(editForm.scheduled_time).toISOString() : undefined
        })
      })

      if (response.ok) {
        // Reload matches
        const matchesResponse = await fetch(`/api/matches?tournament_id=${tournamentId}`)
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json()
          setMatches(matchesData.matches || [])
          const standings = calculateGroupStandings(matchesData.matches || [])
          setGroupStandings(standings)
        }
        setEditingMatch(null)
        setEditForm({})
      } else {
        const error = await response.json()
        alert(`Kunne ikke oppdatere kamp: ${error.error || 'Ukjent feil'}`)
      }
    } catch (error) {
      console.error('Error saving match:', error)
      alert('Noe gikk galt ved oppdatering av kamp')
    }
  }

  const groupMatches = matches.filter(m => m.round === 'Gruppespill')
  const knockoutMatches = matches.filter(m => m.round !== 'Gruppespill')

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
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
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
                ).map(([groupName, groupMatchesList]) => (
                  <div key={groupName} className="mb-6">
                    <h3 className="font-semibold mb-3 text-lg">{groupName}</h3>
                    <div className="space-y-2">
                      {groupMatchesList.map(match => (
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
                                  {getStatusText(match.status)}
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
          </div>
        )}

        {/* Knockout Stage Matches */}
        {knockoutMatches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Sluttspill - Kamper</span>
            </h2>
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
                                  {getStatusText(match.status)}
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
          </div>
        )}

        {matches.length === 0 && groupMatches.length === 0 && knockoutMatches.length === 0 && (
          <div className="pro11-card p-8 text-center">
            <p className="text-slate-400">Ingen kamper er generert for denne turneringen ennå.</p>
            <Link href="/admin" className="pro11-button mt-4 inline-block">
              Gå til admin panel
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

