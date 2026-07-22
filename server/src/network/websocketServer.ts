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
import {
  players,
  approvedRefs,
  cosmeticsTransactions,
  loadTimes,
} from '../db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { ServerWS } from '../../../shared/network/celestialTypedWebsocket'
import { AccountLinkSummary } from '../../../shared/network/messagesToClient'
import { Deck } from '../../../shared/types/deck'
import { CosmeticSet } from '../../../shared/types/cosmeticSet'
import { AchievementManager } from '../achievementManager'
import Garden from '../db/garden'
import Catalog from '../../../shared/state/catalog'
import allPurchaseables from '../../../shared/purchaseables/index'
import playerOwnsCosmeticSet, {
  sanitizedCosmeticSet,
} from './cosmeticOwnership'

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
interface ActiveGame {
  match: Match
  // Whether this is player 0 or 1 in the match
  playerNumber: 0 | 1
}

// A player waiting for a game and their associated data
interface WaitingPlayer {
  ws: ServerWS
  id: string
  username: string
  deck: Deck
  activeGame: ActiveGame
  // Time when they queued
  queuedAt: number
  notifiedDiscord: boolean
}

const CARD_COST = 1000
const INVALID_CLOSE_CODE = 1008

/** How often to ping each socket. A socket that hasn't ponged by the next ping
 * is dead (e.g. wifi drop with no TCP close) and gets terminated, so stale
 * connections can't sit in the queue / a match looking open. Browsers answer
 * protocol pings automatically, so this needs no client support. */
const HEARTBEAT_INTERVAL_MS = 15 * 1000

/** How often the server broadcasts the online players list to everyone. */
const BROADCAST_INTERVAL_MS = 2000

/** How long a player searches before matchmaking helpers are pinged on Discord. */
const LONG_SEARCH_NOTIFY_MS = 2 * 60 * 1000

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

// Each signed-in user's display info, cached at sign-in and updated on change,
// so the online-players broadcast never needs to query the database
let onlinePlayerDisplay: {
  [key: string]: { username: string; cosmeticSet: CosmeticSet }
} = {}

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

  // Skip tombstoned rows: a merged account must never capture a login (nor get
  // its provider id backfilled), so a fresh login lands on the survivor.
  const [byColumn] = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(column, providerId), isNull(players.closed_at)))
    .limit(1)
  if (byColumn) return byColumn.id

  // Legacy account, created before linking and keyed by the derived id.
  const legacyId = uuidv5(providerId, UUID_NAMESPACE)
  const [byLegacy] = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.id, legacyId), isNull(players.closed_at)))
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

// Columns needed to preview an account in the link "keep which?" dialog
type LinkRow = {
  id: string
  username: string
  coins: number
  gems: number
  decks: string[]
}

function summarizeAccount(row: LinkRow): AccountLinkSummary {
  return {
    id: row.id,
    username: row.username,
    coins: row.coins,
    gems: row.gems,
    deckCount: row.decks.length,
  }
}

