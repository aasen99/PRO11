import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabase } from '@/lib/supabase'
import { comparePassword } from '@/lib/password'
import { checkRateLimit, getClientIdentifier, recordFailedAttempt } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIdentifier(request)
    const { allowed, retryAfter } = checkRateLimit(ip, 'captain')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined }
      )
    }

    const body = await request.json()
    const { email, password } = body
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin() || getSupabase()
    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, team_name, captain_name, captain_email, captain_phone, discord_username, tournament_id, created_at, checked_in, expected_players, status, payment_status')
      .ilike('captain_email', normalizedEmail)
      .order('created_at', { ascending: false })

    if (error || !teams?.length) {
      recordFailedAttempt(ip, 'captain')
      return NextResponse.json(
        { error: 'Incorrect email or password. Please try again.' },
        { status: 401 }
      )
    }

    const { data: withPassword } = await supabase
      .from('teams')
      .select('id, generated_password')
      .eq('id', teams[0].id)
      .single()

    const stored = withPassword?.generated_password
    const match = await comparePassword(String(password), stored)
    if (!match) {
      recordFailedAttempt(ip, 'captain')
      return NextResponse.json(
        { error: 'Incorrect email or password. Please try again.' },
        { status: 401 }
      )
    }

    const tournamentIds = Array.from(
      new Set(
        teams
          .map((t: any) => t.tournament_id)
          .filter(Boolean)
      )
    )
    const teamData = {
      id: teams[0].id,
      teamName: teams[0].team_name,
      team_name: teams[0].team_name,
      captainName: teams[0].captain_name,
      captain_name: teams[0].captain_name,
      captainEmail: teams[0].captain_email,
      captain_email: teams[0].captain_email,
      captainPhone: teams[0].captain_phone || '',
      captain_phone: teams[0].captain_phone || '',
      discordUsername: teams[0].discord_username || '',
      discord_username: teams[0].discord_username || '',
      tournaments: tournamentIds,
      tournamentId: teams[0].tournament_id || (tournamentIds[0] ?? ''),
      expectedPlayers: teams[0].expected_players ?? 0,
      expected_players: teams[0].expected_players ?? 0,
      paymentStatus: teams[0].payment_status || 'pending',
      payment_status: teams[0].payment_status || 'pending',
      created_at: teams[0].created_at
    }

    return NextResponse.json({ success: true, team: teamData })
  } catch (err: any) {
    console.error('Captain login error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
