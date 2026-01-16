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

      return NextResponse.json({ tournament })
    } else {
      // Get all tournaments
      console.log('Fetching all tournaments...')
      const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Database error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return NextResponse.json({ error: 'Failed to fetch tournaments: ' + error.message }, { status: 400 })
      }

      console.log('Fetched tournaments count:', tournaments?.length || 0)
      console.log('Tournaments:', tournaments?.map((t: any) => ({ id: t.id, title: t.title })))
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

    const insertData = {
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
    const { id, title, description, start_date, end_date, max_teams, prize_pool, entry_fee, status } = body

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
    if (start_date) updateData.start_date = start_date
    if (end_date) updateData.end_date = end_date
    if (max_teams !== undefined) updateData.max_teams = max_teams
    if (prize_pool !== undefined) updateData.prize_pool = prize_pool
    if (entry_fee !== undefined) {
      const normalizedEntryFee = Number(entry_fee)
      updateData.entry_fee = Number.isFinite(normalizedEntryFee) ? normalizedEntryFee : 299
    }
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
