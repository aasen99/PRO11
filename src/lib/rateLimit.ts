/**
 * Simple in-memory rate limiter by key (e.g. IP).
 * Cleans old entries on each check to avoid unbounded growth.
 */

import type { NextRequest } from 'next/server'

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS_CAPTAIN = 10
const MAX_ATTEMPTS_ADMIN = 5

type LimitType = 'captain' | 'admin'

const store = new Map<string, { count: number; firstAt: number }>()

function getKey(identifier: string, type: LimitType): string {
  return `${type}:${identifier}`
}

function cleanup() {
  const now = Date.now()
  Array.from(store.entries()).forEach(([key, value]) => {
    if (now - value.firstAt > WINDOW_MS) store.delete(key)
  })
}

/** Check if the identifier is over the limit (call before attempting login). */
export function checkRateLimit(identifier: string, type: LimitType): { allowed: boolean; retryAfter?: number } {
  if (process.env.NODE_ENV === 'development') return { allowed: true }
  cleanup()
  const key = getKey(identifier, type)
  const max = type === 'captain' ? MAX_ATTEMPTS_CAPTAIN : MAX_ATTEMPTS_ADMIN
  const now = Date.now()
  const entry = store.get(key)

  if (!entry) return { allowed: true }
  if (now - entry.firstAt > WINDOW_MS) return { allowed: true }

  if (entry.count >= max) {
    const retryAfter = Math.ceil((entry.firstAt + WINDOW_MS - now) / 1000)
    return { allowed: false, retryAfter }
  }
  return { allowed: true }
}

/** Call this only after a failed login (wrong password etc.) to increment the attempt counter. */
export function recordFailedAttempt(identifier: string, type: LimitType): void {
  if (process.env.NODE_ENV === 'development') return
  cleanup()
  const key = getKey(identifier, type)
  const max = type === 'captain' ? MAX_ATTEMPTS_CAPTAIN : MAX_ATTEMPTS_ADMIN
  const now = Date.now()
  const entry = store.get(key)

  if (!entry) {
    store.set(key, { count: 1, firstAt: now })
    return
  }
  if (now - entry.firstAt > WINDOW_MS) {
    store.set(key, { count: 1, firstAt: now })
    return
  }
  entry.count += 1
}

export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
  return ip
}
