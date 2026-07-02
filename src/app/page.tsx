'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, Users, Calendar, ExternalLink, Info } from 'lucide-react'
import { fetchTournaments } from '../lib/tournaments'
import Header from '@/components/Header'
import { useLanguage } from '@/components/LanguageProvider'

const GEN_TAG_REGEX = /\[GEN:\s*(NEW GEN|OLD GEN|BOTH)\]/gi
const FORMAT_TAG_REGEX = /\[FORMAT\][\s\S]*?\[\/FORMAT\]/gi
const POT_PER_TEAM_TAG_REGEX = /\[POT_PER_TEAM:\d+\]/gi
const DEMO_TAG_REGEX = /\[DEMO\]/gi
function stripDescriptionForDisplay(description?: string | null): string {
  if (!description?.trim()) return ''
  return description
    .replace(FORMAT_TAG_REGEX, '')
    .replace(GEN_TAG_REGEX, '')
    .replace(POT_PER_TEAM_TAG_REGEX, '')
    .replace(DEMO_TAG_REGEX, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function HomePage() {
  const [nextTournament, setNextTournament] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCardDescription, setShowCardDescription] = useState(false)
  const { language } = useLanguage()
  const isEnglish = language === 'en'

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
        setNextTournament(openTournament || ongoingTournament || null)
      } catch (error) {
        console.error('Error loading tournaments:', error)
        setNextTournament(null)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadTournaments()
  }, [])

  const genLabel = nextTournament ? getGenLabel(nextTournament) : null

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12 flex flex-col items-center w-full max-w-full overflow-x-hidden">

        {/* Next Tournament Card or No Tournaments Message */}
        {isLoading ? (
          <div className="pro11-card p-8 mb-12 w-full max-w-4xl text-center">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        ) : nextTournament ? (
          <div className="pro11-card p-6 sm:p-8 mb-12 w-full max-w-4xl text-center overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="text-center min-w-0 w-full max-w-full">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">
                    {isEnglish ? 'Upcoming' : 'Kommende'}
                  </span>
                </div>
                {genLabel && (
                  <div className="mb-3 flex justify-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-200">
                      {genLabel}
                    </span>
                  </div>
                )}
                {nextTournament.isDemo && (
                  <div className="mb-3 flex justify-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-600/30 text-purple-200 border border-purple-500/40">
                      DEMO
                    </span>
                  </div>
                )}
                <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-center break-words px-1">{nextTournament.title}</h3>
                <div className="space-y-3 text-slate-300 text-center">
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Calendar className="w-5 h-5 text-blue-400 shrink-0" />
                    <span className="break-words">{nextTournament.date} - {nextTournament.time}</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
                    <span className="break-words">{isEnglish ? 'Prize' : 'Premie'}: {nextTournament.prize}</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Users className="w-5 h-5 text-green-400 shrink-0" />
                    <span className="break-words">
                      {nextTournament.registeredTeams}/{nextTournament.maxTeams}{' '}
                      {isEnglish ? 'teams registered' : 'lag påmeldt'}
                    </span>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <span
                    className={`inline-block text-white px-6 py-2 rounded-full text-sm font-semibold ${
                      nextTournament.status === 'ongoing' ? 'bg-red-600' : 'bg-green-600'
                    }`}
                  >
                    {nextTournament.status === 'ongoing' ? 'LIVE' : nextTournament.status}
                  </span>
                </div>
                {(() => {
                  const desc = isEnglish && nextTournament.description_en?.trim()
                    ? nextTournament.description_en
                    : nextTournament.description
                  return desc?.trim() ? (
                    <div className="mt-4 w-full">
                      <button
                        type="button"
                        onClick={() => setShowCardDescription(prev => !prev)}
                        className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium transition-colors"
                      >
                        <Info className="w-4 h-4" />
                        {showCardDescription
                          ? (isEnglish ? 'Hide description' : 'Skjul beskrivelse')
                          : (isEnglish ? 'More info' : 'Mer info')}
                      </button>
                      {showCardDescription && (
                        <div className="mt-3 p-4 rounded-lg bg-slate-800/60 text-left text-slate-300 text-sm whitespace-pre-wrap break-words overflow-hidden">
                          {stripDescriptionForDisplay(desc)}
                        </div>
                      )}
                    </div>
                  ) : null
                })()}
              </div>
              <div className="text-center flex flex-col items-center gap-4 w-full max-w-full min-w-0">
                {nextTournament.status === 'ongoing' || nextTournament.isDemo ? (
                  nextTournament.isDemo ? (
                    <Link
                      href={`/tournaments/${nextTournament.id}`}
                      className="pro11-button text-lg px-6 sm:px-8 py-4 w-full sm:w-auto max-w-full"
                    >
                      {isEnglish ? 'View demo tournament' : 'Se demo-turnering'}
                    </Link>
                  ) : (
                    <button disabled className="pro11-button-secondary text-lg px-6 sm:px-8 py-4 w-full sm:w-auto max-w-full">
                      {isEnglish ? 'Registration closed' : 'Påmelding stengt'}
                    </button>
                  )
                ) : (
                  <Link href="/register" className="pro11-button text-lg px-6 sm:px-8 py-4 w-full sm:w-auto max-w-full">
                    {isEnglish ? 'Register team' : 'Meld på lag'}
                  </Link>
                )}
                <a
                  href="https://discord.gg/Es8UAkax8H"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pro11-button-secondary text-lg px-6 sm:px-8 py-3 w-full sm:w-auto max-w-full"
                >
                  <span>{isEnglish ? 'Join Discord' : 'Bli med på Discord'}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="pro11-card p-8 mb-12 w-full max-w-4xl text-center">
            <div className="flex flex-col items-center justify-center gap-6">
              <Trophy className="w-16 h-16 text-slate-400" />
              <h3 className="text-2xl font-bold text-white mb-2">
                {isEnglish ? 'No upcoming tournaments' : 'Ingen kommende turneringer'}
              </h3>
              <p className="text-slate-300 max-w-2xl">
                {isEnglish
                  ? 'There are currently no upcoming tournaments. Check back later or follow our Discord for updates.'
                  : 'Det er for øyeblikket ingen kommende turneringer. Sjekk tilbake senere eller følg med på vår Discord for oppdateringer.'}
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-center">
                <Link href="/tournaments" className="pro11-button text-lg px-6 py-3 inline-flex items-center justify-center">
                  {isEnglish ? 'See all tournaments' : 'Se alle turneringer'}
                </Link>
                <a 
                  href="https://discord.gg/Es8UAkax8H" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="pro11-button-secondary text-lg px-6 py-3 inline-flex items-center justify-center space-x-2"
                >
                  <span>{isEnglish ? 'Join Discord' : 'Bli med på Discord'}</span>
                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* About PRO11 */}
        <div className="pro11-card p-8 mb-12 w-full max-w-4xl mx-auto flex flex-col items-center">
          <h3 className="text-2xl font-bold mb-6 text-center w-full">
            {isEnglish ? 'About PRO11' : 'Om PRO11'}
          </h3>
          <div className="w-full max-w-2xl mx-auto text-center">
            <p className="text-slate-300 leading-relaxed mb-4">
              {isEnglish
                ? 'PRO11 came about because many Pro Clubs tournaments lived and died in a single evening.'
                : 'PRO11 ble til fordi mange Pro Clubs-turneringer levde og døde samme kveld.'}
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              {isEnglish
                ? 'There was a time when the tournament scene was larger and more united, and when teams met again and again over time. Today there are still many tournaments, but most stand alone — small one-off events with no history or continuity.'
                : 'Det fantes en tid hvor turneringsmiljøet var større og mer samlet, og hvor lag møttes igjen og igjen over tid. I dag finnes det fortsatt mange turneringer, men de fleste står alene — små arrangementer uten historikk eller videre utvikling.'}
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              {isEnglish
                ? 'PRO11 is an attempt to build something more lasting. Not just to run tournaments, but to connect them, store the results, and let teams build a history that continues.'
                : 'PRO11 er et forsøk på å bygge noe mer varig. Ikke bare arrangere turneringer, men knytte dem sammen, lagre resultatene og la lag bygge en historie som fortsetter videre.'}
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              {isEnglish
                ? 'The aim is not only to fill a gap, but to take tournaments a step further.'
                : 'Målet er ikke bare å fylle et tomrom, men å ta turneringene et steg videre.'}
            </p>
            <p className="text-slate-300 leading-relaxed">
              {isEnglish
                ? 'Developed and run from Norway.'
                : 'Utviklet og drevet fra Norge.'}
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-4xl">
          <Link href="/captain/login" className="pro11-card p-6 hover:bg-slate-700/50 transition-colors text-center min-w-0 overflow-hidden" style={{textDecoration: 'none'}}>
            <h4 className="text-xl sm:text-2xl font-semibold mb-2 text-white break-words">{isEnglish ? 'Captain' : 'Lagleder'}</h4>
            <p className="text-slate-400 break-words">
              {isEnglish ? 'Log in to submit results' : 'Logg inn for å legge inn resultater'}
            </p>
          </Link>
          <Link href="/rules" className="pro11-card p-6 hover:bg-slate-700/50 transition-colors text-center min-w-0 overflow-hidden" style={{textDecoration: 'none'}}>
            <h4 className="text-xl sm:text-2xl font-semibold mb-2 text-white break-words">{isEnglish ? 'Tournament Rules' : 'Turneringsregler'}</h4>
            <p className="text-slate-400 break-words">{isEnglish ? 'Find the official rules here' : 'Her finner du de offisielle reglene'}</p>
          </Link>
          <Link href="/faq" className="pro11-card p-6 hover:bg-slate-700/50 transition-colors text-center min-w-0 overflow-hidden" style={{textDecoration: 'none'}}>
            <h4 className="text-xl sm:text-2xl font-semibold mb-2 text-white break-words">FAQ</h4>
            <p className="text-slate-400 break-words">{isEnglish ? 'Frequently asked questions' : 'Ofte stilte spørsmål og svar'}</p>
          </Link>
          <Link href="/tournaments" className="pro11-card p-6 hover:bg-slate-700/50 transition-colors text-center min-w-0 overflow-hidden" style={{textDecoration: 'none'}}>
            <h4 className="text-xl sm:text-2xl font-semibold mb-2 text-white break-words">{isEnglish ? 'See all tournaments' : 'Se alle turneringer'}</h4>
            <p className="text-slate-400 break-words">{isEnglish ? 'Overview of upcoming and active tournaments' : 'Oversikt over kommende og aktive turneringer'}</p>
          </Link>
        </div>
      </main>

    </div>
  )
} 