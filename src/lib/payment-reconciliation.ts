import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getPayPalCaptureDetails,
  getPayPalOrder,
  type PayPalOrder
} from '@/lib/paypal'
import {
  resolveProviderOrderId,
  type PaymentRow
} from '@/lib/payment-types'

export interface PayPalPaymentAccountingUpdate {
  gross_amount: number | null
  fee_amount: number | null
  net_amount: number | null
  provider_order_id: string | null
  provider_transaction_id: string | null
  fee_source: 'provider_capture' | null
  reconciled: boolean
  reconciled_at: string | null
}

export interface PayPalReconcileResult {
  paymentId: string
  teamName?: string
  status: 'updated' | 'skipped' | 'failed'
  feeAmount?: number | null
  error?: string
}

export function buildPayPalPaymentAccountingUpdate(
  order: PayPalOrder,
  fallbackGross?: number | null
): PayPalPaymentAccountingUpdate {
  const details = getPayPalCaptureDetails(order)
  const reconciled = details.feeAmount != null

  return {
    gross_amount: details.grossAmount ?? fallbackGross ?? null,
    fee_amount: details.feeAmount,
    net_amount: details.netAmount,
    provider_order_id: details.orderId || null,
    provider_transaction_id: details.captureId,
    fee_source: reconciled ? 'provider_capture' : null,
    reconciled,
    reconciled_at: reconciled ? new Date().toISOString() : null
  }
}

export function isPayPalPayment(payment: Pick<PaymentRow, 'payment_method' | 'payment_provider'>): boolean {
  const method = String(payment.payment_method || '').toLowerCase()
  const provider = String(payment.payment_provider || '').toLowerCase()
  return method === 'paypal' || provider === 'paypal'
}

export function paymentNeedsPayPalReconciliation(
  payment: Pick<
    PaymentRow,
    'payment_method' | 'payment_provider' | 'fee_amount' | 'reconciled' | 'fee_source'
  >,
  force = false
): boolean {
  if (!isPayPalPayment(payment)) return false
  if (force) return true
  if (payment.fee_amount == null) return true
  if (!payment.reconciled) return true
  return payment.fee_source !== 'provider_capture'
}

export async function reconcilePayPalPayment(
  supabase: SupabaseClient,
  payment: PaymentRow,
  options?: { force?: boolean; fallbackGross?: number | null; teamName?: string }
): Promise<PayPalReconcileResult> {
  const paymentId = payment.id

  if (!isPayPalPayment(payment)) {
    return {
      paymentId,
      teamName: options?.teamName,
      status: 'skipped',
      error: 'Not a PayPal payment'
    }
  }

  if (!paymentNeedsPayPalReconciliation(payment, options?.force)) {
    return {
      paymentId,
      teamName: options?.teamName,
      status: 'skipped',
      feeAmount: payment.fee_amount ?? null
    }
  }

  const orderId = resolveProviderOrderId(payment)
  if (!orderId) {
    return {
      paymentId,
      teamName: options?.teamName,
      status: 'failed',
      error: 'Missing PayPal order ID'
    }
  }

  try {
    const order = await getPayPalOrder(orderId)
    if (order.status !== 'COMPLETED') {
      return {
        paymentId,
        teamName: options?.teamName,
        status: 'failed',
        error: `PayPal order status: ${order.status}`
      }
    }

    const updateData = buildPayPalPaymentAccountingUpdate(
      order,
      options?.fallbackGross ?? payment.gross_amount ?? payment.amount
    )

    if (!updateData.reconciled) {
      return {
        paymentId,
        teamName: options?.teamName,
        status: 'failed',
        error: 'PayPal returned no fee breakdown'
      }
    }

    const { error } = await supabase.from('payments').update(updateData).eq('id', paymentId)
    if (error) {
      return {
        paymentId,
        teamName: options?.teamName,
        status: 'failed',
        error: error.message
      }
    }

    return {
      paymentId,
      teamName: options?.teamName,
      status: 'updated',
      feeAmount: updateData.fee_amount
    }
  } catch (error) {
    return {
      paymentId,
      teamName: options?.teamName,
      status: 'failed',
      error: error instanceof Error ? error.message : 'PayPal lookup failed'
    }
  }
}

export async function reconcilePayPalPayments(
  supabase: SupabaseClient,
  payments: PaymentRow[],
  options?: {
    force?: boolean
    teamNameByPaymentId?: Map<string, string>
    fallbackGrossByPaymentId?: Map<string, number>
  }
): Promise<{
  results: PayPalReconcileResult[]
  updated: number
  skipped: number
  failed: number
}> {
  const results: PayPalReconcileResult[] = []
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const payment of payments) {
    const result = await reconcilePayPalPayment(supabase, payment, {
      force: options?.force,
      teamName: options?.teamNameByPaymentId?.get(payment.id),
      fallbackGross: options?.fallbackGrossByPaymentId?.get(payment.id) ?? null
    })
    results.push(result)
    if (result.status === 'updated') updated += 1
    else if (result.status === 'skipped') skipped += 1
    else failed += 1
  }

  return { results, updated, skipped, failed }
}
