import Match from './match'
import { getAction } from '../../ai'
import getClientGameModel from '../../../../shared/state/clientGameModel'
import { MatchServerWS } from '../../../../shared/network/matchWS'
import { Deck } from '../../../../shared/types/deck'
import { AchievementManager } from '../../achievementManager'

class PveMatch extends Match {
  constructor(ws: MatchServerWS, uuid: string, deck: Deck, aiDeck: Deck) {
    super(ws, uuid, deck, null, null, aiDeck)
  }

  // Given ws is disconnecting
  async doExit(disconnectingWs: MatchServerWS) {
    if (this.game === null) return
    // AI wins by default
    if (this.game.model.winner == null) this.game.model.winner = 1

    // Update achievements if user logged in
    await AchievementManager.onGamePlayed(this.uuid1, this.game.model, false, 0)

    // NOTE Game is null to prevent doExit from being called again
    this.game = null
    disconnectingWs.close()
  }

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

  // async addAiOpponent(i: number | null = null) {
  //   await this.addDeck(1, get_computer_deck(i), 0)
  //   this.vs_ai = true
  // }
}

export default PveMatch
