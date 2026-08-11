export interface MatchSubmissionContext {
  status: string
  scheduled_time?: string | null
}

export interface TournamentSubmissionContext {
  status: string
}

export interface SubmissionEligibility {
  allowed: boolean
  reasonNo?: string
  reasonEn?: string
}

const SUBMITTABLE_STATUSES = new Set([
  'scheduled',
  'live',
  'pending_result',
  'pending_confirmation'
])

/** Minutes before scheduled_time when captains may submit (lineup / early kickoff). */
export const RESULT_EARLY_GRACE_MS = 2 * 60 * 1000

export function canSubmitMatchResult(
  match: MatchSubmissionContext,
  tournament: TournamentSubmissionContext
): SubmissionEligibility {
  if (tournament.status !== 'active') {
    return {
      allowed: false,
      reasonNo: 'Turneringen har ikke startet ennå.',
      reasonEn: 'The tournament has not started yet.'
    }
  }

  if (match.status === 'completed') {
    return {
      allowed: false,
      reasonNo: 'Kampen er allerede fullført.',
      reasonEn: 'The match is already completed.'
    }
  }

  if (!SUBMITTABLE_STATUSES.has(match.status)) {
    return {
      allowed: false,
      reasonNo: 'Denne kampen tar ikke imot resultater nå.',
      reasonEn: 'This match is not accepting results right now.'
    }
  }

  const scheduledMs = match.scheduled_time ? new Date(match.scheduled_time).getTime() : null
  if (scheduledMs !== null && !Number.isNaN(scheduledMs)) {
    if (Date.now() < scheduledMs - RESULT_EARLY_GRACE_MS && match.status !== 'live') {
      return {
        allowed: false,
        reasonNo: 'Kampen har ikke startet ennå (planlagt tid er ikke nådd).',
        reasonEn: 'The match has not started yet (scheduled time not reached).'
      }
    }
    return { allowed: true }
  }

  // No scheduled time: require LIVE so teams cannot submit when the tournament opens.
  if (match.status !== 'live' && match.status !== 'pending_confirmation') {
    return {
      allowed: false,
      reasonNo: 'Kampen er ikke satt til LIVE ennå. Be admin om å starte kampen, eller sett planlagt tid.',
      reasonEn: 'The match is not LIVE yet. Ask admin to start the match, or set a scheduled time.'
    }
  }

  return { allowed: true }
}

export function getSubmissionBlockReason(
  eligibility: SubmissionEligibility,
  isEnglish: boolean
): string | undefined {
  if (eligibility.allowed) return undefined
  return isEnglish ? eligibility.reasonEn : eligibility.reasonNo
}

export const WALKOVER_GRACE_MS = 10 * 60 * 1000

/** Matches where WO may be claimed if kickoff + grace has passed and no result submitted. */
const WALKOVER_ELIGIBLE_STATUSES = new Set(['scheduled', 'live'])

export interface WalkoverMatchContext extends MatchSubmissionContext {
  team1_submitted_score1?: number | null
  team2_submitted_score1?: number | null
}

export function canClaimWalkover(
  match: WalkoverMatchContext,
  tournament: TournamentSubmissionContext
): SubmissionEligibility {
  if (tournament.status !== 'active') {
    return {
      allowed: false,
      reasonNo: 'Turneringen har ikke startet ennå.',
      reasonEn: 'The tournament has not started yet.'
    }
  }

  if (match.status === 'completed') {
    return {
      allowed: false,
      reasonNo: 'Kampen er allerede fullført.',
      reasonEn: 'The match is already completed.'
    }
  }

  if (!WALKOVER_ELIGIBLE_STATUSES.has(match.status)) {
    return {
      allowed: false,
      reasonNo: 'WO kan ikke kreves når et resultat allerede venter på behandling.',
      reasonEn: 'Walkover cannot be claimed while a result is pending.'
    }
  }

  const scheduledMs = match.scheduled_time ? new Date(match.scheduled_time).getTime() : null
  if (scheduledMs === null || Number.isNaN(scheduledMs)) {
    return {
      allowed: false,
      reasonNo: 'Kampen har ingen planlagt tid — WO er ikke tilgjengelig.',
      reasonEn: 'This match has no scheduled time — walkover is not available.'
    }
  }

  if (Date.now() < scheduledMs + WALKOVER_GRACE_MS) {
    return {
      allowed: false,
      reasonNo: 'WO kan tidligst kreves 10 minutter etter planlagt kampstart.',
      reasonEn: 'Walkover can be claimed at earliest 10 minutes after the scheduled kickoff.'
    }
  }

  const hasTeam1Submitted =
    match.team1_submitted_score1 !== null && match.team1_submitted_score1 !== undefined
  const hasTeam2Submitted =
    match.team2_submitted_score1 !== null && match.team2_submitted_score1 !== undefined

  if (hasTeam1Submitted || hasTeam2Submitted) {
    return {
      allowed: false,
      reasonNo: 'WO kan ikke kreves når et resultat allerede er sendt inn.',
      reasonEn: 'Walkover cannot be claimed when a result has already been submitted.'
    }
  }

  return { allowed: true }
}
