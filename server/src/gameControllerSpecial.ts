import { ServerController } from './gameController'

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
}

export { SpecialController }
