import 'phaser'
import { CardImage, STORY_RESOLVE_BUBBLE_NAME } from '../../lib/cardImage'
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

/** Matches `STAT_STROKE` in `cardImage.ts` (cost / points BBCode). */
const STAT_STROKE = '#000000'

/** Radius of the ring drawn at the points stat when an act resolves into `resolvedActs`. */
const POINTS_RESOLVE_CIRCLE_RADIUS = 18

export default class StoryRegion extends Region {
  lastScores: [number, number]

  /** Previous `state.story.resolvedActs.length` (for detecting a single new resolve). */
  private lastResolvedActCount = 0

  // Callback that plays when ith card in recap is clicked on
  callback: (i: number) => () => void

  // This is slightly wrong, because the top hand is smaller than this hand height
  MIDDLE = Space.windowHeight / 2 - Space.handHeight

  create(scene: MatchScene): StoryRegion {
    this.scene = scene
    this.lastScores = [0, 0]

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
      this.addPointsResolveCircle(card, tweenBubbleFromStat)

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

    this.lastResolvedActCount = resolvedCount

    this.cards = cards
  }

  /**
   * Ring + points for a resolved act. {@link CardImage.setResolved} keeps the bubble
   * and fades the rest — so every resolved row must have one.
   * @param tweenFromStat If true, bubble starts at {@link CardImage.txtPoints} and tweens to center; if false, placed at center (already-resolved rows on later frames).
   */
  private addPointsResolveCircle(
    card: CardImage,
    tweenFromStat: boolean,
  ): void {
    const pts = card.points ?? card.card.points
    const bx = tweenFromStat ? card.txtPoints.x : 0
    const by = tweenFromStat ? card.txtPoints.y : 0
    const bubble = this.scene.add.container(bx, by)
    bubble.name = STORY_RESOLVE_BUBBLE_NAME

    const circle = this.scene.add.circle(
      0,
      0,
      POINTS_RESOLVE_CIRCLE_RADIUS,
      Color.black,
      0.92,
    )
    circle.setStrokeStyle(2, Color.white, 0.9)
    circle.setOrigin(0.5)

    const txtPts = this.scene.add
      .rexBBCodeText(
        0,
        0,
        `[stroke=${STAT_STROKE}]${pts}[/stroke]`,
        BBStyle.cardCost,
      )
      .setOrigin(0.5)

    bubble.add([circle, txtPts])

    const parent = card.container as Phaser.GameObjects.Container
    parent.addAt(bubble, parent.getIndex(card.txtPoints))

    if (tweenFromStat) {
      this.scene.tweens.add({
        targets: bubble,
        x: 0,
        y: 0,
        duration: Time.recapTween(),
        ease: 'Sine.easeInOut',
      })
    }
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
