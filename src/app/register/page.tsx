'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Users, User, Mail, Gamepad2, Plus, Trash2 } from 'lucide-react'
import Header from '../../components/Header'
import { fetchTournamentById } from '../../lib/tournaments'
import { useLanguage } from '@/components/LanguageProvider'

interface TeamRegistration {
  teamName: string
  captainName: string
  captainEmail: string
  discordUsername: string
  expectedPlayers: number
  clubLogo: File | null
  tournamentId: string
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<TeamRegistration>({
    teamName: '',
    captainName: '',
    captainEmail: '',
    discordUsername: '',
    expectedPlayers: 11,
    clubLogo: null,
    tournamentId: ''
  })
  const [tournament, setTournament] = useState<any>(null)
  const { language } = useLanguage()
  const isEnglish = language === 'en'
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoginLoading, setIsLoginLoading] = useState(false)

  // Fetch tournament from database
  useEffect(() => {
    const loadTournament = async () => {
      // Get first tournament if no ID specified
      if (!formData.tournamentId) {
        const response = await fetch('/api/tournaments')
        if (response.ok) {
          const data = await response.json()
          if (data.tournaments && data.tournaments.length > 0) {
            const t = data.tournaments[0]
            setFormData(prev => ({ ...prev, tournamentId: t.id }))
            // Transform to frontend format
            const startDate = new Date(t.start_date)
            const date = startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
            const time = startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
            const perTeamPotMatch = String(t.description || '').match(/\[POT_PER_TEAM:(\d+)\]/i)
            const perTeamPot = perTeamPotMatch ? Number(perTeamPotMatch[1]) : null
            const computedPrizePool = perTeamPot !== null ? perTeamPot * (t.current_teams || 0) : t.prize_pool
            setTournament({
              id: t.id,
              title: t.title,
              date,
              time,
              prize: `${computedPrizePool.toLocaleString('nb-NO')} NOK`,
              entryFee: t.entry_fee,
              description: t.description || ''
            })
          }
        }
      } else {
        const t = await fetchTournamentById(formData.tournamentId)
        setTournament(t)
      }
    }
    loadTournament()
  }, [formData.tournamentId])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData({ ...formData, clubLogo: file })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!formData.teamName || !formData.captainName || !formData.captainEmail) {
      alert(isEnglish ? 'Please fill in all required fields' : 'Vennligst fyll ut alle påkrevde felter')
      return
    }

    if (formData.expectedPlayers < 2 || formData.expectedPlayers > 11) {
      alert(isEnglish ? 'Number of players must be between 2 and 11' : 'Antall spillere må være mellom 2 og 11')
      return
    }

    try {
      // Send til database via API
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamName: formData.teamName,
          captainName: formData.captainName,
          captainEmail: formData.captainEmail,
          discordUsername: formData.discordUsername,
          captainPhone: '', // Ikke implementert i skjemaet ennå
          expectedPlayers: formData.expectedPlayers,
          tournamentId: formData.tournamentId
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Lagre registreringsdata til localStorage med team ID
        const registrationData = {
          ...formData,
          teamId: result.team.id,
          password: result.password,
          entryFee: tournament?.entryFee ?? 0
        }
        localStorage.setItem('teamRegistration', JSON.stringify(registrationData))
        
        // Lagre team-data for adminpanelet
        const existingTeams = JSON.parse(localStorage.getItem('adminTeams') || '[]')
        existingTeams.push(result.team)
        localStorage.setItem('adminTeams', JSON.stringify(existingTeams))
        
        // Redirect til passord-visning siden
        window.location.href = '/registration-success'
      } else {
        const error = await response.json()
        alert(`${isEnglish ? 'Registration failed' : 'Registrering feilet'}: ${error.error || (isEnglish ? 'Unknown error' : 'Ukjent feil')}`)
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert(isEnglish ? 'Registration failed. Please try again.' : 'Registrering feilet. Prøv igjen.')
    }
  }

  const handleCaptainSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    if (!loginEmail || !loginPassword) {
      setLoginError(isEnglish ? 'Please enter email and password.' : 'Skriv inn e-post og passord.')
      return
    }

    if (!formData.tournamentId) {
      setLoginError(isEnglish ? 'No tournament selected.' : 'Ingen turnering valgt.')
      return
    }

    setIsLoginLoading(true)

    try {
      const teamsResponse = await fetch('/api/teams')
      if (!teamsResponse.ok) {
        throw new Error('Could not load teams')
      }

      const teamsData = await teamsResponse.json()
      const teams = teamsData.teams || []
      const matchingTeams = teams.filter((t: any) => (t.captainEmail || t.captain_email) === loginEmail)
      if (matchingTeams.length === 0) {
        setLoginError(isEnglish ? 'Incorrect email or password.' : 'Feil e-post eller passord.')
        return
      }

      const latestTeam = matchingTeams.sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateB - dateA
      })[0]

      const teamPassword = latestTeam.generatedPassword || latestTeam.generated_password
      if (loginPassword !== teamPassword) {
        setLoginError(isEnglish ? 'Incorrect email or password.' : 'Feil e-post eller passord.')
        return
      }

      const isEligible =
        latestTeam.status === 'approved' ||
        latestTeam.paymentStatus === 'paid' ||
        latestTeam.payment_status === 'completed'

      if (!isEligible) {
        setLoginError(
          isEnglish
            ? 'Your team must be approved/paid before you can join a new tournament.'
            : 'Laget må være godkjent/betalt før dere kan melde dere på en ny turnering.'
        )
        return
      }

      const tournamentTeamsResponse = await fetch(`/api/teams?tournamentId=${formData.tournamentId}`)
      if (tournamentTeamsResponse.ok) {
        const tournamentTeamsData = await tournamentTeamsResponse.json()
        const tournamentTeams = tournamentTeamsData.teams || []
        const normalize = (value: string) => value.trim().toLowerCase()
        const teamName = latestTeam.teamName || latestTeam.team_name || ''
        const alreadyRegistered = tournamentTeams.some((team: any) => {
          const existingName = team.teamName || team.team_name || ''
          const existingEmail = team.captainEmail || team.captain_email || ''
          return normalize(existingName) === normalize(teamName) || existingEmail === loginEmail
        })
        if (alreadyRegistered) {
          setLoginError(isEnglish ? 'Team is already registered for this tournament.' : 'Laget er allerede påmeldt denne turneringen.')
          return
        }
      }

      const registrationPayload = {
        teamName: latestTeam.teamName || latestTeam.team_name,
        captainName: latestTeam.captainName || latestTeam.captain_name,
        captainEmail: latestTeam.captainEmail || latestTeam.captain_email,
        discordUsername: latestTeam.discordUsername || latestTeam.discord_username || '',
        captainPhone: latestTeam.captainPhone || latestTeam.captain_phone || '',
        expectedPlayers: latestTeam.expectedPlayers || latestTeam.expected_players || 11,
        tournamentId: formData.tournamentId,
        reusePassword: teamPassword
      }

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationPayload)
      })

      if (!response.ok) {
        const error = await response.json()
        setLoginError(`${isEnglish ? 'Signup failed' : 'Påmelding feilet'}: ${error.error || (isEnglish ? 'Unknown error' : 'Ukjent feil')}`)
        return
      }

      const result = await response.json()
      const registrationData = {
        teamName: registrationPayload.teamName,
        captainName: registrationPayload.captainName,
        captainEmail: registrationPayload.captainEmail,
        discordUsername: registrationPayload.discordUsername,
        expectedPlayers: registrationPayload.expectedPlayers,
        clubLogo: null,
        tournamentId: formData.tournamentId,
        teamId: result.team.id,
        password: teamPassword,
        entryFee: tournament?.entryFee ?? 0
      }
      localStorage.setItem('teamRegistration', JSON.stringify(registrationData))

      const existingTeams = JSON.parse(localStorage.getItem('adminTeams') || '[]')
      existingTeams.push(result.team)
      localStorage.setItem('adminTeams', JSON.stringify(existingTeams))

      const entryFee = tournament?.entryFee ?? 0
      window.location.href = entryFee > 0 ? '/payment' : '/registration-success'
    } catch (error) {
      console.error('Captain signup error:', error)
      setLoginError(isEnglish ? 'Signup failed. Please try again.' : 'Påmelding feilet. Prøv igjen.')
    } finally {
      setIsLoginLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <Header backButton={true} backHref="/" />

      <main className="container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="max-w-4xl w-full">
          <div className="pro11-card p-5 mb-6 border border-blue-600/30 bg-blue-900/10">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  {isEnglish ? 'Captain login to join' : 'Lagleder login for påmelding'}
                </h2>
                <p className="text-slate-300 text-sm">
                  {isEnglish
                    ? 'Log in with your captain account to join the next tournament and keep team stats.'
                    : 'Logg inn med laglederkontoen for å melde laget på neste turnering og beholde statistikken.'}
                </p>
              </div>
              <form onSubmit={handleCaptainSignup} className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {isEnglish ? 'Captain email' : 'Lagleder e-post'}
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pro11-input w-full"
                    placeholder={isEnglish ? 'name@email.com' : 'anders@email.com'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {isEnglish ? 'Password' : 'Passord'}
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pro11-input w-full"
                    placeholder={isEnglish ? 'Password' : 'Passord'}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoginLoading}
                  className="pro11-button-secondary text-sm w-full md:w-auto"
                >
                  {isLoginLoading
                    ? (isEnglish ? 'Signing up...' : 'Meldes på...')
                    : (isEnglish ? 'Log in & join' : 'Logg inn og meld på')}
                </button>
              </form>
              {loginError && (
                <div className="text-red-400 text-sm">
                  {loginError}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-8 text-xs uppercase tracking-wider text-slate-400">
            <span className="h-px w-14 bg-slate-700"></span>
            <span>{isEnglish ? 'Or register a new team' : 'ELLER registrer nytt lag'}</span>
            <span className="h-px w-14 bg-slate-700"></span>
          </div>
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">{isEnglish ? 'Register team' : 'Meld på lag'}</h2>
            <p className="text-slate-300 text-lg">
              {isEnglish ? 'Register your team for' : 'Registrer laget ditt for'} {tournament?.title || 'PRO11 FC 26 Launch Cup'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="pro11-card p-8">
            {/* Tournament Info */}
            <div className="mb-8 p-4 bg-blue-600/20 rounded-lg border border-blue-500/30">
              <h3 className="text-xl font-semibold mb-2">{isEnglish ? 'Tournament' : 'Turnering'}</h3>
              <p className="text-slate-300">{tournament?.title} - {tournament?.date}</p>
              <p className="text-slate-400 text-sm">
                {isEnglish ? 'Prize' : 'Premie'}: {tournament?.prize} | {isEnglish ? 'Entry fee' : 'Påmeldingsgebyr'}:{' '}
                {tournament?.entryFee === 0 ? (
                  <span className="text-green-400 font-semibold">{isEnglish ? 'FREE' : 'GRATIS'}</span>
                ) : (
                  <span>{tournament?.entryFee} NOK</span>
                )}
              </p>
            </div>

            {/* Team Information */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>{isEnglish ? 'Team information' : 'Laginformasjon'}</span>
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">{isEnglish ? 'Team name *' : 'Lagnavn *'}</label>
                  <input
                    type="text"
                    value={formData.teamName}
                    onChange={(e) => setFormData({...formData, teamName: e.target.value})}
                    className="pro11-input w-full"
                    placeholder={isEnglish ? 'e.g. Oslo United' : 'F.eks. Oslo United'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{isEnglish ? 'Captain name *' : 'Kaptein navn *'}</label>
                  <input
                    type="text"
                    value={formData.captainName}
                    onChange={(e) => setFormData({...formData, captainName: e.target.value})}
                    className="pro11-input w-full"
                    placeholder={isEnglish ? 'Your name' : 'Ditt navn'}
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">{isEnglish ? 'Captain email *' : 'Kaptein e-post *'}</label>
                <input
                  type="email"
                  value={formData.captainEmail}
                  onChange={(e) => setFormData({...formData, captainEmail: e.target.value})}
                  className="pro11-input w-full"
                  placeholder={isEnglish ? 'you@email.com' : 'din@email.com'}
                  required
                />
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">{isEnglish ? 'Discord username' : 'Discord brukernavn'}</label>
                <input
                  type="text"
                  value={formData.discordUsername}
                  onChange={(e) => setFormData({...formData, discordUsername: e.target.value})}
                  className="pro11-input w-full"
                  placeholder={isEnglish ? 'e.g. username#1234' : 'f.eks. brukernavn#1234'}
                />
              </div>
            </div>

            {/* Expected Players */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5" />
                <span>{isEnglish ? 'Expected number of players' : 'Forventet antall spillere'}</span>
              </h3>
              <div>
                <label className="block text-sm font-medium mb-2">{isEnglish ? 'Number of players on the team *' : 'Antall spillere på laget *'}</label>
                <select
                  value={formData.expectedPlayers}
                  onChange={(e) => setFormData({...formData, expectedPlayers: parseInt(e.target.value)})}
                  className="pro11-input w-full"
                  required
                >
                  <option value="2">{isEnglish ? '2 players' : '2 spillere'}</option>
                  <option value="3">{isEnglish ? '3 players' : '3 spillere'}</option>
                  <option value="4">{isEnglish ? '4 players' : '4 spillere'}</option>
                  <option value="5">{isEnglish ? '5 players' : '5 spillere'}</option>
                  <option value="6">{isEnglish ? '6 players' : '6 spillere'}</option>
                  <option value="7">{isEnglish ? '7 players' : '7 spillere'}</option>
                  <option value="8">{isEnglish ? '8 players' : '8 spillere'}</option>
                  <option value="9">{isEnglish ? '9 players' : '9 spillere'}</option>
                  <option value="10">{isEnglish ? '10 players' : '10 spillere'}</option>
                  <option value="11">{isEnglish ? '11 players' : '11 spillere'}</option>
                </select>
                <p className="text-slate-400 text-sm mt-2">
                  {isEnglish
                    ? 'Select how many players you expect to participate. The team is not required to field exactly this number.'
                    : 'Velg forventet antall spillere som vil delta i turneringen. Det er ikke krav om at laget stiller med tallet som oppgis her.'}
                </p>
              </div>
            </div>

            {/* Club Logo */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold flex items-center space-x-2 mb-4">
                <Shield className="w-5 h-5" />
                <span>{isEnglish ? 'Club logo (optional)' : 'Klubb Logo (Valgfritt)'}</span>
              </h3>
              <div>
                <label className="block text-sm font-medium mb-2">{isEnglish ? 'Upload club logo' : 'Last opp klubb logo'}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="pro11-input w-full"
                />
                <p className="text-slate-400 text-sm mt-2">
                  {isEnglish ? 'PNG, JPG or GIF. Maximum size: 2MB' : 'PNG, JPG eller GIF. Maksimal størrelse: 2MB'}
                </p>
                {formData.clubLogo && (
                  <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-green-400">
                      ✓ {isEnglish ? 'Logo selected' : 'Logo valgt'}: {formData.clubLogo.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="text-center">
              <button type="submit" className="pro11-button text-lg px-8 py-4">
                {isEnglish ? 'Register team' : 'Registrer lag'}
              </button>
              <p className="text-slate-400 text-sm mt-4">
                {isEnglish
                  ? 'After registration you will see your password and can proceed to payment'
                  : 'Etter registrering vil du få se passordet ditt og kunne fortsette til betaling'}
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
} 