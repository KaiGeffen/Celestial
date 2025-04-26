import EloRank from 'elo-rank'
import { eq, sql, lt } from 'drizzle-orm'
import { db } from './db'
import { matchHistory, players } from './schema'
import { Deck } from '../../../shared/types/deck'

const K_FACTOR = 32 // Standard K-factor used in chess
const elo = new EloRank(K_FACTOR)
const BASE_ELO = 1000

const DAILY_COIN_REWARD = 10
const GEMS_REWARD = 1

export async function updateMatchResult(
  winnerId: string | null,
  loserId: string | null,
  winnerDeck: Deck,
  loserDeck: Deck,
  roundsWLT: [number, number, number],
) {
  // Get player data
  const winnerData =
    winnerId === null
      ? null
      : await db
          .select()
          .from(players)
          .where(eq(players.id, winnerId))
          .limit(1)
          .then((result) => (result.length ? result[0] : null))

  const loserData =
    loserId === null
      ? null
      : await db
          .select()
          .from(players)
          .where(eq(players.id, loserId))
          .limit(1)
          .then((result) => (result.length ? result[0] : null))

  const winnerElo = winnerData?.elo || BASE_ELO
  const loserElo = loserData?.elo || BASE_ELO
  const username1 = winnerData?.username || 'Guest'
  const username2 = loserData?.username || 'Guest'

  // Convert avatar to number before stringifying
  winnerDeck.cosmeticSet.avatar = Number(winnerDeck.cosmeticSet.avatar)
  loserDeck.cosmeticSet.avatar = Number(loserDeck.cosmeticSet.avatar)

  await db.insert(matchHistory).values({
    player1_id: winnerId,
    player2_id: loserId,
    player1_username: username1,
    player2_username: username2,
    player1_elo: winnerElo,
    player2_elo: loserElo,
    player1_deck: JSON.stringify(winnerDeck),
    player2_deck: JSON.stringify(loserDeck),
    rounds_won: roundsWLT[0],
    rounds_lost: roundsWLT[1],
    rounds_tied: roundsWLT[2],
  })

  // Calculate expected scores
  const expectedScoreWinner = elo.getExpected(winnerElo, loserElo)
  const expectedScoreLoser = elo.getExpected(loserElo, winnerElo)

  // Update ratings (1 for win, 0 for loss)
  const newWinnerRating = elo.updateRating(expectedScoreWinner, 1, winnerElo)
  const newLoserRating = elo.updateRating(expectedScoreLoser, 0, loserElo)

  // Check if players are eligible for daily rewards
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  if (winnerId !== null) {
    // Check if winner qualifies for daily reward
    const winnerDailyReward =
      winnerData && new Date(winnerData.last_daily_reward) < oneDayAgo
        ? {
            coins: sql`${players.coins} + ${DAILY_COIN_REWARD}`,
            last_daily_reward: sql`now()`,
          }
        : {}

    await db
      .update(players)
      .set({
        elo: newWinnerRating,
        wins: sql`${players.wins} + 1`,
        ...winnerDailyReward,
      })
      .where(eq(players.id, winnerId))
  }

  if (loserId !== null) {
    // Check if loser qualifies for daily reward
    const loserDailyReward =
      loserData && new Date(loserData.last_daily_reward) < oneDayAgo
        ? {
            coins: sql`${players.coins} + ${DAILY_COIN_REWARD}`,
            last_daily_reward: sql`now()`,
          }
        : {}

    await db
      .update(players)
      .set({
        elo: newLoserRating,
        losses: sql`${players.losses} + 1`,
        ...loserDailyReward,
      })
      .where(eq(players.id, loserId))
  }
}
