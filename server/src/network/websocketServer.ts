import { WebSocketServer } from 'ws'

import { USER_DATA_PORT } from '../../../shared/network/settings'
import { TypedWebSocket } from '../../../shared/network/typedWebSocket'

import { db } from '../db/db'
import { players } from '../db/schema'
import { eq, sql } from 'drizzle-orm'
import { ServerWS } from '../../../shared/network/celestialTypedWebsocket'
import { Deck } from '../../../shared/types/deck'
import { STORE_ITEMS } from '../../../shared/storeItems'
import { cosmeticsTransactions } from '../db/schema'
import { AchievementManager } from '../achievementManager'
import Garden from '../db/garden'
import Catalog from '../../../shared/state/catalog'

import PveMatch from './match/pveMatch'
import PvpMatch from './match/pvpMatch'
import Match from './match/match'
import { MechanicsSettings } from '../../../shared/settings'
import { logFunnelEvent } from '../db/analytics'
import TutorialMatch from './match/tutorialMatch'

// A player waiting for a game and their associated data
interface WaitingPlayer {
  ws: ServerWS
  uuid: string
  deck: Deck
}

// Players searching for a match with password as key
let searchingPlayers: { [key: string]: WaitingPlayer } = {}

// List of active player connections
let activePlayers: { [key: string]: ServerWS } = {}

// List of user ids that should attempt to reconnect if they regain connection
let playersToReconnect: Set<string> = new Set()

