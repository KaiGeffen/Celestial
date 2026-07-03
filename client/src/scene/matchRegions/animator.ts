import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { MatchScene } from '../matchScene'
import { Animation } from '../../../../shared/animation'
import { Zone } from '../../../../shared/state/zone'
import CardLocation from './cardLocation'
import { CardImage } from '../../lib/cardImage'
import { Space, Time, Depth, Ease, BBStyle } from '../../settings/settings'
import Catalog from '../../../../shared/state/catalog'
import { View } from '../matchScene'
import Card from '../../../../shared/state/card'
import { SHRUNKEN_CARD_SCALE } from './matchRegionSettings'
import { animateCardReveal } from '../../lib/cardReveal'

export default class Animator {
  scene: MatchScene
  view: View
  container: Phaser.GameObjects.Container

  // In the last state, which cards were hidden in the story
  lastHiddenCards: boolean[] = []

  private resolveBubbles: StoryResolveBubbles

  constructor(scene: MatchScene, view: View) {
    this.scene = scene
    this.view = view
    this.container = scene.add.container().setDepth(Depth.aboveOtherCards)
    this.resolveBubbles = new StoryResolveBubbles(scene)
  }

  animate(state: GameModel): void {
    this.resolveBubbles.clear()

    this.animateAllReveals(state)

    const bubbleSlots = this.resolveBubbles.playForResolvedActs(
      state,
      this.view.story.resolvedCards,
    )

    // Total Zone.Story insertions across both owners — used to correctly compute the
    // pre-insertion story length so animateStoryInsertShift applies the full shift once.
    // Cards played directly from hand (e.g. Sky Burial) have no animation entry, so we
    // also compare story size against the previous state to catch unaminated insertions.

    // How many cards entered the story from animations
    let storyCountDelta = 0

    // During the day, it's new length minus previous length
    if (!state.isRecap) {
      storyCountDelta = state.story.acts.length - this.lastHiddenCards.length
    }
    // During the night, it's the number of cards added minus removed
    else {
      const allAnimations = state.animations[0].concat(state.animations[1])

      const cardsAdded = allAnimations.filter((a) => a.to === Zone.Story).length
      const cardsRemoved = allAnimations.filter(
        (a) => a.from === Zone.Story,
      ).length

      storyCountDelta = cardsAdded - cardsRemoved
    }

    // TODO what
    let storyInsertShiftDone = false

    for (let owner = 0; owner < 2; owner++) {
      for (let i = 0; i < state.animations[owner].length; i++) {
        let animation = state.animations[owner][i]
        const timeslot = i + bubbleSlots

        if (animation.from === Zone.Mulligan) {
          this.animateMulligan(animation, owner, timeslot, state)
        }
        // Shuffle a player's deck
        else if (animation.from === Zone.Shuffle) {
          this.animateShuffle(owner, timeslot, state)
        }
        // Transform a card
        else if (animation.from === Zone.Transform) {
          this.animateTransform(animation, timeslot, owner)
        } else if (animation.from === Zone.Status) {
          this.view.statusRegion.animateStatus(animation, owner, timeslot)
        } else if (animation.from === Zone.Reset) {
          this.resolveBubbles.popBubbles(
            timeslot,
            state.story.resolvedActs.length,
          )
        }
        // In all other cases, move it from start to end zone
        else {
          let start = this.getStart(animation, state, owner)
          let end = this.getEnd(animation, state, owner)

          let card = this.createCard(
            animation.card,
            start,
            state.cosmeticSets[owner].cardback ?? 0,
          )

          if (animation.to !== animation.from) {
            // Get the cardImage that this card becomes upon completion, if there is one
            let permanentCard = this.getCard(animation, owner)

            // Show the card in motion between start and end
            this.animateCard(
              card,
              end,
              timeslot,
              permanentCard,
              this.getSound(animation),
              animation.to === Zone.Story ? SHRUNKEN_CARD_SCALE : undefined,
              animation.to === Zone.Mulligan
                ? Time.match.mulliganPause
                : undefined,
            )

            // Shift remaining story cards when a card is removed mid-story
            if (animation.from === Zone.Story) {
              card.container.setScale(SHRUNKEN_CARD_SCALE)
              card.show()
              this.animateStoryRemoveShift(
                animation.index ?? 0,
                timeslot,
                state,
              )
            }

            // TODO Review and refactor

            // Shift existing story cards right when a card is inserted mid-story.
            // Only run once per state — multiple simultaneous insertions (e.g. Zoomies) must
            // apply the full combined shift in one pass to avoid stacking container offsets.
            if (
              animation.to === Zone.Story &&
              (animation.index2 ?? 0) < state.story.acts.length - 1 &&
              !storyInsertShiftDone
            ) {
              this.animateStoryInsertShift(
                animation.index2 ?? 0,
                timeslot,
                state,
                storyCountDelta,
              )
              storyInsertShiftDone = true
            }
          } else {
            // Emphasize the card if it stayed in the same zone
            this.animateEmphasis(card, timeslot)
          }
        }
      }
    }

    this.lastHiddenCards = this.getHiddenCards(state)

    this.resolveBubbles.saveSnapshotFromState(state)
  }

