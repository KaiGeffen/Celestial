import 'phaser'
import { CardImage } from '../../lib/cardImage'
import GameModel from '../../../../shared/state/gameModel'
import { Depth, Space, Style } from '../../settings/settings'
import { MatchScene } from '../matchScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'

// Slight hand fan for opponent cards (rotation only; base is π so they face the opponent).
const THEIR_HAND_FAN_MAX_RAD = (4 * Math.PI) / 180

export default class TheirBoardRegion extends Region {
  // Effect showing that they have priority
  priorityHighlight: Phaser.GameObjects.Video

  background: Phaser.GameObjects.Image

  /** Last state used to reposition their hand on resize (fan rotation). */
  private lastHandState: GameModel | null = null

  create(scene: MatchScene): this {
    this.scene = scene

    this.container = scene.add.container(0, 0).setDepth(Depth.theirHand)
    this.createBackground()

    return this
  }

  private theirHandFanRotation(i: number, n: number): number {
    if (n <= 1) {
      return Math.PI
    }
    const mid = (n - 1) / 2
    const delta = -((i - mid) / Math.max(mid, 1)) * THEIR_HAND_FAN_MAX_RAD
    return Math.PI + delta
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

    if (!state.mulligansComplete[1]) {
      this.deleteTemp()
      return
    }

    this.lastHandState = state

    // Their hand
    const handN = state.hand[1].length
    this.cards = []
    for (let i = 0; i < handN; i++) {
      const card = new CardImage(
        state.hand[1][i],
        this.container,
        false,
        true,
      ).setPosition(CardLocation.theirHand(state, i, this.container))

      card.container.setRotation(this.theirHandFanRotation(i, handN))

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
    this.background = this.scene.add
      .image(0, y, 'chrome-Hand')
      .setRotation(Math.PI)
      .setOrigin(1, 0)

    this.background.setScale(
      this.background.width >= Space.windowWidth
        ? 1
        : Space.windowWidth / this.background.width,
      1,
    )

    this.container.add(this.background)
  }

  onWindowResize(): void {
    this.background.setScale(
      this.background.width >= Space.windowWidth
        ? 1
        : Space.windowWidth / this.background.width,
      1,
    )

    this.background.setPosition(0, Space.todoHandOffset + Space.pad + 7)

    const st = this.lastHandState
    if (st && this.cards?.length && this.cards.length === st.hand[1].length) {
      const n = st.hand[1].length
      this.cards.forEach((c, i) => {
        c.setPosition(CardLocation.theirHand(st, i, this.container))
        c.container.setRotation(this.theirHandFanRotation(i, n))
      })
    }
  }
}
