import Server from '../server'
import Catalog from '../../../shared/state/catalog'
import { Space } from './settings'
import { Flags } from './flags'

// User settings will first look to see if the user is logged in
// If they are, it will prioritize the account data for that user (in session storage) over local storage
// If changes are made to account data, those are sent back to the server
export class UserSettings {
  // Ensure that each expected setting exists, or give it a default value
  static _ensure(): void {
    const defaultSettings = {
      // Device specific settings (Not tied to user account)
      vsAi: true,
      mmCode: '',
      volume: 0.5,
      musicVolume: 0.5,
      dialogVolume: 0.5,
      animationSpeed: 0.1,
      // Whether the player should pass automatically if there's nothing they can play
      autopass: true,

      // Whether hotkeys are enabled
      hotkeys: false,

      // Settings tied to user's account
      decks: [{
        name: 'A Simple Dream',
        cards: [0, 9, 61, 12, 12, 7, 7, 7, 7, 4, 4, 4, 4, 4, 4],
        cosmeticSet: {
          avatar: 0,
          border: 0,
        },
      },
      {
        name: 'Path of Ambition',
        cards: [21, 20, 20, 17, 17, 14, 14, 6, 3, 3, 3, 3, 3, 0, 0],
        cosmeticSet: {
          avatar: 1,
          border: 0,
        },
      },
      {
        name: 'Lost in Shadow',
        cards: [1, 1, 1, 1, 1, 1, 35, 35, 13, 20, 19, 19, 19, 19, 23],
        cosmeticSet: {
          avatar: 2,
          border: 0,
        },
      },
      {
        name: 'Lovesick Cats',
        cards: [0, 0, 4, 4, 4, 33, 33, 33, 33, 34, 34, 11, 11, 11, 71],
        cosmeticSet: {
          avatar: 3,
          border: 0,
        },
      },
      {
        name: 'Kith and Kin',
        cards: [22, 22, 66, 60, 10, 11, 8, 8, 8, 4, 4, 2, 2, 2, 2],
        cosmeticSet: {
          avatar: 4,
          border: 0,
        },
      },
      {
        name: 'The Pathless Path',
        cards: [50, 27, 27, 27, 27, 25, 88, 88, 31, 39, 11, 13, 91, 45, 45],
        cosmeticSet: {
          avatar: 5,
          border: 0,
        },
      },
    ],
      // List to use when playing with in development content
      devDecks: [],
      // Index of the currently equipped deck (for play menu)
      equippedDeckIndex: 0,

      // For journey mode, for each card, whether or not that card has been unlocked
      inventory: getStartingInventory(),

      // Card ownership inventory (indexed by card ID)
      cardInventory: Array(10000).fill(false),

      // List of each mission by its id, and if the player has completed it
      completedMissions: [],

      // Coordinates for the camera in journey mode
      journeyCoordinates: {
        x: 4650 - Space.windowWidth / 2,
        y: 700 - Space.windowHeight / 2,
      },

      // The experience with each avatar
      avatar_experience: [0, 0, 0, 0, 0, 0],

      // A list of all new user tooltips that have been seen
      tooltipsSeen: [],
    }

    for (var key in defaultSettings) {
      // If this value isn't set in local storage, set it to its default
      if (localStorage.getItem(key) === null) {
        UserSettings._set(key, defaultSettings[key])
      }
    }
  }

  // Get the given setting
  static _get(key: string) {
    // If using cards in development, save the deck separately
    if (key === 'decks' && Flags.devCardsEnabled) {
      key = 'devDecks'
    }

    if (key in sessionStorage) {
      return JSON.parse(sessionStorage.getItem(key))
    } else if (key in localStorage) {
      return JSON.parse(localStorage.getItem(key))
    } else {
      console.log('key not found', key)
      return null
    }
  }

  static _set(key: string, value: any) {
    // If using cards in development, save the deck separately
    if (key === 'decks' && Flags.devCardsEnabled) {
      key = 'devDecks'
    }

    // If key is in session storage then we're signed in, send the data to the server
    if (key in sessionStorage) {
      sessionStorage.setItem(key, JSON.stringify(value))

      if (key === 'decks') {
        Server.sendDecks(value)
      } else if (key === 'inventory') {
        Server.sendInventory(value)
      } else if (key === 'completedMissions') {
        Server.sendCompletedMissions(value)
      } else if (key === 'avatar_experience') {
        Server.sendAvatarExperience(value)
      }
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }

  // Set the nth index of the given array
  static _setIndex(key: string, index: number, value: any) {
    if (key === 'decks' && Flags.devCardsEnabled) {
      key = 'devDecks'
    }

    let ary = this._get(key)

    ary[index] = value

    this._set(key, ary)
  }

  static _push(key: string, value: any) {
    if (key === 'decks' && Flags.devCardsEnabled) {
      key = 'devDecks'
    }

    let ary = this._get(key)

    ary.push(value)

    this._set(key, ary)
  }

  static _pop(key: string, index: number): any {
    if (key === 'decks' && Flags.devCardsEnabled) {
      key = 'devDecks'
    }

    let ary = this._get(key)

    let result = ary[index]

    ary.splice(index, 1)

    this._set(key, ary)

    return result
  }

  // Increment the given index of array by given amount
  static _increment(key: string, index: number, amt: number): void {
    let ary = this._get(key)
    ary[index] += amt
    this._set(key, ary)
  }

  // Get the quantity of a given card in inventory
  static _getQuantity(cardId: number): number {
    let amt = this._get('inventory')[cardId]

    if (isNaN(amt) || amt == null) {
      return 0
    } else {
      return amt
    }
  }

  static clearSessionStorage(): void {
    sessionStorage.clear()
  }
}

function getStartingInventory(): boolean[] {
  let ary = Array(Catalog.collectibleCards.length).fill(false)

  // Unlock each of the starting cards
  ;[0, 4, 9, 6, 11, 12, 13, 18].forEach((i) => {
    ary[i] = true
  })

  return ary
}
