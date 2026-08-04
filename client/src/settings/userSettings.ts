import Server from '../server'
import Catalog from '@shared/state/catalog'
import { Flags } from './flags'
import starterDecks from '../data/starterDecks'

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
      // Whether the player should pass automatically if there's nothing they can play
      autopass: true,

      // Whether hotkeys are enabled
      hotkeys: true,

      // Settings tied to user's account
      decks: starterDecks,
      // List to use when playing with in development content
      devDecks: [],
      // Index of the currently equipped deck (for play menu)
      equippedDeckIndex: 5,

      // For journey mode, for each card, whether or not that card has been unlocked
      inventory: getStartingInventory(),

      // Card ownership inventory (indexed by card ID)
      cardInventory: Array(10000).fill(false),

      // List of each mission by its id, and if the player has completed it
      completedMissions: [],

      // A list of all new user tooltips that have been seen
      tooltipsSeen: [],

      // Ending choices for each character's journey (0=unchosen, 1=option A, 2=option B)
      journeyChoices: [null, null, null, null, null, null],
    }

    for (var key in defaultSettings) {
      // If this value isn't set in local storage, set it to its default
      if (localStorage.getItem(key) === null) {
        UserSettings._set(
          key,
          (defaultSettings as Record<string, unknown>)[key],
        )
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
      }
      // inventory / completedMissions are server-authoritative; not synced up
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
