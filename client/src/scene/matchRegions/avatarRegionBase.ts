import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import AvatarButton from '../../lib/buttons/avatar'
import { Color, Space, Style } from '../../settings/settings'
import Region from './baseRegion'

const AVATAR_REGION_WIDTH = Space.avatarSize + Space.pad * 2

/** Shared match avatar UI: portrait + username. */
export default abstract class AvatarRegionBase extends Region {
  avatar: AvatarButton
  txtUsername: Phaser.GameObjects.Text
  btnInspire: Button
  btnNourish: Button
  btnSight: Button

  /** Player slot in shared state arrays (0 = us, 1 = them). */
  protected abstract playerIndex(): 0 | 1

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
    const usernameY = y0 + 10 + Space.padSmall

    // TODO Move to style file
    this.txtUsername = this.scene.add
      .text(x, usernameY, '', {
        fontFamily: Style.username.fontFamily,
        fontSize: '20px',
        color: Color.whiteS,
        stroke: Color.blackS,
        strokeThickness: 2,
      })
      .setOrigin(0.5)

    this.container.add(this.txtUsername)
  }

  displayState(state: GameModel): void {
    const i = this.playerIndex()
    this.avatar.setAvatar(state.cosmeticSets[i].avatar)
    this.avatar.setBorder(state.cosmeticSets[i].border)

    this.btnInspire
      .setVisible(state.status[i].inspired !== 0)
      .setText(`${state.status[i].inspired}`)
    this.btnNourish
      .setVisible(state.status[i].nourish !== 0)
      .setText(`${state.status[i].nourish}`)
    this.btnSight
      .setVisible(state.status[i].vision !== 0)
      .setText(`${state.status[i].vision}`)

    this.txtUsername.setText(state.usernames[i])
  }
}
