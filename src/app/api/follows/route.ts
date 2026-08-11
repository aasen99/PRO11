import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const VISITOR_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/

function mapCounts(rows: Array<{ team_name: string }> | null | undefined) {
  const counts: Record<string, number> = {}
  for (const row of rows || []) {
    const name = row.team_name
    if (!name) continue
    counts[name] = (counts[name] || 0) + 1
  }
  return counts
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournament_id') || searchParams.get('tournamentId')

    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournament_id' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('tournament_team_followers')
      .select('team_name')
      .eq('tournament_id', tournamentId)

    if (error) {
      if (error.message?.includes('tournament_team_followers')) {
        return NextResponse.json({ counts: {} })
      }
      return NextResponse.json({ error: 'Failed to fetch follows: ' + error.message }, { status: 400 })
    }

    return NextResponse.json({ counts: mapCounts((data || []) as Array<{ team_name: string }>) })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tournamentId = body.tournamentId || body.tournament_id
    const visitorId = typeof body.visitorId === 'string' ? body.visitorId.trim() : ''
    const teamNameRaw = body.teamName ?? body.team_name
    const teamName =
      typeof teamNameRaw === 'string' && teamNameRaw.trim().length > 0
        ? teamNameRaw.trim().slice(0, 255)
        : null

    if (!tournamentId || !visitorId) {
      return NextResponse.json({ error: 'Missing tournamentId or visitorId' }, { status: 400 })
    }

    if (!VISITOR_ID_REGEX.test(visitorId)) {
      return NextResponse.json({ error: 'Invalid visitorId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    if (!teamName) {
      const { error: deleteError } = await supabase
        .from('tournament_team_followers')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('visitor_id', visitorId)

      if (deleteError) {
        if (deleteError.message?.includes('tournament_team_followers')) {
          return NextResponse.json({ counts: {}, following: null })
        }
        return NextResponse.json({ error: 'Failed to unfollow: ' + deleteError.message }, { status: 400 })
      }
    } else {
      const { data: teamMatch, error: teamError } = await supabase
        .from('teams')
        .select('id, team_name')
        .eq('tournament_id', tournamentId)
        .eq('team_name', teamName)
        .limit(1)
        .maybeSingle()

      if (teamError) {
        return NextResponse.json({ error: 'Failed to verify team: ' + teamError.message }, { status: 400 })
      }

      if (!teamMatch) {
        return NextResponse.json({ error: 'Team not found in tournament' }, { status: 404 })
      }

      const { error: upsertError } = await supabase.from('tournament_team_followers').upsert(
        {
          tournament_id: tournamentId,
          visitor_id: visitorId,
          team_name: teamName,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'tournament_id,visitor_id' }
      )

      if (upsertError) {
        return NextResponse.json({ error: 'Failed to follow team: ' + upsertError.message }, { status: 400 })
      }
    }

    const { data: rows, error: countError } = await supabase
      .from('tournament_team_followers')
      .select('team_name')
      .eq('tournament_id', tournamentId)

    if (countError) {
      return NextResponse.json({ following: teamName, counts: {} })
    }

    return NextResponse.json({ following: teamName, counts: mapCounts((rows || []) as Array<{ team_name: string }>) })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}
