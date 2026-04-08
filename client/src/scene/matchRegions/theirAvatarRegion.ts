import 'phaser'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import GameModel from '../../../../shared/state/gameModel'
import { Depth, Space } from '../../settings/settings'
import AvatarRegionBase from './avatarRegionBase'
import { MatchScene } from '../matchScene'

const width = Space.avatarSize + Space.pad * 2
const height = 270

export default class TheirAvatarRegion extends AvatarRegionBase {
  btnInspire: Button
  btnNourish: Button
  btnSight: Button

  protected avatarCenterY(): number {
    return Space.avatarSize / 2 + Space.pad
  }

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(Depth.theirAvatar)

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

    this.txtUsername.setText(state.usernames[1])
  }

  // Show their avatar using the given emote
  emote(emoteNumber: number): void {
    this.avatar.doEmote(emoteNumber)
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
