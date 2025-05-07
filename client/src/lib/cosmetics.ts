import UserDataServer from '../network/userDataServer'
import { achievementsMeta } from '../../../shared/achievementsData'

export function getUnlockedAvatars(): Set<number> {
  const userData = UserDataServer.getUserData()
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

  return unlockedAvatars
}

export function getUnlockedBorders(): Set<number> {
  const userData = UserDataServer.getUserData()
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

  return unlockedBorders
}
