import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isCookieConsentDecision } from '@/lib/cookie-consent'
import { getClientIdentifier } from '@/lib/rateLimit'

const WINDOW_MS = 60 * 60 * 1000
const MAX_REQUESTS = 20
const rateStore = new Map<string, { count: number; firstAt: number }>()

function checkCookieConsentRateLimit(identifier: string): boolean {
  const now = Date.now()
  const entry = rateStore.get(identifier)
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    rateStore.set(identifier, { count: 1, firstAt: now })
    return true
  }
  if (entry.count >= MAX_REQUESTS) return false
  entry.count += 1
  return true
}

export async function POST(request: NextRequest) {
  try {
    const identifier = getClientIdentifier(request)
    if (!checkCookieConsentRateLimit(identifier)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const decision = body.decision
    const language = typeof body.language === 'string' ? body.language.slice(0, 10) : null

    if (!isCookieConsentDecision(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ success: true, stored: false })
    }

    const userAgent = request.headers.get('user-agent')

    const { error } = await supabase.from('cookie_consent_events').insert({
      decision,
      language,
      user_agent: userAgent
    })

    if (error) {
      console.error('Cookie consent insert error:', error)
      return NextResponse.json({ success: true, stored: false })
    }

    return NextResponse.json({ success: true, stored: true })
  } catch (error) {
    console.error('Cookie consent error:', error)
    return NextResponse.json({ error: 'Failed to store consent' }, { status: 500 })
  }
}
