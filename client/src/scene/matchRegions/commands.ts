import 'phaser'
import Button from '../../lib/buttons/button'
import Icons from '../../lib/buttons/icons'
import GameModel from '../../../../shared/state/gameModel'
import { Space, Depth, Flags, UserSettings } from '../../settings/settings'
import BaseScene from '../baseScene'
import Region from './baseRegion'
import { GameScene } from '../gameScene'
import { MechanicsSettings } from '../../../../shared/settings'

// Y of the buttons
const y = Space.pad * 2 + (Space.iconSize * 3) / 2

// During the round, shows Pass button, who has passed, and who has priority
export default class CommandsRegion extends Region {
  recapCallback: () => void
  skipCallback: () => void

  private btnRecap: Button
  private btnSkip: Button

  create(scene: GameScene): CommandsRegion {
    this.scene = scene
    const x = Flags.mobile
      ? Space.pad + Space.iconSize / 2
      : Space.windowWidth - Space.pad - Space.iconSize / 2
    const y = Flags.mobile
      ? Space.windowHeight / 2
      : Space.pad * 2 + (Space.iconSize * 3) / 2
    this.container = scene.add.container(x, y).setDepth(Depth.commands)

    // Add the background
    this.createRecap()
    this.createSkip()

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

  private createRecap(): void {
    // Recap button
    this.btnRecap = new Icons.Recap(this.container, 0, 0).setVisible(false)

    this.btnRecap.setOnClick(() => {
      this.recapCallback()
    })
  }

  private createSkip(): void {
    // Skip button
    this.btnSkip = new Icons.Skip(this.container, 0, 0).setVisible(false)

    this.btnSkip.setOnClick(() => {
      this.skipCallback()
    })
  }
}
