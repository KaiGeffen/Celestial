import Card from '../card'
import { Status } from '../status'
import { Quality } from '../quality'
import { Keywords } from '../keyword'
import { Animation } from '../../animation'
import { Zone } from '../zone'
import GameModel from '../gameModel'
import Act from '../act'

class Fruit extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.nourish(3, game, player)
  }
}
const fruit = new Fruit({
  name: 'Fruit',
  id: 11,
  cost: 3,
  text: 'Nourish 3',
})

class Oak extends Card {
  onRoundEndIfThisResolved(player: number, game: GameModel) {
    const scoreAboveWinning = game.score[player] - game.score[player ^ 1]
    const amt = Math.max(0, scoreAboveWinning)
    game.status[player].push(...Array(amt).fill(Status.NOURISH))
  }
}
const oak = new Oak({
  name: 'Oak',
  id: 23,
  cost: 8,
  points: 8,
  text: 'If you win this round, Nourish 1 for each point you won by.',
})

class Bounty extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    ;[0, 1].forEach((p) => this.nourish(2, game, p))
  }
}
const bounty = new Bounty({
  name: 'Bounty',
  id: 48,
  cost: 3,
  points: 3,
  text: 'Both players Nourish 2.',
})

class Pet extends Card {
  constructor(points: number) {
    const text = `This permanently retains all changes to its points`
    super({
      name: 'Pet',
      id: 34,
      cost: 2,
      points,
      basePoints: 1,
      text,
    })
  }

  play(player: number, game: GameModel, index: number, bonus: number) {
    let points = this.points + bonus
    points += game.status[player].filter(
      (status) => status === Status.NOURISH,
    ).length
    points -= game.status[player].filter(
      (status) => status === Status.STARVE,
    ).length

    const pet = new Pet(points)
    game.pile[player].push(pet)

    super.play(player, game, index, bonus)
    // game.soundEffect = SoundEffect.Meow;
  }
}
const pet = new Pet(1)

class Hollow extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    const amt = Math.max(0, game.score[player])
    game.score[player] = 0
    this.nourish(amt, game, player)
  }
}
const hollow = new Hollow({
  name: 'Hollow',
  id: 76,
  text: 'Set your points to 0. Nourish 1 for each point you lost this way.',
})

class HoldTight extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    if (game.pile[player].length > 0) {
      const card = game.pile[player].pop()
      game.deck[player].push(card)
      game.animations[player].push(
        new Animation({
          from: Zone.Discard,
          to: Zone.Deck,
          card: card,
        }),
      )
    }
  }
}
const holdTight = new HoldTight({
  name: 'Hold Tight',
  id: 33,
  cost: 2,
  points: 2,
  text: 'Put the top card of your discard pile on on top of your deck.',
})

// BETA TODO
class Yearn extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (super.exhale(3, game, player)) {
      // If the discard pile has at least one card
      if (game.pile[player].length > 0) {
        // And the top card costs 3 or less
        if (game.pile[player][game.pile[player].length - 1].cost <= 3) {
          const card = game.pile[player].pop()

          // Add the card as a new act
          game.story.addAct(card, player, 0)

          // Animate the movement
          game.animations[player].push(
            new Animation({
              from: Zone.Discard,
              to: Zone.Story,
              index2: 0,
            }),
          )
        }
      }
    }
  }
}
const yearn = new Yearn({
  name: 'Yearn',
  id: 233,
  cost: 1,
  points: 1,
  text: 'Exhale 3: Add the top card of your discard pile to the story after this if it has base cost 3 or less.',
  beta: true,
})

class Pomegranate extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.nourish(6, game, player)
  }
}
const pomegranate = new Pomegranate({
  name: 'Pomegranate',
  id: 411,
  cost: 5,
  text: 'Nourish 6',
  beta: true,
})

class Abundance extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (super.exhale(1, game, player)) {
      if (game.score[player] >= 7) {
        this.nourish(4, game, player)
      }
    }
  }
}
const abundance = new Abundance({
  name: 'Abundance',
  id: 435,
  cost: 2,
  points: 2,
  text: 'Exhale 1: If you have 7 or more points, Nourish 4.',
  beta: true,
})

class Rose extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.nourish(2, game, player)
  }
}
const rose = new Rose({
  name: 'Rose',
  id: 437,
  cost: 1,
  points: -1,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nNourish 2',
  beta: true,
})

class Celebration extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (super.exhale(5, game, player)) {
      let amtAdded = 0
      for (let iHand = 0; iHand < game.hand[player].length; iHand++) {
        // If the card costs 3 or less
        if (game.hand[player][iHand].cost <= 3) {
          // Get the card and remove it from hand
          const card = game.hand[player].splice(iHand, 1)[0]

          // Add the card as a new act
          game.story.addAct(card, player, amtAdded)

          // Animate the movement
          game.animations[player].push(
            new Animation({
              from: Zone.Hand,
              to: Zone.Story,
              index: iHand,
              index2: index + amtAdded,
            }),
          )

          // Keep track of how many added
          amtAdded += 1

          // Decrement i to account for hand shrinking
          iHand -= 1
        }
      }
    }
  }
}
const celebration = new Celebration({
  name: 'Celebration',
  id: 4437,
  cost: 3,
  points: 3,
  text: 'Exhale 5: Add each card with base-cost 3 or less from your hand to the story after this.',
  beta: true,
})

// TODO Rename
class Supernova extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (super.exhale(4, game, player)) {
      game.score[player] *= 2
    }
  }
}
const supernova = new Supernova({
  name: 'Supernova',
  id: 4835,
  cost: 4,
  points: 4,
  text: 'Exhale 4: Double your points.',
  beta: true,
})

class Berry extends Card {
  private timesPlayed: number
  constructor(timesPlayed: number) {
    let s = `Nourish ${1 + timesPlayed}\nWhen played, give this Nourish 1.`
    super({
      name: 'Berry',
      id: 4044,
      cost: 2,
      text: s,
      beta: true,
    })

    this.timesPlayed = timesPlayed
  }

  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.nourish(1 + this.timesPlayed, game, player)
  }

  onPlay(player: number, game: GameModel) {
    const index = game.story.acts.length - 1

    // Replace this card's act with a new one with +1 times played
    const newCard = new Berry(this.timesPlayed + 1)
    const newAct = new Act(newCard, player)
    game.story.replaceAct(index, newAct)
  }
}
const berry = new Berry(0)

export {
  fruit,
  oak,
  bounty,
  pet,
  hollow,
  holdTight,
  // NEW
  yearn,
  pomegranate,
  abundance,
  rose,
  celebration,
  supernova,
  berry,
}
