import 'phaser'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import GameModel from '../../../../shared/state/gameModel'
import { Color, Depth, Space, Style } from '../../settings/settings'
import Region from './baseRegion'
import { GameScene } from '../gameScene'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'

const width = 200
const height = 250

export default class OurAvatarRegion extends Region {
  btnInspire: Button
  btnNourish: Button
  btnSight: Button
  avatar: Button

  create(scene: GameScene): this {
    this.scene = scene
    this.container = scene.add
      .container(0, Space.windowHeight - height)
      .setDepth(Depth.ourAvatar)

    this.createBackground(scene)
    this.createStatusDisplay()
    this.createAvatar()

    return this
  }

  displayState(state: GameModel): void {
    // Avatar
    this.avatar.setQuality({ num: state.avatars[0] })

    // Statuses
    let amts = [0, 0, 0, 0]
    state.status[0].forEach((status) => {
      amts[status]++
    })

    const amtInspire = amts[1]
    const amtNourish = amts[2] - amts[3]

    this.btnInspire.setVisible(amtInspire !== 0).setText(`${amtInspire}`)
    this.btnNourish.setVisible(amtNourish !== 0).setText(`${amtNourish}`)
    this.btnSight
      .setVisible(state.vision[0] !== 0)
      .setText(`${state.vision[0]}`)
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

  private createBackground(scene: Phaser.Scene): void {
    const background = scene.add
      .rectangle(0, 0, width, height, Color.backgroundDark)
      .setOrigin(0)
    this.container.add(background)
  }

  private createAvatar(): void {
    this.avatar = new Buttons.Avatar(this.container, width / 2, 140).setQuality(
      {
        emotive: true,
      },
    )
  }

  private createStatusDisplay(): void {
    this.btnInspire = new Buttons.Keywords.Inspire(
      this.container,
      width / 2 - 55,
      40,
    )
    this.btnNourish = new Buttons.Keywords.Nourish(
      this.container,
      width / 2,
      40,
    )
    this.btnSight = new Buttons.Keywords.Sight(
      this.container,
      width / 2 + 55,
      40,
    )
  }

  setEmoteCallback(fEmote: () => void): void {
    this.avatar.setOnClick(fEmote, false, false)
  }
}
