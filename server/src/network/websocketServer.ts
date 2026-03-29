import { WebSocketServer } from 'ws'

import { USER_DATA_PORT } from '../../../shared/network/settings'
import { TypedWebSocket } from '../../../shared/network/typedWebSocket'

import { db } from '../db/db'
import { players, approvedRefs } from '../db/schema'
import { eq, sql, inArray } from 'drizzle-orm'
import { ServerWS } from '../../../shared/network/celestialTypedWebsocket'
import { Deck } from '../../../shared/types/deck'
import { AchievementManager } from '../achievementManager'
import Garden from '../db/garden'
import Catalog from '../../../shared/state/catalog'

import PveMatch from './match/pveMatch'
import PveMatchMission from './match/pveMatchMission'
import PvpMatch from './match/pvpMatch'
import Match from './match/match'
import { MechanicsSettings } from '../../../shared/settings'
import { logFunnelEvent } from '../db/analytics'
import TutorialMatch from './match/tutorialMatch'
import sendUserData from './sendUserData'
import { getStartingInventoryBitString } from '../startingInventory'
import PveSpecialMatch from './match/pveSpecialMatch'
import getClientGameModel from '../../../shared/state/clientGameModel'
import REWARD_AMOUNTS from '../../../shared/config/rewardAmounts'
import { journeyData } from '../../../shared/journey/journey'

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

// Map from each active user in a game to that game
let userActiveGameMap: { [key: string]: ActiveGame } = {}

// Whether each connected user allows others to spectate their matches (default: allowed)
let spectateAllowedByUserId: { [key: string]: boolean } = {}

// Spectator connections -> match they're watching (for cleanup / bulk remove)
const spectatorWsToMatch = new WeakMap<ServerWS, Match>()

