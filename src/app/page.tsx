'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Trophy, Users, Calendar, ExternalLink } from 'lucide-react'
import { fetchTournaments } from '../lib/tournaments'

export default function HomePage() {
  const [nextTournament, setNextTournament] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  const getGenLabel = (tournament: any): 'New Gen' | 'Old Gen' | 'New Gen / Old Gen' | null => {
    const haystack = `${tournament?.title || ''} ${tournament?.description || ''}`.toLowerCase()
    if (!haystack.trim()) return null
    if (haystack.includes('gen: both') || haystack.includes('gen:both')) {
      return 'New Gen / Old Gen'
    }
    if (haystack.includes('old gen') || haystack.includes('old-gen') || haystack.includes('ps4') || haystack.includes('xbox one')) {
      return 'Old Gen'
    }
    if (haystack.includes('new gen') || haystack.includes('next gen') || haystack.includes('ps5') || haystack.includes('xbox series')) {
      return 'New Gen'
    }
    return null
  }

  useEffect(() => {
    // Fetch tournaments from database
    const loadTournaments = async () => {
      try {
        const tournaments = await fetchTournaments()
        // Find first open or ongoing tournament (prioritize open)
        const openTournament = tournaments.find(t => t.status === 'open')
        const ongoingTournament = tournaments.find(t => t.status === 'ongoing')
        setNextTournament(openTournament || ongoingTournament || tournaments[0] || null)
      } catch (error) {
        console.error('Error loading tournaments:', error)
        setNextTournament(null)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadTournaments()
  }, [])

  useEffect(() => {
    const updateBreakpoint = () => setIsDesktop(window.innerWidth >= 1024)
    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  useEffect(() => {
    if (isDesktop && isMobileMenuOpen) {
      setIsMobileMenuOpen(false)
    }
  }, [isDesktop, isMobileMenuOpen])
  
  const genLabel = nextTournament ? getGenLabel(nextTournament) : null

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
          {isDesktop && (
            <nav className="flex flex-1 items-center justify-end gap-3 px-4 py-4 text-xs whitespace-nowrap">
              <Link href="/tournaments" className="text-slate-300 hover:text-white transition-colors whitespace-nowrap">
                Turneringer
              </Link>
              {nextTournament && nextTournament.status === 'ongoing' ? (
                <span className="text-slate-500 cursor-not-allowed whitespace-nowrap" title="Påmelding stengt">
                  Stengt
                </span>
              ) : (
                <Link href="/register" className="text-slate-300 hover:text-white transition-colors whitespace-nowrap">
                  Påmelding
                </Link>
              )}
              <Link href="/hall-of-fame" className="text-slate-300 hover:text-white transition-colors whitespace-nowrap">
                Hall of Fame
              </Link>
              <a href="https://discord.gg/Es8UAkax8H" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors flex items-center space-x-1 whitespace-nowrap">
                <span>Discord</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </nav>
          )}
          {!isDesktop && (
            <div className="flex pr-4">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                className="pro11-button-secondary text-sm"
              >
                {isMobileMenuOpen ? 'Lukk' : 'Meny'}
              </button>
            </div>
          )}
        </div>
        {isMobileMenuOpen && !isDesktop && (
          <div className="px-4 pb-4 lg:hidden">
            <div className="pro11-card p-4 flex flex-col space-y-3">
              <Link
                href="/tournaments"
                className="text-slate-300 hover:text-white transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Turneringer
              </Link>
              {nextTournament && nextTournament.status === 'ongoing' ? (
                <span className="text-slate-500 cursor-not-allowed">
                  Påmelding stengt
                </span>
              ) : (
                <Link
                  href="/register"
                  className="text-slate-300 hover:text-white transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Påmelding
                </Link>
              )}
              <Link
                href="/hall-of-fame"
                className="text-slate-300 hover:text-white transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Hall of Fame
              </Link>
              <a
                href="https://discord.gg/Es8UAkax8H"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-white transition-colors flex items-center space-x-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>Discord</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        <div className="text-center mb-16 w-full">
          <h2 className="text-5xl md:text-7xl font-bold mb-6 text-white">
            Neste Turnering
          </h2>
          {nextTournament ? (
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              {nextTournament.title} – Starten på Norges nye Pro Clubs-arena
            </p>
          ) : (
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Vær med på den største Pro Clubs-turneringen i Norge
            </p>
          )}
        </div>

        {/* Next Tournament Card or No Tournaments Message */}
        {isLoading ? (
          <div className="pro11-card p-8 mb-12 w-full max-w-4xl text-center">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        ) : nextTournament ? (
          <div className="pro11-card p-8 mb-12 w-full max-w-4xl text-center">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">Kommende</span>
                </div>
                {genLabel && (
                  <div className="mb-3 flex justify-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-200">
                      {genLabel}
                    </span>
                  </div>
                )}
                <h3 className="text-3xl font-bold mb-4 text-center">{nextTournament.title}</h3>
                <div className="space-y-3 text-slate-300 text-center">
                  <div className="flex items-center justify-center space-x-3">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <span>{nextTournament.date} - {nextTournament.time}</span>
                  </div>
                  <div className="flex items-center justify-center space-x-3">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span>Premie: {nextTournament.prize}</span>
                  </div>
                  <div className="flex items-center justify-center space-x-3">
                    <Users className="w-5 h-5 text-green-400" />
                    <span>{nextTournament.registeredTeams}/{nextTournament.maxTeams} lag påmeldt</span>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <span className="inline-block bg-green-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                    {nextTournament.status}
                  </span>
                </div>
              </div>
              <div className="text-center">
                {nextTournament.status === 'ongoing' ? (
                  <button disabled className="pro11-button-secondary text-lg px-8 py-4 inline-block opacity-50 cursor-not-allowed">
                    Påmelding stengt
                  </button>
                ) : (
                  <Link href="/register" className="pro11-button text-lg px-8 py-4 inline-block">
                    Meld på lag
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="pro11-card p-8 mb-12 w-full max-w-4xl text-center">
            <div className="flex flex-col items-center justify-center gap-6">
              <Trophy className="w-16 h-16 text-slate-400" />
              <h3 className="text-2xl font-bold text-white mb-2">Ingen kommende turneringer</h3>
              <p className="text-slate-300 max-w-2xl">
                Det er for øyeblikket ingen kommende turneringer. Sjekk tilbake senere eller følg med på vår Discord for oppdateringer.
              </p>
              <div className="mt-4 flex gap-4">
                <Link href="/tournaments" className="pro11-button text-lg px-6 py-3 inline-block">
                  Se alle turneringer
                </Link>
                <a 
                  href="https://discord.gg/Es8UAkax8H" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="pro11-button-secondary text-lg px-6 py-3 inline-block flex items-center space-x-2"
                >
                  <span>Join Discord</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* About PRO11 */}
        <div className="pro11-card p-8 mb-12 w-full max-w-4xl text-center">
          <h3 className="text-2xl font-bold mb-6 text-center">Om PRO11</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-slate-300 leading-relaxed mb-4">
                PRO11 er en turneringsplattform for Pro Clubs i FC 26.
                Gruppespill, sluttspill og kamper som betyr noe.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                Her lagres resultater, mestere kåres og historikken følger laget videre.
                Ikke bare én kveld – men turneringer som bygges videre over tid.
              </p>
              <p className="text-slate-300 leading-relaxed">
                Målet vårt er å samle norsk Pro Clubs på ett sted og bygge Norges ledende Pro Clubs-arena.
              </p>
            </div>
            <div className="space-y-4 mt-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">Gruppespill og sluttspill som betyr noe</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">Resultater, mestere og historikk</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">Turneringer som bygges videre over tid</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">Samler norsk Pro Clubs på ett sted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-4 gap-6 w-full max-w-4xl">
          <Link href="/captain/login" className="pro11-card p-6 hover:bg-slate-700/50 transition-colors text-center" style={{textDecoration: 'none'}}>
            <h4 className="text-2xl font-semibold mb-2 text-white">Lagleder</h4>
            <p className="text-slate-400">Logg inn for å legge inn resultater</p>
          </Link>
          <Link href="/rules" className="pro11-card p-6 hover:bg-slate-700/50 transition-colors text-center" style={{textDecoration: 'none'}}>
            <h4 className="text-2xl font-semibold mb-2 text-white">Turneringsregler</h4>
            <p className="text-slate-400">Her finner du de offiselle reglene</p>
          </Link>
          <Link href="/faq" className="pro11-card p-6 hover:bg-slate-700/50 transition-colors text-center" style={{textDecoration: 'none'}}>
            <h4 className="text-2xl font-semibold mb-2 text-white">FAQ</h4>
            <p className="text-slate-400">Ofte stilte spørsmål og svar</p>
          </Link>
          <Link href="/tournaments" className="pro11-card p-6 hover:bg-slate-700/50 transition-colors text-center" style={{textDecoration: 'none'}}>
            <h4 className="text-2xl font-semibold mb-2 text-white">Se alle turneringer</h4>
            <p className="text-slate-400">Oversikt over kommende og aktive turneringer</p>
          </Link>
        </div>
      </main>

    </div>
  )
} 