import Card from '../card'
import card, { SightCard } from '../card'
import { Quality } from '../quality'
import { Keywords } from '../keyword'
import { Animation } from '../../animation'
import { Zone } from '../zone'
import GameModel from '../gameModel'
import { dove, vulture } from './birds'
import { sickness } from './shadow'
import { ashes } from './tokens'

class Stars extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    const amt = this.upgradeVersion === 1 ? 2 : 1
    super.play(player, game, index, bonus)
    this.inspire(amt, game, player)

    if (this.upgradeVersion === 2) {
      game.draw(player, 1)
    }
  }
}
const stars = new Stars({
  name: 'Stars',
  id: 0,
  text: 'Inspire 1',
})

class Cosmos extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    let amt = 1
    for (const act of game.story.acts) {
      if (act.owner === player) {
        amt += 1
      }
    }
    super.play(player, game, index, bonus)
    this.inspire(amt, game, player)
  }
}
const cosmos = new Cosmos({
  name: 'Cosmos',
  id: 9,
  cost: 2,
  text: 'Inspire 1 for this and each of your cards later in the story.',
})

class NightVision extends SightCard {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    game.tutor(player, 2)
  }
}
const nightVision = new NightVision(4, {
  name: 'Night Vision',
  id: 28,
  cost: 1,
  text: 'Put the top card with base cost 2 from your deck into your hand.\nWhen played, gain Sight 4.',
})

class Ecology extends Card {
  onPlay(player: number, game: GameModel) {
    game.breath[player] += 10
  }
}
const ecology = new Ecology({
  name: 'Ecology',
  id: 44,
  cost: 7,
  text: 'When played, gain 10 breath.',
})

class Sun extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.inspire(1, game, player)
  }

  onMorning(player: number, game: GameModel, index: number) {
    super.inspired(2, game, player)
    return true
  }
}
const sun = new Sun({
  name: 'Sun',
  id: 56,
  cost: 8,
  points: 8,
  text: 'Inspire 1\nMorning: Inspired 2',
  story: 'I raise my head over the horizon\nI begin\nJust like you',
})

class Moon extends Card {
  onMorning(player: number, game: GameModel, index: number) {
    let count = 0
    for (let i = index - 1; i >= 0; i--) {
      if (count >= 2) break

      const card = game.pile[player][i]
      if (card.onMorning(player, game, i)) {
        game.animations[player].push(
          new Animation({
            from: Zone.Discard,
            to: Zone.Discard,
            card: card,
            index: i,
            index2: i,
          }),
        )
        count += 1
      }
    }
    return true
  }
}
const moon = new Moon({
  name: 'Moon',
  id: 73,
  cost: 5,
  points: 4,
  text: 'Morning: Trigger the morning abilities of the top 2 cards below this with morning.',
})

class Sunflower extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    let points = this.points + bonus
    points += game.status[player].nourish

    super.play(player, game, index, bonus)
    this.inspire(points, game, player)
  }
}
const sunflower = new Sunflower({
  name: 'Sunflower',
  id: 69,
  cost: 2,
  points: 1,
  text: 'Inspire 1 for each point this is worth.',
})

class Fates extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    // Atropos the inevitable
    if (super.exhale(5, game, player)) {
      super.reset(game)
    }

    // Lachesis the allotter
    if (super.exhale(2, game, player)) {
      super.nourish(2, game, player)
    }

    // Clotho the spinner
    if (super.exhale(1, game, player)) {
      super.birth(1, game, player)
    }
  }
}
const fates = new Fates({
  name: 'Fates',
  id: 93,
  text: "Exhale 5: Set both players' points to 0.\nExhale 2: Nourish 2\nExhale 1: Birth 1",
})

class Hero extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    // Departure
    if (super.exhale(5, game, player)) {
      bonus += 2
    }

    super.play(player, game, index, bonus)

    // Initiation
    if (super.exhale(3, game, player)) {
      game.removeAct(0)
    }

    // Return
    if (super.exhale(1, game, player)) {
      super.inspire(1, game, player)
    }
  }
}
const hero = new Hero({
  name: 'Hero',
  id: 94,
  text: 'Exhale 5: Worth +2.\nExhale 3: Discard the next card in the story.\nExhale 1: Inspire 1',
})

class Possibility extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    this.possibility(1, game, player)
  }
}
const possibility = new Possibility({
  name: 'Possibility',
  id: 95,
  cost: 3,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nIncrease your max breath by 1 permanently.',
})

class CloakOfStars extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.breath[player] += 3
  }

  onMorning(player: number, game: GameModel, index: number) {
    const amt = game.endingBreath[player]
    if (amt > 0) {
      super.inspired(amt, game, player)
    }

    return true
  }
}
const cloakOfStars = new CloakOfStars({
  name: 'Cloak of Stars',
  id: 96,
  cost: 3,
  text: 'Gain 3 breath.\nMorning: Inspired 1 for each breath you ended the last round with.',
})

class Dreamer extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (super.exhale(1, game, player)) {
      bonus += 1
    }
    super.play(player, game, index, bonus)

    if (game.hand[player].length === 0) {
      game.draw(player, 1)
    }
  }
}
const dreamer = new Dreamer({
  name: 'Dreamer',
  id: 97,
  cost: 1,
  points: 1,
  text: 'Draw a card if your hand is empty.\nExhale 1: Worth +1.',
})

