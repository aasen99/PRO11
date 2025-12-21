'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Users, Trophy, Calendar, Download, CheckCircle, XCircle, Eye, Plus, Settings, Lock, Edit, Trash2, Mail, Key, BarChart3 } from 'lucide-react'

interface Player {
  name: string
  psnId: string
  position: string
}

interface Team {
  id: string
  teamName?: string
  team_name?: string
  captainName?: string
  captain_name?: string
  captainEmail?: string
  captain_email?: string
  players?: Player[]
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  registeredAt?: string
  created_at?: string
  tournamentId?: string
  tournament_id?: string
  paymentStatus?: 'pending' | 'paid' | 'refunded'
  payment_status?: 'pending' | 'completed' | 'failed'
}

interface Match {
  id: string
  team1: string
  team2: string
  round: string
  group?: string
  status: 'scheduled' | 'live' | 'completed'
  score1?: number
  score2?: number
  time?: string
}

interface Tournament {
  id: string
  title: string
  date: string
  time: string
  registeredTeams: number
  maxTeams: number
  status: 'open' | 'ongoing' | 'closed' | 'completed'
  prize: string
  entryFee: number
  description: string
  format: 'group_stage' | 'knockout' | 'mixed'
  matches?: Match[]
  groups?: string[][]
}

interface DatabaseMatch {
  id: string
  tournament_id: string
  team1_name: string
  team2_name: string
  round: string
  group_name?: string
  status: string
  score1?: number
  score2?: number
  scheduled_time?: string
}

