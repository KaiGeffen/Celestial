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
})

class Primal extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    for (let i = 0; i < game.story.acts.length; ) {
      const act = game.story.acts[i]

      // How many cards were added/removed from the story
      let deltaStoryLength = 0

      // Find a card in hand with the same cost
      for (let j = 0; j < game.hand[player].length; j++) {
        const card = game.hand[player][j]
        if (card.cost === act.card.cost) {
          // Discard card from story
          const actReturned = game.removeAct(i)
          deltaStoryLength += actReturned ? 0 : -1

          // Discard card from hand, track if it added to story
          const discardedCardReturned = game.discard(player, 1, j)
          deltaStoryLength += discardedCardReturned ? 0 : 1

          // Stop looking in hand for this story card
          break
        }
      }

      // Update the story index based on how many cards added/removed
      i -= deltaStoryLength
    }
  }
}
const primal = new Primal({
  name: 'Primal',
  id: 9003,
  // cost: 7,
  points: 7,
  text: 'For each card later in the story, discard it and a card from your hand that share a cost.',
})

class Retain extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.retain(1, game, player)
  }
}
const retain = new Retain({
  name: 'Retain',
  id: 9004,
  cost: 1,
  points: 1,
  text: 'Retain 1',
})

export { primal, retain }
