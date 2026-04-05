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

  // Persistent deck rendering (stack of cardbacks)
  private deckCardbacks: CardImage[] = []
  private deckContainer: Phaser.GameObjects.Container

  // Persistent discard pile (face-up cards)
  private discardCards: CardImage[] = []
  private discardContainer: Phaser.GameObjects.Container

  /** Last state used to reposition their hand on resize (fan rotation). */
  private lastHandState: GameModel | null = null

  create(scene: MatchScene): this {
    this.scene = scene

    this.container = scene.add.container(0, 0).setDepth(Depth.theirHand)
    this.createBackground()

    this.createDiscard()
    this.createDeck()

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

    // Opponent discard: `state.pile[1]`
    const desiredDiscardCount = state.pile[1]?.length ?? 0

    while (this.discardCards.length < desiredDiscardCount) {
      const card = state.pile[1][this.discardCards.length]
      const cardImg = new CardImage(card, this.discardContainer, false, true)
      this.discardCards.push(cardImg)
    }

    while (this.discardCards.length > desiredDiscardCount) {
      const extra = this.discardCards.pop()
      extra?.destroy()
    }

    for (let i = 0; i < this.discardCards.length; i++) {
      this.discardCards[i].setCard(state.pile[1][i])
      this.discardCards[i].setPosition(
        CardLocation.theirDiscard(this.container, i),
      )
      this.discardCards[i].container.setScale(0.75)
      // Small tilt plus 180° so their cards are upside-down relative to ours
      this.discardCards[i].container.setRotation(Math.PI - Math.PI / 32)
    }

    // Opponent deck: `state.deck[1]`
    const desiredDeckCount = state.deck[1]?.length ?? 0

    while (this.deckCardbacks.length < desiredDeckCount) {
      const cardback = new CardImage(undefined, this.deckContainer, false, true)
      this.deckCardbacks.push(cardback)
    }

    while (this.deckCardbacks.length > desiredDeckCount) {
      const extra = this.deckCardbacks.pop()
      extra?.destroy()
    }

    for (let i = 0; i < this.deckCardbacks.length; i++) {
      this.deckCardbacks[i].setPosition(
        CardLocation.theirDeck(this.container, i),
      )
      this.deckCardbacks[i].container.setScale(0.75)
      // Small tilt plus 180° so the top of the card faces them
      this.deckCardbacks[i].container.setRotation(Math.PI + Math.PI / 32)
    }

    if (!state.mulligansComplete[1]) {
      this.deleteTemp()
      return
    }

    this.lastHandState = state

    // Their hand
    const handN = state.hand[1].length
    this.cards = []
    for (let i = 0; i < handN; i++) {
      const card = this.addCard(
        state.hand[1][i],
        CardLocation.theirHand(state, i, this.container),
      ).moveToTopOnHover()

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

  private createDiscard(): void {
    this.discardContainer = this.scene.add.container()
    this.container.add(this.discardContainer)
  }

  private createDeck(): void {
    this.deckContainer = this.scene.add.container()
    this.container.add(this.deckContainer)

    this.deckCardbacks = []
  }

  onWindowResize(): void {
    this.background.setScale(
      this.background.width >= Space.windowWidth
        ? 1
        : Space.windowWidth / this.background.width,
      1,
    )

    this.background.setPosition(0, Space.todoHandOffset + Space.pad + 7)

    for (let i = 0; i < this.deckCardbacks.length; i++) {
      this.deckCardbacks[i].setPosition(
        CardLocation.theirDeck(this.container, i),
      )
      this.deckCardbacks[i].container.setScale(0.75)
      this.deckCardbacks[i].container.setRotation(Math.PI + Math.PI / 32)
    }

    for (let i = 0; i < this.discardCards.length; i++) {
      this.discardCards[i].setPosition(
        CardLocation.theirDiscard(this.container, i),
      )
      this.discardCards[i].container.setScale(0.75)
      this.discardCards[i].container.setRotation(Math.PI - Math.PI / 32)
    }

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
