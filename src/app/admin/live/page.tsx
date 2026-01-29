'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Shield, Trophy, Users, Calendar, Play, Pause, Square, RefreshCw, Award, Clock, Target, BarChart3, Settings } from 'lucide-react'
import { getTournamentById } from '../../../lib/tournaments'
import { useLanguage } from '@/components/LanguageProvider'

interface Match {
  id: string
  team1: string
  team2: string
  score1: number
  score2: number
  status: 'scheduled' | 'live' | 'completed'
  time: string
  round: string
}

interface Tournament {
  id: string
  title: string
  status: 'preparing' | 'live' | 'paused' | 'completed'
  currentRound: string
  totalRounds: number
  matches: Match[]
  participants: number
  startTime: string
  estimatedEnd: string
}

export default function LiveTournamentPage() {
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null)
  const { language } = useLanguage()
  const isEnglish = language === 'en'
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing':
        return 'bg-yellow-600'
      case 'live':
        return 'bg-green-600'
      case 'paused':
        return 'bg-orange-600'
      case 'completed':
        return 'bg-blue-600'
      default:
        return 'bg-slate-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'preparing':
        return t('Forbereder', 'Preparing')
      case 'live':
        return 'Live'
      case 'paused':
        return t('Pauset', 'Paused')
      case 'completed':
        return t('Fullført', 'Completed')
      default:
        return t('Ukjent', 'Unknown')
    }
  }

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-slate-600'
      case 'live':
        return 'bg-green-600'
      case 'completed':
        return 'bg-blue-600'
      default:
        return 'bg-slate-600'
    }
  }

  const getMatchStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return t('Planlagt', 'Scheduled')
      case 'live':
        return 'Live'
      case 'completed':
        return t('Ferdig', 'Finished')
      default:
        return t('Ukjent', 'Unknown')
    }
  }

  const updateMatchScore = (matchId: string, team: 'team1' | 'team2', newScore: number) => {
    if (!activeTournament) return
    
    setActiveTournament(prev => {
      if (!prev) return prev
      return {
        ...prev,
        matches: prev.matches.map(match =>
          match.id === matchId
            ? { ...match, [team === 'team1' ? 'score1' : 'score2']: newScore }
            : match
        )
      }
    })
  }

  const updateMatchStatus = (matchId: string, newStatus: string) => {
    if (!activeTournament) return
    
    setActiveTournament(prev => {
      if (!prev) return prev
      return {
        ...prev,
        matches: prev.matches.map(match =>
          match.id === matchId
            ? { ...match, status: newStatus as 'scheduled' | 'live' | 'completed' }
            : match
        )
      }
    })
  }

  const updateTournamentStatus = (newStatus: string) => {
    if (!activeTournament) return
    
    setActiveTournament(prev => {
      if (!prev) return prev
      return {
        ...prev,
        status: newStatus as 'preparing' | 'live' | 'paused' | 'completed'
      }
    })
  }

  const updateAllMatches = () => {
    if (!activeTournament) return
    
    // Simulerer oppdatering av alle kamper
    alert(t('Alle kamper er oppdatert!', 'All matches have been updated!'))
  }

  const showResults = () => {
    if (!activeTournament) return
    
    const results = activeTournament.matches
      .filter(match => match.status === 'completed')
      .map(match => `${match.team1} ${match.score1} - ${match.score2} ${match.team2}`)
      .join('\n')
    
    if (results) {
      alert(t(`Resultater:\n\n${results}`, `Results:\n\n${results}`))
    } else {
      alert(t('Ingen ferdige kamper ennå.', 'No completed matches yet.'))
    }
  }

  const showStatistics = () => {
    if (!activeTournament) return
    
    const totalMatches = activeTournament.matches.length
    const completedMatches = activeTournament.matches.filter(m => m.status === 'completed').length
    const liveMatches = activeTournament.matches.filter(m => m.status === 'live').length
    const scheduledMatches = activeTournament.matches.filter(m => m.status === 'scheduled').length
    
    const stats = t(
      `
Statistikk for ${activeTournament.title}:

Totalt antall kamper: ${totalMatches}
Ferdige kamper: ${completedMatches}
Live kamper: ${liveMatches}
Planlagte kamper: ${scheduledMatches}

Fremgang: ${Math.round((completedMatches / totalMatches) * 100)}%
    `.trim(),
      `
Statistics for ${activeTournament.title}:

Total matches: ${totalMatches}
Completed matches: ${completedMatches}
Live matches: ${liveMatches}
Scheduled matches: ${scheduledMatches}

Progress: ${Math.round((completedMatches / totalMatches) * 100)}%
    `.trim()
    )
    
    alert(stats)
  }

  const openSettings = () => {
    if (!activeTournament) return
    
    const settings = prompt(
      t(
        'Innstillinger (kommaseparert):\nTid per kamp (min), Pause mellom kamper (min), Auto-oppdatering (on/off)',
        'Settings (comma-separated):\nTime per match (min), Break between matches (min), Auto-refresh (on/off)'
      ),
      '90, 15, on'
    )
    
    if (settings) {
      alert(t(`Innstillinger oppdatert: ${settings}`, `Settings updated: ${settings}`))
    }
  }

  if (!activeTournament) {
    return (
      <div className="min-h-screen">
        <header className="pro11-card mx-4 mt-4 h-24">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-24 h-full flex items-center justify-center">
                <img src="/logo.png" alt="PRO11 Logo" className="w-full h-full object-contain" />
              </div>
              <div className="ml-4">
                <p className="text-slate-400 text-sm">
                  {t('Pro Clubs Turneringer', 'Pro Clubs Tournaments')}
                </p>
              </div>
            </div>
            <Link href="/admin" className="pro11-button-secondary flex items-center space-x-2">
              <span>{t('Tilbake til Admin', 'Back to Admin')}</span>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">{t('Ingen aktiv turnering', 'No active tournament')}</h1>
            <p className="text-slate-300 mb-6">
              {t('Det er ingen live turneringer for øyeblikket.', 'There are no live tournaments at the moment.')}
            </p>
            <Link href="/admin" className="pro11-button flex items-center space-x-2">
              <span>{t('Gå til Admin Dashboard', 'Go to Admin Dashboard')}</span>
            </Link>
          </div>
        </main>
      </div>
    )
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
              <p className="text-slate-400 text-sm">{t('Live Turnering', 'Live Tournament')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-medium ${getStatusColor(activeTournament.status)}`}>
              {getStatusText(activeTournament.status)}
            </span>
            <Link href="/admin" className="pro11-button-secondary flex items-center space-x-2">
              <span>{t('Tilbake til Admin', 'Back to Admin')}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex flex-col items-center">
        <div className="max-w-6xl w-full">
          {/* Tournament Header */}
          <div className="pro11-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{activeTournament.title}</h1>
                <p className="text-slate-300">
                  {t('Runde', 'Round')} {activeTournament.currentRound} • {activeTournament.participants} {t('lag', 'teams')}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm text-slate-400">{t('Startet', 'Started')}</p>
                  <p className="font-medium">{activeTournament.startTime}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">{t('Estimert slutt', 'Estimated end')}</p>
                  <p className="font-medium">{activeTournament.estimatedEnd}</p>
                </div>
              </div>
            </div>

            {/* Tournament Controls */}
            <div className="flex space-x-3">
              <button
                onClick={() => updateTournamentStatus('live')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTournament.status === 'live'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>{t('Start', 'Start')}</span>
              </button>
              <button
                onClick={() => updateTournamentStatus('paused')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTournament.status === 'paused'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Pause className="w-4 h-4" />
                <span>{t('Pause', 'Pause')}</span>
              </button>
              <button
                onClick={() => updateTournamentStatus('completed')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTournament.status === 'completed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Square className="w-4 h-4" />
                <span>{t('Avslutt', 'End')}</span>
              </button>
            </div>
          </div>

          {/* Matches Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {activeTournament.matches.map(match => (
              <div key={match.id} className="pro11-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMatchStatusColor(match.status)}`}>
                    {getMatchStatusText(match.status)}
                  </span>
                  <div className="text-sm text-slate-400">
                    {match.time} • {match.round}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Team 1 */}
                  <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                    <span className="font-medium">{match.team1}</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={match.score1}
                        onChange={(e) => updateMatchScore(match.id, 'team1', parseInt(e.target.value) || 0)}
                        className="w-12 text-center bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Team 2 */}
                  <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                    <span className="font-medium">{match.team2}</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={match.score2}
                        onChange={(e) => updateMatchScore(match.id, 'team2', parseInt(e.target.value) || 0)}
                        className="w-12 text-center bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Match Controls */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateMatchStatus(match.id, 'scheduled')}
                      className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        match.status === 'scheduled'
                          ? 'bg-slate-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {t('Planlagt', 'Scheduled')}
                    </button>
                    <button
                      onClick={() => updateMatchStatus(match.id, 'live')}
                      className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        match.status === 'live'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      Live
                    </button>
                    <button
                      onClick={() => updateMatchStatus(match.id, 'completed')}
                      className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        match.status === 'completed'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {t('Ferdig', 'Finished')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="pro11-card p-4 mt-6">
            <h3 className="font-semibold mb-3">{t('Hurtig-handlinger', 'Quick actions')}</h3>
            <div className="flex space-x-3">
              <button 
                onClick={updateAllMatches}
                className="pro11-button-secondary flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('Oppdater alle kamper', 'Update all matches')}</span>
              </button>
              <button 
                onClick={showResults}
                className="pro11-button-secondary flex items-center space-x-2"
              >
                <Award className="w-4 h-4" />
                <span>{t('Vis resultater', 'Show results')}</span>
              </button>
              <button 
                onClick={showStatistics}
                className="pro11-button-secondary flex items-center space-x-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span>{t('Statistikk', 'Statistics')}</span>
              </button>
              <button 
                onClick={openSettings}
                className="pro11-button-secondary flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>{t('Innstillinger', 'Settings')}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 