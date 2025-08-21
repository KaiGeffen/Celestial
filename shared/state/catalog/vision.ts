import Card from '../card'
import { SightCard } from '../card'
import { seen, predator } from './tokens'
import { Quality } from '../quality'
import { Keywords } from '../keyword'
import GameModel from '../gameModel'
import Act from '../act'

class Dawn extends SightCard {
  onMorning(player: number, game: GameModel, index: number): boolean {
    game.pile[player].splice(index, 1)
    game.create(player, this)
    return true
  }
}
const dawn = new Dawn(4, {
  name: 'Dawn',
  id: 50,
  text: 'When played, gain Sight 4.\nMorning: Return this to hand.',
})

class Nectar extends SightCard {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.nourish(1, game, player)
  }
}
const nectar = new Nectar(3, {
  name: 'Nectar',
  id: 25,
  cost: 1,
  text: 'Nourish 1\nWhen played, gain Sight 3.',
})

class ClearView extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    game.create(player ^ 1, seen)
  }
}
const clearView = new ClearView({
  name: 'Clear View',
  id: 27,
  cost: 1,
  text: "Create a Seen in your opponent's hand.",
})

const awakening = new SightCard(5, {
  name: 'Awakening',
  id: 39,
  cost: 3,
  points: 3,
  text: 'When played, gain Sight 5.',
})

class Enlightenment extends Card {
  getCost(player: number, game: GameModel): number {
    let numSeenCards = 0
    for (let i = 0; i < game.story.acts.length; i++) {
      const act = game.story.acts[i]
      if (act.owner === (player ^ 1)) {
        if (
          i + 1 <= game.status[player].vision ||
          act.card.qualities.includes(Quality.VISIBLE)
        ) {
          numSeenCards += 1
        }
      }
    }
    return numSeenCards >= 3 ? 0 : this.cost
  }
}
const enlightenment = new Enlightenment({
  name: 'Enlightenment',
  id: 45,
  cost: 7,
  points: 7,
  text: "Costs 0 if you can see at least three of your opponent's cards in the story.",
})

class Prey extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    game.create(player ^ 1, predator)
  }
}
const prey = new Prey({
  name: 'Prey',
  id: 26,
  cost: 1,
  points: 2,
  text: "Create a Predator in your opponent's hand.",
})

class Conquer extends Card {
  getCost(player: number, game: GameModel): number {
    let numSeenCards = 0
    for (let i = 0; i < game.story.acts.length; i++) {
      const act = game.story.acts[i]
      if (act.owner === player) {
        numSeenCards += 1
      } else {
        if (
          i + 1 <= game.status[player].vision ||
          act.card.qualities.includes(Quality.VISIBLE)
        ) {
          numSeenCards += 1
        }
      }
    }
    return Math.max(0, this.cost - numSeenCards)
  }
}
const conquer = new Conquer({
  name: 'Conquer',
  id: 67,
  cost: 5,
  points: 3,
  text: 'Costs 1 less for each card you can see in the story.',
})

// BETA
class Timid extends SightCard {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (super.exhale(1, game, player)) {
      let i = 0
      while (i < game.story.acts.length) {
        const act = game.story.acts[i]
        if (act.owner === player) {
          game.returnActToHand(i)
        } else {
          i++
        }
      }
    }
  }
}
const timid = new Timid(3, {
  name: 'Timid',
  id: 87,
  cost: 1,
  points: 1,
  text: 'When played, gain Sight 3.\nExhale 1: Return your cards later in the story to your hand.',
})

class Balance extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if ((game.story.acts.length - 1) / 2 === index) {
      bonus += 3
    }
    super.play(player, game, index, bonus)
  }
}
const balance = new Balance({
  name: 'Balance',
  id: 88,
  cost: 2,
  points: 1,
  text: 'Worth +3 if the number of cards before this in the story is equal to the number of cards after this.',
})

class Riddle extends Card {
  onPlay(player: number, game: GameModel) {
    const index = game.story.acts.length - 1

    // Make a new act
    const newCard = this.copy()
    newCard.points *= 2
    const act = new Act(newCard, player)

    // Replace this card's act with the new one
    game.story.replaceAct(index, act)
  }
}
const riddle = new Riddle({
  name: 'Riddle',
  id: 89,
  cost: 2,
  points: 1,
  qualities: [Quality.FLEETING],
  text: "Fleeting\nWhen played, double this card's points.",
})

class Bull extends Card {
  getCost(player: number, game: GameModel): number {
    if (
      game.story.acts.length >= 1 &&
      game.deck[player].length >= 1 &&
      game.story.acts[game.story.acts.length - 1].card.cost ===
        game.deck[player][game.deck[player].length - 1].cost
    ) {
      return this.cost - 1
    } else {
      return this.cost
    }
  }
}
const bull = new Bull({
  name: 'Bull',
  id: 90,
  cost: 3,
  points: 3,
  text: 'Costs 1 less if the last card in the story has the same base-cost as the top card of your deck.',
})

class Lantern extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (game.story.acts.length === 0) {
      const card = game.hand[player].splice(0, 1)[0]
      if (card !== undefined) {
        // Create a new copy of the card, but with 1 more point
        const copy = this.copy()
        copy.points += 1

        game.hand[player].unshift(copy)
      }
    }
  }
}
const lantern = new Lantern({
  name: 'Lantern',
  id: 91,
  cost: 5,
  points: 5,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nIf this is the last card in the story, transform a card in hand into a copy of this with +1 point.',
})

class BeggingBowl extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    bonus += game.status[player ^ 1].nourish
    game.status[player ^ 1].nourish = 0
    super.play(player, game, index, bonus)
  }
}
const beggingBowl = new BeggingBowl({
  name: 'Begging Bowl',
  id: 92,
  cost: 2,
  text: "This consumes your opponent's Nourish.",
})

export {
  dawn,
  nectar,
  clearView,
  awakening,
  enlightenment,
  prey,
  conquer,
  // BETA
  timid,
  balance,
  riddle,
  bull,
  lantern,
  beggingBowl,
}
