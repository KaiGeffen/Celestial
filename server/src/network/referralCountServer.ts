import express from 'express'
import cors from 'cors'
import { sql } from 'drizzle-orm'

import { REFERRAL_COUNT_PORT } from '../../../shared/network/settings'
import { db } from '../db/db'
import { players } from '../db/schema'
import { APPROVED_REFERRERS } from '../approvedReferrers'

export default function createReferralCountServer() {
  const app = express()

  app.use(cors())

  app.get('/ref-count', async (req, res) => {
    const referrer = (req.query.ref as string)?.trim()
    // If the given ref isn't in the approved list, return -1
    const referrerLower = referrer.toLowerCase()
    if (!APPROVED_REFERRERS.includes(referrerLower)) {
      res.json({ count: -1 })
      return
    }
    try {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(players)
        .where(sql`LOWER(${players.referrer}) = LOWER(${referrer})`)
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
