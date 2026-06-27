import { WebSocketServer } from 'ws'

import {
  USER_DATA_PORT,
  UUID_NAMESPACE,
} from '../../../shared/network/settings'
import { TypedWebSocket } from '../../../shared/network/typedWebSocket'
import { verifySteamTicket } from './steamAuth'
import { verifyGoogleCredential } from './googleAuth'
import {
  issueSessionToken,
  verifySessionToken,
  SessionClaims,
} from './sessionToken'

import { db } from '../db/db'
import { players, approvedRefs, cosmeticsTransactions } from '../db/schema'
import { eq, sql, inArray } from 'drizzle-orm'
import { ServerWS } from '../../../shared/network/celestialTypedWebsocket'
import { Deck } from '../../../shared/types/deck'
import { AchievementManager } from '../achievementManager'
import Garden from '../db/garden'
import Catalog from '../../../shared/state/catalog'
import allPurchaseables from '../../../shared/purchaseables/index'

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
import { v5 as uuidv5 } from 'uuid'

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
  // Time when they queued
  queuedAt: number
  notifiedDiscord: boolean
}

const CARD_COST = 1000

/** Discord @Active Player role — used to ping matchmaking helpers via webhook. */
const DISCORD_ACTIVE_PLAYER_ROLE_ID = '1369233011681398857'

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

/**
 * Resolve a verified provider identity (Google sub or Steam id) to an account
 * id. Looks the account up by its provider column; if that misses, falls back to
 * the legacy derived id and backfills the column, so accounts created before
 * linking migrate themselves on their next login. For a brand-new account the
 * returned id is derived from this first provider identity.
 */
async function resolveProviderAccount(
  provider: 'google' | 'steam',
  providerId: string,
  email: string | null,
): Promise<string> {
  const column = provider === 'google' ? players.google_id : players.steam_id

  const [byColumn] = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(column, providerId))
    .limit(1)
  if (byColumn) return byColumn.id

  // Legacy account, created before linking and keyed by the derived id.
  const legacyId = uuidv5(providerId, UUID_NAMESPACE)
  const [byLegacy] = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.id, legacyId))
    .limit(1)
  if (byLegacy) {
    if (provider === 'google') {
      await db
        .update(players)
        .set({ google_id: providerId, email })
        .where(eq(players.id, legacyId))
    } else {
      await db
        .update(players)
        .set({ steam_id: providerId })
        .where(eq(players.id, legacyId))
    }
    return legacyId
  }

  // New account: id derived from this first provider identity.
  return legacyId
}