function NextMatchQuickAction({ tournaments }: { tournaments: Tournament[] }) {
  const [nextMatch, setNextMatch] = useState<DatabaseMatch | null>(null)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    score1: 0,
    score2: 0,
    status: 'scheduled'
  })

  useEffect(() => {
    const findNextMatch = async () => {
      // Find active/ongoing tournaments
      const activeTournaments = tournaments.filter(t => t.status === 'ongoing')
      
      if (activeTournaments.length === 0) return

      // Find next scheduled match across all active tournaments
      let earliestMatch: DatabaseMatch | null = null
      let earliestTime: Date | null = null
      let matchTournament: Tournament | null = null

      for (const t of activeTournaments) {
        try {
          const response = await fetch(`/api/matches?tournament_id=${t.id}`)
          if (response.ok) {
            const data = await response.json()
            const matches = (data.matches || []) as DatabaseMatch[]
            
            // Find next scheduled match
            const scheduledMatches = matches.filter(m => 
              m.status === 'scheduled' && m.scheduled_time
            )
            
            for (const match of scheduledMatches) {
              const matchTime = new Date(match.scheduled_time!)
              if (!earliestTime || matchTime < earliestTime) {
                earliestTime = matchTime
                earliestMatch = match
                matchTournament = t
              }
            }
          }
        } catch (error) {
          console.error(`Error loading matches for tournament ${t.id}:`, error)
        }
      }

      if (earliestMatch && matchTournament) {
        setNextMatch(earliestMatch)
        setTournament(matchTournament)
        setEditForm({
          score1: earliestMatch.score1 || 0,
          score2: earliestMatch.score2 || 0,
          status: earliestMatch.status
        })
      }
    }

    findNextMatch()
  }, [tournaments])

  const saveMatch = async () => {
    if (!nextMatch) return

    try {
      const response = await fetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: nextMatch.id,
          score1: editForm.score1,
          score2: editForm.score2,
          status: editForm.status
        })
      })

      if (response.ok) {
        // Reload next match
        const activeTournaments = tournaments.filter(t => t.status === 'ongoing')
        for (const t of activeTournaments) {
          const matchesResponse = await fetch(`/api/matches?tournament_id=${t.id}`)
          if (matchesResponse.ok) {
            const matchesData = await matchesResponse.json()
            const matches = (matchesData.matches || []) as DatabaseMatch[]
            const scheduledMatches = matches.filter(m => 
              m.status === 'scheduled' && m.scheduled_time
            ).sort((a, b) => 
              new Date(a.scheduled_time!).getTime() - new Date(b.scheduled_time!).getTime()
            )
            
            if (scheduledMatches.length > 0) {
              setNextMatch(scheduledMatches[0])
              setEditForm({
                score1: scheduledMatches[0].score1 || 0,
                score2: scheduledMatches[0].score2 || 0,
                status: scheduledMatches[0].status
              })
            } else {
              setNextMatch(null)
            }
          }
        }
        setIsEditing(false)
        alert('Kamp oppdatert!')
      } else {
        const error = await response.json()
        alert(`Kunne ikke oppdatere kamp: ${error.error || 'Ukjent feil'}`)
      }
    } catch (error) {
      console.error('Error saving match:', error)
      alert('Noe gikk galt ved oppdatering av kamp')
    }
  }

  if (!nextMatch || !tournament) {
    return null
  }

  return (
    <div className="pro11-card p-4 mb-6">
      <h3 className="font-semibold mb-3 flex items-center space-x-2">
        <Trophy className="w-5 h-5" />
        <span>Hurtighandling - Neste kamp</span>
      </h3>
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="mb-2">
          <p className="text-xs text-slate-400">{tournament.title}</p>
          <p className="text-xs text-slate-400">{nextMatch.round} {nextMatch.group_name ? `• ${nextMatch.group_name}` : ''}</p>
        </div>
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{nextMatch.team1_name}</span>
              <input
                type="number"
                min="0"
                value={editForm.score1}
                onChange={(e) => setEditForm({ ...editForm, score1: parseInt(e.target.value) || 0 })}
                className="w-16 px-2 py-1 bg-slate-700 rounded text-center"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">{nextMatch.team2_name}</span>
              <input
                type="number"
                min="0"
                value={editForm.score2}
                onChange={(e) => setEditForm({ ...editForm, score2: parseInt(e.target.value) || 0 })}
                className="w-16 px-2 py-1 bg-slate-700 rounded text-center"
              />
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="flex-1 px-2 py-1 bg-slate-700 rounded text-sm"
              >
                <option value="scheduled">Planlagt</option>
                <option value="live">LIVE</option>
                <option value="completed">Ferdig</option>
              </select>
              <button
                onClick={saveMatch}
                className="pro11-button flex items-center space-x-1 text-sm px-3 py-1"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Lagre</span>
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="pro11-button-secondary flex items-center space-x-1 text-sm px-3 py-1"
              >
                <XCircle className="w-4 h-4" />
                <span>Avbryt</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{nextMatch.team1_name}</span>
              <span className="text-lg font-bold">
                {nextMatch.score1 !== undefined && nextMatch.score2 !== undefined 
                  ? `${nextMatch.score1} - ${nextMatch.score2}` 
                  : 'vs'}
              </span>
              <span className="font-medium">{nextMatch.team2_name}</span>
            </div>
            {nextMatch.scheduled_time && (
              <p className="text-xs text-slate-400 text-center">
                {new Date(nextMatch.scheduled_time).toLocaleString('nb-NO', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="pro11-button w-full flex items-center justify-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Legg inn resultat</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'teams' | 'tournaments' | 'prizes' | 'statistics' | 'settings'>('teams')
  const [selectedTournament, setSelectedTournament] = useState('')
  
  // Modal states
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showTournamentModal, setShowTournamentModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showPrizeModal, setShowPrizeModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [isNewTournament, setIsNewTournament] = useState(false)
  
  // Prize management state
  const [prizeSettings, setPrizeSettings] = useState({
    basePrize: 10000,
    perTeamBonus: 500,
    currentPrize: 10000
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsAuthenticated(true)
        setPassword('')
      } else {
        setError(data.error || 'Feil passord. Prøv igjen.')
        setPassword('')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Noe gikk galt. Prøv igjen.')
      setPassword('')
    }
  }

  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Hent tournaments fra database
  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const response = await fetch('/api/tournaments')
        if (response.ok) {
          const data = await response.json()
          if (data.tournaments) {
            // Transform database tournaments to frontend format and load matches
            const transformedPromises = data.tournaments.map(async (t: any) => {
              const startDate = new Date(t.start_date)
              const date = startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
              const time = startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
              
              let status: 'open' | 'ongoing' | 'closed' | 'completed' = 'open'
              if (t.status === 'active') status = 'ongoing'
              else if (t.status === 'completed') status = 'completed'
              else if (t.status === 'cancelled') status = 'closed'
              
              // Load matches for this tournament
              let matches: Match[] = []
              try {
                const matchesResponse = await fetch(`/api/matches?tournament_id=${t.id}`)
                if (matchesResponse.ok) {
                  const matchesData = await matchesResponse.json()
                  matches = (matchesData.matches || []).map((m: any) => ({
                    id: m.id,
                    team1: m.team1_name,
                    team2: m.team2_name,
                    round: m.round,
                    group: m.group_name,
                    status: m.status as 'scheduled' | 'live' | 'completed',
                    score1: m.score1,
                    score2: m.score2,
                    time: m.scheduled_time ? new Date(m.scheduled_time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : undefined
                  }))
                }
              } catch (error) {
                console.error(`Error loading matches for tournament ${t.id}:`, error)
              }
              
              return {
                id: t.id,
                title: t.title,
                date,
                time,
                registeredTeams: t.current_teams || 0,
                maxTeams: t.max_teams,
                status,
                prize: `${t.prize_pool.toLocaleString('nb-NO')} NOK`,
                entryFee: t.entry_fee,
                description: t.description || '',
                format: 'mixed' as const,
                matches
              }
            })
            
            const transformed = await Promise.all(transformedPromises)
            setTournaments(transformed)
            // Set first tournament as selected if none selected
            if (transformed.length > 0 && !selectedTournament) {
              setSelectedTournament(transformed[0].id)
            }
          }
        }
      } catch (error) {
        console.warn('Error loading tournaments:', error)
      }
    }
    
    if (isAuthenticated) {
      loadTournaments()
    }
  }, [isAuthenticated, selectedTournament])

  // Hent teams fra database via API
  useEffect(() => {
    const loadTeams = async () => {
      try {
        console.log('Loading teams from API...')
        const response = await fetch('/api/teams')
        console.log('Teams API response status:', response.status)
        if (response.ok) {
          const data = await response.json()
          console.log('Teams API response data:', data)
          console.log('Teams count:', data.teams?.length || 0)
          if (data.teams) {
            console.log('Setting teams:', data.teams.map((t: any) => ({ id: t.id, name: t.teamName || t.team_name, tournament: t.tournamentId || t.tournament_id })))
            setTeams(data.teams)
          } else {
            console.warn('No teams in response')
            setTeams([])
          }
        } else {
          const errorData = await response.json()
          console.error('Teams API error:', errorData)
          setTeams([])
        }
      } catch (error) {
        console.error('Error loading teams from API:', error)
        setTeams([])
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      loadTeams()
    }
  }, [isAuthenticated])

  // Show all teams if no tournament is selected, otherwise filter by tournament
  const filteredTeams = selectedTournament 
    ? teams.filter(team => 
        (team.tournamentId || team.tournament_id) === selectedTournament
      )
    : teams

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600'
      case 'approved':
        return 'bg-green-600'
      case 'rejected':
        return 'bg-red-600'
      case 'paid':
        return 'bg-blue-600'
      default:
        return 'bg-slate-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Venter'
      case 'approved':
        return 'Godkjent'
      case 'rejected':
        return 'Avvist'
      case 'paid':
        return 'Betalt'
      default:
        return 'Ukjent'
    }
  }

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'pending':
      case 'completed':
        return 'text-yellow-400'
      case 'paid':
        return 'text-green-400'
      case 'refunded':
      case 'failed':
        return 'text-red-400'
      default:
        return 'text-slate-400'
    }
  }

  const getPaymentStatusText = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'Venter betaling'
      case 'completed':
        return 'Betalt'
      case 'paid':
        return 'Betalt'
      case 'refunded':
        return 'Refundert'
      case 'failed':
        return 'Feilet'
      default:
        return 'Ukjent'
    }
  }

  const updateTeamStatus = async (teamId: string, newStatus: string) => {
    try {
      // Oppdater i databasen
      const response = await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: teamId,
          status: newStatus
        })
      })

      if (response.ok) {
        // Oppdater lokal state
        setTeams(prevTeams => {
          const updatedTeams = prevTeams.map(team => 
            team.id === teamId 
              ? { ...team, status: newStatus as 'pending' | 'approved' | 'rejected' | 'paid' }
              : team
          )
          return updatedTeams
        })
      } else {
        const error = await response.json()
        alert(`Kunne ikke oppdatere lag-status: ${error.error || 'Ukjent feil'}`)
      }
    } catch (error) {
      console.error('Error updating team status:', error)
      alert('Noe gikk galt ved oppdatering av lag-status')
    }
  }

  const deleteTeam = (teamId: string) => {
    if (confirm('Er du sikker på at du vil slette dette laget?')) {
      setTeams(prevTeams => {
        const updatedTeams = prevTeams.filter(team => team.id !== teamId)
        
        // Oppdater localStorage
        const storedTeams = localStorage.getItem('adminTeams')
        if (storedTeams) {
          const teamsFromStorage = JSON.parse(storedTeams)
          const updatedStorageTeams = teamsFromStorage.filter((team: any) => team.id !== teamId)
          localStorage.setItem('adminTeams', JSON.stringify(updatedStorageTeams))
        }
        
        return updatedTeams
      })
    }
  }

  // Prize management functions
  const updatePrizeSettings = (newSettings: any) => {
    setPrizeSettings(newSettings)
    // Calculate current prize based on registered teams
    const approvedTeams = teams.filter(team => team.status === 'approved').length
    const currentPrize = newSettings.basePrize + (approvedTeams * newSettings.perTeamBonus)
    setPrizeSettings(prev => ({ ...prev, currentPrize }))
    
    // Save to localStorage
    localStorage.setItem('prizeSettings', JSON.stringify(newSettings))
  }

  const loadPrizeSettings = () => {
    try {
      const stored = localStorage.getItem('prizeSettings')
      if (stored) {
        const settings = JSON.parse(stored)
        const approvedTeams = teams.filter(team => team.status === 'approved').length
        const currentPrize = settings.basePrize + (approvedTeams * settings.perTeamBonus)
        setPrizeSettings({ ...settings, currentPrize })
      }
    } catch (error) {
      console.warn('Error loading prize settings:', error)
    }
  }

  // Load prize settings when teams change
  useEffect(() => {
    loadPrizeSettings()
  }, [teams])

  const exportTeams = () => {
    const csvContent = [
      ['Lag', 'Kaptein', 'E-post', 'Spillere', 'Status', 'Betalingsstatus', 'Registrert'],
      ...filteredTeams.map(team => [
        team.teamName || team.team_name,
        team.captainName || team.captain_name,
        team.captainEmail || team.captain_email,
        (team.players?.length || 0),
        getStatusText(team.status),
        getPaymentStatusText(team.paymentStatus || team.payment_status),
        team.registeredAt || team.created_at
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lag_${selectedTournament}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const sendEmailToTeam = (team: Team) => {
    const subject = encodeURIComponent('PRO11 - Informasjon om laget ditt')
    const body = encodeURIComponent(`Hei ${team.captainName}!

Takk for påmelding til PRO11-turneringen.

Lag: ${team.teamName}
Status: ${getStatusText(team.status)}
Betalingsstatus: ${getPaymentStatusText(team.paymentStatus)}

Hvis du har spørsmål, kontakt oss på Discord.

Med vennlig hilsen
PRO11 Team`)
    
    window.open(`mailto:${team.captainEmail}?subject=${subject}&body=${body}`)
  }

  const openTeamModal = (team: Team) => {
    setSelectedTeam(team)
    setShowTeamModal(true)
  }

  const openTournamentModal = (tournament?: Tournament) => {
    if (tournament) {
      setEditingTournament(tournament)
      setIsNewTournament(false)
    } else {
      setEditingTournament(null)
      setIsNewTournament(true)
    }
    setShowTournamentModal(true)
  }

  const saveTournament = async (tournamentData: Partial<Tournament>) => {
    try {
      console.log('Saving tournament with data:', tournamentData)
      
      // Convert frontend format to database format
      // Handle date format: if it's already a date string, use it; otherwise combine date and time
      let startDate: Date
      let endDate: Date
      
      if (tournamentData.date && tournamentData.time) {
        // Combine date (YYYY-MM-DD) and time (HH:mm) into ISO string
        const dateTimeString = `${tournamentData.date}T${tournamentData.time}:00`
        startDate = new Date(dateTimeString)
        // End date is same day, but later time (default 23:00)
        const endDateTimeString = `${tournamentData.date}T23:00:00`
        endDate = new Date(endDateTimeString)
      } else if (tournamentData.date) {
        startDate = new Date(tournamentData.date + 'T19:00:00')
        endDate = new Date(tournamentData.date + 'T23:00:00')
      } else {
        alert('Dato er påkrevd!')
        return
      }
      
      if (!tournamentData.title) {
        alert('Tittel er påkrevd!')
        return
      }
      
      const prizePool = parseInt(tournamentData.prize?.replace(/[^0-9]/g, '') || '0')
      
      const dbData: any = {
        title: tournamentData.title,
        description: tournamentData.description || null,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        max_teams: tournamentData.maxTeams || 16,
        prize_pool: prizePool,
        entry_fee: tournamentData.entryFee || 299,
        status: tournamentData.status === 'open' ? 'upcoming' : 
                tournamentData.status === 'ongoing' ? 'active' :
                tournamentData.status === 'completed' ? 'completed' : 'cancelled'
      }
      
      console.log('Sending to API:', dbData)

      if (isNewTournament) {
        console.log('Sending POST request to /api/tournaments with data:', dbData)
        
        const response = await fetch('/api/tournaments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbData)
        })
        
        console.log('Response status:', response.status)
        const responseData = await response.json()
        console.log('Response data:', responseData)
        console.log('Response has tournament?', !!responseData.tournament)
        console.log('Tournament ID:', responseData.tournament?.id)
        
        if (response.ok) {
          if (!responseData.tournament) {
            console.error('Response OK but no tournament in response:', responseData)
            alert('Turnering ble ikke opprettet. Sjekk konsollen for detaljer.')
            return
          }
          
          console.log('Tournament created successfully, reloading list...')
          console.log('Created tournament ID:', responseData.tournament.id)
          
          // Add the new tournament immediately to the list
          const newTournament = responseData.tournament
          const startDate = new Date(newTournament.start_date)
          const date = startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
          const time = startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
          let status: 'open' | 'ongoing' | 'closed' | 'completed' = 'open'
          if (newTournament.status === 'active') status = 'ongoing'
          else if (newTournament.status === 'completed') status = 'completed'
          else if (newTournament.status === 'cancelled') status = 'closed'
          
          const transformedNewTournament = {
            id: newTournament.id,
            title: newTournament.title,
            date,
            time,
            registeredTeams: newTournament.current_teams || 0,
            maxTeams: newTournament.max_teams,
            status,
            prize: `${newTournament.prize_pool.toLocaleString('nb-NO')} NOK`,
            entryFee: newTournament.entry_fee,
            description: newTournament.description || '',
            format: 'mixed' as const
          }
          
          // Update tournaments list immediately
          setTournaments(prev => [transformedNewTournament, ...prev])
          if (!selectedTournament) {
            setSelectedTournament(transformedNewTournament.id)
          }
          setShowTournamentModal(false)
          setEditingTournament(null)
          setIsNewTournament(false)
          
          // Reload tournaments to get fresh data (with cache busting)
          const loadResponse = await fetch('/api/tournaments?' + new Date().getTime())
          if (loadResponse.ok) {
            const data = await loadResponse.json()
            console.log('Reloaded tournaments count:', data.tournaments?.length || 0)
            console.log('Reloaded tournaments:', data.tournaments)
            if (data.tournaments) {
              const transformed = data.tournaments.map((t: any) => {
                const startDate = new Date(t.start_date)
                const date = startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
                const time = startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
                let status: 'open' | 'ongoing' | 'closed' | 'completed' = 'open'
                if (t.status === 'active') status = 'ongoing'
                else if (t.status === 'completed') status = 'completed'
                else if (t.status === 'cancelled') status = 'closed'
                return {
                  id: t.id,
                  title: t.title,
                  date,
                  time,
                  registeredTeams: t.current_teams || 0,
                  maxTeams: t.max_teams,
                  status,
                  prize: `${t.prize_pool.toLocaleString('nb-NO')} NOK`,
                  entryFee: t.entry_fee,
                  description: t.description || '',
                  format: 'mixed' as const
                }
              })
              setTournaments(transformed)
              if (transformed.length > 0 && !selectedTournament) {
                setSelectedTournament(transformed[0].id)
              }
              setShowTournamentModal(false)
              setEditingTournament(null)
              setIsNewTournament(false)
            }
          }
        } else {
          const errorMessage = responseData.error || 'Kunne ikke opprette turnering'
          alert(`Feil: ${errorMessage}`)
          console.error('Failed to create tournament:', responseData)
          return // Don't close modal on error
        }
      } else if (editingTournament) {
        const response = await fetch('/api/tournaments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTournament.id, ...dbData })
        })
        
        const responseData = await response.json()
        
        if (response.ok) {
          // Reload tournaments
          const loadResponse = await fetch('/api/tournaments')
          if (loadResponse.ok) {
            const data = await loadResponse.json()
            if (data.tournaments) {
              const transformed = data.tournaments.map((t: any) => {
                const startDate = new Date(t.start_date)
                const date = startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
                const time = startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
                let status: 'open' | 'ongoing' | 'closed' | 'completed' = 'open'
                if (t.status === 'active') status = 'ongoing'
                else if (t.status === 'completed') status = 'completed'
                else if (t.status === 'cancelled') status = 'closed'
                return {
                  id: t.id,
                  title: t.title,
                  date,
                  time,
                  registeredTeams: t.current_teams || 0,
                  maxTeams: t.max_teams,
                  status,
                  prize: `${t.prize_pool.toLocaleString('nb-NO')} NOK`,
                  entryFee: t.entry_fee,
                  description: t.description || '',
                  format: 'mixed' as const
                }
              })
              setTournaments(transformed)
              setShowTournamentModal(false)
              setEditingTournament(null)
              setIsNewTournament(false)
            }
          }
        } else {
          const errorMessage = responseData.error || 'Kunne ikke oppdatere turnering'
          alert(`Feil: ${errorMessage}`)
          console.error('Failed to update tournament:', responseData)
          return // Don't close modal on error
        }
      }
      // Modal is closed in success cases above
    } catch (error) {
      console.error('Error saving tournament:', error)
      alert('Noe gikk galt ved lagring av turnering: ' + (error instanceof Error ? error.message : 'Ukjent feil'))
      // Don't close modal on error
    }
  }

  const deleteTournament = async (tournamentId: string) => {
    if (confirm('Er du sikker på at du vil slette denne turneringen? Dette vil også slette alle påmeldte lag.')) {
      try {
        const response = await fetch(`/api/tournaments?id=${tournamentId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          // Reload tournaments
          const loadResponse = await fetch('/api/tournaments')
          if (loadResponse.ok) {
            const data = await loadResponse.json()
            if (data.tournaments) {
              const transformed = data.tournaments.map((t: any) => {
                const startDate = new Date(t.start_date)
                const date = startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
                const time = startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
                let status: 'open' | 'ongoing' | 'closed' | 'completed' = 'open'
                if (t.status === 'active') status = 'ongoing'
                else if (t.status === 'completed') status = 'completed'
                else if (t.status === 'cancelled') status = 'closed'
                return {
                  id: t.id,
                  title: t.title,
                  date,
                  time,
                  registeredTeams: t.current_teams || 0,
                  maxTeams: t.max_teams,
                  status,
                  prize: `${t.prize_pool.toLocaleString('nb-NO')} NOK`,
                  entryFee: t.entry_fee,
                  description: t.description || '',
                  format: 'mixed' as const
                }
              })
              setTournaments(transformed)
              if (selectedTournament === tournamentId && transformed.length > 0) {
                setSelectedTournament(transformed[0].id)
              } else if (selectedTournament === tournamentId) {
                setSelectedTournament('')
              }
            }
          }
        } else {
          alert('Kunne ikke slette turnering')
        }
      } catch (error) {
        console.error('Error deleting tournament:', error)
        alert('Noe gikk galt ved sletting av turnering')
      }
    }
  }

  // Funksjoner for automatisk trekning av kamper
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const generateGroupStage = (teams: string[], numGroups: number): string[][] => {
    const shuffledTeams = shuffleArray(teams)
    const groups: string[][] = []
    
    for (let i = 0; i < numGroups; i++) {
      groups[i] = []
    }
    
    shuffledTeams.forEach((team, index) => {
      const groupIndex = index % numGroups
      groups[groupIndex].push(team)
    })
    
    return groups
  }

  const generateGroupMatches = (groups: string[][]): Match[] => {
    const matches: Match[] = []
    let matchId = 1
    
    groups.forEach((group, groupIndex) => {
      const groupName = `Gruppe ${String.fromCharCode(65 + groupIndex)}`
      
      // Generer alle mulige kamper i gruppen
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          matches.push({
            id: `match-${matchId++}`,
            team1: group[i],
            team2: group[j],
            round: 'Gruppespill',
            group: groupName,
            status: 'scheduled'
          })
        }
      }
    })
    
    return matches
  }

  const generateKnockoutMatches = (teams: string[], roundName: string): Match[] => {
    const matches: Match[] = []
    const shuffledTeams = shuffleArray(teams)
    
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        matches.push({
          id: `match-${Date.now()}-${i}`,
          team1: shuffledTeams[i],
          team2: shuffledTeams[i + 1],
          round: roundName,
          status: 'scheduled'
        })
      }
    }
    
    return matches
  }

  const autoGenerateMatches = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    if (!tournament) {
      alert('Turnering ikke funnet!')
      return
    }

    const approvedTeams = teams
      .filter(team => team.status === 'approved' && (team.tournamentId === tournamentId || team.tournament_id === tournamentId))
      .map(team => team.teamName || team.team_name)
      .filter((name): name is string => name !== undefined && name !== null)

    if (approvedTeams.length < 4) {
      alert('Du trenger minst 4 godkjente lag for å generere kamper!')
      return
    }

    let matches: Match[] = []
    let groups: string[][] = []

    if (tournament.format === 'group_stage' || tournament.format === 'mixed') {
      // Beregn antall grupper basert på antall lag
      const numGroups = approvedTeams.length <= 8 ? 2 : 4
      groups = generateGroupStage(approvedTeams, numGroups)
      matches = generateGroupMatches(groups)
    }

    if (tournament.format === 'knockout' || tournament.format === 'mixed') {
      // For knockout eller mixed, generer sluttspill basert på antall lag
      let knockoutTeams = approvedTeams
      
      if (tournament.format === 'mixed' && groups.length > 0) {
        // For mixed format, ta de beste lagene fra hver gruppe
        knockoutTeams = groups.flatMap(group => group.slice(0, 2)) // Top 2 fra hver gruppe
      }
      
      const knockoutMatches = generateKnockoutMatches(knockoutTeams, 'Sluttspill')
      matches = [...matches, ...knockoutMatches]
    }

    // Lagre kamper i databasen
    const saveMatchesToDatabase = async () => {
      try {
        console.log(`Starting to save matches. Total matches generated: ${matches.length}`)
        console.log('Generated matches:', matches.slice(0, 3).map(m => ({ team1: m.team1, team2: m.team2, round: m.round, group: m.group })))
        
        if (matches.length === 0) {
          alert('Ingen kamper ble generert! Sjekk at turneringen har riktig format og at det er nok lag.')
          return
        }
        
        // Slett eksisterende kamper for denne turneringen først
        console.log('Deleting existing matches for tournament:', tournamentId)
        const deleteResponse = await fetch(`/api/matches?tournament_id=${tournamentId}`, {
          method: 'DELETE'
        })
        // Ignore delete errors (might not exist)
        console.log('Delete response status:', deleteResponse.status)

        console.log(`Attempting to save ${matches.length} matches to database for tournament ${tournamentId}`)
        
        // Lagre alle kamper
        const matchPromises = matches.map(async (match, index) => {
          const matchData: any = {
            tournament_id: tournamentId,
            team1_name: match.team1,
            team2_name: match.team2,
            round: match.round,
            status: match.status || 'scheduled'
          }
          
          // Only include group_name if it exists
          if (match.group) {
            matchData.group_name = match.group
          }
          
          // Only include scheduled_time if it exists
          if (match.time) {
            matchData.scheduled_time = new Date(match.time).toISOString()
          }
          
          console.log(`Saving match ${index + 1}/${matches.length}:`, matchData)
          
          const response = await fetch('/api/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchData)
          })
          
          if (!response.ok) {
            let error
            try {
              error = await response.json()
            } catch (e) {
              error = { error: 'Failed to parse error response', status: response.status }
            }
            console.error(`Failed to save match ${index + 1}:`, {
              match: matchData,
              error: error,
              status: response.status,
              statusText: response.statusText,
              errorMessage: error.error,
              errorCode: error.code,
              errorDetails: error.details,
              fullError: JSON.stringify(error, null, 2)
            })
            return null
          }
          
          const result = await response.json()
          if (result.match) {
            console.log(`Successfully saved match ${index + 1}:`, {
              matchId: result.match.id,
              tournamentId: result.match.tournament_id,
              team1: result.match.team1_name,
              team2: result.match.team2_name,
              round: result.match.round
            })
            return result
          } else {
            console.error(`Match ${index + 1} saved but no match data returned:`, result)
            return null
          }
        })

        const savedMatches = await Promise.all(matchPromises)
        const successfulMatches = savedMatches.filter(m => m !== null && m?.match !== null)
        
        console.log(`Saved ${successfulMatches.length} of ${matches.length} matches to database`)
        console.log('Successful matches details:', successfulMatches.map((m: any) => ({
          hasMatch: !!m?.match,
          matchId: m?.match?.id,
          tournamentId: m?.match?.tournament_id,
          team1: m?.match?.team1_name,
          team2: m?.match?.team2_name
        })))
        
        if (successfulMatches.length < matches.length) {
          console.warn(`Warning: Only ${successfulMatches.length} of ${matches.length} matches were saved successfully`)
          const failedCount = matches.length - successfulMatches.length
          console.warn(`Failed to save ${failedCount} matches`)
        }
        
        if (successfulMatches.length === 0) {
          alert('Ingen kamper ble lagret! Sjekk konsollen for feilmeldinger.')
          return
        }

        // Oppdater turneringsstatus i databasen til 'active'
        const statusResponse = await fetch('/api/tournaments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: tournamentId,
            status: 'active' // Database uses 'active', frontend uses 'ongoing'
          })
        })
        
        if (!statusResponse.ok) {
          console.error('Failed to update tournament status')
        }

        // Last turneringer på nytt for å få oppdaterte kamper
        const reloadResponse = await fetch('/api/tournaments')
        if (reloadResponse.ok) {
          const reloadData = await reloadResponse.json()
          if (reloadData.tournaments) {
            // Load matches for each tournament
            const tournamentsWithMatches = await Promise.all(
              reloadData.tournaments.map(async (t: any) => {
                try {
                  const matchesResponse = await fetch(`/api/matches?tournament_id=${t.id}`)
                  if (matchesResponse.ok) {
                    const matchesData = await matchesResponse.json()
                    const loadedMatches = (matchesData.matches || []).map((m: any) => ({
                      id: m.id,
                      team1: m.team1_name,
                      team2: m.team2_name,
                      round: m.round,
                      group: m.group_name,
                      status: m.status as 'scheduled' | 'live' | 'completed',
                      score1: m.score1,
                      score2: m.score2,
                      time: m.scheduled_time ? new Date(m.scheduled_time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : undefined
                    }))
                    
                    const startDate = new Date(t.start_date)
                    const date = startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
                    const time = startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
                    
                    let status: 'open' | 'ongoing' | 'closed' | 'completed' = 'open'
                    if (t.status === 'active') status = 'ongoing'
                    else if (t.status === 'completed') status = 'completed'
                    else if (t.status === 'cancelled') status = 'closed'
                    
                    return {
                      id: t.id,
                      title: t.title,
                      date,
                      time,
                      registeredTeams: t.current_teams || 0,
                      maxTeams: t.max_teams,
                      status,
                      prize: `${t.prize_pool.toLocaleString('nb-NO')} NOK`,
                      entryFee: t.entry_fee,
                      description: t.description || '',
                      format: 'mixed' as const,
                      matches: loadedMatches,
                      groups: t.id === tournamentId ? groups : undefined
                    }
                  }
                } catch (error) {
                  console.error(`Error loading matches for tournament ${t.id}:`, error)
                }
                
                const startDate = new Date(t.start_date)
                const date = startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
                const time = startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
                
                let status: 'open' | 'ongoing' | 'closed' | 'completed' = 'open'
                if (t.status === 'active') status = 'ongoing'
                else if (t.status === 'completed') status = 'completed'
                else if (t.status === 'cancelled') status = 'closed'
                
                return {
                  id: t.id,
                  title: t.title,
                  date,
                  time,
                  registeredTeams: t.current_teams || 0,
                  maxTeams: t.max_teams,
                  status,
                  prize: `${t.prize_pool.toLocaleString('nb-NO')} NOK`,
                  entryFee: t.entry_fee,
                  description: t.description || '',
                  format: 'mixed' as const,
                  matches: [],
                  groups: t.id === tournamentId ? groups : undefined
                }
              })
            )
            
            setTournaments(tournamentsWithMatches)
          }
        }

        alert(`Kampene er generert og lagret!\n\nGruppespill: ${matches.filter(m => m.round === 'Gruppespill').length} kamper\nSluttspill: ${matches.filter(m => m.round === 'Sluttspill').length} kamper\n\nTurneringen er satt til "Pågående"`)
      } catch (error) {
        console.error('Error saving matches:', error)
        alert('Kampene ble generert, men det oppstod en feil ved lagring til database. Sjekk konsollen for detaljer.')
      }
    }
    
    saveMatchesToDatabase()
  }

  const generateKnockoutFromGroups = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    if (!tournament || !tournament.groups || !tournament.matches) {
      alert('Turnering ikke funnet eller ingen grupper generert!')
      return
    }

    // Sjekk om gruppespill er ferdig
    const groupMatches = tournament.matches.filter(m => m.round === 'Gruppespill')
    const completedGroupMatches = groupMatches.filter(m => m.status === 'completed')
    
    if (completedGroupMatches.length < groupMatches.length) {
      alert('Gruppespill må være fullført før sluttspill kan genereres!')
      return
    }

    // Beregn gruppestandinger
    const groupStandings = tournament.groups.map((group, groupIndex) => {
      const groupName = `Gruppe ${String.fromCharCode(65 + groupIndex)}`
      const groupMatches = tournament.matches!.filter(m => m.group === groupName)
      
      const standings = group.map(team => {
        let points = 0
        let goalsFor = 0
        let goalsAgainst = 0
        
        groupMatches.forEach(match => {
          if (match.status === 'completed' && (match.team1 === team || match.team2 === team)) {
            const isHome = match.team1 === team
            const teamGoals = isHome ? match.score1! : match.score2!
            const opponentGoals = isHome ? match.score2! : match.score1!
            
            goalsFor += teamGoals
            goalsAgainst += opponentGoals
            
            if (teamGoals > opponentGoals) {
              points += 3
            } else if (teamGoals === opponentGoals) {
              points += 1
            }
          }
        })
        
        return {
          team,
          points,
          goalsFor,
          goalsAgainst,
          goalDifference: goalsFor - goalsAgainst
        }
      })
      
      // Sorter etter poeng, målforskjell, mål for
      return standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
        return b.goalsFor - a.goalsFor
      })
    })

    // Ta de beste lagene fra hver gruppe (top 2)
    const knockoutTeams = groupStandings.flatMap(standings => 
      standings.slice(0, 2).map(s => s.team)
    )

    if (knockoutTeams.length < 4) {
      alert('Du trenger minst 4 lag for sluttspill!')
      return
    }

    // Generer sluttspill-kamper
    const knockoutMatches = generateKnockoutMatches(knockoutTeams, 'Sluttspill')
    
    // Legg til nye kamper til eksisterende turnering
    const updatedMatches = [...tournament.matches, ...knockoutMatches]
    
    console.log('Generated knockout matches:', knockoutMatches)
    console.log('Group standings:', groupStandings)
    
    alert(`Sluttspill generert!\n\n${knockoutTeams.length} lag kvalifisert til sluttspill\n${knockoutMatches.length} nye kamper opprettet`)
  }

  // Statistics
  const totalTeams = teams.length
  const pendingTeams = teams.filter(t => t.status === 'pending').length
  const approvedTeams = teams.filter(t => t.status === 'approved').length
  const paidTeams = teams.filter(t => t.paymentStatus === 'paid').length
  const totalRevenue = paidTeams * 300 // Assuming 300 NOK per team

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <header className="pro11-card mx-4 mt-4 h-24">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-24 h-full flex items-center justify-center">
                <img src="/logo.png" alt="PRO11 Logo" className="w-full h-full object-contain" />
              </div>
              <div className="ml-4">
                <p className="text-slate-400 text-sm">Pro Clubs Turneringer</p>
              </div>
            </div>
            <Link href="/" className="pro11-button-secondary flex items-center space-x-2">
              <span>Tilbake</span>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 flex flex-col items-center">
          <div className="max-w-md w-full">
            <div className="pro11-card p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-6">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Admin Tilgang</h1>
              <p className="text-slate-300 mb-8">
                Skriv inn admin-passordet for å få tilgang til administrasjonspanelet
              </p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Admin passord"
                    className="pro11-input text-center"
                    required
                  />
                </div>
                
                {error && (
                  <div className="text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <button
                  type="submit"
                  className="pro11-button w-full"
                >
                  Logg inn
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Admin dashboard
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
          <div className="flex items-center space-x-4">
            <span className="text-green-400 text-sm">Admin tilgang</span>
            <Link href="/" className="pro11-button-secondary flex items-center space-x-2">
              <span>Tilbake</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 flex flex-col items-center">
        <div className="max-w-7xl w-full">
          {/* Page Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-slate-300 text-base">
              Administrer lag, turneringer og innstillinger
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="pro11-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Totalt lag</p>
                  <p className="text-2xl font-bold">{totalTeams}</p>
                </div>
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="pro11-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Venter godkjenning</p>
                  <p className="text-2xl font-bold">{pendingTeams}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div className="pro11-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Godkjent</p>
                  <p className="text-2xl font-bold">{approvedTeams}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="pro11-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Inntekter</p>
                  <p className="text-2xl font-bold">{totalRevenue} NOK</p>
                </div>
                <Trophy className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Quick Actions - Next Match */}
          <NextMatchQuickAction tournaments={tournaments} />

          {/* Tabs */}
          <div className="pro11-card p-4 mb-6">
            <div className="flex space-x-1 mb-4">
              <button
                onClick={() => setActiveTab('teams')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'teams' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Lag
              </button>
              <button
                onClick={() => setActiveTab('tournaments')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'tournaments' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Turneringer
              </button>
              <button
                onClick={() => setActiveTab('prizes')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'prizes' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Premier
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'statistics' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Statistikk
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'settings' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Innstillinger
              </button>
            </div>

            {activeTab === 'teams' && (
              <div>
                {/* Tournament Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Velg turnering
                  </label>
                  <select
                    value={selectedTournament}
                    onChange={(e) => setSelectedTournament(e.target.value)}
                    className="pro11-input max-w-xs"
                  >
                    {tournaments.map(tournament => (
                      <option key={tournament.id} value={tournament.id}>
                        {tournament.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Loading State */}
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-300">Laster lag...</p>
                  </div>
                ) : (
                  <>
                    {/* Teams Table */}
                    <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="py-2 px-3 text-left text-sm">Lag</th>
                        <th className="py-2 px-3 text-left text-sm">Kaptein</th>
                        <th className="py-2 px-3 text-left text-sm">Spillere</th>
                        <th className="py-2 px-3 text-left text-sm">Status</th>
                        <th className="py-2 px-3 text-left text-sm">Betaling</th>
                        <th className="py-2 px-3 text-left text-sm">Registrert</th>
                        <th className="py-2 px-3 text-left text-sm">Handlinger</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeams.map(team => (
                        <tr key={team.id} className="border-b border-slate-700">
                          <td className="py-2 px-3">
                            <div>
                              <div className="font-medium text-sm">{team.teamName || team.team_name}</div>
                              <div className="text-xs text-slate-400">{team.captainEmail || team.captain_email}</div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-sm">{team.captainName || team.captain_name}</td>
                          <td className="py-2 px-3 text-sm">{(team.players?.length || 0)} spillere</td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                              {getStatusText(team.status)}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`text-xs ${getPaymentStatusColor(team.paymentStatus || team.payment_status)}`}>
                              {getPaymentStatusText(team.paymentStatus || team.payment_status)}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-400">{team.registeredAt || team.created_at}</td>
                          <td className="py-2 px-3">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => openTeamModal(team)}
                                className="text-blue-400 hover:text-blue-300"
                                title="Se detaljer"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => updateTeamStatus(team.id, 'approved')}
                                className="text-green-400 hover:text-green-300"
                                title="Godkjenn"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => updateTeamStatus(team.id, 'rejected')}
                                className="text-red-400 hover:text-red-300"
                                title="Avvis"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => sendEmailToTeam(team)}
                                className="text-purple-400 hover:text-purple-300"
                                title="Send e-post"
                              >
                                <Mail className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteTeam(team.id)}
                                className="text-red-400 hover:text-red-300"
                                title="Slett lag"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                    {/* Export Button */}
                    <div className="mt-4">
                      <button
                        onClick={exportTeams}
                        className="pro11-button-secondary flex items-center space-x-2 text-sm"
                      >
                        <Download className="w-3 h-3" />
                        <span>Eksporter til CSV</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'tournaments' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Turneringer</h3>
                  <button 
                    onClick={() => openTournamentModal()}
                    className="pro11-button flex items-center space-x-2 text-sm"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Legg til turnering</span>
                  </button>
                </div>

                <div className="grid gap-3">
                  {tournaments.map(tournament => (
                    <div key={tournament.id} className="pro11-card p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{tournament.title}</h4>
                          <p className="text-xs text-slate-400">{tournament.date} - {tournament.time}</p>
                          <p className="text-xs text-slate-400">Premie: {tournament.prize} | Påmeldingsgebyr: {tournament.entryFee} NOK</p>
                          <p className="text-xs text-slate-400 mt-1">{tournament.description}</p>
                          {tournament.matches && tournament.matches.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-700">
                              <p className="text-xs text-slate-400 mb-1">Kamper: {tournament.matches.length}</p>
                              <div className="text-xs text-slate-500">
                                {tournament.matches.filter((m: Match) => m.status === 'completed').length} fullført, {' '}
                                {tournament.matches.filter((m: Match) => m.status === 'scheduled').length} planlagt
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Lag</p>
                            <p className="font-medium text-sm">{tournament.registeredTeams}/{tournament.maxTeams}</p>
                          </div>
                          <div className="flex space-x-1">
                            <Link
                              href={`/admin/matches/${tournament.id}`}
                              className="pro11-button-secondary flex items-center space-x-1 text-xs"
                              title="Se kamper"
                            >
                              <Trophy className="w-3 h-3" />
                              <span>Se kamper</span>
                            </Link>
                            <button 
                              onClick={() => autoGenerateMatches(tournament.id)}
                              className="pro11-button flex items-center space-x-1 text-xs"
                              title="Generer kamper"
                            >
                              <Trophy className="w-3 h-3" />
                              <span>Generer kamper</span>
                            </button>
                            {tournament.format === 'mixed' && tournament.groups && (
                              <button 
                                onClick={() => generateKnockoutFromGroups(tournament.id)}
                                className="pro11-button-secondary flex items-center space-x-1 text-xs"
                                title="Generer sluttspill"
                              >
                                <BarChart3 className="w-3 h-3" />
                                <span>Sluttspill</span>
                              </button>
                            )}
                            <button 
                              onClick={() => openTournamentModal(tournament)}
                              className="pro11-button-secondary flex items-center space-x-1 text-xs"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Rediger</span>
                            </button>
                            <button
                              onClick={() => deleteTournament(tournament.id)}
                              className="text-red-400 hover:text-red-300"
                              title="Slett turnering"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'statistics' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Statistikk og rapporter</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="pro11-card p-4">
                    <h4 className="font-semibold mb-3 text-sm">Lag-statistikk</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Totalt antall lag:</span>
                        <span className="font-medium">{totalTeams}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Venter godkjenning:</span>
                        <span className="font-medium text-yellow-400">{pendingTeams}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Godkjent:</span>
                        <span className="font-medium text-green-400">{approvedTeams}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Betalt:</span>
                        <span className="font-medium text-blue-400">{paidTeams}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pro11-card p-4">
                    <h4 className="font-semibold mb-3 text-sm">Økonomisk oversikt</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Totale inntekter:</span>
                        <span className="font-medium text-green-400">{totalRevenue} NOK</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Gjennomsnitt per lag:</span>
                        <span className="font-medium">300 NOK</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Betalinger i kø:</span>
                        <span className="font-medium text-yellow-400">{totalTeams - paidTeams}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={exportTeams}
                    className="pro11-button flex items-center space-x-2 text-sm"
                  >
                    <Download className="w-3 h-3" />
                    <span>Eksporter fullstendig rapport</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Innstillinger</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="pro11-card p-4">
                    <h4 className="font-semibold mb-3 text-sm">Admin-innstillinger</h4>
                    <div className="space-y-3">
                      <button className="pro11-button-secondary flex items-center space-x-2 w-full text-sm">
                        <Key className="w-3 h-3" />
                        <span>Endre admin-passord</span>
                      </button>
                      <button className="pro11-button-secondary flex items-center space-x-2 w-full text-sm">
                        <Mail className="w-3 h-3" />
                        <span>E-post-maler</span>
                      </button>
                      <button className="pro11-button-secondary flex items-center space-x-2 w-full text-sm">
                        <Settings className="w-3 h-3" />
                        <span>System-innstillinger</span>
                      </button>
                    </div>
                  </div>

                  <div className="pro11-card p-4">
                    <h4 className="font-semibold mb-3 text-sm">System-informasjon</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Versjon:</span>
                        <span>1.0.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Oppdatert:</span>
                        <span>15. januar 2025</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="text-green-400">Aktiv</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

            {/* Team Details Modal */}
      {showTeamModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="pro11-card p-4 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold">{selectedTeam.teamName || selectedTeam.team_name}</h2>
              <button
                onClick={() => setShowTeamModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-2 text-xs">Lag-info</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400">Kaptein</p>
                    <p className="font-medium">{selectedTeam.captainName || selectedTeam.captain_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">E-post</p>
                    <p className="font-medium">{selectedTeam.captainEmail || selectedTeam.captain_email}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTeam.status)}`}>
                      {getStatusText(selectedTeam.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-400">Betaling</p>
                    <span className={`text-xs ${getPaymentStatusColor(selectedTeam.paymentStatus || selectedTeam.payment_status)}`}>
                      {getPaymentStatusText(selectedTeam.paymentStatus || selectedTeam.payment_status)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-xs">Spillere ({(selectedTeam.players?.length || 0)})</h3>
                <div className="grid gap-1">
                  {(selectedTeam.players || []).map((player, index) => (
                    <div key={index} className="flex justify-between items-center p-1.5 bg-slate-800/50 rounded text-xs">
                      <div>
                        <p className="font-medium">{player.name}</p>
                        <p className="text-slate-400">PSN: {player.psnId}</p>
                      </div>
                      <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded text-xs">
                        {player.position}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => sendEmailToTeam(selectedTeam)}
                  className="pro11-button-secondary flex items-center space-x-1 text-xs"
                >
                  <Mail className="w-3 h-3" />
                  <span>E-post</span>
                </button>
                <button
                  onClick={() => setShowTeamModal(false)}
                  className="pro11-button flex items-center space-x-1 text-xs"
                >
                  <span>Lukk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Modal */}
      {showTournamentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="pro11-card p-4 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {isNewTournament ? 'Legg til turnering' : 'Rediger turnering'}
              </h2>
              <button
                onClick={() => setShowTournamentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const date = formData.get('date') as string
                const time = formData.get('time') as string
                const prizeText = formData.get('prize') as string
                
                console.log('Form data:', {
                  title: formData.get('title'),
                  date,
                  time,
                  prizeText,
                  maxTeams: formData.get('maxTeams'),
                  entryFee: formData.get('entryFee'),
                  status: formData.get('status')
                })
                
                await saveTournament({
                  title: formData.get('title') as string,
                  description: formData.get('description') as string || '',
                  date: date,
                  time: time,
                  maxTeams: parseInt(formData.get('maxTeams') as string || '16'),
                  prize: prizeText || '0',
                  entryFee: parseInt(formData.get('entryFee') as string || '299'),
                  status: (formData.get('status') as 'open' | 'ongoing' | 'closed' | 'completed') || 'open'
                })
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Turneringstitel *
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingTournament?.title || ''}
                  className="pro11-input"
                  placeholder="PRO11 FC 26 Launch Cup"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Dato *
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingTournament?.date?.split(' ')[0] || ''}
                    className="pro11-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Tid *
                  </label>
                  <input
                    type="time"
                    name="time"
                    defaultValue={editingTournament?.time || '19:00'}
                    className="pro11-input"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Maks lag
                  </label>
                  <input
                    type="number"
                    name="maxTeams"
                    defaultValue={editingTournament?.maxTeams || 16}
                    className="pro11-input"
                    min="2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Premie (NOK)
                  </label>
                  <input
                    type="text"
                    name="prize"
                    defaultValue={editingTournament?.prize?.replace(' NOK', '') || '0'}
                    className="pro11-input"
                    placeholder="15000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Påmeldingsgebyr (NOK)
                  </label>
                  <input
                    type="number"
                    name="entryFee"
                    defaultValue={editingTournament?.entryFee || 299}
                    className="pro11-input"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={editingTournament?.status || 'open'}
                  className="pro11-input"
                >
                  <option value="open">Åpen for påmelding</option>
                  <option value="ongoing">Pågår</option>
                  <option value="closed">Stengt</option>
                  <option value="completed">Fullført</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Beskrivelse
                </label>
                <textarea
                  name="description"
                  defaultValue={editingTournament?.description || ''}
                  className="pro11-input"
                  rows={3}
                  placeholder="Beskrivelse av turneringen..."
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="pro11-button flex items-center space-x-1 text-sm"
                >
                  <span>{isNewTournament ? 'Legg til' : 'Lagre'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTournamentModal(false)}
                  className="pro11-button-secondary flex items-center space-x-1 text-sm"
                >
                  <span>Avbryt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 