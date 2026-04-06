import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Space, Depth, Style } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'

// Opponent score column (wins, relic) — top right
export default class TheirScoreRegion extends Region {
  txtWins: Phaser.GameObjects.Text

  // Relic icon
  relic: Phaser.GameObjects.Image

  private width = Space.iconSize * 2 + Space.pad * 3
  private height = Space.todoHandOffset + Space.pad

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(Depth.theirScore)

    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `100%-${this.width}`,
    })

    this.createWins()
    this.createRelic()

    return this
  }

  displayState(state: GameModel): void {
    this.txtWins.setText(`${state.wins[1]}/5`)
    this.relic.setFrame(state.wins[1])
  }

  private createWins(): void {
    const winsSizer = new Sizer(this.scene, {
      x: this.width / 2,
      y: this.height,
      orientation: 'vertical',
      space: { bottom: Space.padSmall, item: 4 },
    }).setOrigin(0.5, 1)

    this.txtWins = this.scene.add.text(0, 0, '0/5', Style.todoScore)
    const hintWins = this.scene.add.text(0, 0, 'Wins', Style.todoSubtext)

    winsSizer
      .add(this.txtWins, { align: 'center' })
      .add(hintWins, { align: 'center' })
      .layout()

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
