import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const supabase = getSupabase()

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

      return NextResponse.json({ tournament })
    } else {
      // Get all tournaments
      const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Failed to fetch tournaments: ' + error.message }, { status: 400 })
      }

      return NextResponse.json({ tournaments: tournaments || [] })
    }

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, start_date, end_date, max_teams, prize_pool, entry_fee, status } = body

    console.log('POST /api/tournaments - Received data:', body)
    console.log('Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    })

    if (!title || !start_date || !end_date) {
      console.error('Missing required fields:', { title, start_date, end_date })
      return NextResponse.json({ error: 'Title, start_date, and end_date are required' }, { status: 400 })
    }

    // Use admin client for insert/update/delete operations to bypass RLS
    const supabase = getSupabaseAdmin()
    console.log('Supabase admin client created, attempting insert...')
    
    if (!supabase) {
      console.error('Failed to create Supabase admin client')
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        title,
        description: description || null,
        start_date,
        end_date,
        max_teams: max_teams || 16,
        prize_pool: prize_pool || 0,
        entry_fee: entry_fee || 299,
        status: status || 'upcoming',
        current_teams: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Failed to create tournament: ' + error.message,
        details: error
      }, { status: 400 })
    }

    console.log('Tournament created successfully:', tournament)
    return NextResponse.json({ tournament })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, description, start_date, end_date, max_teams, prize_pool, entry_fee, status } = body

    if (!id) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 })
    }

    // Use admin client for update operations to bypass RLS
    const supabase = getSupabaseAdmin()

    const updateData: any = {}
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (start_date) updateData.start_date = start_date
    if (end_date) updateData.end_date = end_date
    if (max_teams !== undefined) updateData.max_teams = max_teams
    if (prize_pool !== undefined) updateData.prize_pool = prize_pool
    if (entry_fee !== undefined) updateData.entry_fee = entry_fee
    if (status) updateData.status = status

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
