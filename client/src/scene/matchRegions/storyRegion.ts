import 'phaser'
import {
  CardImage,
  STORY_RESOLVE_BUBBLE_NAME,
  STORY_RESOLVE_NOURISH_BUBBLE_NAME,
  STORY_RESOLVE_EFFECTS_BUBBLE_NAME,
} from '../../lib/cardImage'
import GameModel from '../../../../shared/state/gameModel'
import {
  Space,
  Style,
  Depth,
  Time,
  Flags,
  Color,
  BBStyle,
} from '../../settings/settings'
import { MatchScene } from '../matchScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'
import Act from '../../../../shared/state/act'
import { Quality } from '../../../../shared/state/quality'
import { SHRUNKEN_CARD_SCALE } from './matchRegionSettings'

export default class StoryRegion extends Region {
  lastScores: [number, number]

  /** Previous `state.story.resolvedActs.length` (for detecting a single new resolve). */
  private lastResolvedActCount = 0

  /** Status nourish at end of last `displayState` (before current state applied). */
  private prevStatusNourish: [number, number] = [0, 0]

  /** Parallel to `resolvedActs`: nourish amount consumed when that act resolved (0 = none). */
  private resolvedNourishByActIndex: number[] = []

  /** Score for each player at end of last `displayState` (for points earned on a new resolve). */
  private prevScore: [number, number] = [0, 0]

  /** Total points added to that owner's score when each act resolved (from score delta). */
  private resolvedPointsEarnedByActIndex: number[] = []

  private resolveBubbles: StoryResolveBubbles

  /** Pending stagger timers for resolve bubbles (cancelled when `displayState` rebuilds). */
  private bubbleStaggerEvents: Phaser.Time.TimerEvent[] = []

  // Callback that plays when ith card in recap is clicked on
  callback: (i: number) => () => void

  // This is slightly wrong, because the top hand is smaller than this hand height
  MIDDLE = Space.windowHeight / 2 - Space.handHeight

  create(scene: MatchScene): StoryRegion {
    this.scene = scene
    this.lastScores = [0, 0]
    this.resolveBubbles = new StoryResolveBubbles(scene)

    this.container = scene.add
      .container(0, Space.handHeight)
      .setDepth(Depth.storyAtDay)

    return this
  }

  private clearBubbleStaggerEvents(): void {
    this.bubbleStaggerEvents.forEach((e) => {
      this.scene.time.removeEvent(e)
    })
    this.bubbleStaggerEvents = []
  }