// Create the websocket server
export default function createWebSocketServer() {
  const wss = new WebSocketServer({ port: USER_DATA_PORT })

  wss.on('connection', async (socket: WebSocket) => {
    try {
      const ws: ServerWS = new TypedWebSocket(socket)

      // Remember the user once they've signed in
      let id: string = null
      let username: string = null
      let potentialEmail: string = null
      // Verified provider identities for this connection, applied when a brand-
      // new account is created via sendInitialUserData.
      let potentialGoogleId: string | null = null
      let potentialSteamId: string | null = null
      let connectionTime: number | null = null
      let activeGame: ActiveGame = {
        match: null, // The match user is in if any
        playerNumber: null, // 0 or 1 for current match
      }

      const handleSignInForUuid = async (
        uuid: string,
        opts: {
          provider: 'guest' | 'google' | 'steam'
          email?: string | null
        },
      ) => {
        potentialEmail = opts.email ?? null
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
          .select({
            id: players.id,
            email: players.email,
            google_id: players.google_id,
            steam_id: players.steam_id,
            username: players.username,
          })
          .from(players)
          .where(eq(players.id, uuid))
          .limit(1)

        if (result.length === 0) {
          ws.send({ type: 'promptUserInit' })
          return
        }

        // Security gate: the guest path carries no identity proof, so it must
        // never authenticate a provider-linked account. Reject if the account
        // has any verified provider identity (email covers legacy Google rows
        // not yet backfilled into google_id).
        if (
          opts.provider === 'guest' &&
          (result[0].google_id || result[0].steam_id || result[0].email)
        ) {
          id = null
          potentialEmail = null
          ws.send({ type: 'invalidToken' })
          ws.close(1008, 'Account requires provider sign-in')
          return
        }

        // Add to active users
        activePlayers[uuid] = ws
        connectionTime = Date.now()
        username = result[0].username

        // Handle initial achievement
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

      // Wrap a handler so it only runs once this socket has completed a verified
      // sign-in. `id` is set exclusively by handleSignInForUuid, so its presence
      // is the single source of truth for "authenticated". Centralizing the gate
      // here means no handler can forget it.
      const authed =
        <T>(handler: (data: T) => unknown) =>
        (data: T) => {
          if (!id) return
          return handler(data)
        }

      // Issue (when a secret is configured) and deliver a session token.
      const sendSession = (claims: SessionClaims) => {
        const token = issueSessionToken(claims)
        if (token) ws.send({ type: 'sessionToken', token })
      }

      ws.on('signIn', async ({ uuid }) => {
        // Guest sign-in: no identity proof, so this can only ever reach
        // guest accounts (enforced inside handleSignInForUuid).
        await handleSignInForUuid(uuid, { provider: 'guest' })
      })
        .on('loginGoogle', async ({ credential }) => {
          const identity = await verifyGoogleCredential(credential)
          if (!identity) {
            ws.send({ type: 'invalidToken' })
            ws.close(1008, 'Invalid Google credential')
            return
          }

          // Resolve to an account by the VERIFIED subject — looked up, never
          // trusting anything the client asserted.
          const accountId = await resolveProviderAccount(
            'google',
            identity.sub,
            identity.email,
          )
          potentialGoogleId = identity.sub

          // Hand the client a long-lived session token so future reconnects
          // don't need a fresh (1-hour) Google token.
          sendSession({
            uuid: accountId,
            provider: 'google',
            email: identity.email,
          })

          await handleSignInForUuid(accountId, {
            provider: 'google',
            email: identity.email,
          })
        })
        .on('loginSession', async ({ token }) => {
          const claims = verifySessionToken(token)
          if (!claims) {
            ws.send({ type: 'invalidToken' })
            ws.close(1008, 'Invalid or expired session')
            return
          }

          // Rolling expiry: re-issue so active users stay signed in.
          sendSession(claims)

          await handleSignInForUuid(claims.uuid, {
            provider: claims.provider,
            email: claims.email,
          })
        })
        .on('loginSteam', async ({ ticket }) => {
          console.log('Login Steam...')
          const steamId = await verifySteamTicket(ticket)
          if (!steamId) {
            ws.send({ type: 'invalidToken' })
            ws.close(1008, 'Invalid Steam ticket')
            return
          }

          const accountId = await resolveProviderAccount('steam', steamId, null)
          potentialSteamId = steamId
          await handleSignInForUuid(accountId, { provider: 'steam' })
        })
        .on(
          'sendDecks',
          authed(async ({ decks }) => {
            await db
              .update(players)
              .set({ decks: decks.map((deck) => JSON.stringify(deck)) })
              .where(eq(players.id, id))
          }),
        )
        .on(
          'sendInventory',
          authed(async ({ inventory }) => {
            await db
              .update(players)
              .set({ inventory })
              .where(eq(players.id, id))
          }),
        )
        .on(
          'sendCompletedMissions',
          authed(async ({ missions }) => {
            await db
              .update(players)
              .set({ completedmissions: missions })
              .where(eq(players.id, id))
          }),
        )
        .on(
          'sendAvatarExperience',
          authed(async ({ experience }) => {
            await db
              .update(players)
              .set({ avatar_experience: experience })
              .where(eq(players.id, id))
          }),
        )
        .on(
          'sendJourneyChoice',
          authed(async ({ characterIndex, choice }) => {
            if (characterIndex < 0 || characterIndex > 5) return
            if (choice !== 0 && choice !== 1) return

            const row = await db
              .select({ journey_choices: players.journey_choices })
              .from(players)
              .where(eq(players.id, id))
              .limit(1)

            const raw = row[0]?.journey_choices
            const next: (number | null)[] =
              raw && Array.isArray(raw) ? [...raw] : Array(6).fill(null)
            while (next.length < 6) next.push(null)
            next.length = 6
            next[characterIndex] = choice

            await db
              .update(players)
              .set({ journey_choices: next })
              .where(eq(players.id, id))
          }),
        )
        .on(
          'sendInitialUserData',
          authed(async ({ username, decks, inventory, missions, ref }) => {
            // If username already exists, error (Currently client sees error on their side, so this shouldn't happen. But if it does, don't create the row)
            // Exception: Allow multiple "Guest" usernames
            if (username !== 'Guest') {
              const result = await db
                .select()
                .from(players)
                .where(sql`LOWER(${players.username}) = LOWER(${username})`)
                .limit(1)
              if (result.length > 0) {
                // Client already guards against this, so it shouldn't happen —
                // but signal rather than throw (which would become an unhandled
                // rejection and leave the socket in a half-open state).
                ws.send({ type: 'signalError' })
                return
              }
            }

            // Create new user entry in database
            const data = {
              id: id,
              email: potentialEmail,
              google_id: potentialGoogleId,
              steam_id: potentialSteamId,
              username: username,
              pvp_wins_lifetime: 0,
              pvp_losses_lifetime: 0,
              pvp_wins_month: 0,
              pvp_losses_month: 0,
              elo: 1000,
              elo_peak: 1000,
              decks: decks.map((deck) => JSON.stringify(deck)),
              pve_wins: 0,
              pve_losses: 0,
              inventory: inventory,
              completedmissions: missions,
              missiongoldclaimed: '',
              avatar_experience: [0, 0, 0, 0, 0, 0],
              journey_choices: [null, null, null, null, null, null],
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
            username = username

            // Log about it
            console.log(
              `New account registered: ${username} ${ref ? `, ref: ${ref}` : ''}`,
            )

            // Add to active users
            activePlayers[id] = ws
            connectionTime = Date.now()

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
          }),
        )
        .on(
          'setAchievementsSeen',
          authed(async () => {
            await AchievementManager.setAchievementsSeen(id)
          }),
        )
        .on(
          'accessDiscord',
          authed(async () => {
            await AchievementManager.onDiscordAccess(id)
            await sendUserData(ws, id)
          }),
        )
        .on(
          'harvestGarden',
          authed(async ({ index }) => {
            const harvestResult = await Garden.harvest(id, index)
            ws.send({
              type: 'harvestGardenResult',
              success: harvestResult.success,
              newGarden: harvestResult.newGarden,
              goldReward: harvestResult.goldReward,
              gemReward: harvestResult.gemReward,
            })
          }),
        )
        .on(
          'claimMissionRewards',
          authed(async ({ missionId }) => {
            // TODO Temporary to debug
            console.log(`${username} is claiming gold for mission ${missionId}`)

            const missionExists = journeyData.some(
              (mission) => mission.id === missionId,
            )
            if (!missionExists) {
              // TODO Temporary to debug
              console.log(
                'Trying to claim gold for a mission that does not exist:',
                missionId,
              )
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
              if (missiongoldclaimed[missionId] === '1') {
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
          }),
        )
        // Store
        .on(
          'purchaseItem',
          authed(async ({ id: itemId }) => {
            const cosmeticItem = allPurchaseables.find((p) => p.id === itemId)
            const isCosmetic = cosmeticItem !== undefined
            const isCard = !isCosmetic && !!Catalog.getCardById(itemId)

            if (!isCosmetic && !isCard) return

            if (isCosmetic) {
              // Do the check and deduct atomically: lock the player row so two
              // rapid purchases can't both read the old balance and double-spend.
              await db.transaction(async (tx) => {
                const [row] = await tx
                  .select({ gems: players.gems })
                  .from(players)
                  .where(eq(players.id, id))
                  .for('update')
                  .limit(1)
                if (!row) return

                // Check if user has enough gems
                if (row.gems < cosmeticItem.cost) {
                  ws.send({ type: 'signalError' })
                  return
                }

                // Check if already owned (compare item_id, not the transaction id)
                const existing = await tx
                  .select({ item_id: cosmeticsTransactions.item_id })
                  .from(cosmeticsTransactions)
                  .where(eq(cosmeticsTransactions.player_id, id))
                if (existing.some((t) => t.item_id === itemId)) {
                  ws.send({ type: 'signalError' })
                  return
                }

                // Deduct relative to the locked value, and record the purchase
                await tx
                  .update(players)
                  .set({ gems: sql`${players.gems} - ${cosmeticItem.cost}` })
                  .where(eq(players.id, id))

                await tx.insert(cosmeticsTransactions).values({
                  player_id: id,
                  item_id: itemId,
                  transaction_type: 'purchase',
                })
              })
            } else {
              // Card purchase — pay with coins, same atomic locked pattern
              await db.transaction(async (tx) => {
                const [row] = await tx
                  .select({
                    coins: players.coins,
                    card_inventory: players.card_inventory,
                  })
                  .from(players)
                  .where(eq(players.id, id))
                  .for('update')
                  .limit(1)
                if (!row) return

                // Check if user has enough coins
                if (row.coins < CARD_COST) {
                  ws.send({ type: 'signalError' })
                  return
                }

                // Convert inventory bit string to array
                const inventoryArray = row.card_inventory
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

                await tx
                  .update(players)
                  .set({
                    coins: sql`${players.coins} - ${CARD_COST}`,
                    card_inventory: newInventoryBitString,
                  })
                  .where(eq(players.id, id))

                // NOTE This is included just to keep track of purchases, but isn't really needed since the inventory is updated above
                await tx.insert(cosmeticsTransactions).values({
                  player_id: id,
                  item_id: itemId,
                  transaction_type: 'purchase',
                })
              })
            }

            // Send updated user data
            await sendUserData(ws, id)
          }),
        )
        .on(
          'setCosmeticSet',
          authed(async ({ value }) => {
            await db
              .update(players)
              .set({ cosmetic_set: JSON.stringify(value) })
              .where(eq(players.id, id))
          }),
        )
        // Connect to match
        .on(
          'initMission',
          authed(async ({ deck, missionID }) => {
            console.log('Mission:', missionID, 'for player: ', username)

            // This might fail if the mission is invalid
            try {
              activeGame.match = new PveMatchMission(ws, id, deck, missionID)
            } catch (e) {
              console.error('initMission:', e)
              return
            }

            // Just like in pve, we are player 1
            activeGame.playerNumber = 0

            logFunnelEvent(id, 'play_mode', 'journey')

            // Start the match and let user know the starting state
            await activeGame.match.startMatch()
            await activeGame.match.notifyState()
          }),
        )
        .on(
          'initPve',
          authed(async ({ aiDeck, deck }) => {
            console.log(
              'PvE:',
              username,
              ' ',
              deck.cards
                .map((cardId) => Catalog.getCardById(cardId).name)
                .join(', '),
            )

            activeGame.match = new PveMatch(ws, id, deck, aiDeck)
            await activeGame.match.startMatch()

            // TODO Explain why to make us player 1
            activeGame.playerNumber = 0

            // Analytics
            logFunnelEvent(id, 'play_mode', 'pve')

            // Start the match
            await activeGame.match.startMatch()
            await activeGame.match.notifyState()
          }),
        )
        .on(
          'initSpecialPve',
          authed(async ({ aiDeck, deck, enabledModes }) => {
            console.log(
              'Race:',
              username,
              ' ',
              deck.cards
                .map((cardId) => Catalog.getCardById(cardId).name)
                .join(', '),
            )

            activeGame.match = new PveSpecialMatch(
              ws,
              id,
              deck,
              aiDeck,
              enabledModes,
            )
            activeGame.playerNumber = 0

            // Analytics
            logFunnelEvent(id, 'play_mode', 'race')

            // Start the match and let user know the starting state
            await activeGame.match.startMatch()
            await activeGame.match.notifyState()
          }),
        )
        .on(
          'initPvp',
          authed(async (data) => {
            // Clean up stale entries first
            Object.keys(searchingPlayers).forEach((password) => {
              // Ensure we never queue into ourself
              const isSelf = searchingPlayers[password].id === id

              // Ensure we don't queue into closed connections
              const isClosed = !searchingPlayers[password].ws.isOpen()

              if (isClosed || isSelf) {
                delete searchingPlayers[password]
              }
            })

            // Analytics
            logFunnelEvent(id, 'play_mode', 'pvp_queued_up')

            // Check if there is another player, and they are still ready
            const otherPlayer: WaitingPlayer = searchingPlayers[data.password]
            if (otherPlayer) {
              console.log(
                'PVP:',
                username,
                ' ',
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
                id,
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
                id: id,
                deck: data.deck,
                activeGame: activeGame,
                queuedAt: Date.now(),
                notifiedDiscord: false,
              }
              searchingPlayers[data.password] = waitingPlayer
            }
          }),
        )
        .on(
          'initTutorial',
          authed(async (data) => {
            console.log('Tutorial: ', data.num, 'for player: ', username)

            activeGame.match = new TutorialMatch(ws, data.num, id)
            activeGame.playerNumber = 0

            // Start the match and let user know the starting state
            await activeGame.match.startMatch()
            await activeGame.match.notifyState()
          }),
        )
        .on(
          'cancelQueue',
          authed(({ password }) => {
            delete searchingPlayers[password]
          }),
        )
        .on(
          'setCanBeSpectated',
          authed(({ allowed }) => {
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
          }),
        )
        // Spectator mode: watch another connected user's match (requires sign-in,
        // so the spectator is attached only after the auth gate)
        .on(
          'spectatePlayer',
          authed(async ({ targetUuid }) => {
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
            spectatingUserIds.add(id)

            // Notify the watched player (not the opponent) that someone is spectating
            const watchedWs =
              perspective === 0
                ? targetActive.match.ws1
                : targetActive.match.ws2
            if (watchedWs?.isOpen()) {
              watchedWs.send({
                type: 'spectatorJoined',
                username,
              })
            }
          }),
        )
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
        // Accumulate playtime
        if (id && connectionTime !== null) {
          const elapsed = Math.floor((Date.now() - connectionTime) / 1000)
          connectionTime = null
          if (elapsed > 0) {
            db.update(players)
              .set({ playtime: sql`${players.playtime} + ${elapsed}` })
              .where(eq(players.id, id))
              .catch((e) => console.error('Error updating playtime:', e))
          }
        }

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

      // Notify Discord when a player has been searching for 2+ minutes
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL
      if (webhookUrl) {
        const now = Date.now()
        const toNotify = Object.values(searchingPlayers).filter(
          (p) => !p.notifiedDiscord && now - p.queuedAt >= 2 * 60 * 1000,
        )
        if (toNotify.length > 0) {
          const ids = toNotify.map((p) => p.id)
          const rows = await db
            .select({ id: players.id, username: players.username })
            .from(players)
            .where(inArray(players.id, ids))
          for (const player of toNotify) {
            player.notifiedDiscord = true
            const username =
              rows.find((r) => r.id === player.id)?.username ?? 'A player'
            fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: `${username} is searching for an opponent.\nAre any <@&${DISCORD_ACTIVE_PLAYER_ROLE_ID}> around to help them out?`,
                allowed_mentions: {
                  roles: [DISCORD_ACTIVE_PLAYER_ROLE_ID],
                },
              }),
            }).catch((e) => console.error('Discord webhook error:', e))
          }
        }
      }
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
