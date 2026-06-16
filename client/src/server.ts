import 'phaser'

/// <reference path="./types/electron.d.ts" />

import { Flags, Url, UserSettings } from './settings/settings'
import BaseScene from './scene/baseScene'
import { TypedWebSocket } from '../../shared/network/typedWebSocket'
import {
  URL,
  USER_DATA_PORT,
  UUID_NAMESPACE,
} from '../../shared/network/settings'
import type { GoogleJwtPayload } from './types/google'
import jwt_decode from 'jwt-decode'
import { ClientWS } from '../../shared/network/celestialTypedWebsocket'
import { Deck } from '../../shared/types/deck'
import { CosmeticSet } from '../../shared/types/cosmeticSet'
import GameModel from '../../shared/state/gameModel'
import { v5 as uuidv5 } from 'uuid'
import messagesToClient from '../../shared/network/messagesToClient'
import messagesToServer from '../../shared/network/messagesToServer'
import { UserData, userDataStore } from './userDataStore'

// WebSocket normal-closure code (1000), used whenever we close the connection.
const code = 1000

interface SteamAuthResult {
  steamId: string
  ticket: string
}

interface AuthHandlers {
  onPromptUserInit?: () => void
  onInvalidToken?: () => void
}

// The websocket connetion to the server
export var server: ClientWS = undefined

// Crash-guard fallback returned by getUserData() when nothing is loaded. This
// shouldn't be hit in the live app (see getUserData) — the store holds null.
const LOGGED_OUT_USER_DATA: UserData = {
  uuid: null,
  username: null,
  elo: null,
  pveWins: 0,
  garden: [],
  gems: null,
  coins: null,
  ownedItems: [],
  missionGoldClaimed: [],
  cosmeticSet: {
    avatar: 0,
    border: 0,
    cardback: 0,
    relic: 0,
  },
  achievements: [],
  canBeSpectated: true,
}

export default class Server {
  static pendingReconnect: { state: GameModel } | null = null
  static activePlayers: {
    uuid: string
    username: string
    cosmeticSet: CosmeticSet
    status: number
    canBeSpectated: boolean
  }[] = []

  private static connectAndAuthenticate(
    uuid: string,
    game: Phaser.Game,
    callback: () => void,
    sendAuth: () => void,
    handlers?: AuthHandlers,
  ): void {
    server = Server.getSocket()
    server.onOpen(sendAuth)

    if (handlers?.onPromptUserInit) {
      server.on('promptUserInit', handlers.onPromptUserInit)
    }
    if (handlers?.onInvalidToken) {
      server.on('invalidToken', handlers.onInvalidToken)
    }

    this.registerCommonHandlers(uuid, game, callback)
  }

  private static sendInitialDataForUsername(username: string): void {
    const decks = UserSettings._get('decks')
    const inventory = UserSettings._get('inventory')
    const missions = UserSettings._get('completedMissions')
    const ref = Server.getReferralCode()

    server.send({
      type: 'sendInitialUserData',
      username,
      decks: decks,
      inventory: Server.convertBoolArrayToBitString(inventory),
      missions: Server.convertBoolArrayToBitString(missions),
      ref,
    })
  }

  private static promptForUsernameRegistration(game: Phaser.Game): void {
    // Hide the signin button while username menu is active
    document.getElementById('signin').hidden = true

    game.scene.getAt(0).scene.launch('MenuScene', {
      menu: 'registerUsername',
      // Ensure that user is logged out and can signin if they cancel
      exitCallback: () => {
        Server.logout()

        // Ensure guest button is visible
        game.scene.getScenes(true).forEach((scene) => {
          scene.events.emit('showGuestButton')
        })
      },
    })
  }

