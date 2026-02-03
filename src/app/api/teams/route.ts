import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase'
import { generatePassword } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamName, captainName, captainEmail, captainPhone, expectedPlayers, tournamentId, discordUsername, reusePassword } = body

    console.log('Team registration request:', body)

    // Use admin client for insert operations to bypass RLS
    const supabase = getSupabaseAdmin() || getSupabase()

    // First, find the tournament by title or get the first tournament if tournamentId is not a UUID
    let tournamentUuid: string | null = null
    
    if (tournamentId) {
      // Check if tournamentId is already a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(tournamentId)) {
        tournamentUuid = tournamentId
      } else {
        // Try to find tournament by title (for backward compatibility)
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('id')
          .limit(1)
        
        if (tournaments && tournaments.length > 0) {
          tournamentUuid = tournaments[0].id
        }
      }
    } else {
      // Get the first tournament if no ID provided
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id')
        .limit(1)
      
      if (tournaments && tournaments.length > 0) {
        tournamentUuid = tournaments[0].id
      }
    }

    if (!tournamentUuid) {
      return NextResponse.json({ 
        error: 'No tournament found. Please set up tournaments in the database first.' 
      }, { status: 400 })
    }

    const normalizedTeamName = typeof teamName === 'string'
      ? teamName.trim().replace(/\\s+/g, ' ')
      : teamName
    const normalizedCaptainEmail = typeof captainEmail === 'string'
      ? captainEmail.trim().toLowerCase()
      : ''

    if (!normalizedTeamName) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    // Check for duplicate team name or captain email in the same tournament
    const { data: existingTeams, error: existingError } = await supabase
      .from('teams')
      .select('team_name, captain_email')
      .eq('tournament_id', tournamentUuid)

    if (existingError) {
      console.error('Error checking existing teams:', existingError)
      return NextResponse.json({ error: 'Failed to validate team name' }, { status: 400 })
    }

    const normalizedLower = normalizedTeamName.toLowerCase()
    const hasDuplicate = (existingTeams || []).some((team: any) => {
      const existingName = typeof team.team_name === 'string'
        ? team.team_name.trim().replace(/\\s+/g, ' ').toLowerCase()
        : ''
      const existingEmail = typeof team.captain_email === 'string'
        ? team.captain_email.trim().toLowerCase()
        : ''
      return existingName === normalizedLower || (normalizedCaptainEmail && existingEmail === normalizedCaptainEmail)
    })

    if (hasDuplicate) {
      const duplicateEmail = (existingTeams || []).some((team: any) => {
        const existingEmail = typeof team.captain_email === 'string'
          ? team.captain_email.trim().toLowerCase()
          : ''
        return normalizedCaptainEmail && existingEmail === normalizedCaptainEmail
      })
      return NextResponse.json({
        error: duplicateEmail
          ? 'Dette laget er allerede påmeldt turneringen (samme e-post).'
          : 'Et lag med dette navnet er allerede registrert i turneringen.'
      }, { status: 400 })
    }

    // Generate password for captain (reuse when possible)
    let password = typeof reusePassword === 'string' && reusePassword.trim()
      ? reusePassword.trim()
      : ''

    if (!password && typeof captainEmail === 'string' && captainEmail.trim()) {
      const { data: previousTeams } = await supabase
        .from('teams')
        .select('generated_password')
        .eq('captain_email', captainEmail.trim())
        .order('created_at', { ascending: false })
        .limit(1)

      const previousPassword = previousTeams?.[0]?.generated_password
      if (previousPassword) {
        password = previousPassword
      }
    }

    if (!password) {
      password = generatePassword()
    }

    // Insert team into database
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        tournament_id: tournamentUuid,
        team_name: normalizedTeamName,
        captain_name: captainName,
        captain_email: captainEmail,
        captain_phone: captainPhone || null,
        discord_username: discordUsername || null,
        // checked_in column not guaranteed in older schemas
        expected_players: expectedPlayers,
        status: 'pending',
        payment_status: 'pending',
        generated_password: password
      })
      .select()
      .single()

    if (teamError) {
      console.error('Database error:', teamError)
      return NextResponse.json({ 
        error: 'Failed to register team: ' + teamError.message 
      }, { status: 400 })
    }

    // Create player record for captain
    if (team) {
      await supabase
        .from('players')
        .insert({
          team_id: team.id,
          name: captainName,
          psn_id: captainEmail.split('@')[0],
          position: 'ST'
        })
    }

    // Update tournament current_teams count
    try {
      const rpcResult = await supabase.rpc('increment_tournament_teams', { tournament_uuid: tournamentUuid })
      if (rpcResult.error) {
        throw rpcResult.error
      }
    } catch (rpcError) {
      // If RPC doesn't exist or fails, manually update
      console.warn('RPC failed, using manual update:', rpcError)
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('current_teams')
        .eq('id', tournamentUuid)
        .single()
      
      if (tournament) {
        await supabase
          .from('tournaments')
          .update({ current_teams: (tournament.current_teams || 0) + 1 })
          .eq('id', tournamentUuid)
      }
    }

    // Return team data in both formats for compatibility
    const teamData = {
      id: team.id,
      tournamentId: tournamentUuid,
      tournament_id: tournamentUuid,
      teamName: team.team_name,
      team_name: team.team_name,
      captainName: team.captain_name,
      captain_name: team.captain_name,
      captainEmail: team.captain_email,
      captain_email: team.captain_email,
      captainPhone: team.captain_phone || '',
      captain_phone: team.captain_phone || '',
      discordUsername: team.discord_username || '',
      discord_username: team.discord_username || '',
      checkedIn: typeof team.checked_in === 'boolean' ? team.checked_in : false,
      checked_in: typeof team.checked_in === 'boolean' ? team.checked_in : false,
      expectedPlayers: team.expected_players,
      expected_players: team.expected_players,
      status: team.status,
      paymentStatus: team.payment_status,
      payment_status: team.payment_status,
      generatedPassword: team.generated_password,
      generated_password: team.generated_password,
      created_at: team.created_at
    }
    
    console.log('Team registered successfully:', teamData)
    
    return NextResponse.json({ 
      success: true, 
      team: teamData,
      password 
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId')

    // Use admin client to ensure we can read all teams
    const supabase = getSupabaseAdmin() || getSupabase()

    let query = supabase
      .from('teams')
      .select('*, tournaments(*)')

    if (tournamentId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(tournamentId)) {
        query = query.eq('tournament_id', tournamentId)
      } else {
        // Try to find by tournament title (for backward compatibility)
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('id')
          .limit(1)
        
        if (tournaments && tournaments.length > 0) {
          query = query.eq('tournament_id', tournaments[0].id)
        }
      }
    }

    const { data: teams, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch teams: ' + error.message }, { status: 400 })
    }

    // Transform to include both formats for compatibility
    const transformedTeams = (teams || []).map((team: any) => ({
      id: team.id,
      tournamentId: team.tournament_id,
      tournament_id: team.tournament_id,
      teamName: team.team_name,
      team_name: team.team_name,
      captainName: team.captain_name,
      captain_name: team.captain_name,
      captainEmail: team.captain_email,
      captain_email: team.captain_email,
      captainPhone: team.captain_phone || '',
      captain_phone: team.captain_phone || '',
      discordUsername: team.discord_username || '',
      discord_username: team.discord_username || '',
      checkedIn: team.checked_in ?? false,
      checked_in: team.checked_in ?? false,
      expectedPlayers: team.expected_players,
      expected_players: team.expected_players,
      status: team.status,
      paymentStatus: team.payment_status,
      payment_status: team.payment_status,
      generatedPassword: team.generated_password,
      generated_password: team.generated_password,
      created_at: team.created_at,
      tournament: team.tournaments
    }))

    return NextResponse.json({ teams: transformedTeams })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, discordUsername, checkedIn } = body

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (discordUsername !== undefined) updateData.discord_username = discordUsername || null
    if (checkedIn !== undefined) updateData.checked_in = Boolean(checkedIn)

    let team: any = null
    let error: any = null

    const updateRequest = async (data: any) => {
      if (Object.keys(data).length === 0) {
        const result = await supabase
          .from('teams')
          .select()
          .eq('id', id)
          .single()
        team = result.data
        error = result.error
        return
      }

      const result = await supabase
        .from('teams')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      team = result.data
      error = result.error
    }

    await updateRequest(updateData)

    if (error && typeof error.message === 'string' && error.message.includes('checked_in')) {
      return NextResponse.json({
        error: 'Database mangler checked_in-kolonnen. Kjør migrering: ALTER TABLE teams ADD COLUMN checked_in boolean NOT NULL DEFAULT false;'
      }, { status: 400 })
    }

    if (error && typeof error.message === 'string' && error.message.includes('cannot coerce the result to a single JSON object')) {
      const result = await supabase
        .from('teams')
        .select()
        .eq('id', id)
        .single()
      team = result.data
      error = result.error
    }

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update team: ' + error.message }, { status: 400 })
    }

    // Return team data in both formats for compatibility
    const teamData = {
      id: team.id,
      tournamentId: team.tournament_id,
      tournament_id: team.tournament_id,
      teamName: team.team_name,
      team_name: team.team_name,
      captainName: team.captain_name,
      captain_name: team.captain_name,
      captainEmail: team.captain_email,
      captain_email: team.captain_email,
      discordUsername: team.discord_username || '',
      discord_username: team.discord_username || '',
      checkedIn: team.checked_in ?? false,
      checked_in: team.checked_in ?? false,
      status: team.status,
      paymentStatus: team.payment_status,
      payment_status: team.payment_status
    }

    return NextResponse.json({ success: true, team: teamData })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
} 