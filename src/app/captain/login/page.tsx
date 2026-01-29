'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Shield, Users, Lock, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

interface Team {
  id: string
  teamName: string
  captainEmail: string
  captainName: string
  discordUsername?: string
  tournaments: string[]
  tournamentId?: string
  expectedPlayers?: number
  paymentStatus?: string
}

export default function CaptainLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { language } = useLanguage()
  const isEnglish = language === 'en'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Hent teams fra database
      const response = await fetch('/api/teams')
      if (!response.ok) {
        throw new Error('Kunne ikke hente lag')
      }
      
      const data = await response.json()
      const teams = data.teams || []
      
      // Finn lag med matchende e-post
      const team = teams.find((t: any) => 
        (t.captainEmail || t.captain_email) === email
      )
      
      if (!team) {
        setError(isEnglish ? 'Incorrect email or password. Please try again.' : 'Feil e-post eller passord. Prøv igjen.')
        setPassword('')
        setIsLoading(false)
        return
      }
      
      // Sjekk passord (generert passord fra database)
      const teamPassword = team.generatedPassword || team.generated_password
      const isCorrectPassword = password === teamPassword
      
      if (isCorrectPassword) {
        // Lagre team data for dashboard
        const tournamentId = team.tournamentId || team.tournament_id || ''
        const teamData = {
          id: team.id,
          teamName: team.teamName || team.team_name,
          captainEmail: team.captainEmail || team.captain_email,
          captainName: team.captainName || team.captain_name,
          discordUsername: team.discordUsername || team.discord_username || '',
          tournaments: tournamentId ? [tournamentId] : [],
          tournamentId,
          expectedPlayers: team.expectedPlayers || team.expected_players || 0,
          paymentStatus: team.paymentStatus || team.payment_status || 'pending'
        }
        localStorage.setItem('captainTeam', JSON.stringify(teamData))
        window.location.href = '/captain/dashboard'
      } else {
        setError(isEnglish ? 'Incorrect email or password. Please try again.' : 'Feil e-post eller passord. Prøv igjen.')
        setPassword('')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(isEnglish ? 'Something went wrong. Please try again.' : 'Noe gikk galt. Prøv igjen.')
      setPassword('')
    } finally {
      setIsLoading(false)
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
              <p className="text-slate-400 text-sm">
                {isEnglish ? 'Pro Clubs Tournaments' : 'Pro Clubs Turneringer'}
              </p>
            </div>
          </div>
          <Link href="/" className="pro11-button-secondary flex items-center space-x-2">
            <span>{isEnglish ? 'Back' : 'Tilbake'}</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="max-w-md w-full">
          <div className="pro11-card p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-6">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4">{isEnglish ? 'Captain Access' : 'Lagleder Tilgang'}</h1>
            <p className="text-slate-300 mb-8">
              {isEnglish
                ? 'Log in to manage your team and submit results'
                : 'Logg inn for å administrere ditt lag og legge inn resultater'}
            </p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 text-left">
                  {isEnglish ? 'Email (captain)' : 'E-post (lagleder)'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isEnglish ? 'name@email.com' : 'anders@email.com'}
                  className="pro11-input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 text-left">
                  {isEnglish ? 'Password' : 'Passord'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEnglish ? 'Password' : 'Passord'}
                  className="pro11-input"
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
                disabled={isLoading}
                className="pro11-button w-full flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isEnglish ? 'Logging in...' : 'Logger inn...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isEnglish ? 'Log in' : 'Logg inn'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

          </div>
        </div>
      </main>
    </div>
  )
} 