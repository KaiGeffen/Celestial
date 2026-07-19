import { db } from '../db/db'
import { cosmeticsTransactions } from '../db/schema'
import { eq } from 'drizzle-orm'
import { CosmeticSet } from '../../../shared/types/cosmeticSet'
import { achievementsMeta } from '../../../shared/achievementsData'
import avatarNames from '../../../shared/data/avatarNames'
import allPurchaseables from '../../../shared/purchaseables/index'
import { AchievementManager } from '../achievementManager'

/**
 * Whether the player owns every cosmetic in the set, mirroring the client's
 * unlock rules: all avatars are unlocked for everyone; borders come from
 * achievement unlocks or purchases; cardbacks are the default or purchases.
 */
export default async function playerOwnsCosmeticSet(
  playerId: string,
  set: CosmeticSet,
): Promise<boolean> {
  if (!set) return false

  const validAvatar =
    Number.isInteger(set.avatar) &&
    set.avatar >= 0 &&
    set.avatar < avatarNames.length
  if (!validAvatar) return false

  const border = set.border
  const cardback = set.cardback ?? 0
  if (!Number.isInteger(border) || !Number.isInteger(cardback)) return false

  // The default border and cardback are always owned
  const needsBorder = border !== 0
  const needsCardback = cardback !== 0
  if (!needsBorder && !needsCardback) return true

  // Purchases grant the border/cardback whose purchaseable has this item index
  const transactions = await db
    .select({ item_id: cosmeticsTransactions.item_id })
    .from(cosmeticsTransactions)
    .where(eq(cosmeticsTransactions.player_id, playerId))
  const ownedItemIds = new Set(transactions.map((t) => t.item_id))
  const purchased = (type: 'border' | 'cardback', itemIndex: number) =>
    allPurchaseables.some(
      (p) => p.type === type && p.itemId === itemIndex && ownedItemIds.has(p.id),
    )

  if (needsCardback && !purchased('cardback', cardback)) return false

  if (needsBorder && !purchased('border', border)) {
    // Borders can also be unlocked through achievements
    const playerAchievements =
      await AchievementManager.getAchievements(playerId)
    const unlockedByAchievement = playerAchievements.some((ach) => {
      const meta = achievementsMeta[ach.achievement_id]
      return (
        meta?.borderUnlock === border &&
        (meta.progress === undefined || ach.progress >= meta.progress)
      )
    })
    if (!unlockedByAchievement) return false
  }

  return true
}

/** The given set if the player owns it, otherwise the default set. */
export async function sanitizedCosmeticSet(
  playerId: string,
  set: CosmeticSet,
): Promise<CosmeticSet> {
  if (await playerOwnsCosmeticSet(playerId, set)) return set
  return { avatar: 0, border: 0, cardback: 0 }
}
