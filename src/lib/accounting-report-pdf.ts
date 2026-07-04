import PDFDocument from 'pdfkit'
import type { PaymentReportData } from '@/lib/accounting-report'

type PdfDocument = InstanceType<typeof PDFDocument>

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

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

const TABLE_COLUMNS = [
  { label: '#', width: 18 },
  { label: 'Lag', width: 72 },
  { label: 'Kaptein', width: 58 },
  { label: 'E-post', width: 92 },
  { label: 'Betalt', width: 52 },
  { label: 'Metode', width: 52 },
  { label: 'Brutto', width: 44 },
  { label: 'Gebyr', width: 38 },
  { label: 'Netto', width: 44 },
  { label: 'Tx-ID', width: 72 },
  { label: 'Avst.', width: 28 }
] as const

function drawTableHeader(doc: PdfDocument, y: number): number {
  let x = doc.page.margins.left
  doc.font('Helvetica-Bold').fontSize(7).fillColor('#111827')
  for (const column of TABLE_COLUMNS) {
    doc.text(column.label, x, y, { width: column.width, lineBreak: false })
    x += column.width
  }
  doc
    .moveTo(doc.page.margins.left, y + 11)
    .lineTo(doc.page.width - doc.page.margins.right, y + 11)
    .strokeColor('#CBD5E1')
    .stroke()
  return y + 16
}

function drawTableRow(doc: PdfDocument, y: number, row: string[], rowIndex: number): number {
  let x = doc.page.margins.left
  const fill = rowIndex % 2 === 0 ? '#F8FAFC' : '#FFFFFF'
  doc.rect(doc.page.margins.left, y - 2, doc.page.width - doc.page.margins.left - doc.page.margins.right, 13).fill(fill)
  doc.font('Helvetica').fontSize(6.5).fillColor('#111827')
  row.forEach((value, index) => {
    doc.text(value, x, y, { width: TABLE_COLUMNS[index].width, lineBreak: false })
    x += TABLE_COLUMNS[index].width
  })
  return y + 13
}

function ensureSpace(doc: PdfDocument, y: number, needed: number): number {
  const bottom = doc.page.height - doc.page.margins.bottom
  if (y + needed <= bottom) return y
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 32 })
  return drawTableHeader(doc, doc.page.margins.top)
}

export function buildPaymentReportPdf(data: PaymentReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 32,
      info: {
        Title: `PRO11 betalingsrapport - ${data.tournament.title}`,
        Author: 'PRO11',
        Subject: 'Betalingsrapport / regnskapsgrunnlag'
      }
    })

    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(chunk as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#111827').text(data.reportTitle)
    doc.moveDown(0.35)
    doc.font('Helvetica').fontSize(9.5).fillColor('#334155')
    doc.text(`Arrangør: ${data.organizer}`)
    doc.text(`Org.nr: ${data.orgNumber}`)
    doc.text(`Turnering: ${data.tournament.title}`)
    doc.text(`Turnerings-ID: ${data.tournament.id}`)
    doc.text(`Periode: ${data.periodLabel}`)
    doc.text(`Generert: ${formatDateTime(data.generatedAt)}`)
    doc.text(`Rapport-ID: ${data.reportId}`)
    doc.text(`Valuta: ${data.currency}`)
    doc.text(`MVA-status: ${data.vatStatus}`)
    doc.text(`Rapporttype: ${data.reportType}`)
    doc.moveDown(0.6)

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Sammendrag')
    doc.moveDown(0.25)
    doc.font('Helvetica').fontSize(9.5).fillColor('#111827')
    doc.text(`Antall betalte lag: ${data.summary.paidTeams}`)
    doc.text(`Antall gratis/fritatte lag: ${data.summary.freeTeams}`)
    doc.text(`Påmeldingsavgift per lag: ${formatNok(data.summary.entryFeePerTeam)}`)
    doc.text(`Brutto påmeldingsinntekt: ${formatNok(data.summary.grossRegistrationIncome)}`)
    doc.moveDown(0.15)
    doc.text('Fordelt på betalingsmetode:')
    doc.text(`PayPal/kort: ${formatNok(data.summary.byMethod.paypal)}`)
    doc.text(`Vipps: ${formatNok(data.summary.byMethod.vipps)}`)
    doc.text(`Gratis/fritatt: ${data.summary.freeTeams} ${data.summary.freeTeams === 1 ? 'lag' : 'lag'}`)
    doc.moveDown(0.15)
    doc.text('Registrerte betalingsgebyrer:')
    if (data.summary.feesFullyKnown) {
      doc.text(`PayPal: ${formatNok(data.summary.registeredFees.paypal || 0)}`)
      doc.text(`Vipps: ${formatNok(data.summary.registeredFees.vipps || 0)}`)
      doc.text(`Ukjente gebyrer: ${data.summary.registeredFees.unknown}`)
      doc.text(`Netto etter registrerte betalingsgebyrer: ${formatOptionalNok(data.summary.netAfterRegisteredFees)}`)
    } else {
      doc.text('PayPal: Ikke avstemt')
      doc.text('Vipps: Ikke avstemt')
      doc.text('Netto etter gebyrer: Ikke beregnet')
    }

    doc.moveDown(0.6)
    doc.font('Helvetica-Bold').fontSize(11).text('Detaljtabell – betalte påmeldinger')
    doc.moveDown(0.3)

    let y = drawTableHeader(doc, doc.y)
    data.lines.forEach((line, index) => {
      y = ensureSpace(doc, y, 15)
      y = drawTableRow(
        doc,
        y,
        [
          String(line.rowNumber),
          truncate(line.teamName, 14),
          truncate(line.captainName, 11),
          truncate(line.captainEmail, 18),
          line.paidAt ? formatDateTime(line.paidAt).slice(0, 10) : '-',
          truncate(line.method, 10),
          formatNok(line.grossAmount),
          line.feeAmount != null ? formatNok(line.feeAmount) : '-',
          line.netAmount != null ? formatNok(line.netAmount) : '-',
          truncate(line.transactionId, 14),
          line.reconciled
        ],
        index
      )
    })

    doc.moveDown(0.8)
    doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text(
      'Denne rapporten dokumenterer brutto påmeldingsinntekter for PRO11. Gebyrer og utbetalinger avstemmes mot PayPal/Vipps. DNB-innbetaling er oppgjør, ikke nytt salg.',
      { align: 'left' }
    )

    doc.end()
  })
}

/** @deprecated Use buildPaymentReportPdf */
export function buildAccountingReportPdf(data: PaymentReportData): Promise<Buffer> {
  return buildPaymentReportPdf(data)
}
