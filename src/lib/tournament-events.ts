import { getSupabaseAdmin } from '@/lib/supabase'

export type TournamentEventType =
  | 'result_submitted'
  | 'result_confirmed'
  | 'result_conflict'
  | 'result_rejected'
  | 'match_completed'
  | 'match_live'
  | 'walkover_claimed'
  | 'admin_update'

export interface TournamentEventInput {
  tournamentId: string
  matchId?: string | null
  eventType: TournamentEventType
  title: string
  detail?: string | null
  actorName?: string | null
  actorType?: 'captain' | 'admin' | 'system' | null
}

export async function logTournamentEvent(input: TournamentEventInput): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) return

    const { error } = await supabase.from('tournament_events').insert({
      tournament_id: input.tournamentId,
      match_id: input.matchId ?? null,
      event_type: input.eventType,
      title: input.title,
      detail: input.detail ?? null,
      actor_name: input.actorName ?? null,
      actor_type: input.actorType ?? null
    })

    if (error) {
      console.warn('tournament_events insert failed (run SETUP_TOURNAMENT_EVENTS.sql):', error.message)
    }
  } catch (error) {
    console.warn('logTournamentEvent error:', error)
  }
}

export function formatMatchLabel(team1: string, team2: string, score1?: number | null, score2?: number | null) {
  if (score1 != null && score2 != null) {
    return `${team1} ${score1}–${score2} ${team2}`
  }
  return `${team1} vs ${team2}`
}

interface MatchRow {
  id: string
  tournament_id: string
  team1_name: string
  team2_name: string
  round?: string | null
  group_name?: string | null
  status?: string | null
  score1?: number | null
  score2?: number | null
  scheduled_time?: string | null
  team1_submitted_score1?: number | null
  team1_submitted_score2?: number | null
  team2_submitted_score1?: number | null
  team2_submitted_score2?: number | null
}

export async function logMatchUpdateEvents(params: {
  currentMatch: MatchRow
  updatedMatch: MatchRow
  body: Record<string, unknown>
  updateData: Record<string, unknown>
  captainTeamName?: string | null
  isAdmin?: boolean
}) {
  const { currentMatch, updatedMatch, body, updateData, captainTeamName, isAdmin } = params
  const tournamentId = String(updatedMatch.tournament_id)
  const matchId = String(updatedMatch.id)
  const label = formatMatchLabel(updatedMatch.team1_name, updatedMatch.team2_name)

  if (isCaptainRejectSubmission(body)) {
    await logTournamentEvent({
      tournamentId,
      matchId,
      eventType: 'result_rejected',
      title: `${label} — resultat avvist`,
      detail: captainTeamName ? `Avvist av ${captainTeamName}` : undefined,
      actorName: captainTeamName ?? null,
      actorType: 'captain'
    })
    return
  }

  const isWalkover =
    updatedMatch.status === 'completed' &&
    updatedMatch.score1 != null &&
    updatedMatch.score2 != null &&
    ((updatedMatch.score1 === 3 && updatedMatch.score2 === 0) ||
      (updatedMatch.score1 === 0 && updatedMatch.score2 === 3)) &&
    !body.team_name

  if (isWalkover && currentMatch.status !== 'completed') {
    await logTournamentEvent({
      tournamentId,
      matchId,
      eventType: 'walkover_claimed',
      title: `${formatMatchLabel(updatedMatch.team1_name, updatedMatch.team2_name, updatedMatch.score1, updatedMatch.score2)} — WO`,
      detail: captainTeamName ? `Registrert av ${captainTeamName}` : isAdmin ? 'Registrert av admin' : undefined,
      actorName: captainTeamName ?? (isAdmin ? 'Admin' : null),
      actorType: captainTeamName ? 'captain' : isAdmin ? 'admin' : 'system'
    })
    return
  }

  if (updateData.status === 'live' && currentMatch.status !== 'live') {
    await logTournamentEvent({
      tournamentId,
      matchId,
      eventType: 'match_live',
      title: `${label} — kamp startet`,
      detail: updatedMatch.round ? String(updatedMatch.round) : undefined,
      actorType: isAdmin ? 'admin' : 'system'
    })
  }

  if (body.team_name && body.team_score1 !== undefined && body.team_score2 !== undefined) {
    const teamName = String(body.team_name)
    const teamScore1 = Number(body.team_score1)
    const teamScore2 = Number(body.team_score2)

    if (updatedMatch.status === 'completed') {
      await logTournamentEvent({
        tournamentId,
        matchId,
        eventType: 'match_completed',
        title: `${formatMatchLabel(updatedMatch.team1_name, updatedMatch.team2_name, updatedMatch.score1, updatedMatch.score2)} — ferdig`,
        detail: 'Begge lag bekreftet samme resultat',
        actorName: teamName,
        actorType: 'captain'
      })
      return
    }

    if (updatedMatch.status === 'pending_confirmation') {
      await logTournamentEvent({
        tournamentId,
        matchId,
        eventType: 'result_conflict',
        title: `${label} — uenighet`,
        detail: 'Resultatene stemmer ikke — admin må vurdere bildebevis',
        actorName: teamName,
        actorType: 'captain'
      })
      return
    }

    await logTournamentEvent({
      tournamentId,
      matchId,
      eventType: 'result_submitted',
      title: `${teamName}: ${teamScore1}–${teamScore2}`,
      detail: label,
      actorName: teamName,
      actorType: 'captain'
    })
    return
  }

  if (
    isAdmin &&
    !body.team_name &&
    (body.score1 !== undefined || body.score2 !== undefined) &&
    updatedMatch.status === 'completed' &&
    currentMatch.status !== 'completed'
  ) {
    await logTournamentEvent({
      tournamentId,
      matchId,
      eventType: 'admin_update',
      title: `${formatMatchLabel(updatedMatch.team1_name, updatedMatch.team2_name, updatedMatch.score1, updatedMatch.score2)} — admin`,
      actorType: 'admin'
    })
  }
}

