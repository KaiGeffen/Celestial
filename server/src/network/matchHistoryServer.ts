import express from 'express'
import cors from 'cors'
import { and, desc, eq, or } from 'drizzle-orm'
import { MATCH_HISTORY_PORT } from '../../../shared/network/settings'
import { db } from '../db/db'
import { matchHistory } from '../db/schema'
import { MatchHistoryEntry } from '../../../shared/types/matchHistory'

export default function createMatchHistoryServer() {
  const app = express()

  // Enable CORS
  app.use(cors())

  // GET endpoint for match history data
  app.get('/match_history/:uuid', async (req, res) => {
    const uuid = req.params.uuid

    try {
      const matches = await db
        .select()
        .from(matchHistory)
        .where(
          or(
            eq(matchHistory.player1_id, uuid),
            eq(matchHistory.player2_id, uuid),
          ),
        )
        .orderBy(desc(matchHistory.match_date))
        .limit(50)

      // Transform the data to match our frontend expectations
      const transformedMatches: MatchHistoryEntry[] = matches.map((match) => {
        const isPlayer1 = match.player1_id === uuid
        const result: MatchHistoryEntry = {
          time: match.match_date,
          elo: isPlayer1 ? match.player1_elo : match.player2_elo,
          deck: isPlayer1
            ? JSON.parse(match.player1_deck)
            : JSON.parse(match.player2_deck),
          opponentUsername: isPlayer1
            ? match.player2_username
            : match.player1_username,
          opponentElo: isPlayer1 ? match.player2_elo : match.player1_elo,
          opponentDeck: isPlayer1
            ? JSON.parse(match.player2_deck)
            : JSON.parse(match.player1_deck),
          roundsWon: isPlayer1 ? match.rounds_won : match.rounds_lost,
          roundsLost: isPlayer1 ? match.rounds_lost : match.rounds_won,
          roundsTied: match.rounds_tied,
          wasWin: isPlayer1,
        }

        return result
      })

      res.json(transformedMatches)
    } catch (error) {
      console.error('Error fetching match history:', error)
      res.status(500).json({ error: 'Failed to fetch match history' })
    }
  })

  // Start the server
  app.listen(MATCH_HISTORY_PORT, () => {
    console.log('Match history server is running on port:', MATCH_HISTORY_PORT)
  })
}
