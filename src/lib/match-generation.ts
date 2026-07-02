export interface GeneratedMatch {
  team1: string
  team2: string
  round: string
  group?: string
  groupRound?: number
  status: 'scheduled'
}

export interface MatchGenerationConfig {
  numGroups: number
  teamsPerGroup: number
  teamsToKnockout: number
  useBestRunnersUp: boolean
  numBestRunnersUp: number
  format: 'group_stage' | 'knockout' | 'mixed'
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function generateGroupStage(teams: string[], numGroups: number): string[][] {
  const shuffledTeams = shuffleArray(teams)
  const groups: string[][] = Array.from({ length: numGroups }, () => [])
  shuffledTeams.forEach((team, index) => {
    groups[index % numGroups].push(team)
  })
  return groups
}

function generateGroupMatches(groups: string[][]): GeneratedMatch[] {
  const matches: GeneratedMatch[] = []
  const buildKey = (teamA: string, teamB: string) => [teamA, teamB].sort().join('|')

  groups.forEach((group, groupIndex) => {
    const groupName = `Gruppe ${String.fromCharCode(65 + groupIndex)}`
    const teams = [...group]
    if (teams.length < 2) return

    if (teams.length % 2 === 1) {
      teams.push('__BYE__')
    }

    const totalRounds = teams.length - 1
    const half = teams.length / 2
    let rotation = [...teams]
    const usedPairs = new Set<string>()

    for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
      for (let i = 0; i < half; i += 1) {
        const home = rotation[i]
        const away = rotation[rotation.length - 1 - i]
        if (home === '__BYE__' || away === '__BYE__') continue
        const key = buildKey(home, away)
        if (usedPairs.has(key)) continue
        usedPairs.add(key)

        matches.push({
          team1: home,
          team2: away,
          round: 'Gruppespill',
          group: groupName,
          groupRound: roundIndex + 1,
          status: 'scheduled'
        })
      }
      const fixed = rotation[0]
      const rest = rotation.slice(1)
      rest.unshift(rest.pop() as string)
      rotation = [fixed, ...rest]
    }
  })

  return matches
}

function generateKnockoutBracket(teams: string[]): GeneratedMatch[] {
  const shuffledTeams = shuffleArray(teams)
  const matches: GeneratedMatch[] = []

  const getRoundName = (numTeams: number): string => {
    if (numTeams === 2) return 'Finale'
    if (numTeams === 4) return 'Semifinaler'
    if (numTeams === 8) return 'Kvartfinaler'
    if (numTeams > 8) return 'Kvartfinaler'
    if (numTeams > 4) return 'Semifinaler'
    return 'Sluttspill'
  }

  const roundName = getRoundName(shuffledTeams.length)

  for (let i = 0; i < shuffledTeams.length; i += 2) {
    if (i + 1 < shuffledTeams.length) {
      matches.push({
        team1: shuffledTeams[i],
        team2: shuffledTeams[i + 1],
        round: roundName,
        status: 'scheduled'
      })
    }
  }

  return matches
}

export function getDefaultMatchConfig(
  totalTeams: number,
  format: 'group_stage' | 'knockout' | 'mixed' = 'mixed'
): MatchGenerationConfig {
  if (totalTeams === 2) {
    return {
      numGroups: 1,
      teamsPerGroup: 2,
      teamsToKnockout: 2,
      useBestRunnersUp: false,
      numBestRunnersUp: 0,
      format: 'knockout'
    }
  }

  let numGroups = 2
  if (totalTeams > 16) numGroups = 4
  else if (totalTeams > 8) numGroups = 3

  return {
    numGroups,
    teamsPerGroup: 0,
    teamsToKnockout: 2,
    useBestRunnersUp: false,
    numBestRunnersUp: 0,
    format
  }
}

export function generateMatchesForTeams(
  teamNames: string[],
  configInput?: Partial<MatchGenerationConfig>
): { matches: GeneratedMatch[]; formatText: string } {
  const totalTeams = teamNames.length
  const defaults = getDefaultMatchConfig(totalTeams, configInput?.format || 'mixed')
  const config: MatchGenerationConfig = { ...defaults, ...configInput, format: configInput?.format || defaults.format }

  if (totalTeams < 2) {
    return { matches: [], formatText: '' }
  }

  if (totalTeams === 2) {
    return {
      matches: generateKnockoutBracket(teamNames),
      formatText: 'Sluttspill: direkte finale (2 lag)'
    }
  }

  let matches: GeneratedMatch[] = []
  let formatText = ''

  if (config.format === 'group_stage' || config.format === 'mixed') {
    let numGroups = config.numGroups
    if (numGroups <= 0) numGroups = totalTeams <= 8 ? 2 : 4

    let teamsPerGroup = config.teamsPerGroup
    if (teamsPerGroup <= 0) teamsPerGroup = Math.floor(totalTeams / numGroups)

    const groups = generateGroupStage(teamNames, numGroups)
    matches = generateGroupMatches(groups)

    formatText = [
      `Gruppespill: ${numGroups} grupper`,
      `Lag per gruppe: ${teamsPerGroup}`,
      `Videre til sluttspill: ${config.teamsToKnockout} fra hver gruppe`
    ].join('\n')
  }

  if (config.format === 'knockout') {
    matches = [...matches, ...generateKnockoutBracket(teamNames)]
    formatText = 'Sluttspill: cup (alle lag)'
  }

  if (config.format === 'mixed' && formatText) {
    formatText = `${formatText}\nSluttspill: cup`
  }

  return { matches, formatText }
}

export function getMatchRoundIndex(match: GeneratedMatch, maxGroupRound: number): number {
  if (match.round === 'Gruppespill') return (match.groupRound ?? 1) - 1
  if (match.round === 'Kvartfinaler') return maxGroupRound
  if (match.round === 'Semifinaler') return maxGroupRound + 1
  if (match.round === 'Finale') return maxGroupRound + 2
  return maxGroupRound
}
