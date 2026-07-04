import type { SupabaseClient } from '@supabase/supabase-js'
import {
  captureVippsPayment,
  getVippsPayment,
  isVippsPaymentCaptured,
  resolveVippsCapturedAmountNok,
  resolveVippsPspReference,
  type VippsPaymentResponse
} from '@/lib/vipps'

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

async function ensureVippsPaymentCaptured(
  reference: string,
  entryFeeNok: number
): Promise<VippsPaymentResponse> {
  let payment = await getVippsPayment(reference)
  const state = String(payment.state || '').toUpperCase()

  if (state === 'AUTHORIZED') {
    payment = await captureVippsPayment(reference, entryFeeNok, `capture-${reference}`)
  }

  if (!isVippsPaymentCaptured(payment)) {
    throw new Error(`Vipps payment is not completed (${payment.state || 'unknown'})`)
  }

  return payment
}

export async function completeVippsPaymentForTeam(
  supabase: SupabaseClient,
  teamId: string,
  reference: string
): Promise<CompleteVippsPaymentResult> {
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, payment_status, team_name, tournaments(entry_fee)')
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

  const vippsPayment = await ensureVippsPaymentCaptured(reference, entryFee)
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

  return {
    success: true,
    paymentId,
    reference
  }
}
