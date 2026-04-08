import 'phaser'
import Buttons from '../../lib/buttons/buttons'
import { Depth, Space } from '../../settings/settings'
import AvatarRegionBase from './avatarRegionBase'
import { MatchScene } from '../matchScene'

const width = Space.avatarSize + Space.pad * 2
const height = 240

export default class OurAvatarRegion extends AvatarRegionBase {
  protected playerIndex(): 0 | 1 {
    return 0
  }

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

    this.createStatusDisplay()
    this.createAvatar()
    this.createUsernames()

    return this
  }

  setEmoteCallback(fEmote: () => void): void {
    this.avatar.setOnClick(fEmote, false, false)
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
