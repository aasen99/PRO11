import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export const ADMIN_COOKIE = 'pro11_admin_session'
export const CAPTAIN_COOKIE = 'pro11_captain_session'

const ADMIN_MAX_AGE = 24 * 60 * 60
const CAPTAIN_MAX_AGE = 7 * 24 * 60 * 60

export interface AdminSession {
  role: 'admin'
}

export interface CaptainSession {
  role: 'captain'
  teamId: string
  teamName: string
  captainEmail: string
}

type SessionPayload = (AdminSession | CaptainSession) & { exp: number }

function getSessionSecret(): string | null {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET
  return secret?.trim() || null
}

function sign(value: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url')
}

function getCookieDomain(): string | undefined {
  const explicit = process.env.COOKIE_DOMAIN?.trim()
  if (explicit) return explicit

  if (process.env.NODE_ENV !== 'production') return undefined

  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || ''
  if (!raw.trim()) return undefined

  try {
    const hostname = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.toLowerCase()
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.vercel.app')) return undefined
    const parts = hostname.split('.').filter(Boolean)
    if (parts.length >= 2) {
      return `.${parts.slice(-2).join('.')}`
    }
  } catch {
    return undefined
  }

  return undefined
}

function cookieOptions(maxAge: number) {
  const domain = getCookieDomain()
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
    ...(domain ? { domain } : {})
  }
}

export function createSessionToken(
  payload: Omit<AdminSession, never> | Omit<CaptainSession, never>,
  maxAgeSeconds: number
): string | null {
  const secret = getSessionSecret()
  if (!secret) return null

  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url')
  return `${body}.${sign(body, secret)}`
}

export function parseSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null

  const secret = getSessionSecret()
  if (!secret) return null

  const [body, signature] = token.split('.')
  if (!body || !signature || sign(body, secret) !== signature) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function getAdminSession(request: NextRequest): AdminSession | null {
  const payload = parseSessionToken(request.cookies.get(ADMIN_COOKIE)?.value)
  return payload?.role === 'admin' ? { role: 'admin' } : null
}

export function getCaptainSession(request: NextRequest): CaptainSession | null {
  const payload = parseSessionToken(request.cookies.get(CAPTAIN_COOKIE)?.value)
  if (payload?.role !== 'captain' || !payload.teamId || !payload.teamName) return null

  return {
    role: 'captain',
    teamId: payload.teamId,
    teamName: payload.teamName,
    captainEmail: payload.captainEmail || ''
  }
}

export function isUnauthorized(result: unknown): result is NextResponse {
  return result instanceof NextResponse
}

export function requireAdmin(request: NextRequest): AdminSession | NextResponse {
  const session = getAdminSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return session
}

export function requireCaptain(request: NextRequest): CaptainSession | NextResponse {
  const session = getCaptainSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return session
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export function setAdminSessionCookie(response: NextResponse): boolean {
  const token = createSessionToken({ role: 'admin' }, ADMIN_MAX_AGE)
  if (!token) return false
  response.cookies.set(ADMIN_COOKIE, token, cookieOptions(ADMIN_MAX_AGE))
  return true
}

export function setCaptainSessionCookie(
  response: NextResponse,
  session: Omit<CaptainSession, 'role'>
): boolean {
  const token = createSessionToken({ role: 'captain', ...session }, CAPTAIN_MAX_AGE)
  if (!token) return false
  response.cookies.set(CAPTAIN_COOKIE, token, cookieOptions(CAPTAIN_MAX_AGE))
  return true
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE, '', { ...cookieOptions(0), maxAge: 0 })
}

export function clearCaptainSessionCookie(response: NextResponse) {
  response.cookies.set(CAPTAIN_COOKIE, '', { ...cookieOptions(0), maxAge: 0 })
}

export function captainInMatch(
  captain: CaptainSession,
  match: { team1_name: string; team2_name: string }
): boolean {
  return match.team1_name === captain.teamName || match.team2_name === captain.teamName
}

export function isCaptainResultSubmission(body: {
  team_name?: string
  team_score1?: number
  team_score2?: number
}): boolean {
  return Boolean(body.team_name) && body.team_score1 !== undefined && body.team_score2 !== undefined
}

export function isCaptainRejectSubmission(body: {
  status?: string
  team1_submitted_score1?: number | null
}): boolean {
  return body.status === 'pending_result' && body.team1_submitted_score1 === null
}

export function isCaptainWalkoverSubmission(body: {
  status?: string
  score1?: number
  score2?: number
  team_name?: string
}): boolean {
  return (
    body.status === 'completed' &&
    body.score1 !== undefined &&
    body.score2 !== undefined &&
    !body.team_name
  )
}
