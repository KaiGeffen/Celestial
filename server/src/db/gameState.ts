import { db } from './db'
import { matches } from './schema'
import { eq, or, desc, and, sql } from 'drizzle-orm'
import GameModel from '../../../shared/state/gameModel'

/**
 * Save game state to database.
 * Creates a new row each time (preserving full game history).
 * Use this for both initial game creation and all subsequent state changes.
 */
export async function saveGameState(
  gameId: string,
  p1Id: string,
  p2Id: string | null,
  gameState: GameModel,
  isOver: boolean = false,
): Promise<void> {
  const serializedState = JSON.stringify(gameState)

  await db.insert(matches).values({
    game_id: gameId,
    p1_id: p1Id,
    p2_id: p2Id,
    game_state: serializedState,
    time: new Date(),
    is_over: isOver,
  })
}

/**
 * Find the most recent active game for a player
 */
export async function findActiveGame(playerId: string): Promise<{
  gameId: string
  p1Id: string
  p2Id: string | null
  gameState: GameModel
} | null> {
  const result = await db
    .select()
    .from(matches)
    .where(
      and(
        or(eq(matches.p1_id, playerId), eq(matches.p2_id, playerId)),
        eq(matches.is_over, false),
      ),
    )
    .orderBy(desc(matches.time))
    .limit(1)

  if (result.length === 0) {
    return null
  }

  const game = result[0]

  // Deserialize the game state
  const gameState = JSON.parse(game.game_state)

  return {
    gameId: game.game_id,
    p1Id: game.p1_id,
    p2Id: game.p2_id,
    gameState: gameState,
  }
}

/**
 * Cleanup abandoned games (optional - can be called periodically)
 * Finds games that haven't been updated recently and marks them as over
 * by inserting a final state with is_over=true
 */
export async function cleanupAbandonedGames(
  timeoutMinutes: number = 60,
): Promise<number> {
  const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000)

  // Find games that are still active but haven't been updated recently
  // We look for game_ids where the most recent row is old and not marked as over
  const abandonedGames = await db
    .select()
    .from(matches)
    .where(
      and(eq(matches.is_over, false), sql`${matches.time} < ${cutoffTime}`),
    )
    .orderBy(desc(matches.time))

  // Group by game_id and get the most recent entry for each
  const uniqueGames = new Map<string, (typeof abandonedGames)[0]>()
  for (const game of abandonedGames) {
    if (!uniqueGames.has(game.game_id)) {
      uniqueGames.set(game.game_id, game)
    }
  }

  // Insert a final row for each abandoned game with is_over=true
  let count = 0
  for (const game of uniqueGames.values()) {
    await saveGameState(
      game.game_id,
      game.p1_id,
      game.p2_id,
      JSON.parse(game.game_state),
      true,
    )
    count++
  }

  return count
}
