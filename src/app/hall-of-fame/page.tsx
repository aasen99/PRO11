'use client'

import React, { useState } from 'react'
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

  const champions: HallOfFameEntry[] = [
    {
      id: '1',
      tournament: 'PRO11 FC 25 Winter Championship',
      winner: 'Oslo United',
      runnerUp: 'Bergen Elite',
      date: '15. desember 2024',
      prize: '15,000 NOK',
      participants: 16,
      highlight: 'Oslo United dominerte turneringen med 8 seiere på rad',
      category: 'champion'
    },
    {
      id: '2',
      tournament: 'PRO11 FC 25 Autumn Cup',
      winner: 'Trondheim Titans',
      runnerUp: 'Stavanger Stars',
      date: '20. oktober 2024',
      prize: '10,000 NOK',
      participants: 12,
      highlight: 'Trondheim Titans vant finalen med 4-1 i en spektakulær kamp',
      category: 'champion'
    },
    {
      id: '3',
      tournament: 'PRO11 FC 25 Summer League',
      winner: 'Kristiansand Kings',
      runnerUp: 'Tromsø Thunder',
      date: '25. august 2024',
      prize: '8,000 NOK',
      participants: 14,
      highlight: 'Kristiansand Kings sikret seieren med en 90. minutts scoring',
      category: 'champion'
    }
  ]

  const records: HallOfFameEntry[] = [
    {
      id: '4',
      tournament: 'Største seiersmargin',
      winner: 'Oslo United',
      runnerUp: 'Bodø Blitz',
      date: '15. desember 2024',
      prize: '8-0',
      participants: 1,
      highlight: 'Oslo United slo Bodø Blitz 8-0 i kvartfinalen av Winter Championship',
      category: 'record'
    },
    {
      id: '5',
      tournament: 'Flest mål i en turnering',
      winner: 'Trondheim Titans',
      runnerUp: 'N/A',
      date: '20. oktober 2024',
      prize: '32 mål',
      participants: 1,
      highlight: 'Trondheim Titans scoret 32 mål på 6 kamper i Autumn Cup',
      category: 'record'
    },
    {
      id: '6',
      tournament: 'Raskeste hattrick',
      winner: 'Anders Hansen',
      runnerUp: 'Oslo United',
      date: '15. desember 2024',
      prize: '12 minutter',
      participants: 1,
      highlight: 'Anders Hansen scoret hattrick på 12 minutter mot Bergen Elite',
      category: 'record'
    },
    {
      id: '7',
      tournament: 'Lengste seiersrekke',
      winner: 'Oslo United',
      runnerUp: 'N/A',
      date: '2024',
      prize: '12 kamper',
      participants: 1,
      highlight: 'Oslo United vant 12 kamper på rad fra august til desember 2024',
      category: 'record'
    }
  ]

  const achievements: HallOfFameEntry[] = [
    {
      id: '8',
      tournament: 'Første turneringsvinner',
      winner: 'Oslo United',
      runnerUp: 'N/A',
      date: '25. august 2024',
      prize: 'Historie',
      participants: 1,
      highlight: 'Oslo United ble den første vinneren av en PRO11-turnering',
      category: 'achievement'
    },
    {
      id: '9',
      tournament: 'Perfekt turnering',
      winner: 'Trondheim Titans',
      runnerUp: 'N/A',
      date: '20. oktober 2024',
      prize: '6/6 seiere',
      participants: 1,
      highlight: 'Trondheim Titans vant alle 6 kamper uten tap i Autumn Cup',
      category: 'achievement'
    },
    {
      id: '10',
      tournament: 'Comeback of the Year',
      winner: 'Kristiansand Kings',
      runnerUp: 'Tromsø Thunder',
      date: '25. august 2024',
      prize: '3-2 comeback',
      participants: 1,
      highlight: 'Kristiansand Kings kom tilbake fra 0-2 til å vinne 3-2 i finalen',
      category: 'achievement'
    }
  ]

  const getTabContent = () => {
    switch (activeTab) {
      case 'champions':
        return champions
      case 'records':
        return records
      case 'achievements':
        return achievements
      default:
        return champions
    }
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
              <div className="text-3xl font-bold text-yellow-400 mb-2">3</div>
              <div className="text-slate-400">Turneringer</div>
            </div>
            <div className="pro11-card p-6 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">42</div>
              <div className="text-slate-400">Deltakere</div>
            </div>
            <div className="pro11-card p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">33,000</div>
              <div className="text-slate-400">NOK utdelt</div>
            </div>
            <div className="pro11-card p-6 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">156</div>
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
                    {entry.runnerUp !== 'N/A' && (
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
          </div>

          {/* Future Champions */}
          <div className="pro11-card p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Blir du neste mester?</h2>
            <p className="text-slate-300 mb-6">
              Meld på laget ditt til FC 26 Launch Cup og skriv historie
            </p>
            <Link href="/register" className="pro11-button inline-flex items-center space-x-2">
              <span>Meld på lag</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
} 