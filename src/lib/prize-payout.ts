export type PrizePayoutType = 'norwegian' | 'international'

export interface PrizePayoutInput {
  type: PrizePayoutType
  bankAccount?: string
  iban?: string
  swiftBic?: string
  accountHolder?: string
}

export interface PrizePayoutRecord {
  type: PrizePayoutType | null
  bankAccount: string | null
  iban: string | null
  swiftBic: string | null
  accountHolder: string | null
  submittedAt: string | null
}

const POT_PER_TEAM_TAG_REGEX = /\[POT_PER_TEAM:(\d+)\]/i

export function getPerTeamPotFromDescription(description?: string | null): number | null {
  const match = description?.match(POT_PER_TEAM_TAG_REGEX)
  const value = match?.[1]
  return value ? Number(value) : null
}

export function getTournamentPrizeAmount(params: {
  prizePool?: number | null
  entryFee?: number | null
  description?: string | null
  eligibleTeams?: number | null
  currentTeams?: number | null
}): number {
  const perTeamPot = getPerTeamPotFromDescription(params.description)
  const teamCount = Math.max(0, params.eligibleTeams ?? params.currentTeams ?? 0)
  if (perTeamPot !== null) {
    return perTeamPot * teamCount
  }
  return Math.max(0, Number(params.prizePool) || 0)
}

/** Max prize pool when pot grows per team (perTeamPot × maxTeams). Null for fixed pots. */
export function getTournamentMaxPrizeAmount(params: {
  prizePool?: number | null
  description?: string | null
  maxTeams?: number | null
}): number | null {
  const perTeamPot = getPerTeamPotFromDescription(params.description)
  if (perTeamPot === null) return null
  const maxTeams = Math.max(0, Number(params.maxTeams) || 0)
  return perTeamPot * maxTeams
}

export function formatPrizeNok(amount: number, locale: string = 'nb-NO'): string {
  return `${Math.max(0, amount).toLocaleString(locale)} NOK`
}

/** e.g. "0 / 32 000 NOK" when dynamic, otherwise just the current amount. */
export function formatPrizePoolLabel(params: {
  current: number
  max?: number | null
  locale?: string
  separator?: string
}): string {
  const locale = params.locale ?? 'nb-NO'
  const currentLabel = formatPrizeNok(params.current, locale)
  if (params.max == null || params.max <= 0) return currentLabel
  const sep = params.separator ?? '/'
  return `${params.current.toLocaleString(locale)} ${sep} ${params.max.toLocaleString(locale)} NOK`
}

export function tournamentHasConfiguredPrize(params: {
  prizePool?: number | null
  description?: string | null
  eligibleTeams?: number | null
  currentTeams?: number | null
}): boolean {
  if (getPerTeamPotFromDescription(params.description) !== null) return true
  if (Number(params.prizePool) > 0) return true
  return getTournamentPrizeAmount(params) > 0
}

export function normalizeNorwegianBankAccount(value: string): string {
  return value.replace(/\s/g, '')
}

export function normalizeIban(value: string): string {
  return value.replace(/\s/g, '').toUpperCase()
}

export function validateNorwegianBankAccount(value: string): boolean {
  const digits = normalizeNorwegianBankAccount(value)
  if (!/^\d{11}$/.test(digits)) return false

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 10; i += 1) {
    sum += Number(digits[i]) * weights[i]
  }
  const remainder = sum % 11
  const checkDigit = remainder === 0 ? 0 : 11 - remainder
  return checkDigit === Number(digits[10])
}

export function validateIban(value: string): boolean {
  const iban = normalizeIban(value)
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)
}

export function validateSwiftBic(value: string): boolean {
  const bic = value.replace(/\s/g, '').toUpperCase()
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)
}

export function validatePrizePayoutInput(
  input: PrizePayoutInput,
  isEnglish: boolean
): { valid: boolean; error?: string } {
  if (input.type === 'norwegian') {
    const account = normalizeNorwegianBankAccount(input.bankAccount || '')
    if (!account) {
      return {
        valid: false,
        error: isEnglish ? 'Account number is required.' : 'Kontonummer er påkrevd.'
      }
    }
    if (!validateNorwegianBankAccount(account)) {
      return {
        valid: false,
        error: isEnglish
          ? 'Enter a valid 11-digit Norwegian account number.'
          : 'Oppgi et gyldig norsk kontonummer (11 siffer).'
      }
    }
    return { valid: true }
  }

  const iban = normalizeIban(input.iban || '')
  const swift = (input.swiftBic || '').replace(/\s/g, '').toUpperCase()
  const holder = (input.accountHolder || '').trim()

  if (!iban) {
    return { valid: false, error: isEnglish ? 'IBAN is required.' : 'IBAN er påkrevd.' }
  }
  if (!validateIban(iban)) {
    return { valid: false, error: isEnglish ? 'Enter a valid IBAN.' : 'Oppgi et gyldig IBAN.' }
  }
  if (!swift) {
    return { valid: false, error: isEnglish ? 'SWIFT/BIC is required.' : 'SWIFT/BIC er påkrevd.' }
  }
  if (!validateSwiftBic(swift)) {
    return {
      valid: false,
      error: isEnglish ? 'Enter a valid SWIFT/BIC code.' : 'Oppgi en gyldig SWIFT/BIC-kode.'
    }
  }
  if (!holder) {
    return {
      valid: false,
      error: isEnglish ? 'Account holder name is required.' : 'Kontoinnehaver er påkrevd.'
    }
  }

  return { valid: true }
}

export function maskPrizePayout(record: PrizePayoutRecord): string {
  if (record.type === 'norwegian' && record.bankAccount) {
    const digits = normalizeNorwegianBankAccount(record.bankAccount)
    return `****${digits.slice(-4)}`
  }
  if (record.type === 'international' && record.iban) {
    const iban = normalizeIban(record.iban)
    return `${iban.slice(0, 4)} **** **** ${iban.slice(-4)}`
  }
  return '-'
}