// Create the websocket server
export default function createWebSocketServer() {
  const wss = new WebSocketServer({ port: USER_DATA_PORT })

  wss.on('connection', async (socket: WebSocket) => {
    try {
      const ws: ServerWS = new TypedWebSocket(socket)

      // Remember the user once they've signed in
      let id: string = null
      let potentialEmail: string = null

      ws.on('sendToken', async ({ email, uuid, jti }) => {
        id = uuid
        potentialEmail = email

        // Check if user is already connected
        if (activePlayers[uuid]) {
          ws.send({ type: 'alreadySignedIn' })
          return
        }

        // Check if user exists in database
        const result = await db
          .select()
          .from(players)
          .where(eq(players.id, uuid))
          .limit(1)

        if (result.length === 0) {
          ws.send({ type: 'promptUserInit' })
        } else if (result.length === 1) {
          // Add to active users
          activePlayers[uuid] = ws

          // Send user their data
          await sendUserData(ws, id, result[0])

          // Handle achievements
          await AchievementManager.onConnection(id)
        }
      })
        .on('sendGuestToken', async ({ uuid }) => {
          id = uuid

          // Check if user is already connected
          if (activePlayers[uuid]) {
            ws.send({ type: 'alreadySignedIn' })
            return
          }

          // Check if guest user exists in database
          const result = await db
            .select()
            .from(players)
            .where(eq(players.id, uuid))
            .limit(1)

          if (result.length === 0) {
            ws.send({ type: 'promptUserInit' })
          } else if (result.length === 1) {
            // Add to active users
            activePlayers[uuid] = ws

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
        .on('sendAvatarExperience', async ({ experience }) => {
          if (!id) return
          await db
            .update(players)
            .set({ avatar_experience: experience })
            .where(eq(players.id, id))
        })
        .on(
          'sendInitialUserData',
          async ({ username, decks, inventory, missions }) => {
            if (!id) {
              throw new Error('User sent initial user data before signing in')
            }

            // If username already exists, error (Currently client sees error on their side, so this shouldn't happen. But if it does, don't create the row)
            // Exception: Allow multiple "Guest" usernames
            if (username !== 'Guest') {
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
              avatar_experience: [0, 0, 0, 0, 0, 0],
              lastactive: new Date().toISOString(),
              garden: [],
              gems: 0,
              coins: 0,
              cosmetic_set: JSON.stringify({
                avatar: 0,
                border: 0,
                relic: 0,
              }),
            }
            await db.insert(players).values(data)

            // Add to active users
            activePlayers[id] = ws

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
        .on('harvestGarden', async ({ index }) => {
          if (!id) return
          const harvestResult = await Garden.harvest(id, index)
          ws.send({
            type: 'harvestGardenResult',
            success: harvestResult.success,
            newGarden: harvestResult.newGarden,
            reward: harvestResult.reward,
          })
        })
        // MATCH RELEVANT
        // TODO too much in this file, break out some logic somewhere else
        .on('initPve', async ({ aiDeck, uuid, deck }) => {
          if (!id) return
          console.log(
            'PvE:',
            deck.cards
              .map((cardId) => Catalog.getCardById(cardId).name)
              .join(', '),
          )

          const match = new PveMatch(ws, uuid, deck, aiDeck)
          registerEvents(ws, match, 0)

          // Analytics
          logFunnelEvent(uuid, 'play_mode', 'pve')

          // Start the match
          await match.notifyState()
        })
        .on('initPvp', async (data) => {
          // Clean up stale entries first
          Object.keys(searchingPlayers).forEach((password) => {
            if (!searchingPlayers[password].ws.isOpen()) {
              console.log(
                'Searching player went stale on password:',
                searchingPlayers[password],
              )
              delete searchingPlayers[password]
            }
          })

          // Analytics
          logFunnelEvent(data.uuid, 'play_mode', 'pvp_queued_up')

          // Check if there is another player, and they are still ready
          const otherPlayer: WaitingPlayer = searchingPlayers[data.password]
          if (otherPlayer) {
            console.log(
              'PVP:',
              data.deck.cards
                .map((cardId) => Catalog.getCardById(cardId).name)
                .join(', '),
              '\n',
              otherPlayer.deck.cards
                .map((cardId) => Catalog.getCardById(cardId).name)
                .join(', '),
            )

            // Analytics
            logFunnelEvent(otherPlayer.uuid, 'play_mode', 'pvp_match_found')

            // Create a PvP match
            const match = new PvpMatch(
              ws,
              data.uuid,
              data.deck,
              otherPlayer.ws,
              otherPlayer.uuid,
              otherPlayer.deck,
            )

            // registerEvents(socket, match, playerNumber)
            delete searchingPlayers[data.password]
            // TODO Maybe just delete the last one? Somehow don't lose to race conditions

            registerEvents(ws, match, 0)
            registerEvents(otherPlayer.ws, match, 1)

            // Inform players that match started TODO That it's pvp specifically
            await match.notifyMatchStart()

            // Notify both players that they are connected
            await match.notifyState()
          } else {
            // Queue the player with their information
            const waitingPlayer = {
              ws: ws,
              uuid: data.uuid,
              deck: data.deck,
            }
            searchingPlayers[data.password] = waitingPlayer

            // Ensure that if they leave, they are removed from the queue
            const f = () => {
              console.log('Player disconnected before getting into a match:')
              delete searchingPlayers[data.password]
              ws.close()
            }
            ws.on('exitMatch', f)
            ws.onClose(f)
          }
        })
        .on('initTutorial', async (data) => {
          console.log('Tutorial: ', data.num, 'for uuid: ', data.uuid)

          const match = new TutorialMatch(ws, data.num, data.uuid)
          registerEvents(ws, match, 0)

          // Start the match
          await match.notifyState()
        })

      // Remove user from active list when they disconnect
      ws.onClose(() => {
        if (id && activePlayers[id] === ws) {
          delete activePlayers[id]
        }
      })
    } catch (e) {
      console.error('Error in user data server:', e)
    }
  })

  console.log('User-data server is running on port: ', USER_DATA_PORT)

  // TODO Remove
  // Debug: Print active users every 5 seconds
  setInterval(() => {
    const userIds = Object.keys(activePlayers)
    console.log(`Active users (${userIds.length}):`, userIds)
  }, 5000)
}

// Send the user their full data
async function sendUserData(
  ws: ServerWS,
  id: string,
  data: {
    inventory: string
    completedmissions: string
    avatar_experience: number[]
    decks: string[]
    username: string
    elo: number
    garden: Date[]
    gems: number
    coins: number
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

// Register each of the events that the server receives during a match
function registerEvents(ws: ServerWS, match: Match, playerNumber: number) {
  ws.on('playCard', (data) => {
    match.doAction(playerNumber, data.cardNum, data.versionNo)
  })
    .on('mulligan', (data) => {
      match.doMulligan(playerNumber, data.mulligan)
    })
    .on('passTurn', (data) => {
      match.doAction(playerNumber, MechanicsSettings.PASS, data.versionNo)
    })
    .on('exitMatch', () => {
      match.doExit(ws)
    })
    .on('emote', () => {
      const emote = 0 // TODO
      match.signalEmote(playerNumber, emote)
    })

  // Websocket closing for any reason
  ws.onClose(() => {
    match.doExit(ws)
  })
}
