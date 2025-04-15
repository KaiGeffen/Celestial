import 'phaser'
import Button from '../../lib/buttons/button'
import Icons from '../../lib/buttons/icons'
import GameModel from '../../../../shared/state/gameModel'
import {
  Space,
  Depth,
  UserSettings,
  Style,
  Color,
} from '../../settings/settings'
import Region from './baseRegion'
import { GameScene } from '../gameScene'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'
import { Flags } from '../../settings/flags'

// Y of the buttons
const width = Space.iconSize * 3 + Space.pad * 4
const height = Space.todoHandOffset + Space.pad

// During the round, shows Pass button, who has passed, and who has priority
export default class TheirScoreRegion extends Region {
  recapCallback: () => void
  skipCallback: () => void

  private btnRecap: Button
  private btnSkip: Button

  txtWins: Phaser.GameObjects.Text

  // Relic icon
  relic: Phaser.GameObjects.Image

  create(scene: GameScene): this {
    this.scene = scene
    this.container = scene.add
      .container(Space.windowWidth - width, 0)
      .setDepth(Depth.theirScore)

    // this.createBackground()
    this.createIcons()
    this.createWins()
    this.createRelic()
    this.addHotkeyListeners()

    return this
  }

  displayState(state: GameModel): void {
    // Recap button
    // TODO Conditional should care about whether a recap exists not the max breath
    if (!state.isRecap && state.maxBreath[0] > 1) {
      this.btnRecap.enable()
      this.btnRecap.setVisible(true)
    } else {
      this.btnRecap.disable()
      this.btnRecap.setVisible(false)
    }

    // Skip button
    if (state.isRecap) {
      this.btnSkip.enable()
      this.btnSkip.setVisible(true)
    } else {
      this.btnSkip.disable()
      this.btnSkip.setVisible(false)
    }

    // Wins
    this.txtWins.setText(`${state.wins[1]}/5`)

    // Relic
    this.relic.setFrame(state.wins[1])
  }

  private addHotkeyListeners() {
    this.scene.input.keyboard.on('keydown-T', () => {
      if (UserSettings._get('hotkeys')) {
        if (this.btnRecap.enabled) {
          this.btnRecap.onClick()
        } else if (this.btnSkip.enabled) {
          this.btnSkip.onClick()
        }
      }
    })
  }

  private createBackground(): void {
    const background = this.scene.add
      .rectangle(0, 0, width, height, Color.backgroundDark)
      .setOrigin(0)

    this.container.add(background)
  }

  private createIcons(): void {
    // Always visible
    this.createSetSpeed()

    // Only one button visible at a time
    this.createButtons()
  }

  private createSetSpeed(): void {
    const x = Space.pad * 2 + Space.iconSize + Space.iconSize / 2
    const y = Space.pad + Space.iconSize / 2

    // Create the speed button
    const speedButton = new Icons.Speed(this.container, x, y, () => {
      // Get current speed
      const currentSpeed = UserSettings._get('animationSpeed')

      // Cycle through speeds: 0.25 -> 0.5 -> 1 -> 2 -> 0.25
      let newSpeed
      if (currentSpeed < 0.3) newSpeed = 0.5
      else if (currentSpeed < 0.7) newSpeed = 1
      else if (currentSpeed < 1.5) newSpeed = 2
      else newSpeed = 0.25

      // Update the setting
      UserSettings._set('animationSpeed', newSpeed)

      // Update the icon frame based on speed
      speedButton.icon.setFrame(this.getSpeedFrame(newSpeed))

      // Show a message about the speed change
      this.scene.signalError(`YOUR SPEED: ${newSpeed}x`)
    })

    // Set initial frame based on current speed
    const currentSpeed = UserSettings._get('animationSpeed')
    const baseSpeed = currentSpeed / (Flags.local ? 10000 : 1)
    speedButton.icon.setFrame(this.getSpeedFrame(baseSpeed))
  }

  // Helper method to determine which frame to use based on speed
  private getSpeedFrame(speed: number): number {
    if (speed < 0.3)
      return 0 // Slowest
    else if (speed < 0.7)
      return 1 // Slow
    else if (speed < 1.5)
      return 2 // Normal
    else return 3 // Fast
  }

  private createButtons(): void {
    const x = Space.pad + Space.iconSize / 2
    const y = Space.pad + Space.iconSize / 2

    // Recap button
    this.btnRecap = new Icons.Recap(this.container, x, y, () =>
      this.recapCallback(),
    ).setVisible(false)

    // Skip button
    this.btnSkip = new Icons.Skip(this.container, x, y, () =>
      this.skipCallback(),
    ).setVisible(false)

    this.addHotkeyHint([x, y], 'T')
  }

  private createWins(): void {
    // Create a vertical sizer
    const winsSizer = new Sizer(this.scene, {
      x: width / 2,
      y: height,
      orientation: 'vertical',
      space: { bottom: Space.padSmall, item: 4 },
    }).setOrigin(0.5, 1)

    this.txtWins = this.scene.add.text(0, 0, '0/5', Style.todoScore)
    const hintWins = this.scene.add.text(0, 0, 'Wins', Style.todoSubtext)

    // Add texts to sizer, centering them horizontally
    winsSizer
      .add(this.txtWins, { align: 'center' })
      .add(hintWins, { align: 'center' })
      .layout()

    // Add sizer to container
    this.container.add(winsSizer)
  }

  private createRelic(): void {
    this.relic = this.scene.add
      .image(width / 2, height, 'relic-Dandelion')
      .setRotation(Math.PI)
      .setOrigin(0.5, 1)
    this.container.add(this.relic)
  }
}
