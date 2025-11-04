import { Deck } from '../types/deck'
import { CosmeticSet } from '../types/cosmeticSet'
import { Mulligan } from '../settings'

export default interface messagesToServer {
  sendToken: {
    email: string
    uuid: string
    jti: string
  }
  sendGuestToken: {
    uuid: string
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
  // TODO Remove this, and on the occasions where it's needed the server should just send the data to client
  refreshUserData: {}
  sendInitialUserData: {
    username: string
    decks: Deck[]
    inventory: string
    missions: string
  }
  purchaseItem: {
    id: number
  }
  setCosmeticSet: {
    value: CosmeticSet
  }
  setAchievementsSeen: {}
  harvestGarden: {
    index: number
  }
  // MATCH RELEVANT
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
}
