import 'phaser'
import Buttons from '../../lib/buttons/buttons'
import AvatarButton from '../../lib/buttons/avatar'
import { Space, Style } from '../../settings/settings'
import Region from './baseRegion'

const AVATAR_REGION_WIDTH = Space.avatarSize + Space.pad * 2

/** Shared match avatar UI: portrait + nameplate + name. */
export default abstract class AvatarRegionBase extends Region {
  avatar: AvatarButton
  txtUsername: Phaser.GameObjects.Text

  protected createAvatar(): void {
    this.avatar = new Buttons.Avatar({
      within: this.container,
      x: AVATAR_REGION_WIDTH / 2,
      y: this.avatarCenterY(),
      emotive: this.avatarEmotive(),
    })
  }

  /** Vertical center of the portrait within this region's container. */
  protected abstract avatarCenterY(): number

  protected avatarEmotive(): boolean {
    return false
  }

  protected createUsernames(): void {
    const x = this.avatar.icon.x
    const y0 = this.avatar.icon.y + this.avatar.icon.height / 2
    const nameplateY = y0 + 10 + Space.padSmall * 2

    const nameplate = this.scene.add.image(x, nameplateY, 'chrome-nameplate')
    this.container.add(nameplate)

    this.txtUsername = this.scene.add
      .text(x, nameplateY, '', Style.username)
      .setOrigin(0.5)

    this.container.add(this.txtUsername)
  }
}
