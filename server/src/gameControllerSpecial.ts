import { ServerController } from './gameController'
import { MechanicsSettings } from '../../shared/settings'
import SpecialGameModel from '../../shared/state/specialGameModel'

// Special game modes with conditional logic
class SpecialController extends ServerController {
  enabledModes: number[]
  declare model: SpecialGameModel

  constructor(enabledModes: number[]) {
    super()
    this.enabledModes = enabledModes
  }

  startGame(
    deck1: any[],
    deck2: any[],
    cosmeticSet1: any,
    cosmeticSet2: any,
  ): void {
    // Create special game model with enabled modes
    this.model = new SpecialGameModel(
      deck1,
      deck2,
      cosmeticSet1,
      cosmeticSet2,
      this.enabledModes,
    )

    // Apply special mode effects based on enabled modes
    // Mode 0: Starting breath is 3 instead of 1
    if (this.enabledModes.includes(0)) {
      this.model.maxBreath = [3, 3]
      this.model.breath = [3, 3]
    }
  }

  protected doUpkeepDraws(): void {
    for (const player of [0, 1]) {
      if (this.enabledModes.includes(1)) {
        this.model.discard(player, this.model.hand[player].length)
        this.model.draw(player, 5)
      } else {
        this.model.draw(player, MechanicsSettings.DRAW_PER_TURN)
      }
    }
  }

  // Override doResolvePhase to call onRoundEnd for Mode 3
  protected doResolvePhase(): void {
    super.doResolvePhase()

    this.model.onRoundEnd()
  }
}

export { SpecialController }
