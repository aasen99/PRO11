import { NextRequest, NextResponse } from 'next/server'
import { buildAccountingReportData } from '@/lib/accounting-report'
import { buildAccountingReportPdf } from '@/lib/accounting-report-pdf'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isUnauthorized, requireAdmin } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (isUnauthorized(admin)) return admin

    const tournamentId = new URL(request.url).searchParams.get('tournament_id')
    if (!tournamentId) {
      return NextResponse.json({ error: 'tournament_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const reportData = await buildAccountingReportData(supabase, tournamentId)
    if (!reportData) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const pdfBuffer = await buildAccountingReportPdf(reportData)
    const safeTitle = reportData.tournament.title
      .replace(/[^\w\s-æøåÆØÅ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'turnering'
    const dateStamp = new Date().toISOString().split('T')[0]
    const filename = `PRO11_regnskap_${safeTitle}_${dateStamp}.pdf`

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
    console.error('Accounting report error:', error)
    return NextResponse.json({ error: 'Failed to generate report: ' + message }, { status: 500 })
  }
}
