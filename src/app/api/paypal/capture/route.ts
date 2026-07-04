import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  amountsMatch,
  capturePayPalOrder,
  getCapturedAmount,
  getPayPalCaptureDetails
} from '@/lib/paypal'
import { buildPayPalPaymentAccountingUpdate } from '@/lib/payment-reconciliation'
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
    const { orderId, teamId } = body

    if (!orderId || !teamId) {
      return NextResponse.json({ error: 'orderId and teamId are required' }, { status: 400 })
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
      .select('id, payment_status, tournament_id, tournaments(entry_fee)')
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
    if (!Number.isFinite(entryFee) || entryFee <= 0) {
      return NextResponse.json({ error: 'This tournament does not require payment' }, { status: 400 })
    }

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, team_id')
      .eq('stripe_payment_intent_id', orderId)
      .maybeSingle()

    if (existingPayment && existingPayment.team_id !== teamId) {
      return NextResponse.json({ error: 'PayPal order already used' }, { status: 409 })
    }

    const order = await capturePayPalOrder(orderId)
    if (order.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'PayPal payment was not completed' }, { status: 400 })
    }

    const captured = getCapturedAmount(order)
    if (!captured || captured.currency !== 'NOK' || !amountsMatch(entryFee, captured.value)) {
      return NextResponse.json({ error: 'PayPal amount does not match tournament fee' }, { status: 400 })
    }

    const captureDetails = getPayPalCaptureDetails(order)
    const accountingUpdate = buildPayPalPaymentAccountingUpdate(order, entryFee)
    const paidAt = new Date().toISOString()
    const paymentPayload = {
      status: 'completed',
      amount: entryFee,
      gross_amount: accountingUpdate.gross_amount ?? captureDetails.grossAmount ?? entryFee,
      fee_amount: accountingUpdate.fee_amount,
      net_amount: accountingUpdate.net_amount,
      payment_method: 'paypal',
      payment_provider: 'paypal',
      provider_order_id: accountingUpdate.provider_order_id ?? captureDetails.orderId,
      provider_transaction_id: accountingUpdate.provider_transaction_id ?? captureDetails.captureId,
      stripe_payment_intent_id: orderId,
      paid_at: paidAt,
      fee_source: accountingUpdate.fee_source,
      reconciled: accountingUpdate.reconciled,
      reconciled_at: accountingUpdate.reconciled_at
    }

    let paymentId = existingPayment?.id as string | undefined

    if (!paymentId) {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          team_id: teamId,
          currency: 'nok',
          ...paymentPayload
        })
        .select('id')
        .single()

      if (paymentError) {
        return NextResponse.json({ error: paymentError.message }, { status: 400 })
      }
      paymentId = payment.id as string
    } else {
      const { error: paymentError } = await supabase
        .from('payments')
        .update(paymentPayload)
        .eq('id', paymentId)

      if (paymentError) {
        return NextResponse.json({ error: paymentError.message }, { status: 400 })
      }
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

    return NextResponse.json({
      success: true,
      paymentId,
      orderId: order.id
    })
  } catch (error) {
    console.error('PayPal capture error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PayPal capture failed' },
      { status: 500 }
    )
  }
}
