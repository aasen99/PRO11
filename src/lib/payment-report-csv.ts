import type { PaymentReportData } from '@/lib/accounting-report'

function formatNok(amount: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0
  }).format(amount)
}

function formatOptionalNok(amount: number | null): string {
  if (amount == null) return 'Ikke beregnet'
  return formatNok(amount)
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function buildPaymentReportCsv(data: PaymentReportData): string {
  const lines: string[] = []
  lines.push(data.reportTitle)
  lines.push(`Arrangør,${csvEscape(data.organizer)}`)
  lines.push(`Org.nr,${csvEscape(data.orgNumber)}`)
  lines.push(`Turnering,${csvEscape(data.tournament.title)}`)
  lines.push(`Turnerings-ID,${csvEscape(data.tournament.id)}`)
  lines.push(`Periode,${csvEscape(data.periodLabel)}`)
  lines.push(`Generert,${csvEscape(data.generatedAt)}`)
  lines.push(`Rapport-ID,${csvEscape(data.reportId)}`)
  lines.push(`Valuta,${data.currency}`)
  lines.push(`MVA-status,${csvEscape(data.vatStatus)}`)
  lines.push(`Rapporttype,${csvEscape(data.reportType)}`)
  lines.push('')
  lines.push('Sammendrag')
  lines.push(`Antall betalte lag,${data.summary.paidTeams}`)
  lines.push(`Antall gratis/fritatte lag,${data.summary.freeTeams}`)
  lines.push(`Påmeldingsavgift per lag,${formatNok(data.summary.entryFeePerTeam)}`)
  lines.push(`Brutto påmeldingsinntekt,${formatNok(data.summary.grossRegistrationIncome)}`)
  lines.push(`PayPal/kort,${formatNok(data.summary.byMethod.paypal)}`)
  lines.push(`Vipps,${formatNok(data.summary.byMethod.vipps)}`)
  lines.push(`Gratis/fritatt,${data.summary.freeTeams} lag`)
  if (data.summary.feesFullyKnown) {
    lines.push(`PayPal-gebyrer,${formatNok(data.summary.registeredFees.paypal || 0)}`)
    lines.push(`Vipps-gebyrer,${formatNok(data.summary.registeredFees.vipps || 0)}`)
    lines.push(`Netto etter gebyrer,${formatOptionalNok(data.summary.netAfterRegisteredFees)}`)
  } else {
    lines.push('PayPal-gebyrer,Ikke avstemt')
    lines.push('Vipps-gebyrer,Ikke avstemt')
    lines.push('Netto etter gebyrer,Ikke beregnet')
  }
  lines.push('')
  lines.push(
    [
      '#',
      'Lag',
      'Kaptein',
      'E-post',
      'Turnering',
      'Betalt dato',
      'Metode',
      'Brutto',
      'Gebyr',
      'Netto',
      'Gebyrkilde',
      'Transaksjons-ID',
      'Payout-ID',
      'Avstemt',
      'Notat'
    ].join(',')
  )

  for (const line of data.lines) {
    lines.push(
      [
        line.rowNumber,
        csvEscape(line.teamName),
        csvEscape(line.captainName),
        csvEscape(line.captainEmail),
        csvEscape(line.tournamentTitle),
        csvEscape(line.paidAt),
        csvEscape(line.method),
        formatNok(line.grossAmount),
        line.feeAmount != null ? formatNok(line.feeAmount) : '-',
        line.netAmount != null ? formatNok(line.netAmount) : '-',
        csvEscape(line.feeSource),
        csvEscape(line.transactionId),
        csvEscape(line.payoutId),
        csvEscape(line.reconciled),
        csvEscape(line.note)
      ].join(',')
    )
  }

  return `\uFEFF${lines.join('\n')}`
}
