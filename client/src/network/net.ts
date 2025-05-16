import { URL, MATCH_PORT } from '../../../shared/network/settings'
import { TypedWebSocket } from '../../../shared/network/typedWebSocket'

import UserDataServer from './userDataServer'

import { Flags } from '../settings/settings'
import { MatchScene } from '../scene/matchScene'
import { Mulligan } from '../../../shared/settings'
import { MatchClientWS } from '../../../shared/network/matchWS'
import { Deck } from '../../../shared/types/deck'

// TODO Figure out this global scene situation, smells bad
// NOTE Need this because could be normal game scene or tutorial scene (They are different)
var scene: MatchScene

export class MatchWS {
  socket: MatchClientWS

  constructor(newScene: MatchScene) {
    scene = newScene

    const socket = (this.socket = this.getSocket())

    // Each registered event
    socket
      .on('matchStart', ({ name1, name2, elo1, elo2 }) => {
        // Signal that a match has been found
        scene.signalMatchFound(name1, name2, elo1, elo2)
      })
      .on('transmitState', (data) => {
        newScene.queueState(data.state)
      })
      .on('signalError', () => {
        scene.signalError('Server says that an action was in error.')
        console.log('Server says that an action was in error.')
      })
      .on('opponentDisconnected', () => {
        scene.signalDC()
      })
      .on('opponentEmote', (data) => {
        scene.emote(0)
      })

    socket.ws.onclose = () => {
      // scene.signalError('Disconnected from the server')
      console.error('Server ws closed')
    }

    socket.ws.onerror = (error) => {
      scene.signalError(`WebSocket error: ${error}`)
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

  // Get the appropriate websocket for this environment
  private getSocket(): MatchClientWS {
    if (Flags.local) {
      return new TypedWebSocket(`ws://${URL}:${MATCH_PORT}`)
    } else {
      const fullPath = `wss://celestialtcg.com/match_ws`
      return new TypedWebSocket(fullPath)
    }
  }
}

export class MatchTutorialWS extends MatchWS {
  constructor(newScene: MatchScene, num: number) {
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
  constructor(newScene: MatchScene, deck: Deck, aiDeck: Deck) {
    super(newScene)

    this.socket.onOpen(() => {
      this.socket.send({
        type: 'initPve',
        uuid: UserDataServer.getUserData().uuid || '',
        deck: deck,
        aiDeck: aiDeck,
      })
    })
  }
}

export class MatchPvpWS extends MatchWS {
  constructor(newScene: MatchScene, deck: Deck, password: string) {
    super(newScene)

    this.socket.onOpen(() => {
      console.log(
        'Sending initPvp with uuid:',
        UserDataServer.getUserData().uuid,
      )
      this.socket.send({
        type: 'initPvp',
        uuid: UserDataServer.getUserData().uuid || '',
        deck: deck,
        password: password,
      })
    })
  }
}
