import Card from '../card'
import { SightCard } from '../card'
import { Status } from '../status'
import { Quality } from '../quality'
import { Keywords } from '../keyword'
import { Animation } from '../../animation'
import { Zone } from '../zone'
import GameModel from '../gameModel'

class Stars extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.inspire(1, game, player)
  }
}
const stars = new Stars({
  name: 'Stars',
  id: 0,
  text: 'Inspire 1',
  keywords: [{ name: Keywords.inspire, x: 0, y: 131, value: 1 }],
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
  keywords: [{ name: Keywords.inspire, x: -28, y: 90, value: 1 }],
})

class NightVision extends SightCard {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    game.tutor(player, 2)
  }
}
const nightVision = new NightVision(3, {
  name: 'Night Vision',
  id: 28,
  cost: 1,
  text: 'Put the top card with base cost 2 from your deck into your hand.\nWhen played, gain Sight 3.',
  keywords: [{ name: Keywords.sight, x: 0, y: 130, value: 3 }],
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
  onMorning(player: number, game: GameModel, index: number) {
    super.addBreath(2, game, player)
    return true
  }
}
const sun = new Sun({
  name: 'Sun',
  id: 56,
  cost: 8,
  points: 8,
  text: 'Morning: Gain 2 breath.',
  story: 'I raise my head over the horizon\nI begin\nJust like you',
  keywords: [{ name: Keywords.morning, x: 0, y: 104 }],
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
  points: 5,
  text: 'Morning: Trigger the morning abilities of the top 2 cards below this with morning.',
  keywords: [{ name: Keywords.morning, x: 0, y: 60 }],
})

class Sunflower extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    let points = this.points + bonus
    points += game.status[player].filter(
      (status) => status === Status.NOURISH,
    ).length
    points -= game.status[player].filter(
      (status) => status === Status.STARVE,
    ).length

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
  keywords: [{ name: Keywords.inspire, x: -36, y: 111, value: 1 }],
})

// Beta
class Fates extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    // Atropos the inevitable
    if (super.exhale(6, game, player)) {
      super.reset(game)
    }

    // Lachesis the allotter
    if (super.exhale(3, game, player)) {
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
  id: 369,
  text: 'Exhale 6: Reset.\nExhale 3: Nourish 2.\nExhale 1: Birth 1.',
  beta: true,
})

class Possibility extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.maxBreath[player] += 1
  }
}
const possibility = new Possibility({
  name: 'Possibility',
  id: 8828,
  cost: 4,
  qualities: [Quality.FLEETING],
  text: 'Fleeting.\nIncrease your max breath by 1 permanently.',
  beta: true,
})

class RadiantCore extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.breath[player] += 3
  }

  onMorning(player: number, game: GameModel, index: number) {
    const endOfLastRound =
      game.recentModels[player][game.recentModels[player].length - 1]
    const lastRoundsBreath = endOfLastRound.breath[player]
    super.addBreath(lastRoundsBreath, game, player)

    return true
  }
}
const radiantCore = new RadiantCore({
  name: 'Radiant Core',
  id: 8056,
  cost: 3,
  text: 'Gain 3 breath.\nMorning: Gain 1 breath for each breath you ended the last round with.',
  beta: true,
})

class Dreamer extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (super.exhale(1, game, player)) {
      bonus += 1
    }
    super.play(player, game, index, bonus)

    if (game.hand[player].length === 0) {
      game.draw(1, player)
    }
  }
}
const dreamer = new Dreamer({
  name: 'Dreamer',
  id: 8832,
  cost: 1,
  points: 1,
  text: 'Draw a card if your hand is empty.\nExhale 1: Worth +1.',
  beta: true,
})

class Pride extends Card {
  onMorning(player: number, game: GameModel, index: number) {
    if (super.exhale(2, game, player)) {
      game.pile[player].splice(index, 1)
      game.createInStory(player, this)
      game.discard(player)
    }
    return true
  }
}
const pride = new Pride({
  name: 'Pride',
  id: 8666,
  cost: 3,
  points: 3,
  text: 'Morning: Exhale 2: Add this to the story. Discard a card.',
  beta: true,
})

export {
  stars,
  cosmos,
  nightVision,
  ecology,
  sun,
  moon,
  sunflower,
  // BETA
  fates,
  possibility,
  radiantCore,
  dreamer,
  pride,
  // TODO 1
}
