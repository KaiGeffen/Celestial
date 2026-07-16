import 'phaser'
import { CardImage } from '../../lib/cardImage'
import Card from '@shared/state/card'
import GameModel from '@shared/state/gameModel'
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
import { MechanicsSettings } from '@shared/settings'
import { server } from '../../server'
import { SHRUNKEN_CARD_SCALE } from './matchRegionSettings'

// The y distance card moves up when hovered
const HOVER_OFFSET = Space.cardHeight / 2 + Space.padSmall

// When the hand is hovered, spread cards horizontally so they do not overlap.
// Extra gap vs stacked hand (`ourHand` uses ~cardWidth − 1): visibly farther apart when fanned.
const HAND_FAN_MIN_DX = Space.cardWidth - Space.pad
// Stacked `ourHand` uses `windowWidth - 1200` — too narrow for a fanned row; that clamp was
// overriding `HAND_FAN_MIN_DX` almost always. Fanned layout uses nearly full width.
const HAND_FAN_SCREEN_MARGIN = 80

// Rest hand: slight rotation fan only (same curve as `theirBoard`, upright: base 0).
// Hovered hand: flat rotation 0 + `ourHandFannedLayout` spread.
const OUR_HAND_REST_FAN_MAX_RAD = (4 * Math.PI) / 180

// Rest hand only: center cards sit slightly higher (vertical arc). Fanned /
// hover spread is one shared height — no Y arc so the row reads level.
const OUR_HAND_REST_ARC_LIFT_PX = 14

export default class OurBoardRegion extends Region {
  displayCostCallback: (cost: number) => void

  // Index of the card the player has staged to play (animated to the story but
  // not yet sent to the server), or null. Confirmed via the Play button.
  stagedCardNum: number | null = null

  // Notified with the staged index (or null when unstaged) so the scene can
  // switch the Pass button to a Play button and back.
  private onStageChanged?: (stagedCardNum: number | null) => void

  // Whether we have already clicked on a card to play it
  cardClicked: boolean

  // Whether hotkeys for the cards have been registered
  cardHotkeysRegistered = false

  // Index of the card from the last state that was being hovered, if any
  hoveredCard: number

  // Track which card is currently raised
  raisedCardIndex: number | null = null

  /** Last state used to lay out the hand (fan + rest positions). */
  private lastHandState: GameModel | null = null

  /** Card animating hand→story; hand-wide tweens must not move it (see `onCardExit`). */
  private cardTweeningToStory: CardImage | null = null

  /**
   * Hand cards live here, not directly in the region container. The deck /
   * discard stacks (StacksRegionBase) are parented into the same region
   * container, and card hover reordering (`moveToTopOnHover`) reorders a card's
   * parent — scoping the hand to its own container keeps that reorder from
   * scrambling the stacks (e.g. deck cardbacks jumping above their count badge).
   */
  private handContainer: Phaser.GameObjects.Container

  create(scene: MatchScene): this {
    this.scene = scene
    this.cards = []

    this.container = scene.add.container().setDepth(Depth.ourHand)
    this.scene.plugins.get('rexAnchor')['add'](this.container, {
      y: `100%`,
    })

    this.handContainer = scene.add.container()
    this.container.add(this.handContainer)

    return this
  }

