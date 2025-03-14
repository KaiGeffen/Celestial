import 'phaser'
import Button from '../../lib/buttons/button'
import Icons from '../../lib/buttons/icons'
import GameModel from '../../../../shared/state/gameModel'
import { Space, UserSettings } from '../../settings/settings'
import { GameScene } from '../gameScene'
import Region from './baseRegion'

// During the round, shows Pass button, who has passed, and who has priority
export default class PassRegion extends Region {
  callback: () => void
  recapCallback: () => void

  // The callback once the winner has been declared
  showResultsCallback: () => void

  hotkeysRegistered = false

  btnPass: Button

  btnMoon: Button

  txtYouPassed: Phaser.GameObjects.Text
  txtTheyPassed: Phaser.GameObjects.Text

  create(scene: GameScene): PassRegion {
    this.scene = scene
    this.container = scene.add.container(
      Space.windowWidth,
      Space.windowHeight - 222,
    )

    // Create the pass button
    this.btnPass = new Icons.Pass(this.container, 0, 0).setOrigin(1, 0.5)

    return this
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

    // Before mulligan is complete, hide this region
    if (state.mulligansComplete.includes(false)) {
      this.container.setVisible(false)
      return
    } else if (!this.hotkeysRegistered) {
      this.addHotkeys()
      this.hotkeysRegistered = true
    }
    this.container.setVisible(true)

    // Enable/disable button based on who has priority
    if (state.winner !== null) {
      // Once the game is over, change the callback to instead show results of match
      this.btnPass
        .enable()
        .setText('EXIT')
        .setOnClick(() => {
          this.showResultsCallback()
        })
    } else if (state.priority === 0 && !state.isRecap) {
      // Under the special condition where:
      this.btnPass.enable().setOnClick(() => {
        this.callback()
      }, true)
    } else {
      this.btnPass.disable()
    }
  }

  // Set the callback for when user hits the Pass button
  setCallback(callback: () => void): void {
    this.callback = callback
  }

  setShowResultsCallback(callback: () => void): void {
    this.showResultsCallback = callback
  }

  private addHotkeys() {
    this.scene.input.keyboard.removeListener('keydown-SPACE')
    this.scene.input.keyboard.on('keydown-SPACE', () => {
      if (this.btnPass.enabled && UserSettings._get('hotkeys')) {
        this.btnPass.onClick()
      }
    })
  }

  // For tutorial, disable the option to pass, but still show the sun
  // private oldCallback: () => void
  disablePass(): void {
    // this.btnPass.setAlpha(0)
    this.btnPass.setText('').disable()['tutorialSimplifiedPass'] = true

    // Enable it, with simplified uses
    this.btnPass.enable()
  }

  enablePass(): void {
    this.btnPass['tutorialSimplifiedPass'] = false
    this.btnPass.enable()
  }
}
