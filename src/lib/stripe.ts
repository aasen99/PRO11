import Stripe from 'stripe'

let stripe: Stripe | null = null

export const getStripe = () => {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    
    if (!secretKey) {
      console.warn('Missing Stripe secret key - payment functionality disabled')
      return null
    }
    
    stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    })
  }
  
  return stripe
} 