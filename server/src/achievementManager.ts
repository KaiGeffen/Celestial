import { Achievement } from '../../shared/types/achievement'
import { db } from './db/db'
import { achievements } from './db/schema'
import { eq, and, is, sql } from 'drizzle-orm'
import GameModel from '../../shared/state/gameModel'
import Card from '../../shared/state/card'

export class AchievementManager {
  // Get all of the achievements for player
  static async getAchievements(playerId: string): Promise<Achievement[]> {
    const result = await db
      .select()
      .from(achievements)
      .where(eq(achievements.player_id, playerId))

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

  // Called after a game is played
  static async onGamePlayed(
    playerId: string,
    game: GameModel,
    // Whether this is a pvp match
    isPvp: boolean,
    player: number,
  ) {
    if (!playerId) return

    if (isPvp) {
      // 9: Won against another player
      if (game.winner === player) {
        await this.unlock(playerId, 9)
      }

      // 7: Played between 7-9 PM EST Wednesday
      const now = new Date()
      const day = now.getDay()
      const hours = now.getHours()
      if (day === 3 && hours >= 19 && hours <= 21) {
        await this.unlock(playerId, 7)
      }
    } else {
      // 8: Played 10 games against computer (With at least 5 rounds)
      if (game.roundResults[0].length >= 5) {
        await this.incrementProgress(playerId, 8)
      }
    }

    // 10: Earn at least 20 points in a round
    if (game.roundResults[player].some((amt: number) => amt >= 20)) {
      await this.unlock(playerId, 10)
    }

    // 11: Earn at least 30 points in a round
    if (game.roundResults[player].some((amt: number) => amt >= 30)) {
      await this.unlock(playerId, 11)
    }

    // 12: End a game with 6 or fewer cards between your deck, discard pile, and hand
    if (
      game.deck[player].length +
        game.pile[player].length +
        game.hand[player].length <=
      6
    ) {
      await this.unlock(playerId, 12)
    }

    // 14: Win a round in which you earn 0 or less points
    if (
      game.roundResults[player].some((amt: number, index) => {
        const ourPoints = amt
        const theirPoints = game.roundResults[player ^ 1][index]
        return ourPoints <= 0 && ourPoints > theirPoints
      })
    ) {
      await this.unlock(playerId, 14)
    }
  }

  // Called after an in-game action
  static async onStateUpdate(uuid1: string, uuid2: string, game: GameModel) {
    if (uuid1) {
      await this.onStateUpdateForPlayer(uuid1, game, 0)
    }
    if (uuid2) {
      await this.onStateUpdateForPlayer(uuid2, game, 1)
    }
  }

  private static async onStateUpdateForPlayer(
    playerId: string,
    game: GameModel,
    player: number,
  ) {
    // 13: Have a discard pile containing 15 or more cards
    if (game.pile[player].length >= 15) {
      await this.unlock(playerId, 13)
    }

    // 15: Have a card worth 10 or more points in your hand
    if (game.hand[player].some((card: Card) => card.points >= 10)) {
      await this.unlock(playerId, 15)
    }

    // 16: Hold The Future in hand with cost 0
    if (
      game.hand[player].some(
        (card: Card) =>
          card.name === 'The Future' && card.getCost(player, game) === 0,
      )
    ) {
      await this.unlock(playerId, 16)
    }

    // 17: Have Inspired, Nourish, and Vision at the same time
    if (
      game.status[player].inspired > 0 &&
      game.status[player].nourish > 0 &&
      game.status[player].vision > 0
    ) {
      await this.unlock(playerId, 17)
    }

    // 18: Draw 6 cards in a single round
    if (game.amtDrawn[player] >= 6) {
      await this.unlock(playerId, 18)
    }

    // 19: Have 15 or more breath
    if (game.breath[player] >= 15) {
      await this.unlock(playerId, 19)
    }
  }

  static async setAchievementsSeen(playerId: string) {
    await db
      .update(achievements)
      .set({ seen: true })
      .where(eq(achievements.player_id, playerId))
  }

  // Unlock achievementId if not already unlocked
  private static async unlock(playerId: string, achievementId: number) {
    await db
      .insert(achievements)
      .values({
        player_id: playerId,
        achievement_id: achievementId,
        progress: 0,
        seen: false,
      })
      .onConflictDoNothing()
      .execute()
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
