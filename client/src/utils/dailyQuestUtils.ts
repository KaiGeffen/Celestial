/**
 * Utility functions for managing daily quests
 */

import UserDataServer from '../network/userDataServer'

/**
 * Checks if a daily quest is available based on the last reward timestamp
 * @returns boolean indicating if a quest is available
 */
export function isDailyQuestAvailable(): boolean {
  const now = new Date()
  const lastReward = new Date(UserDataServer.lastDailyReward)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  return lastReward < oneDayAgo
}

/**
 * Calculates the time until the next quest will be available
 * @returns Formatted string showing time until next quest
 */
export function getTimeUntilNextQuest(): string {
  if (!UserDataServer.isLoggedIn() || !UserDataServer.lastDailyReward) {
    throw new Error(
      'Daily quest is not available: User is not logged in or last daily reward is not set.',
    )
  }

  const now = new Date()
  const lastReward = new Date(UserDataServer.lastDailyReward)
  const nextRewardTime = new Date(lastReward.getTime() + 24 * 60 * 60 * 1000)

  // Calculate hours, minutes, and seconds until next quest
  const diffMs = nextRewardTime.getTime() - now.getTime()
  const diffHrs = String(Math.floor(diffMs / (1000 * 60 * 60))).padStart(2, '0')
  const diffMins = String(
    Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
  ).padStart(2, '0')
  const diffSecs = String(Math.floor((diffMs % (1000 * 60)) / 1000)).padStart(
    2,
    '0',
  )

  return `${diffHrs}h ${diffMins}m ${diffSecs}s`
}
