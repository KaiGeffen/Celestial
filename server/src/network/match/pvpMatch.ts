import Match from './match'
import { MatchServerWS } from '../../../../shared/network/matchWS'
import { updateMatchResult } from '../../db/updateMatchResult'
import { Deck } from '../../../../shared/types/deck'

class PvpMatch extends Match {
  constructor(
    ws1: MatchServerWS,
    uuid1: string,
    deck1: Deck,
    ws2: MatchServerWS,
    uuid2: string,
    deck2: Deck,
  ) {
    super(ws1, uuid1, deck1, ws2, uuid2, deck2)
  }

  // Given ws is disconnecting
  async doExit(disconnectingWs: MatchServerWS) {
    // Don't send disconnect message if the game has already ended
    if (this.game === null || this.game.model.winner !== null) return

    // This game is over now
    this.game === null

    // Update match result, counting the disconnecting player as the loser
    const winner = this.ws1 === disconnectingWs ? 1 : 0
    await this.updateMatchResult(winner)

    // Null the ws that has disconnected
    if (this.ws1 === disconnectingWs) this.ws1 = null
    else if (this.ws2 === disconnectingWs) this.ws2 = null

    // Notify remaining player of the disconnect
    await Promise.all(
      this.getActiveWsList().map((ws: MatchServerWS) =>
        ws.send({ type: 'dc' }),
      ),
    )
  }

  async notifyState(): Promise<void> {
    await super.notifyState()

    // If there is a winner, update wins/losses/elo accordingly
    if (this.game.model.winner !== null) {
      await this.updateMatchResult(this.game.model.winner)
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

  startTimerCheck() {
    setInterval(async () => {
      const currentPlayer = this.game.model.priority

      const timeLeft = this.game.model.getPlayerTimeLeft(currentPlayer)
      console.log(`Player ${currentPlayer + 1} has ${timeLeft}ms left`)
    }, 1000) // Check every second
  }
}

export default PvpMatch
