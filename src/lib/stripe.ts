// Stripe is not currently used - PayPal is the payment provider
// This file is kept for potential future use

let stripe: any = null

export const getStripe = () => {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    
    if (!secretKey) {
      console.warn('Missing Stripe secret key - payment functionality disabled')
      return null
    }
    
    // Stripe SDK not installed - would need: npm install stripe
    // stripe = new Stripe(secretKey, {
    //   apiVersion: '2023-10-16',
    // })
  }
  
  return stripe
} 