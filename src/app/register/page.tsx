'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Users, User, Mail, Gamepad2, Plus, Trash2 } from 'lucide-react'
import Header from '../../components/Header'
import { fetchTournamentById } from '../../lib/tournaments'

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
            setTournament({
              id: t.id,
              title: t.title,
              date,
              time,
              prize: `${t.prize_pool.toLocaleString('nb-NO')} NOK`,
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
      alert('Vennligst fyll ut alle påkrevde felter')
      return
    }

    if (formData.expectedPlayers < 5 || formData.expectedPlayers > 11) {
      alert('Antall spillere må være mellom 5 og 11')
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
        alert(`Registrering feilet: ${error.error || 'Ukjent feil'}`)
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert('Registrering feilet. Prøv igjen.')
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <Header backButton={true} backHref="/" />

      <main className="container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">Meld på lag</h2>
            <p className="text-slate-300 text-lg">
              Registrer laget ditt for {tournament?.title || 'PRO11 FC 26 Launch Cup'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="pro11-card p-8">
            {/* Tournament Info */}
            <div className="mb-8 p-4 bg-blue-600/20 rounded-lg border border-blue-500/30">
              <h3 className="text-xl font-semibold mb-2">Turnering</h3>
              <p className="text-slate-300">{tournament?.title} - {tournament?.date}</p>
              <p className="text-slate-400 text-sm">
                Premie: {tournament?.prize} | Påmeldingsgebyr:{' '}
                {tournament?.entryFee === 0 ? (
                  <span className="text-green-400 font-semibold">GRATIS</span>
                ) : (
                  <span>{tournament?.entryFee} NOK</span>
                )}
              </p>
            </div>

            {/* Team Information */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Laginformasjon</span>
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Lagnavn *</label>
                  <input
                    type="text"
                    value={formData.teamName}
                    onChange={(e) => setFormData({...formData, teamName: e.target.value})}
                    className="pro11-input w-full"
                    placeholder="F.eks. Oslo United"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Kaptein navn *</label>
                  <input
                    type="text"
                    value={formData.captainName}
                    onChange={(e) => setFormData({...formData, captainName: e.target.value})}
                    className="pro11-input w-full"
                    placeholder="Ditt navn"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">Kaptein e-post *</label>
                <input
                  type="email"
                  value={formData.captainEmail}
                  onChange={(e) => setFormData({...formData, captainEmail: e.target.value})}
                  className="pro11-input w-full"
                  placeholder="din@email.com"
                  required
                />
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">Discord brukernavn</label>
                <input
                  type="text"
                  value={formData.discordUsername}
                  onChange={(e) => setFormData({...formData, discordUsername: e.target.value})}
                  className="pro11-input w-full"
                  placeholder="f.eks. brukernavn#1234"
                />
              </div>
            </div>

            {/* Expected Players */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5" />
                <span>Forventet antall spillere</span>
              </h3>
              <div>
                <label className="block text-sm font-medium mb-2">Antall spillere på laget *</label>
                <select
                  value={formData.expectedPlayers}
                  onChange={(e) => setFormData({...formData, expectedPlayers: parseInt(e.target.value)})}
                  className="pro11-input w-full"
                  required
                >
                  <option value="5">5 spillere</option>
                  <option value="6">6 spillere</option>
                  <option value="7">7 spillere</option>
                  <option value="8">8 spillere</option>
                  <option value="9">9 spillere</option>
                  <option value="10">10 spillere</option>
                  <option value="11">11 spillere</option>
                </select>
                <p className="text-slate-400 text-sm mt-2">
                  Velg forventet antall spillere som vil delta i turneringen
                </p>
              </div>
            </div>

            {/* Club Logo */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold flex items-center space-x-2 mb-4">
                <Shield className="w-5 h-5" />
                <span>Klubb Logo (Valgfritt)</span>
              </h3>
              <div>
                <label className="block text-sm font-medium mb-2">Last opp klubb logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="pro11-input w-full"
                />
                <p className="text-slate-400 text-sm mt-2">
                  PNG, JPG eller GIF. Maksimal størrelse: 2MB
                </p>
                {formData.clubLogo && (
                  <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-green-400">
                      ✓ Logo valgt: {formData.clubLogo.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="text-center">
              <button type="submit" className="pro11-button text-lg px-8 py-4">
                Registrer lag
              </button>
              <p className="text-slate-400 text-sm mt-4">
                Etter registrering vil du få se passordet ditt og kunne fortsette til betaling
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
} 