import Card from '../card'
import { Quality } from '../quality'
import GameModel from '../gameModel'
import { Zone } from '../zone'
import { Animation } from '../../animation'

class Dove extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    // Tutor a 1
    if (this.upgradeVersion === 2) {
      game.tutor(player, 1)
    }
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
})

class Starling extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    const amt = this.upgradeVersion === 2 ? 3 : 1

    // Check all cards later in the story
    if (this.upgradeVersion === 1) {
      for (const act of game.story.acts) {
        if (act.card.cost === 1) {
          bonus += amt
        }
      }
    }
    // Check EITHER PLAYER'S next card
    else if (game.story.acts.length > 0) {
      if (game.story.acts[0].card.cost === 1) {
        bonus += amt
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
})

class Phoenix extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    const deck = game.deck[player]
    const discardPile = game.pile[player]
    const hand = game.hand[player]
    ;[deck, discardPile, hand].forEach((zone) => {
      // For each index in the zone
      for (let i = 0; i < zone.length; i++) {
        let card = zone[i] as Card
        if (card.qualities.includes(Quality.FLEETING)) {
          const cardCopy = card.copy()
          cardCopy.points += 1

          // Replace the original card with the new copy
          zone[i] = cardCopy
        }
      }
    })

    // Replace acts in the story
    game.story.acts.forEach((act, i) => {
      const card = act.card
      if (act.owner === player && card.qualities.includes(Quality.FLEETING)) {
        const cardCopy = card.copy()
        cardCopy.points += 1
        act.card = cardCopy
      }
    })
  }
}
const phoenix = new Phoenix({
  name: 'Phoenix',
  id: 51,
  cost: 6,
  points: 3,
  qualities: [Quality.VISIBLE, Quality.FLEETING],
  text: 'Visible\nFleeting\nGive your other Fleeting cards everywhere +1 point.',
  story:
    'Cracks in the shell\nShell falls away\nI stretch into wide possibilities',
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
})

// BETA CONTENT TODO
class Fledgling extends Card {
  onMorning(player: number, game: GameModel, index: number) {
    const copy = this.copy()
    copy.points += 1

    game.pile[player][index] = copy
    return true
  }
}
const fledgling = new Fledgling({
  name: 'Fledgling',
  id: 59,
  cost: 1,
  text: 'Morning: Worth +1 permanently.',
})

class Nest extends Card {
  onMorning(player: number, game: GameModel, index: number) {
    game.createInStory(player, dove)
    return true
  }
}
const nest = new Nest({
  name: 'Nest',
  id: 24,
  cost: 2,
  points: 1,
  text: 'Morning: Create a Dove in the story.',
})

const truth = new Card({
  name: 'Truth',
  id: 61,
  cost: 6,
  points: 8,
})

class Defiance extends Card {
  getCost(player: number, game: GameModel): number {
    let numSeenCards = 0
    for (let i = 0; i < game.story.acts.length; i++) {
      const act = game.story.acts[i]
      if (act.owner === (player ^ 1)) {
        numSeenCards += 1
      } else {
        const canSeeWithVision = i + 1 <= game.status[player ^ 1].vision
        const canSeeBecauseVisible = act.card.qualities.includes(
          Quality.VISIBLE,
        )
        if (canSeeWithVision || canSeeBecauseVisible) {
          numSeenCards += 1
        }
      }
    }
    return Math.max(0, this.cost - numSeenCards)
  }
}
const defiance = new Defiance({
  name: 'Defiance',
  id: 29,
  cost: 5,
  points: 3,
  text: 'Costs 1 less for each card your opponent can see in the story.',
})

class LayBare extends Card {
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
const layBare = new LayBare({
  name: 'Lay Bare',
  id: 30,
  cost: 2,
  points: 2,
  qualities: [Quality.VISIBLE],
  text: 'Visible\nExhale 1: The next card in the story loses all card-text.',
})

class Vulture extends Card {
  onPlay(player: number, game: GameModel): void {
    this.starve(2, game, player)
  }
}
const vulture = new Vulture({
  name: 'Vulture',
  id: 36,
  cost: 3,
  points: 5,
  qualities: [Quality.VISIBLE, Quality.FLEETING],
  text: 'Visible\nFleeting\nWhen played, gain Nourish -2.',
})

class Rooster extends Card {
  onMorning(player: number, game: GameModel, index: number) {
    for (let i = index - 1; i >= 0; i--) {
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

        // A morning effect was triggered, so we can stop
        return true
      }
    }

    return true
  }
}
const rooster = new Rooster({
  name: 'Rooster',
  id: 37,
  cost: 1,
  points: 1,
  text: 'Morning: Trigger the morning ability of the top card below this with morning.',
})

class LetGo extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.dig(player, 4)
  }
}
const letGo = new LetGo({
  name: 'Let Go',
  id: 66,
  cost: 4,
  points: 4,
  text: 'Remove from the game the top four cards of your discard pile.',
})

class Ending extends Card {
  onPlay(player: number, game: GameModel): void {
    this.starve(2, game, player)
  }
}
const ending = new Ending({
  name: 'Ending',
  id: 36,
  cost: 5,
  qualities: [Quality.VISIBLE, Quality.FLEETING],
  text: 'Visible\nFleeting\nWhen played, add 5 Doves to the story.',
})

export {
  dove,
  starling,
  secretaryBird,
  phoenix,
  heron,
  fledgling,
  nest,
  truth,
  defiance,
  layBare,
  vulture,
  rooster,
  letGo,
}
