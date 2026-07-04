import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { completeVippsPaymentForTeam } from '@/lib/vipps-payment'
import { isVippsConfigured } from '@/lib/vipps'
import {
  forbiddenResponse,
  getCaptainSession,
  unauthorizedResponse
} from '@/lib/session'

async function canVerifyVippsPayment(
  request: NextRequest,
  teamId: string,
  reference: string
): Promise<boolean> {
  const captain = getCaptainSession(request)
  if (captain?.teamId === teamId) {
    return true
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return false

  const { data: pendingPayment } = await supabase
    .from('payments')
    .select('id, team_id, status, provider_order_id')
    .eq('provider_order_id', reference)
    .eq('team_id', teamId)
    .maybeSingle()

  return Boolean(pendingPayment)
}

export async function POST(request: NextRequest) {
  try {
    if (!isVippsConfigured()) {
      return NextResponse.json({ error: 'Vipps is not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { teamId, reference } = body

    if (!teamId || !reference) {
      return NextResponse.json({ error: 'teamId and reference are required' }, { status: 400 })
    }

    const allowed = await canVerifyVippsPayment(request, String(teamId), String(reference))
    if (!allowed) {
      const captain = getCaptainSession(request)
      if (!captain) return unauthorizedResponse()
      return forbiddenResponse()
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const result = await completeVippsPaymentForTeam(supabase, String(teamId), String(reference))
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
