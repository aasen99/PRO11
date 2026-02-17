'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Users, User, Mail, Gamepad2, Plus, Trash2 } from 'lucide-react'
import Header from '../../components/Header'
import { fetchTournamentById } from '../../lib/tournaments'
import { useLanguage } from '@/components/LanguageProvider'
import { validatePasswordClient } from '@/lib/utils'

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
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [tournament, setTournament] = useState<any>(null)
  const { language } = useLanguage()
  const isEnglish = language === 'en'
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [pendingRegistration, setPendingRegistration] = useState<{
    registrationPayload: any
    teamPassword: string
  } | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tournamentParam = params.get('tournament')
    if (tournamentParam && tournamentParam !== formData.tournamentId) {
      setFormData(prev => ({ ...prev, tournamentId: tournamentParam }))
    }
  }, [formData.tournamentId])

  // Fetch tournament from database
  useEffect(() => {
    const loadTournament = async () => {
      // Get first tournament if no ID specified
      if (!formData.tournamentId) {
        const response = await fetch('/api/tournaments')
        if (response.ok) {
          const data = await response.json()
          if (data.tournaments && data.tournaments.length > 0) {
            const preferredTournament =
              data.tournaments.find((t: any) => ['open', 'ongoing', 'upcoming'].includes(t.status)) ||
              data.tournaments[0]
            const t = preferredTournament
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

    setPasswordError('')
    const v = validatePasswordClient(password)
    if (!v.valid) {
      const msg = v.errorKey === 'password_min_length'
        ? (isEnglish ? 'Password must be at least 6 characters' : 'Passordet må ha minst 6 tegn')
        : v.errorKey === 'password_uppercase'
          ? (isEnglish ? 'Password must contain at least one uppercase letter' : 'Passordet må inneholde minst én stor bokstav')
          : (isEnglish ? 'Password must contain at least one number' : 'Passordet må inneholde minst ett tall')
      setPasswordError(msg)
      return
    }
    if (password !== confirmPassword) {
      setPasswordError(isEnglish ? 'Passwords do not match' : 'Passordene er ikke like')
      return
    }

    try {
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
          captainPhone: '',
          expectedPlayers: formData.expectedPlayers,
          tournamentId: formData.tournamentId,
          password: password
        })
      })

      if (response.ok) {
        const result = await response.json()
        const registrationData = {
          ...formData,
          teamId: result.team.id,
          password: undefined,
          userChosePassword: true,
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
    setPendingRegistration(null)

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
      const loginRes = await fetch('/api/captain/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword })
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok || !loginData.team) {
        setLoginError(loginData.error || (isEnglish ? 'Incorrect email or password.' : 'Feil e-post eller passord.'))
        setIsLoginLoading(false)
        return
      }

      const latestTeam = loginData.team

      const tournamentTeamsResponse = await fetch(`/api/teams?tournamentId=${formData.tournamentId}`)
      if (tournamentTeamsResponse.ok) {
        const tournamentTeamsData = await tournamentTeamsResponse.json()
        const tournamentTeams = tournamentTeamsData.teams || []
        const normalize = (value: string) => value.trim().toLowerCase()
        const teamName = latestTeam.teamName || latestTeam.team_name || ''
        const alreadyRegistered = tournamentTeams.some((team: any) => {
          const existingName = team.teamName || team.team_name || ''
          const existingEmail = team.captainEmail || team.captain_email || ''
          return (
            normalize(existingName) === normalize(teamName) ||
            normalize(existingEmail) === normalize(loginEmail)
          )
        })
        if (alreadyRegistered) {
          setLoginError(isEnglish ? 'Team is already registered for this tournament.' : 'Laget er allerede påmeldt denne turneringen.')
          setIsLoginLoading(false)
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
        reusePassword: loginPassword
      }

      const entryFee = tournament?.entryFee ?? 0
      if (entryFee === 0) {
        setPendingRegistration({ registrationPayload, teamPassword: loginPassword })
        setIsLoginLoading(false)
        return
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
        password: undefined,
        userChosePassword: true,
        entryFee,
        existingTeam: true
      }
      localStorage.setItem('teamRegistration', JSON.stringify(registrationData))

      const existingTeams = JSON.parse(localStorage.getItem('adminTeams') || '[]')
      existingTeams.push(result.team)
      localStorage.setItem('adminTeams', JSON.stringify(existingTeams))

      window.location.href = entryFee > 0 ? '/payment' : '/registration-success'
    } catch (error) {
      console.error('Captain signup error:', error)
      setLoginError(isEnglish ? 'Signup failed. Please try again.' : 'Påmelding feilet. Prøv igjen.')
    } finally {
      setIsLoginLoading(false)
    }
  }

  const confirmRegistration = async () => {
    if (!pendingRegistration) return
    setIsConfirming(true)
    try {
      const { registrationPayload, teamPassword } = pendingRegistration
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
      const entryFee = tournament?.entryFee ?? 0
      const registrationData = {
        teamName: registrationPayload.teamName,
        captainName: registrationPayload.captainName,
        captainEmail: registrationPayload.captainEmail,
        discordUsername: registrationPayload.discordUsername,
        expectedPlayers: registrationPayload.expectedPlayers,
        clubLogo: null,
        tournamentId: formData.tournamentId,
        teamId: result.team.id,
        password: undefined,
        userChosePassword: true,
        entryFee,
        existingTeam: true
      }
      localStorage.setItem('teamRegistration', JSON.stringify(registrationData))
      window.location.href = entryFee > 0 ? '/payment' : '/registration-success'
    } catch (error) {
      console.error('Captain signup error:', error)
      setLoginError(isEnglish ? 'Signup failed. Please try again.' : 'Påmelding feilet. Prøv igjen.')
    } finally {
      setIsConfirming(false)
      setPendingRegistration(null)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <Header backButton={true} backHref="/" />

      <main className="container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-2">{isEnglish ? 'Register team' : 'Meld på lag'}</h2>
            <p className="text-slate-300 text-sm sm:text-base">
              {isEnglish ? 'Log in or register a new team' : 'Logg inn eller registrer nytt lag'}
            </p>
          </div>
          <div className="pro11-card p-4 sm:p-5 mb-6 border border-blue-600/30 bg-blue-900/10">
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <h2 className="text-sm font-semibold text-slate-100">
                  {isEnglish ? 'Captain login to join' : 'Lagleder login for påmelding'}
                </h2>
                <p className="text-slate-300 text-xs">
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
              {pendingRegistration && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 text-center">
                  <p className="text-sm text-slate-300 mb-3">
                    {isEnglish
                      ? 'Confirm registration for this free tournament.'
                      : 'Bekreft påmelding til denne gratis turneringen.'}
                  </p>
                  <button
                    type="button"
                    onClick={confirmRegistration}
                    disabled={isConfirming}
                    className="pro11-button-secondary text-sm"
                  >
                    {isConfirming
                      ? (isEnglish ? 'Confirming...' : 'Bekrefter...')
                      : (isEnglish ? 'Confirm registration' : 'Bekreft påmelding')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="pro11-card p-6 sm:p-8">
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
              
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
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

              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{isEnglish ? 'Password *' : 'Passord *'}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError('') }}
                    className="pro11-input w-full"
                    placeholder={isEnglish ? 'Min. 6 characters, 1 uppercase, 1 number' : 'Min. 6 tegn, 1 stor bokstav, 1 tall'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{isEnglish ? 'Confirm password *' : 'Bekreft passord *'}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError('') }}
                    className="pro11-input w-full"
                    placeholder={isEnglish ? 'Repeat password' : 'Gjenta passord'}
                    required
                  />
                </div>
              </div>
              {passwordError && <p className="text-red-400 text-sm mt-2">{passwordError}</p>}
              <p className="text-slate-400 text-sm mt-1">
                {isEnglish ? 'At least 6 characters, one uppercase letter and one number.' : 'Minst 6 tegn, én stor bokstav og ett tall.'}
              </p>
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
                  ? 'You use the password you chose above to log in as captain. Proceed to payment after registration.'
                  : 'Du bruker passordet du valgte over for å logge inn som lagleder. Fortsett til betaling etter registrering.'}
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
} 