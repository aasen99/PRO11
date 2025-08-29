import React from 'react'
import Link from 'next/link'
import { Shield, Trophy, Users, Calendar, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import Header from '../../components/Header'

interface Tournament {
  id: string
  title: string
  date: string
  time: string
  prize: string
  registeredTeams: number
  maxTeams: number
  status: 'open' | 'ongoing' | 'closed' | 'completed'
  statusText: string
  description: string
}

export default function TournamentsPage() {
  const tournaments: Tournament[] = [
    {
      id: 'fc26-launch-cup',
      title: 'PRO11 FC 26 Launch Cup',
      date: '15. september 2025',
      time: '19:00',
      prize: '10,000 NOK',
      registeredTeams: 8,
      maxTeams: 16,
      status: 'open',
      statusText: 'Åpen for påmelding',
      description: 'Den første offisielle PRO11-turneringen for FC 26. Vær med på historien!'
    },
    {
      id: 'winter-championship',
      title: 'PRO11 Winter Championship',
      date: '20. november 2025',
      time: '19:00',
      prize: '15,000 NOK',
      registeredTeams: 0,
      maxTeams: 16,
      status: 'open',
      statusText: 'Åpen for påmelding',
      description: 'Vinterens største Pro Clubs-turnering med økte premier!'
    },
    {
      id: 'champions-league',
      title: 'PRO11 Champions League',
      date: '15. januar 2026',
      time: '19:00',
      prize: '25,000 NOK',
      registeredTeams: 0,
      maxTeams: 32,
      status: 'open',
      statusText: 'Åpen for påmelding',
      description: 'Den ultimate Pro Clubs-konkurransen med gruppespill og sluttspill.'
    }
  ]

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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Turneringer</h2>
            <p className="text-slate-300 text-lg">
              Oversikt over alle PRO11-turneringer
            </p>
          </div>

          <div className="grid gap-6">
            {tournaments.map((tournament) => (
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
                    
                    <p className="text-slate-300 mb-4">{tournament.description}</p>
                    
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-slate-300">{tournament.date} - {tournament.time}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-slate-300">Premie: {tournament.prize}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-green-400" />
                        <span className="text-slate-300">{tournament.registeredTeams}/{tournament.maxTeams} lag</span>
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
                        Meld på lag
                      </Link>
                    )}
                    
                    <Link 
                      href={`/tournaments/${tournament.id}`}
                      className="pro11-button-secondary flex items-center justify-center space-x-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Se detaljer</span>
                    </Link>
                    
                    {tournament.status === 'ongoing' && (
                      <button className="pro11-button-secondary flex items-center justify-center space-x-2">
                        <Trophy className="w-4 h-4" />
                        <span>Live resultater</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar for registration */}
                {tournament.status === 'open' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                      <span>Påmelding</span>
                      <span>{Math.round((tournament.registeredTeams / tournament.maxTeams) * 100)}% full</span>
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
            ))}
          </div>

          {/* Upcoming tournaments info */}
          <div className="pro11-card p-6 mt-8">
            <h3 className="text-xl font-semibold mb-4">Kommende turneringer</h3>
            <p className="text-slate-300 mb-4">
              Vi jobber kontinuerlig med å planlegge nye turneringer. Følg med på Discord for å få 
              beskjed om nye turneringer først!
            </p>
            <a 
              href="https://discord.gg/Es8UAkax8H" 
              target="_blank" 
              rel="noopener noreferrer"
              className="pro11-button inline-flex items-center space-x-2"
            >
              <span>Bli med på Discord</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </main>
    </div>
  )
} 