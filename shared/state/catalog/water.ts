import Card from '../card'
import GameModel from '../gameModel'
import { Keywords } from '../keyword'

class Mercy extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    for (let i = 0; i < 2; i++) {
      game.draw(i, 1)
    }
  }
}
const mercy = new Mercy({
  name: 'Mercy',
  id: 12,
  cost: 3,
  points: 3,
  text: 'Each player draws a card.',
})

class Excess extends Card {
  getCost(player: number, game: GameModel) {
    let amt = 0

    for (const act of game.story.acts) {
      if (act.owner === player) {
        amt += 1
      }
    }

    return amt === 4 ? 0 : this.cost
  }
}
const excess = new Excess({
  name: 'Excess',
  id: 46,
  cost: 7,
  points: 7,
  text: 'Costs 0 if you have exactly four cards in the story.',
})

class FishingBoat extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    for (let i = 0; i < 3; i++) {
      game.tutor(player, 1)
    }
  }
}
const fishingBoat = new FishingBoat({
  name: 'Fishing Boat',
  id: 32,
  cost: 2,
  points: 1,
  text: 'Put the top 3 cards with base cost 1 from your deck into your hand.',
})

class Drown extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    game.mill(player, 3)
  }
}
const drown = new Drown({
  name: 'Drown',
  id: 5,
  cost: 1,
  points: 1,
  text: 'Discard the top three cards of your deck.',
})

class Iceberg extends Card {
  getCost(player: number, game: GameModel) {
    return Math.max(0, this.cost - game.amtPasses[player])
  }

  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    game.draw(player, 2)
  }
}
const iceberg = new Iceberg({
  name: 'Iceberg',
  id: 54,
  cost: 4,
  points: 2,
  text: 'Draw two cards.\nCosts 1 less for each time you’ve passed this round.',
})

class Dew extends Card {
  onMorning(player: number, game: GameModel, index: number) {
    game.create(player, dew)
    return true
  }
}
const dew = new Dew({
  name: 'Dew',
  id: 63,
  cost: 1,
  points: 1,
  text: 'Morning: Create a Dew in your hand.',
  story: 'I return\nOver and over again\nSwelling the future',
  keywords: [{ name: Keywords.morning, x: 0, y: 82 }],
})

class GentleRain extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    const amt = game.amtDrawn[player]

    this.nourish(amt, game, player)
  }
}
const gentleRain = new GentleRain({
  name: 'Gentle Rain',
  id: 71,
  cost: 4,
  points: 2,
  text: "Nourish 1 for each card you've drawn this round.",
  keywords: [{ name: Keywords.nourish, x: -32, y: 88, value: 1 }],
})

// BETA
class Refresh extends Card {
  onPlay(player: number, game: GameModel): void {
    if (game.hand[player].length > 0) {
      const card = game.hand[player].shift()
      game.deck[player].unshift(card)
      game.draw(player, 1)
    }
  }
}
const refresh = new Refresh({
  name: 'Refresh',
  id: 200,
  cost: 1,
  points: 1,
  text: 'When played, put the leftmost card in your hand on the bottom of your deck, then draw a card if you did. Your opponent doesn’t see you do this.',
  beta: true,
})

class Overflow extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus + game.hand[player].length)
  }

  onPlay(player: number, game: GameModel): void {
    if (game.hand[player].length > 0) {
      const card = game.hand[player].shift()
      game.deck[player].unshift(card)
      game.draw(player, 1)
    }
  }
}
const overflow = new Overflow({
  name: 'Overflow',
  id: 201,
  cost: 3,
  points: 0,
  text: 'Refresh.\nWorth +1 for each card in your hand.',
  beta: true,
})

class Fish extends Card {
  onDraw(player: number, game: GameModel): void {
    // Create a new copy of the card, but with 1 more point
    const copy = Object.create(
      Object.getPrototypeOf(this),
      Object.getOwnPropertyDescriptors(this),
    )
    copy.points += 1

    game.hand[player][game.hand[player].length - 1] = copy
  }
}
const fish = new Fish({
  name: 'Fish',
  id: 202,
  cost: 3,
  points: 2,
  text: 'When you draw this, increase its points by 1 permanently.',
  beta: true,
})

class Cloud extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (super.exhale(2, game, player)) {
      game.draw(player, 3)
    }
  }

  onPlay(player: number, game: GameModel): void {
    if (game.hand[player].length > 0) {
      const card = game.hand[player].shift()
      game.deck[player].unshift(card)
      game.draw(player, 1)
    }
  }
}
const cloud = new Cloud({
  name: 'Cloud',
  id: 7202,
  cost: 5,
  points: 5,
  text: 'Refresh.\nExhale 2: Draw 3 cards.',
  beta: true,
})

// A pearl? Some crystal jewelery
class Precious extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    const length = game.hand[player].length
    game.discard(player, length)
    game.draw(player, length)
  }
}
const precious = new Precious({
  name: 'Precious',
  id: 7210,
  cost: 2,
  points: 2,
  text: 'Discard your hand, draw that many cards.',
  beta: true,
})

class Unfolding extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (super.exhale(5, game, player)) {
      bonus += game.story.acts.length
    }

    super.play(player, game, index, bonus)

    if (super.exhale(1, game, player)) {
      game.draw(player)
    }
  }
}
const unfolding = new Unfolding({
  name: 'Unfolding',
  id: 7212,
  text: 'Exhale 5: Worth +1 for each card later in the story.\nExhale 1: Draw a card.',
  beta: true,
})

class Jormungandr extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.removeAct(0)
    game.mill(player, 2)
  }
}
const jormungandr = new Jormungandr({
  name: 'Jörmungandr',
  id: 7216,
  cost: 9,
  points: 9,
  text: 'Discard the next card in the story and the top 2 cards of your deck.',
  beta: true,
})

class Crabs extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (game.score[player] < game.score[player ^ 1]) {
      bonus += 2
    }

    super.play(player, game, index, bonus)

    if (game.hand[player].length < game.hand[player ^ 1].length) {
      game.draw(player, 2)
    }
  }
}
const crabs = new Crabs({
  name: 'Crabs',
  id: 7217,
  cost: 2,
  text: 'If you have fewer points than your opponent, worth +2. If you have fewer cards in hand, draw 2.',
  beta: true,
})

class LeveeBreaks extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    // Initiation
    if (super.exhale(1, game, player)) {
      game.discard(player, 3)

      for (const card of game.hand[player]) {
        game.story.addAct(card, player)
      }
    }

    // Return
    if (super.exhale(1, game, player)) {
      super.inspire(1, game, player)
    }
  }
}
const leveeBreaks = new LeveeBreaks({
  name: 'Levee Breaks',
  id: 8369,
  cost: 4,
  points: 4,
  text: 'Exhale 1: Discard 3 cards. Add your hand to the story.',
  beta: true,
})

/*
Burst damn
Invisible hand
jormungandr
*/

export {
  mercy,
  excess,
  fishingBoat,
  drown,
  iceberg,
  dew,
  gentleRain,
  // BETA
  refresh,
  fish,
  cloud,
  precious,
  overflow,
  unfolding,
  // THIS MANY CARDS
  crabs,
  leveeBreaks,
}
