import { NextResponse } from 'next/server'
import { getVippsWebhookUrl, isVippsConfigured } from '@/lib/vipps'

export async function GET() {
  return NextResponse.json({
    configured: isVippsConfigured(),
    webhookUrl: getVippsWebhookUrl(),
    environment: (process.env.VIPPS_ENV || 'production').toLowerCase()
  })
}