  // Log in with the server using a Google ID token (credential).
  static login(credential: string, game: Phaser.Game, callback) {
    /*
    Send the raw Google credential to the server, which verifies it and derives
    the account id itself. We decode it here only to compute the uuid for local
    bookkeeping — the server never trusts this client-side value.
    Register a listener for the response of the user-data.
    Listen for a prompt for user to send initial values (Local storage information).
    Listen for invalid_token and show an error message.

    This websocket stays open, and when the user updates anything that info
    gets sent to the server.
    */

    const payload = jwt_decode<GoogleJwtPayload>(credential)
    const uuid = uuidv5(payload.sub, UUID_NAMESPACE)

    this.connectAndAuthenticate(
      uuid,
      game,
      callback,
      () => {
        server.send({
          type: 'loginGoogle',
          credential,
        })
      },
      {
        onPromptUserInit: () => {
          this.promptForUsernameRegistration(game)
        },
        onInvalidToken: () => {
          console.log(
            'Server has indicated that sent token is invalid. Logging out.',
          )

          game.scene.getScenes(true).forEach((scene) => {
            if (scene instanceof BaseScene) {
              scene.signalError('Invalid login token.')
            }
          })

          if (server) server.close(code)
          server = undefined
        },
      },
    )
  }

  // Log in using a previously issued server session token. This is the normal
  // reconnect/return path for Google users — it does not need a fresh (1-hour)
  // Google token.
  static loginWithSession(token: string, game: Phaser.Game, callback): void {
    // The session token is a JWT; we decode it (no secret needed) only to read
    // the uuid for local bookkeeping. The server re-verifies its signature.
    let uuid: string
    try {
      uuid = jwt_decode<{ uuid: string }>(token).uuid
    } catch (e) {
      console.error('Failed to decode session token:', e)
      localStorage.removeItem(Url.session_token)
      return
    }

    this.connectAndAuthenticate(
      uuid,
      game,
      callback,
      () => {
        server.send({
          type: 'loginSession',
          token,
        })
      },
      {
        onPromptUserInit: () => this.promptForUsernameRegistration(game),
        onInvalidToken: () => {
          // A normal outcome once the session expires — clear it and fall back
          // to the sign-in UI rather than showing an error.
          console.log('Session expired or invalid; showing sign-in.')
          localStorage.removeItem(Url.session_token)
          if (server) server.close(code)
          server = undefined

          const signinEl = document.getElementById('signin')
          if (signinEl) signinEl.hidden = false
          game.scene.getScenes(true).forEach((scene) => {
            scene.events.emit('showGuestButton')
          })
        },
      },
    )
  }

  // Log in with Steam (Electron builds only)
  static async loginSteam(game: Phaser.Game, callback): Promise<boolean> {
    const api = window.electronAPI

    // Return if no auth session
    if (!api?.getSteamAuthSession) return false

    const session = await api.getSteamAuthSession()
    if (!session?.steamId || !session?.ticket) {
      console.error('Steam auth session was not available')
      return false
    }

    // Cache the UUID in case of reconnect
    const uuid = uuidv5(session.steamId, UUID_NAMESPACE)
    localStorage.setItem('steam_uuid', uuid)

    this.connectAndAuthenticate(
      uuid,
      game,
      callback,
      () => {
        server.send({
          type: 'loginSteam',
          ticket: session.ticket,
        })
      },
      {
        onPromptUserInit: () => {
          this.promptForUsernameRegistration(game)
        },
      },
    )
    return true
  }

  // Log in as a guest with a generated UUID
  static loginGuest(game: Phaser.Game, callback) {
    // Get or generate a UUID for the guest
    let uuid = localStorage.getItem('guest_uuid')
    if (!uuid) {
      // Generate a random UUID for new guests
      uuid = crypto.randomUUID()
      localStorage.setItem('guest_uuid', uuid)
    }

    this.connectAndAuthenticate(
      uuid,
      game,
      callback,
      () => {
        server.send({
          type: 'signIn',
          uuid,
        })
      },
      {
        onPromptUserInit: () => this.sendInitialDataForUsername('Guest'),
        onInvalidToken: () => {
          console.error('Invalid guest token')
        },
      },
    )
  }

