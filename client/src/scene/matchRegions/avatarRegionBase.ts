import 'phaser'
import { Style } from '../../settings/settings'
import Region from './baseRegion'
import AvatarButton from '../../lib/buttons/avatar'

/** Shared avatar chrome: nameplate behind the player name under the portrait. */
export default abstract class AvatarRegionBase extends Region {
  avatar: AvatarButton
  txtUsername: Phaser.GameObjects.Text

  protected addAvatarPortraitShadow(angle = 45): void {
    this.avatar.addPortraitShadow(angle)
  }

  protected createUsernames(): void {
    const x = this.avatar.icon.x
    const y0 = this.avatar.icon.y + this.avatar.icon.height / 2 + 5

    const nameplate = this.scene.add.image(x, y0 + 10, 'chrome-nameplate')
    this.container.add(nameplate)

    this.txtUsername = this.scene.add
      .text(x, y0, '', Style.username)
      .setOrigin(0.5, 0)

    this.container.add(this.txtUsername)
  }
}
