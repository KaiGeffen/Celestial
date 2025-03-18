import express from 'express'
import cors from 'cors'
import Stripe from 'stripe'
import { eq, sql } from 'drizzle-orm'
import { v5 as uuidv5 } from 'uuid'

import { PAYMENT_PORT, UUID_NAMESPACE } from '../../../shared/network/settings'
import { db } from '../db/db'
import { players } from '../db/schema'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
})

// Define gem packages
const GEM_PACKAGES = {
  small: { gems: 50, amount: 499 }, // $4.99
  medium: { gems: 150, amount: 999 }, // $9.99
  large: { gems: 350, amount: 1999 }, // $19.99
  huge: { gems: 750, amount: 3999 }, // $39.99
}

export default function createPaymentServer() {
  const app = express()

  // Enable CORS
  app.use(cors())

  // IMPORTANT: Raw body parser for webhook must come BEFORE json parser
  // and BEFORE the router mounting
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }))

  // JSON parser for all other routes
  app.use(express.json())

  // Debug middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`, req.body)
    next()
  })

  // Create a router instance
  const router = express.Router()

  // Configure routes on the router
  router.post('/create-checkout-session', async (req, res) => {
    console.log('Create checkout session handler triggered')
    console.log('Request body:', req.body)

    try {
      const { uuid, gemPackage } = req.body

      if (!uuid || !gemPackage) {
        return res.status(400).json({ error: 'Missing required parameters' })
      }

      // Convert Google ID to your UUID format
      const userId = uuidv5(uuid, UUID_NAMESPACE)

      // Get package details
      const packageDetails = GEM_PACKAGES[gemPackage]
      if (!packageDetails) {
        return res.status(400).json({ error: 'Invalid gem package' })
      }

      // Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${packageDetails.gems} Celestial Gems`,
                description: `Gem package for Celestial Game`,
              },
              unit_amount: packageDetails.amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin || 'http://localhost:4949'}`,
        cancel_url: `${req.headers.origin || 'http://localhost:4949'}`,
        metadata: {
          userId,
          gemAmount: packageDetails.gems.toString(),
          gemPackage,
        },
      })

      // Return session ID and payment details
      res.json({
        sessionId: session.id,
        amount: packageDetails.amount,
        gems: packageDetails.gems,
      })
    } catch (error) {
      console.error('Error creating checkout session:', error)
      res.status(500).json({ error: 'Failed to create checkout session' })
    }
  })

  // Update webhook handler to handle checkout.session.completed events
  router.post('/webhook', async (req, res) => {
    const signature = req.headers['stripe-signature']

    try {
      // Verify the webhook came from Stripe
      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      )

      // This is where payment success is handled
      if (event.type === 'checkout.session.completed') {
        // Get the payment details
        const paymentData = event.data.object
        const { userId, gemAmount } = paymentData.metadata

        // Update user's gem balance in your database
        await db
          .update(players)
          .set({
            gems: sql`${players.gems} + ${parseInt(gemAmount)}`,
          })
          .where(eq(players.id, userId))

        console.log(`Updated gems for user ${userId}: +${gemAmount}`)
      }

      res.json({ received: true })
    } catch (error) {
      console.error('Webhook error:', error)
      res.status(400).send(`Webhook Error: ${error.message}`)
    }
  })

  // Mount the router at the prefix path LAST
  app.use('/api/payments', router)

  // Start the server
  app.listen(PAYMENT_PORT, () => {
    console.log('Payment server is running on port:', PAYMENT_PORT)
  })
}
