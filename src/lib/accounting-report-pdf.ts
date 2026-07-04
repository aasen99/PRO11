import PDFDocument from 'pdfkit'
import type { AccountingReportData } from '@/lib/accounting-report'

type PdfDocument = InstanceType<typeof PDFDocument>

function formatNok(amount: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0
  }).format(amount)
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
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

const TABLE_COLUMNS = [
  { label: '#', width: 22 },
  { label: 'Lag', width: 95 },
  { label: 'Kaptein', width: 72 },
  { label: 'E-post', width: 118 },
  { label: 'Lagstatus', width: 52 },
  { label: 'Betaling', width: 52 },
  { label: 'Beløp', width: 58 },
  { label: 'Metode', width: 48 },
  { label: 'Betalt', width: 68 }
] as const

function drawTableHeader(doc: PdfDocument, y: number): number {
  let x = doc.page.margins.left
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#111827')

  for (const column of TABLE_COLUMNS) {
    doc.text(column.label, x, y, { width: column.width, lineBreak: false })
    x += column.width
  }

  doc
    .moveTo(doc.page.margins.left, y + 12)
    .lineTo(doc.page.width - doc.page.margins.right, y + 12)
    .strokeColor('#CBD5E1')
    .stroke()

  return y + 18
}

function drawTableRow(
  doc: PdfDocument,
  y: number,
  row: string[],
  rowIndex: number
): number {
  let x = doc.page.margins.left
  const fill = rowIndex % 2 === 0 ? '#F8FAFC' : '#FFFFFF'
  doc.rect(doc.page.margins.left, y - 2, doc.page.width - doc.page.margins.left - doc.page.margins.right, 14).fill(fill)
  doc.font('Helvetica').fontSize(7.5).fillColor('#111827')

  row.forEach((value, index) => {
    doc.text(value, x, y, { width: TABLE_COLUMNS[index].width, lineBreak: false })
    x += TABLE_COLUMNS[index].width
  })

  return y + 14
}

function ensureSpace(doc: PdfDocument, y: number, needed: number): number {
  const bottom = doc.page.height - doc.page.margins.bottom
  if (y + needed <= bottom) return y

  doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 })
  return drawTableHeader(doc, doc.page.margins.top)
}

export function buildAccountingReportPdf(data: AccountingReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 36,
      info: {
        Title: `PRO11 regnskap - ${data.tournament.title}`,
        Author: 'PRO11',
        Subject: 'Regnskapsdokumentasjon'
      }
    })

    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(chunk as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const reportDate = formatDateTime(data.generatedAt)
    const tournamentPeriod = `${formatDate(data.tournament.startDate)} – ${formatDate(data.tournament.endDate)}`

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827').text('PRO11 – Regnskapsdokumentasjon', {
      align: 'left'
    })
    doc.moveDown(0.4)
    doc.font('Helvetica').fontSize(11).fillColor('#334155').text(`Turnering: ${data.tournament.title}`)
    doc.text(`Periode: ${tournamentPeriod}`)
    doc.text(`Generert: ${reportDate}`)
    doc.text(`Rapport-ID: ${data.tournament.id.slice(0, 8).toUpperCase()}`)
    doc.moveDown(0.8)

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Sammendrag')
    doc.moveDown(0.3)

    const summaryLines = [
      ['Påmeldingsgebyr', formatNok(data.tournament.entryFee)],
      ['Premiepott (informasjon)', formatNok(data.tournament.prizePool)],
      ['Antall lag', String(data.summary.totalTeams)],
      ['Betalt', String(data.summary.paidTeams)],
      ['Ubetalte påmeldinger', String(data.summary.pendingPaymentTeams)],
      ['Innbetalt totalt', formatNok(data.summary.totalReceivedNok)],
      ['Utestående', formatNok(data.summary.totalOutstandingNok)],
      ['Forventet inntekt (alle lag)', formatNok(data.summary.expectedRevenueNok)],
      ['Netto etter premie (estimat)', formatNok(data.summary.totalReceivedNok - data.tournament.prizePool)]
    ]

    doc.font('Helvetica').fontSize(10).fillColor('#111827')
    for (const [label, value] of summaryLines) {
      doc.text(`${label}: ${value}`)
    }

    doc.moveDown(0.8)
    doc.font('Helvetica-Bold').fontSize(12).text('Lag og betalinger')
    doc.moveDown(0.4)

    let y = drawTableHeader(doc, doc.y)
    data.teams.forEach((team, index) => {
      y = ensureSpace(doc, y, 16)
      y = drawTableRow(
        doc,
        y,
        [
          String(index + 1),
          truncate(team.teamName, 18),
          truncate(team.captainName, 14),
          truncate(team.captainEmail, 24),
          truncate(team.teamStatus, 10),
          truncate(team.paymentStatus, 10),
          team.amountNok > 0 ? formatNok(team.amountNok) : '-',
          truncate(team.paymentMethod, 10),
          formatDateTime(team.paymentDate)
        ],
        index
      )
    })

    doc.moveDown(1)
    doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(
      'Dette dokumentet er generert automatisk fra PRO11 admin og kan brukes som grunnlag for regnskapsføring.',
      { align: 'left' }
    )

    doc.end()
  })
}
