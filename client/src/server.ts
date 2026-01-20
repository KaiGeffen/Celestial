import 'phaser'

import Card from '../../shared/state/card'
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
import { Achievement } from '../../shared/types/achievement'
import GameModel from '../../shared/state/gameModel'
import { v5 as uuidv5 } from 'uuid'
import messagesToClient from '../../shared/network/messagesToClient'

const ip = '127.0.0.1'
const port = 5555
// Custom code for closing websocket connection due to invalid token
const code = 1000

// The websocket connetion to the server
export var server: ClientWS = undefined

// User data
type UserData = null | {
  uuid: string
  username: string
  elo: number
  garden: Date[]
  gems: number
  coins: number
  ownedItems: number[]
  cosmeticSet: CosmeticSet
  achievements: Achievement[]
}

export default class Server {
  private static userData: UserData = null
  static pendingReconnect: { state: GameModel } | null = null
  static activePlayers: {
    username: string
    cosmeticSet: CosmeticSet
  }[] = []

  // Log in with the server for user with given OAuth token
  static login(payload: GoogleJwtPayload, game: Phaser.Game, callback) {
    /*
    Destructure the payload
    Immediately send the payload information to server
    Register a listener for the response of the user-data
    Listen for a prompt for user to send initial values (Local storage information)
    Listen for invalid_token and show an error message
    Listen for close ? and resend the login information

    This websocket stays open, and when the user updates anything that info
    gets sent to the server. The wsServer above does get set by this, and user
    in the static methods below. 
    */

    const email = payload.email
    const uuid = uuidv5(payload.sub, UUID_NAMESPACE)
    const jti = payload.jti

    server = Server.getSocket()

    // Immediately send the payload information to server
    server.onOpen(() => {
      server.send({
        type: 'signIn',
        email,
        uuid,
        jti,
      })
    })

    // Register OAuth-specific handlers
    server
      .on('promptUserInit', () => {
        // Hide the signin button
        document.getElementById('signin').hidden = true

        // Open username registration menu
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
      })
      .on('invalidToken', () => {
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
      })

    // Register common handlers
    this.registerCommonHandlers(uuid, game, callback)
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

    server = Server.getSocket()

    // Send guest token with just UUID
    server.onOpen(() => {
      server.send({
        type: 'signIn',
        uuid,
      })
    })

    // Register guest-specific handlers
    server
      .on('promptUserInit', () => {
        const decks = UserSettings._get('decks')
        const inventory = UserSettings._get('inventory')
        const missions = UserSettings._get('completedMissions')

        server.send({
          type: 'sendInitialUserData',
          username: 'Guest',
          decks: decks,
          inventory: Server.convertBoolArrayToBitString(inventory),
          missions: Server.convertBoolArrayToBitString(missions),
        })
      })
      .on('invalidToken', () => {
        console.error('Invalid guest token')
      })

    // Register common handlers
    this.registerCommonHandlers(uuid, game, callback)
  }

  // Register common websocket event handlers for both OAuth and guest login
  private static registerCommonHandlers(
    uuid: string,
    game: Phaser.Game,
    callback: () => void,
  ) {
    server
      .on('sendUserData', (data: messagesToClient['sendUserData']) => {
        // Store the uuid and user data after successful login
        this.userData = {
          uuid,
          ...data,
          garden: data.garden.map((dateStr) => new Date(dateStr)),
        }

        this.loadUserData(data, game)
        // TODO Bad smell, the callback should only happen once as it references a scene
        if (callback) {
          callback()
          callback = null
        }
      })
      .on(
        'harvestGardenResult',
        ({ success, newGarden, reward, goldReward }) => {
          // Only update the stored garden if the harvest was successful
          if (success) {
            this.userData.garden = newGarden.map((dateStr) => new Date(dateStr))

            // Update coins
            if (goldReward !== undefined) {
              this.userData.coins = (this.userData.coins || 0) + goldReward
            }
          }

          // Emit global event that HomeScene can listen to regardless of success
          game.events.emit('gardenHarvested', {
            success: success,
            newGarden: this.userData.garden,
            reward: reward,
            goldReward: goldReward,
          })
        },
      )
      .on('promptReconnect', (data) => {
        // Store reconnect data for PreloadScene to handle after assets load
        this.pendingReconnect = { state: data.state }
      })
      .on('broadcastOnlinePlayersList', (data) => {
        // Store the list of players in a static field
        this.activePlayers = data.players
      })

    server.ws.onerror = (event: Event) => {
      console.error(`WebSocket error: ${event}`)
    }
  }

  static logout(): void {
    // Clear user data after logging out
    this.userData = null

    console.log('Logging out')

    // Clear the sign-in token
    localStorage.removeItem(Url.gsi_token)

    if (server) server.close(code)
    server = undefined
    Server.userData = null

    UserSettings.clearSessionStorage()

    // Show the signin button
    document.getElementById('signin').hidden = false
  }

