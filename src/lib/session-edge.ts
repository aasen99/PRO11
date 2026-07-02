import { NextRequest } from 'next/server'

export const ADMIN_COOKIE = 'pro11_admin_session'

type AdminPayload = { role: 'admin'; exp: number }

function getSessionSecret(): string | null {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET
  return secret?.trim() || null
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return bytesToBase64Url(new Uint8Array(signature))
}

async function parseAdminToken(token: string | undefined): Promise<AdminPayload | null> {
  if (!token) return null

  const secret = getSessionSecret()
  if (!secret) return null

  const [body, signature] = token.split('.')
  if (!body || !signature || (await sign(body, secret)) !== signature) return null

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as AdminPayload
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload.role === 'admin' ? payload : null
  } catch {
    return null
  }
}

export async function getAdminSession(request: NextRequest): Promise<boolean> {
  const payload = await parseAdminToken(request.cookies.get(ADMIN_COOKIE)?.value)
  return payload?.role === 'admin'
}
