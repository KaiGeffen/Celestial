import { TypedWebSocket } from '../../../../shared/network/typedWebSocket'
import { MechanicsSettings } from '../../../../shared/settings'
import { TutorialController } from '../../tutorialController'
import PveMatch from './pveMatch'

class TutorialMatch extends PveMatch {
  constructor(ws: TypedWebSocket<any, any>, num: number) {
    // TODO Weird to start a normal game, then erase it
    super(
      ws,
      '',
      { name: '', cards: [], cosmeticSet: { avatar: 0, border: 0 } },
      { name: '', cards: [], cosmeticSet: { avatar: 0, border: 0 } },
    )

    this.game = new TutorialController(num)
    this.game.start()
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
}

export default TutorialMatch
