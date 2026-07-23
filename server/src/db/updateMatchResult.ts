import EloRank from 'elo-rank'
import { eq, sql } from 'drizzle-orm'
import { db } from './db'
import { matchHistory, missionStats, players } from './schema'
import { Deck } from '../../../shared/types/deck'
import Garden from './garden'

const K_FACTOR = 32 // Standard K-factor used in chess
const elo = new EloRank(K_FACTOR)

// The transaction handle passed to db.transaction callbacks (same query API as db).
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

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
  matchQualifiesForRewards: boolean,
) {
  // Get player data
  const winnerData = await getPlayerData(winnerId)
  const loserData = await getPlayerData(loserId)

  // Calculate new ELO (1 for win, 0 for loss)
  const expectedScoreWinner = elo.getExpected(winnerData.elo, loserData.elo)
  const expectedScoreLoser = elo.getExpected(loserData.elo, winnerData.elo)
  const newWinnerRating = elo.updateRating(
    expectedScoreWinner,
    1,
    winnerData.elo,
  )
  const newLoserRating = elo.updateRating(expectedScoreLoser, 0, loserData.elo)

  // Record the match and both players' updated stats atomically, so a failure
  // can't leave one player's ELO/record updated without the other's.
  await db.transaction(async (tx) => {
    await insertMatchHistory(
      tx,
      winnerId,
      loserId,
      winnerData,
      loserData,
      winnerDeck,
      loserDeck,
      roundsWLT,
    )

    // Bump lifetime and current-month PVP records, and raise the winner's peak
    // ELO if they hit a new high. Gems are a reward, so they're only granted
    // when the match qualifies — otherwise instant-surrender matches mint them.
    await tx
      .update(players)
      .set({
        elo: newWinnerRating,
        elo_peak: sql`GREATEST(${players.elo_peak}, ${newWinnerRating})`,
        pvp_wins_lifetime: sql`${players.pvp_wins_lifetime} + 1`,
        pvp_wins_month: sql`${players.pvp_wins_month} + 1`,
        ...(matchQualifiesForRewards ? { gems: sql`${players.gems} + 1` } : {}),
      })
      .where(eq(players.id, winnerId))

    await tx
      .update(players)
      .set({
        elo: newLoserRating,
        pvp_losses_lifetime: sql`${players.pvp_losses_lifetime} + 1`,
        pvp_losses_month: sql`${players.pvp_losses_month} + 1`,
        ...(matchQualifiesForRewards ? { gems: sql`${players.gems} + 1` } : {}),
      })
      .where(eq(players.id, loserId))
  })

  // Plant a seed for both players (reward side-effect, gated)
  if (matchQualifiesForRewards) {
    await Garden.plantSeed(winnerId)
    await Garden.plantSeed(loserId)
  }
}

export async function updateMatchResultPVE(
  playerId: string,
  playerDeck: Deck,
  aiDeck: Deck,
  wasPlayerWin: boolean,
  roundsWLT: [number, number, number],
  matchQualifiesForRewards: boolean,
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

  // Record the match and the player's updated win/loss count atomically.
  await db.transaction(async (tx) => {
    await insertMatchHistory(
      tx,
      winnerId,
      loserId,
      winnerData,
      loserData,
      winnerDeck,
      loserDeck,
      roundsWLT,
    )

    if (wasPlayerWin) {
      await tx
        .update(players)
        .set({ pve_wins: sql`${players.pve_wins} + 1` })
        .where(eq(players.id, playerId))
    } else {
      await tx
        .update(players)
        .set({ pve_losses: sql`${players.pve_losses} + 1` })
        .where(eq(players.id, playerId))
    }
  })

  // Plant a seed (reward side-effect)
  if (matchQualifiesForRewards || wasPlayerWin) {
    await Garden.plantSeed(playerId)
  }
}

/** Set bit at index to 1; pad with '0' if needed. */
function setBitInBitstring(bitstring: string, index: number): string {
  const arr = bitstring.split('')
  while (arr.length <= index) arr.push('0')
  arr[index] = '1'
  return arr.join('')
}

/**
 * Mark one or more missions complete for a player
 * Used by tutorial completion and the Skip-Tutorials action
 */
export async function markMissionsComplete(
  playerId: string,
  missionIDs: number[],
): Promise<void> {
  const [row] = await db
    .select({ completedmissions: players.completedmissions })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1)
  if (row == null) return

  let completedmissions = row.completedmissions ?? ''
  for (const id of missionIDs) {
    completedmissions = setBitInBitstring(completedmissions, id)
  }
  await db
    .update(players)
    .set({ completedmissions })
    .where(eq(players.id, playerId))
}

/** Increment global win/loss counts for a mission (indexed by mission id). */
export async function recordMissionOutcome(
  missionId: number,
  playerWon: boolean,
): Promise<void> {
  await db
    .insert(missionStats)
    .values(
      playerWon
        ? { mission_id: missionId, wins: 1, losses: 0 }
        : { mission_id: missionId, wins: 0, losses: 1 },
    )
    .onConflictDoUpdate({
      target: missionStats.mission_id,
      set: playerWon
        ? { wins: sql`${missionStats.wins} + 1` }
        : { losses: sql`${missionStats.losses} + 1` },
    })
}

/** When player wins a journey mission, mark mission complete and unlock cards on the server. */
export async function updateJourneyProgress(
  playerId: string,
  missionID: number,
  missionCards: number[],
): Promise<void> {
  const [row] = await db
    .select({
      completedmissions: players.completedmissions,
      inventory: players.inventory,
    })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1)

  if (row == null) return

  let completedmissions = row.completedmissions ?? ''
  let inventory = row.inventory ?? ''

  completedmissions = setBitInBitstring(completedmissions, missionID)
  for (const cardId of missionCards) {
    inventory = setBitInBitstring(inventory, cardId)
  }

  await db
    .update(players)
    .set({ completedmissions, inventory })
    .where(eq(players.id, playerId))
}

// Insert this match into the match history table (within the given transaction)
async function insertMatchHistory(
  tx: Tx,
  winnerId: string | null,
  loserId: string | null,
  winnerData: { username: string; elo: number },
  loserData: { username: string; elo: number },
  winnerDeck: Deck,
  loserDeck: Deck,
  roundsWLT: [number, number, number],
) {
  // Serialize without mutating the caller's deck (normalize avatar to a number).
  const serializeDeck = (deck: Deck) =>
    JSON.stringify({
      ...deck,
      cosmeticSet: {
        ...deck.cosmeticSet,
        avatar: Number(deck.cosmeticSet.avatar),
      },
    })

  await tx.insert(matchHistory).values({
    player1_id: winnerId,
    player2_id: loserId,
    player1_username: winnerData.username,
    player2_username: loserData.username,
    player1_elo: winnerData.elo,
    player2_elo: loserData.elo,
    player1_deck: serializeDeck(winnerDeck),
    player2_deck: serializeDeck(loserDeck),
    rounds_won: roundsWLT[0],
    rounds_lost: roundsWLT[1],
    rounds_tied: roundsWLT[2],
  })
}
