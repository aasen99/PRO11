const VIPPS_PRODUCTION_BASE = 'https://api.vipps.no'
const VIPPS_TEST_BASE = 'https://apitest.vipps.no'

export function getVippsApiBase(): string {
  const env = (process.env.VIPPS_ENV || 'production').toLowerCase()
  return env === 'test' || env === 'sandbox' ? VIPPS_TEST_BASE : VIPPS_PRODUCTION_BASE
}

export function getVippsWebhookUrl(): string {
  return (
    process.env.VIPPS_WEBHOOK_URL?.trim() ||
    'https://vipps-gateway-2-0.herokuapp.com/vipps/webhook'
  )
}

function getVippsCredentials(): {
  clientId: string
  clientSecret: string
  subscriptionKey: string
  merchantSerialNumber: string
} | null {
  const clientId = process.env.VIPPS_CLIENT_ID?.trim()
  const clientSecret = process.env.VIPPS_CLIENT_SECRET?.trim()
  const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY?.trim()
  const merchantSerialNumber = process.env.VIPPS_MERCHANT_SERIAL_NUMBER?.trim()
  if (!clientId || !clientSecret || !subscriptionKey || !merchantSerialNumber) return null
  return { clientId, clientSecret, subscriptionKey, merchantSerialNumber }
}

