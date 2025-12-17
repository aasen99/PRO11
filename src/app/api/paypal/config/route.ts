import { NextResponse } from 'next/server'

export async function GET() {
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  
  return NextResponse.json({ 
    clientId: paypalClientId || null,
    configured: !!paypalClientId
  })
}

