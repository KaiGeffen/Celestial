import { WebSocketServer } from 'ws'

import { USER_DATA_PORT } from '../../../shared/network/settings'
import { TypedWebSocket } from '../../../shared/network/typedWebSocket'

import { db } from '../db/db'
import { players } from '../db/schema'
import { eq, sql } from 'drizzle-orm'
import { ServerWS } from '../../../shared/network/celestialTypedWebsocket'
import { Deck } from '../../../shared/types/deck'
import { AchievementManager } from '../achievementManager'
import Garden from '../db/garden'
import Catalog from '../../../shared/state/catalog'

import PveMatch from './match/pveMatch'
import PvpMatch from './match/pvpMatch'
import Match from './match/match'
import { MechanicsSettings } from '../../../shared/settings'
import { logFunnelEvent } from '../db/analytics'
import TutorialMatch from './match/tutorialMatch'
import sendUserData from './sendUserData'
import { getStartingInventoryBitString } from '../startingInventory'

// An ongoing match
class ActiveGame {
  match: Match
  // Whether this is player 0 or 1 in the match
  playerNumber: number
}

// A player waiting for a game and their associated data
interface WaitingPlayer {
  ws: ServerWS
  id: string
  deck: Deck
  activeGame: ActiveGame
}

const CARD_COST = 1000

// Players searching for a match with password as key
let searchingPlayers: { [key: string]: WaitingPlayer } = {}

// List of active player connections
let activePlayers: { [key: string]: ServerWS } = {}

// Dictionary of players that could reconnect, and the match they were in
let usersAwaitingReconnect: { [key: string]: ActiveGame } = {}

