import Card from '../card'
import { Zone } from '../zone'
import { MAX_STORY_ACTS } from '../../settings'
import GameModel from '../gameModel'

// TODO Break out, make settings, and make dry this behavior
class Paramountcy extends Card {
  play(player, game: GameModel, index, bonus) {
    super.play(player, game, index, bonus)

    // Get the number of cards to add to the story (Don't go over 99 in total)
    const totalActsInStory = game.story.acts.length + index
    const allowedActsRemaining = MAX_STORY_ACTS - totalActsInStory
    let amt = Math.min(4, game.pile[player].length, allowedActsRemaining)

    // The number of copies of paramountcy that have been skipped in the discard
    let paramountcyCount = 0
    for (let i = 0; i < amt; i++) {
      // Get the top card that is not paramountcy
      const targetIndex = game.pile[player].length - paramountcyCount - 1
      const card = game.pile[player][targetIndex]

      if (card) {
        // Don't add copies of paramountcy, and don't count them
        if (card.id === this.id) {
          paramountcyCount++
          amt--
        } else {
          game.moveBetweenZones(Zone.Discard, Zone.Story, player, targetIndex, {
            toIndex: i - paramountcyCount,
          })
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
  theme: 8,
})

export { paramountcy }
