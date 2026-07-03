import type { StandingsRow } from '@/components/GroupStandingsTable'

export interface BracketSlot {
  label: string
  team?: string
  placeholder?: boolean
}

export interface BracketPreviewMatch {
  id: string
  team1: BracketSlot
  team2: BracketSlot
}

export interface BracketPreviewRound {
  round: string
  matches: BracketPreviewMatch[]
}

export function parseTeamsToKnockoutFromFormat(formatText: string): number {
  const match = formatText.match(/Videre til sluttspill:\s*(\d+)/i)
  return match ? Math.max(1, parseInt(match[1], 10)) : 2
}

export function getGroupLetter(groupName: string, groupNames: string[]): string {
  const idx = groupNames.indexOf(groupName)
  if (idx >= 0) return String.fromCharCode(65 + idx)
  const letterMatch = groupName.match(/Gruppe\s*([A-Z])/i)
  if (letterMatch) return letterMatch[1].toUpperCase()
  return groupName.slice(0, 1).toUpperCase()
}

function resolveSlot(
  position: number,
  groupName: string,
  groupNames: string[],
  standings: Record<string, StandingsRow[]>
): BracketSlot {
  const letter = getGroupLetter(groupName, groupNames)
  const slotLabel = `${position}${letter}`
  const team = standings[groupName]?.[position - 1]?.team
  if (team) {
    return { label: slotLabel, team, placeholder: false }
  }
  return { label: slotLabel, placeholder: true }
}

function winnerSlot(ref: string, isEnglish: boolean): BracketSlot {
  return {
    label: isEnglish ? `Winner ${ref}` : `Vinner ${ref}`,
    placeholder: true
  }
}

function buildPlayInPreview(
  groupNames: string[],
  standings: Record<string, StandingsRow[]>,
  isEnglish: boolean
): BracketPreviewRound[] {
  const [gA, gB] = groupNames

  return [
    {
      round: 'Kvartfinaler',
      matches: [
        {
          id: 'qf-1',
          team1: resolveSlot(2, gA, groupNames, standings),
          team2: resolveSlot(3, gB, groupNames, standings)
        },
        {
          id: 'qf-2',
          team1: resolveSlot(2, gB, groupNames, standings),
          team2: resolveSlot(3, gA, groupNames, standings)
        }
      ]
    },
    {
      round: 'Semifinaler',
      matches: [
        {
          id: 'sf-1',
          team1: resolveSlot(1, gA, groupNames, standings),
          team2: winnerSlot('QF-2', isEnglish)
        },
        {
          id: 'sf-2',
          team1: resolveSlot(1, gB, groupNames, standings),
          team2: winnerSlot('QF-1', isEnglish)
        }
      ]
    },
    {
      round: 'Finale',
      matches: [
        {
          id: 'finale',
          team1: winnerSlot('SF-1', isEnglish),
          team2: winnerSlot('SF-2', isEnglish)
        }
      ]
    }
  ]
}

function buildCrossSemifinalPreview(
  groupNames: string[],
  standings: Record<string, StandingsRow[]>,
  isEnglish: boolean
): BracketPreviewRound[] {
  const [gA, gB] = groupNames

  return [
    {
      round: 'Semifinaler',
      matches: [
        {
          id: 'sf-1',
          team1: resolveSlot(1, gA, groupNames, standings),
          team2: resolveSlot(2, gB, groupNames, standings)
        },
        {
          id: 'sf-2',
          team1: resolveSlot(1, gB, groupNames, standings),
          team2: resolveSlot(2, gA, groupNames, standings)
        }
      ]
    },
    {
      round: 'Finale',
      matches: [
        {
          id: 'finale',
          team1: winnerSlot('SF-1', isEnglish),
          team2: winnerSlot('SF-2', isEnglish)
        }
      ]
    }
  ]
}

type Qualifier = {
  position: number
  groupName: string
  team?: string
  points: number
  goalsFor: number
  goalsAgainst: number
  label: string
  placeholder: boolean
}

function buildQualifiers(
  groupNames: string[],
  standings: Record<string, StandingsRow[]>,
  teamsToKnockout: number
): Qualifier[] {
  const qualifiers: Qualifier[] = []

  for (let position = 1; position <= teamsToKnockout; position += 1) {
    groupNames.forEach(groupName => {
      const team = standings[groupName]?.[position - 1]
      const letter = getGroupLetter(groupName, groupNames)
      qualifiers.push({
        position,
        groupName,
        team: team?.team,
        points: team?.points ?? 0,
        goalsFor: team?.goalsFor ?? 0,
        goalsAgainst: team?.goalsAgainst ?? 0,
        label: `${position}${letter}`,
        placeholder: !team?.team
      })
    })
  }

  return qualifiers.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position
    if (b.points !== a.points) return b.points - a.points
    const aDiff = a.goalsFor - a.goalsAgainst
    const bDiff = b.goalsFor - b.goalsAgainst
    if (bDiff !== aDiff) return bDiff - aDiff
    return b.goalsFor - a.goalsFor
  })
}

