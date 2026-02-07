import Card from '../card'
import { Animation } from '../../animation'
import { Zone } from '../zone'
import { MAX_STORY_ACTS } from '../../settings'
import GameModel from '../gameModel'

// TODO Break out, make settings, and make dry this behavior
class Paramountcy extends Card {
  play(player, game: GameModel, index, bonus) {
    super.play(player, game, index, bonus)

    const allowedActsRemaining = MAX_STORY_ACTS - game.story.acts.length - index
    let amt = Math.min(4, game.pile[player].length, allowedActsRemaining)
    // The number of copies of paramountcy that have been skipped in the discard
    let paramountcyCount = 0
    for (let i = 0; i < amt; i++) {
      const targetIndex = game.pile[player].length - paramountcyCount - 1
      if (game.pile[player].length > 0 && game.pile[player][targetIndex]) {
        const card = game.pile[player][targetIndex]

        // Don't add copies of paramountcy
        if (card.id === this.id) {
          paramountcyCount++
        } else {
          // Remove the card from the discard pile
          game.pile[player].splice(targetIndex, 1)

          // Add it to the story
          game.story.addAct(card, player, i - paramountcyCount)

          // Animate the move
          game.animations[player].push(
            new Animation({
              from: Zone.Discard,
              to: Zone.Story,
              index2: i,
            }),
          )
        }
      }
    }
  }
}
const paramountcy = new Paramountcy({
  name: 'Paramountcy',
  cost: 9,
  id: 62,
  text: 'Add the top four cards of your discard pile to the story after this.\n(Besides Paramountcy)',
})

export { paramountcy }
