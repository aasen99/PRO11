import type { SupabaseClient } from '@supabase/supabase-js'
import {
  formatFeeSourceLabel,
  formatPaymentMethodLabel,
  formatReconciledLabel,
  generateReportId,
  isFreePayment,
  isPaidRegistration,
  PRO11_ORGANIZER,
  PRO11_ORG_NUMBER,
  PRO11_VAT_STATUS,
  resolveGrossAmount,
  resolveProviderOrderId,
  type PaymentRow
} from '@/lib/payment-types'

export interface PaymentReportLine {
  rowNumber: number
  teamName: string
  captainName: string
  captainEmail: string
  tournamentTitle: string
  paidAt: string | null
  method: string
  grossAmount: number
  feeAmount: number | null
  netAmount: number | null
  feeSource: string
  transactionId: string
  payoutId: string
  reconciled: string
  note: string
  isFree: boolean
  paymentId: string | null
}

export interface PaymentReportData {
  reportTitle: string
  organizer: string
  orgNumber: string
  tournament: {
    id: string
    title: string
    startDate: string
    endDate: string
    entryFee: number
  }
  periodLabel: string
  generatedAt: string
  reportId: string
  currency: 'NOK'
  vatStatus: string
  reportType: string
  summary: {
    paidTeams: number
    freeTeams: number
    entryFeePerTeam: number
    grossRegistrationIncome: number
    byMethod: {
      paypal: number
      vipps: number
      free: number
    }
    registeredFees: {
      paypal: number | null
      vipps: number | null
      unknown: number
    }
    netAfterRegisteredFees: number | null
    feesFullyKnown: boolean
  }
  lines: PaymentReportLine[]
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function sumFees(lines: PaymentReportLine[], method: 'paypal' | 'vipps'): number | null {
  const relevant = lines.filter(line => {
    if (line.isFree) return false
    const normalized = line.method.toLowerCase()
    return method === 'paypal' ? normalized.includes('paypal') : normalized.includes('vipps')
  })
  if (relevant.length === 0) return 0
  if (relevant.some(line => line.feeAmount == null)) return null
  return relevant.reduce((sum, line) => sum + (line.feeAmount || 0), 0)
}

export async function buildPaymentReportData(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<PaymentReportData | null> {
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id, title, start_date, end_date, entry_fee')
    .eq('id', tournamentId)
    .maybeSingle()

  if (tournamentError || !tournament) return null

  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, team_name, captain_name, captain_email, payment_status, created_at')
    .eq('tournament_id', tournamentId)
    .order('team_name', { ascending: true })

  if (teamsError) throw new Error(teamsError.message)

  const teamRows = teams || []
  const teamIds = teamRows.map(team => team.id)
  const entryFee = Number(tournament.entry_fee) || 0

  let payments: PaymentRow[] = []
  if (teamIds.length > 0) {
    const { data: paymentRows, error: paymentsError } = await supabase
      .from('payments')
      .select(
        'id, team_id, amount, currency, status, payment_method, payment_provider, provider_order_id, provider_transaction_id, stripe_payment_intent_id, gross_amount, fee_amount, net_amount, paid_at, fee_source, payout_id, payout_date, reconciled, reconciled_at, accounting_note, created_at, updated_at'
      )
      .in('team_id', teamIds)
      .order('created_at', { ascending: false })

    if (paymentsError) throw new Error(paymentsError.message)
    payments = (paymentRows || []) as PaymentRow[]
  }

  const latestPaymentByTeam = new Map<string, PaymentRow>()
  for (const payment of payments) {
    if (!latestPaymentByTeam.has(payment.team_id)) {
      latestPaymentByTeam.set(payment.team_id, payment)
    }
  }

  const generatedAt = new Date().toISOString()
  const tournamentTitle = String(tournament.title)

  const rawLines = teamRows
    .map(team => {
      const payment = latestPaymentByTeam.get(team.id) || null
      const paymentStatus = String(team.payment_status || 'pending')
      const free = isFreePayment(payment, entryFee) && paymentStatus === 'completed'
      const paid = isPaidRegistration(paymentStatus, payment, entryFee) || free

      if (!paid) return null

      const grossAmount = free ? 0 : resolveGrossAmount(payment, entryFee)
      const feeAmount = free ? 0 : payment?.fee_amount != null ? Number(payment.fee_amount) : null
      const netAmount =
        free ? 0 : payment?.net_amount != null
          ? Number(payment.net_amount)
          : feeAmount != null
            ? grossAmount - feeAmount
            : null

      return {
        teamName: String(team.team_name),
        captainName: String(team.captain_name),
        captainEmail: String(team.captain_email),
        tournamentTitle,
        paidAt: payment?.paid_at || payment?.updated_at || payment?.created_at || null,
        method: free ? 'Gratis/fritatt' : formatPaymentMethodLabel(payment?.payment_method || 'paypal'),
        grossAmount,
        feeAmount,
        netAmount,
        feeSource: free ? '-' : formatFeeSourceLabel(payment?.fee_source),
        transactionId:
          free ? '-' : payment?.provider_transaction_id || resolveProviderOrderId(payment) || '-',
        payoutId: payment?.payout_id || '-',
        reconciled: free ? 'Ja' : formatReconciledLabel(payment?.reconciled),
        note: payment?.accounting_note || '-',
        isFree: free,
        paymentId: payment?.id || null
      }
    })
    .filter((line): line is NonNullable<typeof line> => line !== null)

  const lines: PaymentReportLine[] = rawLines.map((line, index) => ({
    rowNumber: index + 1,
    ...line
  }))

  const paidTeams = lines.filter(line => !line.isFree).length
  const freeTeams = lines.filter(line => line.isFree).length
  const grossRegistrationIncome = lines.reduce((sum, line) => sum + line.grossAmount, 0)

  const byMethod = {
    paypal: lines.filter(line => !line.isFree && line.method.toLowerCase().includes('paypal')).reduce((s, l) => s + l.grossAmount, 0),
    vipps: lines.filter(line => !line.isFree && line.method.toLowerCase().includes('vipps')).reduce((s, l) => s + l.grossAmount, 0),
    free: lines.filter(line => line.isFree).length
  }

  const paypalFees = sumFees(lines, 'paypal')
  const vippsFees = sumFees(lines, 'vipps')
  const feesFullyKnown = lines.every(line => line.isFree || line.feeAmount != null)
  const registeredFeeTotal =
    feesFullyKnown ? (paypalFees || 0) + (vippsFees || 0) + lines.filter(l => !l.isFree && l.feeAmount == null).reduce((s, l) => s + 0, 0) : null
  const unknownFees = lines.filter(line => !line.isFree && line.feeAmount == null).length

  return {
    reportTitle: 'PRO11 – Betalingsrapport / regnskapsgrunnlag',
    organizer: PRO11_ORGANIZER,
    orgNumber: PRO11_ORG_NUMBER,
    tournament: {
      id: String(tournament.id),
      title: tournamentTitle,
      startDate: String(tournament.start_date),
      endDate: String(tournament.end_date),
      entryFee
    },
    periodLabel: `${formatDate(String(tournament.start_date))} – ${formatDate(String(tournament.end_date))}`,
    generatedAt,
    reportId: generateReportId(String(tournament.id), generatedAt),
    currency: 'NOK',
    vatStatus: PRO11_VAT_STATUS,
    reportType: 'Påmeldingsinntekter',
    summary: {
      paidTeams,
      freeTeams,
      entryFeePerTeam: entryFee,
      grossRegistrationIncome,
      byMethod,
      registeredFees: {
        paypal: paypalFees,
        vipps: vippsFees,
        unknown: unknownFees
      },
      netAfterRegisteredFees:
        feesFullyKnown && registeredFeeTotal != null
          ? grossRegistrationIncome - registeredFeeTotal
          : null,
      feesFullyKnown
    },
    lines
  }
}

/** @deprecated Use buildPaymentReportData */
export async function buildAccountingReportData(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<PaymentReportData | null> {
  return buildPaymentReportData(supabase, tournamentId)
}

export type AccountingReportData = PaymentReportData
