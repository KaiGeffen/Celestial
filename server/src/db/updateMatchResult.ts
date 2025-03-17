import EloRank from 'elo-rank'
import { eq, sql } from 'drizzle-orm'
import { db } from './db'
import { matchHistory, players } from './schema'
import { Deck } from '../../../shared/types/deck'

const K_FACTOR = 32 // Standard K-factor used in chess
const elo = new EloRank(K_FACTOR)
const BASE_ELO = 1000

const COIN_REWARD = 10
const GEMS_REWARD = 1

export async function updateMatchResult(
  winnerId: string | null,
  loserId: string | null,
  winnerDeck: Deck,
  loserDeck: Deck,
  roundsWLT: [number, number, number],
) {
  const winnerElo =
    winnerId === null
      ? BASE_ELO
      : await db
          .select()
          .from(players)
          .where(eq(players.id, winnerId))
          .limit(1)
          .then((result) => (result.length ? result[0].elo : BASE_ELO))

  const loserElo =
    loserId === null
      ? BASE_ELO
      : await db
          .select()
          .from(players)
          .where(eq(players.id, loserId))
          .limit(1)
          .then((result) => (result.length ? result[0].elo : BASE_ELO))

  // Update the match history database
  const username1 = await db
    .select()
    .from(players)
    .where(eq(players.id, winnerId))
    .limit(1)
    .then((result) => (result.length ? result[0].username : 'Guest'))
  const username2 = await db
    .select()
    .from(players)
    .where(eq(players.id, loserId))
    .limit(1)
    .then((result) => (result.length ? result[0].username : 'Guest'))

  // Convert avatar to number before stringifying
  winnerDeck.cosmetics.avatar = Number(winnerDeck.cosmetics.avatar)
  loserDeck.cosmetics.avatar = Number(loserDeck.cosmetics.avatar)

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

  if (winnerId !== null) {
    await db
      .update(players)
      .set({
        elo: newWinnerRating,
        wins: sql`${players.wins} + 1`,
        coins: sql`${players.coins} + ${COIN_REWARD}`,
      })
      .where(eq(players.id, winnerId))
  }
  if (loserId !== null) {
    await db
      .update(players)
      .set({
        elo: newLoserRating,
        losses: sql`${players.losses} + 1`,
      })
      .where(eq(players.id, loserId))
  }
}
