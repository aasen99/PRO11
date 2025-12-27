'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Trophy, Users, Calendar, Award, Edit, Save, X, RefreshCw } from 'lucide-react'
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

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
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
          
          setMatches(loadedMatches)
          
          if (loadedMatches.length === 0) {
            console.warn('No matches found for tournament:', tournamentId)
          }
          
          // Calculate group standings
          const standings = calculateGroupStandings(loadedMatches)
          setGroupStandings(standings)
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

  const generateNextRound = async () => {
    // Find completed rounds and generate next round
    const knockoutMatches = matches.filter(m => m.round !== 'Gruppespill')
    const rounds = [...new Set(knockoutMatches.map(m => m.round))]
    
    // Find the latest completed round
    const roundOrder: Record<string, number> = {
      'Kvartfinaler': 1,
      'Semifinaler': 2,
      'Finale': 3
    }
    
    const sortedRounds = rounds
      .filter(r => roundOrder[r] !== undefined)
      .sort((a, b) => (roundOrder[a] || 999) - (roundOrder[b] || 999))
    
    if (sortedRounds.length === 0) {
      addToast({ message: 'Ingen sluttspillrunder funnet å generere neste runde fra.', type: 'info' })
      return
    }
    
    // Check the latest round
    const latestRound = sortedRounds[sortedRounds.length - 1]
    const latestRoundMatches = knockoutMatches.filter(m => m.round === latestRound)
    
    // Check if all matches in latest round are completed
    const allCompleted = latestRoundMatches.length > 0 && 
      latestRoundMatches.every(m => m.status === 'completed' && m.score1 !== undefined && m.score2 !== undefined)
    
    if (!allCompleted) {
      addToast({ 
        message: `Alle kamper i ${latestRound} må være ferdig før neste runde kan genereres.`, 
        type: 'warning' 
      })
      return
    }
    
    // Determine next round name
    const getNextRoundName = (currentRound: string): string | null => {
      if (currentRound === 'Kvartfinaler') return 'Semifinaler'
      if (currentRound === 'Semifinaler') return 'Finale'
      return null
    }
    
    const nextRoundName = getNextRoundName(latestRound)
    
    if (!nextRoundName) {
      addToast({ message: 'Det er ingen neste runde å generere (turneringen er ferdig).', type: 'info' })
      return
    }
    
    // Check if next round already exists
    const nextRoundExists = knockoutMatches.some(m => m.round === nextRoundName)
    if (nextRoundExists) {
      addToast({ message: `${nextRoundName} er allerede generert.`, type: 'info' })
      return
    }
    
    // Get winners from completed matches
    const winners: string[] = []
    latestRoundMatches.forEach(match => {
      if (match.status === 'completed' && match.score1 !== undefined && match.score2 !== undefined) {
        if (match.score1 > match.score2) {
          winners.push(match.team1_name)
        } else if (match.score2 > match.score1) {
          winners.push(match.team2_name)
        } else {
          // Draw - use team1 as winner
          winners.push(match.team1_name)
        }
      }
    })
    
    if (winners.length === 0) {
      addToast({ message: 'Kunne ikke finne vinnere fra forrige runde.', type: 'error' })
      return
    }
    
    if (!confirm(`Dette vil generere ${nextRoundName} med ${winners.length} lag:\n${winners.join(', ')}\n\nFortsette?`)) {
      return
    }
    
    setIsLoading(true)
    try {
      // Generate matches for next round
      const nextRoundMatches: any[] = []
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          nextRoundMatches.push({
            tournament_id: tournamentId,
            team1_name: winners[i],
            team2_name: winners[i + 1],
            round: nextRoundName,
            status: 'scheduled'
          })
        }
      }
      
      // Insert matches
      const insertPromises = nextRoundMatches.map(async (match) => {
        const response = await fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(match)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Kunne ikke opprette kamp')
        }
        
        return await response.json()
      })
      
      await Promise.all(insertPromises)
      addToast({ 
        message: `${nextRoundName} generert med ${nextRoundMatches.length} kamper!`, 
        type: 'success' 
      })
      
      // Reload data
      await loadData()
    } catch (error: any) {
      console.error('Error generating next round:', error)
      addToast({ 
        message: `Feil ved generering av neste runde: ${error.message || 'Ukjent feil'}`, 
        type: 'error' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const groupMatches = matches.filter(m => m.round === 'Gruppespill')
  const knockoutMatches = matches.filter(m => m.round !== 'Gruppespill')
  
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
            <button
              onClick={generateNextRound}
              className="pro11-button flex items-center space-x-2"
            >
              <Award className="w-4 h-4" />
              <span>Generer neste runde</span>
            </button>
            <button
              onClick={async () => {
                if (!confirm('Dette vil oppdatere rundenavn for alle sluttspillkamper basert på antall lag. Fortsette?')) {
                  return
                }
              
              try {
                // Count unique teams in knockout matches
                const knockoutMatches = matches.filter(m => m.round !== 'Gruppespill')
                const uniqueTeams = new Set<string>()
                knockoutMatches.forEach(m => {
                  uniqueTeams.add(m.team1_name)
                  uniqueTeams.add(m.team2_name)
                })
                const numTeams = uniqueTeams.size
                
                // Determine correct round name
                const getRoundName = (num: number): string => {
                  if (num === 2) return 'Finale'
                  if (num === 4) return 'Semifinaler'
                  if (num === 8) return 'Kvartfinaler'
                  if (num > 8) return 'Kvartfinaler'
                  if (num > 4) return 'Semifinaler'
                  return 'Sluttspill'
                }
                
                const correctRoundName = getRoundName(numTeams)
                
                // Update all knockout matches that have wrong round name
                const matchesToUpdate = knockoutMatches.filter(m => m.round === 'Sluttspill' || m.round !== correctRoundName)
                
                if (matchesToUpdate.length === 0) {
                  alert('Alle kamper har allerede riktig rundenavn!')
                  return
                }
                
                // Update each match
                let updated = 0
                for (const match of matchesToUpdate) {
                  const response = await fetch('/api/matches', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: match.id,
                      round: correctRoundName
                    })
                  })
                  
                  if (response.ok) {
                    updated++
                  }
                }
                
                if (updated > 0) {
                  alert(`Oppdaterte ${updated} kamper med rundenavn: ${correctRoundName}`)
                  await loadData()
                } else {
                  alert('Kunne ikke oppdatere kamper. Prøv igjen.')
                }
              } catch (error) {
                console.error('Error updating round names:', error)
                alert('Noe gikk galt ved oppdatering av rundenavn.')
              }
            }}
            className="pro11-button-secondary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Oppdater rundenavn</span>
          </button>
            <button onClick={loadData} className="pro11-button-secondary flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Oppdater</span>
            </button>
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
                                ) : match.status === 'pending_confirmation' && (match.team1_submitted_score1 !== null || match.team2_submitted_score1 !== null) ? (
                                  <div className="flex flex-col items-center px-4">
                                    <div className="text-sm text-orange-400 mb-1">Venter bekreftelse</div>
                                    {match.team1_submitted_score1 !== null && (
                                      <div className="text-xs text-slate-400">
                                        {match.team1_name}: {match.team1_submitted_score1} - {match.team1_submitted_score2}
                                      </div>
                                    )}
                                    {match.team2_submitted_score1 !== null && (
                                      <div className="text-xs text-slate-400">
                                        {match.team2_name}: {match.team2_submitted_score1} - {match.team2_submitted_score2}
                                      </div>
                                    )}
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
                                {match.status === 'pending_confirmation' && match.submitted_by && (
                                  <span className="text-xs text-orange-400 ml-2">
                                    ({match.submitted_by} har sendt inn: {match.submitted_score1 || match.team1_submitted_score1} - {match.submitted_score2 || match.team1_submitted_score2})
                                  </span>
                                )}
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
                                ) : match.status === 'pending_confirmation' && (match.team1_submitted_score1 !== null || match.team2_submitted_score1 !== null) ? (
                                  <div className="flex flex-col items-center px-4">
                                    <div className="text-sm text-orange-400 mb-1">Venter bekreftelse</div>
                                    {match.team1_submitted_score1 !== null && (
                                      <div className="text-xs text-slate-400">
                                        {match.team1_name}: {match.team1_submitted_score1} - {match.team1_submitted_score2}
                                      </div>
                                    )}
                                    {match.team2_submitted_score1 !== null && (
                                      <div className="text-xs text-slate-400">
                                        {match.team2_name}: {match.team2_submitted_score1} - {match.team2_submitted_score2}
                                      </div>
                                    )}
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
                                {match.status === 'pending_confirmation' && match.submitted_by && (
                                  <span className="text-xs text-orange-400 ml-2">
                                    ({match.submitted_by} har sendt inn: {match.submitted_score1 || match.team1_submitted_score1} - {match.submitted_score2 || match.team1_submitted_score2})
                                  </span>
                                )}
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
      </main>
    </div>
  )
}

