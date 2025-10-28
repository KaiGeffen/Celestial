import { Deck } from '../types/deck'
import { CosmeticSet } from '../types/cosmeticSet'
import { Achievement } from '../types/achievement'
export interface UserDataClientMessages {
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
}

export interface UserDataServerMessages {
  promptUserInit: {}
  invalidToken: {}
  alreadySignedIn: {}
  sendUserData: {
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
  }
  purchaseItemSuccess: {
    itemId: number
    balance: number
  }
  harvestGardenResult: {
    success: boolean
    newGarden?: Date[]
    reward?: number
  }
}