  // Register websocket event handlers common to all types of login flow
  private static registerCommonHandlers(
    uuid: string,
    game: Phaser.Game,
    callback: () => void,
  ) {
    server
      .on('sessionToken', ({ token }) => {
        // Persist the server-issued session for future reconnects.
        localStorage.setItem(Url.session_token, token)
      })
      .on('sendUserData', (data: messagesToClient['sendUserData']) => {
        // Authoritative account snapshot from the server.
        userDataStore.applyServerData(data, uuid)

        this.loadUserData(data, game)
        // TODO Bad smell, the callback should only happen once as it references a scene
        if (callback) {
          callback()
          callback = null
        }
      })
      .on(
        'harvestGardenResult',
        ({ success, newGarden, goldReward, gemReward }) => {
          // The authoritative garden + balances arrive via sendUserData (pushed
          // by the server after a harvest). Here we only relay the result to the
          // garden UI for its reward animation.
          game.events.emit('gardenHarvested', {
            success,
            newGarden: (newGarden ?? []).map((dateStr) => new Date(dateStr)),
            goldReward,
            gemReward,
          })
        },
      )
      .on('promptReconnect', (data) => {
        // Store reconnect data for PreloadScene to handle after assets load
        this.pendingReconnect = { state: data.state }
      })
      .on(
        'broadcastOnlinePlayersList',
        (data: messagesToClient['broadcastOnlinePlayersList']) => {
          // Store the list of players in a static field
          this.activePlayers = data.players
        },
      )

    server.ws.onerror = (event: Event) => {
      console.error(`WebSocket error: ${event}`)
    }
  }

  static logout(): void {
    // Clear user data after logging out
    userDataStore.clear()

    console.log('Logging out')

    // Clear the sign-in tokens
    localStorage.removeItem(Url.gsi_token)
    localStorage.removeItem(Url.session_token)

    if (server) server.close(code)
    server = undefined

    UserSettings.clearSessionStorage()

    // Show the signin button
    document.getElementById('signin').hidden = false
  }

  // Send a message to the server if the connection is open. Pass `context` to
  // log when it isn't; omit it for fire-and-forget messages that may race a
  // close and shouldn't spam the console.
  private static send<T extends keyof messagesToServer>(
    message: messagesToServer[T] & { type: T },
    context?: string,
  ): void {
    if (!server || !server.isOpen()) {
      if (context) console.error(`${context} when server ws doesn't exist.`)
      return
    }
    server.send(message)
  }

  // Send server an updated list of decks
  static sendDecks(decks: Deck[]): void {
    Server.send({ type: 'sendDecks', decks }, 'Sending decks')
  }

  // Tell server to skip the tutorials
  static skipTutorials(): void {
    Server.send({ type: 'skipTutorials' }, 'Skipping tutorials')
  }

  // Send player's choice for the ending to a character's journey (silent: fired
  // opportunistically, so a closed socket shouldn't log)
  static sendJourneyChoice(characterIndex: number, choice: 0 | 1): void {
    Server.send({ type: 'sendJourneyChoice', characterIndex, choice })
  }

  // TODO Remove avatar exp
  // Send server user's experience with each avatar
  static sendAvatarExperience(experience: number[]): void {
    Server.send(
      { type: 'sendAvatarExperience', experience },
      'Sending avatar experience',
    )
  }

  /** Set whether others may spectate this user's matches (per-account preference). */
  static setCanBeSpectated(allowed: boolean): void {
    // Client-owned: update locally then sync.
    userDataStore.setSpectatable(allowed)
    Server.send(
      { type: 'setCanBeSpectated', allowed },
      'Setting spectate preference',
    )
  }

  static purchaseItem(id: number): void {
    Server.send({ type: 'purchaseItem', id }, 'Purchasing item')
  }

  static claimMissionRewards(missionId: number): void {
    // missionGoldClaimed is server-authoritative: the server validates the claim
    // and pushes a fresh snapshot, so we don't guess it locally.
    Server.send(
      { type: 'claimMissionRewards', missionId },
      'Claiming mission rewards',
    )
  }

  static setCosmeticSet(cosmeticSet: CosmeticSet): void {
    // Client-owned: update locally (so the UI reflects it immediately) then sync.
    userDataStore.setCosmeticSet(cosmeticSet)
    Server.send(
      { type: 'setCosmeticSet', value: cosmeticSet },
      'Setting cosmetic set',
    )
  }

  // Get the referral code
  private static getReferralCode(): string | undefined {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('ref')
  }

  // Send all data necessary to initialize a user
  static sendInitialUserData(username: string): void {
    Server.send(
      {
        type: 'sendInitialUserData',
        username,
        decks: UserSettings._get('decks'),
        inventory: this.convertBoolArrayToBitString(
          UserSettings._get('inventory'),
        ),
        missions: this.convertBoolArrayToBitString(
          UserSettings._get('completedMissions'),
        ),
        ref: this.getReferralCode(),
      },
      'Sending initial user data',
    )
  }

