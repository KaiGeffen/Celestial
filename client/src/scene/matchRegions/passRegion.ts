import 'phaser'
import Button from '../../lib/buttons/button'
import Moon from '../../lib/buttons/moon'

import GameModel from '../../../../shared/state/gameModel'
import {
  Style,
  Time,
  Ease,
  UserSettings,
  Depth,
  Messages,
} from '../../settings/settings'
import { MatchScene } from '../matchScene'
import Region from './baseRegion'
import Buttons from '../../lib/buttons/buttons'
import { server } from '../../server'
import { SCORE_CHROME_HEIGHT_RATIO } from './scoreRegion'

// During the round, shows Pass button, who has passed, and who has priority
export default class PassRegion extends Region {
  callback: () => boolean
  recapCallback: () => void
  skipCallback: () => void

  // The callback once the winner has been declared
  showResultsCallback: () => void

  hotkeysRegistered = false
  btnPass: Button
  btnMoon: Moon

  yourPass: Phaser.GameObjects.Container
  theirPass: Phaser.GameObjects.Container

  create(scene: MatchScene): PassRegion {
    this.scene = scene
    this.container = scene.add.container(0, 0)

    // Buttons must exist before anchor fires its initial callback
    this.createButtons()
    this.createText()

    // Container sits at right edge / vertical center; buttons are offset ±dx inside it
    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `100%`,
      y: `50%`,
      onUpdateViewportCallback: (viewport: { height: number }) => {
        const dx = (160 / 1080) * viewport.height * SCORE_CHROME_HEIGHT_RATIO
        this.btnPass.setPosition(-dx, 0)
        this.btnMoon.setPosition(dx, 0)
      },
    })

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

    // Display the current score totals (mark when recap has paused on round result)
    const isRecapEndPause =
      state.isRecap &&
      state.sound !== null &&
      ['win', 'lose', 'tie'].includes(state.sound)

    this.btnMoon.setText(`${state.score[1]}\n\n${state.score[0]}`)
    this.btnMoon.txtAction.setText(isRecapEndPause ? 'Continue' : '')

    if (state.isRecap) {
      this.btnMoon.enable()
    } else {
      this.btnMoon.disable()
    }

    // Rotate to the right day/night
    this.showDayNight(state.isRecap)

    // Show who has passed
    if (state.passes === 2) {
      this.animatePass(this.yourPass, true)
      this.animatePass(this.theirPass, true)
    } else if (state.passes === 1) {
      // My turn, so they passed
      if (state.priority === 0) {
        this.animatePass(this.yourPass, false)
        this.animatePass(this.theirPass, true)
      }
      // Their turn, so I passed
      else {
        this.animatePass(this.yourPass, true)
        this.animatePass(this.theirPass, false)
      }
    } else {
      this.animatePass(this.yourPass, false)
      this.animatePass(this.theirPass, false)
    }

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
      // Call callback if network is connected
      this.btnPass.enable().setOnClick(() => {
        if (!server.isOpen()) {
          this.scene.signalError(Messages.disconnectError)
        } else {
          if (!this.callback()) return
          this.btnPass.disable()
        }
      })
    } else {
      this.btnPass.disable()
    }
  }

  // Set the callback for when user hits the Pass button
  setCallback(callback: () => boolean): void {
    this.callback = callback
  }

  setShowResultsCallback(callback: () => void): void {
    this.showResultsCallback = callback
  }

  private addHotkeys() {
    this.scene.input.keyboard.removeListener('keydown-SPACE')
    this.scene.input.keyboard.on('keydown-SPACE', () => {
      if (!UserSettings._get('hotkeys')) return
      if (this.btnMoon.enabled) {
        this.btnMoon.onClick()
      } else if (this.btnPass.enabled) {
        this.btnPass.onClick()
      }
    })
  }

  private createButtons(): void {
    this.btnPass = new Buttons.Sun(this.container, 0, 0)
    this.btnMoon = new Buttons.Moon(this.container, 0, 0, () =>
      this.skipCallback(),
    ).disable()
  }

  private createText(): void {
    // Create containers for each pass indicator
    this.theirPass = this.scene.add.container(-150, -100).setAlpha(0)
    this.yourPass = this.scene.add.container(-150, 80).setAlpha(0)

    // Them
    const cloud = this.scene.add.image(0, 0, 'chrome-CloudBottom').setScale(0.8)
    const text = this.scene.add
      .text(0, 20, 'Passed', Style.todoCloud)
      .setOrigin(0.5)
    this.theirPass.add([cloud, text])

    // Me
    const cloud2 = this.scene.add.image(0, -20, 'chrome-CloudTop').setScale(0.8)
    const text2 = this.scene.add
      .text(0, 0, 'Passed', Style.todoCloud)
      .setOrigin(0.5)
    this.yourPass.add([cloud2, text2])

    // Add containers to the main container
    this.container.add([this.yourPass, this.theirPass])
  }

  // Animate the given object saying that the player has/not passed
  // NOTE This causes a pause on every state change even if alpha is 0 > 0
  private animatePass(
    container: Phaser.GameObjects.Container,
    hasPassed: boolean,
  ): void {
    if (hasPassed) {
      // Start off screen to the left
      container.x = -160
      container.alpha = 0

      this.scene.tweens.add({
        targets: container,
        x: -150,
        alpha: 1,
        duration: Time.match.recapTween,
        ease: 'Cubic.out',
        onComplete: () => {
          container.setAlpha(1)
        },
      })
    } else {
      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: Time.match.recapTween,
        onComplete: () => {
          container.setAlpha(0)
        },
      })
    }
  }

  // Animate the sun / moon being visible when it's day or night
  private showDayNight(isRecap: boolean) {
    let target = this.container

    // If day and sun not centered
    if (!isRecap && target.rotation !== 0) {
      this.scene.tweens.add({
        targets: target,
        rotation: 0,
        ease: Ease.basic,
      })
    }
    // If night and moon not centered
    else if (
      isRecap &&
      target.rotation !== Math.PI &&
      target.rotation !== -Math.PI
    ) {
      this.scene.tweens.add({
        targets: target,
        rotation: Math.PI,
        ease: Ease.basic,
      })
    }
  }

  // For tutorial, disable the option to pass, but still show the sun
  // private oldCallback: () => void
  tutorialSimplifyPass(simplified: boolean): void {
    if (simplified) {
      this.btnPass.setText('')
      this.btnPass['tutorialSimplifiedPass'] = true
      this.btnPass.disable()
    } else {
      this.btnPass.setText('Pass')
      this.btnPass['tutorialSimplifiedPass'] = false
      this.btnPass.enable()
    }
  }
}
