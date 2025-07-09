import GameModel from '../state/gameModel'
import { Mulligan } from '../settings'
import { Deck } from '../types/deck'

export interface MatchClientMessages {
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
  exitMatch: {}
  emote: {}
}

export interface MatchServerMessages {
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
  opponentDisconnected: {}
  opponentEmote: {}
}
