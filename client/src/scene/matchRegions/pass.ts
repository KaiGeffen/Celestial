import 'phaser'
import Button from '../../lib/buttons/button'
import Icons from '../../lib/buttons/icons'
import GameModel from '../../../../shared/state/gameModel'
import {
  Style,
  Color,
  Space,
  Time,
  Ease,
  Flags,
  UserSettings,
  Depth,
} from '../../settings/settings'
import { GameScene } from '../gameScene'
import Region from './baseRegion'
import { MechanicsSettings } from '../../../../shared/settings'

// During the round, shows Pass button, who has passed, and who has priority
export default class PassRegion extends Region {
  callback: () => void
  recapCallback: () => void

  // The callback once the winner has been declared
  showResultsCallback: () => void

  hotkeysRegistered = false

  btnPass: Button
  btnMoon: Button

  yourPass: Phaser.GameObjects.Container
  theirPass: Phaser.GameObjects.Container

  create(scene: GameScene): PassRegion {
    this.scene = scene
    this.container = scene.add
      .container(Space.windowWidth, Space.windowHeight / 2)
      .setDepth(Depth.pass)

    // Pass and recap button
    this.createButtons()

    // Show who has passed
    this.createText()

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

    // Display the current score totals
    const s = `${state.score[1]}\n\n${state.score[0]}`
    this.btnMoon.setText(s)

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
      // Under the special condition where:
      // Max breath reached, can play card, start of round
      // The player is not allowed to pass
      const canPlay = state.cardCosts.some((cost) => cost <= state.breath[0])
      if (
        state.maxBreath[0] === MechanicsSettings.BREATH_CAP &&
        canPlay &&
        state.story.acts.length === 0
      ) {
        this.btnPass
          .setOnClick(() => {
            const s = "You can't pass to start the 10th or later round."
            this.scene.signalError(s)
          })
          .enable()
      }
      // Otherwise, allow them to pass as normal
      else {
        this.btnPass.enable().setOnClick(() => {
          this.callback()
        }, true)
      }
    } else {
      this.btnPass.disable()
    }

    // Disable moon during day
    if (state.isRecap) {
      this.btnMoon.enable()
    } else {
      this.btnMoon.disable()
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
      if (UserSettings._get('hotkeys')) {
        if (this.btnPass.enabled) {
          this.btnPass.onClick()
        } else if (this.btnMoon.enabled) {
          this.btnMoon.onClick()
        }
      }
    })
  }

  private createButtons(): void {
    const x = -156
    this.btnPass = new Icons.Pass(this.container, x, 0)
    this.btnMoon = new Icons.Moon(this.container, -x, 0, () => {
      if (this.scene['paused']) {
        this.scene['paused'] = false
        this.btnMoon.setText(
          this.btnMoon.txt.text.replace('\nPaused\n', '\n\n'),
        )
      } else {
        this.scene['paused'] = true
        this.btnMoon.setText(
          this.btnMoon.txt.text.replace('\n\n', '\nPaused\n'),
        )
      }
    })

    this.addHotkeyHint([x, 0], 'SPACE')
    this.addHotkeyHint([-x, 0], 'SPACE').setRotation(Math.PI)
  }

  private createText(): void {
    // Create containers for each pass indicator
    this.theirPass = this.scene.add.container(-150, -100).setAlpha(0)
    this.yourPass = this.scene.add.container(-150, 80).setAlpha(0)

    // Them
    const cloud = this.scene.add.image(0, 0, 'icon-CloudBottom')
    const text = this.scene.add
      .text(0, 20, 'Passed', Style.todoCloud)
      .setOrigin(0.5)
    this.theirPass.add([cloud, text])

    // Me
    const cloud2 = this.scene.add.image(0, -20, 'icon-CloudTop')
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
        duration: Time.recapTween(),
        ease: 'Cubic.out',
        onComplete: () => {
          container.setAlpha(1)
        },
      })
    } else {
      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: Time.recapTween(),
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
    } else {
      this.btnPass.setText('Pass')
      this.btnPass.enable()
      this.btnPass['tutorialSimplifiedPass'] = false
    }
  }
}
