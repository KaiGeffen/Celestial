import express from 'express'
import cors from 'cors'
import { desc, sql } from 'drizzle-orm'

import { LEADERBOARD_PORT } from '../../../shared/network/settings'
import { db } from '../db/db'
import { players } from '../db/schema'
import { logFunnelEvent } from '../db/analytics'

export default function createLeaderboardServer() {
  const app = express()

  // Enable CORS
  app.use(cors())

  // GET endpoint for leaderboard data
  app.get('/leaderboard/:uuid', async (req, res) => {
    const uuid = req.params.uuid

    // Log funnel event for leaderboard access
    logFunnelEvent(uuid, 'home_scene_options', 'leaderboard')

    try {
      const leaderboardData = await db
        .select({
          username: players.username,
          wins: players.wins,
          losses: players.losses,
          elo: players.elo,
        })
        .from(players)
        // TODO Remove once those old accounts have been deleted
        .where(sql`${players.username} != 'Player'`)
        .orderBy(desc(players.elo))
        .limit(100)

      const rankedData = leaderboardData.map((player, index) => ({
        ...player,
        rank: index + 1,
      }))

      res.json(rankedData)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      res.status(500).json({ error: 'Failed to fetch leaderboard data' })
    }
  })

  // Start the server
  app.listen(LEADERBOARD_PORT, () => {
    console.log('Leaderboard server is running on port:', LEADERBOARD_PORT)
  })
}
