import { db } from './db'
import { players } from './schema'
import { eq, sql } from 'drizzle-orm'
import { GardenSettings } from '../../../shared/settings'
import REWARD_AMOUNTS from '../../../shared/config/rewardAmounts'

export default class Garden {
  /** Index of the first plant ready to harvest, or -1. */
  private static findReadyPlotIndex(gardenState: Date[]): number {
    const now = new Date()
    for (let i = 0; i < gardenState.length; i++) {
      const plantedTime = gardenState[i]
      const hoursElapsed =
        (now.getTime() - plantedTime.getTime()) / (1000 * 60 * 60)
      if (hoursElapsed >= GardenSettings.GROWTH_TIME_HOURS) return i
    }
    return -1
  }

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

    // If garden is full but has a plant ready to harvest, harvest it then plant
    if (gardenState.length >= GardenSettings.MAX_PLANTS) {
      const readyIndex = Garden.findReadyPlotIndex(gardenState)
      if (readyIndex !== -1) {
        await Garden.harvest(playerId, readyIndex)
        return Garden.plantSeed(playerId)
      }
      return false
    }

    // Add new seed with timestamp 1 day in the past
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
    goldReward?: number
  }> {
    // Get the player's garden
    const player = await db
      .select({ garden: players.garden })
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1)

    if (!player[0]) {
      return { success: false }
    }

    const gardenState = [...player[0].garden]

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

    // Randomly select a reward from the distribution
    const reward = Math.floor(100 * Math.random())

    const goldReward =
      Math.floor(Math.random() * REWARD_AMOUNTS.harvestVariance) +
      REWARD_AMOUNTS.harvestConstant

    // Update the database with new garden state and add gold reward to coins
    await db
      .update(players)
      .set({
        garden: gardenState,
        coins: sql`${players.coins} + ${goldReward}`,
      })
      .where(eq(players.id, playerId))

    return {
      success: true,
      newGarden: gardenState,
      reward: reward,
      goldReward: goldReward,
    }
  }
}
