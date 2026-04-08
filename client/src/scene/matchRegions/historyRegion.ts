import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Space, Depth, UserSettings } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'

// Recap, skip (during replay), and animation speed — anchor x: 0%+100, y: 50%.
export default class HistoryRegion extends Region {
  recapCallback: () => void
  skipCallback: () => void

  private btnRecap: Button
  private btnSkip: Button
  private btnSpeed: Button

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add
      .container(0, 0)
      .setDepth(Depth.matchPlaybackControls)

    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: '0%+110',
      y: `50%`,
    })

    this.createButtons()
    this.addHotkeyListeners()

    return this
  }

  displayState(state: GameModel): void {
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

  private createButtons(): void {
    const x = 10
    const yDelta = 70

    const chrome = this.scene.add.image(0, 0, 'chrome-replayControls')
    this.container.add(chrome)

    this.btnRecap = new Buttons.Icon({
      name: 'Recap',
      within: this.container,
      hint: 'Watch replay',
      x,
      y: -yDelta,
      f: () => this.recapCallback(),
    })

    this.btnSkip = new Buttons.Icon({
      name: 'Skip',
      within: this.container,
      hint: 'Skip replay',
      x,
      y: -yDelta,
      f: () => this.skipCallback(),
    }).setVisible(false)

    this.addHotkeyHint([x, yDelta], 'R')

    this.btnSpeed = new Buttons.Icon({
      name: 'Speed',
      within: this.container,
      hint: 'Animation speed',
      x,
      y: yDelta,
      f: () => {
        const currentSpeed = UserSettings._get('animationSpeed')

        let newSpeed
        if (currentSpeed < 0.25) newSpeed = 0.25
        else if (currentSpeed < 0.5) newSpeed = 0.5
        else if (currentSpeed < 1) newSpeed = 1
        else if (currentSpeed < 2) newSpeed = 2
        else newSpeed = 0.1

        UserSettings._set('animationSpeed', newSpeed)

        this.scene.signalError(`YOUR SPEED: ${newSpeed * 10}x`)
      },
    })

    this.addHotkeyHint([x, -yDelta], 'E')
  }
}
