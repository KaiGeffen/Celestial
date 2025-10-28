import { TypedWebSocket } from '../../../shared/network/typedWebSocket'
import PveMatch from './match/pveMatch'
import PvpMatch from './match/pvpMatch'
import Match from './match/match'
import TutorialMatch from './match/tutorialMatch'
import { MechanicsSettings } from '../../../shared/settings'
import { MatchServerWS } from '../../../shared/network/matchWS'
import Catalog from '../../../shared/state/catalog'
import { Deck } from '../../../shared/types/deck'
import { logFunnelEvent } from '../db/analytics'
import { findActiveGame } from '../db/gameState'
import GameModel from '../../../shared/state/gameModel'

/*
TODO
List of ongoing games
Disconnecting then reconnecting should put you back in your game
Init includes information about the game type you're looking for
*/

// A player waiting for a game and their associated data
interface WaitingPlayer {
  ws: MatchServerWS
  uuid: string
  deck: Deck
}

// Map of currently connected players: uuid -> websocket
let activePlayersMap: Map<string, MatchServerWS> = new Map()

// Players searching for a match with password as key
let searchingPlayers: { [key: string]: WaitingPlayer } = {}

class MatchQueue {
  static enqueue(socket) {
    const ws: MatchServerWS = new TypedWebSocket(socket)

    // Register the init events
    ws.on('initPve', async (data) => {
      console.log(
        'PvE:',
        data.deck.cards
          .map((cardId) => Catalog.getCardById(cardId).name)
          .join(', '),
      )

      // Add player to active players map
      addActivePlayer(data.uuid, ws)

      // Check for existing active game
      const existingGame = await findActiveGame(data.uuid)

      let match: PveMatch

      if (existingGame) {
        console.log(
          `Resuming existing PvE game ${existingGame.gameId} for ${data.uuid}`,
        )

        // Reconstruct decks from the saved state
        const playerDeck = reconstructDeckFromGameState(
          existingGame.gameState,
          0,
        )
        const aiDeck = reconstructDeckFromGameState(existingGame.gameState, 1)

        // Restore the match from saved state
        match = PveMatch.restoreFromState(
          existingGame.gameId,
          existingGame.gameState,
          data.uuid,
          playerDeck,
          aiDeck,
        )
      } else {
        // Create new game
        match = new PveMatch(ws, data.uuid, data.deck, data.aiDeck)
      }

      registerEvents(ws, match, 0)

      // Remove from active players on disconnect
      ws.onClose(() => {
        removeActivePlayer(data.uuid)
      })

      // Analytics
      logFunnelEvent(data.uuid, 'play_mode', 'pve')

      // Start the match
      await match.notifyState()
    })

    ws.on('initPvp', async (data) => {
      // Add player to active players map
      addActivePlayer(data.uuid, ws)

      // Check for existing active game
      const existingGame = await findActiveGame(data.uuid)

      if (existingGame) {
        console.log(
          `Resuming existing PvP game ${existingGame.gameId} for ${data.uuid}`,
        )

        // Determine which player this is (p1 or p2)
        const isPlayer1 = existingGame.p1Id === data.uuid
        const playerNum = isPlayer1 ? 0 : 1

        // Reconstruct decks from the saved state
        const deck1 = reconstructDeckFromGameState(existingGame.gameState, 0)
        const deck2 = reconstructDeckFromGameState(existingGame.gameState, 1)

        // Restore the match from saved state
        const match = PvpMatch.restoreFromState(
          existingGame.gameId,
          existingGame.gameState,
          existingGame.p1Id,
          existingGame.p2Id,
          deck1,
          deck2,
        )

        registerEvents(ws, match, playerNum)

        // Remove from active players on disconnect
        ws.onClose(() => {
          removeActivePlayer(data.uuid)
        })

        // Send current game state to the reconnecting player
        await match.notifyState()

        return // Don't fall through to matchmaking
      }

      // Clean up stale entries first
      Object.keys(searchingPlayers).forEach((password) => {
        if (!searchingPlayers[password].ws.isOpen()) {
          console.log(
            'Searching player went stale on password:',
            searchingPlayers[password],
          )
          delete searchingPlayers[password]
        }
      })

      // Analytics
      logFunnelEvent(data.uuid, 'play_mode', 'pvp_queued_up')

      // Check if there is another player, and they are still ready
      const otherPlayer: WaitingPlayer = searchingPlayers[data.password]
      if (otherPlayer) {
        console.log(
          'PVP:',
          data.deck.cards
            .map((cardId) => Catalog.getCardById(cardId).name)
            .join(', '),
          '\n',
          otherPlayer.deck.cards
            .map((cardId) => Catalog.getCardById(cardId).name)
            .join(', '),
        )

        // Analytics
        logFunnelEvent(otherPlayer.uuid, 'play_mode', 'pvp_match_found')

        // Create a PvP match
        const match = new PvpMatch(
          ws,
          data.uuid,
          data.deck,
          otherPlayer.ws,
          otherPlayer.uuid,
          otherPlayer.deck,
        )

        // registerEvents(socket, match, playerNumber)
        delete searchingPlayers[data.password]
        // TODO Maybe just delete the last one? Somehow don't lose to race conditions

        registerEvents(ws, match, 0)
        registerEvents(otherPlayer.ws, match, 1)

        // Remove from active players on disconnect
        ws.onClose(() => {
          removeActivePlayer(data.uuid)
        })
        otherPlayer.ws.onClose(() => {
          removeActivePlayer(otherPlayer.uuid)
        })

        // Inform players that match started TODO That it's pvp specifically
        await match.notifyMatchStart()

        // Notify both players that they are connected
        await match.notifyState()
      } else {
        // Queue the player with their information
        const waitingPlayer = {
          ws: ws,
          uuid: data.uuid,
          deck: data.deck,
        }
        searchingPlayers[data.password] = waitingPlayer

        // Ensure that if they leave, they are removed from the queue and active players
        const f = () => {
          console.log('Player disconnected before getting into a match:')
          delete searchingPlayers[data.password]
          removeActivePlayer(data.uuid)
          ws.close()
        }
        ws.on('exitMatch', f)
        ws.onClose(f)
      }
    })

    ws.on('initTutorial', async (data) => {
      console.log('Tutorial: ', data.num, 'for uuid: ', data.uuid)

      // Add player to active players map
      if (data.uuid) {
        addActivePlayer(data.uuid, ws)
      }

      const match = new TutorialMatch(ws, data.num, data.uuid)
      registerEvents(ws, match, 0)

      // Remove from active players on disconnect
      if (data.uuid) {
        ws.onClose(() => {
          removeActivePlayer(data.uuid)
        })
      }

      // Start the match
      await match.notifyState()
    })
  }
}