  private getStart(
    animation: Animation,
    state,
    owner: number,
  ): [number, number] {
    switch (animation.from) {
      case Zone.Mulligan:
        return CardLocation.mulligan(this.container, animation.index)

      case Zone.Deck:
        if (owner === 0) {
          return CardLocation.ourDeck()
        } else {
          return CardLocation.theirDeck(this.container)
        }

      case Zone.Story:
        return CardLocation.story(
          state,
          state.story.resolvedActs.length + (animation.index ?? 0),
          this.container,
          owner,
        )

      case Zone.Gone:
        return CardLocation.gone(this.container)

      case Zone.Hand:
        if (owner === 0) {
          return CardLocation.ourHand(state, animation.index)
        } else {
          return CardLocation.theirHand(state, animation.index, this.container)
        }

      case Zone.Discard:
        if (owner === 0) {
          return CardLocation.ourDiscard(this.container)
        } else {
          return CardLocation.theirDiscard(this.container)
        }
    }

    return [300, 300]
  }

  private getEnd(animation: Animation, state, owner): [number, number] {
    switch (animation.to) {
      case Zone.Deck:
        if (owner === 0) {
          return CardLocation.ourDeck()
        } else {
          return CardLocation.theirDeck(this.container)
        }

      // TODO Clarify index 1 and 2, mostly 2 seems to be null
      case Zone.Story:
        return CardLocation.story(
          state,
          state.story.resolvedActs.length + (animation.index2 ?? 0),
          this.container,
          owner,
        )

      case Zone.Gone:
        return CardLocation.gone(this.container)

      case Zone.Mulligan:
        return CardLocation.mulligan(this.container, animation.index)

      case Zone.Hand:
        if (owner === 0) {
          return CardLocation.ourHand(state, animation.index2)
        } else {
          return CardLocation.theirHand(state, animation.index2, this.container)
        }

      case Zone.Discard:
        if (owner === 0) {
          return CardLocation.ourDiscard(this.container)
        } else {
          return CardLocation.theirDiscard(this.container)
        }
    }

    return [300, 300]
  }

  private createCard(
    card: Card,
    start: [number, number] = [0, 0],
    cardback: number = 0,
  ): CardImage {
    let cardImage = new CardImage(
      card || Catalog.cardback,
      this.container,
      false,
      true,
      cardback,
    )

    // Set its initial position and make it hidden until its tween plays
    cardImage.setPosition(start)
    cardImage.hide()

    return cardImage
  }

  // Get the cardImage referenced by this animation
  private getCard(animation: Animation, owner: number): CardImage {
    let card

    switch (animation.to) {
      case Zone.Hand:
        if (owner === 0) {
          // TODO Check length
          card = this.view.ourBoard.cards[animation.index2]
        } else {
          card = this.view.theirBoard.cards[animation.index2]
        }
        break

      case Zone.Story:
        // TODO The local array has includes resolved cards, while the animation index doesn't, causing a bug
        card = this.view.story.cards[animation.index2]
        break

      case Zone.Mulligan:
        // Only show our mulligans
        // TODO Should this be index2?
        card = this.view.mulligan.cards[animation.index]
        break

      case Zone.Deck:
        if (owner === 0) {
          card = null //// this.view.decks.cards[animation.index2]
        } else {
          card = null //this.view.decks.cards2[animation.index2]
        }
        break

      case Zone.Discard:
        if (owner === 0) {
          card = null //this.view.discardPiles.cards[animation.index2]
        } else {
          card = null //this.view.discardPiles.cards2[animation.index2]
        }
        break

      // // TODO
      // break
      // card = this.view.decks.cards

      // case Zone.Discard:
      // // TODO
      // break

      // case Zone.Gone:
      // case Zone.Create:
      // default:
      default:
        break
    }
    return card
  }

