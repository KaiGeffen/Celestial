import Server from '../server'
import { achievementsMeta } from '../../../shared/achievementsData'

export function getUnlockedAvatars(): number[] {
  const userData = Server.getUserData()
  const unlockedAvatars = new Set<number>()

  // Default avatars
  unlockedAvatars.add(0)
  unlockedAvatars.add(1)

  // Add avatars unlocked through achievements
  userData.achievements.forEach((achievement) => {
    const meta = achievementsMeta[achievement.achievement_id]
    if (meta?.iconUnlock !== undefined) {
      // Only unlock if progress requirement is met
      if (
        meta.progress === undefined ||
        achievement.progress >= meta.progress
      ) {
        unlockedAvatars.add(meta.iconUnlock)
      }
    }
  })

  // TODO Decide how to handle avatar unlocks, for now just have them all unlocked
  for (let i = 0; i < 6; i++) {
    unlockedAvatars.add(i)
  }

  // Return a sorted array
  return Array.from(unlockedAvatars).sort((a, b) => a - b)
}

export function getUnlockedBorders(): number[] {
  const userData = Server.getUserData()
  const unlockedBorders = new Set<number>()

  // Default border (0)
  unlockedBorders.add(0)

  // Add borders unlocked through achievements
  userData.achievements.forEach((achievement) => {
    const meta = achievementsMeta[achievement.achievement_id]
    if (meta?.borderUnlock !== undefined) {
      // Only unlock if progress requirement is met
      if (
        meta.progress === undefined ||
        achievement.progress >= meta.progress
      ) {
        unlockedBorders.add(meta.borderUnlock)
      }
    }
  })

  // Sort and return
  return Array.from(unlockedBorders).sort((a, b) => a - b)
}
