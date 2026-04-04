import 'phaser'
import { CardImage } from '../../lib/cardImage'
import GameModel from '../../../../shared/state/gameModel'
import {
  Depth,
  Space,
  Time,
  UserSettings,
  Messages,
} from '../../settings/settings'
import Region from './baseRegion'
import CardLocation from './cardLocation'
import { MatchScene } from '../matchScene'
import { MechanicsSettings } from '../../../../shared/settings'
import { server } from '../../server'

// The y distance card moves up when hovered
const HOVER_OFFSET = Space.cardHeight / 2 + Space.padSmall

// When the hand is hovered, spread cards horizontally so they do not overlap.
// Extra gap vs stacked hand (`ourHand` uses ~cardWidth − 1): visibly farther apart when fanned.
const HAND_FAN_MIN_DX = Space.cardWidth - Space.pad
// Stacked `ourHand` uses `windowWidth - 1200` — too narrow for a fanned row; that clamp was
// overriding `HAND_FAN_MIN_DX` almost always. Fanned layout uses nearly full width.
const HAND_FAN_SCREEN_MARGIN = 80

export default class OurBoardRegion extends Region {
  // Function called when elements in this region are interacted with
  callback: (i: number) => boolean
  displayCostCallback: (cost: number) => void

  // Whether we have already clicked on a card to play it
  cardClicked: boolean

  // Whether hotkeys for the cards have been registered
  cardHotkeysRegistered = false

  // Index of the card from the last state that was being hovered, if any
  hoveredCard: number

  // Track which card is currently raised
  raisedCardIndex: number | null = null

  // Track whether shift is held
  isShiftHeld = false

  // Persistent deck rendering (stack of cardbacks)
  private deckCardbacks: CardImage[] = []
  private deckContainer: Phaser.GameObjects.Container

  // Persistent discard pile (face-up cards)
  private discardCards: CardImage[] = []
  private discardContainer: Phaser.GameObjects.Container

  /** Last state used to lay out the hand (fan + rest positions). */
  private lastHandState: GameModel | null = null

  background: Phaser.GameObjects.Image

  create(scene: MatchScene): this {
    this.scene = scene
    this.cards = []

    this.container = scene.add.container().setDepth(Depth.ourHand)
    this.scene.plugins.get('rexAnchor')['add'](this.container, {
      y: `100%`,
    })

    this.createBackground(scene)

    this.createDiscard()
    this.createDeck()

    return this
  }

  private addCardHotkeys() {
    const numberWords = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX']

    for (let i = 0; i < MechanicsSettings.HAND_CAP; i++) {
      // Remove existing listeners and add new ones
      this.scene.input.keyboard.removeListener(`keydown-${numberWords[i]}`)
      this.scene.input.keyboard.on(`keydown-${numberWords[i]}`, () => {
        if (UserSettings._get('hotkeys')) {
          if (this.cards[i] === undefined) {
            this.scene.signalError(`You don't have a card in slot ${i + 1}`)
          } else {
            this.cards[i].clickCallback()
          }
        }
      })
    }
  }

  // Set the callback / error message for when card is clicked
  private setCardOnClick(card: CardImage, state: GameModel, i: number) {
    // Set whether card shows up as playable
    if (state.cardCosts[i] > state.breath[0]) {
      card.setPlayable(false)
    }

    card.setOnClick(() => {
      // Check if there are any errors
      let msg
      if (state.winner !== null) {
        msg = 'The game is over.'
      } else if (!state.mulligansComplete[1]) {
        msg = 'Opponent still mulliganing.'
      } else if (state.isRecap) {
        msg = 'The story is resolving.'
      } else if (state.priority === 1) {
        msg = "It's not your turn."
      } else if (state.cardCosts[i] > state.breath[0]) {
        msg = 'Not enough breath.'
      } else if (!server.isOpen()) {
        msg = Messages.disconnectError
      }

      if (msg !== undefined) {
        this.scene.signalError(msg)
        return
      }

      // If no errors, play the card
      this.onCardPlay(i, card, this.cards, state)()
      card.doBurstEffect = false
    })
  }

  private createBackground(scene: Phaser.Scene): void {
    // 7 is the height of the shadow
    const y = -(Space.todoHandOffset + Space.pad + 7)
    this.background = this.scene.add.image(0, y, 'chrome-Hand').setOrigin(0)
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

    // NOTE: do not rotate the container; rotate each card instead.
  }

