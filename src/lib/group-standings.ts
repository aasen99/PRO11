import type { StandingsRow } from '@/components/GroupStandingsTable'

export interface StandingsMatchInput {
  team1_name: string
  team2_name: string
  group_name?: string | null
  round?: string | null
  status?: string | null
  score1?: number | null
  score2?: number | null
}

export function calculateGroupStandings(
  allMatches: StandingsMatchInput[],
  defaultGroupName = 'Gruppe'
): Record<string, StandingsRow[]> {
  const standings: Record<string, Record<string, StandingsRow>> = {}

  const getHeadToHeadComparison = (teamA: string, teamB: string, groupMatches: StandingsMatchInput[]) => {
    let aPoints = 0
    let bPoints = 0
    let aGoalsFor = 0
    let aGoalsAgainst = 0
    let bGoalsFor = 0
    let bGoalsAgainst = 0
    let hasMatch = false

    groupMatches.forEach(match => {
      if (match.status !== 'completed') return
      const isAHome = match.team1_name === teamA && match.team2_name === teamB
      const isBHome = match.team1_name === teamB && match.team2_name === teamA
      if (!isAHome && !isBHome) return

      hasMatch = true
      const score1 = match.score1 ?? 0
      const score2 = match.score2 ?? 0

      if (isAHome) {
        aGoalsFor += score1
        aGoalsAgainst += score2
        bGoalsFor += score2
        bGoalsAgainst += score1
        if (score1 > score2) aPoints += 3
        else if (score1 < score2) bPoints += 3
        else {
          aPoints += 1
          bPoints += 1
        }
      } else {
        bGoalsFor += score1
        bGoalsAgainst += score2
        aGoalsFor += score2
        aGoalsAgainst += score1
        if (score1 > score2) bPoints += 3
        else if (score1 < score2) aPoints += 3
        else {
          aPoints += 1
          bPoints += 1
        }
      }
    })

    if (!hasMatch) return 0

    if (bPoints !== aPoints) return bPoints - aPoints
    const aDiff = aGoalsFor - aGoalsAgainst
    const bDiff = bGoalsFor - bGoalsAgainst
    if (bDiff !== aDiff) return bDiff - aDiff
    if (bGoalsFor !== aGoalsFor) return bGoalsFor - aGoalsFor
    return 0
  }

  const resolveGroup = (match: StandingsMatchInput) =>
    match.group_name?.trim() || defaultGroupName

  allMatches.forEach(match => {
    if (match.round !== 'Gruppespill') return
    const group = resolveGroup(match)
    if (!standings[group]) standings[group] = {}

    const ensureTeam = (name: string) => {
      if (!standings[group][name]) {
        standings[group][name] = {
          team: name,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0
        }
      }
    }

    ensureTeam(match.team1_name)
    ensureTeam(match.team2_name)
  })

  allMatches.forEach(match => {
    if (match.round !== 'Gruppespill' || match.status !== 'completed') return
    if (match.score1 === undefined || match.score1 === null) return
    if (match.score2 === undefined || match.score2 === null) return

    const group = resolveGroup(match)
    const groupStandings = standings[group]
    if (!groupStandings) return

    const team1 = groupStandings[match.team1_name]
    const team2 = groupStandings[match.team2_name]
    if (!team1 || !team2) return

    const score1 = match.score1
    const score2 = match.score2

    team1.played += 1
    team2.played += 1
    team1.goalsFor += score1
    team1.goalsAgainst += score2
    team2.goalsFor += score2
    team2.goalsAgainst += score1

    if (score1 > score2) {
      team1.wins += 1
      team1.points += 3
      team2.losses += 1
    } else if (score2 > score1) {
      team2.wins += 1
      team2.points += 3
      team1.losses += 1
    } else {
      team1.draws += 1
      team2.draws += 1
      team1.points += 1
      team2.points += 1
    }
  })

  const result: Record<string, StandingsRow[]> = {}
  Object.keys(standings).forEach(groupName => {
    const groupMatches = allMatches.filter(
      match => match.round === 'Gruppespill' && resolveGroup(match) === groupName
    )
    result[groupName] = Object.values(standings[groupName]).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      const aDiff = a.goalsFor - a.goalsAgainst
      const bDiff = b.goalsFor - b.goalsAgainst
      if (bDiff !== aDiff) return bDiff - aDiff
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
      return getHeadToHeadComparison(a.team, b.team, groupMatches)
    })
  })

  return result
}

export function toStandingsMatchInputs(
  matches: Array<{
    team1?: string
    team2?: string
    team1_name?: string
    team2_name?: string
    group?: string | null
    group_name?: string | null
    round?: string | null
    status?: string | null
    score1?: number | null
    score2?: number | null
  }>
): StandingsMatchInput[] {
  return matches.map(match => ({
    team1_name: match.team1_name ?? match.team1 ?? '',
    team2_name: match.team2_name ?? match.team2 ?? '',
    group_name: match.group_name ?? match.group ?? null,
    round: match.round ?? null,
    status: match.status ?? null,
    score1: match.score1 ?? null,
    score2: match.score2 ?? null
  }))
}
