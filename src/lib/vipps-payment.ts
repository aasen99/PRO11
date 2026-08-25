import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resolveVippsCapturedAmountNok,
  resolveVippsPspReference,
  waitForSuccessfulVippsPayment
} from '@/lib/vipps'
import { recountTournamentRegisteredTeams } from '@/lib/tournament-team-count'

export interface CompleteVippsPaymentResult {
  success: boolean
  alreadyCompleted?: boolean
  paymentId?: string
  reference?: string
  error?: string
}

function amountsMatch(expectedNok: number, paidNok: number): boolean {
  return Math.abs(expectedNok - paidNok) < 0.01
}

export async function completeVippsPaymentForTeam(
  supabase: SupabaseClient,
  teamId: string,
  reference: string
): Promise<CompleteVippsPaymentResult> {
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, payment_status, team_name, tournament_id, tournaments(entry_fee)')
    .eq('id', teamId)
    .single()

  if (teamError || !team) {
    return { success: false, error: 'Team not found' }
  }

  if (team.payment_status === 'completed') {
    return { success: true, alreadyCompleted: true, reference }
  }

  const tournament = Array.isArray(team.tournaments) ? team.tournaments[0] : team.tournaments
  const entryFee = Number(tournament?.entry_fee ?? 0)
  if (!Number.isFinite(entryFee) || entryFee <= 0) {
    return { success: false, error: 'This tournament does not require payment' }
  }

  let vippsPayment
  try {
    vippsPayment = await waitForSuccessfulVippsPayment(reference, entryFee)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Vipps verification failed'
    }
  }

  const paidAmount = resolveVippsCapturedAmountNok(vippsPayment)
  if (paidAmount == null || !amountsMatch(entryFee, paidAmount)) {
    return { success: false, error: 'Vipps amount does not match tournament fee' }
  }

  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, team_id, provider_order_id')
    .eq('provider_order_id', reference)
    .maybeSingle()

  if (existingPayment && existingPayment.team_id !== teamId) {
    return { success: false, error: 'Vipps reference already used by another team' }
  }

  const paidAt = new Date().toISOString()
  const pspReference = resolveVippsPspReference(vippsPayment)
  const paymentPayload = {
    status: 'completed',
    amount: entryFee,
    gross_amount: paidAmount,
    fee_amount: null,
    net_amount: null,
    payment_method: 'vipps',
    payment_provider: 'vipps',
    provider_order_id: reference,
    provider_transaction_id: pspReference,
    stripe_payment_intent_id: reference,
    paid_at: paidAt,
    fee_source: null,
    reconciled: false,
    reconciled_at: null
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
      return { success: false, error: paymentError.message }
    }
    paymentId = payment.id as string
  } else {
    const { error: paymentError } = await supabase
      .from('payments')
      .update(paymentPayload)
      .eq('id', paymentId)

    if (paymentError) {
      return { success: false, error: paymentError.message }
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
    return { success: false, error: teamUpdateError.message }
  }

  await recountTournamentRegisteredTeams(supabase, team.tournament_id)

  return {
    success: true,
    paymentId,
    reference
  }
}
