import { db } from './db'
import { players } from './schema'
import { eq, sql } from 'drizzle-orm'
import { GardenSettings } from '../../../shared/settings'
import REWARD_AMOUNTS from '../../../shared/config/rewardAmounts'

export default class Garden {
  // Plant a seed in an open plot in given player's garden
  static async plantSeed(playerId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Lock the row so concurrent plants can't both read the same garden and clobber each other
      const [player] = await tx
        .select({ garden: players.garden })
        .from(players)
        .where(eq(players.id, playerId))
        .for('update')
        .limit(1)

      if (!player) return false

      const gardenState = [...player.garden]

      // Don't plant if the garden is full
      if (gardenState.length >= GardenSettings.MAX_PLANTS) {
        return false
      }

      // Add a new seed planted now
      gardenState.push(new Date())

      await tx
        .update(players)
        .set({ garden: gardenState })
        .where(eq(players.id, playerId))

      return true
    })
  }

  // Harvest a plant from a given plot in a player's garden
  static async harvest(
    playerId: string,
    plotNumber: number,
  ): Promise<{
    success: boolean
    newGarden?: Date[]
    reward?: number
    goldReward?: number
    gemReward?: number
  }> {
    return await db.transaction(async (tx) => {
      // Lock the row so two rapid harvests of the same plot can't both pay out
      const [player] = await tx
        .select({ garden: players.garden })
        .from(players)
        .where(eq(players.id, playerId))
        .for('update')
        .limit(1)

      if (!player) {
        return { success: false }
      }

      const gardenState = [...player.garden]

      // Ensure plot number is valid
      if (plotNumber < 0 || plotNumber >= gardenState.length) {
        return { success: false }
      }

      // Check if the plant has been growing for at least the required time
      const plantedTime = gardenState[plotNumber]
      const now = new Date()
      const hoursElapsed =
        (now.getTime() - plantedTime.getTime()) / (1000 * 60 * 60)

      // Plant is not ready to harvest yet
      if (hoursElapsed < GardenSettings.GROWTH_TIME_HOURS) {
        console.log(
          `Plant not ready to harvest. ${hoursElapsed.toFixed(1)}h elapsed, need ${GardenSettings.GROWTH_TIME_HOURS}h`,
        )
        return { success: false }
      }

      // Remove the plant at the specified plot
      gardenState.splice(plotNumber, 1)

      // Get random gold and gem rewards
      const goldReward =
        Math.floor(Math.random() * REWARD_AMOUNTS.harvestVariance) +
        REWARD_AMOUNTS.harvestConstant

      let gemReward = 0
      if (Math.random() < REWARD_AMOUNTS.gemChance) {
        gemReward =
          Math.floor(Math.random() * REWARD_AMOUNTS.gemVariance) +
          REWARD_AMOUNTS.gemAmount
      }

      // Update the database with new garden state and add currency amounts
      await tx
        .update(players)
        .set({
          garden: gardenState,
          coins: sql`${players.coins} + ${goldReward}`,
          gems: sql`${players.gems} + ${gemReward}`,
        })
        .where(eq(players.id, playerId))

      return {
        success: true,
        newGarden: gardenState,
        goldReward: goldReward,
        gemReward: gemReward,
      }
    })
  }
}
