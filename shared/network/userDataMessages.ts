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
  sendInitialUserData: {
    username: string
    decks: Deck[]
    inventory: string
    missions: string
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
  }
}
