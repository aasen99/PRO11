import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isUnauthorized, requireAdmin } from '@/lib/session'
import {
  isPayPalPayment,
  paymentNeedsPayPalReconciliation,
  reconcilePayPalPayment,
  reconcilePayPalPayments
} from '@/lib/payment-reconciliation'
import type { PaymentRow } from '@/lib/payment-types'

export async function POST(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (isUnauthorized(admin)) return admin

    const body = await request.json().catch(() => ({}))
    const tournamentId = typeof body.tournamentId === 'string' ? body.tournamentId : null
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId : null
    const force = Boolean(body.force)

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    if (paymentId) {
      const { data: payment, error } = await supabase
        .from('payments')
        .select(
          'id, team_id, amount, gross_amount, payment_method, payment_provider, provider_order_id, provider_transaction_id, stripe_payment_intent_id, fee_amount, fee_source, reconciled'
        )
        .eq('id', paymentId)
        .maybeSingle()

      if (error || !payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
      }

      const paymentRow = payment as PaymentRow
      const { data: team } = await supabase
        .from('teams')
        .select('team_name, payment_status, tournament_id, tournaments(entry_fee)')
        .eq('id', String(paymentRow.team_id))
        .maybeSingle()

      if (team?.payment_status !== 'completed') {
        return NextResponse.json({ error: 'Payment is not completed' }, { status: 400 })
      }

      const tournament = Array.isArray(team?.tournaments) ? team.tournaments[0] : team?.tournaments
      const entryFee = Number(tournament?.entry_fee) || 0

      const result = await reconcilePayPalPayment(supabase, paymentRow, {
        force,
        teamName: team?.team_name ? String(team.team_name) : undefined,
        fallbackGross: Number(paymentRow.gross_amount ?? paymentRow.amount ?? entryFee)
      })

      return NextResponse.json({
        success: result.status === 'updated',
        summary: {
          updated: result.status === 'updated' ? 1 : 0,
          skipped: result.status === 'skipped' ? 1 : 0,
          failed: result.status === 'failed' ? 1 : 0
        },
        results: [result]
      })
    }

    let teamQuery = supabase
      .from('teams')
      .select('id, team_name, payment_status, tournament_id, tournaments(entry_fee)')
      .eq('payment_status', 'completed')

    if (tournamentId) {
      teamQuery = teamQuery.eq('tournament_id', tournamentId)
    }

    const { data: teams, error: teamsError } = await teamQuery
    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 400 })
    }

    const teamRows = teams || []
    const teamIds = teamRows.map(team => team.id)
    if (teamIds.length === 0) {
      return NextResponse.json({
        success: true,
        summary: { updated: 0, skipped: 0, failed: 0, candidates: 0 },
        results: []
      })
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(
        'id, team_id, amount, gross_amount, payment_method, payment_provider, provider_order_id, provider_transaction_id, stripe_payment_intent_id, fee_amount, fee_source, reconciled, status'
      )
      .in('team_id', teamIds)
      .eq('status', 'completed')
      .order('paid_at', { ascending: false, nullsFirst: false })

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 400 })
    }

    const teamById = new Map(teamRows.map(team => [String(team.id), team]))
    const latestByTeam = new Map<string, PaymentRow>()
    for (const payment of (payments || []) as PaymentRow[]) {
      const teamId = String(payment.team_id || '')
      if (!teamId || latestByTeam.has(teamId)) continue
      latestByTeam.set(teamId, payment)
    }

    const candidates = Array.from(latestByTeam.values()).filter(payment =>
      paymentNeedsPayPalReconciliation(payment, force)
    )

    const teamNameByPaymentId = new Map<string, string>()
    const fallbackGrossByPaymentId = new Map<string, number>()
    for (const payment of candidates) {
      const team = teamById.get(String(payment.team_id))
      if (team?.team_name) {
        teamNameByPaymentId.set(payment.id, String(team.team_name))
      }
      const tournament = Array.isArray(team?.tournaments) ? team.tournaments[0] : team?.tournaments
      const entryFee = Number(tournament?.entry_fee) || 0
      fallbackGrossByPaymentId.set(
        payment.id,
        Number(payment.gross_amount ?? payment.amount ?? entryFee)
      )
    }

    const { results, updated, skipped, failed } = await reconcilePayPalPayments(
      supabase,
      candidates,
      {
        force,
        teamNameByPaymentId,
        fallbackGrossByPaymentId
      }
    )

    const paypalPayments = Array.from(latestByTeam.values()).filter(isPayPalPayment)
    const alreadyReconciled = paypalPayments.filter(
      payment => !paymentNeedsPayPalReconciliation(payment, false)
    ).length

    return NextResponse.json({
      success: true,
      summary: {
        updated,
        skipped,
        failed,
        candidates: candidates.length,
        paypalTotal: paypalPayments.length,
        alreadyReconciled
      },
      results
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
