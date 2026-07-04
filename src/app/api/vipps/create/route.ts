import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  createVippsPayment,
  generateVippsReference,
  isVippsConfigured
} from '@/lib/vipps'
import {
  forbiddenResponse,
  getCaptainSession,
  unauthorizedResponse
} from '@/lib/session'

function resolveSiteUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
    request.nextUrl.origin
  )
}

export async function POST(request: NextRequest) {
  try {
    const captain = getCaptainSession(request)
    if (!captain) {
      return unauthorizedResponse()
    }

    if (!isVippsConfigured()) {
      return NextResponse.json({ error: 'Vipps is not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { teamId } = body

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    }

    if (captain.teamId !== teamId) {
      return forbiddenResponse()
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, team_name, payment_status, tournament_id, tournaments(entry_fee, title)')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (team.payment_status === 'completed') {
      return NextResponse.json({ error: 'Team payment is already completed' }, { status: 400 })
    }

    const tournament = Array.isArray(team.tournaments) ? team.tournaments[0] : team.tournaments
    const entryFee = Number(tournament?.entry_fee ?? 0)
    if (!Number.isFinite(entryFee) || entryFee <= 0) {
      return NextResponse.json({ error: 'This tournament does not require payment' }, { status: 400 })
    }

    const reference = generateVippsReference(teamId)
    const siteUrl = resolveSiteUrl(request)
    const returnUrl = `${siteUrl}/payment?vippsReturn=1&reference=${encodeURIComponent(reference)}&teamId=${encodeURIComponent(teamId)}`
    const tournamentTitle = String(tournament?.title || 'PRO11 turnering')
    const description = `PRO11 – ${team.team_name} – ${tournamentTitle}`

    const vippsPayment = await createVippsPayment({
      reference,
      amountNok: entryFee,
      returnUrl,
      description,
      idempotencyKey: reference
    })

    if (!vippsPayment.redirectUrl) {
      return NextResponse.json({ error: 'Vipps did not return a redirect URL' }, { status: 502 })
    }

    const { error: pendingPaymentError } = await supabase.from('payments').insert({
      team_id: teamId,
      amount: entryFee,
      currency: 'nok',
      status: 'pending',
      payment_method: 'vipps',
      payment_provider: 'vipps',
      provider_order_id: reference,
      stripe_payment_intent_id: reference,
      gross_amount: entryFee
    })

    if (pendingPaymentError) {
      console.error('Failed to store pending Vipps payment:', pendingPaymentError)
    }

    return NextResponse.json({
      success: true,
      reference,
      redirectUrl: vippsPayment.redirectUrl
    })
  } catch (error) {
    console.error('Vipps create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Vipps payment creation failed' },
      { status: 500 }
    )
  }
}
