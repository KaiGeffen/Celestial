import Card from '../card'
import { child, heirloom } from './tokens'
import { Quality } from '../quality'
import { Keywords } from '../keyword'
import GameModel from '../gameModel'

class Nascence extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.birth(1, game, player)
  }
}
const nascence = new Nascence({
  name: 'Nascence',
  id: 2,
  text: 'Birth 1',
  keywords: [{ name: Keywords.birth, x: 0, y: 130, value: 1 }],
})

class Birth extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.birth(2, game, player)
  }
}
const birth = new Birth({
  name: 'Birth',
  id: 8,
  cost: 2,
  text: 'Birth 2',
  keywords: [{ name: Keywords.birth, x: 0, y: 130, value: 2 }],
})

class Ancestry extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    const amt = game.story.acts.length
    super.play(player, game, index, bonus)
    if (amt >= 1) {
      this.birth(amt, game, player)
    }
  }
}
const ancestry = new Ancestry({
  name: 'Ancestry',
  id: 10,
  cost: 3,
  text: 'Birth 1 for each card later in the story.',
  keywords: [{ name: Keywords.birth, x: -32, y: 111, value: 1 }],
})

class TheFuture extends Card {
  play(player, game: GameModel, index, bonus) {
    super.play(player, game, index, bonus)
    game.draw(player, 1)
  }

  getCost(player: number, game: GameModel) {
    let amt = 0
    for (const card of game.hand[player]) {
      if (card.name === child.name) {
        amt += card.points
      }
    }
    return Math.max(this.cost - amt, 0)
  }
}
const theFuture = new TheFuture({
  name: 'The Future',
  id: 22,
  cost: 8,
  points: 4,
  text: 'Draw a card.\nCosts X less, where X is the total point value of all Children in your hand.',
})

class Posterity extends Card {
  onMorning(player: number, game: GameModel, index: number) {
    super.birth(1, game, player)
    return true
  }
}
const posterity = new Posterity({
  name: 'Posterity',
  id: 53,
  cost: 4,
  points: 4,
  text: 'Morning: Birth 1',
  keywords: [
    { name: Keywords.morning, x: 0, y: 100 },
    { name: Keywords.birth, x: 0, y: 130, value: 1 },
  ],
})

class Rebirth extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    let idx = 0
    for (const act of game.story.acts) {
      if (act.owner === player) {
        // Create a copy of child with points equal to original card's cost
        const card = Object.create(
          Object.getPrototypeOf(child),
          Object.getOwnPropertyDescriptors(child),
        )
        card.points = act.card.cost

        // Transform original card into child
        this.transform(idx, card, game)
      }
      idx += 1
    }
  }
}
const rebirth = new Rebirth({
  name: 'Rebirth',
  id: 55,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nTransform each of your cards later in the story into a 0:X Fleeting Child, where X is its cost.',
  keywords: [{ name: Keywords.fleeting, x: 0, y: 39 }],
  references: [{ card: child, x: 30, y: 112 }],
})

class Cradle extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.birth(2, game, player)
  }
}
const cradle = new Cradle({
  name: 'Cradle',
  id: 60,
  cost: 3,
  points: 2,
  text: 'Birth 2',
  keywords: [{ name: Keywords.birth, x: 0, y: 130, value: 2 }],
})

class Uprising extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    // game.soundEffect = SoundEffect.Crowd;
    super.play(player, game, index, bonus + index)
  }

  ratePlay(world: GameModel): number {
    return world.story.acts.length
  }
}
const uprising = new Uprising({
  name: 'Uprising',
  id: 18,
  cost: 6,
  points: 4,
  text: 'Worth +1 for each card before this in the story.',
})

// BETA
class Lullaby extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    // Create a copy in hand of each card later in the 	story that costs 0.
    for (const act of game.story.acts) {
      if (act.card.cost === 0) {
        game.create(player, act.card)
      }
    }
  }
}
const lullaby = new Lullaby({
  name: 'Lullaby',
  id: 5218,
  cost: 6,
  points: 2,
  text: 'Create a copy in hand of each card later in the 	story with base-cost 0.',
  beta: true,
})

class Pregnant extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    const card = new Card({
      name: child.name,
      id: child.id,
      points: 2,
      text: child.text,
      qualities: child.qualities,
      basePoints: child.basePoints,
    })
    game.createInDeck(player, card)
  }
}
const pregnant = new Pregnant({
  name: 'Pregnant',
  id: 5212,
  cost: 1,
  text: 'Create a 0:2 Fleeting Child in your deck.',
  beta: true,
})

class PassOn extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.create(player, heirloom)
  }
}
const passOn = new PassOn({
  name: 'Pass On',
  id: 5213,
  cost: 4,
  qualities: [Quality.FLEETING],
  text: 'Fleeting.\nCreate a 0:4 Heirloom in hand.',
  beta: true,
})

class Village extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus + index)
  }
}
const village = new Village({
  name: 'Village',
  id: 4018,
  cost: 4,
  beta: true,
  text: 'Worth +1 for each card before this in the story.',
})

class Aspirant extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (super.exhale(3, game, player)) {
      bonus += 3
    }
    super.play(player, game, index, bonus)
  }
}
const aspirant = new Aspirant({
  name: 'Aspirant',
  id: 360,
  cost: 2,
  points: 2,
  text: 'Exhale 3: Worth +3.',
  beta: true,
})

export {
  nascence,
  birth,
  ancestry,
  theFuture,
  posterity,
  rebirth,
  cradle,
  uprising,
  // BETA
  lullaby,
  pregnant,
  passOn,
  village,
  aspirant,
}
