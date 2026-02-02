'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Users, Trophy, Calendar, Download, CheckCircle, XCircle, Eye, Plus, Settings, Lock, Edit, Trash2, Mail, Key, BarChart3 } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

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
  discordUsername?: string
  discord_username?: string
  checkedIn?: boolean
  checked_in?: boolean
  expectedPlayers?: number
  expected_players?: number
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
  groupRound?: number
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
  status: 'open' | 'ongoing' | 'closed' | 'completed' | 'archived'
  prize: string
  entryFee: number
  description: string
  format: 'group_stage' | 'knockout' | 'mixed'
  matches?: Match[]
  groups?: string[][]
  checkInOpen?: boolean
}

interface AdminMessage {
  id: string
  tournament_id: string | null
  team_id: string | null
  team_name: string
  captain_name: string
  captain_email: string
  message: string
  status: 'open' | 'resolved'
  read_at: string | null
  created_at: string
}

const GEN_TAG_REGEX = /\[GEN:\s*(NEW GEN|OLD GEN|BOTH)\]/i
const FORMAT_TAG_REGEX = /\[FORMAT\]([\s\S]*?)\[\/FORMAT\]/i
const POT_PER_TEAM_TAG_REGEX = /\[POT_PER_TEAM:(\d+)\]/i

const getGenFromDescription = (description?: string | null) => {
  const match = description?.match(GEN_TAG_REGEX)
  const value = match?.[1]?.toUpperCase()
  if (value === 'NEW GEN') return 'new'
  if (value === 'OLD GEN') return 'old'
  if (value === 'BOTH') return 'both'
  return 'both'
}

const stripGenFromDescription = (description?: string | null) => {
  return (description || '')
    .replace(GEN_TAG_REGEX, '')
    .replace(FORMAT_TAG_REGEX, '')
    .replace(POT_PER_TEAM_TAG_REGEX, '')
    .trim()
}

const getFormatFromDescription = (description?: string | null) => {
  const match = description?.match(FORMAT_TAG_REGEX)
  return match?.[1]?.trim() || ''
}

const getPerTeamPotFromDescription = (description?: string | null) => {
  const match = description?.match(POT_PER_TEAM_TAG_REGEX)
  const value = match?.[1]
  return value ? Number(value) : null
}

