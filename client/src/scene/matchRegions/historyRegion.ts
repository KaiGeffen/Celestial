import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Depth, UserSettings } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'

export default class HistoryRegion extends Region {
  recapCallback: () => void
  skipCallback: () => void

  private btnRecap: Button
  private btnSkip: Button

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add
      .container(0, 0)
      .setDepth(Depth.matchPlaybackControls)

    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: '100%-200',
      y: '50%',
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
  }

  private createButtons(): void {
    const x = 10
    const y = 190

    const chrome = this.scene.add.image(0, 0, 'chrome-replayControls')
    chrome.setVisible(false)
    this.container.add(chrome)

    this.btnRecap = new Buttons.Icon({
      name: 'Recap',
      within: this.container,
      hint: 'Watch replay',
      x,
      y,
      f: () => this.recapCallback(),
    })
    this.btnRecap.icon.setDisplaySize(156, 146)

    this.btnSkip = new Buttons.Icon({
      name: 'Skip',
      within: this.container,
      hint: 'Skip replay',
      x,
      y,
      f: () => this.skipCallback(),
    }).setVisible(false)
    this.btnSkip.icon.setDisplaySize(155, 150)
  }
}
