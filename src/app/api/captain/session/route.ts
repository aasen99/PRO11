import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getCaptainSession } from '@/lib/session'

function mapSessionTeam(row: any, tournamentIds: string[] = []) {
  return {
    id: row.id,
    teamName: row.team_name,
    team_name: row.team_name,
    captainName: row.captain_name,
    captain_name: row.captain_name,
    captainEmail: row.captain_email,
    captain_email: row.captain_email,
    captainPhone: row.captain_phone || '',
    captain_phone: row.captain_phone || '',
    discordUsername: row.discord_username || '',
    discord_username: row.discord_username || '',
    tournamentId: row.tournament_id || tournamentIds[0] || '',
    tournament_id: row.tournament_id || tournamentIds[0] || '',
    tournaments: tournamentIds,
    expectedPlayers: row.expected_players ?? 0,
    expected_players: row.expected_players ?? 0,
    paymentStatus: row.payment_status || 'pending',
    payment_status: row.payment_status || 'pending',
    checkedIn: row.checked_in ?? false,
    checked_in: row.checked_in ?? false,
    created_at: row.created_at
  }
}

export async function GET(request: NextRequest) {
  const session = getCaptainSession(request)
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({
      authenticated: true,
      team: {
        id: session.teamId,
        teamName: session.teamName,
        captainEmail: session.captainEmail
      }
    })
  }

  const { data: teamRow, error: teamError } = await supabase
    .from('teams')
    .select(
      'id, team_name, captain_name, captain_email, captain_phone, discord_username, tournament_id, payment_status, expected_players, checked_in, created_at'
    )
    .eq('id', session.teamId)
    .maybeSingle()

  if (teamError || !teamRow) {
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Captain session is outdated. Please log in again.'
      },
      { status: 401 }
    )
  }

  const captainEmail = String(teamRow.captain_email || session.captainEmail || '').trim()
  const { data: relatedTeams } = captainEmail
    ? await supabase
        .from('teams')
        .select('tournament_id')
        .ilike('captain_email', captainEmail)
    : { data: [] as { tournament_id: string | null }[] }

  const tournamentIds = Array.from(
    new Set(
      (relatedTeams || [])
        .map((row) => row.tournament_id)
        .filter(Boolean) as string[]
    )
  )

  return NextResponse.json({
    authenticated: true,
    team: mapSessionTeam(teamRow, tournamentIds)
  })
}
