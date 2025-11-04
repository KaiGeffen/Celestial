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
import { ClientWS } from '../../shared/network/celestialTypedWebsocket'
import { Deck } from '../../shared/types/deck'
import { CosmeticSet } from '../../shared/types/cosmeticSet'
import { Achievement } from '../../shared/types/achievement'
import { v5 as uuidv5 } from 'uuid'
const ip = '127.0.0.1'
const port = 5555
// Custom code for closing websocket connection due to invalid token
const code = 1000

// The websocket which is open with the main server (Authentication/pack opening)
// TODO This is getting used throughout match and all the logic is there, it should be here instead to be understood
export var server: ClientWS = undefined

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

  // Register common websocket event handlers for both OAuth and guest login
  private static registerCommonHandlers(
    uuid: string,
    game: Phaser.Game,
    callback: () => void,
  ) {
    server
      .on(
        'sendUserData',
        (data: {
          inventory: string
          completedMissions: string
          avatar_experience: number[]
          decks: Deck[]
          username: string
          elo: number
          garden: Date[]
          gems: number
          coins: number
          ownedItems: number[]
          cosmeticSet: CosmeticSet
          achievements: Achievement[]
        }) => {
          // Store the uuid and user data after successful login
          this.userData = {
            uuid,
            ...data,
            garden: data.garden.map((dateStr) => new Date(dateStr)),
          }

          this.loadUserData(data)
          // TODO Bad smell, the callback should only happen once as it references a scene
          if (callback) {
            callback()
            callback = null
          }
        },
      )
      .on('harvestGardenResult', ({ success, newGarden, reward }) => {
        // Only update the stored garden if the harvest was successful
        if (success) {
          this.userData.garden = newGarden.map((dateStr) => new Date(dateStr))
        }

        // Emit global event that HomeScene can listen to regardless of success
        game.events.emit('gardenHarvested', {
          success: success,
          newGarden: this.userData.garden,
          reward: reward,
        })
      })
      .on('promptReconnect', (data) => {
        setTimeout(() => {
          game.scene.start('StandardMatchScene', {
            isPvp: true,
            deck: [],
            aiDeck: [],
            gameStartState: data.state,
          })
        }, 5000)
      })
  }

  // Log in with the server for user with given OAuth token
  static login(
    payload: GoogleJwtPayload,
    game: Phaser.Game,
    callback = () => {},
  ) {
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
        // Open username registration menu
        game.scene.getAt(0).scene.launch('MenuScene', {
          menu: 'registerUsername',
          // Ensure that user is logged out if they cancel
          exitCallback: () => {
            Server.logout()
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

        server.close(code)
        server = undefined
      })
      .on('alreadySignedIn', () => {
        console.log(
          'Server indicated that the given uuid is already signed in. Logging out.',
        )
        server.close(code)
        server = undefined

        Server.logout()

        // TODO Make this a part of the static logout method
        game.scene
          .getScenes(true)[0]
          .scene.start('SigninScene')
          .launch('MenuScene', {
            menu: 'message',
            title: 'ERROR',
            s: 'The selected account is already logged in on another device or tab. Please select another account option.',
          })
      })

    // Register common handlers
    this.registerCommonHandlers(uuid, game, callback)

    // If the connection closes, login again with same args
    server.ws.onclose = (event) => {
      // Clear user data after logging out
      this.userData = null

      // Don't attempt to login again if the server explicitly logged us out
      if (event.code !== code) {
        console.log(
          'Logged in websocket is closing, signing in again with token:',
        )
        console.log(payload)

        Server.login(payload, game)
      }
    }
  }

  // Log in as a guest with a generated UUID
  static loginGuest(game: Phaser.Game, callback = () => {}) {
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

    // If the connection closes, login again
    server.ws.onclose = (event) => {
      this.userData = null

      if (event.code !== code) {
        console.log('Guest websocket closing, reconnecting...')
        Server.loginGuest(game)
      }
    }
  }

  static logout(): void {
    // Clear user data after logging out
    this.userData = null

    console.log('Logging out')

    // Clear the sign-in token
    localStorage.removeItem(Url.gsi_token)

    if (Server.isLoggedIn()) {
      console.log('server was logged in and now its logging out...')

      server.close(code)
      server = undefined

      UserSettings.clearSessionStorage()
    }
  }

  // Returns if the user is logged in
  static isLoggedIn(): boolean {
    return server !== undefined
  }

  // Call the server to refresh the user data
  static refreshUserData(): void {
    if (Server.isLoggedIn()) {
      server.send({
        type: 'refreshUserData',
      })
    }
  }

  // Send server an updated list of decks
  static sendDecks(decks: Deck[]): void {
    if (server === undefined) {
      throw 'Sending decks when server ws doesnt exist.'
    }
    server.send({
      type: 'sendDecks',
      decks: decks,
    })
  }

  // Send server user's inventory of unlocked cards
  static sendInventory(inventory: boolean[]): void {
    if (server === undefined) {
      throw 'Sending inventory when server ws doesnt exist.'
    }
    server.send({
      type: 'sendInventory',
      inventory: this.convertBoolArrayToBitString(inventory),
    })
  }

  // Send server user's list of completed missions
  static sendCompletedMissions(missions: boolean[]): void {
    if (server === undefined) {
      throw 'Sending completed missions when server ws doesnt exist.'
    }
    server.send({
      type: 'sendCompletedMissions',
      missions: this.convertBoolArrayToBitString(missions),
    })
  }

  // Send server user's experience with each avatar
  static sendAvatarExperience(experience: number[]): void {
    if (server === undefined) {
      throw 'Sending avatar experience when server ws doesnt exist.'
    }
    server.send({
      type: 'sendAvatarExperience',
      experience: experience,
    })
  }

  // Send server user's list of completed missions
  static purchaseItem(id: number, cost: number): void {
    if (server === undefined) {
      throw 'Purchasing item when server ws doesnt exist.'
    }
    server.send({
      type: 'purchaseItem' as const,
      id,
    })

    // Locally manage the purchase
    Server.getUserData().gems -= cost
    // TODO Cosmetic array update
  }

  static setCosmeticSet(cosmeticSet: CosmeticSet): void {
    if (server === undefined) {
      throw 'Setting cosmetic set when server ws doesnt exist.'
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
    if (server === undefined) {
      throw 'Sending initial user data when server ws doesnt exist.'
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
    if (server === undefined) {
      throw 'Setting achievements seen when server ws doesnt exist.'
    }

    this.userData.achievements.forEach((achievement) => {
      achievement.seen = true
    })

    server.send({
      type: 'setAchievementsSeen',
    })
  }

  static harvestGarden(plotNumber: number): void {
    if (server === undefined) {
      throw 'Harvesting garden when server ws doesnt exist.'
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
  private static loadUserData(data: {
    inventory: string
    completedMissions: string
    avatar_experience: number[]
    decks: Deck[]
    username: string
    elo: number
    gems: number
    ownedItems: number[]
  }): void {
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

    sessionStorage.setItem('decks', JSON.stringify(data.decks))
    sessionStorage.setItem(
      'avatar_experience',
      JSON.stringify(data.avatar_experience),
    )
  }

  // TODO Clarify if we reuse a UserSessionWS or create a new ws even for signed in users
  // Get the appropriate websocket for this environment
  // If user is logged in, use the existing ws instead of opening a new one
  private static getSocket(): ClientWS {
    // Establish a websocket based on the environment
    if (Flags.local) {
      return new TypedWebSocket(`ws://${URL}:${USER_DATA_PORT}`)
    } else {
      // The WS location on DO
      // let loc = window.location
      const fullPath = `wss://celestialdecks.gg/user_data_ws`
      return new TypedWebSocket(fullPath)
    }
  }
}
