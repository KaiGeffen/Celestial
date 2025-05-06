import { Achievement } from '../../shared/types/achievement'
import { db } from './db/db'
import { achievements } from './db/schema'
import { eq, and, is, sql } from 'drizzle-orm'
import GameModel from '../../shared/state/gameModel'

export class AchievementManager {
  // Get all of the achievements for player, also set them to seen
  static async getAchievements(playerId: string): Promise<Achievement[]> {
    const result = await db
      .select()
      .from(achievements)
      .where(eq(achievements.player_id, playerId))

    await db
      .update(achievements)
      .set({ seen: true })
      .where(eq(achievements.player_id, playerId))

    // TODO This won't show the first time you unlock a progress achievement, because seen will get set to true before then

    return result
  }

  // Call this on user connection
  static async onConnection(playerId: string) {
    // Unlock achievement 0 if not already unlocked
    await this.unlock(playerId, 0)

    // For achievements 1-6, unlock if 24 hours have passed since previous
    for (let i = 1; i <= 6; i++) {
      await this.unlockIf24hSincePrevious(playerId, i)
    }
  }

  static async onGamePlayed(
    playerId: string,
    game: GameModel,
    // Whether this is a pvp match
    isPvp: boolean,
    // Whether this is the player1 or player2 in a pvp match
    isPlayer1: boolean,
  ) {
    // 9: Won against another player
    if (isPvp && game.winner === (isPlayer1 ? 0 : 1)) {
      await this.unlock(playerId, 9)
    }

    // 8: Played 10 games against anyone
    await this.incrementProgress(playerId, 8)
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
          progress: 0,
          seen: false,
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
          progress: 0,
          seen: false,
        })
        .execute()
    }
  }

  // Increment the progress of an achievement, (It's automatically unlocked progress >= threshold)
  private static async incrementProgress(
    playerId: string,
    achievementId: number,
  ) {
    // Init the achievement if it doesn't exist
    await this.unlock(playerId, achievementId)

    // Increment progress
    await db
      .update(achievements)
      .set({ progress: sql`progress + 1` })
      .where(
        and(
          eq(achievements.player_id, playerId),
          eq(achievements.achievement_id, achievementId),
        ),
      )
  }

  // ...add more methods as needed (mark as seen, get all achievements, etc.)
}
