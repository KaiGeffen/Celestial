import { URL, MATCH_PORT } from '../../../shared/network/settings'
import { TypedWebSocket } from '../../../shared/network/typedWebSocket'

import UserDataServer from './userDataServer'

import { Flags } from '../settings/settings'
import { GameScene } from '../scene/gameScene'
import { Mulligan } from '../../../shared/settings'
import { MatchClientWS } from '../../../shared/network/matchWS'
import { Deck } from '../../../shared/types/deck'

// TODO Figure out this global scene situation, smells bad
// NOTE Need this because could be normal game scene or tutorial scene (They are different)
var scene: GameScene

export class MatchWS {
  socket: MatchClientWS

  constructor(newScene: GameScene) {
    scene = newScene
    // TODO

    const socket = (this.socket = this.getSocket())

    // Each registered event
    socket
      .on('matchStart', ({ name1, name2 }) => {
        // Signal that a match has been found
        scene.signalMatchFound(name1, name2)
      })
      .on('transmitState', (data) => {
        newScene.queueState(data.state)
      })
      .on('signalError', () => {
        // TODO Handle signalling or logging that error on the client
        console.log('Server says that an action was in error.')
      })
      .on('opponentDisconnected', () => {
        scene.signalDC()
      })
      .on('opponentEmote', (data) => {
        scene.emote(0)
      })

    socket.ws.onclose = () => {
      console.log('Disconnected from the server')
    }

    socket.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  playCard(index: number, versionNo: number) {
    this.socket.send({
      type: 'playCard',
      cardNum: index,
      versionNo: versionNo,
    })
  }

  doMulligan(mulligans: Mulligan) {
    this.socket.send({
      type: 'mulligan',
      mulligan: mulligans,
    })
  }

  passTurn(versionNo: number) {
    this.socket.send({
      type: 'passTurn',
      versionNo: versionNo,
    })
  }

  // Signal to server that we are exiting this match
  exitMatch() {
    this.socket.send({
      type: 'exitMatch',
    })
  }

  // Signal to the server that we have emoted
  signalEmote(emoteNumber = 0): void {
    // TODO number
    this.socket.send({
      type: 'emote',
    })
  }

  // TODO Clarify if we reuse a UserSessionWS or create a new ws even for signed in users
  // Get the appropriate websocket for this environment
  // If user is logged in, use the existing ws instead of opening a new one
  private getSocket(): MatchClientWS {
    // Establish a websocket based on the environment
    if (Flags.local) {
      return new TypedWebSocket(`ws://${URL}:${MATCH_PORT}`)
    } else {
      // The WS location on DO
      // let loc = window.location
      const fullPath = `wss://celestialtcg.com/match_ws`
      return new TypedWebSocket(fullPath)
    }
  }
}

export class MatchTutorialWS extends MatchWS {
  constructor(newScene: GameScene, num: number) {
    super(newScene)

    this.socket.onOpen(() => {
      this.socket.send({
        type: 'initTutorial',
        num: num,
      })
    })
  }
}

export class MatchPveWS extends MatchWS {
  constructor(newScene: GameScene, deck: Deck, aiDeck: Deck) {
    super(newScene)

    this.socket.onOpen(() => {
      this.socket.send({
        type: 'initPve',
        uuid: '',
        deck: deck,
        aiDeck: aiDeck,
      })
    })
  }
}

export class MatchPvpWS extends MatchWS {
  constructor(newScene: GameScene, deck: Deck, password: string) {
    super(newScene)

    this.socket.onOpen(() => {
      console.log('Sending initPvp with uuid:', UserDataServer.getUUID())
      this.socket.send({
        type: 'initPvp',
        uuid: UserDataServer.getUUID() || '',
        deck: deck,
        password: password,
      })
    })
  }
}
