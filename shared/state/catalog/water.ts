import Card, { RefreshCard } from '../card'
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
})

// BETA
const refresh = new RefreshCard({
  name: 'Refresh',
  id: 99,
  cost: 1,
  points: 1,
  text: 'Refresh',
})

class Overflow extends RefreshCard {
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
  id: 100,
  cost: 3,
  points: -1,
  text: 'Refresh\nWorth +1 for each card in your hand.',
})

class Fish extends Card {
  onDraw(player: number, game: GameModel): void {
    const copy = this.copy()
    copy.points += 1

    game.hand[player][game.hand[player].length - 1] = copy
  }
}
const fish = new Fish({
  name: 'Fish',
  id: 101,
  cost: 3,
  points: 2,
  text: 'When you draw this, increase its points by 1 permanently.',
})

class Cloud extends RefreshCard {
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
  id: 102,
  cost: 5,
  points: 5,
  text: 'Refresh\nExhale 2: Draw 3 cards.',
})

class GainAndLoss extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    const length = game.hand[player].length
    game.discard(player, length)
    game.draw(player, length)
  }
}
const gainAndLoss = new GainAndLoss({
  name: 'Gain and Loss',
  id: 103,
  cost: 2,
  points: 1,
  text: 'Discard your hand, draw that many cards.',
})

class DamBreaks extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    // Initiation
    if (super.exhale(1, game, player)) {
      game.discard(player, 3)

      // Add the hand to the story
      while (game.hand[player].length > 0) {
        const card = game.hand[player].shift()
        game.story.addAct(card, player, 0)
      }
    }
  }
}
const damBreaks = new DamBreaks({
  name: 'Dam Breaks',
  id: 104,
  cost: 4,
  points: 4,
  text: 'Exhale 1: Discard 3 cards. Add your hand to the story after this.',
})

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
  gainAndLoss as precious,
  damBreaks,
  overflow,
}
