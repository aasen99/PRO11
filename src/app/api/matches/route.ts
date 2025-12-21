import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournament_id')

    console.log('GET /api/matches called with tournament_id:', tournamentId)

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      console.error('Failed to get Supabase admin client')
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    console.log('Supabase admin client created, querying matches...')

    // Try to query matches table
    let query = supabase
      .from('matches')
      .select('*')

    if (tournamentId) {
      console.log('Filtering by tournament_id:', tournamentId)
      query = query.eq('tournament_id', tournamentId)
    }

    // Order by created_at first (always has value)
    query = query.order('created_at', { ascending: true })

    const { data: matches, error } = await query

    if (error) {
      console.error('Database error fetching matches:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2)
      })
      
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('table')) {
        console.warn('Matches table does not exist or cannot be accessed, returning empty array')
        return NextResponse.json({ matches: [] })
      }
      
      // For other errors, still return empty array to prevent UI breaking
      console.warn('Database error, but returning empty array to prevent UI breaking:', error.message)
      return NextResponse.json({ matches: [] })
    }

    console.log('Fetched matches from database:', {
      tournamentId: tournamentId || 'all',
      count: matches?.length || 0,
      matches: matches?.slice(0, 5).map((m: any) => ({ 
        id: m.id, 
        tournament_id: m.tournament_id, 
        round: m.round, 
        team1: m.team1_name, 
        team2: m.team2_name 
      }))
    })

    return NextResponse.json({ matches: matches || [] })
  } catch (error: any) {
    console.error('API error in GET /api/matches:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error.message || 'Unknown error')
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tournament_id, team1_name, team2_name, round, group_name, status, scheduled_time } = body

    if (!tournament_id || !team1_name || !team2_name || !round) {
      return NextResponse.json({ error: 'tournament_id, team1_name, team2_name, and round are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const insertData: any = {
      tournament_id,
      team1_name,
      team2_name,
      round,
      status: status || 'scheduled'
    }

    if (group_name) insertData.group_name = group_name
    if (scheduled_time) insertData.scheduled_time = scheduled_time

    const { data: match, error } = await supabase
      .from('matches')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create match: ' + error.message }, { status: 400 })
    }

    return NextResponse.json({ match })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, score1, score2, submitted_by, submitted_score1, submitted_score2 } = body

    if (!id) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (score1 !== undefined) updateData.score1 = score1
    if (score2 !== undefined) updateData.score2 = score2
    if (submitted_by !== undefined) updateData.submitted_by = submitted_by
    if (submitted_score1 !== undefined) updateData.submitted_score1 = submitted_score1
    if (submitted_score2 !== undefined) updateData.submitted_score2 = submitted_score2

    const { data: match, error } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update match: ' + error.message }, { status: 400 })
    }

    return NextResponse.json({ match })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournament_id')

    if (!tournamentId) {
      return NextResponse.json({ error: 'tournament_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournamentId)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to delete matches: ' + error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