  static getUserData(): UserData {
    const data = userDataStore.get()
    if (data === null) {
      // The user is always signed in once past SigninScene, so this signals an
      // ordering bug (reading account data before it loaded). The default is
      // only a crash guard.
      // TODO Becomes unreachable once read sites subscribe via bindUserData.
      console.error('getUserData() called with no signed-in user')
      return LOGGED_OUT_USER_DATA
    }
    return data
  }

  static setAchievementsSeen(): void {
    userDataStore.markAchievementsSeen()
    Server.send({ type: 'setAchievementsSeen' }, 'Setting achievements seen')
  }

  static accessDiscord(): void {
    Server.send({ type: 'accessDiscord' }, 'Accessing Discord')
  }

  static harvestGarden(plotNumber: number): void {
    Server.send(
      { type: 'harvestGarden', index: plotNumber },
      'Harvesting garden',
    )
  }

  private static convertBoolArrayToBitString(array: boolean[]): string {
    return array.map((value) => (value ? '1' : '0')).join('')
  }

  // Load user data that was sent from server into session storage
  private static loadUserData(
    data: messagesToClient['sendUserData'],
    game: Phaser.Game,
  ): void {
    // Map from binary string to bool array
    sessionStorage.setItem(
      'inventory',
      JSON.stringify(
        data.inventory
          .toString()
          .split('')
          .map((char) => char === '1'),
      ),
    )
    sessionStorage.setItem(
      'completedMissions',
      JSON.stringify(
        data.completedMissions
          .toString()
          .split('')
          .map((char) => char === '1'),
      ),
    )
    sessionStorage.setItem(
      'cardInventory',
      JSON.stringify(
        data.cardInventory
          .toString()
          .split('')
          .map((char) => char === '1'),
      ),
    )
    sessionStorage.setItem('decks', JSON.stringify(data.decks))
    sessionStorage.setItem(
      'journeyChoices',
      JSON.stringify(data.journeyChoices),
    )
    sessionStorage.setItem(
      'avatar_experience',
      JSON.stringify(data.avatar_experience),
    )

    // Emit event so scenes can refresh if needed
    game.events.emit('userDataUpdated')
  }

  // Attempt to reconnect by sending stored token or guest UUID
  static reconnect(game: Phaser.Game): void {
    // Close existing server connection if it exists
    if (server) {
      server.close()
      server = undefined
    }

    // Prefer the long-lived session token; it survives Google token expiry.
    const sessionToken = localStorage.getItem(Url.session_token)
    if (sessionToken !== null) {
      console.log('Reconnecting with session token')
      this.loginWithSession(sessionToken, game, () => {})
      return
    }

    // No durable session: Google users must re-auth through Google Identity
    // Services (handled on page load), so we never replay a stored — and likely
    // expired — Google credential here. Steam and guest can reconnect directly.
    {
      const steamUuid = localStorage.getItem('steam_uuid')
      if (steamUuid) {
        const api = window.electronAPI
        if (api?.getSteamAuthSession) {
          api
            .getSteamAuthSession()
            .then((session: SteamAuthResult | null) => {
              // If no verification ticket, don't attempt to connect
              if (!session?.ticket) return

              // Attempt login with the ticket
              this.connectAndAuthenticate(
                steamUuid,
                game,
                () => {},
                () => {
                  server.send({
                    type: 'loginSteam',
                    ticket: session.ticket,
                  })
                },
              )
            })
            .catch((e) =>
              console.error(
                'Failed to acquire Steam auth during reconnect:',
                e,
              ),
            )
          return
        }
      }

      // User signed in as guest - get guest UUID and send signIn
      const guestUuid = localStorage.getItem('guest_uuid')
      if (guestUuid) {
        this.connectAndAuthenticate(
          guestUuid,
          game,
          () => {},
          () => {
            server.send({
              type: 'signIn',
              uuid: guestUuid,
            })
          },
        )
      }
    }
  }

  // Get a websocket right for the current environment
  private static getSocket(): ClientWS {
    const path = Flags.local
      ? `ws://${URL}:${USER_DATA_PORT}`
      : `wss://celestialdecks.gg/user_data_ws`
    return new TypedWebSocket(path)
  }
}
