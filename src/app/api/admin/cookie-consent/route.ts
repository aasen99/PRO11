import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isUnauthorized, requireAdmin } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (isUnauthorized(admin)) return admin

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('cookie_consent_events')
      .select('decision, created_at')

    if (error) {
      if (error.message.toLowerCase().includes('cookie_consent_events')) {
        return NextResponse.json({
          accepted: 0,
          declined: 0,
          total: 0,
          acceptanceRate: 0,
          tableMissing: true
        })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const rows = data || []
    const accepted = rows.filter(row => row.decision === 'accepted').length
    const declined = rows.filter(row => row.decision === 'declined').length
    const total = accepted + declined
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentRows = rows.filter(row => new Date(String(row.created_at)) >= thirtyDaysAgo)
    const recentAccepted = recentRows.filter(row => row.decision === 'accepted').length
    const recentDeclined = recentRows.filter(row => row.decision === 'declined').length
    const recentTotal = recentAccepted + recentDeclined
    const recentAcceptanceRate = recentTotal > 0 ? Math.round((recentAccepted / recentTotal) * 100) : 0

    return NextResponse.json({
      accepted,
      declined,
      total,
      acceptanceRate,
      last30Days: {
        accepted: recentAccepted,
        declined: recentDeclined,
        total: recentTotal,
        acceptanceRate: recentAcceptanceRate
      },
      tableMissing: false
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
