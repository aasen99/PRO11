import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'
import { isUnauthorized, requireAdmin } from '@/lib/session'
import {
  buildDemoDescription,
  buildDemoDescriptionEn,
  DEMO_PASSWORD,
  getDemoCaptainEmail,
  isDemoTournament,
  pickDemoTeamNames
} from '@/lib/demo-tournament'
import { generateMatchesForTeams } from '@/lib/match-generation'

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (isUnauthorized(admin)) return admin

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('id, title, description, start_date, end_date, status, current_teams, max_teams, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const demos = (tournaments || []).filter((t) =>
      isDemoTournament({ title: String(t.title || ''), description: String(t.description || '') })
    )
    return NextResponse.json({ demos })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (isUnauthorized(admin)) return admin

    const body = await request.json()
    const teamCount = Number(body.teamCount ?? 8)
    const numGroups = Number(body.numGroups ?? 2)
    const teamsToKnockout = Number(body.teamsToKnockout ?? 2)
    const generateMatches = body.generateMatches !== false
    const format = (body.format as 'group_stage' | 'knockout' | 'mixed' | undefined) || 'mixed'

    if (!Number.isFinite(teamCount) || teamCount < 2 || teamCount > 24) {
      return NextResponse.json({ error: 'Antall lag må være mellom 2 og 24.' }, { status: 400 })
    }
    if (!Number.isFinite(numGroups) || numGroups < 1 || numGroups > 8) {
      return NextResponse.json({ error: 'Antall grupper må være mellom 1 og 8.' }, { status: 400 })
    }
    if (teamCount < numGroups * 2) {
      return NextResponse.json({ error: 'Det må være minst 2 lag per gruppe.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const now = new Date()
    const startDate = new Date(now.getTime() - 60_000)
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const label = now.toLocaleString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    const teamNames = pickDemoTeamNames(teamCount)
    const { matches, formatText } = generateMatches
      ? generateMatchesForTeams(teamNames, {
          numGroups,
          teamsToKnockout,
          format
        })
      : { matches: [], formatText: '' }

    const formatBlock = formatText ? `\n[FORMAT]\n${formatText}\n[/FORMAT]` : ''
    const description = buildDemoDescription(formatBlock)
    const descriptionEn = buildDemoDescriptionEn(formatBlock)

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        title: `DEMO – Testturnering ${label}`,
        description,
        description_en: descriptionEn,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        max_teams: teamCount,
        current_teams: teamCount,
        prize_pool: 0,
        entry_fee: 0,
        status: 'active',
        check_in_open: true
      })
      .select()
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: tournamentError?.message || 'Kunne ikke opprette demo-turnering' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(DEMO_PASSWORD)
    const teamsPayload = teamNames.map((name, index) => ({
      tournament_id: tournament.id,
      team_name: name,
      captain_name: `Demo Kaptein ${index + 1}`,
      captain_email: getDemoCaptainEmail(index),
      captain_phone: null,
      discord_username: `demo${index + 1}`,
      expected_players: 11,
      status: 'approved',
      payment_status: 'completed',
      checked_in: true,
      generated_password: passwordHash
    }))

    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .insert(teamsPayload)
      .select('id, team_name, captain_email')

    if (teamsError) {
      await supabase.from('tournaments').delete().eq('id', String(tournament.id))
      return NextResponse.json({ error: 'Kunne ikke opprette demo-lag: ' + teamsError.message }, { status: 400 })
    }

    if (teams?.length) {
      const playersPayload = teams.map((team, index) => ({
        team_id: team.id,
        name: `Demo Kaptein ${index + 1}`,
        psn_id: `demo${index + 1}`,
        position: 'ST'
      }))
      const { error: playersError } = await supabase.from('players').insert(playersPayload)
      if (playersError) {
        console.warn('Demo players insert failed:', playersError.message)
      }
    }

    let createdMatches = 0
    if (matches.length > 0) {
      const matchesPayload = matches.map(match => ({
        tournament_id: tournament.id,
        team1_name: match.team1,
        team2_name: match.team2,
        round: match.round,
        group_name: match.group || null,
        group_round: match.groupRound ?? null,
        status: 'scheduled'
      }))

      const { data: insertedMatches, error: matchesError } = await supabase
        .from('matches')
        .insert(matchesPayload)
        .select('id')

      if (matchesError) {
        console.warn('Demo matches insert failed:', matchesError.message)
      } else {
        createdMatches = insertedMatches?.length || 0
      }
    }

    return NextResponse.json({
      tournament,
      teams: teams || [],
      matchCount: createdMatches,
      credentials: {
        password: DEMO_PASSWORD,
        emails: teamNames.map((_, index) => getDemoCaptainEmail(index))
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (isUnauthorized(admin)) return admin

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data: tournament, error: fetchError } = await supabase
      .from('tournaments')
      .select('id, title, description')
      .eq('id', id)
      .single()

    if (fetchError || !tournament) {
      return NextResponse.json({ error: 'Turnering ikke funnet' }, { status: 404 })
    }

    if (!isDemoTournament({ title: String(tournament.title || ''), description: String(tournament.description || '') })) {
      return NextResponse.json(
        { error: 'Kun demo-turneringer kan slettes via denne endepunktet.' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase.from('tournaments').delete().eq('id', id)
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