  /** Hand cards go in `handContainer` so hover reordering stays scoped to them. */
  override addCard(
    card: Card,
    position: [number, number] = [0, 0],
    cardback = 0,
  ): CardImage {
    return new CardImage(
      card,
      this.handContainer,
      true,
      true,
      cardback,
    ).setPosition(position)
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
      } else if (this.scene.paused) {
        msg = 'Click Next to continue.'
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

      // Two-step play: if a card is already staged, clicking it again cancels,
      // and clicking a different card stages that one instead.
      if (this.stagedCardNum !== null) {
        if (this.stagedCardNum === i) {
          this.cancelStagedPlay()
        } else {
          this.reselectStagedPlay(i)
        }
        return
      }

      // Stage the card: animates to the story; the Play button confirms it.
      this.onCardPlay(i, card, this.cards, state)()

      // Stop the card from doing a further on-click visual effect
      card.doBurstEffect = false
    })
  }

  onWindowResize(): void {
    this.reflowHandAfterResize()
  }

  /**
   * Rest-only vertical arc: indices nearer the hand center sit higher (smaller y).
   */
  private ourHandArcYOffset(i: number, arcN: number): number {
    if (arcN <= 1) {
      return 0
    }
    const mid = (arcN - 1) / 2
    const t = Math.abs(i - mid) / Math.max(mid, 1)
    // t=0 at center → lift up; t=1 at edges → no lift
    return -OUR_HAND_REST_ARC_LIFT_PX * (1 - t * t)
  }

  /** Rest hand position: `ourHand` plus vertical arc. */
  private ourHandRestPosition(
    state: GameModel,
    i: number,
    /** Hand size for horizontal spacing and arc (defaults to current state). */
    arcN?: number,
  ): [number, number] {
    const n = arcN ?? state.hand[0].length
    const [x, y] = CardLocation.ourHand(state, i, this.container, n)
    return [x, y + this.ourHandArcYOffset(i, n)]
  }

  /** Fanned hover / shift-raise: wide horizontal spacing, flat shared Y. */
  private ourHandFannedLayout(
    state: GameModel,
    i: number,
  ): { x: number; y: number } {
    const n = state.hand[0].length
    const maxWidth = Math.max(
      0,
      Math.min(
        Space.windowWidth - 600,
        Space.windowWidth - HAND_FAN_SCREEN_MARGIN * 2,
      ),
    )

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

  /** Matches `theirHandFanRotation` shape with π removed (our cards face the player). */
  private ourHandRestFanRotation(i: number, n: number): number {
    if (n <= 1) {
      return 0
    }
    const mid = (n - 1) / 2
    const delta = ((i - mid) / Math.max(mid, 1)) * OUR_HAND_REST_FAN_MAX_RAD
    return delta
  }

  private reflowHandAfterResize(): void {
    if (!this.lastHandState || !this.cards?.length) {
      return
    }
    const st = this.lastHandState
    if (this.raisedCardIndex !== null) {
      this.cards.forEach((c, idx) => {
        if (c === this.cardTweeningToStory) return
        const { x, y } = this.ourHandFannedLayout(st, idx)
        c.setPosition([x, y])
        c.container.setRotation(0)
      })
    } else {
      const n = st.hand[0].length
      this.cards.forEach((c, idx) => {
        if (c === this.cardTweeningToStory) return
        c.setPosition(this.ourHandRestPosition(st, idx))
        c.container.setRotation(this.ourHandRestFanRotation(idx, n))
      })
    }
  }

  /** After a play, grey out remaining cards that exceed breath minus the played card's cost (until server state arrives). */
  private applyOptimisticBreathPlayability(
    state: GameModel,
    playedIndex: number,
    hand: CardImage[],
  ): void {
    const remainingBreath = state.breath[0] - state.cardCosts[playedIndex]
    hand.forEach((c, idx) => {
      if (idx !== playedIndex) {
        c.setPlayable(state.cardCosts[idx] <= remainingBreath)
      }
    })
  }

  // Rename old onCardClick to onCardPlay
  private onCardPlay(
    i: number,
    card: CardImage,
    hand: CardImage[],
    state: GameModel,
  ): () => void {
    // The staged card is a not-yet-committed extra act, so lay it (and the rest
    // of the story) out for one more card than the state currently holds.
    const projectedStoryLength = state.story.acts.length + 1
    const nextStoryPosition = CardLocation.story(
      state,
      state.story.acts.length,
      this.container,
      0,
      projectedStoryLength,
    )

    return () => {
      this.stagedCardNum = i

      this.applyOptimisticBreathPlayability(state, i, hand)

      // Squish the existing story so the staged card has room before the sun
      this.scene.view.story.reflowForStagedCard(state, projectedStoryLength)

      // Reset raised card tracking
      this.raisedCardIndex = null

      // So onCardExit (via exitCallback) does not tween this container while it plays to story
      this.cardTweeningToStory = card

      card.onHoverExitBehavior()
      card.removeOnHover()

      // Hide any hints
      this.scene.hint.hide()

      // If the whole hand was raised due to hover, lower the other cards when playing
      // Use one fewer card for spacing/rotation so it matches the post-play hand before server state.
      const newN = state.hand[0].length - 1
      hand.forEach((other, idx) => {
        if (other !== card) {
          const newIndex = idx > i ? idx - 1 : idx
          const [x, y] = this.ourHandRestPosition(state, newIndex, newN)
          this.scene.tweens.add({
            targets: other.container,
            x,
            y,
            rotation: this.ourHandRestFanRotation(newIndex, newN),
            duration: Time.match.cardFocus,
            ease: 'Sine.easeOut',
          })
        }
      })

      // Send card to story
      this.scene.tweens.add({
        targets: card.container,
        x: nextStoryPosition[0],
        y: nextStoryPosition[1],
        rotation: 0,
        scale: SHRUNKEN_CARD_SCALE,
        duration: Time.match.playCard,
        ease: 'Sine.easeInOut',
        // Moves other cards in hand to fill the hole
        onStart: () => {
          setTimeout(() => {
            this.scene.hint.hide()

            // Fill in the hole where the card was
            const newN = hand.length - 1
            for (let j = i + 1; j < hand.length; j++) {
              let adjustedCard = hand[j]
              const [tx, ty] = this.ourHandRestPosition(state, j - 1, newN)
              this.scene.tweens.add({
                targets: adjustedCard.container,
                x: tx,
                y: ty,
                duration: Time.match.playCard - 10,
                ease: 'Sine.easeInOut',
              })
            }
          }, 10)
        },
        onComplete: () => {
          this.scene.playSound('play')
          card.container.parentContainer.sendToBack(card.container)
        },
      })

      // Let the scene react (show the Play button, or immediately confirm)
      this.onStageChanged?.(i)
    }
  }

  // Modify displayState to lower any raised card when state changes
  displayState(state: GameModel): void {
    this.cardTweeningToStory = null
    // A new authoritative state supersedes any staged (unconfirmed) play
    this.stagedCardNum = null
    this.deleteTemp()

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
        this.ourHandRestPosition(state, i),
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
    }

    // Hand renders above the deck / discard stacks that share this container
    // (the stacks were parented in after handContainer was created)
    this.container.bringToTop(this.handContainer)

    // Hover-active: wide spread + raised (flat rotation like before)
    if (this.raisedCardIndex !== null) {
      this.cards.forEach((c, idx) => {
        if (c === this.cardTweeningToStory) return
        const { x, y } = this.ourHandFannedLayout(state, idx)
        c.setPosition([x, y])
        c.container.setRotation(0)
      })
    } else {
      const handN = state.hand[0].length
      this.cards.forEach((c, idx) => {
        if (c === this.cardTweeningToStory) return
        c.setPosition(this.ourHandRestPosition(state, idx))
        c.container.setRotation(this.ourHandRestFanRotation(idx, handN))
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

      // Fan the entire hand on first hover.
      if (!wasRaised) {
        const st = this.lastHandState
        if (!st) {
          return
        }
        this.cards.forEach((c, idx) => {
          if (c === this.cardTweeningToStory) return
          const { x, y } = this.ourHandFannedLayout(st, idx)
          this.scene.tweens.add({
            targets: c.container,
            x,
            y,
            rotation: 0,
            duration: Time.match.cardFocus,
            ease: 'Sine.easeOut',
          })
        })
      }
    }
  }

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

        const st = this.lastHandState
        if (!st) {
          return
        }
        const n = st.hand[0].length
        cards.forEach((c, idx) => {
          if (c === this.cardTweeningToStory) return
          const [x, y] = this.ourHandRestPosition(st, idx)
          this.scene.tweens.add({
            targets: c.container,
            x,
            y,
            rotation: this.ourHandRestFanRotation(idx, n),
            duration: Time.match.cardFocus,
            ease: 'Sine.easeOut',
          })
        })
      }
    }
  }

  /** Notified with the staged card index, or null when nothing is staged. */
  setStageChangeCallback(f: (stagedCardNum: number | null) => void): void {
    this.onStageChanged = f
  }

  /** The card the player has staged to play, or null. */
  getStagedCardNum(): number | null {
    return this.stagedCardNum
  }

  /** Return the staged card to the hand without playing it. */
  cancelStagedPlay(): void {
    if (this.stagedCardNum === null || !this.lastHandState) return
    const state = this.lastHandState
    this.stagedCardNum = null
    this.onStageChanged?.(null)
    // Un-squish the story now that the extra card is no longer staged
    this.scene.view.story.reflowForStagedCard(state)
    // Rebuild the hand next tick — not mid-click, which would destroy the card
    // whose pointer event is still running — restoring the card to its slot.
    this.scene.time.delayedCall(0, () => {
      if (this.lastHandState === state) this.displayState(state)
    })
  }

  /** Cancel the current staged play and stage a different card instead. */
  private reselectStagedPlay(i: number): void {
    if (!this.lastHandState) return
    const state = this.lastHandState
    this.scene.time.delayedCall(0, () => {
      if (this.lastHandState !== state) return
      // Rebuild the hand (returns the old card), then stage the new one
      this.displayState(state)
      const card = this.cards[i]
      if (!card) return
      this.onCardPlay(i, card, this.cards, state)()
      card.doBurstEffect = false
    })
  }

  // Set the callback for showing how much breath a card costs
  setDisplayCostCallback(f: (cost: number) => void): void {
    this.displayCostCallback = f
  }

  // TUTORIAL
  tutorialSetHandVisibility(visible: boolean): void {
    this.cards.forEach((card) => {
      card.container.setVisible(visible)
    })
  }
}
