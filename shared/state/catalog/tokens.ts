import Card from '../card'
import { Quality } from '../effects'
import GameModel from '../gameModel'
import { Keywords } from '../keyword'
import { Zone } from '../zone'
import { Animation } from '../../animation'
// import { prey } from './vision'

class Seen extends Card {
  onUpkeepInHand(player: number, game: GameModel, index: number): boolean {
    game.vision[player ^ 1] += 4
    return true
  }
}
const seen = new Seen({
  name: 'Seen',
  id: 1001,
  cost: 2,
  qualities: [Quality.FLEETING],
  text: 'Fleeting.\nAt the start of each round, if this is in your hand, give your opponent Sight 4.',
  keywords: [
    { name: Keywords.fleeting, x: 0, y: 30 },
    { name: Keywords.sight, x: 0, y: 130, value: 4 },
  ],
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
  keywords: [{ name: Keywords.fleeting, x: 0, y: 102 }],
})

const child = new Card({
  name: 'Child',
  id: 1003,
  qualities: [Quality.FLEETING],
  text: 'Fleeting',
  keywords: [{ name: Keywords.fleeting, x: 0, y: 130 }],
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
  keywords: [{ name: Keywords.fleeting, x: 0, y: 61 }],
  // 176, 77
  // references: [{ card: prey, x: 59, y: 77 }],
})

// BETA
class Wound extends Card {
  onDiscard(player: number, game: GameModel, index: number) {
    game.animations[player].push(
      new Animation({
        from: Zone.Discard,
        to: Zone.Story,
        index: index,
        // TODO This index is wrong, doesn't count resolved cards, and off by 1
        index2: game.story.acts.length - 1,
      }),
    )

    game.story.addAct(this, player)
  }
}
const wound = new Wound({
  name: 'Wound',
  id: 1006,
  points: -3,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nWhen this is discarded, add it to the story.',
  beta: true,
})

const heirloom = new Card({
  name: 'Heirloom',
  id: 1007,
  points: 4,
  beta: true,
})

export {
  seen,
  ashes,
  child,
  predator,
  // BETA
  wound,
  heirloom,
}