  onWindowResize(): void {
    this.background.setScale(
      this.background.width >= Space.windowWidth
        ? 1
        : Space.windowWidth / this.background.width,
      1,
    )

    this.background.setPosition(0, -(Space.todoHandOffset + Space.pad + 7))

    // Keep deck/discard stacks aligned after resize.
    for (let i = 0; i < this.deckCardbacks.length; i++) {
      this.deckCardbacks[i].setPosition(CardLocation.ourDeck(this.container, i))
      this.deckCardbacks[i].container.setScale(0.75)
      this.deckCardbacks[i].container.setRotation(-Math.PI / 32)
    }

    for (let i = 0; i < this.discardCards.length; i++) {
      this.discardCards[i].setPosition(
        CardLocation.ourDiscard(this.container, i),
      )
      this.discardCards[i].container.setScale(0.75)
      this.discardCards[i].container.setRotation(Math.PI / 32)
    }

    this.reflowHandAfterResize()
  }

  private createDeck(): void {
    // Make the deck stack a child of `this.container` so it renders:
    // above the hand background (added in createBackground), but below hand cards
    // (added later in displayState).
    this.deckContainer = this.scene.add.container()
    this.container.add(this.deckContainer)

    // Rotate the whole deck stack slightly for depth.
    // NOTE: do not rotate the container; rotate each card instead.

    this.deckCardbacks = []
  }

  /** Fanned hover layout: wider horizontal spacing only (no rotation / arc). */
  private ourHandFannedLayout(
    state: GameModel,
    i: number,
  ): { x: number; y: number } {
    const n = state.hand[0].length
    const maxWidth = Math.max(0, Space.windowWidth - HAND_FAN_SCREEN_MARGIN * 2)

    if (n <= 1) {
      return {
        x: Space.windowWidth / 2 - this.container.x,
        y: -HOVER_OFFSET,
      }
    }

    let dx = HAND_FAN_MIN_DX
    const totalWidth = dx * (n - 1)
    if (totalWidth > maxWidth) {
      dx = maxWidth / (n - 1)
    }
    const firstCardCenterX = Space.windowWidth / 2 - (dx * (n - 1)) / 2
    const x = firstCardCenterX + i * dx - this.container.x
    const y = -HOVER_OFFSET

    return { x, y }
  }

  private reflowHandAfterResize(): void {
    if (!this.lastHandState || !this.cards?.length) {
      return
    }
    const st = this.lastHandState
    if (this.isShiftHeld || this.raisedCardIndex !== null) {
      this.cards.forEach((c, idx) => {
        const { x, y } = this.ourHandFannedLayout(st, idx)
        c.setPosition([x, y])
        c.container.setRotation(0)
      })
    } else {
      this.cards.forEach((c, idx) => {
        c.setPosition(CardLocation.ourHand(st, idx, this.container))
        c.container.setRotation(0)
      })
    }
  }

  // Rename old onCardClick to onCardPlay
  private onCardPlay(
    i: number,
    card: CardImage,
    hand: CardImage[],
    state: GameModel,
  ): () => void {
    const nextStoryPosition = CardLocation.story(
      state,
      state.story.acts.length,
      this.container,
      0,
    )

    return () => {
      if (!this.callback(i)) return

      if (this.scene['paused']) {
        return
      }

      // Reset raised card tracking
      this.raisedCardIndex = null

      // Remove hover behavior
      card.removeOnHover()

      // Hide any hints
      this.scene.hint.hide()

      // If the whole hand was raised due to hover, lower the other cards when playing
      if (!this.isShiftHeld) {
        hand.forEach((other, idx) => {
          if (other !== card) {
            const [x, y] = CardLocation.ourHand(state, idx, this.container)
            this.scene.tweens.add({
              targets: other.container,
              x,
              y,
              rotation: 0,
              duration: Time.cardFocus,
              ease: 'Sine.easeOut',
            })
          }
        })
      }

      // Send card to story
      this.scene.tweens.add({
        targets: card.container,
        x: nextStoryPosition[0],
        y: nextStoryPosition[1],
        duration: Time.playCard(),
        ease: 'Sine.easeInOut',
        // Moves other cards in hand to fill the hole
        onStart: () => {
          setTimeout(() => {
            this.scene.hint.hide()

            // Fill in the hole where the card was
            for (let j = i + 1; j < hand.length; j++) {
              let adjustedCard = hand[j]
              this.scene.tweens.add({
                targets: adjustedCard.container,
                x: CardLocation.ourHand(state, j - 1, this.container)[0],
                duration: Time.playCard() - 10,
                ease: 'Sine.easeInOut',
              })
            }

            this.callback(i)
          }, 10)
        },
        onComplete: () => {
          this.scene.playSound('play')
          card.container.parentContainer.sendToBack(card.container)
        },
      })
    }
  }