// Create the websocket server
export default function createWebSocketServer() {
  const wss = new WebSocketServer({ port: USER_DATA_PORT })

  wss.on('connection', async (socket: WebSocket) => {
    try {
      const ws: ServerWS = new TypedWebSocket(socket)

      // Remember the user once they've signed in
      let id: string = null
      let potentialEmail: string = null
      let activeGame: ActiveGame = {
        match: null, // Match if user is in one
        playerNumber: null, // 0 or 1 for current match
      }

      ws.on('signIn', async ({ email, uuid, jti }) => {
        // TODO If user has sent an email, check their jti
        potentialEmail = email

        id = uuid

        // Check if user is already connected with a live websocket
        const existingWs = activePlayers[uuid]
        if (existingWs && existingWs.isOpen()) {
          ws.send({ type: 'alreadySignedIn' })
          return
        }

        // Check if user exists in database
        const result = await db
          .select({ id: players.id })
          .from(players)
          .where(eq(players.id, uuid))
          .limit(1)

        if (result.length === 0) {
          ws.send({ type: 'promptUserInit' })
        } else {
          // Add to active users
          activePlayers[uuid] = ws

          // Handle achievements
          await AchievementManager.onConnection(id)

          // Send user their data
          await sendUserData(ws, id)

          // If user is in a match, reconnect them
          if (usersAwaitingReconnect[uuid]) {
            // Set the active game for this connection
            activeGame = usersAwaitingReconnect[uuid]

            // Remove them from the reconnect queue
            delete usersAwaitingReconnect[uuid]

            // Reconnect the user
            activeGame.match.reconnectUser(ws, activeGame.playerNumber)
          }
        }
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
              card_inventory: getStartingInventoryBitString(),
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

            // Handle initial achievement
            await AchievementManager.onConnection(id)

            // Send user their data
            await sendUserData(ws, id)
          },
        )
        .on('setAchievementsSeen', async () => {
          if (!id) return
          await AchievementManager.setAchievementsSeen(id)
        })
        .on('accessDiscord', async () => {
          if (!id) return
          await AchievementManager.onDiscordAccess(id)
        })
        .on('harvestGarden', async ({ index }) => {
          if (!id) return
          const harvestResult = await Garden.harvest(id, index)
          ws.send({
            type: 'harvestGardenResult',
            success: harvestResult.success,
            newGarden: harvestResult.newGarden,
            reward: harvestResult.reward,
            goldReward: harvestResult.goldReward,
          })
        })
        // Store
        .on('purchaseItem', async ({ id: itemId }) => {
          if (!id) return

          // Check if this is a valid card
          if (!Catalog.getCardById(itemId)) return

          // Get current user data
          const userData = await db
            .select({
              coins: players.coins,
              card_inventory: players.card_inventory,
            })
            .from(players)
            .where(eq(players.id, id))
            .limit(1)

          // Check if user has enough coins
          const currentBalance = userData[0].coins
          if (currentBalance < CARD_COST) {
            ws.send({ type: 'signalError' })
            return
          }

          // Convert inventory bit string to array
          const inventoryArray = userData[0].card_inventory
            .split('')
            .map((char) => char === '1')

          // Check if already owned
          if (inventoryArray[itemId] === true) {
            ws.send({ type: 'signalError' })
            return
          }

          // Update inventory to mark card as owned
          inventoryArray[itemId] = true
          const newInventoryBitString = inventoryArray
            .map((value) => (value ? '1' : '0'))
            .join('')

          // Start a transaction
          await db.transaction(async (tx) => {
            // Update coins and inventory
            await tx
              .update(players)
              .set({
                coins: currentBalance - CARD_COST,
                card_inventory: newInventoryBitString,
              })
              .where(eq(players.id, id))
          })

          // Send updated user data
          await sendUserData(ws, id)
        })
        .on('setCosmeticSet', async ({ value }) => {
          if (!id) return
          await db
            .update(players)
            .set({ cosmetic_set: JSON.stringify(value) })
            .where(eq(players.id, id))
        })
        // Connect to match
        .on('initPve', async ({ aiDeck, uuid, deck }) => {
          if (!id) return
          console.log(
            'PvE:',
            deck.cards
              .map((cardId) => Catalog.getCardById(cardId).name)
              .join(', '),
          )

          activeGame.match = new PveMatch(ws, uuid, deck, aiDeck)
          activeGame.playerNumber = 0

          // Analytics
          logFunnelEvent(uuid, 'play_mode', 'pve')

          // Start the match
          await activeGame.match.notifyState()
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
            logFunnelEvent(otherPlayer.id, 'play_mode', 'pvp_match_found')

            // Create a PvP match
            activeGame.match = new PvpMatch(
              ws,
              data.uuid,
              data.deck,
              otherPlayer.ws,
              otherPlayer.id,
              otherPlayer.deck,
            )
            activeGame.playerNumber = 0

            // Set the other player's game to be the same, but with opposite player number
            otherPlayer.activeGame.match = activeGame.match
            otherPlayer.activeGame.playerNumber = 1

            // TODO Maybe just delete the last one? Somehow don't lose to race conditions
            delete searchingPlayers[data.password]

            // Inform players that match started TODO That it's pvp specifically (Change the name of the ws message to clarify that. All of this waits on deciding if elo/username is a part of gameState)
            await activeGame.match.notifyMatchStart()

            // Notify both players that they are connected
            await activeGame.match.notifyState()
          } else {
            // Queue the player with their information
            const waitingPlayer = {
              ws: ws,
              id: data.uuid,
              deck: data.deck,
              activeGame: activeGame,
            }
            searchingPlayers[data.password] = waitingPlayer
          }
        })
        .on('initTutorial', async (data) => {
          console.log('Tutorial: ', data.num, 'for uuid: ', data.uuid)

          activeGame.match = new TutorialMatch(ws, data.num, data.uuid)
          activeGame.playerNumber = 0

          // Start the match
          await activeGame.match.notifyState()
        })
        .on('cancelQueue', ({ password }) => {
          delete searchingPlayers[password]
        })
        // In match events
        .on('playCard', (data) => {
          if (!activeGame.match) return
          activeGame.match.doAction(
            activeGame.playerNumber,
            data.cardNum,
            data.versionNo,
          )
        })
        .on('mulligan', (data) => {
          if (!activeGame.match) return
          activeGame.match.doMulligan(activeGame.playerNumber, data.mulligan)
        })
        .on('passTurn', (data) => {
          if (!activeGame.match) return
          activeGame.match.doAction(
            activeGame.playerNumber,
            MechanicsSettings.PASS,
            data.versionNo,
          )
        })
        .on('surrender', async () => {
          if (!activeGame.match) return
          await activeGame.match.doSurrender(ws)
          activeGame.match = null
        })
        .on('emote', () => {
          if (!activeGame.match) return
          activeGame.match.signalEmote(activeGame.playerNumber, 0)
        })

      // Handle disconnect logic
      ws.onClose(() => {
        // Remove them from active players
        if (activePlayers[id] === ws) {
          delete activePlayers[id]
        }

        // Disconnect from active match if it hasn't ended
        if (activeGame.match && !activeGame.match.isOver()) {
          activeGame.match.doDisconnect(ws)

          // Queue them to be reconnected (Unless tutorial)
          if (!(activeGame.match instanceof TutorialMatch)) {
            usersAwaitingReconnect[id] = activeGame
          }
        }
      })
    } catch (e) {
      console.error('Error in user data server:', e)
    }
  })

  console.log('User-data server is running on port: ', USER_DATA_PORT)

  // Debug: Print active users every 2 seconds
  // setInterval(() => {
  //   const userIds = Object.keys(activePlayers)
  //   console.log(`Active users (${userIds.length}):`, userIds)
  //   const awaitingReconnectIds = Object.keys(usersAwaitingReconnect)
  //   console.log(
  //     `Awaiting reconnect (${awaitingReconnectIds.length}):`,
  //     awaitingReconnectIds,
  //   )
  // }, 2000)
}
