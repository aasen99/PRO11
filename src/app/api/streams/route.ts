import { createHash, randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  MAX_STREAMS_PER_TEAM,
  parseStreamLink,
  type StreamService,
  STREAM_SERVICES
} from '@/lib/stream-links'

function hashDeleteToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function mapStreamRow(row: any) {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    teamId: row.team_id,
    teamName: row.team_name,
    service: row.service,
    streamUrl: row.stream_url,
    displayName: row.display_name || null,
    createdAt: row.created_at
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournament_id') || searchParams.get('tournamentId')
    const teamId = searchParams.get('team_id') || searchParams.get('teamId')

    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournament_id' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    let query = supabase
      .from('team_streams')
      .select('id, tournament_id, team_id, team_name, service, stream_url, display_name, created_at')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true })

    if (teamId) {
      query = query.eq('team_id', teamId)
    }

    const { data, error } = await query
    if (error) {
      if (error.message?.includes('team_streams')) {
        return NextResponse.json({ streams: [] })
      }
      return NextResponse.json({ error: 'Failed to fetch streams: ' + error.message }, { status: 400 })
    }

    return NextResponse.json({ streams: (data || []).map(mapStreamRow) })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tournamentId = body.tournamentId || body.tournament_id
    const teamId = body.teamId || body.team_id
    const service = body.service as StreamService
    const streamUrl = body.streamUrl || body.stream_url
    const displayNameRaw = body.displayName ?? body.display_name

    if (!tournamentId || !teamId || !service || !streamUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!STREAM_SERVICES.includes(service)) {
      return NextResponse.json({ error: 'Invalid streaming service' }, { status: 400 })
    }

    const parsed = parseStreamLink(String(streamUrl), service)
    if (!parsed) {
      return NextResponse.json(
        { error: 'URL does not match the selected streaming service' },
        { status: 400 }
      )
    }

    const displayName =
      typeof displayNameRaw === 'string' && displayNameRaw.trim().length > 0
        ? displayNameRaw.trim().slice(0, 100)
        : null

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, team_name, tournament_id, status, payment_status')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (team.tournament_id !== tournamentId) {
      return NextResponse.json({ error: 'Team does not belong to this tournament' }, { status: 400 })
    }

    const isApproved = team.status === 'approved' || team.payment_status === 'completed'
    if (!isApproved) {
      return NextResponse.json({ error: 'Team is not approved for this tournament' }, { status: 400 })
    }

    const { count: teamStreamCount, error: countError } = await supabase
      .from('team_streams')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('team_id', teamId)

    if (countError) {
      return NextResponse.json({ error: 'Failed to check stream limit: ' + countError.message }, { status: 400 })
    }

    if ((teamStreamCount || 0) >= MAX_STREAMS_PER_TEAM) {
      return NextResponse.json(
        { error: `Maximum ${MAX_STREAMS_PER_TEAM} streams per team reached` },
        { status: 409 }
      )
    }

    const deleteToken = randomBytes(24).toString('base64url')
    const deleteTokenHash = hashDeleteToken(deleteToken)

    const { data: inserted, error: insertError } = await supabase
      .from('team_streams')
      .insert({
        tournament_id: tournamentId,
        team_id: teamId,
        team_name: team.team_name,
        service: parsed.service,
        stream_url: parsed.canonicalUrl,
        normalized_url: parsed.normalizedUrl,
        display_name: displayName,
        delete_token_hash: deleteTokenHash
      })
      .select('id, tournament_id, team_id, team_name, service, stream_url, display_name, created_at')
      .single()

    if (insertError) {
      if (insertError.message?.includes('idx_team_streams_tournament_normalized_url')) {
        return NextResponse.json({ error: 'This stream link is already registered' }, { status: 409 })
      }
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'This stream link is already registered' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to add stream: ' + insertError.message }, { status: 400 })
    }

    return NextResponse.json({
      stream: mapStreamRow(inserted),
      deleteToken
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}
