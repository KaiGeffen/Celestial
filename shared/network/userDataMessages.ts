import { Deck } from '../types/deck'

export interface UserDataClientMessages {
  sendToken: {
    email: string
    uuid: string
    jti: string
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
}

export interface UserDataServerMessages {
  promptUserInit: {}
  invalidToken: {}
  alreadySignedIn: {}
  sendUserData: {
    inventory: string
    completedMissions: string
    decks: Deck[]
    username: string
    elo: number
    gems: number
    coins: number
    lastDailyReward: Date
    ownedItems: number[]
  }
  purchaseItemSuccess: {
    itemId: number
    balance: number
  }
}
