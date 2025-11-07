import { db } from '../db/db'
import { players } from '../db/schema'
import { eq } from 'drizzle-orm'
import { ServerWS } from '../../../shared/network/celestialTypedWebsocket'
import { Deck } from '../../../shared/types/deck'
import { cosmeticsTransactions } from '../db/schema'
import { AchievementManager } from '../achievementManager'

// Send the user their full data
export default async function sendUserData(ws: ServerWS, id: string) {
  // Get user's data
  const result = await db
    .select()
    .from(players)
    .where(eq(players.id, id))
    .limit(1)

  if (result.length === 0) return
  const data = result[0]

  // Parse decks
  let decks: Deck[] = []
  try {
    decks = data.decks.map((deck) => JSON.parse(deck))
  } catch (e) {
    console.error('Error parsing decks:', e)
  }

  // Get player's cosmetics transactions
  const transactions = await db
    .select()
    .from(cosmeticsTransactions)
    .where(eq(cosmeticsTransactions.player_id, id))
    .orderBy(cosmeticsTransactions.transaction_time)

  // Convert transactions to a list of owned item IDs
  const ownedItems = transactions.map((t) => t.item_id)

  // Get list of achievements
  const achievements = await AchievementManager.getAchievements(id)

  // Send the user their data
  ws.send({
    type: 'sendUserData',
    inventory: data.inventory,
    completedMissions: data.completedmissions,
    avatar_experience: data.avatar_experience,
    decks,
    username: data.username,
    elo: data.elo,
    garden: data.garden,
    gems: data.gems,
    coins: data.coins,
    ownedItems,
    cosmeticSet: JSON.parse(data.cosmetic_set),
    achievements,
  })

  // Update last active time
  await db
    .update(players)
    .set({ lastactive: new Date().toISOString() })
    .where(eq(players.id, id))
}
