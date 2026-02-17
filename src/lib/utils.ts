export const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/** Client-safe validation: min 6 chars, 1 uppercase, 1 number. Error message key for i18n. */
export function validatePasswordClient(password: string): { valid: boolean; errorKey?: string } {
  if (typeof password !== 'string' || password.length < 6) {
    return { valid: false, errorKey: 'password_min_length' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, errorKey: 'password_uppercase' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, errorKey: 'password_number' }
  }
  return { valid: true }
}

export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('nb-NO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK'
  }).format(amount)
} 