class Pride extends Card {
  onMorning(player: number, game: GameModel, index: number) {
    if (super.exhale(1, game, player)) {
      game.moveBetweenZones(Zone.Discard, Zone.Story, player, index, {
        revealed: true,
      })
      game.discard(player)
    }
    return true
  }
}
const pride = new Pride({
  name: 'Pride',
  id: 98,
  cost: 3,
  points: 3,
  text: 'Morning: Exhale 1: Add this to the story Revealed. Discard a card.',
})

// NEW
class Rocketship extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    bonus += game.hand[player].filter((card) => card.cost >= 6).length

    super.play(player, game, index, bonus)

    for (let i = 0; i < game.hand[player].length; ) {
      const card = game.hand[player][i]

      // Either remove a card or increment i
      if (card.cost >= 6) {
        game.bottom(player, 1, i)
      } else {
        i++
      }
    }
  }
}
const rocketship = new Rocketship({
  name: 'Rocketship',
  id: 8094,
  cost: 2,
  points: 2,
  text: 'Worth +1 for each card in your hand with base cost 6 or more. Put those cards on the bottom of your deck.',
})

class Fable extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    const createdCards = []
    // Characters
    if (super.exhale(6, game, player)) {
      createdCards.push(dove)
      createdCards.push(vulture)
    }

    // Conflict
    if (super.exhale(3, game, player)) {
      createdCards.push(sickness)
    }

    // Moral
    if (super.exhale(1, game, player)) {
      createdCards.push(ashes)
    }

    // Add each to the story in the right order
    while (createdCards.length > 0) {
      const card = createdCards.pop()
      game.create(Zone.Story, player, card)
    }
  }
}
const fable = new Fable({
  name: 'Fable',
  id: 8093,
  text: 'Create these after this:\nExhale 6: Dove & Vulture.\nExhale 3: Sickness.\nExhale 1: Ashes.',
})

const phi = new Card({
  name: 'Phi',
  id: 8105,
  cost: 8,
  points: 8,
  text: 'If this is in hand at the end of a round, reduce its cost by 1 for each breath you have until you play it.',
})

class OuterSpace extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.breath[player] += index

    if (super.exhale(4, game, player)) {
      game.score[player] = 0
    }
  }
}
const outerSpace = new OuterSpace({
  name: 'Outer Space',
  id: 8097,
  cost: 2,
  points: 2,
  text: 'Gain 1 breath for each card before this in the story.\nExhale 4: Set your points to 0.',
})

class Starfall extends Card {
  onUpkeepInHand(
    player: number,
    game: GameModel,
    index: number,
    handSizeAtStart: number,
  ): [boolean, boolean] {
    if (handSizeAtStart >= 5) {
      game.discard(player, 1, index)
      this.inspired(1, game, player)
      return [true, true]
    }
    return [false, false]
  }
}
const starfall = new Starfall({
  name: 'Starfall',
  id: 107,
  cost: 6,
  points: 7,
  text: 'At the start of each round, if your hand has at least 5 cards including this, discard this to Inspired 1.',
})

class Boreas extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.breath[player] += 2
  }
}
const boreas = new Boreas({
  name: 'Boreas',
  id: 8096,
  cost: 2,
  points: 2,
  text: 'Gain 2 breath.',
})

class Heavens extends Card {
  getCost(player: number, game: GameModel): number {
    return this.cost - game.exhaleCountLastRound[player] * 2
  }
}
const heavens = new Heavens({
  name: 'Heavens',
  id: 8019,
  cost: 9,
  points: 9,
  text: "Costs 2 less for each time you've triggered Exhale since the last story began.",
})

class CosmicDance extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (game.pile[player].length > 0) {
      const i = game.pile[player].length - 1
      game.pile[player][i].onMorning(player, game, i)
    }
  }
}
const cosmicDance = new CosmicDance({
  name: 'Cosmic Dance',
  id: 8020,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nIf the top card of your discard pile has Morning, trigger its ability.',
})

class Realms extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (super.exhale(6, game, player)) {
      bonus += 6
    }

    super.play(player, game, index, bonus)
  }

  onMorning(player: number, game: GameModel, index: number) {
    game.moveBetweenZones(Zone.Discard, Zone.Story, player, index, {
      revealed: true,
    })

    return true
  }
}
const realms = new Realms({
  name: 'Realms',
  id: 8021,
  text: 'Exhale 6: Worth +6.\nMorning: Add this to the story Revealed.',
})

class Morpheus extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (super.exhale(6, game, player)) {
      bonus += 6
    }

    super.play(player, game, index, bonus)
  }
}
const morpheus = new Morpheus({
  name: 'Morpheus',
  id: 8022,
  cost: 4,
  points: 4,
  text: 'If you have at least 5 cards in hand, discard a card to Inspire 5.\nExhale 5: Draw a card.',
})

class Blessed extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (super.exhale(1, game, player)) {
      bonus += game.pile[player].filter((card) => card.cost >= 6).length
    }

    super.play(player, game, index, bonus)
  }
}
const blessed = new Blessed({
  name: 'Blessed',
  id: 8023,
  cost: 2,
  points: 2,
  text: 'Exhale 1: Worth +1 for each card with base cost 6 or more in your discard pile.',
})

export {
  stars,
  cosmos,
  nightVision,
  ecology,
  sun,
  moon,
  sunflower,
  fates,
  hero,
  possibility,
  cloakOfStars,
  dreamer,
  pride,
  starfall,
  // NEW
  heavens,
  realms,
  blessed,
}
