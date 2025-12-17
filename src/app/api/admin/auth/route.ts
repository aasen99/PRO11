import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    // Get admin password from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD || 'pro11admin2025'

    if (password === adminPassword) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: 'Feil passord' }, { status: 401 })
    }
  } catch (error: any) {
    console.error('Admin auth error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

