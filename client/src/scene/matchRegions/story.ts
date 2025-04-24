import 'phaser'
import { CardImage } from '../../lib/cardImage'
import GameModel from '../../../../shared/state/gameModel'
import { Space, Style, Depth, Time, Flags } from '../../settings/settings'
import { GameScene } from '../gameScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'
import Act from '../../../../shared/state/act'

export default class StoryRegion extends Region {
  lastScores: [number, number]

  // Callback that plays when ith card in recap is clicked on
  callback: (i: number) => () => void

  // This is slightly wrong, because the top hand is smaller than this hand height
  MIDDLE = Space.windowHeight / 2 - Space.handHeight

  create(scene: GameScene): StoryRegion {
    this.scene = scene
    this.lastScores = [0, 0]

    this.container = scene.add
      .container(0, Space.handHeight)
      .setDepth(Depth.storyAtDay)

    return this
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

    // Set the correct depth based on day/night
    this.container.setDepth(
      state.isRecap ? Depth.storyAtNight : Depth.storyAtDay,
    )

    // If this is a recap, add the already played cards greyed out
    // TODO
    let resolvedI = 0
    for (; resolvedI < state.story.resolvedActs.length; resolvedI++) {
      const act: Act = state.story.resolvedActs[resolvedI]

      let card = this.addCard(
        act.card,
        CardLocation.story(state, resolvedI, this.container, act.owner),
      )
        .setResolved()
        .moveToTopOnHover()
        .setOnClick(this.callback(resolvedI))

      this.temp.push(card)
    }

    let cards = []
    for (let i = 0; i < state.story.acts.length; i++) {
      const act = state.story.acts[i]

      let card = this.addCard(
        act.card,
        CardLocation.story(state, resolvedI + i, this.container, act.owner),
      ).moveToTopOnHover()

      // Only allow jumping around in the recap if we are playing a recap
      if (state.isRecap && !Flags.mobile) {
        card.setOnClick(this.callback(resolvedI + i))
      }

      cards.push(card)
      this.temp.push(card)
    }

    // Show changes in score
    if (state.isRecap) {
      this.displayScores(state)
    }

    this.animate(state, cards)

    this.cards = cards
  }

  // Set the callback for when an act in the story is clicked on
  setCallback(callback: (i: number) => () => void): void {
    this.callback = callback
  }

  // Display the current score totals and change in scores
  private displayScores(state: GameModel): void {
    let index = state.story.resolvedActs.length - 1
    if (index >= 0) {
      this.animateScoreGains(index, state.score, state)
    }

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
    // If the last card was just played by the opponent,
    // animate it from their hand
    if (state.story.acts.length === 0) {
      return
    }

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
