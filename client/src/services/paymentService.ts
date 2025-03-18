import { loadStripe } from '@stripe/stripe-js'
import { Url } from '../settings/url'
import { PAYMENT_PORT } from '../../../shared/network/settings'

const stripePromise = loadStripe(Url.stripePublishableKey)

export const paymentService = {
  // Initialize a purchase for gems
  async purchaseGems(
    gemPackage: string,
  ): Promise<{ sessionId: string; amount: number; gems: number }> {
    const response = await fetch(
      `http://localhost:${PAYMENT_PORT}/api/payments/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gemPackage,
          googleId: localStorage.getItem('googleId') || 'test-user-id',
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to create checkout: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    return response.json()
  },

  // Open Stripe Checkout
  async openCheckout(sessionId: string): Promise<boolean> {
    const stripe = await stripePromise
    if (!stripe) throw new Error('Stripe failed to initialize')

    const { error } = await stripe.redirectToCheckout({
      sessionId: sessionId,
    })

    if (error) {
      console.error('Checkout error:', error)
      return false
    }

    return true
  },
}
