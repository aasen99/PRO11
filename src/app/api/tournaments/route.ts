import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

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

