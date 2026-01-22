import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournament_id')
    const status = searchParams.get('status')

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    let query = supabase
      .from('captain_messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (tournamentId) {
      query = query.eq('tournament_id', tournamentId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch messages: ' + error.message }, { status: 400 })
    }

    return NextResponse.json({ messages: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tournamentId, teamId, teamName, captainName, captainEmail, message } = body

    if (!teamId || !teamName || !captainName || !captainEmail || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('captain_messages')
      .insert({
        tournament_id: tournamentId || null,
        team_id: teamId,
        team_name: teamName,
        captain_name: captainName,
        captain_email: captainEmail,
        message: String(message).trim(),
        status: 'open'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create message: ' + error.message }, { status: 400 })
    }

    return NextResponse.json({ message: data })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, readAt } = body

    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (readAt !== undefined) updateData.read_at = readAt
    if (readAt === null) updateData.read_at = null

    const { data, error } = await supabase
      .from('captain_messages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update message: ' + error.message }, { status: 400 })
    }

    return NextResponse.json({ message: data })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

