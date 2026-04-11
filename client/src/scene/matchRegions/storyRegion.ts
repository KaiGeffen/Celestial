import 'phaser'
import {
  CardImage,
  STORY_RESOLVE_BUBBLE_NAME,
  STORY_RESOLVE_NOURISH_BUBBLE_NAME,
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

const CARD_SCALE = 0.8

export default class StoryRegion extends Region {
  lastScores: [number, number]

  /** Previous `state.story.resolvedActs.length` (for detecting a single new resolve). */
  private lastResolvedActCount = 0

  /** Status nourish at end of last `displayState` (before current state applied). */
  private prevStatusNourish: [number, number] = [0, 0]

  /** Parallel to `resolvedActs`: nourish amount consumed when that act resolved (0 = none). */
  private resolvedNourishByActIndex: number[] = []

  private resolveBubbles: StoryResolveBubbles

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

  displayState(state: GameModel): void {
    this.deleteTemp()

    const resolvedCount = state.story.resolvedActs.length
    const oneNewResolvedAct =
      resolvedCount === this.lastResolvedActCount + 1 && resolvedCount > 0

    if (resolvedCount < this.resolvedNourishByActIndex.length) {
      this.resolvedNourishByActIndex.length = resolvedCount
    }
    if (resolvedCount > this.resolvedNourishByActIndex.length) {
      const delta = resolvedCount - this.resolvedNourishByActIndex.length
      if (delta === 1 && oneNewResolvedAct) {
        const act = state.story.resolvedActs[resolvedCount - 1]
        this.resolvedNourishByActIndex.push(this.prevStatusNourish[act.owner])
      } else {
        for (let k = 0; k < delta; k++) {
          this.resolvedNourishByActIndex.push(0)
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

      card.container.setScale(CARD_SCALE)

      // Every resolved card needs a bubble so setResolved keeps art faded; only the
      // newest resolve this frame tweens from the points stat to center.
      const tweenBubbleFromStat =
        oneNewResolvedAct && resolvedI === resolvedCount - 1
      this.resolveBubbles.addPointsResolveCircle(card, tweenBubbleFromStat)

      const nourishAmt = this.resolvedNourishByActIndex[resolvedI] ?? 0
      const tweenNourishFromStatus =
        oneNewResolvedAct && resolvedI === resolvedCount - 1 && nourishAmt !== 0
      this.resolveBubbles.addNourishResolveCircle(
        card,
        tweenNourishFromStatus,
        nourishAmt,
      )

      card.setResolved(tweenBubbleFromStat).moveToTopOnHover()

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

      card.container.setScale(CARD_SCALE)

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
 * Points + nourish resolve bubbles on story cards (local tweens, BBCode text, ring geometry).
 */
class StoryResolveBubbles {
  private static readonly STAT_STROKE = '#000000'

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

  /** Final X for nourish bubble (points bubble ends at 0,0). */
  private static readonly NOURISH_BUBBLE_OFFSET_X = 78

  constructor(private readonly scene: Phaser.Scene) {}

  /**
   * Ring + points for a resolved act. {@link CardImage.setResolved} keeps the bubble
   * and fades the rest — so every resolved row must have one.
   */
  addPointsResolveCircle(card: CardImage, tweenFromStat: boolean): void {
    const pts = card.points ?? card.card.points
    const bx = tweenFromStat ? card.txtPoints.x : 0
    const by = tweenFromStat ? card.txtPoints.y : 0
    const bubble = this.scene.add.container(bx, by)
    bubble.name = STORY_RESOLVE_BUBBLE_NAME

    const circle = this.scene.add.circle(
      0,
      0,
      StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS,
      Color.black,
      0.92,
    )
    circle.setStrokeStyle(2, Color.white, 0.9)
    circle.setOrigin(0.5)

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

    if (!tweenFromStat) {
      circle.setRadius(StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS_LARGE)
    }

    bubble.add([circle, txtPts])

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
          circle.setRadius(grow.radius)
          txtPts.setStyle(
            StoryResolveBubbles.resolvePointsBubbleTextStyle(grow.fontPx),
          )
        },
      })
    }
  }

  /**
   * Nourish bubble when that act consumed status nourish. Sits beside the points bubble.
   */
  addNourishResolveCircle(
    card: CardImage,
    tweenFromStatus: boolean,
    nourishAmt: number,
  ): void {
    if (nourishAmt === 0) return

    const parent = card.container
    if (!(parent instanceof Phaser.GameObjects.Container)) return

    const endX = StoryResolveBubbles.NOURISH_BUBBLE_OFFSET_X
    const endY = 0

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

    const circle = this.scene.add.circle(
      0,
      0,
      StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS,
      0x053327,
      0.92,
    )
    circle.setStrokeStyle(2, Color.white, 0.9)
    circle.setOrigin(0.5)

    const label = `${nourishAmt}`
    const txtNourish = this.scene.add
      .rexBBCodeText(
        0,
        0,
        `[stroke=${StoryResolveBubbles.STAT_STROKE}]${label}[/stroke]`,
        tweenFromStatus
          ? BBStyle.cardCost
          : StoryResolveBubbles.nourishResolveBubbleTextStyle(
              StoryResolveBubbles.POINTS_RESOLVE_FONT_LARGE_PX,
            ),
      )
      .setOrigin(0.5)

    if (!tweenFromStatus) {
      circle.setRadius(StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS_LARGE)
    }

    bubble.add([circle, txtNourish])

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
        fontPx: StoryResolveBubbles.POINTS_RESOLVE_FONT_LARGE_PX,
        radius: StoryResolveBubbles.POINTS_RESOLVE_CIRCLE_RADIUS_LARGE,
        duration: Time.recapTween(),
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          circle.setRadius(grow.radius)
          txtNourish.setStyle(
            StoryResolveBubbles.nourishResolveBubbleTextStyle(grow.fontPx),
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
        Math.round(t * (fontPx / StoryResolveBubbles.POINTS_RESOLVE_FONT_SMALL_PX)),
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
        Math.round(t * (fontPx / StoryResolveBubbles.POINTS_RESOLVE_FONT_SMALL_PX)),
      ),
    }
  }
}
