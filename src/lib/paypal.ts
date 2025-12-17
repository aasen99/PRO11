import { loadScript } from '@paypal/paypal-js'

let paypal: any = null

export const getPayPal = async () => {
  if (!paypal) {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    
    if (!clientId) {
      console.warn('Missing PayPal client ID - payment functionality disabled')
      return null
    }
    
    try {
      paypal = await loadScript({
        'client-id': clientId,
        currency: 'NOK',
        intent: 'capture',
        'enable-funding': 'paylater,venmo',
        'disable-funding': 'card',
        'data-sdk-integration-source': 'integrationbuilder_ac'
      })
    } catch (error) {
      console.error('Failed to load PayPal SDK:', error)
      return null
    }
  }
  
  return paypal
}

export const createPayPalOrder = async (amount: number, teamName: string) => {
  const paypalSDK = await getPayPal()
  if (!paypalSDK) {
    throw new Error('PayPal SDK not available')
  }

  return paypalSDK.Buttons({
    createOrder: (data: any, actions: any) => {
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: amount.toString(),
            currency_code: 'NOK'
          },
          description: `PRO11 Turnering - ${teamName}`
        }]
      })
    },
    onApprove: (data: any, actions: any) => {
      return actions.order.capture().then((details: any) => {
        return {
          orderID: data.orderID,
          status: details.status,
          payer: details.payer,
          amount: amount
        }
      })
    },
    onError: (err: any) => {
      console.error('PayPal error:', err)
      throw new Error('Payment failed')
    }
  })
}
