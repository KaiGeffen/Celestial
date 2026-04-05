import 'phaser'
import { CardImage } from '../../lib/cardImage'
import GameModel from '../../../../shared/state/gameModel'
import { BBStyle, Space, UserSettings } from '../../settings/settings'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import { MatchScene } from '../matchScene'

// Count badges: nudge away from screen center (deck left, discard right) and a bit further in Y.
const STACK_ICON_OUTWARD_X = 52
const STACK_ICON_EXTRA_Y = 12

/**
 * Shared deck + discard pile rendering for one player, parented under the
 * hand board container (between chrome and hand cards), plus count icons on
 * top of each stack (opens overlays; same hotkeys as the old avatar chrome).
 */
export default abstract class PlayerStacksRegion {
  scene: MatchScene

  protected layoutParent!: Phaser.GameObjects.Container

  protected deckCardbacks: CardImage[] = []
  protected deckContainer!: Phaser.GameObjects.Container

  protected discardCards: CardImage[] = []
  protected discardContainer!: Phaser.GameObjects.Container

  /** Deck/discard count badges (same draw order as other stack children — below the hand). */
  protected stackIconsContainer!: Phaser.GameObjects.Container

  btnDeck!: Button
  btnDiscard!: Button

  private hotkeyHints: Phaser.GameObjects.GameObject[] = []

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

  /** Single-letter hotkey label (e.g. Q / A) for deck overlay. */
  protected abstract deckHotkeyLetter(): string

  /** Single-letter hotkey label (e.g. W / S) for discard overlay. */
  protected abstract discardHotkeyLetter(): string

  /** Count icons sit above/below the card center depending on which edge of the table. */
  private stackIconYDeltaFromCardCenter(): number {
    return this.ownerIndex() === 0
      ? -Space.cardHeight / 2 - STACK_ICON_EXTRA_Y
      : Space.cardHeight / 2 + STACK_ICON_EXTRA_Y
  }

  /** Deck badge: left stack — shift farther from center (negative x). */
  private stackIconDeckPosition(loc: [number, number]): [number, number] {
    const dy = this.stackIconYDeltaFromCardCenter()
    return [loc[0] - STACK_ICON_OUTWARD_X, loc[1] + dy]
  }

  /** Discard badge: right stack — shift farther from center (positive x). */
  private stackIconDiscardPosition(loc: [number, number]): [number, number] {
    const dy = this.stackIconYDeltaFromCardCenter()
    return [loc[0] + STACK_ICON_OUTWARD_X, loc[1] + dy]
  }

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

    this.stackIconsContainer = this.scene.add.container(0, 0)
    this.layoutParent.add(this.stackIconsContainer)

    const deckPos = this.stackIconDeckPosition(
      this.deckLocation(this.layoutParent, 0),
    )
    const discardPos = this.stackIconDiscardPosition(
      this.discardLocation(this.layoutParent, 0),
    )
    const o = this.ownerIndex()

    this.btnDeck = new Buttons.Stacks.Deck(
      this.stackIconsContainer,
      deckPos[0],
      deckPos[1],
      o,
    )
    this.btnDiscard = new Buttons.Stacks.Discard(
      this.stackIconsContainer,
      discardPos[0],
      discardPos[1],
      o,
    )

    this.addHotkeyHint(deckPos, this.deckHotkeyLetter())
    this.addHotkeyHint(discardPos, this.discardHotkeyLetter())

    this.registerStackHotkeys()

    return this
  }

  setOverlayCallbacks(fDeck: () => void, fDiscard: () => void): void {
    this.btnDeck.setOnClick(fDeck)
    this.btnDiscard.setOnClick(fDiscard)
  }

  setHotkeyHintVisible(show: boolean): void {
    this.hotkeyHints.forEach((hint) => {
      ;(hint as Phaser.GameObjects.Text).setVisible(show)
    })
  }

  private addHotkeyHint(position: [number, number], s: string): void {
    const hotkeyText = this.scene.add
      .rexBBCodeText(position[0], position[1], s, BBStyle.hotkeyHint)
      .setOrigin(0.5)
      .setVisible(false)

    this.stackIconsContainer.add(hotkeyText)
    this.hotkeyHints.push(hotkeyText)
  }

  private registerStackHotkeys(): void {
    const deckKey = `keydown-${this.deckHotkeyLetter()}`
    const discardKey = `keydown-${this.discardHotkeyLetter()}`

    this.scene.input.keyboard.on(deckKey, () => {
      if (UserSettings._get('hotkeys')) {
        this.btnDeck.onClick()
      }
    })
    this.scene.input.keyboard.on(discardKey, () => {
      if (UserSettings._get('hotkeys')) {
        this.btnDiscard.onClick()
      }
    })
  }

  private layoutStackIcons(): void {
    const deckPos = this.stackIconDeckPosition(
      this.deckLocation(this.layoutParent, 0),
    )
    const discardPos = this.stackIconDiscardPosition(
      this.discardLocation(this.layoutParent, 0),
    )
    this.btnDeck.setPosition(deckPos[0], deckPos[1])
    this.btnDiscard.setPosition(discardPos[0], discardPos[1])
    if (this.hotkeyHints[0]) {
      ;(this.hotkeyHints[0] as Phaser.GameObjects.Text).setPosition(
        deckPos[0],
        deckPos[1],
      )
    }
    if (this.hotkeyHints[1]) {
      ;(this.hotkeyHints[1] as Phaser.GameObjects.Text).setPosition(
        discardPos[0],
        discardPos[1],
      )
    }
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

    this.layoutStackIcons()
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

    this.btnDeck.setText(`${state.deck[o]?.length ?? 0}`)
    this.btnDiscard.setText(`${pileRow.length}`)
    this.layoutStackIcons()
  }
}
