import 'phaser'
import { CardImage } from '../../lib/cardImage'
import GameModel from '../../../../shared/state/gameModel'
import { MatchScene } from '../matchScene'

/**
 * Shared deck + discard pile rendering for one player, parented under the
 * hand board container (between chrome and hand cards).
 */
export default abstract class PlayerStacksRegion {
  scene: MatchScene

  protected layoutParent!: Phaser.GameObjects.Container

  protected deckCardbacks: CardImage[] = []
  protected deckContainer!: Phaser.GameObjects.Container

  protected discardCards: CardImage[] = []
  protected discardContainer!: Phaser.GameObjects.Container

  /** 0 = us, 1 = opponent */
  protected abstract ownerIndex(): 0 | 1

  protected abstract deckRotationRad(): number

  protected abstract discardRotationRad(): number

  protected abstract deckLocation(
    parent: Phaser.GameObjects.Container,
    i: number,
  ): [number, number]

  protected abstract discardLocation(
    parent: Phaser.GameObjects.Container,
    i: number,
  ): [number, number]

  create(
    scene: MatchScene,
    layoutParent: Phaser.GameObjects.Container,
  ): this {
    this.scene = scene
    this.layoutParent = layoutParent

    this.discardContainer = this.scene.add.container()
    this.layoutParent.add(this.discardContainer)

    this.deckContainer = this.scene.add.container()
    this.layoutParent.add(this.deckContainer)

    this.deckCardbacks = []

    return this
  }

  onWindowResize(): void {
    const deckR = this.deckRotationRad()
    const discardR = this.discardRotationRad()

    for (let i = 0; i < this.deckCardbacks.length; i++) {
      this.deckCardbacks[i].setPosition(
        this.deckLocation(this.layoutParent, i),
      )
      this.deckCardbacks[i].container.setScale(0.75)
      this.deckCardbacks[i].container.setRotation(deckR)
    }

    for (let i = 0; i < this.discardCards.length; i++) {
      this.discardCards[i].setPosition(
        this.discardLocation(this.layoutParent, i),
      )
      this.discardCards[i].container.setScale(0.75)
      this.discardCards[i].container.setRotation(discardR)
    }
  }

  displayState(state: GameModel): void {
    const o = this.ownerIndex()
    const pileRow = state.pile[o] ?? []
    const desiredDiscardCount = pileRow.length

    while (this.discardCards.length < desiredDiscardCount) {
      const card = pileRow[this.discardCards.length]
      const cardImg = new CardImage(card, this.discardContainer, false, true)
      this.discardCards.push(cardImg)
    }

    while (this.discardCards.length > desiredDiscardCount) {
      const extra = this.discardCards.pop()
      extra?.destroy()
    }

    const discardR = this.discardRotationRad()
    for (let i = 0; i < this.discardCards.length; i++) {
      this.discardCards[i].setCard(pileRow[i])
      this.discardCards[i].setPosition(
        this.discardLocation(this.layoutParent, i),
      )
      this.discardCards[i].container.setScale(0.75)
      this.discardCards[i].container.setRotation(discardR)
    }

    const desiredDeckCount = state.deck[o]?.length ?? 0

    while (this.deckCardbacks.length < desiredDeckCount) {
      const cardback = new CardImage(undefined, this.deckContainer, false, true)
      this.deckCardbacks.push(cardback)
    }

    while (this.deckCardbacks.length > desiredDeckCount) {
      const extra = this.deckCardbacks.pop()
      extra?.destroy()
    }

    const deckR = this.deckRotationRad()
    for (let i = 0; i < this.deckCardbacks.length; i++) {
      this.deckCardbacks[i].setPosition(
        this.deckLocation(this.layoutParent, i),
      )
      this.deckCardbacks[i].container.setScale(0.75)
      this.deckCardbacks[i].container.setRotation(deckR)
    }
  }
}
