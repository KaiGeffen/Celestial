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
import { and, eq, sql, inArray } from 'drizzle-orm'
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
import { MechanicsSettings, TUTORIAL_LENGTH } from '../../../shared/settings'
import { markMissionsComplete } from '../db/updateMatchResult'
import { logFunnelEvent } from '../db/analytics'
import TutorialMatch from './match/tutorialMatch'
import sendUserData from './sendUserData'
import { getStartingInventoryBitString } from '../startingInventory'
import PveSpecialMatch from './match/pveSpecialMatch'
import REWARD_AMOUNTS from '../../../shared/config/rewardAmounts'
import { journeyData } from '../../../shared/journey/journey'
import { v5 as uuidv5 } from 'uuid'

// An ongoing match
class ActiveGame {
  match: Match
  // Whether this is player 0 or 1 in the match
  playerNumber: 0 | 1
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
const INVALID_CLOSE_CODE = 1008

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
      let email: string = null
      // Used when a new account is created
      let googleId: string | null = null
      let steamId: string | null = null

      // When the session started
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
        email = opts.email ?? null
        id = uuid

        // Check if user is already connected with a live websocket
        const existingWs = activePlayers[uuid]
        if (existingWs && existingWs.isOpen()) {
          // Close the old connection to allow the new one
          existingWs.close(INVALID_CLOSE_CODE, 'Logged in from another device')

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
            can_be_spectated: players.can_be_spectated,
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
          ws.send({ type: 'invalidToken' })
          ws.close(INVALID_CLOSE_CODE, 'Account requires provider sign-in')
          return
        }

        // Add to active users
        activePlayers[uuid] = ws
        connectionTime = Date.now()
        username = result[0].username
        // User the can be spectated field from the user's database entry
        spectateAllowedByUserId[uuid] = result[0].can_be_spectated

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

      // Issue and deliver a session token so user can stay signed in
      const sendSession = (claims: SessionClaims) => {
        const token = issueSessionToken(claims)
        if (token) ws.send({ type: 'sessionToken', token })
      }

