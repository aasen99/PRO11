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

    console.log('POST /api/matches called with data:', {
      tournament_id,
      team1_name,
      team2_name,
      round,
      group_name,
      status,
      scheduled_time
    })

    if (!tournament_id || !team1_name || !team2_name || !round) {
      console.error('Missing required fields:', { tournament_id, team1_name, team2_name, round })
      return NextResponse.json({ error: 'tournament_id, team1_name, team2_name, and round are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      console.error('Failed to get Supabase admin client')
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const insertData: any = {
      tournament_id,
      team1_name,
      team2_name,
      round,
      status: status || 'scheduled'
    }

    // Only include group_name if it's a non-empty string
    if (group_name && group_name !== 'undefined' && group_name.trim() !== '') {
      insertData.group_name = group_name
    }
    
    // Only include scheduled_time if it's provided
    if (scheduled_time && scheduled_time !== 'null' && scheduled_time !== 'undefined') {
      insertData.scheduled_time = scheduled_time
    }

    console.log('Inserting match with data:', insertData)

    const { data: match, error } = await supabase
      .from('matches')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Database error creating match:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        insertData
      })
      return NextResponse.json({ 
        error: 'Failed to create match: ' + error.message,
        code: error.code,
        details: error.details
      }, { status: 400 })
    }

    console.log('Match created successfully:', match)
    return NextResponse.json({ match })
  } catch (error: any) {
    console.error('API error in POST /api/matches:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id, 
      status, 
      score1, 
      score2, 
      submitted_by, 
      submitted_score1, 
      submitted_score2,
      team_name, // The team submitting the result
      team_score1, // Score for team_name
      team_score2 // Score for opponent
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    // First, get the current match to check existing submissions
    const { data: currentMatch, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentMatch) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const updateData: any = {}
    
    // If a team is submitting a result
    if (team_name && team_score1 !== undefined && team_score2 !== undefined) {
      // Validation
      if (team_score1 < 0 || team_score2 < 0) {
        return NextResponse.json({ error: 'Resultater kan ikke være negative' }, { status: 400 })
      }
      
      if (currentMatch.status === 'completed') {
        return NextResponse.json({ error: 'Kampen er allerede fullført' }, { status: 400 })
      }
      
      const isTeam1 = currentMatch.team1_name === team_name
      const isTeam2 = currentMatch.team2_name === team_name
      
      if (!isTeam1 && !isTeam2) {
        return NextResponse.json({ error: 'Team name does not match this match' }, { status: 400 })
      }
      
      // Check if this team has already submitted
      const alreadySubmitted = (isTeam1 && currentMatch.team1_submitted_score1 !== null) || 
                              (isTeam2 && currentMatch.team2_submitted_score1 !== null)
      
      if (alreadySubmitted) {
        return NextResponse.json({ error: 'Du har allerede sendt inn resultat for denne kampen' }, { status: 400 })
      }

      // Store the team's submitted result
      if (isTeam1) {
        updateData.team1_submitted_score1 = team_score1
        updateData.team1_submitted_score2 = team_score2
      } else {
        updateData.team2_submitted_score1 = team_score1
        updateData.team2_submitted_score2 = team_score2
      }

      // Also update legacy fields for backward compatibility
      updateData.submitted_by = team_name
      updateData.submitted_score1 = team_score1
      updateData.submitted_score2 = team_score2

      // Check if both teams have submitted
      const team1Submitted = currentMatch.team1_submitted_score1 !== null || updateData.team1_submitted_score1 !== undefined
      const team2Submitted = currentMatch.team2_submitted_score1 !== null || updateData.team2_submitted_score1 !== undefined

      if (team1Submitted && team2Submitted) {
        // Both teams have submitted - check if results match
        const team1Score1 = updateData.team1_submitted_score1 ?? currentMatch.team1_submitted_score1
        const team1Score2 = updateData.team1_submitted_score2 ?? currentMatch.team1_submitted_score2
        const team2Score1 = updateData.team2_submitted_score1 ?? currentMatch.team2_submitted_score1
        const team2Score2 = updateData.team2_submitted_score2 ?? currentMatch.team2_submitted_score2

        // Team1's perspective: team1_score1 - team1_score2
        // Team2's perspective: team2_score1 (their score) - team2_score2 (opponent's score)
        // So team2_score1 should equal team1_score2, and team2_score2 should equal team1_score1
        if (team1Score1 === team2Score2 && team1Score2 === team2Score1) {
          // Results match! Complete the match
          updateData.score1 = team1Score1
          updateData.score2 = team1Score2
          updateData.status = 'completed'
          // Clear submitted fields
          updateData.team1_submitted_score1 = null
          updateData.team1_submitted_score2 = null
          updateData.team2_submitted_score1 = null
          updateData.team2_submitted_score2 = null
          updateData.submitted_by = null
          updateData.submitted_score1 = null
          updateData.submitted_score2 = null
        } else {
          // Results don't match - wait for admin review
          updateData.status = 'pending_confirmation'
        }
      } else {
        // Only one team has submitted - wait for the other team
        updateData.status = 'pending_confirmation'
      }
    } else {
      // Admin or direct update (not team submission)
      if (status) updateData.status = status
      if (score1 !== undefined) updateData.score1 = score1
      if (score2 !== undefined) updateData.score2 = score2
      if (submitted_by !== undefined) updateData.submitted_by = submitted_by
      if (submitted_score1 !== undefined) updateData.submitted_score1 = submitted_score1
      if (submitted_score2 !== undefined) updateData.submitted_score2 = submitted_score2
      
      // Handle clearing of submitted fields (for rejectResult)
      if (body.team1_submitted_score1 === null) updateData.team1_submitted_score1 = null
      if (body.team1_submitted_score2 === null) updateData.team1_submitted_score2 = null
      if (body.team2_submitted_score1 === null) updateData.team2_submitted_score1 = null
      if (body.team2_submitted_score2 === null) updateData.team2_submitted_score2 = null
      if (body.submitted_by === null) updateData.submitted_by = null
      if (body.submitted_score1 === null) updateData.submitted_score1 = null
      if (body.submitted_score2 === null) updateData.submitted_score2 = null
    }

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

