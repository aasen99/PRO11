import { NextRequest, NextResponse } from 'next/server'
import { buildPaymentReportData } from '@/lib/accounting-report'
import { buildPaymentReportPdf } from '@/lib/accounting-report-pdf'
import { buildPaymentReportCsv } from '@/lib/payment-report-csv'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isUnauthorized, requireAdmin } from '@/lib/session'

function safeFilename(title: string): string {
  return (
    title
      .replace(/[^\w\s-æøåÆØÅ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'turnering'
  )
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (isUnauthorized(admin)) return admin

    const params = new URL(request.url).searchParams
    const tournamentId = params.get('tournament_id')
    const format = (params.get('format') || 'pdf').toLowerCase()

    if (!tournamentId) {
      return NextResponse.json({ error: 'tournament_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const reportData = await buildPaymentReportData(supabase, tournamentId)
    if (!reportData) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const safeTitle = safeFilename(reportData.tournament.title)
    const dateStamp = new Date().toISOString().split('T')[0]

    if (format === 'csv') {
      const csv = buildPaymentReportCsv(reportData)
      const filename = `PRO11_betalingsrapport_${safeTitle}_${dateStamp}.csv`
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store'
        }
      })
    }

    const pdfBuffer = await buildPaymentReportPdf(reportData)
    const filename = `PRO11_betalingsrapport_${safeTitle}_${dateStamp}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Payment report error:', error)
    return NextResponse.json({ error: 'Failed to generate report: ' + message }, { status: 500 })
  }
}