  displayState(state: GameModel): void {
    this.clearBubbleStaggerEvents()
    this.deleteTemp()

    const resolvedCount = state.story.resolvedActs.length
    const oneNewResolvedAct =
      resolvedCount === this.lastResolvedActCount + 1 && resolvedCount > 0

    if (resolvedCount < this.resolvedNourishByActIndex.length) {
      this.resolvedNourishByActIndex.length = resolvedCount
      this.resolvedPointsEarnedByActIndex.length = resolvedCount
    }
    if (resolvedCount > this.resolvedNourishByActIndex.length) {
      const delta = resolvedCount - this.resolvedNourishByActIndex.length
      if (delta === 1 && oneNewResolvedAct) {
        const act = state.story.resolvedActs[resolvedCount - 1]
        const owner = act.owner
        this.resolvedNourishByActIndex.push(this.prevStatusNourish[owner])
        this.resolvedPointsEarnedByActIndex.push(
          state.score[owner] - this.prevScore[owner],
        )
      } else {
        for (let k = 0; k < delta; k++) {
          this.resolvedNourishByActIndex.push(0)
          this.resolvedPointsEarnedByActIndex.push(0)
        }
      }
    }

    // Set the correct depth based on day/night
    this.container.setDepth(
      state.isRecap ? Depth.storyAtNight : Depth.storyAtDay,
    )

    // If this is a recap, add the already played cards greyed out
    // TODO: Either enable the onClick callback or remove its api
    let resolvedI = 0
    for (; resolvedI < state.story.resolvedActs.length; resolvedI++) {
      const act: Act = state.story.resolvedActs[resolvedI]

      let card = this.addCard(
        act.card,
        CardLocation.story(state, resolvedI, this.container, act.owner),
      )
      // .setOnClick(this.callback(resolvedI))

      card.container.setScale(SHRUNKEN_CARD_SCALE)

      const tweenBubbleFromStat =
        oneNewResolvedAct && resolvedI === resolvedCount - 1

      const nourishAmt = this.resolvedNourishByActIndex[resolvedI] ?? 0
      const pointsEarned = this.resolvedPointsEarnedByActIndex[resolvedI] ?? 0
      // Use printed points (e.g. Child after Birth), not basePoints — main bubble matches card.points.
      const printedPoints = act.card.points
      const effectAmt = pointsEarned - printedPoints - nourishAmt

      const tweenNourishFromStatus =
        oneNewResolvedAct && resolvedI === resolvedCount - 1 && nourishAmt !== 0
      const tweenEffectsFromStatus =
        oneNewResolvedAct && resolvedI === resolvedCount - 1 && effectAmt !== 0

      const shouldStagger = oneNewResolvedAct && resolvedI === resolvedCount - 1
      const r = Time.recapTween()
      const pushBubbleStep = (delay: number, fn: () => void) => {
        const ev = this.scene.time.delayedCall(delay, () => {
          if (!card.container.active) {
            return
          }
          fn()
        })
        this.bubbleStaggerEvents.push(ev)
      }

      if (shouldStagger) {
        pushBubbleStep(0, () => {
          this.resolveBubbles.addPointsResolveCircle(card, tweenBubbleFromStat)
        })
        let delay = r
        if (nourishAmt !== 0) {
          pushBubbleStep(delay, () => {
            this.resolveBubbles.addNourishResolveCircle(
              card,
              tweenNourishFromStatus,
              nourishAmt,
            )
          })
          delay += r
        }
        if (effectAmt !== 0) {
          pushBubbleStep(delay, () => {
            this.resolveBubbles.addEffectsResolveCircle(
              card,
              tweenEffectsFromStatus,
              effectAmt,
            )
          })
        }
      } else {
        this.resolveBubbles.addPointsResolveCircle(card, tweenBubbleFromStat)
        this.resolveBubbles.addNourishResolveCircle(
          card,
          tweenNourishFromStatus,
          nourishAmt,
        )
        this.resolveBubbles.addEffectsResolveCircle(
          card,
          tweenEffectsFromStatus,
          effectAmt,
        )
      }

      card.setResolved().moveToTopOnHover()

      this.temp.push(card)
    }

    let cards = []
    for (let i = 0; i < state.story.acts.length; i++) {
      const act = state.story.acts[i]

      let card = this.addCard(
        act.card,
        CardLocation.story(state, resolvedI + i, this.container, act.owner),
      ).moveToTopOnHover()

      // Apply glow based on various conditions
      if (act.card.qualities.includes(Quality.VISIBLE)) {
        card.setVisibleGlow()
      }
      // Visible via Sight
      else if (
        !state.isRecap &&
        state.status[0].vision > i &&
        act.owner === 1
      ) {
        card.setSeenGlow()
      }

      // Only allow jumping around in the recap if we are playing a recap
      if (state.isRecap && !Flags.mobile) {
        // card.setOnClick(this.callback(resolvedI + i))
      }

      card.container.setScale(SHRUNKEN_CARD_SCALE)

      cards.push(card)
      this.temp.push(card)
    }

    // Show changes in score
    if (state.isRecap) {
      this.displayScores(state)
    }

    // TODO This is just animating card coming from opps hand, confusing
    this.animate(state, cards)

    this.prevStatusNourish = [state.status[0].nourish, state.status[1].nourish]
    this.prevScore = [state.score[0], state.score[1]]
    this.lastResolvedActCount = resolvedCount

    this.cards = cards
  }

  // Set the callback for when an act in the story is clicked on
  setCallback(callback: (i: number) => () => void): void {
    this.callback = callback
  }

  // Display the current score totals and change in scores
  private displayScores(state: GameModel): void {
    // Recap +/- beside story — hidden for now (points bubble on resolve instead).
    // let index = state.story.resolvedActs.length - 1
    // if (index >= 0) {
    //   this.animateScoreGains(index, state.score, state)
    // }

    this.lastScores = state.score
  }

