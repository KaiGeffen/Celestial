import { Deck } from '../types/deck'
import { CosmeticSet } from '../types/cosmeticSet'
import { Achievement } from '../types/achievement'
import GameModel from '../state/gameModel'

export default interface messagesToClient {
  promptUserInit: {}
  invalidToken: {}
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
    cardInventory: string
  }
  purchaseItemSuccess: {
    itemId: number
    balance: number
  }
  harvestGardenResult: {
    success: boolean
    newGarden?: Date[]
    reward?: number
    goldReward?: number
  }
  promptReconnect: {
    state: GameModel
  }
  // MATCH RELEVANT
  matchStart: {
    name1: string
    name2: string
    elo1: number
    elo2: number
  }
  transmitState: {
    state: GameModel
  }
  signalError: {}
  opponentSurrendered: {}
  opponentDisconnected: {}
  opponentReconnected: {}
  opponentEmote: {}
  broadcastOnlinePlayersList: {
    players: {
      username: string
      cosmeticSet: CosmeticSet
    }[]
  }
}
