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
          cosmetic_set: players.cosmetic_set,
        })
        .from(players)
        .where(
          sql`${players.username} != 'Guest' AND (${players.wins} + ${players.losses}) > 0`,
        )
        .orderBy(desc(players.elo))
        .limit(1000)

      const rankedData = leaderboardData.map((player, index) => {
        let cosmeticSet
        try {
          cosmeticSet = JSON.parse(player.cosmetic_set)
        } catch (e) {
          // Default to avatar 0, border 0 if parsing fails
          cosmeticSet = { avatar: 0, border: 0 }
        }
        return {
          username: player.username,
          wins: player.wins,
          losses: player.losses,
          elo: player.elo,
          cosmeticSet,
          rank: index + 1,
        }
      })

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
