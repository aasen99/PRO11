'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Shield, Users, Lock, ArrowRight } from 'lucide-react'

interface Team {
  id: string
  teamName: string
  captainEmail: string
  captainName: string
  tournaments: string[]
}

export default function CaptainLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Mock team data (i produksjon ville dette være i en database)
  const teams: Team[] = [
    {
      id: '1',
      teamName: 'Oslo United',
      captainEmail: 'anders@email.com',
      captainName: 'Anders Hansen',
      tournaments: ['fc26-launch-cup']
    },
    {
      id: '2',
      teamName: 'Bergen Elite',
      captainEmail: 'kristian@email.com',
      captainName: 'Kristian Nilsen',
      tournaments: ['fc26-launch-cup']
    },
    {
      id: '3',
      teamName: 'Trondheim Titans',
      captainEmail: 'marius@email.com',
      captainName: 'Marius Solberg',
      tournaments: ['fc26-launch-cup']
    }
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Simulerer API-kall
    setTimeout(() => {
      const team = teams.find(t => t.captainEmail === email)
      
      // Sjekk demo passord eller generert passord
      const isDemoPassword = password === 'captain123'
      const isGeneratedPassword = checkGeneratedPassword(email, password)
      
      if (team && (isDemoPassword || isGeneratedPassword)) {
        // I produksjon ville vi brukt proper authentication
        localStorage.setItem('captainTeam', JSON.stringify(team))
        window.location.href = '/captain/dashboard'
      } else {
        setError('Feil e-post eller passord. Prøv igjen.')
        setPassword('')
      }
      setIsLoading(false)
    }, 1000)
  }

  const checkGeneratedPassword = (email: string, password: string): boolean => {
    // Sjekk om det finnes et generert passord for denne e-posten
    const storedPasswords = localStorage.getItem('generatedPasswords')
    if (storedPasswords) {
      const passwords = JSON.parse(storedPasswords)
      return passwords[email] === password
    }
    return false
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
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Lagleder Tilgang</h1>
            <p className="text-slate-300 mb-8">
              Logg inn for å administrere ditt lag og legge inn resultater
            </p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 text-left">
                  E-post (lagleder)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anders@email.com"
                  className="pro11-input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 text-left">
                  Passord
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passord"
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
                    <span>Logger inn...</span>
                  </>
                ) : (
                  <>
                    <span>Logg inn</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-slate-400 text-sm mb-4">Demo tilgang:</p>
              <div className="text-left text-xs text-slate-300 space-y-1">
                <p><strong>E-post:</strong> anders@email.com</p>
                <p><strong>Passord:</strong> captain123</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 