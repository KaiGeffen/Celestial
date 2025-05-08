import { ServerController } from '../../gameController'
import { MechanicsSettings, Mulligan } from '../../../../shared/settings'
import getClientGameModel from '../../../../shared/state/clientGameModel'
import { MatchServerWS } from '../../../../shared/network/matchWS'
import { v5 as uuidv5 } from 'uuid'
import { UUID_NAMESPACE } from '../../../../shared/network/settings'
import { db } from '../../db/db'
import { players } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { Deck } from '../../../../shared/types/deck'
import Catalog from '../../../../shared/state/catalog'
import { AchievementManager } from '../../achievementManager'

interface Match {
  ws1: MatchServerWS | null
  ws2: MatchServerWS | null

  uuid1: string | null
  uuid2: string | null

  deck1: Deck
  deck2: Deck

  game: ServerController
}

class Match implements Match {
  constructor(
    ws1: MatchServerWS,
    uuid1: string | null = null,
    deck1: Deck,
    ws2: MatchServerWS | null,
    uuid2: string | null = null,
    deck2: Deck,
  ) {
    this.ws1 = ws1
    this.uuid1 = uuid1 ? uuidv5(uuid1, UUID_NAMESPACE) : null
    this.ws2 = ws2
    this.uuid2 = uuid2 ? uuidv5(uuid2, UUID_NAMESPACE) : null

    this.deck1 = deck1
    this.deck2 = deck2

    // Make a new game
    this.game = new ServerController(
      deck1.cards.map((cardId) => Catalog.getCardById(cardId)),
      deck2.cards.map((cardId) => Catalog.getCardById(cardId)),
      deck1.cosmeticSet,
      deck2.cosmeticSet,
    )
    this.game.start()
  }

  // Notify all connected players that the match has started
  async notifyMatchStart() {
    const user1 = await this.getUsernameElo(this.uuid1)
    const user2 = await this.getUsernameElo(this.uuid2)

    await Promise.all(
      this.getActiveWsList().map((ws) => {
        if (ws === this.ws1) {
          ws.send({
            type: 'matchStart',
            name1: user1.username,
            name2: user2.username,
            elo1: user1.elo,
            elo2: user2.elo,
          })
        } else {
          ws.send({
            type: 'matchStart',
            name1: user2.username,
            name2: user1.username,
            elo1: user2.elo,
            elo2: user1.elo,
          })
        }
      }),
    )
  }

  // Notify players of the state of the game
  async notifyState() {
    if (this.game === null) return

    AchievementManager.onStateUpdate(this.uuid1, this.uuid2, this.game.model)

    /*
      Send each state since last input
      For actions besides the last pass of a round, this is just 1
      but for recaps it's each slice of the recap
    */
    await Promise.all(
      this.getActiveWsList().map((ws, player) => {
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
      }),
    )
  }

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

  // Get the list of all active websockets connected to this match
  protected getActiveWsList(): MatchServerWS[] {
    return [this.ws1, this.ws2].filter((ws) => ws !== null)
  }

  async signalEmote(player: number, emoteNumber: number) {
    // TODO Use emoteNumber
    if (player === 0 && this.ws2 !== null) {
      await this.ws2.send({ type: 'opponentEmote' })
    }
    if (player === 1 && this.ws1 !== null) {
      await this.ws1.send({ type: 'opponentEmote' })
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