  // Animate each player gaining or losing points for the act at this index
  private animateScoreGains(
    index: number,
    scores: [number, number],
    state: GameModel,
  ): void {
    // TODO The first arg (state) should have a variable if squishing is possible
    const loc = CardLocation.story(state, index, this.container, undefined)

    // Form the string for the gain of the given player
    const getGain = (i: number) => {
      let amt = scores[i] - this.lastScores[i]
      if (amt < 0) {
        return amt.toString()
      } else if (amt === 0) {
        return ''
      } else {
        return `+${amt}`
      }
    }
    const txtGain = this.scene.add
      .text(...loc, `${getGain(1)}\n\n${getGain(0)}`, Style.cardResolution)
      .setOrigin(0.5)
    // .setAlpha(0)

    this.container.add(txtGain)
    this.scene.add.tween({
      targets: txtGain,
      alpha: 1,
      duration: Time.recapTween(),
      ease: 'Sine.easeInOut',
      yoyo: true,
      onComplete: function (tween, targets, _) {
        txtGain.destroy()
      },
    })
  }

  private animate(state: GameModel, cards: CardImage[]): void {
    if (state.story.acts.length === 0) {
      return
    }

    // If the last card was just played by the opponent,
    // animate it from their hand
    const lastAct = state.story.acts[state.story.acts.length - 1]
    const lastCardTheirs = lastAct.owner === 1
    const noPasses = state.passes === 0

    if (lastCardTheirs && noPasses && !state.isRecap) {
      // Animate the last card moving from their hand
      const card = cards[cards.length - 1]

      const x = card.container.x
      const y = card.container.y

      card.setPosition(
        CardLocation.theirHand(state, state.hand[1].length + 1, this.container),
      )

      // Animate moving x direction, appearing at start
      this.scene.tweens.add({
        targets: card.container,
        x: x,
        y: y,
        duration: Time.playCard(),
        onStart: (tween, targets, _) => {
          card.show()
          this.scene.playSound('play them')
        },
      })
    }
  }
}