function isCaptainRejectSubmission(body: Record<string, unknown>): boolean {
  return body.status === 'pending_result' && body.team1_submitted_score1 === null
}

export const WO_GRACE_MS = 10 * 60 * 1000
export const DELAY_ALERT_MS = 10 * 60 * 1000

export interface AttentionItem {
  id: string
  type: 'conflict' | 'pending_confirmation' | 'walkover_eligible' | 'schedule_delay' | 'pending_result'
  priority: number
  title: string
  description: string
  matchId: string
  tournamentId: string
}

export function buildAttentionItems(matches: MatchRow[]): AttentionItem[] {
  const items: AttentionItem[] = []
  const now = Date.now()

  for (const match of matches) {
    const label = formatMatchLabel(match.team1_name, match.team2_name)
    const tournamentId = String(match.tournament_id)
    const matchId = String(match.id)

    const t1s = match.team1_submitted_score1
    const t1s2 = match.team1_submitted_score2
    const t2s = match.team2_submitted_score1
    const t2s2 = match.team2_submitted_score2
    const team1Submitted = t1s !== null && t1s !== undefined
    const team2Submitted = t2s !== null && t2s !== undefined

    if (match.status === 'pending_confirmation' && team1Submitted && team2Submitted) {
      const mismatch = !(t1s === t2s2 && t1s2 === t2s)
      if (mismatch) {
        items.push({
          id: `conflict-${matchId}`,
          type: 'conflict',
          priority: 1,
          title: label,
          description: 'Uenige resultater — krever admin',
          matchId,
          tournamentId
        })
        continue
      }
    }

    if (team1Submitted !== team2Submitted && match.status !== 'completed') {
      const waitingTeam = team1Submitted ? match.team2_name : match.team1_name
      items.push({
        id: `pending-${matchId}`,
        type: 'pending_result',
        priority: 3,
        title: label,
        description: `Venter på ${waitingTeam}`,
        matchId,
        tournamentId
      })
    }

    if (match.status === 'scheduled' && match.scheduled_time) {
      const scheduledMs = new Date(match.scheduled_time).getTime()
      if (!Number.isNaN(scheduledMs)) {
        const overdueMs = now - scheduledMs
        if (overdueMs >= DELAY_ALERT_MS && !team1Submitted && !team2Submitted) {
          const mins = Math.floor(overdueMs / 60000)
          items.push({
            id: `delay-${matchId}`,
            type: 'schedule_delay',
            priority: 2,
            title: label,
            description: `${mins} min bak planlagt tid`,
            matchId,
            tournamentId
          })
          if (overdueMs >= WO_GRACE_MS) {
            items.push({
              id: `wo-${matchId}`,
              type: 'walkover_eligible',
              priority: 2,
              title: label,
              description: 'WO kan kreves (10+ min forsinket, ingen resultat)',
              matchId,
              tournamentId
            })
          }
        }
      }
    }
  }

  return items.sort((a, b) => a.priority - b.priority)
}