// Create the websocket server
export default function createWebSocketServer() {
  const wss = new WebSocketServer({ port: USER_DATA_PORT })

  // Every connected socket, swept by the heartbeat below
  const openSockets = new Set<ServerWS>()

  setInterval(() => {
    openSockets.forEach((ws) => {
      // Belt-and-braces: drop sockets that closed without their cleanup running
      if (!ws.isOpen()) {
        openSockets.delete(ws)
        return
      }
      // No pong since the last ping: the connection is dead. Terminate fires
      // 'close', so the normal disconnect cleanup (queue, match) runs.
      if (!ws.heartbeat()) {
        ws.terminate()
      }
    })
  }, HEARTBEAT_INTERVAL_MS)

  // Build the online players list once per tick from in-memory state, and send
  // the same list to every connection
  const broadcastOnlinePlayers = () => {
    const activeUserIds = Object.keys(activePlayers).filter((userId) =>
      activePlayers[userId]?.isOpen(),
    )
    if (activeUserIds.length === 0) return

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

    const playersList = activeUserIds
      .filter((userId) => onlinePlayerDisplay[userId] !== undefined)
      .map((userId) => ({
        uuid: userId,
        username: onlinePlayerDisplay[userId].username,
        cosmeticSet: onlinePlayerDisplay[userId].cosmeticSet,
        status: getStatusForUserId(userId),
        canBeSpectated: spectateAllowedByUserId[userId] !== false,
      }))

    activeUserIds.forEach((userId) => {
      const userWs = activePlayers[userId]
      if (userWs?.isOpen()) {
        userWs.send({
          type: 'broadcastOnlinePlayersList',
          players: playersList,
        })
      }
    })
  }

  // Ping matchmaking helpers on Discord when someone has been searching a while
  const notifyDiscordOfLongSearches = () => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL
    if (!webhookUrl) return

    const now = Date.now()
    Object.values(searchingPlayers).forEach((player) => {
      if (player.notifiedDiscord) return
      if (now - player.queuedAt < LONG_SEARCH_NOTIFY_MS) return

      player.notifiedDiscord = true
      const username =
        onlinePlayerDisplay[player.id]?.username ??
        player.username ??
        'A player'
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `**${username}** is searching for an opponent.\nAre any <@&${DISCORD_ACTIVE_PLAYER_ROLE_ID}> around to help them out?`,
          allowed_mentions: {
            roles: [DISCORD_ACTIVE_PLAYER_ROLE_ID],
          },
        }),
      }).catch((e) => console.error('Discord webhook error:', e))
    })
  }

  setInterval(() => {
    try {
      broadcastOnlinePlayers()
      notifyDiscordOfLongSearches()
    } catch (e) {
      console.error('Error broadcasting online players:', e)
    }
  }, BROADCAST_INTERVAL_MS)

  wss.on('connection', async (socket: WebSocket) => {
    try {
      const ws: ServerWS = new TypedWebSocket(socket)
      openSockets.add(ws)

      // Remember the user once they've signed in
      let id: string = null
      let username: string = null
      let email: string = null
      // Used when a new account is created
      let googleId: string | null = null
      let steamId: string | null = null

      // A pending account-link awaiting the user's survivor choice. Set when
      // linkProvider finds a collision; consumed by confirmAccountLink.
      let pendingLink: {
        currentId: string
        otherId: string
        googleSub: string
        email: string | null
      } | null = null

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
            cosmetic_set: players.cosmetic_set,
            closed_at: players.closed_at,
          })
          .from(players)
          .where(eq(players.id, uuid))
          .limit(1)

        if (result.length === 0) {
          ws.send({ type: 'promptUserInit' })
          return
        }

        // Tombstoned account (merged into a survivor). Its provider ids are
        // cleared so a fresh login can't reach it, but a stale session token
        // minted before the merge still could — reject it.
        if (result[0].closed_at) {
          id = null
          ws.send({ type: 'invalidToken' })
          ws.close(INVALID_CLOSE_CODE, 'Account has been merged')
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
        // Use the can-be-spectated field from the user's database entry
        spectateAllowedByUserId[uuid] = result[0].can_be_spectated
        // A fresh session starts out not spectating (clears any flag left by a
        // kicked connection, whose late close doesn't touch user-keyed state)
        spectatingUserIds.delete(uuid)

        // Cache display info for the online-players broadcast
        let cosmeticSet: CosmeticSet
        try {
          cosmeticSet = JSON.parse(result[0].cosmetic_set)
        } catch (e) {
          cosmeticSet = { avatar: 0, border: 0, relic: 0 } as CosmeticSet
        }
        onlinePlayerDisplay[uuid] = { username, cosmeticSet }

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

      // Starting a new game while still seated in a live one surrenders the
      // old one first, so an abandoned opponent gets their win immediately
      // instead of facing an empty seat. Normal exits already surrendered, so
      // this is a no-op for them.
      const surrenderActiveMatch = async () => {
        if (activeGame.match && !activeGame.match.isOver()) {
          await activeGame.match.doSurrender(ws)
        }
        activeGame.match = null
        activeGame.playerNumber = null
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
          console.log('Steam login — steamId:', steamId, 'accountId:', accountId)
          await handleSignInForUuid(accountId, { provider: 'steam' })
        })
        // Link a Google identity to the signed-in account. Case A (the Google
        // identity is unused) attaches it in place. Case B (it already backs a
        // populated account) needs the user to choose a survivor, so we reply
        // with a conflict and finish in confirmAccountLink.
        .on(
          'linkProvider',
          authed(async ({ credential }) => {
            const identity = await verifyGoogleCredential(credential)
            if (!identity) {
              ws.send({
                type: 'accountLinkResult',
                success: false,
                error: 'Invalid Google login.',
              })
              return
            }

            const [current] = await db
              .select({
                id: players.id,
                username: players.username,
                coins: players.coins,
                gems: players.gems,
                decks: players.decks,
                google_id: players.google_id,
              })
              .from(players)
              .where(eq(players.id, id))
              .limit(1)
            if (!current) return

            // Switching an existing Google link isn't supported — unlink first.
            if (current.google_id) {
              ws.send({
                type: 'accountLinkResult',
                success: false,
                error: 'This account already has a Google account linked.',
              })
              return
            }

            const summaryCols = {
              id: players.id,
              username: players.username,
              coins: players.coins,
              gems: players.gems,
              decks: players.decks,
            }

            // Resolve any account already backed by this Google identity: first
            // by the linked google_id, then (for legacy accounts not yet
            // backfilled into google_id) by the derived id that
            // resolveProviderAccount would key it under.
            let [existing] = await db
              .select(summaryCols)
              .from(players)
              .where(eq(players.google_id, identity.sub))
              .limit(1)
            if (!existing) {
              const legacyId = uuidv5(identity.sub, UUID_NAMESPACE)
              if (legacyId !== id) {
                ;[existing] = await db
                  .select(summaryCols)
                  .from(players)
                  .where(eq(players.id, legacyId))
                  .limit(1)
              }
            }

            // Case A: nobody owns this Google identity — attach it in place.
            if (!existing) {
              try {
                await db
                  .update(players)
                  .set({ google_id: identity.sub, email: identity.email })
                  .where(eq(players.id, id))
              } catch (e) {
                // e.g. the email collides with another account's unique index
                console.error('linkProvider (Case A):', e)
                ws.send({
                  type: 'accountLinkResult',
                  success: false,
                  error: 'Could not link account.',
                })
                return
              }
              ws.send({ type: 'accountLinkResult', success: true })
              await sendUserData(ws, id)
              return
            }

            // Case B: the identity backs another account — user picks a survivor.
            pendingLink = {
              currentId: id,
              otherId: existing.id,
              googleSub: identity.sub,
              email: identity.email,
            }
            ws.send({
              type: 'accountLinkConflict',
              current: summarizeAccount(current),
              other: summarizeAccount(existing),
            })
          }),
        )
        // Resolve a pending link: keepId survives, the other is tombstoned and
        // its provider ids move to the survivor. If the survivor isn't the
        // account this socket is signed in as, re-sign-in as the survivor.
        .on(
          'confirmAccountLink',
          authed(async ({ keepId }) => {
            const pending = pendingLink
            if (!pending) return
            if (keepId !== pending.currentId && keepId !== pending.otherId) {
              ws.send({
                type: 'accountLinkResult',
                success: false,
                error: 'Invalid choice.',
              })
              return
            }
            const loserId =
              keepId === pending.currentId ? pending.otherId : pending.currentId
            pendingLink = null

            let mergedEmail: string | null = null
            try {
              await db.transaction(async (tx) => {
                const [survivor] = await tx
                  .select({
                    google_id: players.google_id,
                    steam_id: players.steam_id,
                    email: players.email,
                    closed_at: players.closed_at,
                  })
                  .from(players)
                  .where(eq(players.id, keepId))
                  .for('update')
                  .limit(1)
                const [loser] = await tx
                  .select({
                    google_id: players.google_id,
                    steam_id: players.steam_id,
                    email: players.email,
                    closed_at: players.closed_at,
                  })
                  .from(players)
                  .where(eq(players.id, loserId))
                  .for('update')
                  .limit(1)
                if (!survivor || !loser) throw new Error('account missing')
                if (survivor.closed_at || loser.closed_at) {
                  throw new Error('account already closed')
                }

                // Fall back to the verified subject: a legacy loser row has a
                // null google_id (only its derived id encodes the sub), so
                // pending.googleSub is the only reliable source of the identity.
                const mergedGoogle =
                  survivor.google_id ?? loser.google_id ?? pending.googleSub
                const mergedSteam = survivor.steam_id ?? loser.steam_id
                mergedEmail = survivor.email ?? loser.email

                // Free the loser's unique-indexed columns before the survivor
                // claims them, and tombstone the row.
                await tx
                  .update(players)
                  .set({
                    google_id: null,
                    steam_id: null,
                    email: null,
                    closed_at: new Date(),
                    merged_into: keepId,
                  })
                  .where(eq(players.id, loserId))

                await tx
                  .update(players)
                  .set({
                    google_id: mergedGoogle,
                    steam_id: mergedSteam,
                    email: mergedEmail,
                  })
                  .where(eq(players.id, keepId))
              })
            } catch (e) {
              console.error('confirmAccountLink:', e)
              ws.send({
                type: 'accountLinkResult',
                success: false,
                error: 'Could not link accounts.',
              })
              return
            }

            // Merge committed. Tear down the tombstoned loser's in-memory state,
            // kicking its live connection if it's signed in on another socket.
            const identityChanged = keepId !== id
            try {
              const loserWs = activePlayers[loserId]
              if (loserWs && loserWs !== ws && loserWs.isOpen()) {
                loserWs.close(INVALID_CLOSE_CODE, 'Account has been merged')
              }
              delete activePlayers[loserId]
              delete spectateAllowedByUserId[loserId]
              delete onlinePlayerDisplay[loserId]
              spectatingUserIds.delete(loserId)
              delete userActiveGameMap[loserId]

              if (identityChanged) {
                // This socket is signed in as the now-tombstoned loser. Hand the
                // client a fresh session for the survivor; it reconnects (below)
                // so the new id is bound at connect time.
                sendSession({
                  uuid: keepId,
                  provider: 'steam',
                  email: mergedEmail,
                })
              } else {
                await sendUserData(ws, id)
              }
            } catch (e) {
              console.error('confirmAccountLink (post-merge):', e)
            }

            // The merge is committed, so the link succeeded regardless of the
            // best-effort cleanup above.
            ws.send({
              type: 'accountLinkResult',
              success: true,
              reconnect: identityChanged,
            })
          }),
        )
        // Client reports how long it took to load all game assets
        .on('reportLoadTime', ({ ms }) => {
          db.insert(loadTimes)
            .values({ player_id: id ?? null, load_ms: ms })
            .catch((e) => console.error('Error persisting load time:', e))
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
          authed(
            async ({
              username: newUsername,
              decks,
              inventory,
              missions,
              ref,
            }) => {
              // If username already exists, error (Currently client sees error on their side, so this shouldn't happen. But if it does, don't create the row)
              // Exception: Allow multiple "Guest" usernames
              if (newUsername !== 'Guest') {
                const result = await db
                  .select()
                  .from(players)
                  .where(
                    sql`LOWER(${players.username}) = LOWER(${newUsername})`,
                  )
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
                username: newUsername,
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
              username = newUsername

              // Log about it
              console.log(
                `New account registered: ${username} ${ref ? `, ref: ${ref}` : ''}`,
              )

              // Add to active users
              activePlayers[id] = ws
              connectionTime = Date.now()

              // Cache display info for the online-players broadcast
              onlinePlayerDisplay[id] = {
                username: newUsername,
                cosmeticSet: JSON.parse(data.cosmetic_set),
              }

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
          ),
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
              // Lock the row so two rapid claims can't both read "unclaimed"
              // and double-award the coins (same pattern as purchaseItem)
              const [playerData] = await tx
                .select({
                  missiongoldclaimed: players.missiongoldclaimed,
                })
                .from(players)
                .where(eq(players.id, id))
                .for('update')
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

                // Check if already owned
                if (row.card_inventory[itemId] === '1') {
                  ws.send({ type: 'signalError' })
                  return
                }

                // Mark the card as owned, padding with '0' in case the stored
                // string is shorter than this card's id
                const padded = row.card_inventory.padEnd(itemId + 1, '0')
                const newInventoryBitString =
                  padded.slice(0, itemId) + '1' + padded.slice(itemId + 1)

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
            if (!(await playerOwnsCosmeticSet(id, value))) {
              // Client set to something they didn't own
              ws.send({ type: 'signalError' })
              await sendUserData(ws, id)
              return
            }

            // Keep the online-players broadcast cache in sync
            if (onlinePlayerDisplay[id]) {
              onlinePlayerDisplay[id].cosmeticSet = value
            }

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

            await surrenderActiveMatch()

            deck.cosmeticSet = await sanitizedCosmeticSet(id, deck.cosmeticSet)

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
                .map((cardId) => Catalog.getCardById(cardId)?.name ?? '?')
                .join(', '),
            )

            await surrenderActiveMatch()

            deck.cosmeticSet = await sanitizedCosmeticSet(id, deck.cosmeticSet)

            activeGame.match = new PveMatch(ws, id, deck, aiDeck)
            activeGame.playerNumber = 0

            // Analytics
            logFunnelEvent(id, 'play_mode', 'pve')

            // Start the match and let user know the starting state
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
                .map((cardId) => Catalog.getCardById(cardId)?.name ?? '?')
                .join(', '),
            )

            await surrenderActiveMatch()

            deck.cosmeticSet = await sanitizedCosmeticSet(id, deck.cosmeticSet)

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
            await surrenderActiveMatch()

            data.deck.cosmeticSet = await sanitizedCosmeticSet(
              id,
              data.deck.cosmeticSet,
            )

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
                  .map((cardId) => Catalog.getCardById(cardId)?.name ?? '?')
                  .join(', '),
                '\n',
                otherPlayer.deck.cards
                  .map((cardId) => Catalog.getCardById(cardId)?.name ?? '?')
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
              // Re-register the game in the map: if the other player dropped
              // and their close handler deleted their entry, reconnecting
              // could otherwise never find this match
              userActiveGameMap[otherPlayer.id] = otherPlayer.activeGame

              // TODO Maybe just delete the last one? Somehow don't lose to race conditions
              delete searchingPlayers[data.password]

              // If Discord was notified that this player was searching, follow up that a match was found
              if (otherPlayer.notifiedDiscord) {
                const webhookUrl = process.env.DISCORD_WEBHOOK_URL
                if (webhookUrl) {
                  fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      content: `**${otherPlayer.username}** has found a match!`,
                    }),
                  }).catch((e) => console.error('Discord webhook error:', e))
                }
              }

              // Notify both players that they are connected
              // Start the match and let both users know the starting state
              await activeGame.match.startMatch()
              await activeGame.match.notifyState()
            } else {
              // Queue the player with their information
              const waitingPlayer = {
                ws: ws,
                id: id,
                username: username,
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

            await surrenderActiveMatch()

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
            if (searchingPlayers[password]?.ws === ws) {
              delete searchingPlayers[password]
            }
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
          activeGame.playerNumber = null
        })
        // TODO This is deprecated, remove if not using
        .on('emote', () => {
          activeGame?.match?.signalEmote(activeGame.playerNumber, 0)
        })

      // Handle disconnect logic
      ws.onClose(() => {
        openSockets.delete(ws)

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

        // Whether this socket is still the user's current connection. False
        // for a socket that was kicked by a newer sign-in — its late close
        // must not wipe the state the new connection has established.
        const isCurrentSocket = id !== null && activePlayers[id] === ws

        // Remove them from the matchmaking queue, so no one matches into a
        // dead connection and loads into a match their opponent never joins
        Object.keys(searchingPlayers).forEach((password) => {
          if (searchingPlayers[password].ws === ws) {
            delete searchingPlayers[password]
          }
        })

        // If this socket was spectating, remove it from the watched match
        const spectating = spectatorWsToMatch.get(ws)
        if (spectating) {
          spectating.removeSpectator(ws)
          spectatorWsToMatch.delete(ws)
        }

        // The user-keyed state belongs to the user's current connection only
        if (isCurrentSocket) {
          delete activePlayers[id]
          delete spectateAllowedByUserId[id]
          delete onlinePlayerDisplay[id]
          spectatingUserIds.delete(id)

          // Disconnect from active match if it hasn't ended
          if (activeGame.match && !activeGame.match.isOver()) {
            // Defensive: only signal the match if this socket holds a seat
            if (activeGame.match.ws1 === ws || activeGame.match.ws2 === ws) {
              activeGame.match.doDisconnect(ws)
            }

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
        }
      })
    } catch (e) {
      console.error('Error in user data server:', e)
    }
  })

  console.log('User-data server is running on port: ', USER_DATA_PORT)
}
