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

  // Parse JSON for regular routes
  app.use(express.json())

  // Special handling for Stripe webhook endpoint
  app.use('/webhook', express.raw({ type: 'application/json' }))

  // Create payment intent endpoint
  app.post('/create-payment-intent', async (req, res) => {
    try {
      const { googleId, gemPackage } = req.body

      if (!googleId || !gemPackage) {
        return res.status(400).json({ error: 'Missing required parameters' })
      }

      // Convert Google ID to your UUID format
      const userId = uuidv5(googleId, UUID_NAMESPACE)

      // Get package details
      const packageDetails = GEM_PACKAGES[gemPackage]
      if (!packageDetails) {
        return res.status(400).json({ error: 'Invalid gem package' })
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: packageDetails.amount,
        currency: 'usd',
        metadata: {
          userId,
          gemAmount: packageDetails.gems.toString(),
          gemPackage,
        },
      })

      // Return client secret and payment details
      res.json({
        clientSecret: paymentIntent.client_secret,
        amount: packageDetails.amount,
        gems: packageDetails.gems,
      })
    } catch (error) {
      console.error('Error creating payment intent:', error)
      res.status(500).json({ error: 'Failed to create payment intent' })
    }
  })

  // Webhook endpoint to handle successful payments
  app.post('/webhook', async (req, res) => {
    const signature = req.headers['stripe-signature']

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      )

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object
        const { userId, gemAmount } = paymentIntent.metadata

        // Update user's gem balance
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

  // Start the server
  app.listen(PAYMENT_PORT, () => {
    console.log('Payment server is running on port:', PAYMENT_PORT)
  })
}
