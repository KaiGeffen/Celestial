import Card from '../card'
import { Quality } from '../quality'
import GameModel from '../gameModel'
// import { wound } from './tokens'

class Dagger extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    game.discard(player ^ 1)
  }

  ratePlay(world: GameModel): number {
    return this.rateDiscard(world)
  }
}
const dagger = new Dagger({
  name: 'Dagger',
  id: 1,
  cost: 1,
  text: 'Your opponent discards a card.',
  story:
    'I have a point now\nI am no longer alone, scattered \nBut trained wholly on the promise\nOf your body, squirming',
})

class Shadow extends Card {
  getCost(player: number, game: GameModel): number {
    return game.hand[player ^ 1].length
  }

  rateDelay(world) {
    return 10
  }
}
const shadow = new Shadow({
  name: 'Shadow',
  id: 19,
  cost: 6,
  points: 3,
  text: "Costs X, where X is the number of cards in your opponent's hand.",
  story:
    'Your pain blooms like flowers on a misty day.\nI breathe it in.\nPerhaps I can rest now.',
})

class Imprison extends Card {
  onRoundEndIfThisResolved(player: number, game: GameModel) {
    // If opponent had 2 or fewer points
    if (game.score[player ^ 1] <= 2) {
      // Give them Nourish -1
      game.status[player ^ 1].nourish -= 1
    }
  }
}
const imprison = new Imprison({
  name: 'Imprison',
  id: 35,
  cost: 3,
  points: 3,
  text: 'At the end of this round, if your opponent has two or fewer points, they Nourish -1.',
  story:
    "All tied up\ncan't even stand\nAm I lethal to you and yours\nMy tight bonds calm me.",
})

class Nightmare extends Card {
  onMorning(player: number, game: GameModel, index: number) {
    if (game.hand[player ^ 1].length < game.hand[player].length) {
      game.create(player, shadow)
      return true
    }
    return false
  }
}
const nightmare = new Nightmare({
  name: 'Nightmare',
  id: 68,
  cost: 2,
  points: 2,
  text: 'Morning: If you have more cards in hand than your opponent, create a Shadow in hand.',
  story:
    'I struggle to find myself\nBetween the claws and biting words\nShearing my mind away',
})

class Boa extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    const nourished = game.status[player].nourish !== 0
    super.play(player, game, index, bonus)
    if (nourished) {
      game.discard(player ^ 1)
      game.draw(player)
    }
  }
}
const boa = new Boa({
  name: 'Boa',
  id: 57,
  cost: 6,
  points: 6,
  text: 'If this is nourished, your opponent discards a card and you draw a card.',
  story: 'I reach I win I have it.\nIt is all mine now!\nCan I make it me?',
})

class HungryGhost extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.starve(4, game, player)
  }

  rateDelay(world) {
    return 12
  }
}
const hungryGhost = new HungryGhost({
  name: 'Hungry Ghost',
  id: 31,
  cost: 2,
  points: 4,
  text: 'Nourish -4',
})

class Hurricane extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.reset(game)
  }

  ratePlay(world: GameModel): number {
    return this.rateReset(world)
  }
}
const hurricane = new Hurricane({
  name: 'Hurricane',
  id: 13,
  cost: 4,
  text: "Set both players' points to 0.",
})

class WingClipping extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    // Worth 2 less for each card in the opponent's hand
    bonus -= 2 * game.hand[player ^ 1].length

    super.play(player, game, index, bonus)

    // The opponent discards 2 cards
    game.discard(player ^ 1, 2)
  }
}
const wingClipping = new WingClipping({
  name: 'Wing Clipping',
  id: 16,
  cost: 5,
  points: 6,
  text: "Worth -2 for each card in the opponent's hand. Your opponent discards 2 cards.",
  story:
    'We walked and ran and played then\nYou leave me behind\nI gasp as the space between us grows',
})

class Sickness extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.starve(4, game, player ^ 1)
    game.create(player ^ 1, sickness)
  }
}
const sickness = new Sickness({
  name: 'Sickness',
  id: 58,
  cost: 3,
  points: -1,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nGive your opponent Nourish -4, create a Sickness in their hand.',
})

// BETA
class Victim extends Card {
  onRoundEndIfThisResolved(player: number, game: GameModel) {
    const scoreAboveWinning = game.score[player ^ 1] - game.score[player]
    const amt = Math.max(0, scoreAboveWinning)
    game.status[player ^ 1].nourish -= amt
  }
}
const victim = new Victim({
  name: 'Victim',
  id: 43,
  cost: 1,
  text: 'If you lose this round, Nourish -1 your opponent for each point you lost by.',
})

// class Rupture extends Card {
//   play(player: number, game: GameModel, index: number, bonus: number) {
//     super.play(player, game, index, bonus)
//     game.create(player ^ 1, wound)
//   }
// }
// const rupture = new Rupture({
//   name: 'Rupture',
//   id: 72,
//   cost: 1,
//   text: "Create a Wound in your opponent's hand.",
// })

class LostInShadow extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    if (
      !game.story.acts.some((act) => act.owner === player && act.card.cost >= 6)
    ) {
      game.discard(player, 10)
    }
  }
}
const lostInShadow = new LostInShadow({
  name: 'Lost in Shadow',
  id: 47,
  cost: 2,
  points: 4,
  text: 'Discard your hand unless you have a card with base-cost 6 or more later in the story.',
})

class Vampire extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    bonus -= game.score[player ^ 1]
    super.play(player, game, index, bonus)
  }

  getCost(player: number, game: GameModel): number {
    return Math.max(0, this.cost - game.story.acts.length)
  }
}
const vampire = new Vampire({
  name: 'Vampire',
  id: 49,
  cost: 6,
  points: 6,
  text: "Worth -X where X is your opponent's points.\nCosts 1 less for each card in the story.",
})

export {
  dagger,
  shadow,
  imprison,
  nightmare,
  boa,
  hungryGhost,
  hurricane,
  wingClipping,
  sickness,
  victim,
  // rupture,
  lostInShadow as craving,
  vampire,
}