const buildDescriptionWithGen = (
  description: string,
  gen: 'new' | 'old' | 'both',
  formatText: string,
  perTeamPot: number | null
) => {
  const cleaned = stripGenFromDescription(description)
  const tag = gen === 'new' ? '[GEN: New Gen]' : gen === 'old' ? '[GEN: Old Gen]' : '[GEN: Both]'
  const formatTag = formatText.trim() ? `[FORMAT]\n${formatText.trim()}\n[/FORMAT]` : ''
  const potTag = perTeamPot && perTeamPot > 0 ? `[POT_PER_TEAM:${perTeamPot}]` : ''
  return [cleaned, formatTag, potTag, tag].filter(Boolean).join(' ').trim()
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'teams' | 'tournaments' | 'prizes' | 'statistics' | 'settings' | 'messages'>('teams')
  const [selectedTournament, setSelectedTournament] = useState('')
  
  // Modal states
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showTournamentModal, setShowTournamentModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showPrizeModal, setShowPrizeModal] = useState(false)
  const [showMatchConfigModal, setShowMatchConfigModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [isNewTournament, setIsNewTournament] = useState(false)
  const [tournamentForMatchGeneration, setTournamentForMatchGeneration] = useState<string | null>(null)
  const [tournamentGen, setTournamentGen] = useState<'new' | 'old' | 'both'>('both')
  const [tournamentFormatText, setTournamentFormatText] = useState('')
  const [tournamentPotPerTeam, setTournamentPotPerTeam] = useState('')

  const { language } = useLanguage()
  const isEnglish = language === 'en'
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)

  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  
  // Match generation config
  const [matchConfig, setMatchConfig] = useState({
    numGroups: 2,
    teamsPerGroup: 0, // 0 = auto-calculate
    teamsToKnockout: 2, // Teams per group that advance
    useBestRunnersUp: false,
    numBestRunnersUp: 0 // Number of best 2nd place teams to include
  })
  
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
        setError(data.error || t('Feil passord. Prøv igjen.', 'Incorrect password. Please try again.'))
        setPassword('')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(t('Noe gikk galt. Prøv igjen.', 'Something went wrong. Please try again.'))
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
              
              let status: 'open' | 'ongoing' | 'closed' | 'completed' | 'archived' = 'open'
              if (t.status === 'active') status = 'ongoing'
              else if (t.status === 'completed') status = 'completed'
              else if (t.status === 'archived') status = 'archived'
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
              
              const perTeamPot = getPerTeamPotFromDescription(t.description || '')
              const eligibleTeams = (t.eligible_teams ?? t.current_teams) || 0
              const computedPrizePool = perTeamPot !== null ? perTeamPot * eligibleTeams : t.prize_pool
              return {
                id: t.id,
                title: t.title,
                date,
                time,
                registeredTeams: eligibleTeams,
                maxTeams: t.max_teams,
                status,
                prize: `${computedPrizePool.toLocaleString('nb-NO')} NOK`,
                entryFee: t.entry_fee,
                description: t.description || '',
                format: 'mixed' as const,
                checkInOpen: t.check_in_open ?? false,
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

  const loadMessages = async () => {
    setIsLoadingMessages(true)
    try {
      const response = await fetch('/api/messages')
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.warn('Error loading messages:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadMessages()
    }
  }, [isAuthenticated])

  const markMessageRead = async (id: string) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'resolved', readAt: new Date().toISOString() })
      })
      if (response.ok) {
        setMessages(prev =>
          prev.map(m =>
            m.id === id ? { ...m, status: 'resolved', read_at: new Date().toISOString() } : m
          )
        )
      }
    } catch (error) {
      console.warn('Error updating message:', error)
    }
  }

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
        return t('Venter', 'Pending')
      case 'approved':
        return t('Godkjent', 'Approved')
      case 'rejected':
        return t('Avvist', 'Rejected')
      case 'paid':
        return t('Betalt', 'Paid')
      default:
        return t('Ukjent', 'Unknown')
    }
  }

  const getTournamentTitleById = (id?: string | null) => {
    if (!id) return t('Ukjent turnering', 'Unknown tournament')
    const tournament = tournaments.find(t => t.id === id)
    return tournament?.title || t('Ukjent turnering', 'Unknown tournament')
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
        return t('Venter betaling', 'Payment pending')
      case 'completed':
        return t('Betalt', 'Paid')
      case 'paid':
        return t('Betalt', 'Paid')
      case 'refunded':
        return t('Refundert', 'Refunded')
      case 'failed':
        return t('Feilet', 'Failed')
      default:
        return t('Ukjent', 'Unknown')
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
        alert(t(`Kunne ikke oppdatere lag-status: ${error.error || 'Ukjent feil'}`, `Could not update team status: ${error.error || 'Unknown error'}`))
      }
    } catch (error) {
      console.error('Error updating team status:', error)
      alert(t('Noe gikk galt ved oppdatering av lag-status', 'Something went wrong updating team status'))
    }
  }

  const updateTeamCheckIn = async (teamId: string, checkedIn: boolean) => {
    try {
      const response = await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: teamId, checkedIn })
      })

      if (response.ok) {
        setTeams(prevTeams =>
          prevTeams.map(team =>
            team.id === teamId ? { ...team, checkedIn } : team
          )
        )
      } else {
        const error = await response.json()
        alert(t(`Kunne ikke oppdatere innsjekk: ${error.error || 'Ukjent feil'}`, `Could not update check-in: ${error.error || 'Unknown error'}`))
      }
    } catch (error) {
      console.error('Error updating team check-in:', error)
      alert(t('Noe gikk galt ved oppdatering av innsjekk', 'Something went wrong updating check-in'))
    }
  }

  const updateTournamentCheckIn = async (tournamentId: string, checkInOpen: boolean) => {
    try {
      const response = await fetch('/api/tournaments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tournamentId, check_in_open: checkInOpen })
      })

      if (response.ok) {
        setTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, checkInOpen } : t))
      } else {
        const error = await response.json()
        alert(t(`Kunne ikke oppdatere innsjekk: ${error.error || 'Ukjent feil'}`, `Could not update check-in: ${error.error || 'Unknown error'}`))
      }
    } catch (error) {
      console.error('Error updating tournament check-in:', error)
      alert(t('Noe gikk galt ved oppdatering av innsjekk', 'Something went wrong updating check-in'))
    }
  }

  const deleteTeam = (teamId: string) => {
    if (confirm(t('Er du sikker på at du vil slette dette laget?', 'Are you sure you want to delete this team?'))) {
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
      [
        t('Lag', 'Team'),
        t('Kaptein', 'Captain'),
        t('E-post', 'Email'),
        t('Forventet spillere', 'Expected players'),
        t('Status', 'Status'),
        t('Betalingsstatus', 'Payment status'),
        t('Registrert', 'Registered')
      ],
      ...filteredTeams.map(team => [
        team.teamName || team.team_name,
        team.captainName || team.captain_name,
        team.captainEmail || team.captain_email,
        team.expectedPlayers || team.expected_players || team.players?.length || 0,
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
    const subject = encodeURIComponent(t('PRO11 - Informasjon om laget ditt', 'PRO11 - Information about your team'))
    const body = encodeURIComponent(`${t('Hei', 'Hi')} ${team.captainName}!

${t('Takk for påmelding til PRO11-turneringen.', 'Thank you for registering for the PRO11 tournament.')}

      ${t('Lag', 'Team')}: ${team.teamName}
      ${t('Status', 'Status')}: ${getStatusText(team.status)}
      ${t('Betalingsstatus', 'Payment status')}: ${getPaymentStatusText(team.paymentStatus)}

${t('Hvis du har spørsmål, kontakt oss på Discord.', 'If you have questions, contact us on Discord.')}

${t('Med vennlig hilsen', 'Best regards')}
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
      setTournamentGen(getGenFromDescription(tournament.description || ''))
      setTournamentFormatText(getFormatFromDescription(tournament.description || ''))
      const perTeamPot = getPerTeamPotFromDescription(tournament.description || '')
      setTournamentPotPerTeam(perTeamPot ? String(perTeamPot) : '')
    } else {
      setEditingTournament(null)
      setIsNewTournament(true)
      setTournamentGen('both')
      setTournamentFormatText('')
      setTournamentPotPerTeam('')
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
        alert(t('Dato er påkrevd!', 'Date is required!'))
        return
      }
      
      if (!tournamentData.title) {
        alert(t('Tittel er påkrevd!', 'Title is required!'))
        return
      }
      
      const perTeamPotValue = Number(tournamentPotPerTeam)
      const safePerTeamPot = Number.isFinite(perTeamPotValue) ? perTeamPotValue : 0
      const currentTeamsCount = editingTournament?.registeredTeams ?? 0
      const prizePool = safePerTeamPot > 0 ? safePerTeamPot * currentTeamsCount : 0
      
      const dbData: any = {
        title: tournamentData.title,
        description: buildDescriptionWithGen(
          tournamentData.description || '',
          tournamentGen,
          tournamentFormatText,
          safePerTeamPot
        ),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        max_teams: tournamentData.maxTeams || 16,
        prize_pool: prizePool,
        entry_fee: tournamentData.entryFee ?? 299,
        status: tournamentData.status === 'open' ? 'upcoming' : 
                tournamentData.status === 'ongoing' ? 'active' :
                tournamentData.status === 'completed' ? 'completed' :
                tournamentData.status === 'archived' ? 'archived' : 'cancelled'
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
          let status: 'open' | 'ongoing' | 'closed' | 'completed' | 'archived' = 'open'
          if (newTournament.status === 'active') status = 'ongoing'
          else if (newTournament.status === 'completed') status = 'completed'
          else if (newTournament.status === 'archived') status = 'archived'
          else if (newTournament.status === 'cancelled') status = 'closed'
          
          const perTeamPot = getPerTeamPotFromDescription(newTournament.description || '')
          const eligibleTeams = (newTournament.eligible_teams ?? newTournament.current_teams) || 0
          const computedPrizePool = perTeamPot !== null
            ? perTeamPot * eligibleTeams
            : newTournament.prize_pool
          const transformedNewTournament = {
            id: newTournament.id,
            title: newTournament.title,
            date,
            time,
            registeredTeams: eligibleTeams,
            maxTeams: newTournament.max_teams,
            status,
            prize: `${computedPrizePool.toLocaleString('nb-NO')} NOK`,
            entryFee: newTournament.entry_fee,
            description: newTournament.description || '',
            format: 'mixed' as const,
            checkInOpen: newTournament.check_in_open ?? false
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
                let status: 'open' | 'ongoing' | 'closed' | 'completed' | 'archived' = 'open'
                if (t.status === 'active') status = 'ongoing'
                else if (t.status === 'completed') status = 'completed'
                else if (t.status === 'archived') status = 'archived'
                else if (t.status === 'cancelled') status = 'closed'
                const perTeamPot = getPerTeamPotFromDescription(t.description || '')
                const eligibleTeams = (t.eligible_teams ?? t.current_teams) || 0
                const computedPrizePool = perTeamPot !== null ? perTeamPot * eligibleTeams : t.prize_pool
                return {
                  id: t.id,
                  title: t.title,
                  date,
                  time,
                  registeredTeams: eligibleTeams,
                  maxTeams: t.max_teams,
                  status,
                  prize: `${computedPrizePool.toLocaleString('nb-NO')} NOK`,
                  entryFee: t.entry_fee,
                  description: t.description || '',
                  format: 'mixed' as const,
                  checkInOpen: t.check_in_open ?? false
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
                let status: 'open' | 'ongoing' | 'closed' | 'completed' | 'archived' = 'open'
                if (t.status === 'active') status = 'ongoing'
                else if (t.status === 'completed') status = 'completed'
                else if (t.status === 'archived') status = 'archived'
                else if (t.status === 'cancelled') status = 'closed'
                const perTeamPot = getPerTeamPotFromDescription(t.description || '')
                const eligibleTeams = (t.eligible_teams ?? t.current_teams) || 0
                const computedPrizePool = perTeamPot !== null ? perTeamPot * eligibleTeams : t.prize_pool
                return {
                  id: t.id,
                  title: t.title,
                  date,
                  time,
                  registeredTeams: eligibleTeams,
                  maxTeams: t.max_teams,
                  status,
                  prize: `${computedPrizePool.toLocaleString('nb-NO')} NOK`,
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
          const errorMessage = responseData.error || t('Kunne ikke oppdatere turnering', 'Could not update tournament')
          alert(`${t('Feil', 'Error')}: ${errorMessage}`)
          console.error('Failed to update tournament:', responseData)
          return // Don't close modal on error
        }
      }
      // Modal is closed in success cases above
    } catch (error) {
      console.error('Error saving tournament:', error)
      alert(t('Noe gikk galt ved lagring av turnering: ', 'Something went wrong saving the tournament: ') + (error instanceof Error ? error.message : t('Ukjent feil', 'Unknown error')))
      // Don't close modal on error
    }
  }

  const deleteTournament = async (tournamentId: string) => {
    if (confirm(t('Er du sikker på at du vil slette denne turneringen? Dette vil også slette alle påmeldte lag.', 'Are you sure you want to delete this tournament? This will also delete all registered teams.'))) {
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
                let status: 'open' | 'ongoing' | 'closed' | 'completed' | 'archived' = 'open'
                if (t.status === 'active') status = 'ongoing'
                else if (t.status === 'completed') status = 'completed'
                else if (t.status === 'archived') status = 'archived'
                else if (t.status === 'cancelled') status = 'closed'
                return {
                  id: t.id,
                  title: t.title,
                  date,
                  time,
                  registeredTeams: (t.eligible_teams ?? t.current_teams) || 0,
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

    const buildKey = (teamA: string, teamB: string) => [teamA, teamB].sort().join('|')

    groups.forEach((group, groupIndex) => {
      const groupName = `Gruppe ${String.fromCharCode(65 + groupIndex)}`
      const teams = [...group]
      if (teams.length < 2) return

      if (teams.length % 2 === 1) {
        teams.push('__BYE__')
      }

      const totalRounds = teams.length - 1
      const half = teams.length / 2
      let rotation = [...teams]
      const usedPairs = new Set<string>()

      for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
        for (let i = 0; i < half; i += 1) {
          const home = rotation[i]
          const away = rotation[rotation.length - 1 - i]
          if (home === '__BYE__' || away === '__BYE__') continue
          const key = buildKey(home, away)
          if (usedPairs.has(key)) continue
          usedPairs.add(key)

          matches.push({
            id: `match-${matchId++}`,
            team1: home,
            team2: away,
            round: 'Gruppespill',
            group: groupName,
            groupRound: roundIndex + 1,
            status: 'scheduled'
          })
        }
        const fixed = rotation[0]
        const rest = rotation.slice(1)
        rest.unshift(rest.pop() as string)
        rotation = [fixed, ...rest]
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

  // Generate knockout bracket with proper round names (Kvartfinaler, Semifinaler, Finale)
  // Only generates the first round - later rounds should be generated when previous round is complete
  const generateKnockoutBracket = (teams: string[]): Match[] => {
    const shuffledTeams = shuffleArray(teams)
    const matches: Match[] = []
    let matchIdCounter = 1
    
    // Determine round name based on number of teams
    const getRoundName = (numTeams: number): string => {
      if (numTeams === 2) return 'Finale'
      if (numTeams === 4) return 'Semifinaler'
      if (numTeams === 8) return 'Kvartfinaler'
      if (numTeams > 8) return 'Kvartfinaler'
      if (numTeams > 4) return 'Semifinaler'
      return 'Sluttspill'
    }
    
    const roundName = getRoundName(shuffledTeams.length)
    
    // Generate matches for first round only
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        matches.push({
          id: `match-${Date.now()}-${matchIdCounter++}`,
          team1: shuffledTeams[i],
          team2: shuffledTeams[i + 1],
          round: roundName,
          status: 'scheduled'
        })
      } else {
        // Odd number of teams - last team gets a bye (advances automatically)
        // We could create a "bye" match, but for now we'll skip it
        // The team will need to be manually added to next round
      }
    }
    
    return matches
  }

  const openMatchConfigModal = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    if (!tournament) {
      alert(t('Turnering ikke funnet!', 'Tournament not found!'))
      return
    }

    const approvedTeams = teams
      .filter(team => isTeamEligibleForMatches(team) && (team.tournamentId === tournamentId || team.tournament_id === tournamentId))
      .map(team => team.teamName || team.team_name)
      .filter((name): name is string => name !== undefined && name !== null)

    if (approvedTeams.length < 4) {
      alert(t('Du trenger minst 4 godkjente lag som er sjekket inn for å generere kamper!', 'You need at least 4 approved and checked-in teams to generate matches!'))
      return
    }

    // Calculate default values
    const totalTeams = approvedTeams.length
    let defaultNumGroups = 2
    if (totalTeams > 16) defaultNumGroups = 4
    else if (totalTeams > 8) defaultNumGroups = 3
    
    const defaultTeamsPerGroup = Math.floor(totalTeams / defaultNumGroups)
    const defaultTeamsToKnockout = Math.min(2, defaultTeamsPerGroup)

    setMatchConfig({
      numGroups: defaultNumGroups,
      teamsPerGroup: 0, // Auto
      teamsToKnockout: defaultTeamsToKnockout,
      useBestRunnersUp: false,
      numBestRunnersUp: 0
    })
    
    setTournamentForMatchGeneration(tournamentId)
    setShowMatchConfigModal(true)
  }

  const autoGenerateMatches = (tournamentId: string, config?: typeof matchConfig) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    if (!tournament) {
      alert(t('Turnering ikke funnet!', 'Tournament not found!'))
      return
    }

    const approvedTeams = teams
      .filter(team => isTeamEligibleForMatches(team) && (team.tournamentId === tournamentId || team.tournament_id === tournamentId))
      .map(team => team.teamName || team.team_name)
      .filter((name): name is string => name !== undefined && name !== null)

    if (approvedTeams.length < 4) {
      alert(t('Du trenger minst 4 godkjente lag som er sjekket inn for å generere kamper!', 'You need at least 4 approved and checked-in teams to generate matches!'))
      return
    }

    // Use provided config or default
    const useConfig = config || matchConfig
    try {
      localStorage.setItem(`matchConfig:${tournamentId}`, JSON.stringify(useConfig))
    } catch (error) {
      console.warn('Could not persist match config:', error)
    }
    const totalTeams = approvedTeams.length

    let matches: Match[] = []
    let groups: string[][] = []
    let formatText = ''

    if (tournament.format === 'group_stage' || tournament.format === 'mixed') {
      // Calculate number of groups
      let numGroups = useConfig.numGroups
      if (numGroups <= 0) {
        numGroups = totalTeams <= 8 ? 2 : 4
      }

      // Calculate teams per group
      let teamsPerGroup = useConfig.teamsPerGroup
      if (teamsPerGroup <= 0) {
        teamsPerGroup = Math.floor(totalTeams / numGroups)
      }

      // Validate configuration
      if (numGroups * teamsPerGroup > totalTeams) {
        alert(`Konfigurasjonen er ugyldig: ${numGroups} grupper × ${teamsPerGroup} lag = ${numGroups * teamsPerGroup} lag, men du har bare ${totalTeams} lag.`)
        return
      }

      groups = generateGroupStage(approvedTeams, numGroups)
      matches = generateGroupMatches(groups)

      const groupLines = [
        `Gruppespill: ${numGroups} grupper`,
        `Lag per gruppe: ${teamsPerGroup}`,
        `Videre til sluttspill: ${useConfig.teamsToKnockout} fra hver gruppe`
      ]
      if (useConfig.useBestRunnersUp && useConfig.numBestRunnersUp > 0) {
        groupLines.push(`Beste 2.-plasser videre: ${useConfig.numBestRunnersUp}`)
      }
      formatText = groupLines.join('\n')
    }

    if (tournament.format === 'knockout') {
      // For knockout eller mixed, generer sluttspill basert på konfigurasjon
      let knockoutTeams: string[] = []
      
      // Pure knockout - use all teams
      knockoutTeams = approvedTeams
      
      // Generate knockout bracket with proper round names (Kvartfinaler, Semifinaler, Finale)
      const knockoutMatches = generateKnockoutBracket(knockoutTeams)
      matches = [...matches, ...knockoutMatches]
      formatText = 'Sluttspill: cup (alle lag)'
    }

    if (tournament.format === 'mixed' && formatText) {
      formatText = `${formatText}\nSluttspill: cup`
    }

    const updateTournamentFormat = async () => {
      if (!formatText) return
      try {
        const gen = getGenFromDescription(tournament.description || '')
        const baseDescription = stripGenFromDescription(tournament.description || '')
        const perTeamPot = getPerTeamPotFromDescription(tournament.description || '')
        const descriptionWithFormat = buildDescriptionWithGen(baseDescription, gen, formatText, perTeamPot)
        const response = await fetch('/api/tournaments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tournamentId, description: descriptionWithFormat })
        })
        if (response.ok) {
          setTournaments(prev => prev.map(t => (
            t.id === tournamentId ? { ...t, description: descriptionWithFormat } : t
          )))
        }
      } catch (error) {
        console.warn('Could not update tournament format description:', error)
      }
    }

    updateTournamentFormat()

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

          if (match.groupRound !== undefined) {
            matchData.group_round = match.groupRound
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
                    
                    let status: 'open' | 'ongoing' | 'closed' | 'completed' | 'archived' = 'open'
                    if (t.status === 'active') status = 'ongoing'
                    else if (t.status === 'completed') status = 'completed'
                    else if (t.status === 'archived') status = 'archived'
                    else if (t.status === 'cancelled') status = 'closed'
                    
                    return {
                      id: t.id,
                      title: t.title,
                      date,
                      time,
                      registeredTeams: (t.eligible_teams ?? t.current_teams) || 0,
                      maxTeams: t.max_teams,
                      status,
                      prize: `${t.prize_pool.toLocaleString('nb-NO')} NOK`,
                      entryFee: t.entry_fee,
                      description: t.description || '',
                      format: 'mixed' as const,
                      matches: loadedMatches,
                      groups: t.id === tournamentId ? groups : undefined,
                      checkInOpen: t.check_in_open ?? false
                    }
                  }
                } catch (error) {
                  console.error(`Error loading matches for tournament ${t.id}:`, error)
                }
                
                const startDate = new Date(t.start_date)
                const date = startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
                const time = startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
                
                let status: 'open' | 'ongoing' | 'closed' | 'completed' | 'archived' = 'open'
                if (t.status === 'active') status = 'ongoing'
                else if (t.status === 'completed') status = 'completed'
                else if (t.status === 'archived') status = 'archived'
                else if (t.status === 'cancelled') status = 'closed'
                
                return {
                  id: t.id,
                  title: t.title,
                  date,
                  time,
                  registeredTeams: (t.eligible_teams ?? t.current_teams) || 0,
                  maxTeams: t.max_teams,
                  status,
                  prize: `${t.prize_pool.toLocaleString('nb-NO')} NOK`,
                  entryFee: t.entry_fee,
                  description: t.description || '',
                  format: 'mixed' as const,
                  matches: [],
                  groups: t.id === tournamentId ? groups : undefined,
                  checkInOpen: t.check_in_open ?? false
                }
              })
            )
            
            setTournaments(tournamentsWithMatches)
          }
        }

        alert(t(
          `Kampene er generert og lagret!\n\nGruppespill: ${matches.filter(m => m.round === 'Gruppespill').length} kamper\nSluttspill: ${matches.filter(m => m.round === 'Sluttspill').length} kamper\n\nTurneringen er satt til "Pågående"`,
          `Matches have been generated and saved!\n\nGroup stage: ${matches.filter(m => m.round === 'Gruppespill').length} matches\nKnockout: ${matches.filter(m => m.round === 'Sluttspill').length} matches\n\nTournament status set to "Ongoing"`
        ))
      } catch (error) {
        console.error('Error saving matches:', error)
        alert(t(
          'Kampene ble generert, men det oppstod en feil ved lagring til database. Sjekk konsollen for detaljer.',
          'Matches were generated, but there was an error saving to the database. Check the console for details.'
        ))
      }
    }
    
    saveMatchesToDatabase()
  }

  const generateKnockoutFromGroups = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    if (!tournament || !tournament.groups || !tournament.matches) {
      alert(t('Turnering ikke funnet eller ingen grupper generert!', 'Tournament not found or no groups generated!'))
      return
    }

    // Sjekk om gruppespill er ferdig
    const groupMatches = tournament.matches.filter(m => m.round === 'Gruppespill')
    const completedGroupMatches = groupMatches.filter(m => m.status === 'completed')
    
    if (completedGroupMatches.length < groupMatches.length) {
      alert(t('Gruppespill må være fullført før sluttspill kan genereres!', 'Group stage must be completed before knockout can be generated!'))
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

    // Ta de beste lagene fra hver gruppe (konfigurerbart antall)
    const teamsToKnockout = Math.max(1, matchConfig.teamsToKnockout || 2)
    const baseTeams = groupStandings.flatMap(standings => 
      standings.slice(0, teamsToKnockout).map(s => s.team)
    )
    
    // Valgfritt: ta beste 2.-plasser
    let knockoutTeams = baseTeams
    if (matchConfig.useBestRunnersUp && matchConfig.numBestRunnersUp > 0) {
      const runnersUp = groupStandings
        .map(standings => standings[1])
        .filter(Boolean)
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points
          if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
          return b.goalsFor - a.goalsFor
        })
      const extraTeams = runnersUp
        .slice(0, matchConfig.numBestRunnersUp)
        .map(s => s.team)
      const combinedTeams = [...knockoutTeams, ...extraTeams]
      knockoutTeams = combinedTeams.filter((team, index) => combinedTeams.indexOf(team) === index)
    }

    if (knockoutTeams.length < 2) {
      alert('Du trenger minst 2 lag for sluttspill!')
      return
    }

    // Generer sluttspill-kamper med riktig rundenavn
    const knockoutMatches = generateKnockoutBracket(knockoutTeams)
    
    const saveKnockoutMatches = async () => {
      try {
        // Slett eksisterende sluttspillkamper, behold gruppespill
        const deleteResponse = await fetch(`/api/matches?tournament_id=${tournamentId}&keep_group=true`, {
          method: 'DELETE'
        })
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json()
          throw new Error(errorData.error || 'Kunne ikke slette sluttspillkamper')
        }

        // Lagre nye sluttspillkamper
        const insertPromises = knockoutMatches.map(async (match) => {
          const response = await fetch('/api/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tournament_id: tournamentId,
              team1_name: match.team1,
              team2_name: match.team2,
              round: match.round,
              status: match.status || 'scheduled'
            })
          })
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Kunne ikke opprette kamp')
          }
          return response.json()
        })
        
        await Promise.all(insertPromises)

        // Reload matches for this tournament
        const matchesResponse = await fetch(`/api/matches?tournament_id=${tournamentId}`)
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json()
          const refreshedMatches = (matchesData.matches || []).map((m: any) => ({
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
          setTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, matches: refreshedMatches } : t))
        }

        console.log('Generated knockout matches:', knockoutMatches)
        console.log('Group standings:', groupStandings)
        
        alert(`Sluttspill generert!\n\n${knockoutTeams.length} lag kvalifisert til sluttspill\n${knockoutMatches.length} nye kamper opprettet`)
      } catch (error: any) {
        console.error('Error generating knockout matches:', error)
        alert(`Feil ved generering av sluttspill: ${error.message || 'Ukjent feil'}`)
      }
    }

    saveKnockoutMatches()
  }

  // Statistics
  const totalTeams = teams.length
  const pendingTeams = teams.filter(t => t.status === 'pending').length
  const approvedTeams = teams.filter(t => t.status === 'approved').length
  const isTeamPaid = (team: Team) =>
    team.paymentStatus === 'paid' || team.payment_status === 'completed'
  const isTeamEligible = (team: Team) =>
    team.status === 'approved' || team.paymentStatus === 'paid' || team.payment_status === 'completed'
  const isTeamCheckedIn = (team: Team) => team.checkedIn ?? team.checked_in ?? false
  const isTeamEligibleForMatches = (team: Team) => isTeamEligible(team) && isTeamCheckedIn(team)
  const paidTeams = teams.filter(isTeamPaid).length
  const eligibleTeamsByTournament = teams.reduce((acc: Record<string, number>, team) => {
    if (!isTeamEligible(team)) return acc
    const tournamentId = team.tournamentId || team.tournament_id
    if (!tournamentId) return acc
    acc[tournamentId] = (acc[tournamentId] || 0) + 1
    return acc
  }, {})

  const parsePrizeNok = (value: string) => {
    const digits = value.replace(/[^\d]/g, '')
    return digits ? Number(digits) : 0
  }

  const totalRevenue = tournaments.reduce((sum, tournament) => {
    const eligibleTeams = eligibleTeamsByTournament[tournament.id] || 0
    const perTeamPot = getPerTeamPotFromDescription(tournament.description || '')
    const prizePool = perTeamPot !== null
      ? perTeamPot * eligibleTeams
      : parsePrizeNok(tournament.prize || '0')
    const entryFeeTotal = (tournament.entryFee || 0) * eligibleTeams
    return sum + (entryFeeTotal - prizePool)
  }, 0)

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
                <p className="text-slate-400 text-sm">{t('Pro Clubs Turneringer', 'Pro Clubs Tournaments')}</p>
              </div>
            </div>
            <Link href="/" className="pro11-button-secondary flex items-center space-x-2">
              <span>{t('Tilbake', 'Back')}</span>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 flex flex-col items-center">
          <div className="max-w-md w-full">
            <div className="pro11-card p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-6">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold mb-4">{t('Admin Tilgang', 'Admin Access')}</h1>
              <p className="text-slate-300 mb-8">
                {t('Skriv inn admin-passordet for å få tilgang til administrasjonspanelet', 'Enter the admin password to access the admin panel')}
              </p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('Admin passord', 'Admin password')}
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
                  {t('Logg inn', 'Log in')}
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
              <p className="text-slate-400 text-sm">{t('Pro Clubs Turneringer', 'Pro Clubs Tournaments')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-green-400 text-sm">{t('Admin tilgang', 'Admin access')}</span>
            <Link href="/" className="pro11-button-secondary flex items-center space-x-2">
              <span>{t('Tilbake', 'Back')}</span>
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
              {t('Administrer lag, turneringer og innstillinger', 'Manage teams, tournaments, and settings')}
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="pro11-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{t('Totalt lag', 'Total teams')}</p>
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
                  <p className="text-slate-400 text-sm">{t('Inntekter', 'Revenue')}</p>
                  <p className="text-2xl font-bold">{totalRevenue} NOK</p>
                </div>
                <Trophy className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

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
                {t('Lag', 'Teams')}
              </button>
              <button
                onClick={() => setActiveTab('tournaments')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'tournaments' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('Turneringer', 'Tournaments')}
              </button>
              <button
                onClick={() => setActiveTab('prizes')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'prizes' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('Premier', 'Prizes')}
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'statistics' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('Statistikk', 'Statistics')}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'settings' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('Innstillinger', 'Settings')}
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'messages' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('Meldinger', 'Messages')}
              </button>
            </div>

            {activeTab === 'teams' && (
              <div>
                {/* Tournament Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('Velg turnering', 'Select tournament')}
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
                    <p className="text-slate-300">{t('Laster lag...', 'Loading teams...')}</p>
                  </div>
                ) : (
                  <>
                    {/* Teams Table */}
                    <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="py-2 px-3 text-left text-sm">{t('Lag', 'Team')}</th>
                        <th className="py-2 px-3 text-left text-sm">{t('Kaptein', 'Captain')}</th>
                        <th className="py-2 px-3 text-left text-sm">{t('Forventet', 'Expected')}</th>
                        <th className="py-2 px-3 text-left text-sm">{t('Status', 'Status')}</th>
                        <th className="py-2 px-3 text-left text-sm">{t('Betaling', 'Payment')}</th>
                        <th className="py-2 px-3 text-left text-sm">{t('Innsjekk', 'Check-in')}</th>
                        <th className="py-2 px-3 text-left text-sm">{t('Registrert', 'Registered')}</th>
                        <th className="py-2 px-3 text-left text-sm">{t('Handlinger', 'Actions')}</th>
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
                          <td className="py-2 px-3 text-sm">
                            {team.expectedPlayers || team.expected_players || team.players?.length || 0} {t('spillere', 'players')}
                          </td>
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
                          <td className="py-2 px-3">
                            {isTeamCheckedIn(team) ? (
                              <span className="text-xs text-green-400">{t('Sjekket inn', 'Checked in')}</span>
                            ) : (
                              <span className="text-xs text-slate-400">{t('Ikke sjekket inn', 'Not checked in')}</span>
                            )}
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
                                title={t('Godkjenn', 'Approve')}
                              >
                                <CheckCircle className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => updateTeamStatus(team.id, 'rejected')}
                                className="text-red-400 hover:text-red-300"
                                title={t('Avvis', 'Reject')}
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                              {isTeamCheckedIn(team) ? (
                                <button
                                  onClick={() => updateTeamCheckIn(team.id, false)}
                                  className="text-orange-400 hover:text-orange-300"
                                  title={t('Fjern innsjekk', 'Remove check-in')}
                                >
                                  <XCircle className="w-3 h-3" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => updateTeamCheckIn(team.id, true)}
                                  className="text-blue-400 hover:text-blue-300"
                                  title={t('Sjekk inn', 'Check in')}
                                >
                                  <CheckCircle className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => sendEmailToTeam(team)}
                                className="text-purple-400 hover:text-purple-300"
                                title={t('Send e-post', 'Send email')}
                              >
                                <Mail className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteTeam(team.id)}
                                className="text-red-400 hover:text-red-300"
                                title={t('Slett lag', 'Delete team')}
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
                        <span>{t('Eksporter til CSV', 'Export to CSV')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'tournaments' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">{t('Turneringer', 'Tournaments')}</h3>
                  <button 
                    onClick={() => openTournamentModal()}
                    className="pro11-button flex items-center space-x-2 text-sm"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('Legg til turnering', 'Add tournament')}</span>
                  </button>
                </div>

                <div className="grid gap-3">
                  {tournaments.map(tournament => (
                    <div key={tournament.id} className="pro11-card p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{tournament.title}</h4>
                          <p className="text-xs text-slate-400">{tournament.date} - {tournament.time}</p>
                          <p className="text-xs text-slate-400">
                            {t('Premie', 'Prize')}: {tournament.prize} | {t('Påmeldingsgebyr', 'Entry fee')}: {tournament.entryFee} NOK
                          </p>
                          <p className="text-xs text-slate-400 mt-1">{tournament.description}</p>
                          {tournament.matches && tournament.matches.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-700">
                              <p className="text-xs text-slate-400 mb-1">{t('Kamper', 'Matches')}: {tournament.matches.length}</p>
                              <div className="text-xs text-slate-500">
                                {tournament.matches.filter((m: Match) => m.status === 'completed').length} {t('fullført', 'completed')},{' '}
                                {tournament.matches.filter((m: Match) => m.status === 'scheduled').length} {t('planlagt', 'scheduled')}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-xs text-slate-400">{t('Lag', 'Teams')}</p>
                            <p className="font-medium text-sm">{tournament.registeredTeams}/{tournament.maxTeams}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Link
                                href={`/admin/matches/${tournament.id}`}
                                className="pro11-button-secondary flex items-center space-x-1 text-xs"
                                title={t('Se kamper', 'View matches')}
                              >
                                <Trophy className="w-3 h-3" />
                                <span>{t('Se kamper', 'View matches')}</span>
                              </Link>
                              <button 
                                onClick={() => openMatchConfigModal(tournament.id)}
                                className="pro11-button flex items-center space-x-1 text-xs"
                                title={t('Generer kamper', 'Generate matches')}
                              >
                                <Trophy className="w-3 h-3" />
                                <span>{t('Generer kamper', 'Generate matches')}</span>
                              </button>
                              {tournament.format === 'mixed' && tournament.groups && (
                                <button 
                                  onClick={() => generateKnockoutFromGroups(tournament.id)}
                                  className="pro11-button-secondary flex items-center space-x-1 text-xs"
                                  title={t('Generer sluttspill', 'Generate knockout')}
                                >
                                  <BarChart3 className="w-3 h-3" />
                                  <span>{t('Sluttspill', 'Knockout')}</span>
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              {tournament.status !== 'archived' && (
                                <button
                                  onClick={() => updateTournamentCheckIn(tournament.id, !tournament.checkInOpen)}
                                  className="pro11-button-secondary flex items-center space-x-1 text-xs"
                                  title={t('Innsjekk', 'Check-in')}
                                >
                                  <Users className="w-3 h-3" />
                                  <span>
                                    {tournament.checkInOpen
                                      ? t('Steng innsjekk', 'Close check-in')
                                      : t('Åpne innsjekk', 'Open check-in')}
                                  </span>
                                </button>
                              )}
                              <button 
                                onClick={() => openTournamentModal(tournament)}
                                className="pro11-button-secondary flex items-center space-x-1 text-xs"
                              >
                                <Edit className="w-3 h-3" />
                                <span>{t('Rediger', 'Edit')}</span>
                              </button>
                              <button
                                onClick={() => deleteTournament(tournament.id)}
                                className="text-red-400 hover:text-red-300"
                                title={t('Slett turnering', 'Delete tournament')}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
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
                <h3 className="text-lg font-semibold mb-4">{t('Statistikk og rapporter', 'Statistics and reports')}</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="pro11-card p-4">
                    <h4 className="font-semibold mb-3 text-sm">{t('Lag-statistikk', 'Team statistics')}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('Totalt antall lag:', 'Total teams:')}</span>
                        <span className="font-medium">{totalTeams}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('Venter godkjenning:', 'Pending approval:')}</span>
                        <span className="font-medium text-yellow-400">{pendingTeams}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('Godkjent:', 'Approved:')}</span>
                        <span className="font-medium text-green-400">{approvedTeams}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('Betalt:', 'Paid:')}</span>
                        <span className="font-medium text-blue-400">{paidTeams}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pro11-card p-4">
                    <h4 className="font-semibold mb-3 text-sm">{t('Økonomisk oversikt', 'Financial overview')}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('Totale inntekter:', 'Total revenue:')}</span>
                        <span className="font-medium text-green-400">{totalRevenue} NOK</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('Gjennomsnitt per lag:', 'Average per team:')}</span>
                        <span className="font-medium">300 NOK</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('Betalinger i kø:', 'Payments pending:')}</span>
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
                    <span>{t('Eksporter fullstendig rapport', 'Export full report')}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{t('Meldinger fra lagledere', 'Messages from captains')}</h3>
                  <button
                    onClick={loadMessages}
                    className="pro11-button-secondary text-sm"
                  >
                    {t('Oppdater', 'Refresh')}
                  </button>
                </div>

                {isLoadingMessages ? (
                  <div className="text-sm text-slate-400">Laster meldinger...</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-slate-400">Ingen meldinger.</div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(message => (
                      <div key={message.id} className="pro11-card p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold">{message.team_name}</div>
                            <div className="text-xs text-slate-400">
                              {getTournamentTitleById(message.tournament_id)} • {new Date(message.created_at).toLocaleString('nb-NO')}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {message.captain_name} • {message.captain_email}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              message.status === 'resolved' ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'
                            }`}>
                              {message.status === 'resolved' ? 'Lest' : 'Ny'}
                            </span>
                            {message.status !== 'resolved' && (
                              <button
                                onClick={() => markMessageRead(message.id)}
                                className="pro11-button-secondary text-xs"
                              >
                                Marker som lest
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-300 mt-3 whitespace-pre-wrap">{message.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('Innstillinger', 'Settings')}</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="pro11-card p-4">
                    <h4 className="font-semibold mb-3 text-sm">{t('Admin-innstillinger', 'Admin settings')}</h4>
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
                        <span>{t('Oppdatert:', 'Updated:')}</span>
                        <span>15. januar 2025</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('Status:', 'Status:')}</span>
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
                <h3 className="font-semibold mb-2 text-xs">{t('Lag-info', 'Team info')}</h3>
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
                    <p className="text-slate-400">Discord</p>
                    <p className="font-medium">{selectedTeam.discordUsername || selectedTeam.discord_username || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">{t('Status', 'Status')}</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTeam.status)}`}>
                      {getStatusText(selectedTeam.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-400">{t('Betaling', 'Payment')}</p>
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
                {isNewTournament ? t('Legg til turnering', 'Add tournament') : t('Rediger turnering', 'Edit tournament')}
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
                const entryFeeValue = Number(formData.get('entryFee'))
                
                console.log('Form data:', {
                  title: formData.get('title'),
                  date,
                  time,
                  prizePerTeam: formData.get('prizePerTeam'),
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
                  entryFee: Number.isFinite(entryFeeValue) ? entryFeeValue : 299,
                  status: (formData.get('status') as 'open' | 'ongoing' | 'closed' | 'completed') || 'open'
                })
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('Turneringstitel *', 'Tournament title *')}
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
                    Premiepott per lag (NOK)
                  </label>
                  <input
                    type="number"
                    name="prizePerTeam"
                    value={tournamentPotPerTeam}
                    onChange={(e) => setTournamentPotPerTeam(e.target.value)}
                    className="pro11-input"
                    placeholder="500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('Påmeldingsgebyr (NOK)', 'Entry fee (NOK)')}
                  </label>
                  <input
                    type="number"
                    name="entryFee"
                    defaultValue={editingTournament?.entryFee ?? 299}
                    className="pro11-input"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('Status', 'Status')}
                </label>
                <select
                  name="status"
                  defaultValue={editingTournament?.status || 'open'}
                  className="pro11-input"
                >
                  <option value="open">{t('Åpen for påmelding', 'Open for registration')}</option>
                  <option value="ongoing">{t('Pågår', 'Ongoing')}</option>
                  <option value="closed">{t('Stengt', 'Closed')}</option>
                  <option value="completed">{t('Fullført', 'Completed')}</option>
                  <option value="archived">{t('Arkivert', 'Archived')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('Plattform (gen)', 'Platform (gen)')}
                </label>
                <div className="flex flex-wrap gap-3 text-sm">
                  <label className="inline-flex items-center gap-2 text-slate-300">
                    <input
                      type="radio"
                      name="tournamentGen"
                      value="new"
                      checked={tournamentGen === 'new'}
                      onChange={() => setTournamentGen('new')}
                    />
                    New Gen
                  </label>
                  <label className="inline-flex items-center gap-2 text-slate-300">
                    <input
                      type="radio"
                      name="tournamentGen"
                      value="old"
                      checked={tournamentGen === 'old'}
                      onChange={() => setTournamentGen('old')}
                    />
                    Old Gen
                  </label>
                  <label className="inline-flex items-center gap-2 text-slate-300">
                    <input
                      type="radio"
                      name="tournamentGen"
                      value="both"
                      checked={tournamentGen === 'both'}
                      onChange={() => setTournamentGen('both')}
                    />
                    {t('Begge', 'Both')}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('Format (vises på turneringssiden)', 'Format (shown on tournament page)')}
                </label>
                <textarea
                  value={tournamentFormatText}
                  onChange={(e) => setTournamentFormatText(e.target.value)}
                  className="pro11-input"
                  rows={4}
                  placeholder={t('Beskriv formatet for denne turneringen...', 'Describe the format for this tournament...')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Beskrivelse
                </label>
                <textarea
                  name="description"
                  defaultValue={stripGenFromDescription(editingTournament?.description)}
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
                  <span>{isNewTournament ? t('Legg til', 'Add') : t('Lagre', 'Save')}</span>
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

      {/* Match Generation Config Modal */}
      {showMatchConfigModal && tournamentForMatchGeneration && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="pro11-card p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Konfigurer kampgenerering</h2>
              <button
                onClick={() => {
                  setShowMatchConfigModal(false)
                  setTournamentForMatchGeneration(null)
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Number of Groups */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('Antall grupper', 'Number of groups')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={matchConfig.numGroups}
                  onChange={(e) => {
                    const numGroups = parseInt(e.target.value) || 1
                    setMatchConfig({ ...matchConfig, numGroups })
                  }}
                  className="pro11-input"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {t('Antall grupper turneringen skal deles inn i', 'How many groups the tournament should be split into')}
                </p>
              </div>

              {/* Teams per Group (optional - auto if 0) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('Lag per gruppe (0 = automatisk)', 'Teams per group (0 = auto)')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={matchConfig.teamsPerGroup}
                  onChange={(e) => {
                    const teamsPerGroup = parseInt(e.target.value) || 0
                    setMatchConfig({ ...matchConfig, teamsPerGroup })
                  }}
                  className="pro11-input"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {t('La stå på 0 for automatisk fordeling basert på antall lag', 'Leave at 0 for automatic distribution based on number of teams')}
                </p>
              </div>

              {/* Teams to Knockout per Group */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('Lag til sluttspill per gruppe', 'Teams to knockout per group')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={matchConfig.teamsToKnockout}
                  onChange={(e) => {
                    const teamsToKnockout = parseInt(e.target.value) || 1
                    setMatchConfig({ ...matchConfig, teamsToKnockout })
                  }}
                  className="pro11-input"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {t('Hvor mange lag fra hver gruppe som går videre til sluttspill', 'How many teams from each group advance to knockout')}
                </p>
              </div>

              {/* Use Best Runners-Up */}
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={matchConfig.useBestRunnersUp}
                    onChange={(e) => {
                      setMatchConfig({ 
                        ...matchConfig, 
                        useBestRunnersUp: e.target.checked,
                        numBestRunnersUp: e.target.checked ? matchConfig.numBestRunnersUp : 0
                      })
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-slate-300">
                    {t('Inkluder beste 2. plassene (best runners-up)', 'Include best 2nd places (best runners-up)')}
                  </span>
                </label>
                <p className="text-xs text-slate-400 mt-1 ml-6">
                  {t('Aktiver for å inkludere de beste 2. plassene fra gruppene i sluttspill', 'Enable to include the best second-place teams from groups in the knockout')}
                </p>
              </div>

              {/* Number of Best Runners-Up */}
              {matchConfig.useBestRunnersUp && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('Antall beste 2. plasser å inkludere', 'Number of best second-place teams to include')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={matchConfig.numBestRunnersUp}
                    onChange={(e) => {
                      const numBestRunnersUp = parseInt(e.target.value) || 0
                      setMatchConfig({ ...matchConfig, numBestRunnersUp })
                    }}
                    className="pro11-input"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {t('F.eks. 3 for å inkludere de 3 beste 2. plassene basert på poeng, målforskjell, etc.', 'E.g. 3 to include the top 3 second-place teams based on points, goal difference, etc.')}
                  </p>
                </div>
              )}

              {/* Info about current teams */}
              {tournamentForMatchGeneration && (() => {
                const tournament = tournaments.find(t => t.id === tournamentForMatchGeneration)
                const approvedTeams = teams
                  .filter(team => isTeamEligibleForMatches(team) && (team.tournamentId === tournamentForMatchGeneration || team.tournament_id === tournamentForMatchGeneration))
                  .map(team => team.teamName || team.team_name)
                  .filter((name): name is string => name !== undefined && name !== null)
                
                const totalTeams = approvedTeams.length
                const teamsPerGroup = matchConfig.teamsPerGroup || Math.floor(totalTeams / matchConfig.numGroups)
                const totalInGroups = matchConfig.numGroups * teamsPerGroup
                const teamsToKnockout = matchConfig.numGroups * matchConfig.teamsToKnockout + (matchConfig.useBestRunnersUp ? matchConfig.numBestRunnersUp : 0)

                return (
                  <div className="pro11-card p-4 bg-slate-800/50">
                    <h3 className="font-semibold mb-2 text-sm">{t('Oversikt', 'Overview')}</h3>
                    <div className="space-y-1 text-xs text-slate-300">
                      <p>{t('Godkjente og sjekket inn', 'Approved and checked in')}: <span className="font-semibold text-white">{totalTeams}</span></p>
                      <p>{t('Lag per gruppe', 'Teams per group')}: <span className="font-semibold text-white">{teamsPerGroup}</span></p>
                      <p>{t('Totalt i grupper', 'Total in groups')}: <span className="font-semibold text-white">{totalInGroups}</span></p>
                      {totalInGroups < totalTeams && (
                        <p className="text-yellow-400">{t(`⚠️ ${totalTeams - totalInGroups} lag vil ikke bli plassert i grupper`, `⚠️ ${totalTeams - totalInGroups} teams will not be placed in groups`)}</p>
                      )}
                      <p>{t('Lag til sluttspill', 'Teams to knockout')}: <span className="font-semibold text-white">{teamsToKnockout}</span></p>
                      {teamsToKnockout % 2 !== 0 && (
                        <p className="text-yellow-400">{t('⚠️ Oddetall lag i sluttspill - siste lag får walkover', '⚠️ Odd number of teams in knockout - last team gets a walkover')}</p>
                      )}
                    </div>
                  </div>
                )
              })()}

              <div className="flex space-x-2 pt-4">
                <button
                  onClick={() => {
                    if (tournamentForMatchGeneration) {
                      autoGenerateMatches(tournamentForMatchGeneration, matchConfig)
                      setShowMatchConfigModal(false)
                      setTournamentForMatchGeneration(null)
                    }
                  }}
                  className="pro11-button flex items-center space-x-1 text-sm"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Generer kamper</span>
                </button>
                <button
                  onClick={() => {
                    setShowMatchConfigModal(false)
                    setTournamentForMatchGeneration(null)
                  }}
                  className="pro11-button-secondary flex items-center space-x-1 text-sm"
                >
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