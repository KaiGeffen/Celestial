import 'phaser'
import Button from '../../lib/buttons/button'
import GameModel from '../../../../shared/state/gameModel'
import {
  Space,
  Depth,
  UserSettings,
  Style,
  Color,
} from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'
import { Flags } from '../../settings/flags'
import Buttons from '../../lib/buttons/buttons'

// During the round, shows Pass button, who has passed, and who has priority
export default class TheirScoreRegion extends Region {
  recapCallback: () => void
  skipCallback: () => void

  private btnRecap: Button
  private btnSkip: Button
  private btnSpeed: Button

  txtWins: Phaser.GameObjects.Text

  // Relic icon
  relic: Phaser.GameObjects.Image

  // Move these inside the class as fields so they're set on instantiation
  private width = Space.iconSize * 3 + Space.pad * 4
  private height = Space.todoHandOffset + Space.pad

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(Depth.theirScore)

    // Anchor to top right
    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `100%-${this.width}`,
    })

    // this.createBackground()
    this.creatButtons()
    this.createWins()
    this.createRelic()
    this.addHotkeyListeners()

    return this
  }

  displayState(state: GameModel): void {
    // Recap and skip buttons
    if (!state.isRecap) {
      this.btnRecap.enable()
      this.btnRecap.setVisible(true)

      this.btnSkip.disable()
      this.btnSkip.setVisible(false)
    } else {
      this.btnRecap.disable()
      this.btnRecap.setVisible(false)

      this.btnSkip.enable()
      this.btnSkip.setVisible(true)
    }

    // Wins
    this.txtWins.setText(`${state.wins[1]}/5`)

    // Relic
    this.relic.setFrame(state.wins[1])
  }

  private addHotkeyListeners() {
    this.scene.input.keyboard.on('keydown-R', () => {
      if (UserSettings._get('hotkeys')) {
        if (this.btnRecap.enabled) {
          this.btnRecap.onClick()
        } else if (this.btnSkip.enabled) {
          this.btnSkip.onClick()
        }
      }
    })

    this.scene.input.keyboard.on('keydown-E', () => {
      if (UserSettings._get('hotkeys')) {
        this.btnSpeed.onClick()
      }
    })
  }

  private createBackground(): void {
    const background = this.scene.add
      .rectangle(0, 0, this.width, this.height, Color.backgroundDark)
      .setOrigin(0)

    this.container.add(background)
  }

  private creatButtons(): void {
    let x = Space.pad + Space.iconSize / 2
    const y = Space.pad + Space.iconSize / 2

    // Recap button
    this.btnRecap = new Buttons.Icon({
      name: 'Recap',
      within: this.container,
      hint: 'Watch replay',
      x: x,
      y: y,
      f: () => this.recapCallback(),
    })

    // Skip button
    this.btnSkip = new Buttons.Icon({
      name: 'Skip',
      within: this.container,
      hint: 'Skip replay',
      x: x,
      y: y,
      f: () => this.skipCallback(),
    }).setVisible(false)

    this.addHotkeyHint([x, y], 'R')

    // Speed button
    x = Space.pad * 2 + Space.iconSize + Space.iconSize / 2

    // Create the speed button
    this.btnSpeed = new Buttons.Icon({
      name: 'Speed',
      within: this.container,
      hint: 'Animation speed',
      x: x,
      y: y,
      f: () => {
        // Get current speed
        const currentSpeed = UserSettings._get('animationSpeed')

        // Cycle through speeds: 0.1 -> 0.25 -> 0.5 -> 1 -> 2 -> 0.1
        let newSpeed
        if (currentSpeed < 0.25) newSpeed = 0.25
        else if (currentSpeed < 0.5) newSpeed = 0.5
        else if (currentSpeed < 1) newSpeed = 1
        else if (currentSpeed < 2) newSpeed = 2
        else newSpeed = 0.1

        // Update the setting
        UserSettings._set('animationSpeed', newSpeed)

        // Update the icon frame based on speed
        // speedButton.icon.setFrame(this.getSpeedFrame(newSpeed))

        // Show a message about the speed change
        this.scene.signalError(`YOUR SPEED: ${newSpeed * 10}x`)
      },
    })

    this.addHotkeyHint([x, y], 'E')

    // Set initial frame based on current speed
    // const currentSpeed = UserSettings._get('animationSpeed')
    // const baseSpeed = currentSpeed / (Flags.local ? 10000 : 1)
    // this.btnSpeed.icon.setFrame(this.getSpeedFrame(baseSpeed))
  }

  private createWins(): void {
    // Create a vertical sizer
    const winsSizer = new Sizer(this.scene, {
      x: this.width / 2,
      y: this.height,
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
      .image(this.width / 2, this.height, 'relic-Dandelion')
      .setRotation(Math.PI)
      .setOrigin(0.5, 1)
    this.container.add(this.relic)
  }
}
