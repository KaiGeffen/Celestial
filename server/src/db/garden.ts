import { db } from './db'
import { players } from './schema'
import { eq } from 'drizzle-orm'
import { GardenSettings } from '../../../shared/settings'

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

    const gardenState = [...player[0].garden]

    // Check if there are less than max plants (can plant more)
    if (gardenState.length >= GardenSettings.MAX_PLANTS) {
      console.log(
        `Garden is full (${GardenSettings.MAX_PLANTS} plants already)`,
      )
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

  // Harvest a plant from a given plot in a player's garden
  static async harvest(
    playerId: string,
    plotNumber: number,
  ): Promise<{
    success: boolean
    newGarden?: Date[]
    reward?: number
  }> {
    if (plotNumber < 0 || plotNumber >= GardenSettings.MAX_PLANTS) {
      return { success: false }
    }

    const player = await db
      .select({ garden: players.garden })
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1)

    if (!player[0]) {
      return { success: false }
    }

    const gardenState = [...player[0].garden]

    if (plotNumber >= gardenState.length) {
      // Nothing to harvest at this plot
      return { success: false }
    }

    // Check if the plant has been growing for at least the required time
    const plantedTime = gardenState[plotNumber]
    const now = new Date()
    const hoursElapsed =
      (now.getTime() - plantedTime.getTime()) / (1000 * 60 * 60)

    if (hoursElapsed < GardenSettings.GROWTH_TIME_HOURS) {
      // Plant is not ready to harvest yet
      console.log(
        `Plant not ready to harvest. ${hoursElapsed.toFixed(1)}h elapsed, need ${GardenSettings.GROWTH_TIME_HOURS}h`,
      )
      return { success: false }
    }

    // Remove the plant at the specified plot
    gardenState.splice(plotNumber, 1)

    await db
      .update(players)
      .set({ garden: gardenState })
      .where(eq(players.id, playerId))

    return {
      success: true,
      newGarden: gardenState,
      reward: 108,
    }
  }
}