function generateSeededPairings(qualifiers: Qualifier[]): [Qualifier, Qualifier][] {
  const half = Math.floor(qualifiers.length / 2)
  const highSeeds = qualifiers.slice(0, half)
  const lowPool = qualifiers.slice(half).reverse()
  const usedLow = new Set<number>()
  const pairings: [Qualifier, Qualifier][] = []

  for (let i = 0; i < highSeeds.length; i += 1) {
    const high = highSeeds[i]
    let chosen = -1
    for (let j = 0; j < lowPool.length; j += 1) {
      if (usedLow.has(j)) continue
      if (lowPool[j].groupName === high.groupName) continue
      chosen = j
      break
    }
    if (chosen === -1) {
      for (let j = 0; j < lowPool.length; j += 1) {
        if (!usedLow.has(j)) {
          chosen = j
          break
        }
      }
    }
    if (chosen >= 0) {
      usedLow.add(chosen)
      pairings.push([high, lowPool[chosen]])
    }
  }

  return pairings
}

function getRoundNameCanonical(numTeams: number): string {
  if (numTeams === 2) return 'Finale'
  if (numTeams === 4) return 'Semifinaler'
  if (numTeams === 8) return 'Kvartfinaler'
  if (numTeams > 8) return 'Kvartfinaler'
  if (numTeams > 4) return 'Semifinaler'
  return 'Sluttspill'
}

const ROUND_SEQUENCE = ['Sluttspill', 'Kvartfinaler', 'Semifinaler', 'Finale'] as const

function appendPlaceholderRounds(
  rounds: BracketPreviewRound[],
  firstRoundName: string,
  matchCount: number,
  isEnglish: boolean
): BracketPreviewRound[] {
  const result = [...rounds]
  let teamsInRound = matchCount
  let currentRoundName = firstRoundName

  while (teamsInRound > 1) {
    const currentIndex = ROUND_SEQUENCE.indexOf(currentRoundName as (typeof ROUND_SEQUENCE)[number])
    const nextRound = ROUND_SEQUENCE[currentIndex + 1]
    if (!nextRound) break

    const nextMatchCount = Math.floor(teamsInRound / 2)
    result.push({
      round: nextRound,
      matches: Array.from({ length: nextMatchCount }, (_, i) => ({
        id: `${nextRound.toLowerCase()}-${i + 1}`,
        team1: winnerSlot(`${currentRoundName}-${i * 2 + 1}`, isEnglish),
        team2: winnerSlot(`${currentRoundName}-${i * 2 + 2}`, isEnglish)
      }))
    })

    teamsInRound = nextMatchCount
    currentRoundName = nextRound
  }

  return result
}

export function buildKnockoutBracketPreview(
  groupStandings: Record<string, StandingsRow[]>,
  formatText: string,
  isEnglish = false
): BracketPreviewRound[] | null {
  const groupNames = Object.keys(groupStandings).sort()
  if (groupNames.length === 0) return null

  const teamsToKnockout = parseTeamsToKnockoutFromFormat(formatText)
  const qualifierCount = groupNames.length * teamsToKnockout

  if (groupNames.length === 2 && teamsToKnockout === 3 && qualifierCount === 6) {
    return buildPlayInPreview(groupNames, groupStandings, isEnglish)
  }

  if (groupNames.length === 2 && teamsToKnockout === 2 && qualifierCount === 4) {
    return buildCrossSemifinalPreview(groupNames, groupStandings, isEnglish)
  }

  const qualifiers = buildQualifiers(groupNames, groupStandings, teamsToKnockout)
  if (qualifiers.length < 2) return null

  const pairings = generateSeededPairings(qualifiers)
  if (pairings.length === 0) return null

  const firstRoundName = getRoundNameCanonical(pairings.length * 2)
  const firstRound: BracketPreviewRound = {
    round: firstRoundName,
    matches: pairings.map(([a, b], i) => ({
      id: `${firstRoundName.toLowerCase()}-${i + 1}`,
      team1: {
        label: a.label,
        team: a.team,
        placeholder: a.placeholder && !a.team
      },
      team2: {
        label: b.label,
        team: b.team,
        placeholder: b.placeholder && !b.team
      }
    }))
  }

  return appendPlaceholderRounds([firstRound], firstRoundName, pairings.length, isEnglish)
}