/**
 * Points + nourish resolve bubbles on story cards (per-type `chrome-bubble*` art, BBCode text, tweens).
 */
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

  /** Nourish/effect: same small start as points bubble; large end is half the points bubble’s large size. */
  private static readonly NOURISH_EFFECT_RESOLVE_CIRCLE_RADIUS_LARGE =
    StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS_LARGE / 2
  private static readonly NOURISH_EFFECT_RESOLVE_FONT_LARGE_PX = Math.round(
    StoryResolveBubbles.POINTS_RESOLVE_FONT_LARGE_PX / 2,
  )

  /**
   * Rest position for nourish (bottom-right) / effect (bottom-left) relative to main
   * points bubble center (0,0). Tangency on the diagonal through each corner of the main ring.
   */
  private static secondaryBubbleRestAtMainCorner(
    corner: 'bottomRight' | 'bottomLeft',
  ): { x: number; y: number } {
    const R = StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS_LARGE
    const r = StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_CIRCLE_RADIUS_LARGE
    const d = (R + r) / Math.SQRT2
    return corner === 'bottomRight' ? { x: d, y: d } : { x: -d, y: d }
  }

  constructor(private readonly scene: Phaser.Scene) {}

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

  /**
   * Ring + points for a resolved act. Label uses {@link CardImage.points}.
   */
  addPointsResolveCircle(card: CardImage, tweenFromStat: boolean): void {
    const pts = card.points ?? card.card.points
    const bx = tweenFromStat ? card.txtPoints.x : 0
    const by = tweenFromStat ? card.txtPoints.y : 0
    const bubble = this.scene.add.container(bx, by)
    bubble.name = STORY_RESOLVE_BUBBLE_NAME

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

    const parent = card.container as Phaser.GameObjects.Container
    parent.addAt(bubble, parent.getIndex(card.txtPoints))

    if (tweenFromStat) {
      const grow = {
        fontPx: StoryResolveBubbles.POINTS_RESOLVE_FONT_SMALL_PX,
        radius: StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS,
      }
      this.scene.tweens.add({
        targets: bubble,
        x: 0,
        y: 0,
        duration: Time.recapTween(),
        ease: 'Sine.easeInOut',
      })
      this.scene.tweens.add({
        targets: grow,
        fontPx: StoryResolveBubbles.POINTS_RESOLVE_FONT_LARGE_PX,
        radius: StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS_LARGE,
        duration: Time.recapTween(),
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

  /**
   * Nourish bubble when that act consumed status nourish. Ends at bottom-right of the main bubble.
   */
  addNourishResolveCircle(
    card: CardImage,
    tweenFromStatus: boolean,
    nourishAmt: number,
  ): void {
    if (nourishAmt === 0) return

    const parent = card.container
    if (!(parent instanceof Phaser.GameObjects.Container)) return

    const { x: endX, y: endY } =
      StoryResolveBubbles.secondaryBubbleRestAtMainCorner('bottomRight')

    let bx: number
    let by: number
    if (tweenFromStatus) {
      const cam = this.scene.cameras.main
      const world = cam.getWorldPoint(cam.width / 2, cam.height - 200)
      const local = parent.pointToContainer(world)
      bx = local.x
      by = local.y
    } else {
      bx = endX
      by = endY
    }

    const bubble = this.scene.add.container(bx, by)
    bubble.name = STORY_RESOLVE_NOURISH_BUBBLE_NAME

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

    const pointsBubble = parent.list.find(
      (c) => c.name === STORY_RESOLVE_BUBBLE_NAME,
    )
    const insertAt = pointsBubble
      ? parent.getIndex(pointsBubble) + 1
      : parent.getIndex(card.txtPoints)
    parent.addAt(bubble, insertAt)

    if (tweenFromStatus) {
      const grow = {
        fontPx: StoryResolveBubbles.POINTS_RESOLVE_FONT_SMALL_PX,
        radius: StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS,
      }
      this.scene.tweens.add({
        targets: bubble,
        x: endX,
        y: endY,
        duration: Time.recapTween(),
        ease: 'Sine.easeInOut',
      })
      this.scene.tweens.add({
        targets: grow,
        fontPx: StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_FONT_LARGE_PX,
        radius: StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_CIRCLE_RADIUS_LARGE,
        duration: Time.recapTween(),
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

  /**
   * Bonus/malus beyond printed points + nourish (story slot, Predator prey, etc.):
   * score gained minus {@link Card#points} minus nourish. When animated, starts at {@link CardImage.txtText}.
   */
  addEffectsResolveCircle(
    card: CardImage,
    tweenFromEffectText: boolean,
    effectAmt: number,
  ): void {
    if (effectAmt === 0) return

    const parent = card.container
    if (!(parent instanceof Phaser.GameObjects.Container)) return

    const { x: endX, y: endY } =
      StoryResolveBubbles.secondaryBubbleRestAtMainCorner('bottomLeft')

    let bx: number
    let by: number
    if (tweenFromEffectText) {
      bx = card.txtText.x
      by = card.txtText.y
    } else {
      bx = endX
      by = endY
    }

    const bubble = this.scene.add.container(bx, by)
    bubble.name = STORY_RESOLVE_EFFECTS_BUBBLE_NAME

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

    const nourishBubble = parent.list.find(
      (c) => c.name === STORY_RESOLVE_NOURISH_BUBBLE_NAME,
    )
    const pointsBubble = parent.list.find(
      (c) => c.name === STORY_RESOLVE_BUBBLE_NAME,
    )
    const insertAt = nourishBubble
      ? parent.getIndex(nourishBubble) + 1
      : pointsBubble
        ? parent.getIndex(pointsBubble) + 1
        : parent.getIndex(card.txtPoints)
    parent.addAt(bubble, insertAt)

    if (tweenFromEffectText) {
      const grow = {
        fontPx: StoryResolveBubbles.POINTS_RESOLVE_FONT_SMALL_PX,
        radius: StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS,
      }
      this.scene.tweens.add({
        targets: bubble,
        x: endX,
        y: endY,
        duration: Time.recapTween(),
        ease: 'Sine.easeInOut',
      })
      this.scene.tweens.add({
        targets: grow,
        fontPx: StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_FONT_LARGE_PX,
        radius: StoryResolveBubbles.NOURISH_EFFECT_RESOLVE_CIRCLE_RADIUS_LARGE,
        duration: Time.recapTween(),
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
