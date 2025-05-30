import { WebSocketServer } from 'ws'
import { v5 as uuidv5 } from 'uuid'

import {
  USER_DATA_PORT,
  UUID_NAMESPACE,
} from '../../../shared/network/settings'
import { TypedWebSocket } from '../../../shared/network/typedWebSocket'

import { db } from '../db/db'
import { players } from '../db/schema'
import { eq, sql } from 'drizzle-orm'
import { UserDataServerWS } from '../../../shared/network/userDataWS'
import { Deck } from '../../../shared/types/deck'
import { STORE_ITEMS } from '../../../shared/storeItems'
import { cosmeticsTransactions } from '../db/schema'
import { AchievementManager } from '../achievementManager'

// Create the websocket server
export default function createUserDataServer() {
  const wss = new WebSocketServer({ port: USER_DATA_PORT })

  wss.on('connection', async (socket: WebSocket) => {
    try {
      /* Request user's token
       socket.send('request_token')
       Register events for send_token
      
       Register send_token
       If invalid, respond with invalid token
       If uuid is in list of already signed in users, respond with already signed in
       Otherwise get user data
       If no data found, prompt user fields
        Set those values in the database
       Otherwise, send user data
       Register events for updating fields in the db
       * user_progress, decks, inventory, completed_missions, 
       When user queues for a match, on the client side they send the uuid and the token
       New matches are added to the live-match db
       When they complete (By win/loss/tie) they are moved to history
       If they time out, also added to history
       A user queueing first looks for ongoing matchs in the live-match db
       They are reconnected if one is found

       Other supported commands:
       get_leaderboard, get_match_history(uuid)

       In that event, register events to 

      */
      const ws: UserDataServerWS = new TypedWebSocket(socket)

      // Remember the user once they've signed in
      let id: string = null
      let potentialEmail: string = null

      ws.on('sendToken', async ({ email, uuid, jti }) => {
        // Generate UUID v5 from Google's user ID
        const userId = uuidv5(uuid, UUID_NAMESPACE)
        id = userId
        potentialEmail = email

        // Check if user exists in database
        const result = await db
          .select()
          .from(players)
          .where(eq(players.id, userId))
          .limit(1)

        if (result.length === 0) {
          ws.send({ type: 'promptUserInit' })
        } else if (result.length === 1) {
          // Send user their data
          await sendUserData(ws, id, result[0])

          // Handle achievements
          await AchievementManager.onConnection(id)
        }
      })
        .on('refreshUserData', async () => {
          if (!id) return
          const result = await db
            .select()
            .from(players)
            .where(eq(players.id, id))
            .limit(1)
          if (result.length === 0) return
          await sendUserData(ws, id, result[0])
        })
        .on('sendDecks', async ({ decks }) => {
          if (!id) return
          await db
            .update(players)
            .set({ decks: decks.map((deck) => JSON.stringify(deck)) })
            .where(eq(players.id, id))
        })
        .on('sendInventory', async ({ inventory }) => {
          if (!id) return
          await db.update(players).set({ inventory }).where(eq(players.id, id))
        })
        .on('sendCompletedMissions', async ({ missions }) => {
          if (!id) return
          await db
            .update(players)
            .set({ completedmissions: missions })
            .where(eq(players.id, id))
        })
        .on(
          'sendInitialUserData',
          async ({ username, decks, inventory, missions }) => {
            if (!id) {
              throw new Error('User sent initial user data before signing in')
            }

            // If username already exists, error (Currently client sees error on their side, so this shouldn't happen. But if it does, don't create the row)
            const result = await db
              .select()
              .from(players)
              .where(sql`LOWER(${players.username}) = LOWER(${username})`)
              .limit(1)
            if (result.length > 0) {
              throw new Error(
                'Attemping to register a username that already exists',
              )
            }

            // Create new user entry in database
            const data = {
              id: id,
              email: potentialEmail,
              username: username,
              wins: 0,
              losses: 0,
              elo: 1000,
              decks: decks.map((deck) => JSON.stringify(deck)),
              pve_wins: 0,
              pve_losses: 0,
              inventory: inventory,
              completedmissions: missions,
              lastactive: new Date().toISOString(),
              gems: 0,
              coins: 0,
              last_daily_reward: new Date(),
              cosmetic_set: JSON.stringify({
                avatar: 0,
                border: 0,
                relic: 0,
              }),
            }
            await db.insert(players).values(data)

            // Send user their data
            await sendUserData(ws, id, data)

            // Handle initial achievement
            await AchievementManager.onConnection(id)
          },
        )
        // TODO Separate this to another "Store" server eventually
        .on('purchaseItem', async ({ id: itemId }) => {
          if (!id) {
            throw new Error('User attempted to purchase item before signing in')
          }

          const item = Object.values(STORE_ITEMS).find(
            (item) => item.id === itemId,
          )
          if (!item) {
            throw new Error(
              `User attempted to purchase invalid item: ${itemId}`,
            )
          }
          const cost = item.cost

          const currentBalance = await db
            .select({ balance: players.gems })
            .from(players)
            .where(eq(players.id, id))
            .limit(1)

          // TODO Check that user doesnt already own this item
          if (currentBalance[0].balance < cost) {
            // TODO Send error to client
            return
          }

          // Start a transaction
          await db.transaction(async (tx) => {
            // Update balance
            await tx
              .update(players)
              .set({ gems: currentBalance[0].balance - cost })
              .where(eq(players.id, id))

            // Record the transaction
            await tx.insert(cosmeticsTransactions).values({
              player_id: id,
              item_id: itemId,
              transaction_type: 'purchase',
            })
          })

          // Send updated user data
          const result = await db
            .select()
            .from(players)
            .where(eq(players.id, id))
            .limit(1)
          if (result.length === 0) return
          await sendUserData(ws, id, result[0])
        })
        .on('setCosmeticSet', async ({ value }) => {
          if (!id) return
          await db
            .update(players)
            .set({ cosmetic_set: JSON.stringify(value) })
            .where(eq(players.id, id))
        })
        .on('setAchievementsSeen', async () => {
          if (!id) return
          await AchievementManager.setAchievementsSeen(id)
        })
    } catch (e) {
      console.error('Error in user data server:', e)
    }
  })

  console.log('User-data server is running on port: ', USER_DATA_PORT)
}

// Send the user their full data
async function sendUserData(
  ws: UserDataServerWS,
  id: string,
  data: {
    inventory: string
    completedmissions: string
    decks: string[]
    username: string
    elo: number
    gems: number
    coins: number
    last_daily_reward: Date
    cosmetic_set: string
  },
) {
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

  ws.send({
    type: 'sendUserData',
    inventory: data.inventory,
    completedMissions: data.completedmissions,
    decks,
    username: data.username,
    elo: data.elo,
    gems: data.gems,
    coins: data.coins,
    lastDailyReward: data.last_daily_reward,
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
