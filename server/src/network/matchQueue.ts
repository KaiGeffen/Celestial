import Card from '../../../shared/state/card'

import { TypedWebSocket } from '../../../shared/network/typedWebSocket'

import PveMatch from './match/pveMatch'
import PvpMatch from './match/pvpMatch'
import Match from './match/match'
import TutorialMatch from './match/tutorialMatch'
import { MechanicsSettings } from '../../../shared/settings'
import { MatchServerWS } from '../../../shared/network/matchWS'
import Catalog from '../../../shared/state/catalog'

/*
List of ongoing games
List of players in queue, tupled with their game if they have one
Disconnecting then reconnecting puts you back in your game
Init includes information about the game type you're looking for
*/

// A player waiting for a game and their associated data
interface WaitingPlayer {
  ws: MatchServerWS
  uuid: string
  deck: Card[]
  avatar: number
}

// Players searching for a match with password as key
let searchingPlayers: { [key: string]: WaitingPlayer } = {}

class MatchQueue {
  static enqueue(socket) {
    const ws: MatchServerWS = new TypedWebSocket(socket)

    // Register the init events
    ws.on('initPve', async (data) => {
      console.log('initPve', data)
      const match = new PveMatch(
        ws,
        data.uuid,
        data.deck.cards.map((cardId) => Catalog.getCardById(cardId)),
        data.deck.cosmetics.avatar,
        data.aiDeck.cards.map((cardId) => Catalog.getCardById(cardId)),
        data.aiDeck.cosmetics.avatar,
      )
      registerEvents(ws, match, 0)

      // Start the match
      await match.notifyState()
    })
      .on('initPvp', async (data) => {
        // Clean up stale entries first
        Object.keys(searchingPlayers).forEach((password) => {
          // TODO Websocket.OPEN is 1, but remote vs local views Websocket differently
          if (searchingPlayers[password].ws.ws.readyState !== 1) {
            delete searchingPlayers[password]
          }
        })

        // Check if there is another player, and they are still ready
        const otherPlayer: WaitingPlayer = searchingPlayers[data.password]
        if (otherPlayer) {
          console.log(
            'Match starting between players with decks:',
            data.deck.cards
              .map((cardId) => Catalog.getCardById(cardId).name)
              .join(', '),
            '\n',
            otherPlayer.deck.map((card) => card.name).join(', '),
          )

          // Create a PvP match
          const match = new PvpMatch(
            ws,
            data.uuid,
            data.deck.cards.map((cardId) => Catalog.getCardById(cardId)),
            data.deck.cosmetics.avatar,
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

          // Inform players that match started TODO That it's pvp specifically
          await match.notifyMatchStart()

          // Notify both players that they are connected
          await match.notifyState()
        } else {
          // Queue the player with their information
          const waitingPlayer = {
            ws: ws,
            uuid: data.uuid,
            deck: data.deck.cards.map((cardId) => Catalog.getCardById(cardId)),
            avatar: data.deck.cosmetics.avatar,
          }
          searchingPlayers[data.password] = waitingPlayer
        }
      })
      .on('initTutorial', async (data) => {
        const match = new TutorialMatch(ws, data.num)
        registerEvents(ws, match, 0)

        // Start the match
        await match.notifyState()
      })
  }
}

// Register each of the events that the server receives during a match
function registerEvents(ws: MatchServerWS, match: Match, playerNumber: number) {
  ws.on('playCard', (data) => {
    const cardNum = data.cardNum
    match.doAction(playerNumber, cardNum)
  })
    .on('mulligan', (data) => {
      match.doMulligan(playerNumber, data.mulligan)
    })
    .on('passTurn', (data) => {
      match.doAction(playerNumber, MechanicsSettings.PASS)
    })
    .on('exitMatch', (data) => {
      match.doExit(ws)
    })
    .on('emote', (data) => {
      const emote = 0 // TODO
      match.signalEmote(playerNumber, emote)
    })
}

export default MatchQueue
