export function normalizeCaptainName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function hasFullCaptainName(name: string | null | undefined): boolean {
  const normalized = normalizeCaptainName(name || '')
  if (!normalized) return false
  const parts = normalized.split(' ').filter(Boolean)
  if (parts.length < 2) return false
  return parts.every(part => part.length >= 2)
}

export function buildCaptainFullName(firstName: string, lastName: string): string {
  return normalizeCaptainName(`${firstName} ${lastName}`)
}

export function splitCaptainName(name: string | null | undefined): { firstName: string; lastName: string } {
  const parts = normalizeCaptainName(name || '').split(' ').filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export function validateCaptainFullName(
  name: string,
  isEnglish = false
): { valid: boolean; error?: string; fullName?: string } {
  const normalized = normalizeCaptainName(name)
  if (!normalized) {
    return {
      valid: false,
      error: isEnglish ? 'Captain name is required.' : 'Kapteinens navn er påkrevd.'
    }
  }

  const parts = normalized.split(' ').filter(Boolean)
  if (parts.length < 2) {
    return {
      valid: false,
      error: isEnglish
        ? 'Enter both first name and last name.'
        : 'Oppgi både fornavn og etternavn.'
    }
  }

  if (parts.some(part => part.length < 2)) {
    return {
      valid: false,
      error: isEnglish
        ? 'Each name must be at least 2 characters.'
        : 'Hvert navn må ha minst 2 tegn.'
    }
  }

  return { valid: true, fullName: normalized }
}

export function validateCaptainNameParts(
  firstName: string,
  lastName: string,
  isEnglish = false
): { valid: boolean; error?: string; fullName?: string } {
  return validateCaptainFullName(buildCaptainFullName(firstName, lastName), isEnglish)
}
