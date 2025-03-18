import { loadStripe } from '@stripe/stripe-js'
import { Url } from '../settings/url'

const stripePromise = loadStripe(Url.stripePublishableKey)

export const paymentService = {
  // Initialize a purchase for gems
  async purchaseGems(
    gemPackage: string,
  ): Promise<{ clientSecret: string; amount: number; gems: number }> {
    const response = await fetch('/api/payments/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gemPackage }),
    })

    if (!response.ok) {
      throw new Error('Failed to create payment')
    }

    return response.json()
  },

  // Complete the payment process
  async confirmPayment(clientSecret: string): Promise<boolean> {
    const stripe = await stripePromise
    if (!stripe) throw new Error('Stripe failed to initialize')

    const { error } = await stripe.confirmCardPayment(clientSecret)
    if (error) {
      console.error('Payment error:', error)
      return false
    }

    return true
  },
}
