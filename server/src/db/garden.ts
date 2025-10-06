import { db } from './db'
import { players } from './schema'
import { eq } from 'drizzle-orm'

export default class Garden {
  // Plant a seed in an open plot in given player's garden
  static async plantSeed(playerId: string): Promise<boolean> {
    // Get current garden state
    const player = await db
      .select({ garden: players.garden })
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1)

    if (!player[0]) return false

    const gardenState = [...player[0].garden] // Copy the array

    // Check if there are less than 4 plants (can plant more)
    if (gardenState.length >= 4) {
      return false
    }

    // Add new seed with current timestamp
    gardenState.push(new Date())

    // Update the database
    await db
      .update(players)
      .set({ garden: gardenState })
      .where(eq(players.id, playerId))

    return true
  }

  static async harvest(playerId: string, plotNumber: number): Promise<boolean> {
    if (plotNumber < 0 || plotNumber > 3) return false

    const player = await db
      .select({ garden: players.garden })
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1)

    if (!player[0]) return false

    const gardenState = [...player[0].garden]

    if (plotNumber >= gardenState.length) {
      // Nothing to harvest at this plot
      return false
    }

    // Remove the plant at the specified plot
    gardenState.splice(plotNumber, 1)

    await db
      .update(players)
      .set({ garden: gardenState })
      .where(eq(players.id, playerId))

    return true // Successfully harvested
  }
}
