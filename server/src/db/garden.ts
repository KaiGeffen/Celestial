import { db } from './db'
import { players } from './schema'
import { eq, sql } from 'drizzle-orm'
import { GardenSettings } from '../../../shared/settings'
import REWARD_AMOUNTS from '../../../shared/config/rewardAmounts'

// The transaction handle passed to db.transaction callbacks (same query API as db).
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

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

  // Removes the plant at plotNumber from gardenState (in place) and credits its
  // reward, using the caller's already-locked transaction. Caller is responsible
  // for persisting the resulting gardenState.
  private static async harvestPlot(
    tx: Tx,
    playerId: string,
    gardenState: Date[],
    plotNumber: number,
  ): Promise<{ goldReward: number; gemReward: number }> {
    gardenState.splice(plotNumber, 1)

    const goldReward =
      Math.floor(Math.random() * REWARD_AMOUNTS.harvestVariance) +
      REWARD_AMOUNTS.harvestConstant

    let gemReward = 0
    if (Math.random() < REWARD_AMOUNTS.gemChance) {
      gemReward =
        Math.floor(Math.random() * REWARD_AMOUNTS.gemVariance) +
        REWARD_AMOUNTS.gemAmount
    }

    await tx
      .update(players)
      .set({
        coins: sql`${players.coins} + ${goldReward}`,
        gems: sql`${players.gems} + ${gemReward}`,
      })
      .where(eq(players.id, playerId))

    return { goldReward, gemReward }
  }

  // Plant a seed in an open plot in given player's garden. If the garden is
  // full, harvest whatever's ready first to make room, same as a manual
  // harvest would — a match ending shouldn't waste the seed it earned.
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

      if (gardenState.length >= GardenSettings.MAX_PLANTS) {
        const readyIndex = Garden.findReadyPlotIndex(gardenState)
        // Garden's full and nothing's ready yet — nowhere to put the new seed
        if (readyIndex === -1) return false
        await Garden.harvestPlot(tx, playerId, gardenState, readyIndex)
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

      const { goldReward, gemReward } = await Garden.harvestPlot(
        tx,
        playerId,
        gardenState,
        plotNumber,
      )

      // Persist the updated garden (harvestPlot already credited the currency)
      await tx
        .update(players)
        .set({ garden: gardenState })
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
