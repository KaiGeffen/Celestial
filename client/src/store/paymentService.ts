import { loadStripe } from '@stripe/stripe-js'
import { Url } from '../settings/url'
import { PAYMENT_PORT } from '../../../shared/network/settings'
import { Flags } from '../settings/flags'
import Server from '../server'

export const paymentService = {
  // Initialize a purchase for gems
  async purchaseGems(
    gemPackage: string,
  ): Promise<{ sessionId: string; amount: number; gems: number }> {
    const uuid = Server.getUserData().uuid
    if (!uuid) throw new Error('Must be logged in to purchase gems')

    // Get the base URL
    const baseUrl = Flags.local
      ? `http://localhost:${PAYMENT_PORT}`
      : window.location.origin

    const response = await fetch(
      `${baseUrl}/api/payments/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid,
          gemPackage,
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
    const stripe = await loadStripe(Url.stripePublishableKey)
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
