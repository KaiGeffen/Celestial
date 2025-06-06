import Card from '../card'
import { ashes } from './tokens'
import { Quality } from '../quality'
import { Animation } from '../../animation'
import { Zone } from '../zone'
import GameModel from '../gameModel'

class Dash extends Card {
  play(player: number, game: GameModel, index: number, bonus: number): void {
    bonus -= index
    super.play(player, game, index, bonus)
  }

  ratePlay(world: GameModel): number {
    return this.points - world.story.acts.length
  }
}
const dash = new Dash({
  name: 'Dash',
  id: 6,
  cost: 2,
  points: 3,
  text: 'Worth -1 for each card before this in the story.',
  story: 'I look around only to remind me: Move on! Fast!',
})

class Impulse extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    for (let i = 0; i < 2; i++) {
      game.createInPile(player, ashes)
    }
  }
}
const impulse = new Impulse({
  name: 'Impulse',
  id: 3,
  cost: 1,
  points: 1,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nCreate two Ashes in your discard pile.',
  story:
    'Belly burns with knowing now\nBurning hand tells me how heroic I am\nA whiff of "what if?" is not enough to stop me',
})

class Mine extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    this.inspire(1, game, player)
    game.createOnDeck(player, ashes)
    game.createOnDeck(player, ashes)
  }
}
const mine = new Mine({
  name: 'Mine',
  id: 15,
  cost: 3,
  points: 3,
  text: 'Inspire 1\nCreate 2 Ashes on top of your deck.',
})

class Arsonist extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    for (let i = 0; i < 3; i++) {
      game.createInPile(player, ashes)
    }
  }
}
const arsonist = new Arsonist({
  name: 'Arsonist',
  cost: 4,
  points: 4,
  id: 14,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nCreate three Ashes in your discard pile.',
  story:
    "We build and tend and feed and joy\nFlames dance in the buildings\nCrackle in the streets\nWe still build and tend and feed and joy\nAnd suddenly it's all up in smoke",
})

class Parch extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    for (const act of game.story.acts) {
      if (act.owner === player) {
        bonus += 1
      }
    }

    super.play(player, game, index, bonus)

    // NOTE This is done because some cards add themselves to the story when they are discarded
    // Check this many cards (Discarding yours, ignoring theirs)
    const maxCount = game.story.acts.length
    for (let count = 0, i = 0; count < maxCount; count++) {
      const act = game.story.acts[i]
      if (act.owner === player) {
        game.removeAct(i)
      } else {
        i++
      }
    }
  }
}
const parch = new Parch({
  name: 'Parch',
  id: 64,
  cost: 3,
  points: 3,
  text: 'Worth +1 for each of your cards later in the story. Discard those cards.',
  story:
    'We drank and we drank, then\nWe washed and fed fountains, then\nWe watered and we swam, then\nNow we lick our parched lips',
})

class Veteran extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (game.pile[player].length >= 8) {
      bonus += 3
    }

    super.play(player, game, index, bonus)
  }

  ratePlay(world: GameModel): number {
    const pileHas8 = world.pile[0].length >= 8
    return 4 + (pileHas8 ? 2 : 0)
  }
}
const veteran = new Veteran({
  name: 'Veteran',
  id: 17,
  cost: 5,
  points: 4,
  text: 'Worth +3 if your discard pile has at least eight cards in it.',
  story:
    'The veteran sleepwalks, body aware and functioning\nCarrying a longing for the time when they knew\nWhat there was to know',
})

class Cling extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    let highestCost = -1
    let highestIndex = null

    for (
      let pileIndex = game.pile[player].length - 1;
      pileIndex >= 0;
      pileIndex--
    ) {
      const card = game.pile[player][pileIndex]

      if (card.cost > highestCost) {
        highestCost = card.cost
        highestIndex = pileIndex
      }
    }

    if (highestIndex !== null) {
      const card = game.pile[player].splice(highestIndex, 1)[0]
      game.deck[player].push(card)

      bonus += highestCost

      game.animations[player].push(
        new Animation({
          from: Zone.Discard,
          to: Zone.Deck,
          card: card,
        }),
      )

      super.play(player, game, index, bonus)
    } else {
      super.play(player, game, index, bonus)
    }
  }

  ratePlay(world: GameModel): number {
    let highestCost = 0
    for (const card of world.pile[0]) {
      highestCost = Math.max(highestCost, card.cost)
    }

    for (const act of world.story.acts) {
      if (act.owner === 0) {
        highestCost = Math.max(highestCost, act.card.cost)
      }
    }

    if (highestCost <= 3) {
      return highestCost - 1
    } else if (highestCost <= 5) {
      return highestCost
    } else {
      return highestCost + 1
    }
  }
}
const cling = new Cling({
  name: 'Cling',
  id: 20,
  cost: 6,
  text: 'Worth +X, where X is the highest base cost in your discard pile. Put that card on top of your deck.',
  story:
    'Reaching back with the back of the eyes\nTo that moment when\nI see myself – not as I am – but as I was - clearly',
})

class Death extends Card {
  getCost(player: number, game: GameModel) {
    return game.pile[player].length >= 12 ? 0 : this.cost
  }
}
const death = new Death({
  name: 'Death',
  id: 21,
  cost: 7,
  points: 7,
  text: 'Costs 0 if you have at least twelve cards in your discard pile.',
  story:
    'I knew you were coming, I just didn’t know when.\nGo easy on me.\nI am tired, sated, and looking for new life.',
})

class FromAshes extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    const amt = game.pile[player]
      .slice(-3)
      .filter((card) => card.qualities.includes(Quality.FLEETING)).length

    game.dig(player, 3)
    this.nourish(amt, game, player)
  }
}
const fromAshes = new FromAshes({
  name: 'From Ashes',
  id: 74,
  cost: 2,
  points: 1,
  text: 'Remove from the game the top three cards of your discard pile. Nourish 1 for each card with Fleeting removed.',
  story:
    'Ash carefully tends\nThe green shoot\nLiving on atonement\nTender so close to death and beginning',
})

// BETA
class Goliath extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.removeAct(0)
    game.mill(player, 2)
  }
}
const goliath = new Goliath({
  name: 'Goliath',
  id: 38,
  cost: 8,
  points: 8,
  text: 'Discard the next card in the story and the top 2 cards of your deck.',
})

class Firebug extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    game.discard(player)
  }
}
const firebug = new Firebug({
  name: 'Firebug',
  id: 41,
  points: 1,
  text: 'Discard a card.',
})

class Immolant extends Card {
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
const immolant = new Immolant({
  name: 'Immolant',
  id: 42,
  cost: 1,
  points: 1,
  text: 'When this is discarded, add it next in the story.',
})

class Spark extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    for (let i = 0; i < game.story.acts.length; i++) {
      if (game.story.acts[i].owner === player) {
        game.removeAct(i)
        break
      }
    }
  }

  onPlay(player: number, game: GameModel) {
    game.breath[player] += 3
  }
}
const spark = new Spark({
  name: 'Spark',
  id: 70,
  cost: 1,
  text: 'When played, gain 3 breath.\nDiscard your next card in the story.',
})

export {
  dash,
  impulse,
  mine,
  arsonist,
  parch,
  veteran,
  cling,
  death,
  fromAshes,
  // Expansion
  goliath,
  firebug,
  immolant,
  spark,
}
