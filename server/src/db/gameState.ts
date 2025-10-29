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
): Promise<void> {
  const serializedState = JSON.stringify(gameState)

  await db.insert(matches).values({
    game_id: gameId,
    p1_id: p1Id,
    p2_id: p2Id,
    game_state: serializedState,
    time: new Date(),
  })
}
