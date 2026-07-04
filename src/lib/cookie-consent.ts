export const COOKIE_CONSENT_STORAGE_KEY = 'pro11_cookie_consent'

export type CookieConsentDecision = 'accepted' | 'declined'

export function isCookieConsentDecision(value: string | null | undefined): value is CookieConsentDecision {
  return value === 'accepted' || value === 'declined'
}
