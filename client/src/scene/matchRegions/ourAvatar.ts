import 'phaser'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import { CardImage } from '../../lib/cardImage'
import GameModel from '../../../../shared/state/gameModel'
import { Depth, Space, Style } from '../../settings/settings'
import Region from './baseRegion'
import { GameScene } from '../gameScene'

export default class OurAvatarRegion extends Region {
  // Function called when elements in this region are interacted with
  callback: (i: number) => void
  displayCostCallback: (cost: number) => void

  priority: Phaser.GameObjects.Image

  btnInspire: Button
  btnNourish: Button
  btnSight: Button

  // Avatar image
  btnAvatar: Button

  create(scene: GameScene, avatarId: number): OurAvatarRegion {
    this.scene = scene

    this.container = scene.add
      .container(0, Space.windowHeight - Space.handHeight)
      .setDepth(Depth.ourHand)

    // Visual effect that highlights when we have priority
    this.createPriority()

    // Create the status visuals
    this.createStatusDisplay()

    // Create our avatar
    this.createAvatar(avatarId)

    // TODO Temp
    this.showUsername('Test Man (1200)')

    return this
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

    // Priority
    this.priority.setVisible(!state.isRecap && state.priority === 0)

    // Statuses
    this.displayStatuses(state)
  }

  showUsername(username: string): void {
    this.container.add(
      this.scene.add.text(25, 180, username, Style.username).setOrigin(0),
    )
  }

  private createPriority(): void {
    this.priority = this.scene.add
      .image(0, Space.handHeight, 'chrome-BottomPriority')
      .setVisible(false)
      .setOrigin(0, 1)

    this.priority.setDisplaySize(Space.windowWidth, this.priority.height)
    this.container.add(this.priority)
  }

  private createAvatar(avatarId: number): void {
    this.btnAvatar = new Buttons.Avatar(this.container, 25, 0, avatarId)
      .setOrigin(0)
      .setQuality({ emotive: true })
    this.btnAvatar.icon.setDisplaySize(160, 160)
  }

  private createStatusDisplay(): void {
    let x = 245
    const y0 = 25
    const dy = 60

    this.btnInspire = new Buttons.Keywords.Inspire(
      this.container,
      x,
      y0,
    ).setVisible(false)
    this.btnNourish = new Buttons.Keywords.Nourish(
      this.container,
      x,
      y0 + dy,
    ).setVisible(false)
    this.btnSight = new Buttons.Keywords.Sight(
      this.container,
      x,
      y0 + dy * 2,
    ).setVisible(false)
  }

  setEmoteCallback(fEmote: () => void): void {
    this.btnAvatar.setOnClick(fEmote, false, false)
  }

  private displayStatuses(state: GameModel): void {
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
      .setVisible(state.vision[0] !== 0)
      .setText(`${state.vision[0]}`)
  }
}
