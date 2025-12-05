import { ServerController } from './gameController'

// Starting breath is 3 instead of 1
class ControllerBreath3 extends ServerController {
  startGame(...args: Parameters<ServerController['startGame']>) {
    super.startGame(...args)

    this.model.maxBreath = [3, 3]
    this.model.breath = [3, 3]
  }
}

export { ControllerBreath3 }