  // Modify displayState to lower any raised card when state changes
  displayState(state: GameModel): void {
    this.deleteTemp()

    // Sync our discard pile to current state.
    // In this game model, this corresponds to `state.pile[0]`.
    const desiredDiscardCount = state.pile[0].length

    // Grow
    while (this.discardCards.length < desiredDiscardCount) {
      const card = state.pile[0][this.discardCards.length]
      const cardImg = new CardImage(card, this.discardContainer, false, true)
      this.discardCards.push(cardImg)
    }

    // Shrink
    while (this.discardCards.length > desiredDiscardCount) {
      const extra = this.discardCards.pop()
      extra?.destroy()
    }

    // Update content + positions.
    for (let i = 0; i < this.discardCards.length; i++) {
      // Set to the right image
      this.discardCards[i].setCard(state.pile[0][i])

      // Use CardLocation's discard position (handles per-depth staggering).
      this.discardCards[i].setPosition(
        CardLocation.ourDiscard(this.container, i),
      )
      this.discardCards[i].container.setScale(0.75)
      this.discardCards[i].container.setRotation(Math.PI / 32)
    }

    // Sync deck stack cardbacks to current deck size.
    // Deck is stored as Card[][] (card objects), so length is the count.
    const desiredDeckCount = state.deck[0]?.length ?? 0

    // Grow the deck
    while (this.deckCardbacks.length < desiredDeckCount) {
      const cardback = new CardImage(undefined, this.deckContainer, false, true)
      this.deckCardbacks.push(cardback)
    }

    // Shrink the stack
    while (this.deckCardbacks.length > desiredDeckCount) {
      const extra = this.deckCardbacks.pop()
      extra?.destroy()
    }

    for (let i = 0; i < this.deckCardbacks.length; i++) {
      // Use CardLocation's deck position (handles per-depth staggering).
      this.deckCardbacks[i].setPosition(CardLocation.ourDeck(this.container, i))
      this.deckCardbacks[i].container.setScale(0.75)
      this.deckCardbacks[i].container.setRotation(-Math.PI / 32)
    }

    // Until we have mulliganed, hide (Delete) all the cards in our hand
    if (!state.mulligansComplete[0]) {
      this.deleteTemp()
      return
    } else if (!this.cardHotkeysRegistered) {
      this.addCardHotkeys()
      this.cardHotkeysRegistered = true
    }

    this.lastHandState = state

    // Add each of the cards in our hand
    this.cards = []
    for (let i = 0; i < state.hand[0].length; i++) {
      let card = this.addCard(
        state.hand[0][i],
        CardLocation.ourHand(state, i, this.container),
      )
        .setCost(state.cardCosts[i])
        .moveToTopOnHover()

      const cost = state.cardCosts[i]
      card.setOnHover(
        this.onCardHover(card, cost, i),
        this.onCardExit(card, this.cards, i),
      )

      // Set whether the card shows as playable, and set its onclick
      card.setPlayable(state.cardCosts[i] <= state.breath[0])
      this.setCardOnClick(card, state, i)

      this.cards.push(card)
      this.temp.push(card)

      // Add hotkey hint text above the card
      let position = CardLocation.ourHand(state, i, this.container)
      position[1] -= Space.cardHeight / 2 + HOVER_OFFSET + 35
      const hotkeyText = this.addHotkeyHint(position, `${i + 1}`)
      this.temp.push(hotkeyText)

      // If shift is held, show the hotkey hint
      hotkeyText.setVisible(this.isShiftHeld)
    }

    // Shift or hover-active: fan out so cards do not overlap
    if (this.isShiftHeld || this.raisedCardIndex !== null) {
      this.cards.forEach((c, idx) => {
        const { x, y } = this.ourHandFannedLayout(state, idx)
        c.setPosition([x, y])
        c.container.setRotation(0)
      })
    }

    // Hover whichever card was being hovered last
    if (this.hoveredCard !== undefined) {
      let card = this.cards[this.hoveredCard]

      if (card !== undefined) {
        // Check that the mouse is still over the card's x
        const pointer = this.scene.input.activePointer
        const pointerOverCard = card.imageSubject
          .getBounds()
          .contains(pointer.x, pointer.y - HOVER_OFFSET)

        if (pointerOverCard) {
          card.imageSubject.emit('pointerover')
        }
      }
    }
  }