  // Send server an updated list of decks
  static sendDecks(decks: Deck[]): void {
    if (!server || !server.isOpen()) {
      console.error('Sending decks when server ws doesnt exist.')
      return
    }
    server.send({
      type: 'sendDecks',
      decks: decks,
    })
  }

  // Send server user's inventory of unlocked cards
  static sendInventory(inventory: boolean[]): void {
    if (!server || !server.isOpen()) {
      console.error('Sending inventory when server ws doesnt exist.')
      return
    }
    server.send({
      type: 'sendInventory',
      inventory: this.convertBoolArrayToBitString(inventory),
    })
  }

  // Send server user's list of completed missions
  static sendCompletedMissions(missions: boolean[]): void {
    if (!server || !server.isOpen()) {
      console.error('Sending completed missions when server ws doesnt exist.')
      return
    }
    server.send({
      type: 'sendCompletedMissions',
      missions: this.convertBoolArrayToBitString(missions),
    })
  }

  // Send server user's experience with each avatar
  static sendAvatarExperience(experience: number[]): void {
    if (!server || !server.isOpen()) {
      console.error('Sending avatar experience when server ws doesnt exist.')
      return
    }
    server.send({
      type: 'sendAvatarExperience',
      experience: experience,
    })
  }

  static purchaseItem(id: number): void {
    if (!server || !server.isOpen()) {
      console.error('Purchasing item when server ws doesnt exist.')
      return
    }
    server.send({
      type: 'purchaseItem',
      id,
    })
  }

  static setCosmeticSet(cosmeticSet: CosmeticSet): void {
    if (!server || !server.isOpen()) {
      console.error('Setting cosmetic set when server ws doesnt exist.')
      return
    }

    // Change it locally
    this.userData.cosmeticSet = cosmeticSet

    server.send({
      type: 'setCosmeticSet',
      value: cosmeticSet,
    })
  }

  // Send all data necessary to initialize a user
  static sendInitialUserData(username: string): void {
    if (!server || !server.isOpen()) {
      console.error('Sending initial user data when server ws doesnt exist.')
      return
    }

    server.send({
      type: 'sendInitialUserData',
      username: username,
      decks: UserSettings._get('decks'),
      inventory: this.convertBoolArrayToBitString(
        UserSettings._get('inventory'),
      ),
      missions: this.convertBoolArrayToBitString(
        UserSettings._get('completedMissions'),
      ),
    })
  }

  static getUserData(): UserData {
    if (this.userData === null) {
      return {
        uuid: null,
        username: null,
        elo: null,
        garden: [],
        gems: null,
        coins: null,
        ownedItems: [],
        cosmeticSet: {
          avatar: 0,
          border: 0,
          relic: 0,
        },
        achievements: [],
      }
    } else {
      return this.userData
    }
  }

  static setAchievementsSeen(): void {
    if (!server || !server.isOpen()) {
      console.error('Setting achievements seen when server ws doesnt exist.')
      return
    }

    this.userData.achievements.forEach((achievement) => {
      achievement.seen = true
    })

    server.send({
      type: 'setAchievementsSeen',
    })
  }

  static accessDiscord(): void {
    if (!server || !server.isOpen()) {
      console.error('Accessing Discord when server ws doesnt exist.')
      return
    }

    server.send({
      type: 'accessDiscord',
    })
  }

  static harvestGarden(plotNumber: number): void {
    if (!server || !server.isOpen()) {
      console.error('Harvesting garden when server ws doesnt exist.')
      return
    }
    server.send({
      type: 'harvestGarden',
      index: plotNumber,
    })
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

    // Create a new socket connection
    server = Server.getSocket()

    const storedToken = localStorage.getItem(Url.gsi_token)
    if (storedToken !== null) {
      console.log('Reconnecting with stored token')
      // User signed in with OAuth - decode token and send signIn
      try {
        const payload = jwt_decode<GoogleJwtPayload>(storedToken)
        const email = payload.email
        const uuid = uuidv5(payload.sub, UUID_NAMESPACE)
        const jti = payload.jti

        server.onOpen(() => {
          server.send({
            type: 'signIn',
            email,
            uuid,
            jti,
          })
        })

        // Register handlers
        this.registerCommonHandlers(uuid, game, () => {})
      } catch (e) {
        console.error('Failed to decode token during reconnect:', e)
      }
    } else {
      // User signed in as guest - get guest UUID and send signIn
      const guestUuid = localStorage.getItem('guest_uuid')
      if (guestUuid) {
        server.onOpen(() => {
          server.send({
            type: 'signIn',
            uuid: guestUuid,
          })
        })

        // Register handlers
        this.registerCommonHandlers(guestUuid, game, () => {})
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
