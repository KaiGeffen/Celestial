import Match from './match'
import { MatchServerWS } from '../../../../shared/network/matchWS'
import { updateMatchResultPVP } from '../../db/updateMatchResult'
import { Deck } from '../../../../shared/types/deck'
import { MechanicsSettings } from '../../../../shared/settings'
import { getPlayerWebsocket } from '../matchQueue'
import GameModel from '../../../../shared/state/gameModel'
import { ServerController } from '../../gameController'

class PvpMatch extends Match {
  timerCheckInterval: NodeJS.Timeout

  constructor(
    ws1: MatchServerWS,
    uuid1: string,
    deck1: Deck,
    ws2: MatchServerWS,
    uuid2: string,
    deck2: Deck,
  ) {
    super(ws1, uuid1, deck1, ws2, uuid2, deck2)

    // this.startTimerCheck() TODO Enable once in prod
  }

  /**
   * Restore a PvP match from saved game state
   */
  static restoreFromState(
    gameId: string,
    gameState: GameModel,
    uuid1: string,
    uuid2: string,
    deck1: Deck,
    deck2: Deck,
  ): PvpMatch {
    const match = Object.create(PvpMatch.prototype)

    match.gameId = gameId
    match.uuid1 = uuid1
    match.uuid2 = uuid2
    match.deck1 = deck1
    match.deck2 = deck2

    // Restore game controller with the game state
    match.game = new ServerController()
    match.game.model = gameState

    return match
  }

  protected async updateDatabases() {
    const winner = this.game.model.winner

    const idWinner = winner === 0 ? this.uuid1 : this.uuid2
    const idLoser = winner === 0 ? this.uuid2 : this.uuid1

    const winnerDeck = winner === 0 ? this.deck1 : this.deck2
    const loserDeck = winner === 0 ? this.deck2 : this.deck1

    // How many rounds won/lost/tied
    const roundsWLT: [number, number, number] = [
      this.game.model.wins[winner],
      this.game.model.wins[winner ^ 1],
      this.game.model.roundCount -
        this.game.model.wins[winner] -
        this.game.model.wins[winner ^ 1],
    ]

    await updateMatchResultPVP(
      idWinner,
      idLoser,
      winnerDeck,
      loserDeck,
      roundsWLT,
    ).catch((error) => {
      console.error('Error updating match results:', error)
    })
  }

  // Given ws is disconnecting
  async doExit(disconnectingWs: MatchServerWS) {
    // Don't send disconnect message if the game has already ended
    if (this.game === null || this.game.model.winner !== null) return

    // Determine which player is disconnecting and set winner
    const ws1 = getPlayerWebsocket(this.uuid1)
    const disconnectingPlayer = ws1 === disconnectingWs ? 0 : 1
    const winner = disconnectingPlayer === 0 ? 1 : 0

    this.game.setWinnerViaDisconnect(winner)
    await this.notifyState()

    // Notify opponent and close websockets
    const ws2 = this.uuid2 ? getPlayerWebsocket(this.uuid2) : null

    if (ws1 && ws1 !== disconnectingWs) {
      ws1.send({ type: 'opponentDisconnected' })
      ws1.close()
    }

    if (ws2 && ws2 !== disconnectingWs) {
      ws2.send({ type: 'opponentDisconnected' })
      ws2.close()
    }

    disconnectingWs.close()
  }

  // Start an interval to autopass if the user has no time left
  private startTimerCheck() {
    this.timerCheckInterval = setInterval(async () => {
      const ws1 = getPlayerWebsocket(this.uuid1)
      const ws2 = this.uuid2 ? getPlayerWebsocket(this.uuid2) : null

      // If game is over or no websockets connected, stop checking
      if (
        this.game.model.winner !== null ||
        ws1 === undefined ||
        ws2 === undefined
      ) {
        if (this.timerCheckInterval) {
          clearInterval(this.timerCheckInterval)
          this.timerCheckInterval = null
        }
        return
      }

      // During mulligan, check both players
      for (let player = 0; player < 2; player++) {
        const timeLeft = this.game.model.getPlayerTimeLeft(player)
        if (timeLeft <= 0) {
          let isValid = false

          // Do default action for the current context
          if (!this.game.model.mulligansComplete[player]) {
            isValid = true
            this.game.doMulligan(player, [false, false, false])
          } else {
            isValid = this.game.onPlayerInput(
              player,
              MechanicsSettings.PASS,
              this.game.model.versionNo,
            )
          }

          if (isValid) {
            await this.notifyState()
          }
        }
      }
    }, 1000)
  }
}

export default PvpMatch
