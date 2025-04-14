import express from 'express'
import cors from 'cors'

import { NEWSLETTER_PORT } from '../../../shared/network/settings'
import { db } from '../db/db'
import { newsletter_signups } from '../db/schema'

export default function createNewsletterServer() {
  const app = express()

  // Enable CORS
  app.use(
    cors({
      // Specifically allow the about subdomain
      origin: 'https://about.celestialtcg.com',
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept'],
      credentials: true,
    }),
  )

  // JSON parser for all routes
  app.use(express.json())

  // Create a router instance
  const router = express.Router()

  // Configure routes on the router
  router.post('/signup', async (req, res) => {
    try {
      const { email } = req.body

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        })
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
        })
      }

      // Insert into database
      await db.insert(newsletter_signups).values({
        email: email.toLowerCase(), // Store emails in lowercase
      })

      res.json({
        success: true,
        message: 'Successfully signed up!',
      })
    } catch (error) {
      // Handle duplicate emails
      if (error.message?.includes('unique constraint')) {
        return res.status(400).json({
          success: false,
          message: 'This email is already subscribed.',
        })
      }

      console.error('Newsletter signup error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to sign up. Please try again.',
      })
    }
  })

  // Mount the router at the prefix path
  app.use('/api/newsletter', router)

  // Start the server
  app.listen(NEWSLETTER_PORT, () => {
    console.log('Newsletter server is running on port:', NEWSLETTER_PORT)
  })
}
