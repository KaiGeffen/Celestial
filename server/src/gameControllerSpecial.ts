import { ServerController } from './gameController'
import { MechanicsSettings } from '../../shared/settings'

// Special game modes with conditional logic
class SpecialController extends ServerController {
  enabledModes: number[]

  constructor(enabledModes: number[]) {
    super()
    this.enabledModes = enabledModes
  }

  startGame(...args: Parameters<ServerController['startGame']>) {
    super.startGame(...args)

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
}

export { SpecialController }
