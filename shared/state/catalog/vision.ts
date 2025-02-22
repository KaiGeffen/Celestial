import Card from '../card'
import { SightCard } from '../card'
import { seen, predator } from './tokens'
import { Status, Quality } from '../effects'
import { Keywords } from '../keyword'
import GameModel from '../gameModel'

class Dawn extends SightCard {
  onMorning(player: number, game: GameModel, index: number): boolean {
    game.vision[player] += 1
    return true
  }
}
const dawn = new Dawn(4, {
  name: 'Dawn',
  id: 50,
  text: 'When played, gain Sight 4.\nMorning: gain Sight 1.',
  keywords: [
    { name: Keywords.sight, x: 0, y: 74, value: 4 },
    { name: Keywords.morning, x: -22, y: 104 },
    { name: Keywords.sight, x: 0, y: 130, value: 1 },
  ],
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
  keywords: [
    { name: Keywords.nourish, x: 0, y: 73, value: 1 },
    { name: Keywords.sight, x: 0, y: 130, value: 3 },
  ],
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
  references: [{ card: seen, x: 5, y: 112 }],
})

class Awakening extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    this.addStatus(1, game, player, Status.AWAKENED)
    super.play(player, game, index, bonus)
  }
}
const awakening = new Awakening({
  name: 'Awakening',
  id: 39,
  cost: 3,
  points: 3,
  // TODO Keyword for sight
  text: 'Retain your Sight at the end of this round.',
})

class Enlightenment extends Card {
  getCost(player: number, game: GameModel): number {
    let numSeenCards = 0
    for (let i = 0; i < game.story.acts.length; i++) {
      const act = game.story.acts[i]
      if (act.owner === (player ^ 1)) {
        if (
          i + 1 <= game.vision[player] ||
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
  references: [{ card: predator, x: 6, y: 113 }],
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
          i + 1 <= game.vision[player] ||
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
  id: 850,
  cost: 1,
  points: 1,
  text: 'When played, gain Sight 3.\nExhale 1: Return your cards later in the story to your hand.',
  beta: true,
})

class Balance extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (game.story.resolvedActs.length === game.story.acts.length) {
      bonus += 3
    }
    super.play(player, game, index, bonus)
  }
}
const balance = new Balance({
  name: 'Balance',
  id: 6850,
  cost: 2,
  points: 1,
  text: 'Worth +3 if the number of cards before this in the story is equal to the number of cards after this.',
  beta: true,
})

class Riddle extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (
      game.story.acts.length >= 1 &&
      game.hand[player].length >= 1 &&
      game.story.acts[0].card.cost === game.hand[player][0].cost
    ) {
      const card = game.hand[player].splice(0, 1)[0]
      game.story.addAct(card, player, 0)
    }
  }
}
const riddle = new Riddle({
  name: 'Riddle',
  id: 6852,
  qualities: [Quality.VISIBLE],
  text: 'Visible.\nAdd the first card in your hand to the story after this if it has the same cost as the card after this.',
  beta: true,
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
  id: 6063,
  cost: 3,
  points: 3,
  text: 'Costs 1 less if the last card in the story has the same base-cost as the top card of your deck.',
  beta: true,
})

class Lantern extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    const card = game.hand[player].splice(0, 1)[0]
    if (card !== undefined) {
      game.hand[player].unshift(lantern)
    }
  }
}
const lantern = new Lantern({
  name: 'Lantern',
  id: 6083,
  cost: 5,
  points: 5,
  text: 'Transform a card in your hand into Lantern.',
  beta: true,
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
}
