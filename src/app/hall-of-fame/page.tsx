'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trophy, Medal, Star, Calendar, Users, Award, Crown } from 'lucide-react'

interface HallOfFameEntry {
  id: string
  tournament: string
  winner: string
  runnerUp: string
  date: string
  prize: string
  participants: number
  highlight: string
  category: 'champion' | 'record' | 'achievement'
}

export default function HallOfFamePage() {
  const [activeTab, setActiveTab] = useState<'champions' | 'records' | 'achievements'>('champions')
  const [entries, setEntries] = useState<HallOfFameEntry[]>([])
  const [stats, setStats] = useState({
    tournaments: 0,
    participants: 0,
    payouts: 0,
    matchesCompleted: 0
  })

  // Hall of Fame entries will be populated from completed tournaments in the future
  // For now, show empty state

  const getTabContent = () => {
    return entries.filter(entry => entry.category === activeTab.slice(0, -1) || 
      (activeTab === 'champions' && entry.category === 'champion') ||
      (activeTab === 'records' && entry.category === 'record') ||
      (activeTab === 'achievements' && entry.category === 'achievement'))
  }

  const getIcon = (category: string) => {
    switch (category) {
      case 'champion':
        return <Trophy className="w-6 h-6 text-yellow-400" />
      case 'record':
        return <Star className="w-6 h-6 text-blue-400" />
      case 'achievement':
        return <Award className="w-6 h-6 text-green-400" />
      default:
        return <Trophy className="w-6 h-6 text-yellow-400" />
    }
  }

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [tournamentsResponse, matchesResponse] = await Promise.all([
          fetch('/api/tournaments'),
          fetch('/api/matches')
        ])

        const tournamentsData = tournamentsResponse.ok ? await tournamentsResponse.json() : { tournaments: [] }
        const matchesData = matchesResponse.ok ? await matchesResponse.json() : { matches: [] }

        const tournaments = tournamentsData.tournaments || []
        const completedTournaments = tournaments.filter((t: any) => t.status === 'completed')
        const completedTournamentIds = new Set(completedTournaments.map((t: any) => t.id))

        const participants = completedTournaments.reduce(
          (sum: number, t: any) => sum + (t.current_teams || 0),
          0
        )

        const matchesCompleted = (matchesData.matches || []).filter((match: any) =>
          match.status === 'completed' && completedTournamentIds.has(match.tournament_id)
        ).length

        setStats({
          tournaments: completedTournaments.length,
          participants,
          payouts: 0,
          matchesCompleted
        })
      } catch (error) {
        console.warn('Could not load Hall of Fame stats:', error)
      }
    }

    loadStats()
  }, [])

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
            <ArrowLeft className="w-4 h-4" />
            <span>Tilbake</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="max-w-6xl w-full">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Hall of Fame</h1>
            <p className="text-slate-300 text-lg">
              Ære til de beste lagene og spillerne i PRO11-historien
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="pro11-card p-6 text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">{stats.tournaments}</div>
              <div className="text-slate-400">Turneringer</div>
            </div>
            <div className="pro11-card p-6 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{stats.participants}</div>
              <div className="text-slate-400">Deltakere</div>
            </div>
            <div className="pro11-card p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{stats.payouts}</div>
              <div className="text-slate-400">NOK utdelt</div>
            </div>
            <div className="pro11-card p-6 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">{stats.matchesCompleted}</div>
              <div className="text-slate-400">Kamper spilt</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="pro11-card p-6 mb-8">
            <div className="flex space-x-1 mb-6">
              <button
                onClick={() => setActiveTab('champions')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'champions' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mestere
              </button>
              <button
                onClick={() => setActiveTab('records')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'records' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Rekorder
              </button>
              <button
                onClick={() => setActiveTab('achievements')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'achievements' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Prestasjoner
              </button>
            </div>

            {/* Content */}
            {getTabContent().length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getTabContent().map(entry => (
                  <div key={entry.id} className="pro11-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      {getIcon(entry.category)}
                      <span className="text-sm text-slate-400">{entry.date}</span>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2">{entry.tournament}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2">
                        <Crown className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium">{entry.winner}</span>
                      </div>
                      {entry.runnerUp && entry.runnerUp !== 'N/A' && (
                        <div className="flex items-center space-x-2">
                          <Medal className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-400">{entry.runnerUp}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-slate-400 mb-3">
                      <span>Premie: {entry.prize}</span>
                      {entry.participants > 1 && (
                        <span>{entry.participants} deltakere</span>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {entry.highlight}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Ingen {activeTab === 'champions' ? 'mestere' : activeTab === 'records' ? 'rekorder' : 'prestasjoner'} ennå</h3>
                <p className="text-slate-400 mb-6">
                  Når turneringer er fullført, vil resultatene vises her.
                </p>
                <Link href="/tournaments" className="pro11-button inline-flex items-center space-x-2">
                  <span>Se turneringer</span>
                </Link>
              </div>
            )}
          </div>

          {/* Future Champions */}
          <div className="pro11-card p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Blir du neste mester?</h2>
            <p className="text-slate-300 mb-6">
              Meld på laget ditt til en turnering og skriv historie
            </p>
            <Link href="/tournaments" className="pro11-button inline-flex items-center space-x-2">
              <span>Se turneringer</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
} 