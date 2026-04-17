import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Depth, UserSettings } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'

export default class HistoryRegion extends Region {
  recapCallback: () => void

  private btnRecap: Button

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add
      .container(0, 0)
      .setDepth(Depth.matchPlaybackControls)

    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: '100%-225',
      y: '30%',
    })

    this.createButtons()
    this.addHotkeyListeners()

    return this
  }

  displayState(state: GameModel): void {
    if (!state.isRecap) {
      this.btnRecap.enable()
      this.btnRecap.setVisible(true)
    } else {
      this.btnRecap.disable()
      this.btnRecap.setVisible(false)
    }
  }

  private addHotkeyListeners() {
    this.scene.input.keyboard.on('keydown-R', () => {
      if (UserSettings._get('hotkeys') && this.btnRecap.enabled) {
        this.btnRecap.onClick()
      }
    })
  }

  private createButtons(): void {
    const chrome = this.scene.add.image(0, 0, 'chrome-replayControls')
    chrome.setVisible(false)
    this.container.add(chrome)

    this.btnRecap = new Buttons.Icon({
      name: 'Recap',
      within: this.container,
      hint: 'Watch replay',
      f: () => this.recapCallback(),
    })
    this.btnRecap.icon.setDisplaySize(55, 62)
  }
}
