import 'phaser'
import { CardImage } from '../../lib/cardImage'
import GameModel from '../../../../shared/state/gameModel'
import {
  Space,
  Style,
  Depth,
  Time,
  Flags,
  Color,
} from '../../settings/settings'
import { MatchScene } from '../matchScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'
import Act from '../../../../shared/state/act'
import { Quality } from '../../../../shared/state/quality'
import { SHRUNKEN_CARD_SCALE } from './matchRegionSettings'

export default class StoryRegion extends Region {
  lastScores: [number, number]

  /** Resolved-act count after last `displayState`; pairs with animator snapshot for `oneNewResolvedAct`. */
  private lastStoryResolvedActCount = 0

  /** One `CardImage` per `resolvedActs` entry, in story order. */
  resolvedCards: CardImage[] = []

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
    this.resolvedCards = []

    // Set the correct depth based on day/night
    this.container.setDepth(
      state.isRecap ? Depth.storyAtNight : Depth.storyAtDay,
    )

    // If this is a recap, add the already played cards greyed out
    // TODO: Either enable the onClick callback or remove its api
    const resolvedCount = state.story.resolvedActs.length
    const oneNewResolvedAct =
      resolvedCount === this.lastStoryResolvedActCount + 1 && resolvedCount > 0

    let resolvedI = 0
    for (; resolvedI < resolvedCount; resolvedI++) {
      const act: Act = state.story.resolvedActs[resolvedI]

      let card = this.addCard(
        act.card,
        CardLocation.story(state, resolvedI, this.container, act.owner),
      )
      // .setOnClick(this.callback(resolvedI))

      card.container.setScale(SHRUNKEN_CARD_SCALE)

      this.resolvedCards.push(card)

      const animateSettle = oneNewResolvedAct && resolvedI === resolvedCount - 1
      card.setResolved(animateSettle).moveToTopOnHover()

      this.temp.push(card)
    }

    this.lastStoryResolvedActCount = resolvedCount

    let cards = []
    for (let i = 0; i < state.story.acts.length; i++) {
      const act = state.story.acts[i]

      let card = this.addCard(
        act.card,
        CardLocation.story(state, resolvedI + i, this.container, act.owner),
      ).moveToTopOnHover()

      // Apply glow based on various conditions
      if (act.revealed || act.card.qualities.includes(Quality.VISIBLE)) {
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
      this.lastScores = state.score
    }

    // TODO This is just animating card coming from opps hand, confusing
    this.animate(state, cards)

    this.cards = cards
  }

  // Set the callback for when an act in the story is clicked on
  setCallback(callback: (i: number) => () => void): void {
    this.callback = callback
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
        duration: Time.match.playCard,
        onStart: (tween, targets, _) => {
          card.show()
          this.scene.playSound('play them')
        },
      })
    }
  }
}
