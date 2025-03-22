import 'phaser'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import GameModel from '../../../../shared/state/gameModel'
import {
  Depth,
  Space,
  Style,
  Time,
  Flags,
  UserSettings,
  Color,
} from '../../settings/settings'
import Region from './baseRegion'
import { GameScene } from '../gameScene'

const width = Space.avatarSize + Space.pad * 2
const height = 250

export default class TheirAvatarRegion extends Region {
  btnInspire: Button
  btnNourish: Button
  btnSight: Button

  avatar: Button

  create(scene: GameScene): this {
    this.scene = scene
    this.container = scene.add.container().setDepth(Depth.theirAvatar)

    this.createBackground(scene)
    this.createStatusDisplay()
    this.createAvatar()

    return this
  }

  displayState(state: GameModel): void {
    // Avatar
    this.avatar.setQuality({ num: state.avatars[1] })

    // Statuses
    // Specific to 4 TODO
    let amts = [0, 0, 0, 0]
    const length = 4

    state.status[0].forEach(function (status, index, array) {
      amts[status]++
    })

    const amtInspire = amts[1]
    const amtNourish = amts[2] - amts[3]

    this.btnInspire.setVisible(amtInspire !== 0).setText(`${amtInspire}`)
    this.btnNourish.setVisible(amtNourish !== 0).setText(`${amtNourish}`)
    this.btnSight
      .setVisible(state.vision[1] !== 0)
      .setText(`${state.vision[1]}`)
  }

  showUsername(username: string): void {
    this.container.add(
      this.scene.add
        .text(
          21 + Space.avatarSize / 2,
          11 + Space.avatarSize,
          username,
          Style.username,
        )
        .setOrigin(0.5, 0),
    )
  }

  // Show their avatar using the given emote
  emote(emoteNumber: number): void {
    this.avatar.setQuality({ emoting: emoteNumber })
  }

  private createBackground(scene: Phaser.Scene): void {
    const background = scene.add
      .rectangle(0, 0, width, height, Color.backgroundDark)
      .setOrigin(0)

    this.container.add(background)
  }

  private createAvatar(): void {
    this.avatar = new Buttons.Avatar(this.container, width / 2, 80)
  }

  private createStatusDisplay(): void {
    this.btnInspire = new Buttons.Keywords.Inspire(
      this.container,
      width / 2 - 55,
      210,
    )
    this.btnNourish = new Buttons.Keywords.Nourish(
      this.container,
      width / 2,
      210,
    )
    this.btnSight = new Buttons.Keywords.Sight(
      this.container,
      width / 2 + 55,
      210,
    )
  }

  setEmoteCallback(fEmote: () => void): void {
    this.avatar.setOnClick(fEmote, false, false)
  }
}
