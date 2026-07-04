import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase'
import { generatePassword } from '@/lib/utils'
import { validatePassword, hashPassword, comparePassword } from '@/lib/password'
import {
  getAdminSession,
  getCaptainSession,
  unauthorizedResponse,
  setCaptainSessionCookie
} from '@/lib/session'
import { isDemoTournament } from '@/lib/demo-tournament'
import { isTeamTournamentWinner, type MatchForWinner } from '@/lib/tournament-winner'
import {
  normalizeIban,
  normalizeNorwegianBankAccount,
  tournamentHasConfiguredPrize,
  type PrizePayoutInput,
  validatePrizePayoutInput
} from '@/lib/prize-payout'
import { normalizeCaptainName, validateCaptainFullName } from '@/lib/captain-name'

function mapPrizePayoutFields(team: any) {
  return {
    prizePayoutType: team.prize_payout_type || null,
    prize_payout_type: team.prize_payout_type || null,
    prizeBankAccount: team.prize_bank_account || null,
    prize_bank_account: team.prize_bank_account || null,
    prizeIban: team.prize_iban || null,
    prize_iban: team.prize_iban || null,
    prizeSwiftBic: team.prize_swift_bic || null,
    prize_swift_bic: team.prize_swift_bic || null,
    prizeAccountHolder: team.prize_account_holder || null,
    prize_account_holder: team.prize_account_holder || null,
    prizePayoutSubmittedAt: team.prize_payout_submitted_at || null,
    prize_payout_submitted_at: team.prize_payout_submitted_at || null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamName, captainName, captainEmail, captainPhone, expectedPlayers, tournamentId, discordUsername, reusePassword, password: userPassword } = body

    console.log('Team registration request:', body)

    // Use admin client for insert operations to bypass RLS
    const supabase = getSupabaseAdmin() || getSupabase()

    // Optional: create team without tournament (standalone). Otherwise require a tournament.
    let tournamentUuid: string | null = null
    const createWithoutTournament = tournamentId === undefined || tournamentId === null || tournamentId === ''

    if (!createWithoutTournament && tournamentId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(tournamentId)) {
        tournamentUuid = tournamentId
      } else {
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('id')
          .limit(1)
        if (tournaments && tournaments.length > 0) {
          tournamentUuid = tournaments[0].id
        }
      }
    }

    if (!createWithoutTournament && !tournamentUuid) {
      return NextResponse.json({
        error: 'No tournament found. Please set up tournaments in the database first.'
      }, { status: 400 })
    }

    let isFreeTournament = true
    if (tournamentUuid) {
      const { data: tournamentMeta, error: tournamentMetaError } = await supabase
        .from('tournaments')
        .select('title, description, entry_fee')
        .eq('id', tournamentUuid)
        .single()
      if (tournamentMetaError) {
        return NextResponse.json({ error: 'Failed to read tournament settings.' }, { status: 400 })
      }
      if (isDemoTournament(tournamentMeta) && !getAdminSession(request)) {
        return NextResponse.json(
          { error: 'Demo-turneringer tar ikke imot offentlig påmelding.' },
          { status: 403 }
        )
      }
      const entryFee = Number(tournamentMeta?.entry_fee ?? 0)
      isFreeTournament = Number.isFinite(entryFee) && entryFee <= 0
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

    const captainValidation = validateCaptainFullName(String(captainName || ''))
    if (!captainValidation.valid) {
      return NextResponse.json({ error: captainValidation.error || 'Invalid captain name' }, { status: 400 })
    }
    const normalizedCaptainName = captainValidation.fullName || normalizeCaptainName(String(captainName || ''))

    // Duplicate check: same tournament (or among standalone teams if no tournament)
    const existingQuery = supabase
      .from('teams')
      .select('team_name, captain_email')
    if (createWithoutTournament) {
      existingQuery.is('tournament_id', null)
    } else {
      existingQuery.eq('tournament_id', tournamentUuid)
    }
    const { data: existingTeams, error: existingError } = await existingQuery

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
          ? (createWithoutTournament ? 'Et lag med denne e-posten finnes allerede.' : 'Dette laget er allerede påmeldt turneringen (samme e-post).')
          : (createWithoutTournament ? 'Et lag med dette navnet finnes allerede.' : 'Et lag med dette navnet er allerede registrert i turneringen.')
      }, { status: 400 })
    }

    // Password: user-provided (validated & hashed), reuse hash for same email, or generated
    let passwordToStore: string
    let plainPasswordForResponse: string | undefined
    if (typeof userPassword === 'string' && userPassword.trim()) {
      const validation = validatePassword(userPassword.trim())
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error || 'Invalid password' }, { status: 400 })
      }
      passwordToStore = await hashPassword(userPassword.trim())
    } else if (typeof reusePassword === 'string' && reusePassword.trim() && normalizedCaptainEmail) {
      const reusePlain = reusePassword.trim()
      const { data: prevTeam } = await supabase
        .from('teams')
        .select('generated_password')
        .ilike('captain_email', normalizedCaptainEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      const previousHash = prevTeam?.generated_password
      if (previousHash && (previousHash.startsWith('$2a$') || previousHash.startsWith('$2b$') || previousHash.startsWith('$2y$'))) {
        const { comparePassword } = await import('@/lib/password')
        const match = await comparePassword(reusePlain, previousHash)
        if (!match) {
          return NextResponse.json({ error: 'Invalid password for this captain email.' }, { status: 400 })
        }
        passwordToStore = previousHash
      } else if (previousHash) {
        if (previousHash !== reusePlain) {
          return NextResponse.json({ error: 'Invalid password for this captain email.' }, { status: 400 })
        }
        passwordToStore = await hashPassword(reusePlain)
      } else {
        passwordToStore = await hashPassword(reusePlain)
      }
    } else if (typeof captainEmail === 'string' && captainEmail.trim()) {
      const { data: previousTeams } = await supabase
        .from('teams')
        .select('generated_password')
        .eq('captain_email', captainEmail.trim())
        .order('created_at', { ascending: false })
        .limit(1)
      const previousStored = previousTeams?.[0]?.generated_password
      if (previousStored) {
        passwordToStore = previousStored
      } else {
        plainPasswordForResponse = generatePassword()
        passwordToStore = await hashPassword(plainPasswordForResponse)
      }
    } else {
      plainPasswordForResponse = generatePassword()
      passwordToStore = await hashPassword(plainPasswordForResponse)
    }

    const status = createWithoutTournament ? 'approved' : (isFreeTournament ? 'approved' : 'pending')
    const paymentStatus = createWithoutTournament ? 'completed' : (isFreeTournament ? 'completed' : 'pending')

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        tournament_id: tournamentUuid || null,
        team_name: normalizedTeamName,
        captain_name: normalizedCaptainName,
        captain_email: captainEmail,
        captain_phone: captainPhone || null,
        discord_username: discordUsername || null,
        expected_players: expectedPlayers,
        status,
        payment_status: paymentStatus,
        generated_password: passwordToStore
      })
      .select()
      .single()

    if (teamError) {
      console.error('Database error:', teamError)
      return NextResponse.json({
        error: 'Failed to register team: ' + teamError.message
      }, { status: 400 })
    }

    if (team) {
      await supabase
        .from('players')
        .insert({
          team_id: team.id,
          name: normalizedCaptainName,
          psn_id: (captainEmail || '').split('@')[0],
          position: 'ST'
        })
    }

    if (tournamentUuid) {
      try {
        const rpcResult = await supabase.rpc('increment_tournament_teams', { tournament_uuid: tournamentUuid })
        if (rpcResult.error) throw rpcResult.error
      } catch (rpcError) {
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
    }

    const teamData = {
      id: team.id,
      tournamentId: team.tournament_id ?? tournamentUuid ?? null,
      tournament_id: team.tournament_id ?? tournamentUuid ?? null,
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
      created_at: team.created_at
    }

    // Return plain password only when we generated it (e.g. admin); never when user chose it
    const returnPassword = plainPasswordForResponse ?? undefined

    console.log('Team registered successfully:', teamData.id)

    const response = NextResponse.json({
      success: true,
      team: teamData,
      ...(returnPassword != null && returnPassword !== '' && { password: returnPassword })
    })

    setCaptainSessionCookie(response, {
      teamId: teamData.id,
      teamName: teamData.teamName,
      captainEmail: teamData.captainEmail
    })

    return response

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId') || searchParams.get('tournament_id')

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

    // Transform; do not expose password hash to client
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
      created_at: team.created_at,
      tournament: team.tournaments,
      ...mapPrizePayoutFields(team)
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
    const { id, status, discordUsername, checkedIn, currentPassword, newPassword, prizePayout, captainName } = body

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    const admin = getAdminSession(request)
    const captain = getCaptainSession(request)

    if (status) {
      if (!admin) return unauthorizedResponse()
    } else if (checkedIn !== undefined) {
      if (checkedIn === true) {
        if (!captain || captain.teamId !== id) {
          if (!admin) return unauthorizedResponse()
        }
      } else if (!admin) {
        return unauthorizedResponse()
      }
    } else if (discordUsername !== undefined || captainName !== undefined || (currentPassword && newPassword)) {
      if (!captain || captain.teamId !== id) {
        if (!admin) return unauthorizedResponse()
      }
    } else if (prizePayout === undefined && !admin) {
      return unauthorizedResponse()
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (discordUsername !== undefined) updateData.discord_username = discordUsername || null
    if (checkedIn !== undefined) updateData.checked_in = Boolean(checkedIn)

    if (captainName !== undefined) {
      const captainValidation = validateCaptainFullName(String(captainName))
      if (!captainValidation.valid) {
        return NextResponse.json({ error: captainValidation.error || 'Invalid captain name' }, { status: 400 })
      }
      updateData.captain_name = captainValidation.fullName || normalizeCaptainName(String(captainName))
    }

    if (prizePayout !== undefined) {
      const { data: existingTeam, error: existingTeamError } = await supabase
        .from('teams')
        .select('id, team_name, captain_email, tournament_id, prize_payout_submitted_at')
        .eq('id', id)
        .single()

      if (existingTeamError || !existingTeam) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }

      if (
        !admin &&
        (!captain ||
          captain.captainEmail.toLowerCase() !== String(existingTeam.captain_email || '').toLowerCase())
      ) {
        return unauthorizedResponse()
      }

      const tournamentId = String(existingTeam.tournament_id || '')
      if (!tournamentId) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
      }

      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('id, prize_pool, entry_fee, description, current_teams')
        .eq('id', tournamentId)
        .single()

      if (tournamentError || !tournament) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
      }

      const { data: teamsForTournament } = await supabase
        .from('teams')
        .select('status, payment_status')
        .eq('tournament_id', tournamentId)

      const eligibleTeams = (teamsForTournament || []).filter((team: any) =>
        team.status === 'approved' || team.payment_status === 'completed'
      ).length

      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('team1_name, team2_name, round, status, score1, score2')
        .eq('tournament_id', tournamentId)

      if (matchesError) {
        return NextResponse.json({ error: 'Could not verify tournament winner' }, { status: 400 })
      }

      if (!isTeamTournamentWinner(String(existingTeam.team_name || ''), (matches || []) as MatchForWinner[])) {
        return NextResponse.json({ error: 'Only the tournament winner can submit prize payout details.' }, { status: 403 })
      }

      const prizeParams = {
        prizePool: tournament.prize_pool as number | null,
        entryFee: tournament.entry_fee as number | null,
        description: tournament.description as string | null,
        eligibleTeams,
        currentTeams: tournament.current_teams as number | null
      }

      if (!tournamentHasConfiguredPrize(prizeParams)) {
        return NextResponse.json({ error: 'This tournament has no prize payout.' }, { status: 400 })
      }

      const payoutInput = prizePayout as PrizePayoutInput
      const validation = validatePrizePayoutInput(payoutInput, false)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error || 'Invalid payout information' }, { status: 400 })
      }

      updateData.prize_payout_type = payoutInput.type
      updateData.prize_payout_submitted_at = new Date().toISOString()

      if (payoutInput.type === 'norwegian') {
        updateData.prize_bank_account = normalizeNorwegianBankAccount(payoutInput.bankAccount || '')
        updateData.prize_iban = null
        updateData.prize_swift_bic = null
        updateData.prize_account_holder = null
      } else {
        updateData.prize_bank_account = null
        updateData.prize_iban = normalizeIban(payoutInput.iban || '')
        updateData.prize_swift_bic = (payoutInput.swiftBic || '').replace(/\s/g, '').toUpperCase()
        updateData.prize_account_holder = (payoutInput.accountHolder || '').trim()
      }
    }

    if (typeof currentPassword === 'string' && typeof newPassword === 'string') {
      const { data: teamRow } = await supabase
        .from('teams')
        .select('generated_password')
        .eq('id', id)
        .single()
      const stored = (teamRow?.generated_password ?? null) as string | null
      const match = await comparePassword(currentPassword, stored)
      if (!match) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
      }
      const validation = validatePassword(newPassword.trim())
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error || 'Invalid new password' }, { status: 400 })
      }
      updateData.generated_password = await hashPassword(newPassword.trim())
    }

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

    if (error && typeof error.message === 'string' && error.message.includes('prize_')) {
      return NextResponse.json({
        error: 'Database mangler premie-felt. Kjør migrering: ADD_PRIZE_PAYOUT_FIELDS.sql'
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
      payment_status: team.payment_status,
      ...mapPrizePayoutFields(team)
    }

    return NextResponse.json({ success: true, team: teamData })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 })
  }
} 