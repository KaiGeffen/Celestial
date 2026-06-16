import { Deck } from '../types/deck'
import { CosmeticSet } from '../types/cosmeticSet'
import { Mulligan } from '../settings'

export default interface messagesToServer {
  // Guest sign-in only. UUID is a client-generated random id with no identity
  // claim — provider-backed accounts (Google/Steam) must use their verified
  // login messages below, never this path.
  signIn: {
    uuid: string
  }
  loginGoogle: {
    // Raw Google Identity Services ID token (credential), verified server-side.
    credential: string
  }
  loginSession: {
    // Server-issued session token from a previous verified provider login.
    token: string
  }
  loginSteam: {
    ticket: string
  }
  sendDecks: {
    decks: Deck[]
  }
  sendAvatarExperience: {
    experience: number[]
  }
  // Mark all tutorial missions as complete
  skipTutorials: {}
  sendJourneyChoice: {
    characterIndex: number
    choice: 0 | 1
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
  claimMissionRewards: {
    missionId: number
  }
  // Queueing events
  initPvp: {
    password: string
    deck: Deck
  }
  initPve: {
    aiDeck: Deck
    deck: Deck
  }
  initMission: {
    deck: Deck
    missionID: number
  }
  initTutorial: {
    num: number
  }
  initSpecialPve: {
    aiDeck: Deck
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
  // Other
  spectatePlayer: {
    targetUuid: string
  }
  exitSpectating: {}
  setCanBeSpectated: {
    allowed: boolean
  }
}