  // Modify onCardHover to not raise if shift is held
  private onCardHover(
    card: CardImage,
    cost: number,
    index: number,
  ): () => void {
    return () => {
      // Show the card's cost
      this.displayCostCallback(cost)

      const wasRaised = this.raisedCardIndex !== null
      this.raisedCardIndex = index

      // Only raise if shift is not held (shift already means "raise all")
      // When not shifted, fan the entire hand on first hover.
      if (!this.isShiftHeld && !wasRaised) {
        const st = this.lastHandState
        if (!st) {
          return
        }
        this.cards.forEach((c, idx) => {
          const { x, y } = this.ourHandFannedLayout(st, idx)
          this.scene.tweens.add({
            targets: c.container,
            x,
            y,
            rotation: 0,
            duration: Time.cardFocus,
            ease: 'Sine.easeOut',
          })
        })
      }
    }
  }

  // Modify onCardExit to not lower if shift is held
  private onCardExit(
    card: CardImage,
    cards: CardImage[],
    index: number,
  ): () => void {
    return () => {
      // Hide the cost
      this.displayCostCallback(0)

      const pointer = this.scene.input.activePointer
      const pointerOverAnyCard = cards.some((c) =>
        c.imageSubject.getBounds().contains(pointer.x, pointer.y),
      )

      // Only lower if the pointer left the whole hand
      if (!pointerOverAnyCard) {
        this.raisedCardIndex = null

        // Only lower if shift is not held (shift already means "raise all")
        if (!this.isShiftHeld) {
          const st = this.lastHandState
          if (!st) {
            return
          }
          cards.forEach((c, idx) => {
            const [x, y] = CardLocation.ourHand(st, idx, this.container)
            this.scene.tweens.add({
              targets: c.container,
              x,
              y,
              rotation: 0,
              duration: Time.cardFocus,
              ease: 'Sine.easeOut',
            })
          })
        }
      }
    }
  }

  // Set the callback for when a card in this region is clicked on
  setCardClickCallback(f: (x: number) => boolean): Region {
    this.callback = f
    return this
  }

  // Set the callback for showing how much breath a card costs
  setDisplayCostCallback(f: (cost: number) => void): void {
    this.displayCostCallback = f
  }

  // Add method to raise all cards
  raiseAllCards(): void {
    if (this.isShiftHeld) return // Don't raise if already raised
    this.isShiftHeld = true

    const st = this.lastHandState
    if (!st) {
      return
    }
    this.cards.forEach((card, idx) => {
      const { x, y } = this.ourHandFannedLayout(st, idx)
      this.scene.tweens.add({
        targets: card.container,
        x,
        y,
        rotation: 0,
        duration: Time.cardFocus,
        ease: 'Sine.easeOut',
      })
    })
  }

  // Add method to lower all cards
  lowerAllCards(): void {
    if (!this.isShiftHeld) return // Don't lower if already lowered
    this.isShiftHeld = false

    const st = this.lastHandState
    if (!st) {
      return
    }
    const shouldRemainFanned = this.raisedCardIndex !== null

    this.cards.forEach((card, idx) => {
      if (shouldRemainFanned) {
        const { x, y } = this.ourHandFannedLayout(st, idx)
        this.scene.tweens.add({
          targets: card.container,
          x,
          y,
          rotation: 0,
          duration: Time.cardFocus,
          ease: 'Sine.easeOut',
        })
      } else {
        const [x, y] = CardLocation.ourHand(st, idx, this.container)
        this.scene.tweens.add({
          targets: card.container,
          x,
          y,
          rotation: 0,
          duration: Time.cardFocus,
          ease: 'Sine.easeOut',
        })
      }
    })
  }

  // TUTORIAL
  tutorialSetHandVisibility(visible: boolean): void {
    this.cards.forEach((card) => {
      card.container.setVisible(visible)
    })
  }
}
