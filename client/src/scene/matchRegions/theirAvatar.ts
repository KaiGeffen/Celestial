import 'phaser'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import GameModel from '../../../../shared/state/gameModel'
import {
  Depth,
  Space,
  Style,
} from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'
import AvatarButton from '../../lib/buttons/avatar'

const width = Space.avatarSize + Space.pad * 2
const height = 270

export default class TheirAvatarRegion extends Region {
  btnInspire: Button
  btnNourish: Button
  btnSight: Button
  avatar: AvatarButton
  txtUsername: Phaser.GameObjects.Text
  txtUsernameSubtitle: Phaser.GameObjects.Text

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(Depth.theirAvatar)

    this.createBackground()
    this.createStatusDisplay()
    this.createAvatar()
    this.createUsernames()

    return this
  }

  displayState(state: GameModel): void {
    // Avatar
    this.avatar.setAvatar(state.cosmeticSets[1].avatar)
    this.avatar.setBorder(state.cosmeticSets[1].border)

    // Statuses
    this.btnInspire
      .setVisible(state.status[1].inspired !== 0)
      .setText(`${state.status[1].inspired}`)
    this.btnNourish
      .setVisible(state.status[1].nourish !== 0)
      .setText(`${state.status[1].nourish}`)
    this.btnSight
      .setVisible(state.status[1].vision !== 0)
      .setText(`${state.status[1].vision}`)

    // Usernames and subtitles
    this.txtUsername.setText(state.usernames[1])
    this.txtUsernameSubtitle.setText(state.subtitles[1])
  }

  // Show their avatar using the given emote
  emote(emoteNumber: number): void {
    this.avatar.doEmote(emoteNumber)
  }

  private createUsernames(): void {
    const x = this.avatar.icon.x
    const y0 = this.avatar.icon.y + this.avatar.icon.height / 2 + 5

    this.txtUsername = this.scene.add
      .text(x, y0, '', Style.username)
      .setOrigin(0.5, 0)
    this.txtUsernameSubtitle = this.scene.add
      .text(x, y0 + 16 + 5, '', Style.usernameElo)
      .setOrigin(0.5, 0)

    this.container.add([this.txtUsername, this.txtUsernameSubtitle])
  }

  private createBackground(): void {
    const background = this.scene.add
      .image(-1, -1, 'chrome-Avatar')
      .setOrigin(0, 1)
      .setScale(1, -1)
    this.container.add(background)
  }

  private createAvatar(): void {
    const x = width / 2
    const y = Space.avatarSize / 2 + Space.pad
    this.avatar = new Buttons.Avatar({
      within: this.container,
      x,
      y,
    })
  }

  private createStatusDisplay(): void {
    const y = height + Space.pad + 50 / 2
    this.btnInspire = new Buttons.Keywords.Inspire(
      this.container,
      width / 2 - 55,
      y,
    )
    this.btnNourish = new Buttons.Keywords.Nourish(this.container, width / 2, y)
    this.btnSight = new Buttons.Keywords.Sight(
      this.container,
      width / 2 + 55,
      y,
    )
  }

  setEmoteCallback(fEmote: () => void): void {
    this.avatar.setOnClick(fEmote, false, false)
  }
}