export function isVippsConfigured(): boolean {
  return getVippsCredentials() !== null
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null

export async function getVippsAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 30_000) {
    return cachedAccessToken.token
  }

  const creds = getVippsCredentials()
  if (!creds) {
    throw new Error('Vipps credentials are not configured')
  }

  const response = await fetch(`${getVippsApiBase()}/accesstoken/get`, {
    method: 'POST',
    headers: {
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      'Ocp-Apim-Subscription-Key': creds.subscriptionKey,
      'Merchant-Serial-Number': creds.merchantSerialNumber,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Vipps auth failed: ${text}`)
  }

  const data = await response.json()
  const token = data.access_token as string | undefined
  if (!token) {
    throw new Error('Vipps auth returned no access token')
  }

  const expiresIn = Number(data.expires_in) || 3600
  cachedAccessToken = {
    token,
    expiresAt: Date.now() + expiresIn * 1000
  }

  return token
}

async function vippsRequest<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
    idempotencyKey?: string
  } = {}
): Promise<T> {
  const creds = getVippsCredentials()
  if (!creds) {
    throw new Error('Vipps credentials are not configured')
  }

  const token = await getVippsAccessToken()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Ocp-Apim-Subscription-Key': creds.subscriptionKey,
    'Merchant-Serial-Number': creds.merchantSerialNumber,
    'Content-Type': 'application/json'
  }

  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey
  }

  const response = await fetch(`${getVippsApiBase()}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Vipps API ${options.method || 'GET'} ${path} failed: ${text}`)
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}

export interface VippsMoney {
  currency: string
  value: number
}

export interface VippsPaymentResponse {
  reference: string
  state?: string
  amount?: VippsMoney
  aggregate?: {
    authorizedAmount?: VippsMoney
    capturedAmount?: VippsMoney
  }
  pspReference?: string
  redirectUrl?: string
}

export function nokToVippsAmount(amountNok: number): number {
  return Math.round(amountNok * 100)
}

export function vippsAmountToNok(amountOre: number): number {
  return Math.round(amountOre / 100)
}

export function generateVippsReference(teamId: string): string {
  const compactTeamId = teamId.replace(/-/g, '').slice(0, 12)
  const stamp = Date.now().toString(36)
  return `pro11-${compactTeamId}-${stamp}`.slice(0, 64)
}

export async function createVippsPayment(input: {
  reference: string
  amountNok: number
  returnUrl: string
  description: string
  idempotencyKey: string
}): Promise<VippsPaymentResponse> {
  return vippsRequest<VippsPaymentResponse>('/epayment/v1/payments', {
    method: 'POST',
    idempotencyKey: input.idempotencyKey,
    body: {
      amount: {
        currency: 'NOK',
        value: nokToVippsAmount(input.amountNok)
      },
      paymentMethod: {
        type: 'WALLET'
      },
      reference: input.reference,
      userFlow: 'WEB_REDIRECT',
      returnUrl: input.returnUrl,
      paymentDescription: input.description.slice(0, 100)
    }
  })
}

export async function getVippsPayment(reference: string): Promise<VippsPaymentResponse> {
  return vippsRequest<VippsPaymentResponse>(`/epayment/v1/payments/${encodeURIComponent(reference)}`)
}

export async function captureVippsPayment(
  reference: string,
  amountNok: number,
  idempotencyKey: string
): Promise<VippsPaymentResponse> {
  await vippsRequest<Record<string, never>>(
    `/epayment/v1/payments/${encodeURIComponent(reference)}/capture`,
    {
      method: 'POST',
      idempotencyKey,
      body: {
        modificationAmount: {
          currency: 'NOK',
          value: nokToVippsAmount(amountNok)
        }
      }
    }
  )

  return getVippsPayment(reference)
}

export async function waitForSuccessfulVippsPayment(
  reference: string,
  expectedAmountNok: number,
  options?: { attempts?: number; delayMs?: number }
): Promise<VippsPaymentResponse> {
  const attempts = options?.attempts ?? 10
  const delayMs = options?.delayMs ?? 1500
  let lastPayment: VippsPaymentResponse | null = null

  for (let attempt = 0; attempt < attempts; attempt++) {
    lastPayment = await getVippsPayment(reference)

    if (isVippsPaymentSuccessful(lastPayment, expectedAmountNok)) {
      if (
        isVippsPaymentCaptured(lastPayment) ||
        (lastPayment.aggregate?.capturedAmount?.value ?? 0) > 0
      ) {
        return lastPayment
      }

      if (isVippsPaymentAuthorized(lastPayment)) {
        try {
          lastPayment = await captureVippsPayment(
            reference,
            expectedAmountNok,
            `capture-${reference}-${attempt}`
          )
        } catch {
          lastPayment = await getVippsPayment(reference)
        }

        if (isVippsPaymentSuccessful(lastPayment, expectedAmountNok)) {
          return lastPayment
        }
      }
    }

    const state = normalizeVippsState(lastPayment)
    if (['CANCELLED', 'TERMINATED', 'EXPIRED', 'ABORTED'].includes(state)) {
      throw new Error(`Vipps payment ${state.toLowerCase()}`)
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs)
    }
  }

  if (lastPayment && isVippsPaymentSuccessful(lastPayment, expectedAmountNok)) {
    return lastPayment
  }

  throw new Error(
    `Vipps payment is not completed (${normalizeVippsState(lastPayment || { reference }) || 'unknown'})`
  )
}

export function normalizeVippsState(payment: VippsPaymentResponse): string {
  return String(payment.state || '').trim().toUpperCase()
}

export function isVippsPaymentCaptured(payment: VippsPaymentResponse): boolean {
  return normalizeVippsState(payment) === 'CAPTURED'
}

export function isVippsPaymentAuthorized(payment: VippsPaymentResponse): boolean {
  return normalizeVippsState(payment) === 'AUTHORIZED'
}

export function resolveVippsCapturedAmountNok(payment: VippsPaymentResponse): number | null {
  const captured = payment.aggregate?.capturedAmount?.value
  if (captured != null && captured > 0) return vippsAmountToNok(captured)
  const authorized = payment.aggregate?.authorizedAmount?.value
  if (authorized != null && authorized > 0) return vippsAmountToNok(authorized)
  if (payment.amount?.value != null && payment.amount.value > 0) {
    return vippsAmountToNok(payment.amount.value)
  }
  return null
}

export function isVippsPaymentSuccessful(
  payment: VippsPaymentResponse,
  expectedAmountNok: number
): boolean {
  const paidAmount = resolveVippsCapturedAmountNok(payment)
  if (paidAmount == null || Math.abs(expectedAmountNok - paidAmount) >= 0.01) {
    return false
  }

  const state = normalizeVippsState(payment)
  if (state === 'CAPTURED') return true
  if ((payment.aggregate?.capturedAmount?.value ?? 0) > 0) return true
  if (state === 'AUTHORIZED') return true
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function resolveVippsPspReference(payment: VippsPaymentResponse): string | null {
  return payment.pspReference || null
}
