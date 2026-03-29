import Card from '../card'
import { Quality } from '../quality'
import GameModel from '../gameModel'
import { Zone } from '../zone'
import { Animation } from '../../animation'

class Seen extends Card {
  onUpkeepInHand(
    player: number,
    game: GameModel,
    index: number,
  ): [boolean, boolean] {
    game.status[player ^ 1].vision += 4
    return [true, false]
  }
}
const seen = new Seen({
  name: 'Seen',
  id: 1001,
  cost: 2,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nAt the start of each round, if this is in your hand, give your opponent Sight 4.',
  theme: 5,
})

class Ashes extends Card {
  play(player: number, game: GameModel, index: number, bonus: number): void {
    super.play(player, game, index, bonus)
    game.draw(player, 1)
  }
}
const ashes = new Ashes({
  name: 'Ashes',
  id: 1002,
  cost: 1,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nDraw a card.',
  theme: 1,
})

const child = new Card({
  name: 'Child',
  id: 1003,
  qualities: [Quality.FLEETING],
  text: 'Fleeting',
  theme: 4,
})

class Predator extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    // NOTE This name must match the name of the card that creates it
    bonus += game.pile[player ^ 1].reduce(
      (acc: number, card: Card) => acc + (card.name === 'Prey' ? 2 : 0),
      0,
    )
    super.play(player, game, index, bonus)
  }
}
const predator = new Predator({
  name: 'Predator',
  id: 1004,
  cost: 1,
  qualities: [Quality.FLEETING],
  text: "Fleeting\nWorth +2 for each Prey in your opponent's discard pile.",
  theme: 5,
})

class Wound extends Card {
  onDiscard(player: number, game: GameModel): boolean {
    game.animations[player].push(
      new Animation({
        from: Zone.Discard,
        to: Zone.Story,
        index: game.pile[player].length - 1,
        index2: game.story.resolvedActs.length + 1,
      }),
    )

    // Remove this from the discard pile
    game.pile[player].pop()

    game.story.addAct(this, player, 0)

    return true
  }
}
const wound = new Wound({
  name: 'Wound',
  id: 1005,
  points: -3,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nWhen this is discarded, add it next in the story.',
  theme: 2,
})

const heirloom = new Card({
  name: 'Heirloom',
  id: 1006,
  points: 4,
  theme: 4,
})

class Condemnation extends Card {
  onShuffle(player: number, game: GameModel, index: number) {
    super.onShuffle(player, game, index)

    game.deck[player].splice(index, 1)
    game.story.addAct(this, player, 0)
  }
}
const condemnation = new Condemnation({
  name: 'Condemnation',
  id: 1007,
  cost: 9,
  points: -3,
  qualities: [Quality.VISIBLE],
  text: 'Visible\nWhen this is shuffled, add it to the story.',
})

class Ice extends Card {
  onDraw(player: number, game: GameModel): void {
    // Remove from hand
    game.hand[player].splice(game.hand[player].length - 1, 1)

    // At night, add to the beginning of the story. During the day, add to the end.
    const index = game.isRecap ? 0 : game.story.acts.length
    game.story.addAct(this, player, index)

    // TODO Add animation
    game.animations[player].push(
      new Animation({
        from: Zone.Hand,
        to: Zone.Story,
        card: this,
        // Not -1 because it has been removed by this point
        index: game.hand[player].length,
        // TODO This goes to where the triggering card is, not to where this ends up, and has bugs with multiple triggers (Fishing Boat)
        index2: index,
      }),
    )
  }
}
const ice = new Ice({
  name: 'Ice',
  id: 1008,
  cost: 1,
  points: 1,
  qualities: [Quality.VISIBLE],
  text: 'Visible\nWhen drawn, add this to the story.',
  beta: true,
})

export { seen, ashes, child, predator, wound, heirloom, condemnation, ice }
