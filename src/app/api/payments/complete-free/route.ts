import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  getCaptainSession,
  unauthorizedResponse,
  forbiddenResponse
} from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const captain = getCaptainSession(request)
    if (!captain) {
      return unauthorizedResponse()
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
      .select('id, payment_status, tournaments(entry_fee)')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (team.payment_status === 'completed') {
      return NextResponse.json({ success: true, alreadyCompleted: true })
    }

    const tournament = Array.isArray(team.tournaments) ? team.tournaments[0] : team.tournaments
    const entryFee = Number(tournament?.entry_fee ?? 0)
    if (entryFee > 0) {
      return NextResponse.json({ error: 'This tournament requires payment' }, { status: 400 })
    }

    const paidAt = new Date().toISOString()

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        team_id: teamId,
        amount: 0,
        gross_amount: 0,
        fee_amount: 0,
        net_amount: 0,
        currency: 'nok',
        status: 'completed',
        payment_method: 'free',
        payment_provider: null,
        paid_at: paidAt,
        fee_source: null,
        reconciled: true,
        reconciled_at: paidAt
      })
      .select('id')
      .single()

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 400 })
    }

    const { error: teamUpdateError } = await supabase
      .from('teams')
      .update({
        payment_status: 'completed',
        status: 'approved'
      })
      .eq('id', teamId)

    if (teamUpdateError) {
      return NextResponse.json({ error: teamUpdateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, paymentId: payment.id })
  } catch (error) {
    console.error('Free registration error:', error)
    return NextResponse.json({ error: 'Could not complete free registration' }, { status: 500 })
  }
}
