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

// Y of the buttons
const width = Space.iconSize * 2 + Space.pad * 3
const height = 120

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

    this.createBackground()
    this.createRecap()
    this.createSkip()
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

  private createRecap(): void {
    const x = Space.pad + Space.iconSize / 2
    const y = Space.pad + Space.iconSize / 2

    // Recap button
    this.btnRecap = new Icons.Recap(this.container, x, y, () =>
      this.recapCallback(),
    ).setVisible(false)
  }

  private createSkip(): void {
    const x = Space.pad + Space.iconSize / 2
    const y = Space.pad + Space.iconSize / 2

    // Skip button
    this.btnSkip = new Icons.Skip(this.container, x, y, () =>
      this.skipCallback(),
    ).setVisible(false)
  }

  private createWins(): void {
    // Create a vertical sizer
    const winsSizer = new Sizer(this.scene, {
      x: width / 2,
      y: Space.iconSize + Space.pad * 2 + 15,
      orientation: 'vertical',
      space: { item: 4 },
    })

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
      .image(width / 2, height, 'icon-Relic')
      .setRotation(Math.PI)
      .setOrigin(0.5, 1)
    this.container.add(this.relic)
  }
}
