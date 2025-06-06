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
import { MatchScene } from '../matchScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'

export default class TheirBoardRegion extends Region {
  // Effect showing that they have priority
  priorityHighlight: Phaser.GameObjects.Video

  btnDeck: Button
  btnDiscard: Button

  create(scene: MatchScene): this {
    this.scene = scene

    this.container = scene.add.container(0, 0).setDepth(Depth.theirHand)
    this.createBackground()

    return this
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

    this.cards = []
    for (let i = 0; i < state.hand[1].length; i++) {
      let card = this.addCard(
        state.hand[1][i],
        CardLocation.theirHand(state, i, this.container),
      ).moveToTopOnHover()

      this.cards.push(card)
      this.temp.push(card)
    }
  }

  showUsername(username: string): void {
    this.container.add(
      this.scene.add
        .text(
          21 + Space.avatarSize / 2,
          14 + Space.avatarSize,
          username,
          Style.username,
        )
        .setOrigin(0.5, 0),
    )
  }

  private createBackground(): void {
    // NOTE 7 is the height of the shadow
    const y = Space.todoHandOffset + Space.pad + 7
    const background = this.scene.add
      .image(0, y, 'chrome-Hand')
      .setRotation(Math.PI)
      .setOrigin(1, 0)

    background.setScale(
      background.width >= Space.windowWidth
        ? 1
        : Space.windowWidth / background.width,
      1,
    )

    this.container.add(background)
  }
}
