import Match from './match'
import { getAction } from '../../ai'
import getClientGameModel from '../../../../shared/state/clientGameModel'
import { ServerWS } from '../../../../shared/network/celestialTypedWebsocket'
import { Deck } from '../../../../shared/types/deck'
import { updateMatchResultPVE } from '../../db/updateMatchResult'
import { AchievementManager } from '../../achievementManager'

class PveMatch extends Match {
  constructor(ws: ServerWS, uuid: string, deck: Deck, aiDeck: Deck) {
    super(ws, uuid, deck, null, null, aiDeck)
  }

  // Given ws is disconnecting
  async doSurrender(disconnectingWs: ServerWS) {
    if (this.game === null || this.game.model.winner !== null) return

    // AI wins by default
    this.game.setWinnerViaSurrender(1)
    await this.notifyState()

    // NOTE Game is null to prevent doExit from being called again
    this.game = null
  }

  // TODO Handle disconnect separately

  async notifyState() {
    await super.notifyState()

    // Opponent will act if it's their turn
    if (
      this.game.model.priority === 1 &&
      !this.game.model.mulligansComplete.includes(false) &&
      this.game.model.winner === null
    ) {
      await this.opponentActs()
    }
  }

  protected async opponentActs() {
    const model = getClientGameModel(this.game.model, 1, false)
    const action = getAction(model)
    if (this.game.onPlayerInput(1, action, this.game.model.versionNo)) {
      await this.notifyState()
    } else {
      console.error('Computer opponent chose invalid action')
    }
  }

  async doMulligan(player, mulligan) {
    await super.doMulligan(player, mulligan)

    // TODO Opponent makes smarter mulligan
    this.game.doMulligan(1, [false, false, false])
    await this.notifyState()
  }

  protected async updateDatabases() {
    const winner = this.game.model.winner

    // How many rounds won/lost/tied
    const roundsWLT: [number, number, number] = [
      this.game.model.wins[winner],
      this.game.model.wins[winner ^ 1],
      this.game.model.roundCount -
        this.game.model.wins[winner] -
        this.game.model.wins[winner ^ 1],
    ]

    const matchQualifiesForRewards = this.game.model.roundCount >= 3

    await updateMatchResultPVE(
      this.uuid1,
      this.deck1,
      this.deck2,
      winner === 0,
      roundsWLT,
      matchQualifiesForRewards,
    ).catch((error) => {
      console.error('Error updating match results:', error)
    })

    // Update achievements
    await AchievementManager.onGamePlayed(this.uuid1, this.game.model, false, 0)
  }
}

export default PveMatch