  // Animate the given card moving to given end position with given delay
  // If a permanent card is specified, that's the image that should become visible when tween completes
  private animateCard(
    card: CardImage,
    end: [number, number],
    i: number,
    permanentCard?: CardImage,
    sound?,
    endScale?: number,
    pauseBetween: number = Time.match.recapPauseBetweenTweens,
  ) {
    if (permanentCard) {
      permanentCard.hide()
    }

    // Animate moving x direction, becoming visible when animation starts
    this.scene.tweens.add({
      targets: card.container,
      x: end[0],
      y: end[1],
      ...(endScale !== undefined ? { scaleX: endScale, scaleY: endScale } : {}),
      delay: i * (Time.match.recapTween + pauseBetween),
      duration: Time.match.recapTween,
      ease: Ease.card,
      onStart: (tween: Phaser.Tweens.Tween, targets, _) => {
        card.show()
        if (sound) {
          this.scene.playSound(sound)
        }
      },
      onComplete: (tween, targets, _) => {
        if (permanentCard) {
          permanentCard.show()
        }
        card.destroy()
      },
    })
  }

  // Animate a card being thrown back into the deck during mulligan phase
  private animateMulligan(
    animation: Animation,
    owner: number,
    iAnimation: number,
    state: GameModel,
  ) {
    // Should end in deck or hand
    const end = this.getEnd(animation, state, owner)
    const start = this.getStart(animation, state, owner)

    // Make a new cardImage of this card
    let cardImage = this.createCard(
      animation.card,
      start,
      state.cosmeticSets[owner].cardback ?? 0,
    ).show()

    let permanentCard = this.getCard(animation, owner)

    this.animateCard(
      cardImage,
      end,
      iAnimation,
      permanentCard,
      this.getSound(animation),
      animation.to === Zone.Story ? SHRUNKEN_CARD_SCALE : undefined,
      Time.match.mulliganPause,
    )
  }

  // Animate the given player's deck shuffling
  private animateShuffle(owner: number, i: number, state: GameModel): void {
    let start
    if (owner === 0) {
      start = CardLocation.ourDeck()
    } else {
      start = CardLocation.theirDeck()
    }

    const cardback = state.cosmeticSets[owner].cardback ?? 0
    let topCard = this.createCard(Catalog.cardback, start, cardback)
    let bottomCard = this.createCard(Catalog.cardback, start, cardback)

    this.scene.add.tween({
      targets: topCard.container,
      x: start[0] + Space.cardWidth / 4,
      delay: i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
      duration: Time.match.recapTween / 4,
      yoyo: true,
      repeat: 1,
      onStart: (tween: Phaser.Tweens.Tween, targets, _) => {
        topCard.show()
        this.scene.playSound('shuffle')
      },
      onComplete: function (tween, targets, _) {
        topCard.destroy()
      },
    })

    this.scene.add.tween({
      targets: bottomCard.container,
      x: start[0] - Space.cardHeight / 2,
      delay: i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
      duration: Time.match.recapTween / 4,
      yoyo: true,
      repeat: 1,
      onStart: function (tween: Phaser.Tweens.Tween, targets, _) {
        bottomCard.show()
      },
      onComplete: function (tween, targets, _) {
        bottomCard.destroy()
      },
    })
  }

  // Animate a card being emphasized in its place, such as showing that a Morning card is proccing
  private animateEmphasis(card: CardImage, i: number): void {
    let cardCopy = this.createCard(
      card.card,
      [0, 0],
      card.cardback,
    ).copyLocation(card)

    // Animate card scaling up and disappearing
    this.scene.tweens.add({
      targets: cardCopy.container,
      scale: 3,
      alpha: 0,
      delay: i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
      duration: Time.match.recapTween,
      onStart: function (tween: Phaser.Tweens.Tween, targets, _) {
        cardCopy.show()
      },
      onComplete: function (tween, targets, _) {
        cardCopy.destroy()
      },
    })
  }

  // Animate all cards newly revealed on this state (runs before resolve-bubble recap stagger)
  private animateAllReveals(state: GameModel): void {
    let acts = state.story.acts
    let amtSeen = 0
    for (let i = 0; i < acts.length; i++) {
      // If it was hidden, flip it over
      if (this.lastHiddenCards[i]) {
        let card = this.view.story.cards[i]

        if (card.card.id !== Catalog.cardback.id) {
          this.animateReveal(card, amtSeen)
          amtSeen++
        }
      }
    }
  }

  // Animate a card being revealed
  private animateReveal(card: CardImage, i: number): void {
    animateCardReveal(this.scene, card, card.container.parentContainer, i)
  }

  // Animate a card transforming into another card
  private animateTransform(animation: Animation, i: number, owner): void {
    let newCard = this.getCard(animation, owner)
    let oldCard = this.createCard(
      animation.card,
      [0, 0],
      newCard?.cardback ?? 0,
    )
      .show()
      .copyLocation(newCard)

    // Display the old card with the same scale as the new card
    oldCard.container.setScale(newCard.container.scale)
    oldCard.imageShadow.setVisible(false)

    // Animate card scaling up and disappearing
    this.scene.tweens.add({
      targets: oldCard.container,
      alpha: 0,
      delay: i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
      duration: Time.match.recapTween,
      onComplete: function (tween, targets, _) {
        oldCard.destroy()
      },
    })
  }

