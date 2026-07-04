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
  const normalized = round.trim().toLowerCase()
  if (/semi/i.test(normalized)) return false
  if (normalized === 'finale' || normalized === 'final') return true
  if (normalized === 'sluttspill') return true
  return /\bfinale?\b/i.test(normalized)
}

function getWinnerFromMatch(match: MatchForWinner): string | null {
  const team1 = (match.team1_name || match.team1 || '').trim()
  const team2 = (match.team2_name || match.team2 || '').trim()
  const score1 = match.score1
  const score2 = match.score2

  if (!team1 || !team2 || score1 == null || score2 == null) return null
  if (score1 > score2) return team1
  if (score2 > score1) return team2
  return team1
}

export function getTournamentWinnerFromMatches(matches: MatchForWinner[]): string | null {
  const completedKnockout = matches.filter(
    match => match.status === 'completed' && match.round && match.round !== 'Gruppespill'
  )
  if (completedKnockout.length === 0) return null

  const finalMatches = completedKnockout.filter(match => isFinalRound(match.round))
  const decisiveMatches = finalMatches.length > 0 ? finalMatches : completedKnockout
  const final = decisiveMatches[decisiveMatches.length - 1]
  return getWinnerFromMatch(final)
}

export function isTeamTournamentWinner(teamName: string, matches: MatchForWinner[]): boolean {
  const winner = getTournamentWinnerFromMatches(matches)
  if (!winner) return false
  return winner.toLowerCase() === teamName.toLowerCase()
}
