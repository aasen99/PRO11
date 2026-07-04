export type PaymentMethod = 'paypal' | 'vipps' | 'free'
export type PaymentProvider = 'paypal' | 'vipps' | null
export type FeeSource = 'estimated' | 'provider_capture' | 'settlement_report' | 'manual' | null

export type PaymentRecordStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'free'

export interface PaymentRow {
  id: string
  team_id: string
  amount: number
  currency: string
  status: string
  payment_method: string
  payment_provider?: string | null
  provider_order_id?: string | null
  provider_transaction_id?: string | null
  stripe_payment_intent_id?: string | null
  gross_amount?: number | null
  fee_amount?: number | null
  net_amount?: number | null
  paid_at?: string | null
  fee_source?: string | null
  payout_id?: string | null
  payout_date?: string | null
  reconciled?: boolean | null
  reconciled_at?: string | null
  accounting_note?: string | null
  created_at: string
  updated_at: string
}

export const PRO11_ORGANIZER = 'E-spårt AS'
export const PRO11_ORG_NUMBER = process.env.PRO11_ORG_NUMBER || '[orgnummer]'
export const PRO11_VAT_STATUS = process.env.PRO11_VAT_STATUS || 'Ikke MVA-registrert'

export function formatPaymentMethodLabel(method: string | null | undefined): string {
  switch ((method || '').toLowerCase()) {
    case 'paypal':
      return 'PayPal/kort'
    case 'vipps':
      return 'Vipps'
    case 'free':
      return 'Gratis/fritatt'
    default:
      return method || '-'
  }
}

export function formatFeeSourceLabel(source: string | null | undefined): string {
  switch ((source || '').toLowerCase()) {
    case 'estimated':
      return 'Estimat'
    case 'provider_capture':
      return 'provider_capture'
    case 'settlement_report':
      return 'settlement_report'
    case 'manual':
      return 'manual'
    default:
      return '-'
  }
}

export function formatReconciledLabel(reconciled: boolean | null | undefined): string {
  return reconciled ? 'Ja' : 'Nei'
}

export function resolveGrossAmount(payment: PaymentRow | null | undefined, fallback = 0): number {
  if (!payment) return fallback
  if (payment.gross_amount != null) return Number(payment.gross_amount)
  return Number(payment.amount) || fallback
}

export function resolveProviderOrderId(payment: PaymentRow | null | undefined): string | null {
  if (!payment) return null
  return payment.provider_order_id || payment.stripe_payment_intent_id || null
}

export function isFreePayment(payment: PaymentRow | null | undefined, entryFee: number): boolean {
  if (!payment) return entryFee <= 0
  return payment.payment_method === 'free' || resolveGrossAmount(payment) === 0
}

export function isPaidRegistration(paymentStatus: string, payment: PaymentRow | null | undefined, entryFee: number): boolean {
  if (paymentStatus !== 'completed') return false
  if (isFreePayment(payment, entryFee)) return false
  return resolveGrossAmount(payment, entryFee) > 0
}

export function generateReportId(tournamentId: string, generatedAt: string): string {
  const stamp = generatedAt.replace(/[-:TZ.]/g, '').slice(0, 14)
  return `PR-${tournamentId.slice(0, 8).toUpperCase()}-${stamp}`
}
