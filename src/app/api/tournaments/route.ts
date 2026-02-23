import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    // Use admin client to ensure we can read all tournaments
    // (RLS policies should allow public read, but using admin ensures it works)
    const supabase = getSupabaseAdmin() || getSupabase()

    if (id) {
      // Get single tournament
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Failed to fetch tournament: ' + error.message }, { status: 400 })
      }

      if (!tournament) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
      }

      // Auto-activate tournament when start_date has passed
      if (tournament.status === 'upcoming' && tournament.start_date) {
        const startMs = new Date(tournament.start_date).getTime()
        if (!Number.isNaN(startMs) && Date.now() >= startMs) {
          const { data: updatedTournament, error: updateError } = await supabase
            .from('tournaments')
            .update({ status: 'active' })
            .eq('id', id)
            .select('*')
            .single()

          if (!updateError && updatedTournament) {
            tournament.status = updatedTournament.status
          }
        }
      }

      const { data: teamsForTournament } = await supabase
        .from('teams')
        .select('status, payment_status')
        .eq('tournament_id', id)

      const eligibleTeamsCount = (teamsForTournament || []).filter((team: any) =>
        team.status === 'approved' || team.payment_status === 'completed'
      ).length

      return NextResponse.json({
        tournament: {
          ...tournament,
          eligible_teams: eligibleTeamsCount
        }
      })
    } else {
      // Get all tournaments
      console.log('Fetching all tournaments...')
      const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) {
        console.error('Database error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return NextResponse.json({ error: 'Failed to fetch tournaments: ' + error.message }, { status: 400 })
      }

      console.log('Fetched tournaments count:', tournaments?.length || 0)
      console.log('Tournaments:', tournaments?.map((t: any) => ({ id: t.id, title: t.title })))
      const tournamentIds = (tournaments || []).map((t: any) => t.id)
      let eligibleTeamsByTournament: Record<string, number> = {}

      // Auto-activate tournaments when start_date has passed
      const nowMs = Date.now()
      const toActivate = (tournaments || []).filter((t: any) => {
        if (t.status !== 'upcoming' || !t.start_date) return false
        const startMs = new Date(t.start_date).getTime()
        return !Number.isNaN(startMs) && nowMs >= startMs
      })

      if (toActivate.length > 0) {
        const activateIds = toActivate.map((t: any) => t.id)
        const { data: activated } = await supabase
          .from('tournaments')
          .update({ status: 'active' })
          .in('id', activateIds)
          .select('*')

        if (activated && activated.length > 0) {
          const activatedMap = new Map(activated.map((t: any) => [t.id, t]))
          tournaments.forEach((t: any, index: number) => {
            const updated = activatedMap.get(t.id)
            if (updated) {
              tournaments[index] = updated
            }
          })
        }
      }

      if (tournamentIds.length > 0) {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('tournament_id, status, payment_status')
          .in('tournament_id', tournamentIds)

        eligibleTeamsByTournament = (allTeams || []).reduce((acc: Record<string, number>, team: any) => {
          const isEligible = team.status === 'approved' || team.payment_status === 'completed'
          if (!isEligible) return acc
          const tournamentId = team.tournament_id
          acc[tournamentId] = (acc[tournamentId] || 0) + 1
          return acc
        }, {})
      }

      const enrichedTournaments = (tournaments || []).map((t: any) => ({
        ...t,
        eligible_teams: eligibleTeamsByTournament[t.id] || 0
      }))

      return NextResponse.json({ tournaments: enrichedTournaments })
    }

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, description_en, start_date, end_date, max_teams, prize_pool, entry_fee, status } = body
    const normalizedEntryFee = Number(entry_fee)
    const safeEntryFee = Number.isFinite(normalizedEntryFee) ? normalizedEntryFee : 299

    console.log('POST /api/tournaments - Received data:', body)
    console.log('Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      allSupabaseKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    })

    if (!title || !start_date || !end_date) {
      console.error('Missing required fields:', { title, start_date, end_date })
      return NextResponse.json({ error: 'Title, start_date, and end_date are required' }, { status: 400 })
    }

    // Use admin client for insert/update/delete operations to bypass RLS
    const supabase = getSupabaseAdmin()
    console.log('Supabase admin client created, attempting insert...')
    
    if (!supabase) {
      console.error('Failed to create Supabase admin client - SUPABASE_SERVICE_ROLE_KEY is missing!')
      return NextResponse.json({ 
        error: 'Database connection failed: SUPABASE_SERVICE_ROLE_KEY is not set. Please add it to your environment variables.',
        hint: 'This key is required for admin operations. Add it to .env.local (local) or Vercel environment variables (production).'
      }, { status: 500 })
    }

    const insertData: Record<string, unknown> = {
      title,
      description: description || null,
      start_date,
      end_date,
      max_teams: max_teams || 16,
      prize_pool: prize_pool || 0,
      entry_fee: safeEntryFee,
      status: status || 'upcoming',
      current_teams: 0
    }
    if (description_en !== undefined) insertData.description_en = description_en || null
    
    console.log('Inserting tournament with data:', insertData)
    
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Error code:', error.code)
      console.error('Error hint:', error.hint)
      return NextResponse.json({ 
        error: 'Failed to create tournament: ' + error.message,
        details: error,
        code: error.code
      }, { status: 400 })
    }

    if (!tournament) {
      console.error('No tournament returned from insert, but no error either')
      return NextResponse.json({ 
        error: 'Tournament was not created - no data returned'
      }, { status: 500 })
    }

    console.log('Tournament created successfully:', tournament)
    console.log('Tournament ID:', tournament.id)
    return NextResponse.json({ tournament })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, description, description_en, start_date, end_date, max_teams, prize_pool, entry_fee, status, check_in_open } = body

    if (!id) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 })
    }

    // Use admin client for update operations to bypass RLS
    const supabase = getSupabaseAdmin()
    
    if (!supabase) {
      console.error('Failed to create Supabase admin client - SUPABASE_SERVICE_ROLE_KEY is missing!')
      return NextResponse.json({ 
        error: 'Database connection failed: SUPABASE_SERVICE_ROLE_KEY is not set. Please add it to your environment variables.',
        hint: 'This key is required for admin operations. Add it to .env.local (local) or Vercel environment variables (production).'
      }, { status: 500 })
    }

    const updateData: any = {}
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (description_en !== undefined) updateData.description_en = description_en
    if (start_date) updateData.start_date = start_date
    if (end_date) updateData.end_date = end_date
    if (max_teams !== undefined) updateData.max_teams = max_teams
    if (prize_pool !== undefined) updateData.prize_pool = prize_pool
    if (entry_fee !== undefined) {
      const normalizedEntryFee = Number(entry_fee)
      updateData.entry_fee = Number.isFinite(normalizedEntryFee) ? normalizedEntryFee : 299
    }
    if (status) updateData.status = status
    if (check_in_open !== undefined) updateData.check_in_open = Boolean(check_in_open)

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update tournament: ' + error.message }, { status: 400 })
    }

    return NextResponse.json({ tournament })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 })
    }

    // Use admin client for delete operations to bypass RLS
    const supabase = getSupabaseAdmin()
    
    if (!supabase) {
      console.error('Failed to create Supabase admin client - SUPABASE_SERVICE_ROLE_KEY is missing!')
      return NextResponse.json({ 
        error: 'Database connection failed: SUPABASE_SERVICE_ROLE_KEY is not set. Please add it to your environment variables.',
        hint: 'This key is required for admin operations. Add it to .env.local (local) or Vercel environment variables (production).'
      }, { status: 500 })
    }

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to delete tournament: ' + error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}
