import PDFDocument from 'pdfkit'
import type { PaymentReportData } from '@/lib/accounting-report'

type PdfDocument = InstanceType<typeof PDFDocument>

const PAGE_MARGIN = 32
const CONTENT_WIDTH = 842 - PAGE_MARGIN * 2 // A4 landscape

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

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const TABLE_COLUMNS = [
  { key: 'row', label: '#', width: 20, wrap: false },
  { key: 'team', label: 'Lag', width: 72, wrap: false },
  { key: 'captain', label: 'Kaptein', width: 68, wrap: false },
  { key: 'email', label: 'E-post', width: 132, wrap: true },
  { key: 'paidAt', label: 'Betalt', width: 54, wrap: false },
  { key: 'method', label: 'Metode', width: 54, wrap: false },
  { key: 'gross', label: 'Brutto', width: 48, wrap: false },
  { key: 'fee', label: 'Gebyr', width: 44, wrap: false },
  { key: 'net', label: 'Netto', width: 48, wrap: false },
  { key: 'txId', label: 'Transaksjons-ID', width: 138, wrap: true },
  { key: 'reconciled', label: 'Avst.', width: 28, wrap: false }
] as const

function drawSectionBox(
  doc: PdfDocument,
  x: number,
  y: number,
  width: number,
  title: string,
  rows: Array<[string, string]>
): number {
  const padding = 10
  const labelWidth = 118
  const valueWidth = width - padding * 2 - labelWidth
  const titleHeight = 16
  const rowGap = 3

  doc.font('Helvetica').fontSize(8.5)
  const rowHeights = rows.map(([, value]) =>
    Math.max(11, doc.heightOfString(value, { width: valueWidth }) + 1)
  )
  const rowsHeight = rowHeights.reduce((sum, h) => sum + h + rowGap, 0)
  const boxHeight = padding * 2 + titleHeight + rowsHeight

  doc
    .roundedRect(x, y, width, boxHeight, 4)
    .fillAndStroke('#F8FAFC', '#CBD5E1')

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(title, x + padding, y + padding)

  let rowY = y + padding + titleHeight
  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i]
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748B').text(label, x + padding, rowY, {
      width: labelWidth,
      lineBreak: false
    })
    doc.font('Helvetica').fontSize(8.5).fillColor('#111827').text(value, x + padding + labelWidth, rowY, {
      width: valueWidth,
      lineBreak: true
    })
    rowY += rowHeights[i] + rowGap
  }

  return y + boxHeight
}

function drawHeaderSections(doc: PdfDocument, data: PaymentReportData): number {
  const leftX = doc.page.margins.left
  const gap = 16
  const boxWidth = (CONTENT_WIDTH - gap) / 2
  const rightX = leftX + boxWidth + gap
  const startY = doc.y

  const infoRows: Array<[string, string]> = [
    ['Arrangør:', data.organizer],
    ['Org.nr:', data.orgNumber],
    ['Turnering:', data.tournament.title],
    ['Turnerings-ID:', data.tournament.id],
    ['Periode:', data.periodLabel],
    ['Generert:', formatDateTime(data.generatedAt)],
    ['Rapport-ID:', data.reportId],
    ['Valuta:', data.currency],
    ['MVA-status:', data.vatStatus],
    ['Rapporttype:', data.reportType]
  ]

  const feeRows: Array<[string, string]> = data.summary.feesFullyKnown
    ? [
        ['PayPal-gebyrer:', formatNok(data.summary.registeredFees.paypal || 0)],
        ['Vipps-gebyrer:', formatNok(data.summary.registeredFees.vipps || 0)],
        ['Ukjente gebyrer:', String(data.summary.registeredFees.unknown)],
        [
          'Netto etter gebyrer:',
          formatOptionalNok(data.summary.netAfterRegisteredFees)
        ]
      ]
    : [
        ['PayPal-gebyrer:', 'Ikke avstemt'],
        ['Vipps-gebyrer:', 'Ikke avstemt'],
        ['Netto etter gebyrer:', 'Ikke beregnet']
      ]

  const summaryRows: Array<[string, string]> = [
    ['Betalte lag:', String(data.summary.paidTeams)],
    ['Gratis/fritatte lag:', String(data.summary.freeTeams)],
    ['Påmeldingsavgift:', formatNok(data.summary.entryFeePerTeam)],
    ['Brutto inntekt:', formatNok(data.summary.grossRegistrationIncome)],
    ['PayPal/kort:', formatNok(data.summary.byMethod.paypal)],
    ['Vipps:', formatNok(data.summary.byMethod.vipps)],
    ...feeRows
  ]

  const leftBottom = drawSectionBox(doc, leftX, startY, boxWidth, 'Info', infoRows)
  const rightBottom = drawSectionBox(doc, rightX, startY, boxWidth, 'Sammendrag', summaryRows)

  return Math.max(leftBottom, rightBottom) + 18
}

