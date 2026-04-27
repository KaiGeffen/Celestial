import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { MatchScene } from '../matchScene'
import { Animation } from '../../../../shared/animation'
import { Zone } from '../../../../shared/state/zone'
import CardLocation from './cardLocation'
import { CardImage } from '../../lib/cardImage'
import {
  Space,
  Time,
  Depth,
  Ease,
  BBStyle,
  Color,
} from '../../settings/settings'
import Catalog from '../../../../shared/state/catalog'
import { View } from '../matchScene'
import Card from '../../../../shared/state/card'
import { SHRUNKEN_CARD_SCALE } from './matchRegionSettings'

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

    const hasReset = state.animations.some((anims) =>
      anims.some((a) => a.from === Zone.Reset),
    )
    const bubbleSlots = this.resolveBubbles.playForResolvedActs(
      state,
      this.view.story.resolvedCards,
      hasReset,
    )

    // Total Zone.Story insertions across both owners — used to correctly compute the
    // pre-insertion story length so animateStoryInsertShift applies the full shift once.
    const totalStoryInsertions = state.animations[0]
      .concat(state.animations[1])
      .filter((a) => a.to === Zone.Story && a.from !== Zone.Story).length
    let storyInsertShiftDone = false

    for (let owner = 0; owner < 2; owner++) {
      for (let i = 0; i < state.animations[owner].length; i++) {
        let animation = state.animations[owner][i]
        const slot = i + bubbleSlots

        if (animation.from === Zone.Mulligan) {
          this.animateMulligan(animation, owner, slot, state)
        }
        // Shuffle a player's deck
        else if (animation.from === Zone.Shuffle) {
          this.animateShuffle(owner, slot, state)
        }
        // Transform a card
        else if (animation.from === Zone.Transform) {
          this.animateTransform(animation, slot, owner)
        } else if (animation.from === Zone.Status) {
          this.view.statusRegion.animateStatus(animation, owner, slot)
        } else if (animation.from === Zone.Reset) {
          this.resolveBubbles.popBubbles(slot, state.story.resolvedActs.length)
        }
        // In all other cases, move it from start to end
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
              slot,
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
              this.animateStoryShift(animation.index ?? 0, slot, state)
            }

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
                slot,
                state,
                totalStoryInsertions,
              )
              storyInsertShiftDone = true
            }
          } else {
            // Emphasize the card if it stayed in the same zone
            this.animateEmphasis(card, slot)
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
    const endScaleX = card.container.scaleX
    const endScaleY = card.container.scaleY

    // A scaling trick to make the card appear to flip over
    const scaleTrick = 0.95

    // Start the next reveal halfway through the current reveal
    const stepDelay = i * (Time.match.cardReveal / 2)

    // Animate the back of the card flipping
    let hiddenCard = this.createCard(Catalog.cardback, [0, 0], card.cardback)
      .show()
      .copyLocation(card)
    hiddenCard.container.setScale(endScaleX, endScaleY)

    this.scene.tweens.add({
      targets: hiddenCard.container,
      scaleX: 0,
      scaleY: endScaleY * scaleTrick,
      delay: stepDelay,
      duration: Time.match.cardReveal / 2,
      ease: 'Sine.easeIn',
      onComplete: () => {
        hiddenCard.destroy()
      },
    })

    // Animate the actual card flipping up
    card.hide()
    card.container.scaleY = endScaleY * scaleTrick
    card.container.scaleX = 0
    this.scene.tweens.add({
      targets: card.container,
      scaleX: endScaleX,
      scaleY: endScaleY,
      delay: stepDelay + Time.match.cardReveal / 2,
      duration: Time.match.cardReveal / 2,
      ease: 'Sine.easeOut',
      onStart: function (tween: Phaser.Tweens.Tween, targets, _) {
        card.show()
      },
    })
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

  private animateStoryShift(
    removalActiveIndex: number,
    slot: number,
    state: GameModel,
  ): void {
    const resolvedCount = state.story.resolvedActs.length
    const newTotalLength =
      state.story.acts.length + (state.isRecap ? resolvedCount : 0)
    const oldTotalLength = newTotalLength + 1

    const oldDx = this.computeStoryDx(oldTotalLength)
    const newDx = this.computeStoryDx(newTotalLength)

    for (let k = removalActiveIndex; k < this.view.story.cards.length; k++) {
      const card = this.view.story.cards[k]
      if (!card) continue

      const fullIndexOld = resolvedCount + k + 1
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

    // Cards being newly inserted this state should not be shifted — only pre-existing ones
    const newlyInsertedActiveIndices = new Set<number>()
    for (const ownerAnims of [state.animations[0], state.animations[1]]) {
      for (const anim of ownerAnims) {
        if (anim.to === Zone.Story && anim.from !== Zone.Story) {
          newlyInsertedActiveIndices.add(anim.index2 ?? 0)
        }
      }
    }

    for (
      let k = insertionActiveIndex + 1;
      k < this.view.story.cards.length;
      k++
    ) {
      if (newlyInsertedActiveIndices.has(k)) continue
      const card = this.view.story.cards[k]
      if (!card) continue

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

  private static readonly BUBBLE_TEXTURE_POINTS = 'chrome-bubble'
  private static readonly BUBBLE_TEXTURE_NOURISH = 'chrome-bubbleNourish'
  private static readonly BUBBLE_TEXTURE_EFFECT = 'chrome-bubbleEffect'

  private static readonly POINTS_RESOLVE_CIRCLE_RADIUS = 18
  private static readonly POINTS_RESOLVE_FONT_SMALL_PX = 24
  private static readonly POINTS_RESOLVE_FONT_SCALE = 2.5
  private static readonly POINTS_RESOLVE_FONT_LARGE_PX = Math.round(
    StoryResolveBubbles.POINTS_RESOLVE_FONT_SMALL_PX *
      StoryResolveBubbles.POINTS_RESOLVE_FONT_SCALE,
  )
  private static readonly POINTS_RESOLVE_CIRCLE_RADIUS_LARGE =
    StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS *
    StoryResolveBubbles.POINTS_RESOLVE_FONT_SCALE

  /** Large size for secondary bubbles (half of the main points bubble at full scale). */
  private static readonly NOURISH_EFFECT_RESOLVE_CIRCLE_RADIUS_LARGE =
    StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS_LARGE / 2
  private static readonly NOURISH_EFFECT_RESOLVE_FONT_LARGE_PX = Math.round(
    StoryResolveBubbles.POINTS_RESOLVE_FONT_LARGE_PX / 2,
  )

  /** Local offset from card center for nourish (bottom-right) vs effect (bottom-left) bubbles. */
  private static secondaryBubbleRestAtMainCorner(
    corner: 'bottomRight' | 'bottomLeft',
  ): { x: number; y: number } {
    const R = StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS_LARGE
    const d = R / Math.SQRT2
    return corner === 'bottomRight' ? { x: d, y: d } : { x: -d, y: d }
  }

  private readonly layer: Phaser.GameObjects.Container
  private staggerEvents: Phaser.Time.TimerEvent[] = []
  private resolvedNourishByActIndex: number[] = []
  private resolvedPointsEarnedByActIndex: number[] = []
  /** End of previous `animate`; used for resolve deltas vs the incoming state. */
  private snapshotResolvedActCount = 0
  private snapshotScore: [number, number] = [0, 0]
  private snapshotStatusNourish: [number, number] = [0, 0]
  /** Resolved act count at the time of the last reset; acts below this index skip bubble drawing. -1 = no reset. */
  private resetBeforeResolvedCount = -1
  /** When >= 0, any bubble added via makeBubbleRoot will be popped after this delay (ms). -1 = no pending pop. */
  private pendingPopDelay = -1

  constructor(private readonly scene: MatchScene) {
    this.layer = scene.add.container(0, 0).setDepth(Depth.aboveOtherCards)
  }

  saveSnapshotFromState(state: GameModel): void {
    this.snapshotResolvedActCount = state.story.resolvedActs.length
    this.snapshotScore = [state.score[0], state.score[1]]
    this.snapshotStatusNourish = [
      state.status[0].nourish,
      state.status[1].nourish,
    ]
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

  /**
   * Draws resolve bubbles for each settled act (staggered when a single act just resolved).
   * Returns recap tween slots to align other recap animations with those bubble tweens.
   */
  playForResolvedActs(
    state: GameModel,
    resolvedCards: CardImage[],
    isResetState = false,
  ): number {
    this.syncBookkeeping(state)

    const resolvedCount = state.story.resolvedActs.length

    // If a new round started, clear the reset tracking
    if (resolvedCount === 0) {
      this.resetBeforeResolvedCount = -1
    }

    // Same predicate as `StoryRegion` (lastStoryResolvedActCount vs snapshot): only the newest resolve gets stagger / settle tween.
    const oneNewResolvedAct =
      resolvedCount === this.snapshotResolvedActCount + 1 && resolvedCount > 0
    const r = Time.match.recapTween

    for (let resolvedI = 0; resolvedI < resolvedCount; resolvedI++) {
      // Skip acts whose bubbles were popped by a reset
      if (
        this.resetBeforeResolvedCount !== -1 &&
        resolvedI < this.resetBeforeResolvedCount
      ) {
        continue
      }
      const act = state.story.resolvedActs[resolvedI]
      const card = resolvedCards[resolvedI]
      if (!card) {
        continue
      }

      const tweenBubbleFromStat =
        oneNewResolvedAct && resolvedI === resolvedCount - 1

      const nourishAmt = this.resolvedNourishByActIndex[resolvedI] ?? 0
      const pointsEarned = this.resolvedPointsEarnedByActIndex[resolvedI] ?? 0
      const printedPoints = act.card.points
      const effectAmt = pointsEarned - printedPoints - nourishAmt

      // The card Pet is special
      const showEffectsBubble = act.card.name !== 'Pet'
      const mainBubblePts =
        act.card.name === 'Pet'
          ? pointsEarned - nourishAmt
          : (card.points ?? card.card.points)

      const tweenNourishFromStatus =
        oneNewResolvedAct && resolvedI === resolvedCount - 1 && nourishAmt !== 0
      const tweenEffectsFromStatus =
        oneNewResolvedAct &&
        resolvedI === resolvedCount - 1 &&
        effectAmt !== 0 &&
        showEffectsBubble

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
        if (effectAmt !== 0 && showEffectsBubble && !isResetState) {
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
        if (effectAmt !== 0 && showEffectsBubble) {
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
    const owner = act.owner
    const nourishAmt = this.snapshotStatusNourish[owner]
    const pointsEarned = state.score[owner] - this.snapshotScore[owner]
    const printedPoints = act.card.points
    const effectAmt = pointsEarned - printedPoints - nourishAmt
    const showEffectsBubble = act.card.name !== 'Pet'

    let n = 0
    n++
    if (nourishAmt !== 0) n++
    if (effectAmt !== 0 && showEffectsBubble) n++
    return n
  }

  private syncBookkeeping(state: GameModel): void {
    const resolvedCount = state.story.resolvedActs.length
    const oneNewResolvedAct =
      resolvedCount === this.snapshotResolvedActCount + 1 && resolvedCount > 0

    if (resolvedCount < this.resolvedNourishByActIndex.length) {
      this.resolvedNourishByActIndex.length = resolvedCount
      this.resolvedPointsEarnedByActIndex.length = resolvedCount
    }
    if (resolvedCount > this.resolvedNourishByActIndex.length) {
      const delta = resolvedCount - this.resolvedNourishByActIndex.length
      if (delta === 1 && oneNewResolvedAct) {
        const act = state.story.resolvedActs[resolvedCount - 1]
        const owner = act.owner
        this.resolvedNourishByActIndex.push(this.snapshotStatusNourish[owner])
        this.resolvedPointsEarnedByActIndex.push(
          state.score[owner] - this.snapshotScore[owner],
        )
      } else {
        const prevScore: [number, number] = [this.snapshotScore[0], this.snapshotScore[1]]
        const prevNourish: [number, number] = [this.snapshotStatusNourish[0], this.snapshotStatusNourish[1]]
        const firstNewIdx = resolvedCount - delta
        for (let k = firstNewIdx; k < resolvedCount; k++) {
          const act = state.story.resolvedActs[k]
          const owner = act.owner
          const pointsEarned = act.scoreAtResolution
            ? act.scoreAtResolution[owner] - prevScore[owner]
            : 0
          this.resolvedNourishByActIndex.push(prevNourish[owner])
          this.resolvedPointsEarnedByActIndex.push(pointsEarned)
          if (act.scoreAtResolution) {
            prevScore[0] = act.scoreAtResolution[0]
            prevScore[1] = act.scoreAtResolution[1]
          }
          if (act.nourishAtResolution) {
            prevNourish[0] = act.nourishAtResolution[0]
            prevNourish[1] = act.nourishAtResolution[1]
          }
        }
      }
    }
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
    img.setOrigin(0.5)
    return img
  }

  /** Main printed-points bubble; optionally tweens from the card’s points stat to center. */
  addPointsResolveCircle(
    card: CardImage,
    tweenFromStat: boolean,
    mainBubblePts?: number,
  ): void {
    const pts = mainBubblePts ?? card.points ?? card.card.points
    const start = tweenFromStat
      ? this.localToWorld(card.container, card.txtPoints.x, card.txtPoints.y)
      : this.localToWorld(card.container, 0, 0)
    const end = this.localToWorld(card.container, 0, 0)
    const bubble = this.makeBubbleRoot(start.x, start.y)

    const bubbleImg = StoryResolveBubbles.createBubbleImage(
      this.scene,
      StoryResolveBubbles.BUBBLE_TEXTURE_POINTS,
      StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS,
    )
    if (!tweenFromStat) {
      StoryResolveBubbles.setBubbleDisplaySize(
        bubbleImg,
        StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS_LARGE,
      )
    }

    const txtPts = this.scene.add
      .rexBBCodeText(
        0,
        0,
        `[stroke=${StoryResolveBubbles.STAT_STROKE}]${pts}[/stroke]`,
        tweenFromStat
          ? BBStyle.cardCost
          : StoryResolveBubbles.resolvePointsBubbleTextStyle(
              StoryResolveBubbles.POINTS_RESOLVE_FONT_LARGE_PX,
            ),
      )
      .setOrigin(0.5)

    bubble.add([bubbleImg, txtPts])

    if (tweenFromStat) {
      const grow = {
        fontPx: StoryResolveBubbles.POINTS_RESOLVE_FONT_SMALL_PX,
        radius: StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS,
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
        fontPx: StoryResolveBubbles.POINTS_RESOLVE_FONT_LARGE_PX,
        radius: StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS_LARGE,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          StoryResolveBubbles.setBubbleDisplaySize(bubbleImg, grow.radius)
          txtPts.setStyle(
            StoryResolveBubbles.resolvePointsBubbleTextStyle(grow.fontPx),
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
      StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS,
    )
    if (!tweenFromStatus) {
      StoryResolveBubbles.setBubbleDisplaySize(
        nourishBubbleImg,
        StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_CIRCLE_RADIUS_LARGE,
      )
    }

    const label = nourishAmt > 0 ? `+${nourishAmt}` : `${nourishAmt}`
    const txtNourish = this.scene.add
      .rexBBCodeText(
        0,
        0,
        `[stroke=${StoryResolveBubbles.STAT_STROKE}]${label}[/stroke]`,
        tweenFromStatus
          ? BBStyle.cardCost
          : StoryResolveBubbles.nourishResolveBubbleTextStyle(
              StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_FONT_LARGE_PX,
            ),
      )
      .setOrigin(0.5)

    bubble.add([nourishBubbleImg, txtNourish])

    if (tweenFromStatus) {
      const grow = {
        fontPx: StoryResolveBubbles.POINTS_RESOLVE_FONT_SMALL_PX,
        radius: StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS,
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
        fontPx: StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_FONT_LARGE_PX,
        radius: StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_CIRCLE_RADIUS_LARGE,
        delay: moveDelayMs,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          StoryResolveBubbles.setBubbleDisplaySize(
            nourishBubbleImg,
            grow.radius,
          )
          txtNourish.setStyle(
            StoryResolveBubbles.nourishResolveBubbleTextStyle(grow.fontPx),
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
      StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS,
    )
    if (!tweenFromEffectText) {
      StoryResolveBubbles.setBubbleDisplaySize(
        effectsBubbleImg,
        StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_CIRCLE_RADIUS_LARGE,
      )
    }

    const label = effectAmt > 0 ? `+${effectAmt}` : `${effectAmt}`
    const txtFx = this.scene.add
      .rexBBCodeText(
        0,
        0,
        `[stroke=${StoryResolveBubbles.STAT_STROKE}]${label}[/stroke]`,
        tweenFromEffectText
          ? BBStyle.cardCost
          : StoryResolveBubbles.effectsResolveBubbleTextStyle(
              StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_FONT_LARGE_PX,
            ),
      )
      .setOrigin(0.5)

    bubble.add([effectsBubbleImg, txtFx])

    if (tweenFromEffectText) {
      const grow = {
        fontPx: StoryResolveBubbles.POINTS_RESOLVE_FONT_SMALL_PX,
        radius: StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS,
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
        fontPx: StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_FONT_LARGE_PX,
        radius: StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_CIRCLE_RADIUS_LARGE,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          StoryResolveBubbles.setBubbleDisplaySize(
            effectsBubbleImg,
            grow.radius,
          )
          txtFx.setStyle(
            StoryResolveBubbles.effectsResolveBubbleTextStyle(grow.fontPx),
          )
        },
      })
    }
  }

  private static resolvePointsBubbleTextStyle(fontPx: number) {
    const base = BBStyle.cardCost
    const t = base.strokeThickness ?? 1
    return {
      ...base,
      fontSize: `${Math.round(fontPx)}px`,
      strokeThickness: Math.max(
        1,
        Math.round(
          t * (fontPx / StoryResolveBubbles.POINTS_RESOLVE_FONT_SMALL_PX),
        ),
      ),
    }
  }

  private static nourishResolveBubbleTextStyle(fontPx: number) {
    const base = BBStyle.cardCost
    const t = base.strokeThickness ?? 1
    return {
      ...base,
      fontSize: `${Math.round(fontPx)}px`,
      color: Color.whiteS,
      strokeThickness: Math.max(
        1,
        Math.round(
          t * (fontPx / StoryResolveBubbles.POINTS_RESOLVE_FONT_SMALL_PX),
        ),
      ),
    }
  }

  private static effectsResolveBubbleTextStyle(fontPx: number) {
    const base = BBStyle.cardCost
    const t = base.strokeThickness ?? 1
    return {
      ...base,
      fontSize: `${Math.round(fontPx)}px`,
      color: Color.whiteS,
      strokeThickness: Math.max(
        1,
        Math.round(
          t * (fontPx / StoryResolveBubbles.POINTS_RESOLVE_FONT_SMALL_PX),
        ),
      ),
    }
  }
}
