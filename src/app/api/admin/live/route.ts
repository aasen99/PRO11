import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isUnauthorized, requireAdmin } from '@/lib/session'
import { buildAttentionItems } from '@/lib/tournament-events'

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (isUnauthorized(admin)) return admin

    const { searchParams } = new URL(request.url)
    const tournamentIdParam = searchParams.get('tournament_id')
    const since = searchParams.get('since')

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data: tournaments, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, title, status, start_date, end_date, current_teams, max_teams')
      .in('status', ['active', 'upcoming'])
      .order('start_date', { ascending: false })

    if (tournamentError) {
      return NextResponse.json({ error: tournamentError.message }, { status: 400 })
    }

    const activeList = tournaments || []
    let selectedTournament =
      activeList.find(t => t.id === tournamentIdParam) ||
      activeList.find(t => t.status === 'active') ||
      activeList[0] ||
      null

    if (tournamentIdParam && !selectedTournament) {
      const { data: one } = await supabase
        .from('tournaments')
        .select('id, title, status, start_date, end_date, current_teams, max_teams')
        .eq('id', tournamentIdParam)
        .maybeSingle()
      if (one) selectedTournament = one
    }

    if (!selectedTournament) {
      return NextResponse.json({
        tournaments: [],
        tournament: null,
        events: [],
        attention: [],
        stats: null
      })
    }

    const tournamentId = String(selectedTournament.id)

    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(
        'id, tournament_id, team1_name, team2_name, round, group_name, status, score1, score2, scheduled_time, team1_submitted_score1, team1_submitted_score2, team2_submitted_score1, team2_submitted_score2, updated_at'
      )
      .eq('tournament_id', tournamentId)
      .order('scheduled_time', { ascending: true, nullsFirst: false })

    if (matchesError) {
      return NextResponse.json({ error: matchesError.message }, { status: 400 })
    }

    const matchList = matches || []
    const attention = buildAttentionItems(matchList as any)

    let eventsQuery = supabase
      .from('tournament_events')
      .select('id, tournament_id, match_id, event_type, title, detail, actor_name, actor_type, created_at')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false })
      .limit(80)

    if (since) {
      eventsQuery = eventsQuery.gt('created_at', since)
    }

    const { data: events, error: eventsError } = await eventsQuery
    const eventsOk = !eventsError

    const completed = matchList.filter(m => m.status === 'completed').length
    const live = matchList.filter(m => m.status === 'live').length
    const pending = matchList.filter(m => m.status === 'pending_confirmation').length
    const conflicts = attention.filter(a => a.type === 'conflict').length

    return NextResponse.json({
      tournaments: activeList,
      tournament: selectedTournament,
      events: eventsOk ? events || [] : [],
      eventsAvailable: eventsOk,
      eventsError: eventsOk ? null : eventsError?.message,
      attention,
      stats: {
        totalMatches: matchList.length,
        completedMatches: completed,
        liveMatches: live,
        pendingConfirmation: pending,
        conflicts,
        progress: matchList.length ? Math.round((completed / matchList.length) * 100) : 0
      }
    })
  } catch (error: any) {
    console.error('GET /api/admin/live error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