  // Compute the dx between cards in the story
  private computeStoryDx(totalLength: number): number {
    let dx = Space.cardWidth * 0.8 - Space.storyXOverlap
    if (totalLength <= 1) return dx
    const x0 = 230
    const rightPad = 200
    const maxOffset = Space.windowWidth - x0 - Space.cardWidth / 2 - rightPad
    const lastCardOffset = dx * (totalLength - 1)
    if (lastCardOffset > maxOffset) {
      dx *= maxOffset / lastCardOffset
    }
    return dx
  }

  // Animate the story shifting to accomodate a card being removed
  private animateStoryRemoveShift(
    removalActiveIndex: number,
    timeslot: number,
    state: GameModel,
  ): void {
    const resolvedCount = state.story.resolvedActs.length
    const lengthOld = resolvedCount + state.story.acts.length
    const lengthNew = lengthOld - 1

    const dxOld = this.computeStoryDx(lengthOld)
    const dxNew = this.computeStoryDx(lengthNew)

    // Starting from the where the card was removed, shift all to take up new space
    for (let k = removalActiveIndex; k < this.view.story.cards.length; k++) {
      const card = this.view.story.cards[k]
      if (!card) continue
      // Don't tween a card that is already tweening
      if (this.scene.tweens.getTweensOf(card.container).length > 0) continue

      // Where it was versus where it is now
      const fullIndexOld = resolvedCount + k + 1
      const fullIndexNew = resolvedCount + k
      const shiftX = dxOld * fullIndexOld - dxNew * fullIndexNew

      card.container.x += shiftX

      this.scene.tweens.add({
        targets: card.container,
        x: card.container.x - shiftX,
        delay:
          timeslot *
          (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
        duration: Time.match.recapTween,
        ease: Ease.card,
      })
    }
  }

  private animateStoryInsertShift(
    insertionActiveIndex: number,
    slot: number,
    state: GameModel,
    totalInsertions = 1,
  ): void {
    const resolvedCount = state.story.resolvedActs.length
    const newTotalLength =
      state.story.acts.length + (state.isRecap ? resolvedCount : 0)
    const oldTotalLength = newTotalLength - totalInsertions

    // No pre-existing cards to shift (all insertions are new to the story this state)
    if (oldTotalLength <= 0) return

    const oldDx = this.computeStoryDx(oldTotalLength)
    const newDx = this.computeStoryDx(newTotalLength)

    // Cards being newly inserted this state should not be shifted — only pre-existing ones.
    // Use a contiguous range from insertionActiveIndex covering all totalInsertions slots.
    // This handles cards that entered the story without an animation (e.g. Sky Burial played
    // directly from hand gets displaced to insertionActiveIndex+1 when Vulture is created
    // before it, but has no animation entry of its own to appear in a per-animation set).
    const newlyInsertedActiveIndices = new Set<number>()
    for (
      let pos = insertionActiveIndex;
      pos < insertionActiveIndex + totalInsertions;
      pos++
    ) {
      newlyInsertedActiveIndices.add(pos)
    }

    for (
      let k = insertionActiveIndex + 1;
      k < this.view.story.cards.length;
      k++
    ) {
      if (newlyInsertedActiveIndices.has(k)) continue
      const card = this.view.story.cards[k]
      if (!card) continue
      // A card already tweening (e.g. just played from a hand) is headed to its
      // correct position — shifting it too would fight that tween.
      if (this.scene.tweens.getTweensOf(card.container).length > 0) continue

      const fullIndexOld = resolvedCount + k - totalInsertions
      const fullIndexNew = resolvedCount + k
      const shiftX = oldDx * fullIndexOld - newDx * fullIndexNew

      card.container.x += shiftX

      this.scene.tweens.add({
        targets: card.container,
        x: card.container.x - shiftX,
        delay:
          slot * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
        duration: Time.match.recapTween,
        ease: Ease.card,
      })
    }
  }

  private getHiddenCards(state: GameModel): boolean[] {
    let result = []

    for (let i = 0; i < state.story.acts.length; i++) {
      result[i] = state.story.acts[i].card.id === Catalog.cardback.id
    }

    return result
  }

  private getSound(animation: Animation): string {
    switch (animation.to) {
      case Zone.Hand:
        switch (animation.from) {
          case Zone.Deck:
          case Zone.Mulligan:
            return 'draw'
          default:
            return 'create'
        }
        return 'draw'
      case Zone.Discard:
        return 'discard'
      // TODO Some other sound?
      case Zone.Deck:
        return 'discard'
      case Zone.Mulligan:
        return 'draw'
    }
    return undefined
  }
}

/** Resolve bubbles on settled story cards (chrome art + BBCode labels + tweens). */
class StoryResolveBubbles {
  private static readonly STAT_STROKE = '#000000'

