import { NextRequest, NextResponse } from 'next/server'
import { getCaptainSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  const session = getCaptainSession(request)
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    team: {
      id: session.teamId,
      teamName: session.teamName,
      captainEmail: session.captainEmail
    }
  })
}
