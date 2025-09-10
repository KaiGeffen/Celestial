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
  points: 1,
  text: 'Birth 2',
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
  text: 'Draw a card.\nCosts X less, where X is the total point value of each Child in your hand.',
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
})

class Rebirth extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    let idx = 0
    for (const act of game.story.acts) {
      if (act.owner === player) {
        const card = child.copy()
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
  cost: 1,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nTransform each of your cards later in the story into a 0:X Child, where X is its cost.',
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
})

class Uprising extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
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
class Storytime extends Card {
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
const storytime = new Storytime({
  name: 'Storytime',
  id: 82,
  cost: 6,
  points: 2,
  text: 'Create a copy in hand of each card later in the 	story with base-cost 0.',
})

class Pregnant extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    const card = new Card({
      name: child.name,
      id: child.id,
      text: child.text,
      qualities: child.qualities,
      basePoints: child.basePoints,
    })
    game.createOnDeck(player, card)
  }
}
const pregnant = new Pregnant({
  name: 'Pregnant',
  id: 83,
  cost: 1,
  text: 'Create a Child on top of your deck.',
})

class PassOn extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    game.create(player, heirloom)
  }
}
const passOn = new PassOn({
  name: 'Pass On',
  id: 84,
  cost: 4,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nCreate an Heirloom in hand.',
})

class JustLikeDad extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (super.exhale(2, game, player)) {
      if (game.story.acts.length > 0) {
        const card = game.story.acts[game.story.acts.length - 1].card
        game.create(player, card)
      }
    }
  }
}
const justLikeDad = new JustLikeDad({
  name: 'Just Like Dad',
  id: 85,
  cost: 1,
  points: 1,
  text: 'Exhale 2: Create a copy in hand of the last card in the story.',
})

class Hug extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (game.story.acts.length > 0 && game.story.acts[0].owner === player) {
      bonus += 2
    }
    super.play(player, game, index, bonus)
  }
}
const hug = new Hug({
  name: 'Hug',
  id: 86,
  cost: 2,
  points: 1,
  text: 'Worth +2 if the next card in the story is yours.',
})

class LittleMischief extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    bonus += game.amtCardsPlayedLastRound[player]

    super.play(player, game, index, bonus)
  }
}
const littleMischief = new LittleMischief({
  name: 'Little Mischief',
  id: 5086,
  cost: 5,
  points: 3,
  text: 'Worth +1 for each card you played last round.',
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
  storytime,
  pregnant,
  passOn,
  justLikeDad,
  hug,
  littleMischief,
}
