import React from 'react'
import Link from 'next/link'
import { Shield, Trophy, Users, Calendar, ExternalLink } from 'lucide-react'


export default function HomePage() {
  // Mock data for next tournament
  const nextTournament = {
    title: "PRO11 FC 26 Launch Cup",
    date: "15. september 2025",
    time: "19:00",
    prize: "10,000 NOK",
    registeredTeams: 8,
    maxTeams: 16,
    status: "Åpen for påmelding"
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
          <nav className="hidden md:flex space-x-6 p-6">
            <Link href="/tournaments" className="text-slate-300 hover:text-white transition-colors">
              Turneringer
            </Link>
            <Link href="/register" className="text-slate-300 hover:text-white transition-colors">
              Påmelding
            </Link>
            <Link href="/hall-of-fame" className="text-slate-300 hover:text-white transition-colors">
              Hall of Fame
            </Link>
            <a href="https://discord.gg/Es8UAkax8H" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors flex items-center space-x-1">
              <span>Discord</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        <div className="text-center mb-16 w-full">
          <h2 className="text-5xl md:text-7xl font-bold mb-6 text-white">
            Neste Turnering
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
            FC 26 Launch Cup - Vær med på den største Pro Clubs-turneringen i Norge
          </p>
        </div>

        {/* Next Tournament Card */}
        <div className="pro11-card p-8 mb-12 w-full max-w-4xl text-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <span className="text-yellow-400 font-semibold">Kommende</span>
              </div>
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
              <Link href="/register" className="pro11-button text-lg px-8 py-4 inline-block">
                Meld på lag
              </Link>
            </div>
          </div>
        </div>

        {/* About PRO11 */}
        <div className="pro11-card p-8 mb-12 w-full max-w-4xl text-center">
          <h3 className="text-2xl font-bold mb-6 text-center">Om PRO11</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-slate-300 leading-relaxed mb-4">
                PRO11 er Norges ledende plattform for Pro Clubs-turneringer i FC 26. 
                Vi arrangerer eksklusive konkurranser for de beste lagene i landet.
              </p>
              <p className="text-slate-300 leading-relaxed">
                Våre turneringer tilbyr store premier, profesjonell organisering og 
                en konkurransepreget atmosfære for seriøse Pro Clubs-lag.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">Profesjonell turneringsorganisering</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">Store premier og anerkjennelse</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">Eksklusivt for de beste lagene</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">Discord-fellesskap og støtte</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-4 gap-6 w-full max-w-4xl">
          <Link href="/tournaments" className="pro11-card p-6 hover:bg-slate-700/50 transition-colors text-center" style={{textDecoration: 'none'}}>
            <h4 className="text-xl font-semibold mb-2">Se alle turneringer</h4>
            <p className="text-slate-400">Oversikt over kommende og aktive turneringer</p>
          </Link>
          <a href="/rules.pdf" target="_blank" className="pro11-card p-6 hover:bg-slate-700/50 transition-colors text-center" style={{textDecoration: 'none'}}>
            <h4 className="text-xl font-semibold mb-2">Turneringsregler</h4>
            <p className="text-slate-400">Laste ned offisielle regler og format</p>
          </a>
          <Link href="/faq" className="pro11-card p-6 hover:bg-slate-700/50 transition-colors text-center" style={{textDecoration: 'none'}}>
            <h4 className="text-xl font-semibold mb-2">FAQ</h4>
            <p className="text-slate-400">Ofte stilte spørsmål og svar</p>
          </Link>
          <Link href="/captain/login" className="pro11-card p-6 hover:bg-slate-700/50 transition-colors text-center" style={{textDecoration: 'none'}}>
            <h4 className="text-xl font-semibold mb-2">Lagleder</h4>
            <p className="text-slate-400">Logg inn for å legge inn resultater</p>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="pro11-card mx-4 mb-4 p-6 mt-16">
        <div className="text-center text-slate-400">
          <p>&copy; 2025 PRO11. Alle rettigheter forbeholdt.</p>
          <p className="mt-2">Lansering september 2025 - FC 26</p>
        </div>
      </footer>
    </div>
  )
} 