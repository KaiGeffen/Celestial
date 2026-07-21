import { Deck } from '../types/deck'
import { CosmeticSet } from '../types/cosmeticSet'
import { Achievement } from '../types/achievement'
import GameModel from '../state/gameModel'

// Snapshot of one account shown in the account-link "keep which?" dialog.
export interface AccountLinkSummary {
  id: string
  username: string
  coins: number
  gems: number
  deckCount: number
}

export default interface messagesToClient {
  promptUserInit: {}
  invalidToken: {}
  // Long-lived session token issued after a verified provider login; the client
  // stores it and reconnects with it instead of a short-lived Google token.
  sessionToken: {
    token: string
  }
  // Both provider identities already have populated accounts; the user must pick
  // which one survives (the other is tombstoned). Summaries drive the dialog.
  accountLinkConflict: {
    current: AccountLinkSummary
    other: AccountLinkSummary
  }
  // Outcome of a link attempt (Case A auto-link, or a confirmed merge).
  // reconnect: the merge changed which account this socket authenticates as, so
  // the client should reconnect with its (freshly issued) session token.
  accountLinkResult: {
    success: boolean
    error?: string
    reconnect?: boolean
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
    accountAlreadyLinked: boolean
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
    isPvp: boolean
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
