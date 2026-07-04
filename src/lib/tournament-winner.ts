export interface MatchForWinner {
  team1_name?: string
  team1?: string
  team2_name?: string
  team2?: string
  round?: string | null
  status: string
  score1?: number | null
  score2?: number | null
}

export function isFinalRound(round?: string | null): boolean {
  if (!round) return false
  const normalized = round.toLowerCase()
  if (/semi/i.test(normalized)) return false
  return /\bfinale?\b/i.test(normalized) || normalized === 'final'
}

export function getTournamentWinnerFromMatches(matches: MatchForWinner[]): string | null {
  const finals = matches.filter(match => isFinalRound(match.round) && match.status === 'completed')
  if (finals.length === 0) return null

  const final = finals[finals.length - 1]
  const team1 = final.team1_name || final.team1
  const team2 = final.team2_name || final.team2
  const score1 = final.score1
  const score2 = final.score2

  if (!team1 || !team2 || score1 == null || score2 == null) return null
  if (score1 > score2) return team1
  if (score2 > score1) return team2
  return team1
}

export function isTeamTournamentWinner(teamName: string, matches: MatchForWinner[]): boolean {
  const winner = getTournamentWinnerFromMatches(matches)
  if (!winner) return false
  return winner.toLowerCase() === teamName.toLowerCase()
}
