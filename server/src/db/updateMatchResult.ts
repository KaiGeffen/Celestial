import EloRank from 'elo-rank'
import { eq, sql, lt } from 'drizzle-orm'
import { db } from './db'
import { matchHistory, players } from './schema'
import { Deck } from '../../../shared/types/deck'
import Garden from './garden'

const K_FACTOR = 32 // Standard K-factor used in chess
const elo = new EloRank(K_FACTOR)

async function getPlayerData(playerId: string) {
  const result = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1)

  if (result.length === 0) {
    throw new Error(`Player with id ${playerId} not found in database`)
  }

  return result[0]
}

export async function updateMatchResultPVP(
  winnerId: string,
  loserId: string,
  winnerDeck: Deck,
  loserDeck: Deck,
  roundsWLT: [number, number, number],
) {
  // Get player data
  const winnerData = await getPlayerData(winnerId)
  const loserData = await getPlayerData(loserId)

  // Remember the match
  await insertMatchHistory(
    winnerId,
    loserId,
    winnerData,
    loserData,
    winnerDeck,
    loserDeck,
    roundsWLT,
  )

  // Plant a seed for the winner
  await Garden.plantSeed(winnerId)

  // Calculate new ELO
  // Calculate expected scores
  const expectedScoreWinner = elo.getExpected(winnerData.elo, loserData.elo)
  const expectedScoreLoser = elo.getExpected(loserData.elo, winnerData.elo)

  // Update ratings (1 for win, 0 for loss)
  const newWinnerRating = elo.updateRating(
    expectedScoreWinner,
    1,
    winnerData.elo,
  )
  const newLoserRating = elo.updateRating(expectedScoreLoser, 0, loserData.elo)

  // Update the database with new ELO for winner and loser
  await db
    .update(players)
    .set({
      elo: newWinnerRating,
      wins: sql`${players.wins} + 1`,
    })
    .where(eq(players.id, winnerId))

  await db
    .update(players)
    .set({
      elo: newLoserRating,
      losses: sql`${players.losses} + 1`,
    })
    .where(eq(players.id, loserId))
}

export async function updateMatchResultPVE(
  playerId: string,
  playerDeck: Deck,
  aiDeck: Deck,
  wasPlayerWin: boolean,
  roundsWLT: [number, number, number],
) {
  // Get player data
  const playerData = await getPlayerData(playerId)
  const aiData = {
    username: 'Computer',
    elo: 0,
  }

  const winnerId = wasPlayerWin ? playerId : null
  const loserId = wasPlayerWin ? null : playerId
  const winnerData = wasPlayerWin ? playerData : aiData
  const loserData = wasPlayerWin ? aiData : playerData
  const winnerDeck = wasPlayerWin ? playerDeck : aiDeck
  const loserDeck = wasPlayerWin ? aiDeck : playerDeck

  // Remember the match
  await insertMatchHistory(
    winnerId,
    loserId,
    winnerData,
    loserData,
    winnerDeck,
    loserDeck,
    roundsWLT,
  )

  // Plant a seed for the winner
  if (wasPlayerWin) await Garden.plantSeed(playerId)

  // Update the number of pve wins and losses
  if (wasPlayerWin) {
    await db
      .update(players)
      .set({
        pve_wins: sql`${players.pve_wins} + 1`,
      })
      .where(eq(players.id, playerId))
  } else {
    await db
      .update(players)
      .set({
        pve_losses: sql`${players.pve_losses} + 1`,
      })
      .where(eq(players.id, playerId))
  }
}

// Insert this match into the match history table
async function insertMatchHistory(
  winnerId: string | null,
  loserId: string | null,
  winnerData,
  loserData,
  winnerDeck: Deck,
  loserDeck: Deck,
  roundsWLT: [number, number, number],
) {
  // Convert avatar to number before stringifying
  winnerDeck.cosmeticSet.avatar = Number(winnerDeck.cosmeticSet.avatar)
  loserDeck.cosmeticSet.avatar = Number(loserDeck.cosmeticSet.avatar)

  await db.insert(matchHistory).values({
    player1_id: winnerId,
    player2_id: loserId,
    player1_username: winnerData.username,
    player2_username: loserData.username,
    player1_elo: winnerData.elo,
    player2_elo: loserData.elo,
    player1_deck: JSON.stringify(winnerDeck),
    player2_deck: JSON.stringify(loserDeck),
    rounds_won: roundsWLT[0],
    rounds_lost: roundsWLT[1],
    rounds_tied: roundsWLT[2],
  })
}
