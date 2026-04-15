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

    const bubbleSlots = this.resolveBubbles.playForResolvedActs(
      state,
      this.view.story.resolvedCards,
    )

    for (let owner = 0; owner < 2; owner++) {
      for (let i = 0; i < state.animations[owner].length; i++) {
        let animation = state.animations[owner][i]
        const slot = i + bubbleSlots

        if (animation.from === Zone.Mulligan) {
          this.animateMulligan(animation, owner, slot, state)
        }
        // Shuffle a player's deck
        else if (animation.from === Zone.Shuffle) {
          this.animateShuffle(owner, slot)
        }
        // Transform a card
        else if (animation.from === Zone.Transform) {
          this.animateTransform(animation, slot, owner)
        } else if (animation.from === Zone.Status) {
          // TODO Clarify all this and make a negative nourish sound
          // if (animation.index === 0) {
          //   this.scene.playSound('inspire')
          // } else if (animation.index === 1) {
          //   this.scene.playSound('nourish')
          // } else if (animation.index === -1) {
          //   this.scene.playSound('nourish')
          // }
        }
        // In all other cases, move it from start to end
        else {
          let start = this.getStart(animation, state, owner)
          let end = this.getEnd(animation, state, owner)

          let card = this.createCard(animation.card, start)

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
            )
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

  private createCard(card: Card, start: [number, number] = [0, 0]): CardImage {
    let cardImage = new CardImage(
      card || Catalog.cardback,
      this.container,
      false,
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
      delay: i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
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
    let cardImage = this.createCard(animation.card, start).show()

    let permanentCard = this.getCard(animation, owner)

    this.animateCard(
      cardImage,
      end,
      iAnimation,
      permanentCard,
      this.getSound(animation),
      animation.to === Zone.Story ? SHRUNKEN_CARD_SCALE : undefined,
    )
  }

  // Animate the given player's deck shuffling
  private animateShuffle(owner: number, i: number): void {
    let start
    if (owner === 0) {
      start = CardLocation.ourDeck()
    } else {
      start = CardLocation.theirDeck()
    }

    let topCard = this.createCard(Catalog.cardback, start)
    let bottomCard = this.createCard(Catalog.cardback, start)

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
    let cardCopy = this.createCard(card.card, [0, 0]).copyLocation(card)

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

    // Animate the back of the card flipping
    let hiddenCard = this.createCard(Catalog.cardback, [0, 0])
      .show()
      .copyLocation(card)
    hiddenCard.container.setScale(endScaleX, endScaleY)

    this.scene.tweens.add({
      targets: hiddenCard.container,
      scaleX: 0,
      delay: i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
      duration: Time.match.recapTween / 2,
      onComplete: function (tween, targets, _) {
        hiddenCard.destroy()
      },
    })

    // Animate the actual card flipping up
    card.hide()
    card.container.scaleX = 0
    this.scene.tweens.add({
      targets: card.container,
      scaleX: endScaleX,
      delay:
        i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens) +
        Time.match.recapTween / 2,
      duration: Time.match.recapTween / 2,
      onStart: function (tween: Phaser.Tweens.Tween, targets, _) {
        card.show()
      },
    })
  }

  // Animate a card transforming into another card
  private animateTransform(animation: Animation, i: number, owner): void {
    let newCard = this.getCard(animation, owner)
    let oldCard = this.createCard(animation.card).show().copyLocation(newCard)

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
    const r = StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_CIRCLE_RADIUS_LARGE
    const d = (R + r) / Math.SQRT2
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
  playForResolvedActs(state: GameModel, resolvedCards: CardImage[]): number {
    this.syncBookkeeping(state)

    const resolvedCount = state.story.resolvedActs.length
    const oneNewResolvedAct =
      resolvedCount === this.snapshotResolvedActCount + 1 && resolvedCount > 0
    const r = Time.match.recapTween

    for (let resolvedI = 0; resolvedI < resolvedCount; resolvedI++) {
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
      const showEffectsBubble = act.card.name !== 'Pet'

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
          this.addPointsResolveCircle(card, tweenBubbleFromStat)
        })
        let delay = r
        if (nourishAmt !== 0) {
          this.addNourishResolveCircle(
            card,
            tweenNourishFromStatus,
            nourishAmt,
            act.owner,
            delay,
          )
          delay += r
        }
        if (effectAmt !== 0 && showEffectsBubble) {
          pushBubbleStep(delay, () => {
            this.addEffectsResolveCircle(
              card,
              tweenEffectsFromStatus,
              effectAmt,
            )
          })
        }
      } else {
        this.addPointsResolveCircle(card, tweenBubbleFromStat)
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
        for (let k = 0; k < delta; k++) {
          this.resolvedNourishByActIndex.push(0)
          this.resolvedPointsEarnedByActIndex.push(0)
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
  addPointsResolveCircle(card: CardImage, tweenFromStat: boolean): void {
    const pts = card.points ?? card.card.points
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

    const { x: endLocalX, y: endLocalY } =
      StoryResolveBubbles.secondaryBubbleRestAtMainCorner('bottomRight')
    const end = this.localToWorld(card.container, endLocalX, endLocalY)

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

    const { x: endLocalX, y: endLocalY } =
      StoryResolveBubbles.secondaryBubbleRestAtMainCorner('bottomLeft')
    const end = this.localToWorld(card.container, endLocalX, endLocalY)

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
