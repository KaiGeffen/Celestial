import Card from '../card'
import { Quality } from '../quality'
import GameModel from '../gameModel'
import { Zone } from '../zone'
import { Animation } from '../../animation'
import { child } from './tokens'

// ENABLERS
class Retain extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.retain(2, game, player)
  }
}
const retain = new Retain({
  name: 'Retain',
  id: 9004,
  cost: 1,
  points: 1,
  text: 'Retain 2',
})

class Everyday extends Card {
  onRoundEndIfThisResolved(player: number, game: GameModel) {
    const copy = this.copy()
    game.create(Zone.Story, player, copy, { revealed: true })
  }
}
const everyday = new Everyday({
  name: 'Everyday',
  id: 9016,
  cost: 4,
  points: 2,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nAt the end of this round, create a Revealed copy of this in the story.',
})

// PAYOFFS - PASSING
class Patience extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    bonus += game.amtPasses[player]
    super.play(player, game, index, bonus)
  }
}
const patience = new Patience({
  name: 'Patience',
  id: 9005,
  cost: 2,
  points: 1,
  text: 'Worth +1 for each time you passed this round.',
})

class Chant extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.retain(1, game, player)
  }

  getCost(player: number, game: GameModel) {
    return Math.max(0, this.cost - game.amtPasses[player])
  }
}
const chant = new Chant({
  name: 'Chant',
  id: 9006,
  cost: 4,
  points: 4,
  text: 'Retain 1\nCosts 1 less for each time you’ve passed this round.',
})

class Earthsong extends Card {
  onPassInStory(playerWhoPassed: number, owner: number, game: GameModel): void {
    if (playerWhoPassed === owner) {
      game.breath[playerWhoPassed] += 1
    }
  }
}
const earthsong = new Earthsong({
  name: 'Earthsong',
  id: 9011,
  cost: 3,
  points: 3,
  text: 'When you pass while this is in the story, gain 1 breath.',
})

// PAYOFF - ROW
class March extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    // Count before
    for (let i = game.story.resolvedActs.length - 1; i >= 0; i--) {
      const act = game.story.resolvedActs[i]
      if (act.owner === player) {
        bonus += 1
      } else {
        break
      }
    }

    // Count after
    for (let i = 0; i < game.story.acts.length; i++) {
      const act = game.story.acts[i]
      if (act.owner === player) {
        bonus += 1
      } else {
        break
      }
    }

    super.play(player, game, index, bonus)
  }
}
const march = new March({
  name: 'March',
  id: 9007,
  cost: 2,
  points: 1,
  text: 'Worth +1 for each of your cards immediately before or after this.',
})

class RollingStone extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (super.exhale(1, game, player)) {
      bonus += 1
    }

    super.play(player, game, index, bonus)
  }

  onPlay(player: number, game: GameModel) {
    if (game.status[player].retain > 0) {
      // Make the new card
      const s =
        'Fleeting\nWhen played with Retain, Reveal this to create a copy in hand.\nExhale 1: Worth +1.'
      const card = this.copy()
      card.qualities = [Quality.FLEETING]
      card.text = s

      // Create in hand
      game.create(Zone.Hand, player, card)

      // Reveal this act
      game.story.acts[game.story.acts.length - 1].revealed = true
    }
  }
}
const rollingStone = new RollingStone({
  name: 'Rolling Stone',
  id: 9009,
  text: 'When played with Retain, Reveal this to create a Fleeting copy in hand.\nExhale 1: Worth +1.',
})

class Solidarity extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (game.story.acts.length > 0 && game.story.acts[0].owner === player) {
      this.transform(0, solidarity, game)
    }
  }
}
const solidarity = new Solidarity({
  name: 'Solidarity',
  id: 9010,
  cost: 2,
  points: 2,
  text: 'If the next card in the story is yours, tranform it into Solidarity.',
})

class Sandwich extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    // Card before
    if (game.story.resolvedActs.length > 0) {
      const length = game.story.resolvedActs.length
      if (game.story.resolvedActs[length - 1].owner === player) {
        super.inspire(1, game, player)
      }
    }

    // Card after
    if (game.story.acts.length > 0) {
      if (game.story.acts[0].owner === player) {
        super.inspire(1, game, player)
      }
    }
  }
}
const sandwich = new Sandwich({
  name: 'Sandwich',
  id: 9013,
  cost: 1,
  points: 1,
  text: 'Inspire 1 for each of your cards immediately before or after this.',
})

class Push extends Card {
  getCost(player: number, game: GameModel): number {
    const ourCount = game.story.acts.filter(
      (act) => act.owner === player,
    ).length
    const theirCount = game.story.acts.filter(
      (act) => act.owner !== player,
    ).length
    return Math.max(0, this.cost - ourCount + theirCount)
  }
}
const push = new Push({
  name: 'Push',
  id: 9014,
  cost: 5,
  points: 6,
  text: "Costs 1 less for each of your cards in the story.\nCosts 1 more for each of your opponent's cards in the story.",
})

class Earthquake extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    // Count before
    let longestRow = 0
    let currentRow = 0
    for (let i = 0; i < game.story.resolvedActs.length; i++) {
      const act = game.story.resolvedActs[i]
      if (act.owner === player) {
        currentRow += 1
        longestRow = Math.max(longestRow, currentRow)
      } else {
        currentRow = 0
      }
    }

    if (longestRow >= 2) {
      this.reset(game)
    }
  }
}
const earthquake = new Earthquake({
  name: 'Earthquake',
  id: 9015,
  cost: 3,
  points: 3,
  text: "Retain 1\nIf you have two or more cards in a row earlier in the story, set both players' points to 0.",
})

// RESOURCEFULNESS - Unspent breath
class Salvage extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    bonus += game.endingBreath[player]
    super.play(player, game, index, bonus)

    super.retain(1, game, player)
  }
}
const salvage = new Salvage({
  name: 'Salvage',
  id: 9008,
  cost: 1,
  text: 'Retain 1\nWorth +1 for each breath you ended the last round with.',
})

//  DIVIDE UNSORTED
class Cliff extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.retain(1, game, player)

    if (super.exhale(3, game, player)) {
      game.removeAct(game.story.acts.length - 1)
    }
  }
}
const cliff = new Cliff({
  name: 'Cliff',
  id: 9005,
  cost: 2,
  points: 2,
  text: 'Retain 1\nExhale 3: Discard the last card in the story.',
})

export {
  retain,
  cliff,
  chant,
  march,
  salvage,
  rollingStone,
  solidarity,
  earthsong,
  sandwich,
  push,
  patience,
  earthquake,
  everyday,
}
