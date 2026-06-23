import Card from '../card'
import { SightCard } from '../card'
import { seen, predator, greatWheel } from './tokens'
import { Quality } from '../quality'
import { Keywords } from '../keyword'
import { Zone } from '../zone'
import GameModel from '../gameModel'
import Act from '../act'

class Dawn extends SightCard {
  onMorning(player: number, game: GameModel, index: number): boolean {
    game.moveBetweenZones(Zone.Discard, Zone.Hand, player, index)
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
    game.create(Zone.Hand, player ^ 1, seen)
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
      if (act.owner === (player ^ 1) && game.isActVisibleToPlayer(player, i)) {
        numSeenCards += 1
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
    game.create(Zone.Hand, player ^ 1, predator)
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
      if (act.owner === player || game.isActVisibleToPlayer(player, i)) {
        numSeenCards += 1
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
          game.moveBetweenZones(Zone.Story, Zone.Hand, player, i)
        } else {
          i++
        }
      }
    }
  }
}
const timid = new Timid(4, {
  name: 'Timid',
  id: 87,
  cost: 1,
  points: 1,
  text: 'When played, gain Sight 4.\nExhale 1: Return your cards later in the story to your hand.',
})

class Balance extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (game.story.resolvedActs.length === game.story.acts.length) {
      bonus += 2
    }
    super.play(player, game, index, bonus)
  }
}
const balance = new Balance({
  name: 'Balance',
  id: 88,
  cost: 2,
  points: 2,
  text: 'Worth +2 if the number of cards before this in the story is equal to the number of cards after this.',
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
        // Create a new copy of the card, but with 2 more points
        const copy = this.copy()
        copy.points += 2

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
  text: 'Fleeting\nIf this is the last card in the story, transform a card in hand into a copy of this with +2 point.',
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

class SuddenInsight extends Card {
  onDraw(player: number, game: GameModel): void {
    game.status[player].vision += 3
  }

  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (super.exhale(1, game, player)) {
      super.inspire(1, game, player)
    }
  }
}
const suddenInsight = new SuddenInsight({
  name: 'Sudden Insight',
  id: 6001,
  cost: 4,
  points: 4,
  text: 'When drawn, gain Sight 3.\nExhale 1: Inspire 1',
})

class Realms extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    const newDeck = [...game.pile[player]]
    const newDiscard = [...game.deck[player]]
    game.deck[player] = newDeck
    game.pile[player] = newDiscard

    // Shuffle the deck
    game.shuffle(player, true, false)
  }
}
const realms = new Realms({
  name: 'Realms',
  id: 6002,
  cost: 0,
  points: 6,
  text: 'Switch your deck and discard pile.',
})

class Path extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    let exhaled = false
    if (super.exhale(1, game, player)) {
      bonus -= 2
      exhaled = true
    }

    super.play(player, game, index, bonus)

    if (exhaled) {
      game.create(Zone.Hand, player, greatWheel)
    }
  }
}
const path = new Path({
  name: 'Path',
  id: 6102,
  cost: 2,
  text: 'Create a Great Wheel in your hand.',
})

class Switcheroo extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    game.status[player].nourish += game.status[player].vision
    game.status[player].vision = 0
  }
}
const switcheroo = new Switcheroo({
  name: 'Switcheroo',
  id: 6103,
  cost: 4,
  points: 1,
  text: 'Turn your Sight into Nourish.',
})

class Incense extends Card {
  onPlay(player: number, game: GameModel) {
    for (let i = game.story.acts.length - 1; i >= 0; i--) {
      const act = game.story.acts[i]
      if (act.owner === (player ^ 1) && game.isActVisibleToPlayer(player, i)) {
        game.moveBetweenZones(Zone.Story, Zone.Hand, player ^ 1, i)
        break
      }
    }
  }
}
const incense = new Incense({
  name: 'Incense',
  id: 8095,
  cost: 3,
  qualities: [Quality.VISIBLE],
  text: `Visible\nWhen played, return your opponent's last card in the story which you can see to their hand.`,
})

class Hermit extends Card {
  onCardPlayedAfter(
    index: number,
    owner: number,
    playedCardOwner: number,
    game: GameModel,
  ): boolean {
    // Discard this and nourish 3
    game.removeAct(index)
    this.nourish(3, game, owner)

    return true
  }
}
const hermit = new Hermit({
  name: 'Hermit',
  id: 4088,
  cost: 2,
  points: 2,
  text: 'When played, gain 2 breath.\nWhen a card is played while this is in the story, discard this and gain 2 breath.',
})

export {
  dawn,
  nectar,
  clearView,
  awakening,
  enlightenment,
  prey,
  conquer,
  timid,
  balance,
  riddle,
  bull,
  lantern,
  beggingBowl,
  // NEW CARDS
  suddenInsight,
  // realms,
  path,
  // switcheroo,
  // incense,
}
