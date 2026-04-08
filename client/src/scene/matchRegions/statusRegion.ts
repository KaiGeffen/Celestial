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

/** Set false to hide Inspire/Sight when 0 again (Nourish still follows its own rules). */
const ALWAYS_SHOW_STATUS_ICONS = true

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
    )
    this.btnTheirNourish = new Buttons.Keywords.Nourish(this.theirRow, 0, 0)
    this.btnTheirSight = new Buttons.Keywords.Sight(
      this.theirRow,
      ICON_SPREAD,
      0,
    )

    return this
  }

  displayState(state: GameModel): void {
    const show = (v: number) => ALWAYS_SHOW_STATUS_ICONS || v !== 0

    this.btnOurInspire
      .setVisible(show(state.status[0].inspired))
      .setText(`${state.status[0].inspired}`)
    this.btnOurNourish
      .setVisible(show(state.status[0].nourish))
      .setText(`${state.status[0].nourish}`)
    this.btnOurSight
      .setVisible(show(state.status[0].vision))
      .setText(`${state.status[0].vision}`)

    this.btnTheirInspire
      .setVisible(show(state.status[1].inspired))
      .setText(`${state.status[1].inspired}`)
    this.btnTheirNourish
      .setVisible(show(state.status[1].nourish))
      .setText(`${state.status[1].nourish}`)
    this.btnTheirSight
      .setVisible(show(state.status[1].vision))
      .setText(`${state.status[1].vision}`)
  }
}