// User ids currently spectating another player's match (for online status)
const spectatingUserIds = new Set<string>()

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
          // Close the old connection to allow the new one
          existingWs.close(1000, 'Logged in from another device')

          // Remove existing ws from active players immediately
          delete activePlayers[uuid]
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

          // If user disconnected from a match, assign them back to that match and reconnect below
          const savedActiveGame = userActiveGameMap[uuid]
          if (savedActiveGame?.match && !savedActiveGame.match.isOver()) {
            activeGame = savedActiveGame
          }

          // Map this user's entry in the dict to active game
          // NOTE Changing activeGame then mutates the dict
          userActiveGameMap[uuid] = activeGame

          // Reconnect to match
          if (activeGame.match) {
            await activeGame.match.reconnectUser(ws, activeGame.playerNumber)
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
          async ({ username, decks, inventory, missions, ref }) => {
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
              missiongoldclaimed: '',
              avatar_experience: [0, 0, 0, 0, 0, 0],
              card_inventory: getStartingInventoryBitString(),
              lastactive: new Date().toISOString(),
              garden: [],
              gems: 0,
              coins: 0,
              cosmetic_set: JSON.stringify({
                avatar: 0,
                border: 0,
                cardback: 0,
                relic: 0,
              }),
              ref,
            }
            await db.insert(players).values(data)

            // Add to active users
            activePlayers[id] = ws

            // Handle initial achievement
            await AchievementManager.onConnection(id)

            // Award referral achievement if they used a valid ref
            ref = ref ? ref.toLowerCase() : null
            if (ref) {
              const allowed = await db
                .select({ code: approvedRefs.code })
                .from(approvedRefs)
                .where(sql`LOWER(${approvedRefs.code}) = LOWER(${ref})`)
                .limit(1)
              if (allowed.length === 0) ref = null
            }
            if (ref) {
              await AchievementManager.onReferralSignup(id)
            }

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
          await sendUserData(ws, id)
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
        .on('claimMissionGold', async ({ missionId }) => {
          if (!id) return

          const missionExists = journeyData.some(
            (mission) => mission.id === missionId,
          )
          if (!missionExists) {
            ws.send({ type: 'signalError' })
            return
          }

          await db.transaction(async (tx) => {
            const [playerData] = await tx
              .select({
                missiongoldclaimed: players.missiongoldclaimed,
              })
              .from(players)
              .where(eq(players.id, id))
              .limit(1)

            if (!playerData) return

            let missiongoldclaimed = playerData.missiongoldclaimed ?? ''
            // The mission gold has already been claimed
            if (missiongoldclaimed?.[missionId] === '1') {
              return
            }

            const claimArray = missiongoldclaimed.split('')
            while (claimArray.length <= missionId) claimArray.push('0')
            claimArray[missionId] = '1'
            missiongoldclaimed = claimArray.join('')

            await tx
              .update(players)
              .set({
                missiongoldclaimed,
                coins: sql`${players.coins} + ${REWARD_AMOUNTS.missionComplete}`,
              })
              .where(eq(players.id, id))
          })

          await sendUserData(ws, id)
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
        .on('initMission', async ({ uuid, deck, missionID }) => {
          if (!id) return
          console.log('Mission:', missionID)

          // This might fail if the mission is invalid
          try {
            activeGame.match = new PveMatchMission(ws, uuid, deck, missionID)
          } catch (e) {
            console.error('initMission:', e)
            return
          }

          // Just like in pve, we are player 1
          activeGame.playerNumber = 0

          logFunnelEvent(uuid, 'play_mode', 'journey')

          // Start the match and let user know the starting state
          await activeGame.match.startMatch()
          await activeGame.match.notifyState()
        })
        .on('initPve', async ({ aiDeck, uuid, deck }) => {
          if (!id) return
          console.log(
            'PvE:',
            deck.cards
              .map((cardId) => Catalog.getCardById(cardId).name)
              .join(', '),
          )

          activeGame.match = new PveMatch(ws, uuid, deck, aiDeck)
          await activeGame.match.startMatch()

          // TODO Explain why to make us player 1
          activeGame.playerNumber = 0

          // Analytics
          logFunnelEvent(uuid, 'play_mode', 'pve')

          // Start the match
          await activeGame.match.startMatch()
          await activeGame.match.notifyState()
        })
        .on('initSpecialPve', async ({ aiDeck, uuid, deck, enabledModes }) => {
          if (!id) return
          console.log(
            'Race:',
            deck.cards
              .map((cardId) => Catalog.getCardById(cardId).name)
              .join(', '),
          )

          activeGame.match = new PveSpecialMatch(
            ws,
            uuid,
            deck,
            aiDeck,
            enabledModes,
          )
          activeGame.playerNumber = 0

          // Analytics
          logFunnelEvent(uuid, 'play_mode', 'race')

          // Start the match and let user know the starting state
          await activeGame.match.startMatch()
          await activeGame.match.notifyState()
        })
        .on('initPvp', async (data) => {
          // Clean up stale entries first
          Object.keys(searchingPlayers).forEach((password) => {
            // Ensure we never queue into ourself
            const isSelf = searchingPlayers[password].id === data.uuid

            // Ensure we don't queue into closed connections
            const isClosed = !searchingPlayers[password].ws.isOpen()

            if (isClosed || isSelf) {
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

            // Notify both players that they are connected
            // Start the match and let both users know the starting state
            await activeGame.match.startMatch()
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

          // Start the match and let user know the starting state
          await activeGame.match.startMatch()
          await activeGame.match.notifyState()
        })
        .on('cancelQueue', ({ password }) => {
          delete searchingPlayers[password]
        })
        .on('setCanBeSpectated', ({ allowed }) => {
          if (!id) return
          spectateAllowedByUserId[id] = allowed

          // Host disabled spectating mid-match: drop everyone watching their perspective.
          if (!allowed) {
            const ag = userActiveGameMap[id]
            if (ag?.match && !ag.match.isOver()) {
              const perspective = (ag.playerNumber === 1 ? 1 : 0) as 0 | 1
              const removed =
                ag.match.removeAllSpectatorsForPerspective(perspective)
              for (const sWs of removed) {
                spectatorWsToMatch.delete(sWs)
                const sid = Object.keys(activePlayers).find(
                  (uid) => activePlayers[uid] === sWs,
                )
                if (sid) spectatingUserIds.delete(sid)
                if (sWs.isOpen()) {
                  sWs.send({ type: 'spectateEnded' })
                }
              }
            }
          }
        })
        // Spectator mode: watch another connected user's match
        .on('spectatePlayer', async ({ targetUuid }) => {
          const targetActive = userActiveGameMap[targetUuid]
          if (!targetActive?.match || targetActive.match.isOver()) {
            ws.send({ type: 'signalError' })
            return
          }
          if (spectateAllowedByUserId[targetUuid] === false) {
            ws.send({ type: 'signalError' })
            return
          }

          // Only one active spectate subscription per socket for now.
          const prevMatch = spectatorWsToMatch.get(ws)
          if (prevMatch) {
            prevMatch.removeSpectator(ws)
            spectatorWsToMatch.delete(ws)
          }

          const perspective = targetActive.playerNumber === 1 ? 1 : 0
          targetActive.match.addSpectator(ws, perspective)
          spectatorWsToMatch.set(ws, targetActive.match)
          if (id) spectatingUserIds.add(id)

          // Notify the watched player (not the opponent) that someone is spectating
          if (!id) return
          const [watcher] = await db
            .select({ username: players.username })
            .from(players)
            .where(eq(players.id, id))
            .limit(1)

          const watchedWs =
            perspective === 0 ? targetActive.match.ws1 : targetActive.match.ws2
          if (watchedWs?.isOpen()) {
            watchedWs.send({
              type: 'spectatorJoined',
              username: watcher?.username ?? 'Someone',
            })
          }
        })
        .on('exitSpectating', () => {
          const m = spectatorWsToMatch.get(ws)
          if (m) {
            m.removeSpectator(ws)
            spectatorWsToMatch.delete(ws)
          }
          if (id) spectatingUserIds.delete(id)
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
        // TODO Maybe this check is unnecessary, should delete in all cases
        // Remove them from active players
        if (activePlayers[id] === ws) {
          delete activePlayers[id]
        }
        if (id) {
          delete spectateAllowedByUserId[id]
        }

        const spectating = spectatorWsToMatch.get(ws)
        if (spectating) {
          spectating.removeSpectator(ws)
          spectatorWsToMatch.delete(ws)
        }
        if (id) spectatingUserIds.delete(id)

        // Disconnect from active match if it hasn't ended
        if (activeGame.match && !activeGame.match.isOver()) {
          activeGame.match.doDisconnect(ws)

          // If in a match besides a tutorial, retain the active game for when user reconnects
          if (activeGame.match instanceof TutorialMatch) {
            delete userActiveGameMap[id]
          } else {
            userActiveGameMap[id] = activeGame
          }
        } else {
          // No match (or match already over) => nothing to reconnect to.
          delete userActiveGameMap[id]
        }
      })
    } catch (e) {
      console.error('Error in user data server:', e)
    }
  })

  console.log('User-data server is running on port: ', USER_DATA_PORT)

  // TODO It's ineffecicient for each user to calculate this themself, instead the server should calculate it once and each thread uses it
  // Broadcast online players list every 2 seconds
  setInterval(async () => {
    try {
      const activeUserIds = Object.keys(activePlayers).filter(
        (id) => activePlayers[id] && activePlayers[id].isOpen(),
      )

      let playersList: Array<{
        uuid: string
        username: string
        cosmeticSet: any
        status: number
        canBeSpectated: boolean
      }> = []

      if (activeUserIds.length > 0) {
        // Get player data from database
        const playerData = await db
          .select({
            id: players.id,
            username: players.username,
            cosmetic_set: players.cosmetic_set,
          })
          .from(players)
          .where(inArray(players.id, activeUserIds))

        // Build the players list with username, cosmetics, and computed status.
        // Status encoding:
        // 0 = none, 1 = searching, 2 = inMatch, 3 = inJourney, 4 = spectating
        const getStatusForUserId = (userId: string): number => {
          if (spectatingUserIds.has(userId)) return 4

          const isSearching = Object.values(searchingPlayers).some(
            (p) => p?.id === userId && p?.ws?.isOpen(),
          )
          if (isSearching) return 1

          const active = userActiveGameMap[userId]
          if (active?.match && !active.match.isOver()) {
            return active.match instanceof PveMatchMission ? 3 : 2
          }

          return 0
        }

        playersList = playerData.map((player) => {
          let cosmeticSet
          try {
            cosmeticSet = JSON.parse(player.cosmetic_set)
          } catch (e) {
            cosmeticSet = { avatar: 0, border: 0, relic: 0 }
          }

          return {
            uuid: player.id,
            username: player.username,
            cosmeticSet,
            status: getStatusForUserId(player.id),
            canBeSpectated: spectateAllowedByUserId[player.id] !== false,
          }
        })
      }

      // Send to all active websockets
      activeUserIds.forEach((id) => {
        const ws = activePlayers[id]
        if (ws && ws.isOpen()) {
          ws.send({
            type: 'broadcastOnlinePlayersList',
            players: playersList,
          })
        }
      })
    } catch (e) {
      console.error('Error broadcasting online players:', e)
    }
  }, 2000)

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
