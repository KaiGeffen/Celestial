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
    game.status[player ^ 1].vision += 3
    return [true, false]
  }
}
const seen = new Seen({
  name: 'Seen',
  id: 1001,
  cost: 2,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nAt the start of each round, if this is in your hand, give your opponent Sight 3.',
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
})

const child = new Card({
  name: 'Child',
  id: 1003,
  qualities: [Quality.FLEETING],
  text: 'Fleeting',
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
})

class Wound extends Card {
  onDiscard(player: number, game: GameModel) {
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
  }
}
const wound = new Wound({
  name: 'Wound',
  id: 1005,
  points: -3,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nWhen this is discarded, add it next in the story.',
})

const heirloom = new Card({
  name: 'Heirloom',
  id: 1006,
  points: 4,
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

export { seen, ashes, child, predator, wound, heirloom, condemnation }
