import { Deck } from '../types/deck'
import { CosmeticSet } from '../types/cosmeticSet'
import { Achievement } from '../types/achievement'
import GameModel from '../state/gameModel'

export default interface messagesToClient {
  promptUserInit: {}
  invalidToken: {}
  // Long-lived session token issued after a verified provider login; the client
  // stores it and reconnects with it instead of a short-lived Google token.
  sessionToken: {
    token: string
  }
  sendUserData: {
    inventory: string
    completedMissions: string
    decks: Deck[]
    username: string
    elo: number
    pveWins: number
    garden: Date[]
    gems: number
    coins: number
    ownedItems: number[]
    cosmeticSet: CosmeticSet
    achievements: Achievement[]
    cardInventory: string
    missionGoldClaimed: boolean[]
    journeyChoices: (number | null)[]
    canBeSpectated: boolean
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
    gemReward?: number
  }
  promptReconnect: {
    state: GameModel
  }
  // MATCH RELEVANT
  transmitState: {
    state: GameModel
  }
  signalError: {}
  spectatorJoined: {
    username: string
  }
  spectateEnded: {}
  opponentSurrendered: {}
  opponentDisconnected: {}
  opponentReconnected: {}
  opponentEmote: {}
  broadcastOnlinePlayersList: {
    players: {
      uuid: string
      username: string
      cosmeticSet: CosmeticSet
      status: number
      canBeSpectated: boolean
    }[]
  }
}
