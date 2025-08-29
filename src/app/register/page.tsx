'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Shield, Users, User, Mail, Gamepad2, Plus, Trash2 } from 'lucide-react'
import Header from '../../components/Header'

interface TeamRegistration {
  teamName: string
  captainName: string
  captainEmail: string
  expectedPlayers: number
  clubLogo: File | null
  tournamentId: string
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<TeamRegistration>({
    teamName: '',
    captainName: '',
    captainEmail: '',
    expectedPlayers: 11,
    clubLogo: null,
    tournamentId: 'fc26-launch-cup'
  })

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

    // Lagre registreringsdata til localStorage
    localStorage.setItem('teamRegistration', JSON.stringify(formData))
    
    // Redirect til betalingssiden
    window.location.href = '/payment'
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
              Registrer laget ditt for PRO11 FC 26 Launch Cup
            </p>
          </div>

          <form onSubmit={handleSubmit} className="pro11-card p-8">
            {/* Tournament Info */}
            <div className="mb-8 p-4 bg-blue-600/20 rounded-lg border border-blue-500/30">
              <h3 className="text-xl font-semibold mb-2">Turnering</h3>
              <p className="text-slate-300">PRO11 FC 26 Launch Cup - 15. september 2025</p>
              <p className="text-slate-400 text-sm">Premie: 10,000 NOK</p>
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
                Etter registrering vil du få tilsendt betalingsinformasjon på e-post
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
} 