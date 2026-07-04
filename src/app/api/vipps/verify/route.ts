import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { completeVippsPaymentForTeam } from '@/lib/vipps-payment'
import { isVippsConfigured } from '@/lib/vipps'
import {
  forbiddenResponse,
  getCaptainSession,
  unauthorizedResponse
} from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const captain = getCaptainSession(request)
    if (!captain) {
      return unauthorizedResponse()
    }

    if (!isVippsConfigured()) {
      return NextResponse.json({ error: 'Vipps is not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { teamId, reference } = body

    if (!teamId || !reference) {
      return NextResponse.json({ error: 'teamId and reference are required' }, { status: 400 })
    }

    if (captain.teamId !== teamId) {
      return forbiddenResponse()
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const result = await completeVippsPaymentForTeam(supabase, teamId, String(reference))
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Vipps verification failed' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      alreadyCompleted: result.alreadyCompleted || false,
      paymentId: result.paymentId,
      reference: result.reference
    })
  } catch (error) {
    console.error('Vipps verify error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Vipps verification failed' },
      { status: 500 }
    )
  }
}
