const SANDBOX_BASE = 'https://api-m.sandbox.paypal.com'
const LIVE_BASE = 'https://api-m.paypal.com'

export function getPayPalApiBase(): string {
  return process.env.PAYPAL_ENV === 'live' ? LIVE_BASE : SANDBOX_BASE
}

function getPayPalCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim()
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export async function getPayPalAccessToken(): Promise<string> {
  const creds = getPayPalCredentials()
  if (!creds) {
    throw new Error('PayPal credentials are not configured')
  }

  const auth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')
  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`PayPal auth failed: ${text}`)
  }

  const data = await response.json()
  if (!data.access_token) {
    throw new Error('PayPal auth returned no access token')
  }

  return data.access_token as string
}

export interface PayPalOrder {
  id: string
  status: string
  purchase_units?: Array<{
    amount?: { currency_code?: string; value?: string }
    payments?: {
      captures?: Array<{
        id?: string
        status?: string
        amount?: { currency_code?: string; value?: string }
      }>
    }
  }>
}

export async function getPayPalOrder(orderId: string): Promise<PayPalOrder> {
  const token = await getPayPalAccessToken()
  const response = await fetch(`${getPayPalApiBase()}/v2/checkout/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`PayPal order lookup failed: ${text}`)
  }

  return response.json()
}

export async function capturePayPalOrder(orderId: string): Promise<PayPalOrder> {
  const token = await getPayPalAccessToken()
  const response = await fetch(`${getPayPalApiBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const existing = await getPayPalOrder(orderId)
    if (existing.status === 'COMPLETED') {
      return existing
    }
    const text = await response.text()
    throw new Error(`PayPal capture failed: ${text}`)
  }

  return response.json()
}

export function getCapturedAmount(order: PayPalOrder): { value: number; currency: string } | null {
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0]
  if (capture?.amount?.value && capture.amount.currency_code) {
    return {
      value: parseFloat(capture.amount.value),
      currency: capture.amount.currency_code
    }
  }

  const unitAmount = order.purchase_units?.[0]?.amount
  if (unitAmount?.value && unitAmount.currency_code && order.status === 'COMPLETED') {
    return {
      value: parseFloat(unitAmount.value),
      currency: unitAmount.currency_code
    }
  }

  return null
}

export function amountsMatch(expected: number, paid: number): boolean {
  return Math.abs(expected - paid) < 0.01
}
