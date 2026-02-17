'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Medal, Star, Award, Crown } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import Header from '@/components/Header'

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
  const { language } = useLanguage()
  const isEnglish = language === 'en'

  const getPerTeamPotFromDescription = (description?: string | null) => {
    const match = description?.match(/\[POT_PER_TEAM:(\d+)\]/i)
    const value = match?.[1]
    return value ? Number(value) : null
  }

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
        const completedTournaments = tournaments.filter((t: any) => t.status === 'completed' || t.status === 'archived')
        const completedTournamentIds = new Set(completedTournaments.map((t: any) => t.id))

        const participants = completedTournaments.reduce(
          (sum: number, t: any) => sum + (t.eligible_teams ?? t.current_teams ?? 0),
          0
        )

        const payouts = completedTournaments.reduce((sum: number, t: any) => {
          const eligibleTeams = t.eligible_teams ?? t.current_teams ?? 0
          const perTeamPot = getPerTeamPotFromDescription(t.description)
          const computedPrizePool = perTeamPot !== null ? perTeamPot * eligibleTeams : (t.prize_pool || 0)
          return sum + computedPrizePool
        }, 0)

        const matchesByTournament = (matchesData.matches || []).reduce((acc: Record<string, any[]>, match: any) => {
          const tournamentId = match.tournament_id
          if (!tournamentId) return acc
          if (!acc[tournamentId]) acc[tournamentId] = []
          acc[tournamentId].push(match)
          return acc
        }, {})

        const championEntries: HallOfFameEntry[] = completedTournaments.flatMap((t: any) => {
          const tournamentMatches = matchesByTournament[t.id] || []
          const finalMatch = tournamentMatches.find((match: any) => {
            const round = (match.round || '').toString().toLowerCase()
            const isFinal = /\bfinale?\b/i.test(round)
            const isSemiFinal = /semi/i.test(round)
            return match.status === 'completed' && isFinal && !isSemiFinal
          })

          if (!finalMatch) return []

          const team1Name = finalMatch.team1_name || finalMatch.team1
          const team2Name = finalMatch.team2_name || finalMatch.team2
          const score1 = finalMatch.score1
          const score2 = finalMatch.score2
          if (!team1Name || !team2Name || score1 === null || score1 === undefined || score2 === null || score2 === undefined) {
            return []
          }

          const winner = score1 >= score2 ? team1Name : team2Name
          const runnerUp = score1 >= score2 ? team2Name : team1Name
          const eligibleTeams = t.eligible_teams ?? t.current_teams ?? 0
          const perTeamPot = getPerTeamPotFromDescription(t.description)
          const computedPrizePool = perTeamPot !== null ? perTeamPot * eligibleTeams : (t.prize_pool || 0)
          const locale = isEnglish ? 'en-US' : 'nb-NO'
          const endDate = t.end_date ? new Date(t.end_date).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }) : ''
          const highlight = isEnglish
            ? `Final: ${team1Name} ${score1} - ${score2} ${team2Name}`
            : `Finale: ${team1Name} ${score1} - ${score2} ${team2Name}`

          return [{
            id: t.id,
            tournament: t.title,
            winner,
            runnerUp,
            date: endDate,
            prize: `${computedPrizePool.toLocaleString(isEnglish ? 'en-US' : 'nb-NO')} NOK`,
            participants: eligibleTeams,
            highlight,
            category: 'champion'
          }]
        })

        const completedMatches = (matchesData.matches || []).filter((match: any) =>
          match.status === 'completed' && completedTournamentIds.has(match.tournament_id)
        )

        const recordEntries: HallOfFameEntry[] = []

        const formatRecord = (recordId: string, titleNo: string, titleEn: string, value: string, highlightNo: string, highlightEn: string) => {
          recordEntries.push({
            id: recordId,
            tournament: isEnglish ? titleEn : titleNo,
            winner: value,
            runnerUp: 'N/A',
            date: '',
            prize: '',
            participants: 0,
            highlight: isEnglish ? highlightEn : highlightNo,
            category: 'record'
          })
        }

        if (completedMatches.length > 0) {
          let biggestWin = null as null | { team: string; opponent: string; margin: number; score1: number; score2: number }
          let mostGoals = null as null | { team1: string; team2: string; total: number; score1: number; score2: number }

          completedMatches.forEach((match: any) => {
            const team1 = match.team1_name || match.team1
            const team2 = match.team2_name || match.team2
            const score1 = match.score1
            const score2 = match.score2
            if (team1 == null || team2 == null || score1 == null || score2 == null) return

            const margin = Math.abs(score1 - score2)
            if (!biggestWin || margin > biggestWin.margin) {
              const winner = score1 >= score2 ? team1 : team2
              const opponent = score1 >= score2 ? team2 : team1
              biggestWin = { team: winner, opponent, margin, score1, score2 }
            }

            const total = score1 + score2
            if (!mostGoals || total > mostGoals.total) {
              mostGoals = { team1, team2, total, score1, score2 }
            }
          })

          if (biggestWin) {
            formatRecord(
              `record-biggest-win-${biggestWin.team}`,
              'Største seier',
              'Biggest win',
              `${biggestWin.team} (+${biggestWin.margin})`,
              `Resultat: ${biggestWin.team} ${biggestWin.score1} - ${biggestWin.score2} ${biggestWin.opponent}`,
              `Result: ${biggestWin.team} ${biggestWin.score1} - ${biggestWin.score2} ${biggestWin.opponent}`
            )
          }

          if (mostGoals) {
            formatRecord(
              `record-most-goals-${mostGoals.team1}-${mostGoals.team2}`,
              'Flest mål i en kamp',
              'Most goals in a match',
              `${mostGoals.total} ${isEnglish ? 'goals' : 'mål'}`,
              `Kamp: ${mostGoals.team1} ${mostGoals.score1} - ${mostGoals.score2} ${mostGoals.team2}`,
              `Match: ${mostGoals.team1} ${mostGoals.score1} - ${mostGoals.score2} ${mostGoals.team2}`
            )
          }

          const matchesByTeam = completedMatches.reduce((acc: Record<string, any[]>, match: any) => {
            const team1 = match.team1_name || match.team1
            const team2 = match.team2_name || match.team2
            if (!team1 || !team2) return acc
            if (!acc[team1]) acc[team1] = []
            if (!acc[team2]) acc[team2] = []
            acc[team1].push({ ...match, teamKey: team1 })
            acc[team2].push({ ...match, teamKey: team2 })
            return acc
          }, {})

          let bestStreak = null as null | { team: string; streak: number }
          Object.entries(matchesByTeam).forEach(([team, matches]) => {
            const sorted = (matches as any[]).sort((a, b) => {
              const dateA = a.scheduled_time ? new Date(a.scheduled_time).getTime() : 0
              const dateB = b.scheduled_time ? new Date(b.scheduled_time).getTime() : 0
              return dateA - dateB
            })

            let current = 0
            let best = 0
            sorted.forEach(match => {
              const team1 = match.team1_name || match.team1
              const team2 = match.team2_name || match.team2
              const score1 = match.score1
              const score2 = match.score2
              if (score1 == null || score2 == null) return
              const isTeam1 = team1 === team
              const teamScore = isTeam1 ? score1 : score2
              const oppScore = isTeam1 ? score2 : score1
              if (teamScore > oppScore) {
                current += 1
                best = Math.max(best, current)
              } else {
                current = 0
              }
            })

            if (!bestStreak || best > bestStreak.streak) {
              bestStreak = { team, streak: best }
            }
          })

          if (bestStreak && bestStreak.streak > 0) {
            formatRecord(
              `record-win-streak-${bestStreak.team}`,
              'Lengste seiersrekke',
              'Longest win streak',
              `${bestStreak.team} (${bestStreak.streak})`,
              `Seiersrekke: ${bestStreak.streak} kamper`,
              `Win streak: ${bestStreak.streak} ${bestStreak.streak === 1 ? 'match' : 'matches'}`
            )
          }
        }

        if (championEntries.length > 0) {
          const trophyCounts = championEntries.reduce((acc: Record<string, number>, entry) => {
            acc[entry.winner] = (acc[entry.winner] || 0) + 1
            return acc
          }, {})
          const topTeam = Object.entries(trophyCounts).sort((a, b) => b[1] - a[1])[0]
          if (topTeam) {
            formatRecord(
              `record-most-trophies-${topTeam[0]}`,
              'Flest trofeer',
              'Most trophies',
              `${topTeam[0]} (${topTeam[1]})`,
              `Troféer vunnet: ${topTeam[1]}`,
              `Trophies won: ${topTeam[1]}`
            )
          }
        }

        const matchesCompleted = completedMatches.length

        setStats({
          tournaments: completedTournaments.length,
          participants,
          payouts,
          matchesCompleted
        })

        setEntries([...championEntries, ...recordEntries])
      } catch (error) {
        console.warn('Could not load Hall of Fame stats:', error)
      }
    }

    loadStats()
  }, [isEnglish])

  return (
    <div className="min-h-screen">
      <Header backButton backHref="/" title="Hall of Fame" />

      <main className="container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="max-w-6xl w-full">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Hall of Fame</h1>
            <p className="text-slate-300 text-lg">
              {isEnglish
                ? 'Honoring the best teams and players in PRO11 history'
                : 'Ære til de beste lagene og spillerne i PRO11-historien'}
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="pro11-card p-6 text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">{stats.tournaments}</div>
              <div className="text-slate-400">{isEnglish ? 'Tournaments' : 'Turneringer'}</div>
            </div>
            <div className="pro11-card p-6 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{stats.participants}</div>
              <div className="text-slate-400">{isEnglish ? 'Participants' : 'Deltakere'}</div>
            </div>
            <div className="pro11-card p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{stats.payouts}</div>
              <div className="text-slate-400">{isEnglish ? 'NOK paid out' : 'NOK utdelt'}</div>
            </div>
            <div className="pro11-card p-6 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">{stats.matchesCompleted}</div>
              <div className="text-slate-400">{isEnglish ? 'Matches played' : 'Kamper spilt'}</div>
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
                {isEnglish ? 'Champions' : 'Mestere'}
              </button>
              <button
                onClick={() => setActiveTab('records')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'records' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isEnglish ? 'Records' : 'Rekorder'}
              </button>
              <button
                onClick={() => setActiveTab('achievements')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'achievements' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isEnglish ? 'Achievements' : 'Prestasjoner'}
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
                      {entry.participants > 1 && (
                        <span>
                          {entry.participants} {isEnglish ? 'participants' : 'deltakere'}
                        </span>
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
                <h3 className="text-xl font-semibold mb-2">
                  {isEnglish
                    ? `No ${activeTab === 'champions' ? 'champions' : activeTab === 'records' ? 'records' : 'achievements'} yet`
                    : `Ingen ${activeTab === 'champions' ? 'mestere' : activeTab === 'records' ? 'rekorder' : 'prestasjoner'} ennå`}
                </h3>
                <p className="text-slate-400 mb-6">
                  {isEnglish
                    ? 'When tournaments are completed, the results will appear here.'
                    : 'Når turneringer er fullført, vil resultatene vises her.'}
                </p>
                <Link href="/tournaments" className="pro11-button inline-flex items-center space-x-2">
                  <span>{isEnglish ? 'See tournaments' : 'Se turneringer'}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Future Champions */}
          <div className="pro11-card p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {isEnglish ? 'Will you be the next champion?' : 'Blir du neste mester?'}
            </h2>
            <p className="text-slate-300 mb-6">
              {isEnglish
                ? 'Register your team for a tournament and make history'
                : 'Meld på laget ditt til en turnering og skriv historie'}
            </p>
            <Link href="/tournaments" className="pro11-button inline-flex items-center space-x-2">
              <span>{isEnglish ? 'See tournaments' : 'Se turneringer'}</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
} 