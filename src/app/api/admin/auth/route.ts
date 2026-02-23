import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier, recordFailedAttempt } from '@/lib/rateLimit'
import crypto from 'crypto'

function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = crypto.createHash('sha256').update(a, 'utf8').digest()
    const bufB = crypto.createHash('sha256').update(b, 'utf8').digest()
    if (bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIdentifier(request)
    const { allowed, retryAfter } = checkRateLimit(ip, 'admin')
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Try again later.' },
        { status: 429, headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined }
      )
    }

    const body = await request.json()
    const password = typeof body?.password === 'string' ? body.password : ''

    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword || !String(adminPassword).trim()) {
      console.error('[Admin auth] ADMIN_PASSWORD is missing or empty. In Vercel: Settings → Environment Variables → ADMIN_PASSWORD must be set for Production (not only Preview).')
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    if (timingSafeEqual(password, adminPassword)) {
      return NextResponse.json({ success: true })
    }
    recordFailedAttempt(ip, 'admin')
    return NextResponse.json({ success: false, error: 'Feil passord' }, { status: 401 })
  } catch (error: any) {
    console.error('Admin auth error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

