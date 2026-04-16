import Card from '../card'
import { Quality } from '../quality'
import GameModel from '../gameModel'
import { Zone } from '../zone'
import { Animation } from '../../animation'

class Updraft extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    // TODO Refactor out this behavior
    for (let i = 0; i < game.story.acts.length; i++) {
      const act = game.story.acts[i]

      // If it's your card and you can move forward
      const isYourCard = act.owner === player
      const canMoveForward = i + 1 < game.story.acts.length
      if (isYourCard && canMoveForward) {
        const replacedAct = game.story.acts[i + 1]
        game.story.acts[i + 1] = act
        game.story.acts[i] = replacedAct
      }
    }
  }
}
const updraft = new Updraft({
  name: 'Updraft',
  id: 9066,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nMove your next card in the story forward one spot.',
  beta: true,
})

class Groundwork extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    // Bonus +2 for each of your cards before this and after this that aren't interrupted by your opponent's cards
    super.play(player, game, index, bonus)
  }
}
const groundwork = new Groundwork({
  name: 'Groundwork',
  id: 9002,
  cost: 1,
  text: 'Worth +2 for each of your cards in a row with this.',
  beta: true,
})

export // updraft
 {}