  // Names for each image
  private static readonly BUBBLE_TEXTURE_POINTS = 'chrome-bubble'
  private static readonly BUBBLE_TEXTURE_NOURISH = 'chrome-bubbleNourish'
  private static readonly BUBBLE_TEXTURE_EFFECT = 'chrome-bubbleEffect'

  // How much the components scale up by
  private static readonly DELTA_SCALE = 2.5

  // Size the bubbles start / end (Main bubble is large, others small)
  private static readonly RADIUS_START = 18
  private static readonly RADIUS_END_LARGE =
    StoryResolveBubbles.RADIUS_START * StoryResolveBubbles.DELTA_SCALE
  private static readonly RADIUS_END_SMALL =
    StoryResolveBubbles.RADIUS_END_LARGE / 2

  // Font start / end pixels
  private static readonly FONT_PX_START = 24
  private static readonly FONT_PX_END_LARGE = Math.round(
    StoryResolveBubbles.FONT_PX_START * StoryResolveBubbles.DELTA_SCALE,
  )
  private static readonly FONT_PX_END_SMALL = Math.round(
    StoryResolveBubbles.FONT_PX_END_LARGE / 2,
  )

  /** Local offset from card center for nourish (bottom-right) vs effect (bottom-left) bubbles. */
  private static secondaryBubbleRestAtMainCorner(
    corner: 'bottomRight' | 'bottomLeft',
  ): { x: number; y: number } {
    const R = StoryResolveBubbles.RADIUS_END_LARGE
    const d = R / Math.SQRT2
    return corner === 'bottomRight' ? { x: d, y: d } : { x: -d, y: d }
  }

  private readonly layer: Phaser.GameObjects.Container
  private staggerEvents: Phaser.Time.TimerEvent[] = []
  /** End of previous `animate`; used to detect a single new resolved act. */
  private snapshotResolvedActCount = 0
  /** Resolved act count at the time of the last reset; acts below this index skip bubble drawing. -1 = no reset. */
  private resetBeforeResolvedCount = -1
  /** When >= 0, any bubble added via makeBubbleRoot will be popped after this delay (ms). -1 = no pending pop. */
  private pendingPopDelay = -1

  constructor(private readonly scene: MatchScene) {
    this.layer = scene.add.container(0, 0).setDepth(Depth.aboveOtherCards)
  }

  saveSnapshotFromState(state: GameModel): void {
    this.snapshotResolvedActCount = state.story.resolvedActs.length
  }

  clear(): void {
    this.cancelStaggerEvents()
    this.layer.removeAll(true)
    this.pendingPopDelay = -1
  }

  popBubbles(slot: number, resolvedCountAtReset: number): void {
    this.resetBeforeResolvedCount = resolvedCountAtReset
    const delay =
      slot * (Time.match.recapTween + Time.match.recapPauseBetweenTweens)
    this.pendingPopDelay = delay
    const targets = [...this.layer.list] as Phaser.GameObjects.Container[]
    for (const bubble of targets) {
      this.scheduleBubblePop(bubble, delay)
    }
  }

  private scheduleBubblePop(
    bubble: Phaser.GameObjects.Container,
    delay: number,
  ): void {
    this.scene.tweens.add({
      targets: bubble,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      delay,
      duration: Time.match.recapTween / 2,
      ease: 'Back.easeIn',
      onComplete: () => bubble.destroy(),
    })
  }

  private cancelStaggerEvents(): void {
    this.staggerEvents.forEach((e) => {
      this.scene.time.removeEvent(e)
    })
    this.staggerEvents = []
  }

  /** Same cutoff as `popBubbles`: max `index` on `Zone.Reset` animations in this state's batch (often empty after recap skip). */
  private bubbleSkipBeforeResolvedIndexFromResetAnimations(
    state: GameModel,
  ): number {
    let max = 0
    for (const anims of state.animations) {
      for (const a of anims) {
        if (a.from === Zone.Reset && typeof a.index === 'number') {
          max = Math.max(max, a.index)
        }
      }
    }
    return max
  }

