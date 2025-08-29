'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Shield, Users, Trophy, Calendar, Download, CheckCircle, XCircle, Eye, Plus, Settings, Lock, Edit, Trash2, Mail, Key, BarChart3 } from 'lucide-react'

interface Player {
  name: string
  psnId: string
  position: string
}

interface Team {
  id: string
  teamName: string
  captainName: string
  captainEmail: string
  players: Player[]
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  registeredAt: string
  tournamentId: string
  paymentStatus: 'pending' | 'paid' | 'refunded'
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

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'teams' | 'tournaments' | 'statistics' | 'settings'>('teams')
  const [selectedTournament, setSelectedTournament] = useState('fc26-launch-cup')
  
  // Modal states
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showTournamentModal, setShowTournamentModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [isNewTournament, setIsNewTournament] = useState(false)

  // Admin password (i produksjon bør dette være i en sikker database)
  const ADMIN_PASSWORD = 'pro11admin2025'

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setError('')
    } else {
      setError('Feil passord. Prøv igjen.')
      setPassword('')
    }
  }

  // Mock data
  const tournaments: Tournament[] = [
    {
      id: 'fc26-launch-cup',
      title: 'PRO11 FC 26 Launch Cup',
      date: '15. september 2025',
      time: '19:00',
      registeredTeams: 8,
      maxTeams: 16,
      status: 'open',
      prize: '15,000 NOK',
      entryFee: 300,
      description: 'Den første store turneringen i FC 26. 16 lag, gruppespill + sluttspill.',
      format: 'mixed'
    },
    {
      id: 'winter-championship',
      title: 'PRO11 Winter Championship',
      date: '20. november 2025',
      time: '18:00',
      registeredTeams: 0,
      maxTeams: 16,
      status: 'open',
      prize: '20,000 NOK',
      entryFee: 400,
      description: 'Vinterens største turnering med økte premier.',
      format: 'group_stage'
    }
  ]

  const initialTeams: Team[] = [
    {
      id: '1',
      teamName: 'Oslo United',
      captainName: 'Anders Hansen',
      captainEmail: 'anders@email.com',
      players: [
        { name: 'Anders Hansen', psnId: 'anders_hansen', position: 'ST' },
        { name: 'Erik Johansen', psnId: 'erik_johansen', position: 'CM' },
        { name: 'Lars Pedersen', psnId: 'lars_pedersen', position: 'CB' },
        { name: 'Morten Olsen', psnId: 'morten_olsen', position: 'GK' },
        { name: 'Thomas Berg', psnId: 'thomas_berg', position: 'RW' }
      ],
      status: 'pending',
      registeredAt: '2025-01-15',
      tournamentId: 'fc26-launch-cup',
      paymentStatus: 'pending'
    },
    {
      id: '2',
      teamName: 'Bergen Elite',
      captainName: 'Kristian Nilsen',
      captainEmail: 'kristian@email.com',
      players: [
        { name: 'Kristian Nilsen', psnId: 'kristian_nilsen', position: 'CAM' },
        { name: 'Ole Svendsen', psnId: 'ole_svendsen', position: 'CDM' },
        { name: 'Per Andersen', psnId: 'per_andersen', position: 'LB' },
        { name: 'Rune Jensen', psnId: 'rune_jensen', position: 'RB' },
        { name: 'Svein Larsen', psnId: 'svein_larsen', position: 'LW' },
        { name: 'Tore Moen', psnId: 'tore_moen', position: 'CF' }
      ],
      status: 'approved',
      registeredAt: '2025-01-14',
      tournamentId: 'fc26-launch-cup',
      paymentStatus: 'paid'
    },
    {
      id: '3',
      teamName: 'Trondheim Titans',
      captainName: 'Marius Solberg',
      captainEmail: 'marius@email.com',
      players: [
        { name: 'Marius Solberg', psnId: 'marius_solberg', position: 'ST' },
        { name: 'Henrik Dahl', psnId: 'henrik_dahl', position: 'CM' },
        { name: 'Vegard Nilsen', psnId: 'vegard_nilsen', position: 'CB' },
        { name: 'Stian Berg', psnId: 'stian_berg', position: 'GK' },
        { name: 'Einar Hansen', psnId: 'einar_hansen', position: 'RW' },
        { name: 'Knut Olsen', psnId: 'knut_olsen', position: 'LW' },
        { name: 'Arne Pedersen', psnId: 'arne_pedersen', position: 'CDM' }
      ],
      status: 'approved',
      registeredAt: '2025-01-13',
      tournamentId: 'fc26-launch-cup',
      paymentStatus: 'paid'
    }
  ]

  const [teams, setTeams] = useState<Team[]>(initialTeams)

  const filteredTeams = teams.filter(team => team.tournamentId === selectedTournament)

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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400'
      case 'paid':
        return 'text-green-400'
      case 'refunded':
        return 'text-red-400'
      default:
        return 'text-slate-400'
    }
  }

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Venter betaling'
      case 'paid':
        return 'Betalt'
      case 'refunded':
        return 'Refundert'
      default:
        return 'Ukjent'
    }
  }

  const updateTeamStatus = (teamId: string, newStatus: string) => {
    setTeams(prevTeams => 
      prevTeams.map(team => 
        team.id === teamId 
          ? { ...team, status: newStatus as 'pending' | 'approved' | 'rejected' | 'paid' }
          : team
      )
    )
  }

  const deleteTeam = (teamId: string) => {
    if (confirm('Er du sikker på at du vil slette dette laget?')) {
      setTeams(prevTeams => prevTeams.filter(team => team.id !== teamId))
    }
  }

  const exportTeams = () => {
    const csvContent = [
      ['Lag', 'Kaptein', 'E-post', 'Spillere', 'Status', 'Betalingsstatus', 'Registrert'],
      ...filteredTeams.map(team => [
        team.teamName,
        team.captainName,
        team.captainEmail,
        team.players.length,
        getStatusText(team.status),
        getPaymentStatusText(team.paymentStatus),
        team.registeredAt
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

  const saveTournament = (tournamentData: Partial<Tournament>) => {
    if (isNewTournament) {
      console.log('Legger til ny turnering:', tournamentData)
      // Her ville vi lagt til i databasen
    } else {
      console.log('Oppdaterer turnering:', tournamentData)
      // Her ville vi oppdatert i databasen
    }
    setShowTournamentModal(false)
  }

  const deleteTournament = (tournamentId: string) => {
    if (confirm('Er du sikker på at du vil slette denne turneringen?')) {
      console.log(`Sletter turnering ${tournamentId}`)
      // Her ville vi slettet fra databasen
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

    const approvedTeams = initialTeams
      .filter(team => team.status === 'approved' && team.tournamentId === tournamentId)
      .map(team => team.teamName)

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

    // Oppdater turneringen med kamper
    const updatedTournament = {
      ...tournament,
      matches,
      groups,
      status: 'ongoing' as const
    }

    console.log('Generated matches:', matches)
    console.log('Generated groups:', groups)
    
    alert(`Kampene er generert!\n\nGruppespill: ${matches.filter(m => m.round === 'Gruppespill').length} kamper\nSluttspill: ${matches.filter(m => m.round === 'Sluttspill').length} kamper\n\nTurneringen er satt til "Pågående"`)
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
                   <Link href="/admin/live" className="pro11-button flex items-center space-x-2">
                     <Trophy className="w-4 h-4" />
                     <span>Live Turnering</span>
                   </Link>
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
                              <div className="font-medium text-sm">{team.teamName}</div>
                              <div className="text-xs text-slate-400">{team.captainEmail}</div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-sm">{team.captainName}</td>
                          <td className="py-2 px-3 text-sm">{team.players.length} spillere</td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                              {getStatusText(team.status)}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`text-xs ${getPaymentStatusColor(team.paymentStatus)}`}>
                              {getPaymentStatusText(team.paymentStatus)}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-400">{team.registeredAt}</td>
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
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Lag</p>
                            <p className="font-medium text-sm">{tournament.registeredTeams}/{tournament.maxTeams}</p>
                          </div>
                          <div className="flex space-x-1">
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
              <h2 className="text-lg font-bold">{selectedTeam.teamName}</h2>
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
                    <p className="font-medium">{selectedTeam.captainName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">E-post</p>
                    <p className="font-medium">{selectedTeam.captainEmail}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTeam.status)}`}>
                      {getStatusText(selectedTeam.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-400">Betaling</p>
                    <span className={`text-xs ${getPaymentStatusColor(selectedTeam.paymentStatus)}`}>
                      {getPaymentStatusText(selectedTeam.paymentStatus)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-xs">Spillere ({selectedTeam.players.length})</h3>
                <div className="grid gap-1">
                  {selectedTeam.players.map((player, index) => (
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

            <form className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Turneringstitel
                </label>
                <input
                  type="text"
                  defaultValue={editingTournament?.title || ''}
                  className="pro11-input"
                  placeholder="PRO11 FC 26 Launch Cup"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Dato
                  </label>
                  <input
                    type="date"
                    defaultValue={editingTournament?.date || ''}
                    className="pro11-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Tid
                  </label>
                  <input
                    type="time"
                    defaultValue={editingTournament?.time || ''}
                    className="pro11-input"
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
                    defaultValue={editingTournament?.maxTeams || 16}
                    className="pro11-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Premie
                  </label>
                  <input
                    type="text"
                    defaultValue={editingTournament?.prize || ''}
                    className="pro11-input"
                    placeholder="15,000 NOK"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Påmeldingsgebyr
                  </label>
                  <input
                    type="number"
                    defaultValue={editingTournament?.entryFee || 300}
                    className="pro11-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Beskrivelse
                </label>
                <textarea
                  defaultValue={editingTournament?.description || ''}
                  className="pro11-input"
                  rows={2}
                  placeholder="Beskrivelse av turneringen..."
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => saveTournament({})}
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