function drawTableHeader(doc: PdfDocument, y: number): number {
  doc
    .rect(doc.page.margins.left, y, CONTENT_WIDTH, 16)
    .fillAndStroke('#E2E8F0', '#CBD5E1')

  let x = doc.page.margins.left
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111827')
  for (const column of TABLE_COLUMNS) {
    doc.text(column.label, x + 2, y + 3, { width: column.width - 4, lineBreak: false })
    x += column.width
  }
  return y + 18
}

function cellHeight(doc: PdfDocument, text: string, width: number, wrap: boolean): number {
  if (!wrap) return 12
  const height = doc.heightOfString(text || '-', { width: width - 4 })
  return Math.max(12, height + 4)
}

function drawTableRow(
  doc: PdfDocument,
  y: number,
  values: string[],
  rowIndex: number
): number {
  doc.font('Helvetica').fontSize(7).fillColor('#111827')

  const heights = values.map((value, index) =>
    cellHeight(doc, value, TABLE_COLUMNS[index].width, TABLE_COLUMNS[index].wrap)
  )
  const rowHeight = Math.max(...heights) + 4

  const fill = rowIndex % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
  doc.rect(doc.page.margins.left, y, CONTENT_WIDTH, rowHeight).fill(fill)

  let x = doc.page.margins.left
  values.forEach((value, index) => {
    const column = TABLE_COLUMNS[index]
    doc
      .fillColor('#111827')
      .text(value || '-', x + 2, y + 3, {
        width: column.width - 4,
        lineBreak: column.wrap,
        ellipsis: column.wrap ? false : true
      })
    x += column.width
  })

  doc
    .rect(doc.page.margins.left, y, CONTENT_WIDTH, rowHeight)
    .strokeColor('#E2E8F0')
    .stroke()

  return y + rowHeight
}

function ensureSpace(doc: PdfDocument, y: number, needed: number): number {
  const bottom = doc.page.height - doc.page.margins.bottom
  if (y + needed <= bottom) return y
  doc.addPage({ size: 'A4', layout: 'landscape', margin: PAGE_MARGIN })
  return drawTableHeader(doc, doc.page.margins.top)
}

export function buildPaymentReportPdf(data: PaymentReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: PAGE_MARGIN,
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

    doc.font('Helvetica-Bold').fontSize(15).fillColor('#111827').text(data.reportTitle, {
      align: 'left'
    })
    doc.moveDown(0.5)

    const tableStartY = drawHeaderSections(doc, data)

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(
      'Detaljtabell – betalte påmeldinger',
      doc.page.margins.left,
      tableStartY
    )

    let y = drawTableHeader(doc, tableStartY + 16)
    data.lines.forEach((line, index) => {
      const rowValues = [
        String(line.rowNumber),
        line.teamName,
        line.captainName,
        line.captainEmail,
        line.paidAt ? formatDate(line.paidAt) : '-',
        line.method,
        formatNok(line.grossAmount),
        line.feeAmount != null ? formatNok(line.feeAmount) : '-',
        line.netAmount != null ? formatNok(line.netAmount) : '-',
        line.transactionId,
        line.reconciled
      ]

      const previewHeight =
        Math.max(
          ...rowValues.map((value, colIndex) =>
            cellHeight(doc, value, TABLE_COLUMNS[colIndex].width, TABLE_COLUMNS[colIndex].wrap)
          )
        ) + 4

      y = ensureSpace(doc, y, previewHeight + 2)
      y = drawTableRow(doc, y, rowValues, index)
    })

    y = ensureSpace(doc, y, 30)
    doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text(
      'Denne rapporten dokumenterer brutto påmeldingsinntekter for PRO11. Gebyrer og utbetalinger avstemmes mot PayPal/Vipps. DNB-innbetaling er oppgjør, ikke nytt salg.',
      doc.page.margins.left,
      y + 8,
      { width: CONTENT_WIDTH, align: 'left' }
    )

    doc.end()
  })
}

/** @deprecated Use buildPaymentReportPdf */
export function buildAccountingReportPdf(data: PaymentReportData): Promise<Buffer> {
  return buildPaymentReportPdf(data)
}
