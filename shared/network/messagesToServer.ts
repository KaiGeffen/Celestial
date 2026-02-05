import { Deck } from '../types/deck'
import { CosmeticSet } from '../types/cosmeticSet'
import { Mulligan } from '../settings'

export default interface messagesToServer {
  // TODO
  signIn: {
    email?: string
    uuid: string
    jti?: string
  }
  sendDecks: {
    decks: Deck[]
  }
  sendInventory: {
    inventory: string
  }
  sendCompletedMissions: {
    missions: string
  }
  sendAvatarExperience: {
    experience: number[]
  }
  sendInitialUserData: {
    username: string
    decks: Deck[]
    inventory: string
    missions: string
    ref?: string
  }
  purchaseItem: {
    id: number
  }
  setCosmeticSet: {
    value: CosmeticSet
  }
  setAchievementsSeen: {}
  accessDiscord: {}
  harvestGarden: {
    index: number
  }
  // Queueing events
  initPvp: {
    password: string
    uuid: string
    deck: Deck
  }
  initPve: {
    aiDeck: Deck
    uuid: string
    deck: Deck
  }
  initTutorial: {
    num: number
    uuid: string
  }
  initSpecialPve: {
    aiDeck: Deck
    uuid: string
    deck: Deck
    enabledModes: number[]
  }
  cancelQueue: {
    password: string
  }
  // In match events
  playCard: {
    cardNum: number
    versionNo: number
  }
  mulligan: {
    mulligan: Mulligan
  }
  passTurn: {
    versionNo: number
  }
  surrender: {}
  disconnect: {}
  emote: {}
  reportLowFps: {
    scene: string
  }
}
