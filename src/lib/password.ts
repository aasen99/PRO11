import bcrypt from 'bcryptjs'

/** Min 6 tegn, minst én stor bokstav og ett tall */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (typeof password !== 'string' || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' }
  }
  return { valid: true }
}

const BCRYPT_ROUNDS = 10

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

/** Compare plain password with stored value (bcrypt hash or legacy plaintext) */
export async function comparePassword(plain: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || !plain) return false
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    return bcrypt.compare(plain, stored)
  }
  return plain === stored
}
