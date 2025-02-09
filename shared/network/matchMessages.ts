import GameModel from '../state/gameModel'
import { Mulligan } from '../settings'

export interface MatchClientMessages {
  initPvp: {
    password: string
    uuid: string
    deck: string
    avatar: number
  }
  initPve: {
    aiDeck: string
    uuid: string
    deck: string
    avatar: number
  }
  initTutorial: {
    num: number
  }
  playCard: {
    cardNum: number
  }
  mulligan: { 
    mulligan: Mulligan 
  }
  passTurn: {}
  exitMatch: {}
  emote: {}
}

export interface MatchServerMessages {
  gameStart: {}
  transmitState: { 
    state: GameModel 
  }
  signalError: {}
  dc: {}
  opponentEmote: {}
}