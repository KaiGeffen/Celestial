import { MechanicsSettings } from '../../../../shared/settings'
import { TutorialController } from '../../tutorialController'
import PveMatch from './pveMatch'
import { logTutorialProgress } from '../../db/analytics'
import { MatchServerWS } from '../../../../shared/network/matchWS'

class TutorialMatch extends PveMatch {
  tutorialNum: number

  constructor(ws: MatchServerWS, num: number, uuid: string | null) {
    // TODO Weird to start a normal game, then erase it
    super(
      ws,
      uuid,
      { name: '', cards: [], cosmeticSet: { avatar: 0, border: 0 } },
      { name: '', cards: [], cosmeticSet: { avatar: 0, border: 0 } },
    )

    this.tutorialNum = num
    this.game = new TutorialController(num)
    this.game.start()

    // Log tutorial start progress
    logTutorialProgress(this.uuid1, `tutorial_${num + 1}`, 0)
  }

  protected async opponentActs() {
    // TODO Use ai instead
    ;[0, 1, 2, 3, 4, 5, MechanicsSettings.PASS].forEach((action) => {
      if (this.game.onPlayerInput(1, action, this.game.model.versionNo)) {
        return
      }
    })
    await this.notifyState()
  }

  async doAction(player: number, action: number, versionNo: number) {
    super.doAction(player, action, versionNo)

    // Logging analytics that they got there
    logTutorialProgress(
      this.uuid1,
      `tutorial_${this.tutorialNum + 1}`,
      this.game.model.versionNo,
    )
  }
}

export default TutorialMatch
