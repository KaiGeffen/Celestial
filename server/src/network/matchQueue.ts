import { parse } from 'url'
import Card from '../../../shared/state/card'

import {
  TypedWebSocket,
  createEvent,
} from '../../../shared/network/typedWebSocket'
import { decodeDeck } from '../../../shared/codec'

import PveMatch from './match/pveMatch'
import PvpMatch from './match/pvpMatch'
import Match from './match/match'
import pvpMatch from './match/pvpMatch'
import { decode } from 'punycode'
import { MULLIGAN_MSG } from './old/settings'
import { PASS } from '../../../shared/settings'

/*
List of ongoing games
List of players in queue, tupled with their game if they have one
Disconnecting then reconnecting puts you back in your game
Init includes information about the game type you're looking for
*/

interface WaitingPlayer {
  ws: TypedWebSocket
  uuid: string
  deck: Card[]
  avatar: number
}

// Players searching for a match with password as key
let searchingPlayers: { [key: string]: WaitingPlayer } = {}

class MatchQueue {
  static enqueue(socket: WebSocket) {
    const ws = new TypedWebSocket(socket)

    // Register the init events
    const initPve = createEvent('initPve', async (data) => {
      const match = new PveMatch(
        ws,
        data.uuid,
        decodeDeck(data.deck),
        data.avatar,
        decodeDeck(data.aiDeck),
      )
      registerEvents(ws, match, 0)

      // Start the match
      await match.notifyState()
    })
    const initPvp = createEvent('initPvp', async (data) => {
      const password = data.password

      // An opponent is found, start the match for both
      if (searchingPlayers[data.password]) {
        // Create a PvP match
        const otherPlayer: WaitingPlayer = searchingPlayers[data.password]
        const match = new pvpMatch(
          ws,
          data.uuid,
          decodeDeck(data.deck),
          data.avatar,
          otherPlayer.ws,
          otherPlayer.uuid,
          otherPlayer.deck,
          otherPlayer.avatar,
        )

        // registerEvents(socket, match, playerNumber)
        delete searchingPlayers[data.password]
        // TODO Maybe just delete the last one? Somehow don't lose to race conditions

        registerEvents(ws, match, 0)
        registerEvents(otherPlayer.ws, match, 1)

        // Notify both players that they are connected
        await match.notifyState()
      } else {
        // Queue the player with their information
        const waitingPlayer = {
          ws: ws,
          uuid: data.uuid,
          deck: decodeDeck(data.deck),
          avatar: data.avatar,
        }
        searchingPlayers[data.password] = waitingPlayer
      }
    })

    ;[initPve, initPvp].forEach(({ event, callback }) => {
      ws.on(event, callback)
    })
  }
}

// TODO Move to a separate file
// Register each of the events that the server receives during a match
function registerEvents(
  ws: TypedWebSocket,
  match: Match,
  playerNumber: number,
) {
  const playCardEvent = createEvent('playCard', (data) => {
    const cardNum = data.cardNum
    const version = data.version
    match.doAction(playerNumber, cardNum, version)
  })

  const mulliganEvent = createEvent('mulligan', (data) => {
    match.doMulligan(playerNumber, data.mulligan)
  })

  const passTurnEvent = createEvent('passTurn', (data) => {
    const versionNo = 0 // TODO
    match.doAction(playerNumber, PASS, versionNo)
  })

  const exitMatchEvent = createEvent('exitMatch', (data) => {
    match.doExit(ws)
  })

  const emoteEvent = createEvent('emote', (data) => {
    const emote = 0 // TODO
    match.signalEmote(playerNumber, emote)
  })

  // TODO There's some clever way to ensure that all SocketMessages are covered
  const registeredEvents = [
    playCardEvent,
    mulliganEvent,
    passTurnEvent,
    exitMatchEvent,
    emoteEvent,
  ]

  // Register each of the events
  registeredEvents.forEach(({ event, callback }) => {
    ws.on(event, callback)
  })
}

// Password matches dictionary
const PWD_MATCHES: { [key: string]: Match } = {}

export default MatchQueue
