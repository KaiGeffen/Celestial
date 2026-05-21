import Server from '../server'
import { achievementsMeta } from '../../../shared/achievementsData'
import {
  borders,
  cardbacks,
  Purchaseable,
} from '../../../shared/purchaseables/index'
import borderNames from '../data/borderNames'
import cardbackNames from '../data/cardbackNames'

export function getCosmeticImageKey(item: Purchaseable): string {
  if (item.type === 'border') {
    return `border-${borderNames[item.itemId]}`
  } else {
    return `cardback-${cardbackNames[item.itemId]}`
  }
}

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

  // Default border
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

  // Add borders unlocked through purchases
  const ownedItemIds = new Set(userData.ownedItems ?? [])
  borders.forEach((border) => {
    if (ownedItemIds.has(border.id)) {
      unlockedBorders.add(border.itemId)
    }
  })

  // Sort and return
  return Array.from(unlockedBorders).sort((a, b) => a - b)
}

export function getUnlockedCardbacks(): number[] {
  const ownedItemIds = new Set(Server.getUserData().ownedItems ?? [])
  const unlockedCardbacks = new Set<number>()

  // Default cardback (0)
  unlockedCardbacks.add(0)

  // Add cardbacks unlocked through purchases
  cardbacks.forEach((cardback) => {
    if (ownedItemIds.has(cardback.id)) {
      unlockedCardbacks.add(cardback.itemId)
    }
  })

  return Array.from(unlockedCardbacks).sort((a, b) => a - b)
}
