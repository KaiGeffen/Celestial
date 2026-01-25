import Card from '../card'
import { ashes, condemnation } from './tokens'
import { Quality } from '../quality'
import { Animation } from '../../animation'
import { Zone } from '../zone'
import GameModel from '../gameModel'

class Dash extends Card {
  play(player: number, game: GameModel, index: number, bonus: number): void {
    if (this.upgradeVersion !== 2) {
      bonus -= index
    }

    super.play(player, game, index, bonus)

    if (this.upgradeVersion === 2) {
      // Create an Ashes for each card before this
      for (let i = 0; i < index; i++) {
        game.createInPile(player, ashes)
      }
    }
  }

  onPlay(player: number, game: GameModel) {
    if (this.upgradeVersion === 1) {
      game.discard(player)
      game.draw(player)
    }
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

    if (this.upgradeVersion === 2) {
      game.createOnDeck(player ^ 1, ashes)
    }

    for (let i = 0; i < 2; i++) {
      if (this.upgradeVersion !== 2) {
        game.createInPile(player, ashes)
      } else {
        game.createOnDeck(player ^ 1, ashes)
      }
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

  onPlay(player: number, game: GameModel) {
    if (this.upgradeVersion === 2) {
      for (let i = 0; i < game.hand[player].length; i++) {
        const card = game.hand[player][i]
        if (card.cost < 4) {
          game.hand[player][i] = arsonist
        }
      }
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
    switch (this.upgradeVersion) {
      case 0:
        bonus += game.pile[player].length >= 8 ? 3 : 0
        break
      case 1:
        bonus += game.pile[player].length
        break
    }

    super.play(player, game, index, bonus)

    // Upgrade 2: Double if at least 8 cards
    if (this.upgradeVersion === 2 && game.pile[player].length >= 8) {
      game.score[player] *= 2
    }
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
  text: 'Worth +X, where X is the highest base-cost in your discard pile. Put that card on top of your deck.',
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
  onShuffle(player: number, game: GameModel, index: number) {
    super.onShuffle(player, game, index)

    // Make a new version of this card with the correct points
    const countFleetingInDeck = game.deck[player].filter((card) => card.qualities.includes(Quality.FLEETING)).length
    const countFleetingInHand = game.hand[player].filter((card) => card.qualities.includes(Quality.FLEETING)).length
    const newPoints = Math.floor((countFleetingInDeck + countFleetingInHand) / 3)
    
    const newVersion = this.copy()
    newVersion.points = newPoints

    // Replace this card in the deck with the new version
    game.deck[player][index] = newVersion
  }
}
const fromAshes = new FromAshes({
  name: 'From Ashes',
  id: 74,
  cost: 2,
  points: 0,
  text: 'When this is shuffled, set its points to 1/3 the number of cards with Fleeting shuffled or in your hand, rounded down.',
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

class Initiative extends Card {
  onPlay(player: number, game: GameModel) {
    game.switchPriority()
  }
}
const initiative = new Initiative({
  name: 'Initiative',
  id: 2071,
  cost: 1,
  points: 1,
  qualities: [Quality.VISIBLE],
  text: 'Visible\nWhen played, keep priority.',
})

class Wildfire extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    this.inspire(1, game, player)

    if (super.exhale(1, game, player) && game.hand[player].length > 0) {
      game.discard(player)
      game.createInStory(player, wildfire, 0)
    }
  }
}
const wildfire = new Wildfire({
  name: 'Wildfire',
  id: 2072,
  cost: 2,
  points: 1,
  text: 'Inspire 1\nExhale 1, discard a card: Create a Wildfire in the story.',
})

class Remnant extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.createInPile(player, ashes)
  }

  onMorning(player: number, game: GameModel, index: number): boolean {
    game.pile[player].splice(index, 1)
    game.create(player, this)
    game.discard(player)
    return true
  }
}
const remnant = new Remnant({
  name: 'Remnant',
  id: 2050,
  cost: 2,
  points: 2,
  text: 'Add an Ashes to your discard pile.\nMorning: Return this to hand. Discard a card.',
  beta: true,
})

class DyingLight extends Card {
  onPlay(player: number, game: GameModel) {
    game.breath[player] += Math.floor(game.pile[player].length / 3)
  }
}
const dyingLight = new DyingLight({
  name: 'Dying Light',
  id: 2053,
  cost: 6,
  points: 6,
  text: 'When played, gain 1 breath for every 3 cards in your discard pile.',
})

class Momentum extends Card {
  onUpkeepInHand(
    player: number,
    game: GameModel,
    index: number,
  ): [boolean, boolean] {
    const oppWonPreviousRound = game.checkPlayerWonPreviousRound(player ^ 1)

    if (oppWonPreviousRound) {
      game.discard(player, 1, index)
      return [true, true]
    }
    return [false, false]
  }
}
const momentum = new Momentum({
  name: 'Momentum',
  id: 2054,
  cost: 6,
  points: 8,
  text: 'When you lose a round while this is in hand, discard it.',
})

class Finale extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    bonus += Math.floor(game.pile[player].length / 3)
    super.play(player, game, index, bonus)

    for (let i = 0; i < 6; i++) {
      game.createOnDeck(player, ashes)
    }
    game.draw(player, 6)
  }
}
const finale = new Finale({
  name: 'finale',
  id: 2055,
  cost: 7,
  points: 5,
  text: '.',
})

class Prometheus extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.maxBreath[player] += 1
    game.createInPile(player, condemnation)
  }
}
const prometheus = new Prometheus({
  name: 'Prometheus',
  id: 2073,
  cost: 4,
  points: 4,
  text: 'Inspire 2.\nCreate a Condemnation in your discard pile.',
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
  goliath,
  firebug,
  immolant,
  spark,
  // NEW
  // initiative,
  // wildfire,
  remnant,
  // dyingLight,
  // momentum,
  // finale,
  prometheus,
}
