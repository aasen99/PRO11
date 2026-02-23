'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Trophy, Users, Calendar, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import Header from '../../components/Header'
import { fetchTournaments, Tournament } from '../../lib/tournaments'
import { useLanguage } from '@/components/LanguageProvider'

const GEN_TAG_REGEX = /\[GEN:\s*(NEW GEN|OLD GEN|BOTH)\]/i
const FORMAT_TAG_REGEX = /\[FORMAT\][\s\S]*?\[\/FORMAT\]/i
const POT_PER_TEAM_TAG_REGEX = /\[POT_PER_TEAM:(\d+)\]/i

const stripMetadataTags = (description?: string) => {
  return (description || '')
    .replace(GEN_TAG_REGEX, '')
    .replace(FORMAT_TAG_REGEX, '')
    .replace(POT_PER_TEAM_TAG_REGEX, '')
    .trim()
}

export default function TournamentsPage() {
  const [tournamentsWithCounts, setTournamentsWithCounts] = useState<Tournament[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { language } = useLanguage()
  const isEnglish = language === 'en'

  useEffect(() => {
    // Fetch tournaments from API
    const loadTournaments = async () => {
      try {
        const fetchedTournaments = await fetchTournaments()
        setTournamentsWithCounts(fetchedTournaments)
      } catch (error) {
        console.warn('Error loading tournaments:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTournaments()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-600'
      case 'ongoing':
        return 'bg-blue-600'
      case 'closed':
        return 'bg-yellow-600'
      case 'completed':
        return 'bg-slate-600'
      default:
        return 'bg-slate-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <CheckCircle className="w-4 h-4" />
      case 'ongoing':
        return <Clock className="w-4 h-4" />
      case 'closed':
        return <XCircle className="w-4 h-4" />
      case 'completed':
        return <Trophy className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">{isEnglish ? 'Loading tournaments...' : 'Laster turneringer...'}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{isEnglish ? 'Tournaments' : 'Turneringer'}</h2>
            <p className="text-slate-300 text-lg">
              {isEnglish ? 'Overview of all PRO11 tournaments' : 'Oversikt over alle PRO11-turneringer'}
            </p>
          </div>

          <div className="grid gap-6">
            {tournamentsWithCounts.length === 0 ? (
              <div className="pro11-card p-8 text-center">
                <p className="text-slate-300">
                  {isEnglish ? 'No tournaments available right now.' : 'Ingen turneringer tilgjengelig for øyeblikket.'}
                </p>
              </div>
            ) : (
              tournamentsWithCounts.map((tournament) => (
              <div key={tournament.id} className="pro11-card p-6">
                <div className="grid md:grid-cols-3 gap-6 items-center">
                  {/* Tournament Info */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold">{tournament.title}</h3>
                      <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(tournament.status)}`}>
                        {getStatusIcon(tournament.status)}
                        <span>{tournament.statusText}</span>
                      </span>
                    </div>
                    
                    <p className="text-slate-300 mb-4">{stripMetadataTags(isEnglish && tournament.description_en ? tournament.description_en : tournament.description)}</p>
                    
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-slate-300">{tournament.date} - {tournament.time}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-slate-300">
                          {isEnglish ? 'Prize' : 'Premie'}: {tournament.prize}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-green-400" />
                        <span className="text-slate-300">
                          {tournament.registeredTeams}/{tournament.maxTeams} {isEnglish ? 'teams' : 'lag'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-3">
                    {tournament.status === 'open' && (
                      <Link 
                        href={`/register?tournament=${tournament.id}`}
                        className="pro11-button text-center"
                      >
                        {isEnglish ? 'Register team' : 'Meld på lag'}
                      </Link>
                    )}
                    {tournament.status === 'ongoing' && (
                      <button disabled className="pro11-button-secondary text-center opacity-50 cursor-not-allowed">
                        {isEnglish ? 'Registration closed' : 'Påmelding stengt'}
                      </button>
                    )}
                    
                    <Link 
                      href={`/tournaments/${tournament.id}`}
                      className="pro11-button-secondary flex items-center justify-center space-x-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{isEnglish ? 'Matches and results' : 'Kamper og resultater'}</span>
                    </Link>
                  </div>
                </div>

                {/* Progress bar for registration */}
                {tournament.status === 'open' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                      <span>{isEnglish ? 'Registration' : 'Påmelding'}</span>
                      <span>
                        {Math.round((tournament.registeredTeams / tournament.maxTeams) * 100)}%{isEnglish ? ' full' : ' fullt'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(tournament.registeredTeams / tournament.maxTeams) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))
            )}
          </div>

          {/* Upcoming tournaments info */}
          <div className="pro11-card p-6 mt-8">
            <h3 className="text-xl font-semibold mb-4">{isEnglish ? 'Upcoming tournaments' : 'Kommende turneringer'}</h3>
            <p className="text-slate-300 mb-4">
              {isEnglish
                ? 'We are continuously planning new tournaments. Follow us on Discord to be the first to hear about new events.'
                : 'Vi jobber kontinuerlig med å planlegge nye turneringer. Følg med på Discord for å få beskjed om nye turneringer først!'}
            </p>
            <a 
              href="https://discord.gg/Es8UAkax8H" 
              target="_blank" 
              rel="noopener noreferrer"
              className="pro11-button inline-flex items-center space-x-2"
            >
              <span>{isEnglish ? 'Join Discord' : 'Bli med på Discord'}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </main>
    </div>
  )
} 