// Register each of the events that the server receives during a match
function registerEvents(ws: MatchServerWS, match: Match, playerNumber: number) {
  ws.on('playCard', (data) => {
    match.doAction(playerNumber, data.cardNum, data.versionNo)
  })
    .on('mulligan', (data) => {
      match.doMulligan(playerNumber, data.mulligan)
    })
    .on('passTurn', (data) => {
      match.doAction(playerNumber, MechanicsSettings.PASS, data.versionNo)
    })
    .on('exitMatch', () => {
      match.doExit(ws)
    })
    .on('emote', () => {
      const emote = 0 // TODO
      match.signalEmote(playerNumber, emote)
    })

  // Websocketing closing for any reason
  ws.onClose(() => {
    match.doExit(ws)
  })
}

/**
 * Add a player to the active players map
 */
function addActivePlayer(uuid: string, ws: MatchServerWS): void {
  activePlayersMap.set(uuid, ws)
}

/**
 * Remove a player from the active players map
 */
function removeActivePlayer(uuid: string): void {
  activePlayersMap.delete(uuid)
}

/**
 * Get a player's websocket from the active players map (for sending state updates to opponents)
 */
export function getPlayerWebsocket(uuid: string): MatchServerWS | undefined {
  return activePlayersMap.get(uuid)
}

/**
 * Reconstruct a deck from a game state
 * Collects all cards from all zones for a given player
 */
function reconstructDeckFromGameState(
  gameState: GameModel,
  player: number,
): Deck {
  const allCards: number[] = []

  // Collect cards from all zones
  gameState.hand[player].forEach((card) => allCards.push(card.id))
  gameState.deck[player].forEach((card) => allCards.push(card.id))
  gameState.pile[player].forEach((card) => allCards.push(card.id))
  gameState.expended[player].forEach((card) => allCards.push(card.id))

  // Collect cards from story
  gameState.story.acts.forEach((act) => {
    if (act.owner === player) {
      allCards.push(act.card.id)
    }
  })

  return {
    name: 'Resumed Game',
    cards: allCards,
    cosmeticSet: gameState.cosmeticSets[player],
  }
}

export default MatchQueue