      ws.on('signIn', async ({ uuid }) => {
        // Guest sign-in: no identity proof, so this can only ever reach
        // guest accounts (enforced inside handleSignInForUuid).
        // Clear any provider identities that may have been set by a prior
        // failed sign-in attempt on this same connection.
        email = null
        googleId = null
        steamId = null
        await handleSignInForUuid(uuid, { provider: 'guest' })
      })
        .on('loginGoogle', async ({ credential }) => {
          const identity = await verifyGoogleCredential(credential)
          if (!identity) {
            ws.send({ type: 'invalidToken' })
            ws.close(INVALID_CLOSE_CODE, 'Invalid Google credential')
            return
          }

          // Resolve to an account by the VERIFIED subject, not trusted from client
          const accountId = await resolveProviderAccount(
            'google',
            identity.sub,
            identity.email,
          )
          googleId = identity.sub

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
            ws.close(INVALID_CLOSE_CODE, 'Invalid or expired session')
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
          steamId = await verifySteamTicket(ticket)
          if (!steamId) {
            ws.send({ type: 'invalidToken' })
            ws.close(INVALID_CLOSE_CODE, 'Invalid Steam ticket')
            return
          }

          const accountId = await resolveProviderAccount('steam', steamId, null)
          await handleSignInForUuid(accountId, { provider: 'steam' })
        })
        // User sends their decks to the server
        .on(
          'sendDecks',
          authed(async ({ decks }) => {
            await db
              .update(players)
              .set({ decks: decks.map((deck) => JSON.stringify(deck)) })
              .where(eq(players.id, id))
          }),
        )
        // Skip the tutorials
        .on(
          'skipTutorials',
          authed(async () => {
            await markMissionsComplete(
              id,
              Array.from({ length: TUTORIAL_LENGTH }, (_, i) => i),
            )
            await sendUserData(ws, id)
          }),
        )
        // Make a choice in the journey mode
        .on(
          'sendJourneyChoice',
          authed(async ({ characterIndex, choice }) => {
            // TODO This is hardcoded to be the first 6 characters
            if (characterIndex < 0 || characterIndex > 5) return
            // Choice must be 0 or 1
            if (choice !== 0 && choice !== 1) return

            const row = await db
              .select({ journey_choices: players.journey_choices })
              .from(players)
              .where(eq(players.id, id))
              .limit(1)

            // Update the journey choices array stored in the database
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
                ws.send({ type: 'signalError' })
                return
              }
            }

            // Create new user entry in database
            const data = {
              id: id,
              email: email,
              google_id: googleId,
              steam_id: steamId,
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
              // TODO Server-authoritative: inventory + completedmissions are
              // trusted from the client here (to migrate guest progress on
              // registration). A crafted client could pre-load these at creation.
              // Make these server-derived (or validate) once guest migration is
              // handled properly.
              inventory: inventory,
              completedmissions: missions,
              missiongoldclaimed: '',
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
            // Send user their updated values (Above is just used for animation)
            if (harvestResult.success) await sendUserData(ws, id)
          }),
        )
        .on(
          'claimMissionRewards',
          authed(async ({ missionId }) => {
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
          }),
        )
        // Buy an item from the store
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

                // Check if already owned
                const existing = await tx
                  .select({ item_id: cosmeticsTransactions.item_id })
                  .from(cosmeticsTransactions)
                  .where(
                    and(
                      eq(cosmeticsTransactions.player_id, id),
                      eq(cosmeticsTransactions.item_id, itemId),
                    ),
                  )
                if (existing.length > 0) {
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
            // TODO Validate the selection is actually owned (cosmetics from
            // cosmeticsTransactions, avatars/borders/cardbacks from unlock rules)
            // before persisting. Currently trusts the client's chosen set.
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

            activeGame.playerNumber = 0

            // Analytics
            logFunnelEvent(id, 'play_mode', 'pve')

            // Start the match
            await activeGame.match.startMatch()
            await activeGame.match.notifyState()
          }),
        )
        // TODO Remove Race
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

            // Start the game with another player
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
            // Save the preference to the database
            db.update(players)
              .set({ can_be_spectated: allowed })
              .where(eq(players.id, id))
              .catch((e) =>
                console.error('Error persisting canBeSpectated:', e),
              )

            // Host disabled spectating mid-match: drop everyone watching their perspective.
            if (!allowed) {
              const ag = userActiveGameMap[id]
              if (ag?.match && !ag.match.isOver()) {
                // Which side of the game has disabled spectating
                const perspective = ag.playerNumber

                const removed =
                  ag.match.removeAllSpectatorsForPerspective(perspective)
                for (const spectatorWs of removed) {
                  spectatorWsToMatch.delete(spectatorWs)
                  const sid = Object.keys(activePlayers).find(
                    (uid) => activePlayers[uid] === spectatorWs,
                  )
                  if (sid) spectatingUserIds.delete(sid)
                  if (spectatorWs.isOpen()) {
                    spectatorWs.send({ type: 'spectateEnded' })
                  }
                }
              }
            }
          }),
        )
        // Spectator mode: watch another connected user's match
        // Requires sign-in, so the spectator is attached only after the auth gate
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

            // Can only spectate one game
            const prevMatch = spectatorWsToMatch.get(ws)
            if (prevMatch) {
              prevMatch.removeSpectator(ws)
              spectatorWsToMatch.delete(ws)
            }

            const perspective = targetActive.playerNumber
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
        // Given player initiating exitting spectator mode
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
          activeGame?.match?.doAction(
            activeGame.playerNumber,
            data.cardNum,
            data.versionNo,
          )
        })
        .on('mulligan', (data) => {
          activeGame?.match?.doMulligan(activeGame.playerNumber, data.mulligan)
        })
        .on('passTurn', (data) => {
          activeGame?.match?.doAction(
            activeGame.playerNumber,
            MechanicsSettings.PASS,
            data.versionNo,
          )
        })
        .on('surrender', async () => {
          await activeGame?.match?.doSurrender(ws)
          activeGame.match = null
        })
        // TODO This is deprecated, remove if not using
        .on('emote', () => {
          activeGame?.match?.signalEmote(activeGame.playerNumber, 0)
        })

      // Handle disconnect logic
      ws.onClose(() => {
        // Accumulate playtime
        if (id && connectionTime) {
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

          // Retain the active game for when user reconnects (Except tutorial)
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
}
