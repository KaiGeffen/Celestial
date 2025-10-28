import { ServerController } from '../../gameController'
import { Mulligan } from '../../../../shared/settings'
import getClientGameModel from '../../../../shared/state/clientGameModel'
import { MatchServerWS } from '../../../../shared/network/matchWS'
import { db } from '../../db/db'
import { players } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { Deck } from '../../../../shared/types/deck'
import Catalog from '../../../../shared/state/catalog'
import { AchievementManager } from '../../achievementManager'
import { saveGameState } from '../../db/gameState'
import { getPlayerWebsocket } from '../matchQueue'
import { randomUUID } from 'crypto'
import GameModel from '../../../../shared/state/gameModel'

interface Match {
  gameId: string
  uuid1: string
  uuid2: string | null

  deck1: Deck
  deck2: Deck

  game: ServerController
}

class Match implements Match {
  constructor(
    ws1: MatchServerWS,
    uuid1: string,
    deck1: Deck,
    ws2: MatchServerWS | null,
    uuid2: string | null = null,
    deck2: Deck,
  ) {
    // Generate unique game ID
    this.gameId = randomUUID()
    this.uuid1 = uuid1
    this.uuid2 = uuid2

    this.deck1 = deck1
    this.deck2 = deck2

    // Make a new game
    this.game = new ServerController()
    this.game.startGame(
      deck1.cards.map((cardId) => Catalog.getCardById(cardId)),
      deck2.cards.map((cardId) => Catalog.getCardById(cardId)),
      deck1.cosmeticSet,
      deck2.cosmeticSet,
    )

    // Save initial game state to database
    saveGameState(
      this.gameId,
      this.uuid1,
      this.uuid2,
      this.game.model,
      false,
    ).catch((error) => {
      console.error('Error saving initial game state:', error)
    })
  }

  // Notify all connected players that the match has started
  async notifyMatchStart() {
    const user1 = await this.getUsernameElo(this.uuid1)
    const user2 = await this.getUsernameElo(this.uuid2)

    const ws1 = getPlayerWebsocket(this.uuid1)
    const ws2 = this.uuid2 ? getPlayerWebsocket(this.uuid2) : null

    if (ws1) {
      ws1.send({
        type: 'matchStart',
        name1: user1.username,
        name2: user2.username,
        elo1: user1.elo,
        elo2: user2.elo,
      })
    }

    if (ws2) {
      ws2.send({
        type: 'matchStart',
        name1: user2.username,
        name2: user1.username,
        elo1: user2.elo,
        elo2: user1.elo,
      })
    }
  }

  // Notify players of the state of the game
  async notifyState() {
    if (this.game === null) return

    // TODO This is bugged for the Torrent quest because it doesn't check each slice of the recap
    AchievementManager.onStateUpdate(this.uuid1, this.uuid2, this.game.model)

    /*
      Send each state since last input
      For actions besides the last pass of a round, this is just 1
      but for recaps it's each slice of the recap
    */
    const ws1 = getPlayerWebsocket(this.uuid1)
    const ws2 = this.uuid2 ? getPlayerWebsocket(this.uuid2) : null

    // Send state to player 1
    if (ws1) {
      this.game.model.recentModels[0].forEach((state) =>
        ws1.send({
          type: 'transmitState',
          state: state,
        }),
      )
      ws1.send({
        type: 'transmitState',
        state: getClientGameModel(this.game.model, 0, false),
      })
    }

    // Send state to player 2
    if (ws2) {
      this.game.model.recentModels[1].forEach((state) =>
        ws2.send({
          type: 'transmitState',
          state: state,
        }),
      )
      ws2.send({
        type: 'transmitState',
        state: getClientGameModel(this.game.model, 1, false),
      })
    }

    // Save game state to database after every state change
    const isOver = this.game.model.winner !== null
    await saveGameState(
      this.gameId,
      this.uuid1,
      this.uuid2,
      this.game.model,
      isOver,
    ).catch((error) => {
      console.error('Error saving game state:', error)
    })

    // Handle database and achievement updates as game ends
    if (isOver) {
      await this.updateDatabases()

      // Update achievements
      await AchievementManager.onGamePlayed(
        this.uuid1,
        this.game.model,
        true,
        0,
      )
      await AchievementManager.onGamePlayed(
        this.uuid2,
        this.game.model,
        true,
        1,
      )
    }
  }

  protected async updateDatabases() {}

  async doMulligan(player: number, mulligan: Mulligan) {
    this.game.doMulligan(player, mulligan)
    await this.notifyState()
  }

  // Given player does the given action
  async doAction(player: number, action: number, versionNo: number) {
    const valid = this.game.onPlayerInput(player, action, versionNo)

    if (valid) {
      await this.notifyState()
    } else {
      const uuid = player === 0 ? this.uuid1 : this.uuid2
      const ws = uuid ? getPlayerWebsocket(uuid) : null
      // TODO
      // if (ws) await this.notifyError(ws)
    }
  }

  async signalEmote(player: number, emoteNumber: number) {
    // TODO Use emoteNumber
    const opponentUuid = player === 0 ? this.uuid2 : this.uuid1
    if (opponentUuid) {
      const opponentWs = getPlayerWebsocket(opponentUuid)
      if (opponentWs) {
        await opponentWs.send({ type: 'opponentEmote' })
      }
    }
  }

  // Called when given ws is disconnecting, implemented in children
  async doExit(disconnectingWs: MatchServerWS) {}

  // Get the name of player with given uuid
  private async getUsernameElo(
    uuid: string | null,
  ): Promise<{ username: string; elo: number }> {
    if (!uuid) return { username: '', elo: 0 }

    try {
      const result = await db
        .select({
          username: players.username,
          elo: players.elo,
        })
        .from(players)
        .where(eq(players.id, uuid))
        .limit(1)

      if (result.length === 0) return { username: '', elo: 0 }

      return { username: result[0].username, elo: result[0].elo }
    } catch (error) {
      console.error('Error fetching username:', error)
      return { username: '', elo: 0 }
    }
  }
}

export default Match
