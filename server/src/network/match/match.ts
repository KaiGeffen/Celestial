import { ServerController } from '../../gameController'
import { Mulligan } from '../../../../shared/settings'
import getClientGameModel from '../../../../shared/state/clientGameModel'
import { ServerWS } from '../../../../shared/network/celestialTypedWebsocket'
import { db } from '../../db/db'
import { players } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { Deck } from '../../../../shared/types/deck'
import Catalog from '../../../../shared/state/catalog'
import { AchievementManager } from '../../achievementManager'
import { randomUUID } from 'crypto'
import sendUserData from '../sendUserData'
import { getCardWithVersion } from '../../../../shared/state/cardUpgrades'

// TODO Timer logic for disconnects

interface Match {
  gameId: string
  ws1: ServerWS | null
  ws2: ServerWS | null

  uuid1: string
  uuid2: string | null

  deck1: Deck
  deck2: Deck

  game: ServerController
}

class Match implements Match {
  constructor(ws1: ServerWS, uuid1: string, deck1: Deck, deck2: Deck) {
    // Generate unique game ID
    this.gameId = randomUUID()

    // Store at least the first player's information (In pvpMatch store second)
    this.ws1 = ws1
    this.uuid1 = uuid1

    this.deck1 = deck1
    this.deck2 = deck2
  }

  // Spectators per side/perspective (0 or 1).
  private spectators: [Set<ServerWS>, Set<ServerWS>] = [
    new Set<ServerWS>(),
    new Set<ServerWS>(),
  ]

  addSpectator(ws: ServerWS, playerPerspective: 0 | 1): void {
    this.spectators[playerPerspective].add(ws)

    // Send an immediate snapshot so the spectator can render right away.
    if (this.game) {
      const game = this.game

      ws.send({
        type: 'transmitState',
        state: getClientGameModel(game.model, playerPerspective, false),
      })
    }
  }

  removeSpectator(ws: ServerWS): void {
    this.spectators[0].delete(ws)
    this.spectators[1].delete(ws)
  }

  // Drop every spectator watching from this player's perspective
  removeAllSpectatorsForPerspective(playerPerspective: 0 | 1): ServerWS[] {
    const set = this.spectators[playerPerspective]
    const removed = Array.from(set)
    for (const ws of removed) {
      this.removeSpectator(ws)
    }
    return removed
  }

  async startMatch() {
    const user1 = await this.getUsernameElo(this.uuid1)
    const user2 = await this.getUsernameElo(this.uuid2)

    // Make a new game
    this.game = new ServerController()
    this.game.startGame(
      this.deck1.cards.map((cardId) => Catalog.getCardById(cardId)),
      this.deck2.cards.map((cardId) => Catalog.getCardById(cardId)),
      this.deck1.cosmeticSet,
      this.deck2.cosmeticSet,
      user1.username,
      user2.username,
      user1.elo,
      user2.elo,
    )
  }

  // Notify players of the state of the game
  async notifyState() {
    if (this.game === null) return

    // Handle achievements for current state and each slice of the recap
    AchievementManager.onStateUpdate(this.uuid1, this.uuid2, this.game.model)
    ;[0, 1].forEach((player) => {
      this.game.model.recentModels[player].forEach(async (model) => {
        await AchievementManager.onStateUpdate(this.uuid1, this.uuid2, model)
      })
    })

    /*
      Send each state since last input
      For actions besides the last pass of a round, this is just 1
      but for recaps it's each slice of the recap
    */
    await Promise.all(
      [0, 1].map(async (player) => {
        const recipients: ServerWS[] = []

        const activeWs = player === 0 ? this.ws1 : this.ws2
        if (activeWs) recipients.push(activeWs)

        // Add spectators registered for this same perspective.
        recipients.push(...Array.from(this.spectators[player]))

        recipients.forEach((ws) => {
          // Send any recap states
          this.game.model.recentModels[player].forEach((state) =>
            ws.send({
              type: 'transmitState',
              state: state,
            }),
          )

          // Send the normal state
          ws.send({
            type: 'transmitState',
            state: getClientGameModel(this.game.model, player, false),
          })
        })
      }),
    )

    // TODO Support compression so that these aren't each 500kb
    // Save game state to database after every state change
    // await saveGameState(
    //   this.gameId,
    //   this.uuid1,
    //   this.uuid2,
    //   this.game.model,
    // ).catch((error) => {
    //   console.error('Error saving game state:', error)
    // })

    // Handle database and achievement updates as game ends
    if (this.game.model.winner !== null) {
      await this.updateDatabases()

      // Update achievements
      this.updateAchievements()

      // Inform users of their new state
      await sendUserData(this.ws1, this.uuid1)
      await sendUserData(this.ws2, this.uuid2)
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
      const ws = player === 0 ? this.ws1 : this.ws2
      // TODO
      // await this.notifyError(ws)
    }
  }

  // Whether the match is over
  isOver(): boolean {
    return this.game && this.game.model.winner !== null
  }

  // Get the list of all active websockets connected to this match
  protected getActiveWsList(): ServerWS[] {
    return [this.ws1, this.ws2].filter((ws) => ws)
  }

  async signalEmote(player: number, emoteNumber: number) {
    // TODO Use emoteNumber
    if (player === 0 && this.ws2) {
      await this.ws2.send({ type: 'opponentEmote' })
    }
    if (player === 1 && this.ws1) {
      await this.ws1.send({ type: 'opponentEmote' })
    }
  }

  // Called when given ws is surrendering, implemented in children
  async doSurrender(disconnectingWs: ServerWS) {}

  // Called when given ws is disconnecting, implemented in children
  async doDisconnect(disconnectingWs: ServerWS) {}

  async reconnectUser(ws: ServerWS, playerNumber: number) {
    if (playerNumber === 0) {
      this.ws1 = ws
    } else {
      this.ws2 = ws
    }

    // Send user current state
    await ws.send({
      type: 'promptReconnect',
      state: getClientGameModel(this.game.model, playerNumber, false),
    })

    // Send opp a message that their opp is back
    let opponentWs = playerNumber === 0 ? this.ws2 : this.ws1
    if (opponentWs) {
      opponentWs.send({ type: 'opponentReconnected' })
    }

    // TODO Handle timer logic for reconnects
  }

  // Get the name of player with given uuid
  protected async getUsernameElo(
    uuid: string | null,
  ): Promise<{ username: string; elo: string }> {
    if (!uuid) return { username: '', elo: '' }

    try {
      const result = await db
        .select({
          username: players.username,
          elo: players.elo,
        })
        .from(players)
        .where(eq(players.id, uuid))
        .limit(1)

      if (result.length === 0) return { username: '', elo: '' }

      return { username: result[0].username, elo: result[0].elo.toString() }
    } catch (error) {
      console.error('Error fetching username:', error)
      return { username: '', elo: '' }
    }
  }

  // Update all player achievements
  protected async updateAchievements() {}
}

export default Match
