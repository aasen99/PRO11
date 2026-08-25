/** Teams that count toward registered spots and live prize pool. */
export function isTeamCountedAsRegistered(team: {
  status?: unknown
  payment_status?: unknown
  paymentStatus?: unknown
}): boolean {
  const paymentStatus = String(team.payment_status || team.paymentStatus || '')
  return team.status === 'approved' || paymentStatus === 'completed'
}

type SupabaseLike = {
  from: (table: string) => any
}

/**
 * Recalculate tournaments.current_teams from teams that are approved or paid.
 * Pending unpaid registrations must not occupy spots or inflate the prize pool.
 */
export async function recountTournamentRegisteredTeams(
  supabase: SupabaseLike,
  tournamentId: string | null | undefined | unknown
): Promise<number | null> {
  if (!tournamentId || typeof tournamentId !== 'string') return null

  const { data: teams, error } = await supabase
    .from('teams')
    .select('status, payment_status')
    .eq('tournament_id', tournamentId)

  if (error) {
    console.warn('Failed to load teams for recount:', error.message)
    return null
  }

  const count = (teams || []).filter(isTeamCountedAsRegistered).length

  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ current_teams: count })
    .eq('id', tournamentId)

  if (updateError) {
    console.warn('Failed to update current_teams:', updateError.message)
    return null
  }

  return count
}
