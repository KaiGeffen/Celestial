import Card from '../card'
import { Quality } from '../quality'
import GameModel from '../gameModel'
import { Keywords } from '../keyword'

class Dove extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    // game.sound_effect = SoundEffect.Bird
    super.play(player, game, index, bonus)
  }
}
const dove = new Dove({
  name: 'Dove',
  id: 4,
  cost: 1,
  points: 1,
  qualities: [Quality.VISIBLE, Quality.FLEETING],
  text: 'Visible\nFleeting',
  story: 'Look at my eyes.\nSurrender\nTo the one thing you want',
  keywords: [
    { name: Keywords.visible, x: 0, y: 100 },
    { name: Keywords.fleeting, x: 0, y: 130 },
  ],
})

class Starling extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (game.story.acts.length > 0) {
      if (game.story.acts[0].card.cost === 1) {
        bonus += 1
      }
    }
    super.play(player, game, index, bonus)
  }

  ratePlay(world: GameModel) {
    let value = 2
    // TODO
    return value
  }
}
const starling = new Starling({
  name: 'Starling',
  id: 7,
  cost: 2,
  points: 2,
  qualities: [Quality.VISIBLE, Quality.FLEETING],
  text: 'Visible\nFleeting\nWorth +1 if the next card in the story has base cost 1.',
  story: 'Making headway\nDefying the headwind\nHeading out and through',
  keywords: [
    { name: Keywords.visible, x: 0, y: 30 },
    { name: Keywords.fleeting, x: 0, y: 60 },
  ],
})

class SecretaryBird extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    let amt = 0
    for (let card of game.hand[player]) {
      if (card.cost <= 1) {
        amt += 1
      }
    }
    super.play(player, game, index, bonus + amt)

    // Remove each card in the player's hand with base cost 0 or 1
    for (let i = 0; i < game.hand[player].length; ) {
      if (game.hand[player][i].cost <= 1) {
        const card = game.hand[player][i]
        game.hand[player].splice(i, 1)
        game.expended[player].push(card)
      } else {
        i++
      }
    }
  }
}
const secretaryBird = new SecretaryBird({
  name: 'Secretary Bird',
  id: 40,
  cost: 4,
  points: 4,
  qualities: [Quality.VISIBLE],
  text: 'Visible\nWorth +1 for each card in your hand with base cost 0 or 1. Remove those cards from the game.',
  story: 'I will I will I will\nBecome me become me become me\nAt your peril',
  keywords: [{ name: Keywords.visible, x: 0, y: 43 }],
})

class Phoenix extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    const deck = game.deck[player]
    const discardPile = game.pile[player]
    ;[deck, discardPile].forEach((zone) => {
      // For each index in the zone
      for (let i = 0; i < zone.length; i++) {
        let card = zone[i]
        if (card.qualities.includes(Quality.FLEETING)) {
          // Create a new copy of the card, but with 1 more point
          const cardCopy = Object.create(
            Object.getPrototypeOf(card),
            Object.getOwnPropertyDescriptors(card),
          )
          cardCopy.points += 1
          cardCopy.basePoint = cardCopy.basePoints

          // Replace the original card with the new copy
          zone[i] = cardCopy
        }
      }
    })
  }
}
const phoenix = new Phoenix({
  name: 'Phoenix',
  id: 51,
  cost: 5,
  points: 5,
  qualities: [Quality.VISIBLE, Quality.FLEETING],
  text: 'Visible\nFleeting\nGive each card with fleeting in your deck or discard pile +1 point.',
  story:
    'Cracks in the shell\nShell falls away\nI stretch into wide possibilities',
  keywords: [
    { name: Keywords.visible, x: 0, y: 30 },
    { name: Keywords.fleeting, x: 0, y: 60 },
  ],
})

class Heron extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.reset(game)
  }

  getCost(player: number, game: GameModel) {
    return this.cost + game.pile[player].length
  }

  ratePlay(world: GameModel) {
    return this.rateReset(world)
  }
}
const heron = new Heron({
  name: 'Heron',
  id: 65,
  cost: 1,
  points: 0,
  qualities: [Quality.VISIBLE],
  text: "Visible\nSet both players' points to 0.\nCosts 1 more for each card in your discard pile.",
  story:
    'How you see me\nIs of no importance to me\nI am playing with being here, there, every where',
  keywords: [{ name: Keywords.visible, x: 0, y: 60 }],
})

