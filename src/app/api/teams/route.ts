import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { generatePassword } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamName, captainName, captainEmail, captainPhone, expectedPlayers, tournamentId } = body

    // Generate password for captain
    const password = generatePassword()

    // Insert team into database
    const supabase = getSupabase()
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        tournament_id: tournamentId,
        team_name: teamName,
        captain_name: captainName,
        captain_email: captainEmail,
        captain_phone: captainPhone,
        expected_players: expectedPlayers,
        status: 'pending',
        payment_status: 'pending',
        generated_password: password
      })
      .select()
      .single()

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      team,
      password 
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId')

    const supabase = getSupabase()
    let query = supabase.from('teams').select('*')
    
    if (tournamentId) {
      query = query.eq('tournament_id', tournamentId)
    }

    const { data: teams, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ teams })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 