import 'phaser'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import GameModel from '../../../../shared/state/gameModel'
import { Depth, Space } from '../../settings/settings'
import AvatarRegionBase from './avatarRegionBase'
import { MatchScene } from '../matchScene'

const width = Space.avatarSize + Space.pad * 2
const height = 270

export default class OurAvatarRegion extends AvatarRegionBase {
  btnInspire: Button
  btnNourish: Button
  btnSight: Button

  protected avatarCenterY(): number {
    return Space.pad * 2 + Space.avatarSize / 2
  }

  protected avatarEmotive(): boolean {
    return true
  }

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container().setDepth(Depth.ourAvatar)
    this.scene.plugins.get('rexAnchor')['add'](this.container, {
      y: `100%-${height}`,
    })

    this.createBackground()
    this.createStatusDisplay()
    this.createAvatar()
    this.createUsernames()

    return this
  }

  displayState(state: GameModel): void {
    // Avatar
    this.avatar.setAvatar(state.cosmeticSets[0].avatar)
    this.avatar.setBorder(state.cosmeticSets[0].border)

    // Statuses
    this.btnInspire
      .setVisible(state.status[0].inspired !== 0)
      .setText(`${state.status[0].inspired}`)
    this.btnNourish
      .setVisible(state.status[0].nourish !== 0)
      .setText(`${state.status[0].nourish}`)
    this.btnSight
      .setVisible(state.status[0].vision !== 0)
      .setText(`${state.status[0].vision}`)

    this.txtUsername.setText(state.usernames[0])
  }

  setEmoteCallback(fEmote: () => void): void {
    this.avatar.setOnClick(fEmote, false, false)
  }

  private createBackground(): void {
    const background = this.scene.add.image(0, -7, 'chrome-Avatar').setOrigin(0)
    this.container.add(background)
  }

  private createStatusDisplay(): void {
    const y = -(Space.pad + 50 / 2)
    this.btnInspire = new Buttons.Keywords.Inspire(
      this.container,
      width / 2 - 55,
      y,
    ).setVisible(false)
    this.btnNourish = new Buttons.Keywords.Nourish(this.container, width / 2, y)
    this.btnSight = new Buttons.Keywords.Sight(
      this.container,
      width / 2 + 55,
      y,
    ).setVisible(false)
  }
}
