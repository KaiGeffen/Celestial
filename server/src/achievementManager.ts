import { db } from './db/db'
import { achievements } from './db/schema'
import { eq, and } from 'drizzle-orm'

export class AchievementManager {
  // Call this on user connection
  static async onConnection(playerId: string) {
    console.log('onConnection', playerId)
    // Unlock achievement 0 if not already unlocked
    await this.unlock(playerId, 0)

    // For achievements 1-6, unlock if 24 hours have passed since previous
    for (let i = 1; i <= 6; i++) {
      await this.unlockIf24hSincePrevious(playerId, i)
    }
  }

  // Unlock achievementId if not already unlocked
  private static async unlock(playerId: string, achievementId: number) {
    const existing = await db
      .select()
      .from(achievements)
      .where(
        and(
          eq(achievements.player_id, playerId),
          eq(achievements.achievement_id, achievementId),
        ),
      )
      .limit(1)
    if (existing.length === 0) {
      await db
        .insert(achievements)
        .values({
          player_id: playerId,
          achievement_id: achievementId,
        })
        .execute()
    }
  }

  // Unlock achievementId if 24h have passed since previous achievement was unlocked
  private static async unlockIf24hSincePrevious(
    playerId: string,
    achievementId: number,
  ) {
    // Check if already unlocked
    const existing = await db
      .select()
      .from(achievements)
      .where(
        and(
          eq(achievements.player_id, playerId),
          eq(achievements.achievement_id, achievementId),
        ),
      )
      .limit(1)
    if (existing.length > 0) return

    // Get previous achievement
    const prev = await db
      .select()
      .from(achievements)
      .where(
        and(
          eq(achievements.player_id, playerId),
          eq(achievements.achievement_id, achievementId - 1),
        ),
      )
      .limit(1)
    if (prev.length === 0) return
    const prevUnlocked = prev[0].date_unlocked
    if (!prevUnlocked) return

    const now = new Date()
    const prevDate = new Date(prevUnlocked)
    const diffMs = now.getTime() - prevDate.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    if (diffHours >= 24) {
      await db
        .insert(achievements)
        .values({
          player_id: playerId,
          achievement_id: achievementId,
        })
        .execute()
    }
  }

  // ...add more methods as needed (mark as seen, get all achievements, etc.)
}
