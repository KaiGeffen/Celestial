import express from 'express'
import cors from 'cors'
import { sql } from 'drizzle-orm'

import { REFERRAL_COUNT_PORT } from '../../../shared/network/settings'
import { db } from '../db/db'
import { players, approvedRefs } from '../db/schema'

export default function createReferralCountServer() {
  const app = express()

  app.use(cors())

  app.get('/ref-count', async (req, res) => {
    const referrer = (req.query.ref as string)?.trim()

    // No ref given
    if (!referrer) {
      res.json({ count: -1 })
      return
    }
    const allowed = await db
      .select({ code: approvedRefs.code })
      .from(approvedRefs)
      .where(sql`LOWER(${approvedRefs.code}) = LOWER(${referrer})`)
      .limit(1)
    // Given ref isn't in the approved list
    if (allowed.length === 0) {
      res.json({ count: -1 })
      return
    }
    // Otherwise, fetch the count of sign ups for the given ref code
    try {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(players)
        .where(sql`LOWER(${players.ref}) = LOWER(${referrer})`)
      const count = result[0]?.count ?? 0
      res.json({ count })
    } catch (error) {
      console.error('Error fetching referral count:', error)
      res.status(500).json({ error: 'Failed to fetch referral count' })
    }
  })

  app.listen(REFERRAL_COUNT_PORT, () => {
    console.log(
      'Referral count server is running on port:',
      REFERRAL_COUNT_PORT,
    )
  })
}
