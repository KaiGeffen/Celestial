import Card from '../card'
import { SightCard } from '../card'
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
const nightVision = new NightVision(3, {
  name: 'Night Vision',
  id: 28,
  cost: 1,
  text: 'Put the top card with base cost 2 from your deck into your hand.\nWhen played, gain Sight 3.',
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
  points: 2,
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
  points: 5,
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

// Beta
class Fates extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    // Atropos the inevitable
    if (super.exhale(5, game, player)) {
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
  id: 93,
  text: "Exhale 5: Set both players' points to 0.\nExhale 3: Nourish 2\nExhale 1: Birth 1",
})

class Hero extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    // Departure
    if (super.exhale(5, game, player)) {
      bonus += 4
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
  text: 'Exhale 5: Worth +4.\nExhale 3: Discard the next card in the story.\nExhale 1: Inspire 1',
})

class Possibility extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.maxBreath[player] += 1
  }
}
const possibility = new Possibility({
  name: 'Possibility',
  id: 95,
  cost: 4,
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
    super.inspired(amt, game, player)

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
  id: 98,
  cost: 3,
  points: 3,
  text: 'Morning: Exhale 2: Add this to the story. Discard a card.',
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
  hero,
  possibility,
  cloakOfStars,
  dreamer,
  pride,
}