// BETA CONTENT TODO
class Fledgling extends Card {
  onMorning(player: number, game: GameModel, index: number) {
    // Create a new copy of the card, but with 1 more point
    const copy = Object.create(
      Object.getPrototypeOf(this),
      Object.getOwnPropertyDescriptors(this),
    )
    copy.points += 1

    game.pile[player][index] = copy
    return true
  }
}
const fledgling = new Fledgling({
  name: 'Fledgling',
  id: 111,
  cost: 1,
  text: 'Morning: Worth +1 point permanently.',
  beta: true,
})

class Nest extends Card {
  onMorning(player: number, game: GameModel, index: number) {
    game.createInStory(player, dove)
    return true
  }
}
const nest = new Nest({
  name: 'Nest',
  id: 207,
  cost: 2,
  points: 0,
  text: 'Morning: Create a Dove in the story.',
  beta: true,
})

const truth = new Card({
  name: 'Truth',
  id: 104,
  cost: 6,
  points: 8,
  beta: true,
})

class Defiance extends Card {
  getCost(player: number, game: GameModel): number {
    let numSeenCards = 0
    for (let i = 0; i < game.story.acts.length; i++) {
      const act = game.story.acts[i]
      if (act.owner === (player ^ 1)) {
        numSeenCards += 1
      } else {
        if (
          i + 1 <= game.vision[player ^ 1] ||
          act.card.qualities.includes(Quality.VISIBLE)
        ) {
          numSeenCards += 1
        }
      }
    }
    return Math.max(0, this.cost - numSeenCards)
  }
}
const defiance = new Defiance({
  name: 'Defiance',
  id: 167,
  cost: 5,
  points: 3,
  text: 'Costs 1 less for each card your opponent can see in the story.',
  beta: true,
})

class Bare extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (this.exhale(1, game, player)) {
      // If there are more cards, transform the first one into a version with no text/qualities
      if (game.story.acts.length > 0) {
        const oldCard = game.story.acts[0].card

        const newCard = new Card({
          name: oldCard.name,
          id: oldCard.id,
          cost: oldCard.cost,
          points: oldCard.points,
        })

        this.transform(0, newCard, game)
      }
    }
  }
}
const bare = new Bare({
  name: 'Bare',
  id: 197,
  cost: 2,
  points: 2,
  qualities: [Quality.VISIBLE],
  text: 'Visible\nExhale 1: The next card in the story loses all card-text.',
  beta: true,
})

class Vulture extends Card {
  onPlay(player: number, game: GameModel): void {
    this.starve(3, game, player)
  }
}
const vulture = new Vulture({
  name: 'Vulture',
  id: 1031,
  cost: 3,
  points: 6,
  qualities: [Quality.VISIBLE, Quality.FLEETING],
  text: 'Visible.\nFleeting.\nWhen played, gain Nourish -3.',
  beta: true,
})

class Release extends Card {
  play(player: number, game: GameModel, index: number, bonus: number): void {
    super.play(player, game, index, bonus)

    const deck = game.deck[player]
    // Remove the top 4 cards from the deck
    const top4 = deck.splice(deck.length - 4, 4)

    // Add back any without Fleeting and RFG the others
    for (let card of top4) {
      if (card.qualities.includes(Quality.FLEETING)) {
        game.expended[player].push(card)
      } else {
        deck.push(card)
      }
    }
  }
}
const release = new Release({
  name: 'Release',
  id: 1032,
  qualities: [Quality.VISIBLE, Quality.FLEETING],
  text: 'Visible.\nFleeting.\nRemove from the game all cards in the top 4 of your deck with Fleeting.',
  beta: true,
})

export {
  dove,
  starling,
  secretaryBird,
  phoenix,
  heron,
  // NEW
  fledgling,
  nest,
  truth,
  defiance,
  bare,
  vulture,
  release,
  // TODO 1
}
