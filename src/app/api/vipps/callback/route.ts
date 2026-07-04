import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { completeVippsPaymentForTeam } from '@/lib/vipps-payment'
import { isVippsConfigured } from '@/lib/vipps'

function isAuthorizedGateway(request: NextRequest): boolean {
  const secret = process.env.VIPPS_GATEWAY_SECRET?.trim()
  if (!secret) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  const gatewayHeader = request.headers.get('x-vipps-gateway-secret')
  return gatewayHeader === secret
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedGateway(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isVippsConfigured()) {
      return NextResponse.json({ error: 'Vipps is not configured' }, { status: 503 })
    }

    const body = await request.json()
    const reference = typeof body.reference === 'string' ? body.reference.trim() : ''
    const teamId = typeof body.teamId === 'string' ? body.teamId.trim() : ''

    if (!reference) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    let resolvedTeamId = teamId
    if (!resolvedTeamId) {
      const { data: payment } = await supabase
        .from('payments')
        .select('team_id')
        .eq('provider_order_id', reference)
        .maybeSingle()

      resolvedTeamId = String(payment?.team_id || '')
    }

    if (!resolvedTeamId) {
      return NextResponse.json({ error: 'teamId could not be resolved for reference' }, { status: 400 })
    }

    const result = await completeVippsPaymentForTeam(supabase, resolvedTeamId, reference)
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Vipps completion failed' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      alreadyCompleted: result.alreadyCompleted || false,
      paymentId: result.paymentId,
      teamId: resolvedTeamId,
      reference
    })
  } catch (error) {
    console.error('Vipps gateway callback error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Vipps gateway callback failed' },
      { status: 500 }
    )
  }
}