  /**
   * Draws resolve bubbles for each settled act (staggered when a single act just resolved).
   * Returns recap tween slots to align other recap animations with those bubble tweens.
   */
  playForResolvedActs(state: GameModel, resolvedCards: CardImage[]): number {
    const isResetState = state.animations.some((anims) =>
      anims.some((a) => a.from === Zone.Reset),
    )
    const resolvedCount = state.story.resolvedActs.length

    // If a new round started, clear the reset tracking
    if (resolvedCount === 0) {
      this.resetBeforeResolvedCount = -1
    }

    const fromStoryField = state.story.bubbleSkipBeforeResolvedIndex ?? 0
    const fromResetAnimations =
      this.bubbleSkipBeforeResolvedIndexFromResetAnimations(state)
    const animationBubbleSkipBefore =
      this.resetBeforeResolvedCount === -1 ? 0 : this.resetBeforeResolvedCount
    const bubbleSkipBeforeResolvedIndex = Math.max(
      fromStoryField,
      fromResetAnimations,
      animationBubbleSkipBefore,
    )

    // Same predicate as `StoryRegion` (lastStoryResolvedActCount vs snapshot): only the newest resolve gets stagger / settle tween.
    const oneNewResolvedAct =
      resolvedCount === this.snapshotResolvedActCount + 1 && resolvedCount > 0
    const r = Time.match.recapTween

    for (let resolvedI = 0; resolvedI < resolvedCount; resolvedI++) {
      // Skip acts cleared by reset (sequential recap via popBubbles, or skipped recap via Story / Reset animation index)
      if (resolvedI < bubbleSkipBeforeResolvedIndex) {
        continue
      }
      const act = state.story.resolvedActs[resolvedI]
      const card = resolvedCards[resolvedI]
      if (!card) {
        continue
      }

      const tweenBubbleFromStat =
        oneNewResolvedAct && resolvedI === resolvedCount - 1

      const nourishAmt = act.pointsFromNourish
      const effectAmt = act.pointsFromEffects

      const mainBubblePts = act.pointsFromStartingPoints

      const tweenNourishFromStatus =
        oneNewResolvedAct && resolvedI === resolvedCount - 1 && nourishAmt !== 0
      const tweenEffectsFromStatus =
        oneNewResolvedAct && resolvedI === resolvedCount - 1 && effectAmt !== 0

      const shouldStagger = oneNewResolvedAct && resolvedI === resolvedCount - 1

      const pushBubbleStep = (delay: number, fn: () => void) => {
        const ev = this.scene.time.delayedCall(delay, () => {
          if (!card.container.active) {
            return
          }
          fn()
        })
        this.staggerEvents.push(ev)
      }

      if (shouldStagger) {
        pushBubbleStep(0, () => {
          this.addPointsResolveCircle(card, tweenBubbleFromStat, mainBubblePts)
        })
        let delay = r
        if (nourishAmt !== 0) {
          const nourishDelay = delay
          pushBubbleStep(0, () => {
            this.addNourishResolveCircle(
              card,
              tweenNourishFromStatus,
              nourishAmt,
              act.owner,
              nourishDelay,
            )
          })
          delay += r
        }
        if (effectAmt !== 0 && !isResetState) {
          pushBubbleStep(delay, () => {
            this.addEffectsResolveCircle(
              card,
              tweenEffectsFromStatus,
              effectAmt,
            )
          })
        }
      } else {
        this.addPointsResolveCircle(card, tweenBubbleFromStat, mainBubblePts)
        this.addNourishResolveCircle(
          card,
          tweenNourishFromStatus,
          nourishAmt,
          act.owner,
        )
        if (effectAmt !== 0) {
          this.addEffectsResolveCircle(card, tweenEffectsFromStatus, effectAmt)
        }
      }
    }

    return this.recapBubbleTweenSlotCount(state)
  }

  /** Slot count for staggered resolve-bubble tweens (0 when not a single new resolve). */
  private recapBubbleTweenSlotCount(state: GameModel): number {
    const resolvedCount = state.story.resolvedActs.length
    const oneNewResolvedAct =
      resolvedCount === this.snapshotResolvedActCount + 1 && resolvedCount > 0

    if (!oneNewResolvedAct) {
      return 0
    }

    const act = state.story.resolvedActs[resolvedCount - 1]
    let n = 1
    if (act.pointsFromNourish !== 0) n++
    if (act.pointsFromEffects !== 0) n++
    return n
  }

  /** Creates a world-space bubble root and attaches it to the resolve layer. */
  private makeBubbleRoot(
    worldX: number,
    worldY: number,
  ): Phaser.GameObjects.Container {
    const bubble = this.scene.add.container(worldX, worldY)
    this.layer.add(bubble)
    if (this.pendingPopDelay >= 0) {
      this.scheduleBubblePop(bubble, this.pendingPopDelay)
    }
    return bubble
  }

