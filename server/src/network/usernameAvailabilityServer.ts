import express from 'express'
import cors from 'cors'
import { eq, sql } from 'drizzle-orm'

import { USERNAME_AVAILABILITY_PORT } from '../../../shared/network/settings'
import { db } from '../db/db'
import { players } from '../db/schema'

export default function createUsernameAvailabilityServer() {
  const app = express()
  app.use(cors())

  app.get('/check_username_availability/:username', async (req, res) => {
    try {
      const username = req.params.username
      const existingUser = await db
        .select({ username: players.username })
        .from(players)
        .where(sql`LOWER(${players.username}) = LOWER(${username})`)
        .limit(1)

      res.json({ exists: existingUser.length > 0 })
    } catch (error) {
      console.error('Error checking username:', error)
      res.status(500).json({ error: 'Failed to check username' })
    }
  })

  app.listen(USERNAME_AVAILABILITY_PORT, () => {
    console.log(
      'Username check server is running on port:',
      USERNAME_AVAILABILITY_PORT,
    )
  })
}
