import Match from './match'
import { MatchServerWS } from '../../../../shared/network/matchWS'
import { updateMatchResult } from '../../db/updateMatchResult'
import { Deck } from '../../../../shared/types/deck'
import { MechanicsSettings } from '../../../../shared/settings'
import { AchievementManager } from '../../achievementManager'

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

  // Given ws is disconnecting
  async doExit(disconnectingWs: MatchServerWS) {
    // Don't send disconnect message if the game has already ended
    if (this.game === null || this.game.model.winner !== null) return

    // Set the winner, notify connected players
    const winner = this.ws1 === disconnectingWs ? 1 : 0
    this.game.setWinnerViaDisconnect(winner)
    await this.notifyState()

    // Notify opponent and close websockets
    await Promise.all(
      this.getActiveWsList().map((ws: MatchServerWS) => {
        if (ws !== disconnectingWs) {
          ws.send({ type: 'opponentDisconnected' })
        }
        ws.close()
      }),
    )
  }

  async notifyState(): Promise<void> {
    await super.notifyState()

    // If there is a winner, update wins/losses/elo accordingly
    if (this.game.model.winner !== null) {
      await this.updateMatchResult(this.game.model.winner)

      // Update achievements
      await AchievementManager.onGamePlayed(
        this.uuid1,
        this.game.model,
        true,
        true,
      )
      await AchievementManager.onGamePlayed(
        this.uuid2,
        this.game.model,
        true,
        false,
      )
    }
  }

  // Update the database records for this match
  private async updateMatchResult(winner: number) {
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

    await updateMatchResult(
      idWinner,
      idLoser,
      winnerDeck,
      loserDeck,
      roundsWLT,
    ).catch((error) => {
      console.error('Error updating match results:', error)
    })
  }

  // Start an interval to autopass if the user has no time left
  private startTimerCheck() {
    this.timerCheckInterval = setInterval(async () => {
      // If game is over, stop checking
      if (
        this.game.model.winner !== null ||
        this.ws1 === null ||
        this.ws2 === null
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
