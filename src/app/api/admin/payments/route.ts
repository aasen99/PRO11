import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isUnauthorized, requireAdmin } from '@/lib/session'
import {
  formatFeeSourceLabel,
  formatPaymentMethodLabel,
  formatReconciledLabel,
  resolveGrossAmount,
  resolveProviderOrderId
} from '@/lib/payment-types'

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (isUnauthorized(admin)) return admin

    const params = new URL(request.url).searchParams
    const tournamentId = params.get('tournament_id')
    const paymentMethod = params.get('payment_method')

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    let teamQuery = supabase
      .from('teams')
      .select('id, team_name, captain_name, captain_email, payment_status, tournament_id, tournaments(id, title, entry_fee)')

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
      return NextResponse.json({ payments: [] })
    }

    let paymentQuery = supabase
      .from('payments')
      .select(
        'id, team_id, amount, currency, status, payment_method, payment_provider, provider_order_id, provider_transaction_id, stripe_payment_intent_id, gross_amount, fee_amount, net_amount, paid_at, fee_source, payout_id, payout_date, reconciled, reconciled_at, accounting_note, created_at, updated_at'
      )
      .in('team_id', teamIds)
      .order('paid_at', { ascending: false, nullsFirst: false })

    if (paymentMethod) {
      paymentQuery = paymentQuery.eq('payment_method', paymentMethod)
    }

    const { data: payments, error: paymentsError } = await paymentQuery
    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 400 })
    }

    const teamById = new Map(teamRows.map(team => [String(team.id), team]))
    const paymentRows = (payments || []) as Array<Record<string, unknown>>
    const latestByTeam = new Map<string, Record<string, unknown>>()
    for (const payment of paymentRows) {
      const teamId = String(payment.team_id || '')
      if (!teamId || latestByTeam.has(teamId)) continue
      latestByTeam.set(teamId, payment)
    }

    const enriched = Array.from(latestByTeam.values())
      .map(payment => {
        const team = teamById.get(String(payment.team_id || ''))
        const tournament = Array.isArray(team?.tournaments) ? team.tournaments[0] : team?.tournaments
        const entryFee = Number(tournament?.entry_fee) || 0

        return {
          id: payment.id,
          teamId: payment.team_id,
          teamName: team?.team_name || '-',
          captainName: team?.captain_name || '-',
          captainEmail: team?.captain_email || '-',
          tournamentId: team?.tournament_id || tournament?.id || null,
          tournamentTitle: tournament?.title || '-',
          paymentStatus: team?.payment_status || payment.status,
          method: formatPaymentMethodLabel(String(payment.payment_method || '')),
          paymentMethod: payment.payment_method,
          grossAmount: resolveGrossAmount(payment as any, entryFee),
          feeAmount: payment.fee_amount,
          netAmount: payment.net_amount,
          feeSource: formatFeeSourceLabel(payment.fee_source as string | null | undefined),
          feeSourceRaw: payment.fee_source,
          providerOrderId: resolveProviderOrderId(payment as any),
          providerTransactionId: payment.provider_transaction_id,
          payoutId: payment.payout_id,
          payoutDate: payment.payout_date,
          paidAt: payment.paid_at || payment.updated_at || payment.created_at,
          reconciled: Boolean(payment.reconciled),
          reconciledLabel: formatReconciledLabel(payment.reconciled as boolean | null | undefined),
          reconciledAt: payment.reconciled_at,
          accountingNote: payment.accounting_note
        }
      })
      .filter(row => row.paymentStatus === 'completed')

    return NextResponse.json({ payments: enriched })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (isUnauthorized(admin)) return admin

    const body = await request.json()
    const {
      id,
      feeAmount,
      netAmount,
      feeSource,
      payoutId,
      payoutDate,
      reconciled,
      accountingNote,
      providerTransactionId
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Payment id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const updateData: Record<string, unknown> = {}

    if (feeAmount !== undefined) {
      updateData.fee_amount = feeAmount === null || feeAmount === '' ? null : Number(feeAmount)
    }
    if (netAmount !== undefined) {
      updateData.net_amount = netAmount === null || netAmount === '' ? null : Number(netAmount)
    } else if (feeAmount !== undefined && updateData.fee_amount != null) {
      const { data: existing } = await supabase
        .from('payments')
        .select('gross_amount, amount')
        .eq('id', id)
        .single()
      const gross = Number(existing?.gross_amount ?? existing?.amount ?? 0)
      updateData.net_amount = gross - Number(updateData.fee_amount)
    }

    if (feeSource !== undefined) {
      updateData.fee_source = feeSource || null
    }
    if (payoutId !== undefined) {
      updateData.payout_id = payoutId || null
    }
    if (payoutDate !== undefined) {
      updateData.payout_date = payoutDate || null
    }
    if (providerTransactionId !== undefined) {
      updateData.provider_transaction_id = providerTransactionId || null
    }
    if (accountingNote !== undefined) {
      updateData.accounting_note = accountingNote || null
    }
    if (reconciled !== undefined) {
      updateData.reconciled = Boolean(reconciled)
      updateData.reconciled_at = reconciled ? new Date().toISOString() : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, payment })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
