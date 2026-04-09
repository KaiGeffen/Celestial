import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import { Depth, Space } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

const ICON_SPREAD = 90
/** Pixels below top / above bottom edge (matches “0%+100” / “100%-100” roughly). */
const TOP_OFFSET = 205
const BOTTOM_OFFSET = 205

/**
 * Inspire / Nourish / Sight for both players: centered horizontally, anchored near top and bottom.
 */
export default class StatusRegion extends Region {
  private ourRow: Phaser.GameObjects.Container
  private theirRow: Phaser.GameObjects.Container

  private btnOurInspire: Button
  private btnOurNourish: Button
  private btnOurSight: Button
  private btnTheirInspire: Button
  private btnTheirNourish: Button
  private btnTheirSight: Button

  create(scene: MatchScene): this {
    this.scene = scene

    this.container = scene.add.container(0, 0).setDepth(Depth.matchStatus)

    this.theirRow = scene.add.container(0, 0)
    this.ourRow = scene.add.container(0, 0)
    this.container.add([this.theirRow, this.ourRow])

    scene.plugins.get('rexAnchor')['add'](this.theirRow, {
      x: `50%`,
      y: `0%+${TOP_OFFSET}`,
    })
    scene.plugins.get('rexAnchor')['add'](this.ourRow, {
      x: `50%`,
      y: `100%-${BOTTOM_OFFSET}`,
    })

    this.btnOurInspire = new Buttons.Keywords.Inspire(
      this.ourRow,
      -ICON_SPREAD,
      0,
    )
    this.btnOurNourish = new Buttons.Keywords.Nourish(this.ourRow, 0, 0)
    this.btnOurSight = new Buttons.Keywords.Sight(this.ourRow, ICON_SPREAD, 0)

    this.btnTheirInspire = new Buttons.Keywords.Inspire(
      this.theirRow,
      -ICON_SPREAD,
      0,
      '',
      () => {},
      true,
    )
    this.btnTheirNourish = new Buttons.Keywords.Nourish(
      this.theirRow,
      0,
      0,
      '',
      () => {},
      true,
    )
    this.btnTheirSight = new Buttons.Keywords.Sight(
      this.theirRow,
      ICON_SPREAD,
      0,
    )

    return this
  }

  displayState(state: GameModel): void {
    this.btnOurInspire
      .setVisible(state.status[0].inspired !== 0)
      .setText(`${state.status[0].inspired}`)
    this.btnOurNourish
      .setVisible(state.status[0].nourish !== 0)
      .setText(`${state.status[0].nourish}`)
    this.btnOurSight
      .setVisible(state.status[0].vision !== 0)
      .setText(`${state.status[0].vision}`)

    this.btnTheirInspire
      .setVisible(state.status[1].inspired !== 0)
      .setText(`${state.status[1].inspired}`)
    this.btnTheirNourish
      .setVisible(state.status[1].nourish !== 0)
      .setText(`${state.status[1].nourish}`)
    this.btnTheirSight
      .setVisible(state.status[1].vision !== 0)
      .setText(`${state.status[1].vision}`)
  }
}