  private localToWorld(
    target: Phaser.GameObjects.GameObject,
    x: number,
    y: number,
  ): Phaser.Math.Vector2 {
    const container = target as Phaser.GameObjects.Container
    const m = container.getWorldTransformMatrix()
    return new Phaser.Math.Vector2(
      m.tx + m.a * x + m.c * y,
      m.ty + m.b * x + m.d * y,
    )
  }

  private static setBubbleDisplaySize(
    img: Phaser.GameObjects.Image,
    radius: number,
  ): void {
    const d = radius * 2
    img.setDisplaySize(d, d)
  }

  private static createBubbleImage(
    scene: Phaser.Scene,
    textureKey: string,
    radius: number,
  ): Phaser.GameObjects.Image {
    const img = scene.add.image(0, 0, textureKey)

    StoryResolveBubbles.setBubbleDisplaySize(img, radius)

    return img
  }

  /** Main printed-points bubble; optionally tweens from the card’s points stat to center. */
  addPointsResolveCircle(
    card: CardImage,
    tweenFromStat: boolean,
    mainBubblePts: number,
  ): void {
    const pts = mainBubblePts
    const start = tweenFromStat
      ? this.localToWorld(card.container, card.txtPoints.x, card.txtPoints.y)
      : this.localToWorld(card.container, 0, 0)
    const end = this.localToWorld(card.container, 0, 0)
    const bubble = this.makeBubbleRoot(start.x, start.y)

    const bubbleImg = StoryResolveBubbles.createBubbleImage(
      this.scene,
      StoryResolveBubbles.BUBBLE_TEXTURE_POINTS,
      StoryResolveBubbles.RADIUS_START,
    )
    if (!tweenFromStat) {
      StoryResolveBubbles.setBubbleDisplaySize(
        bubbleImg,
        StoryResolveBubbles.RADIUS_END_LARGE,
      )
    }

    const txtPts = this.scene.add
      .rexBBCodeText(
        0,
        0,
        `[stroke=${StoryResolveBubbles.STAT_STROKE}]${pts}[/stroke]`,
        tweenFromStat
          ? BBStyle.storyResolveBubble
          : StoryResolveBubbles.resolveBubbleTextStyle(
              StoryResolveBubbles.FONT_PX_END_LARGE,
            ),
      )
      .setOrigin(0.5)

    bubble.add([bubbleImg, txtPts])

    if (tweenFromStat) {
      const grow = {
        fontPx: StoryResolveBubbles.FONT_PX_START,
        radius: StoryResolveBubbles.RADIUS_START,
      }
      this.scene.tweens.add({
        targets: bubble,
        x: end.x,
        y: end.y,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
      })
      this.scene.tweens.add({
        targets: grow,
        fontPx: StoryResolveBubbles.FONT_PX_END_LARGE,
        radius: StoryResolveBubbles.RADIUS_END_LARGE,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          StoryResolveBubbles.setBubbleDisplaySize(bubbleImg, grow.radius)
          txtPts.setStyle(
            StoryResolveBubbles.resolveBubbleTextStyle(grow.fontPx),
          )
        },
      })
    }
  }

  /** Nourish bubble; optional tween from the status strip into the main bubble’s bottom-right. */
  addNourishResolveCircle(
    card: CardImage,
    tweenFromStatus: boolean,
    nourishAmt: number,
    owner: number,
    moveDelayMs: number = 0,
  ): void {
    if (nourishAmt === 0) return

    const { x: endOffsetX, y: endOffsetY } =
      StoryResolveBubbles.secondaryBubbleRestAtMainCorner('bottomLeft')
    const cardCenter = this.localToWorld(card.container, 0, 0)
    const end = new Phaser.Math.Vector2(
      cardCenter.x + endOffsetX,
      cardCenter.y + endOffsetY,
    )

    let bx = end.x
    let by = end.y
    if (tweenFromStatus) {
      const cam = this.scene.cameras.main
      const sourceY = owner === 1 ? 200 : cam.height - 200
      const world = cam.getWorldPoint(cam.width / 2, sourceY)
      bx = world.x
      by = world.y
    }

    const bubble = this.makeBubbleRoot(bx, by)

    const nourishBubbleImg = StoryResolveBubbles.createBubbleImage(
      this.scene,
      StoryResolveBubbles.BUBBLE_TEXTURE_NOURISH,
      StoryResolveBubbles.RADIUS_START,
    )
    if (!tweenFromStatus) {
      StoryResolveBubbles.setBubbleDisplaySize(
        nourishBubbleImg,
        StoryResolveBubbles.RADIUS_END_SMALL,
      )
    }

    const label = nourishAmt > 0 ? `+${nourishAmt}` : `${nourishAmt}`
    const txtNourish = this.scene.add
      .rexBBCodeText(
        0,
        0,
        `[stroke=${StoryResolveBubbles.STAT_STROKE}]${label}[/stroke]`,
        tweenFromStatus
          ? BBStyle.storyResolveBubble
          : StoryResolveBubbles.resolveBubbleTextStyle(
              StoryResolveBubbles.FONT_PX_END_SMALL,
            ),
      )
      .setOrigin(0.5)

    bubble.add([nourishBubbleImg, txtNourish])

    if (tweenFromStatus) {
      const grow = {
        fontPx: StoryResolveBubbles.FONT_PX_START,
        radius: StoryResolveBubbles.RADIUS_START,
      }
      this.scene.tweens.add({
        targets: bubble,
        x: end.x,
        y: end.y,
        delay: moveDelayMs,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
      })
      this.scene.tweens.add({
        targets: grow,
        fontPx: StoryResolveBubbles.FONT_PX_END_SMALL,
        radius: StoryResolveBubbles.RADIUS_END_SMALL,
        delay: moveDelayMs,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          StoryResolveBubbles.setBubbleDisplaySize(
            nourishBubbleImg,
            grow.radius,
          )
          txtNourish.setStyle(
            StoryResolveBubbles.resolveBubbleTextStyle(grow.fontPx),
          )
        },
      })
    }
  }

  /** Score beyond printed points and nourish; optional tween from the card text to bottom-left. */
  addEffectsResolveCircle(
    card: CardImage,
    tweenFromEffectText: boolean,
    effectAmt: number,
  ): void {
    if (effectAmt === 0) return

    const { x: endOffsetX, y: endOffsetY } =
      StoryResolveBubbles.secondaryBubbleRestAtMainCorner('bottomRight')
    const cardCenter = this.localToWorld(card.container, 0, 0)
    const end = new Phaser.Math.Vector2(
      cardCenter.x + endOffsetX,
      cardCenter.y + endOffsetY,
    )

    let bx = end.x
    let by = end.y
    if (tweenFromEffectText) {
      const start = this.localToWorld(
        card.container,
        card.txtText.x,
        card.txtText.y,
      )
      bx = start.x
      by = start.y
    }

    const bubble = this.makeBubbleRoot(bx, by)

    const effectsBubbleImg = StoryResolveBubbles.createBubbleImage(
      this.scene,
      StoryResolveBubbles.BUBBLE_TEXTURE_EFFECT,
      StoryResolveBubbles.RADIUS_START,
    )
    if (!tweenFromEffectText) {
      StoryResolveBubbles.setBubbleDisplaySize(
        effectsBubbleImg,
        StoryResolveBubbles.RADIUS_END_SMALL,
      )
    }

    const label = effectAmt > 0 ? `+${effectAmt}` : `${effectAmt}`
    const txtFx = this.scene.add
      .rexBBCodeText(
        0,
        0,
        `[stroke=${StoryResolveBubbles.STAT_STROKE}]${label}[/stroke]`,
        tweenFromEffectText
          ? BBStyle.storyResolveBubble
          : StoryResolveBubbles.resolveBubbleTextStyle(
              StoryResolveBubbles.FONT_PX_END_SMALL,
            ),
      )
      .setOrigin(0.5)

    bubble.add([effectsBubbleImg, txtFx])

    if (tweenFromEffectText) {
      const grow = {
        fontPx: StoryResolveBubbles.FONT_PX_START,
        radius: StoryResolveBubbles.RADIUS_START,
      }
      this.scene.tweens.add({
        targets: bubble,
        x: end.x,
        y: end.y,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
      })
      this.scene.tweens.add({
        targets: grow,
        fontPx: StoryResolveBubbles.FONT_PX_END_SMALL,
        radius: StoryResolveBubbles.RADIUS_END_SMALL,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          StoryResolveBubbles.setBubbleDisplaySize(
            effectsBubbleImg,
            grow.radius,
          )
          txtFx.setStyle(
            StoryResolveBubbles.resolveBubbleTextStyle(grow.fontPx),
          )
        },
      })
    }
  }

  private static resolveBubbleTextStyle(fontPx: number) {
    const base = BBStyle.storyResolveBubble
    const t = base.strokeThickness ?? 1
    return {
      ...base,
      fontSize: `${Math.round(fontPx)}px`,
      strokeThickness: Math.max(
        1,
        Math.round(t * (fontPx / StoryResolveBubbles.FONT_PX_START)),
      ),
    }
  }
}
