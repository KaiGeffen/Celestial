import Card from '../card'
import { Quality } from '../quality'
import GameModel from '../gameModel'
import { Zone } from '../zone'
import { Animation } from '../../animation'
import { child } from './tokens'

class Updraft extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    // TODO Refactor out this behavior
    for (let i = 0; i < game.story.acts.length; i++) {
      const act = game.story.acts[i]

      // If it's your card and you can move forward
      const isYourCard = act.owner === player
      const canMoveForward = i + 1 < game.story.acts.length
      if (isYourCard && canMoveForward) {
        const replacedAct = game.story.acts[i + 1]
        game.story.acts[i + 1] = act
        game.story.acts[i] = replacedAct
      }
    }
  }
}
const updraft = new Updraft({
  name: 'Updraft',
  id: 9066,
  qualities: [Quality.FLEETING],
  text: 'Fleeting\nMove your next card in the story forward one spot.',
})

class Groundwork extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    // Bonus +2 for each of your cards before this and after this that aren't interrupted by your opponent's cards
    super.play(player, game, index, bonus)
  }
}
const groundwork = new Groundwork({
  name: 'Groundwork',
  id: 9002,
  cost: 1,
  text: 'Worth +2 for each of your cards in a row with this.',
})

class Retain extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.retain(1, game, player)
  }
}
const retain = new Retain({
  name: 'Retain',
  id: 9004,
  cost: 1,
  points: 1,
  text: 'Retain 1',
})

class Cliff extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.retain(1, game, player)

    if (super.exhale(3, game, player)) {
      game.removeAct(game.story.acts.length - 1)
    }
  }
}
const cliff = new Cliff({
  name: 'Cliff',
  id: 9005,
  cost: 2,
  points: 2,
  text: 'Retain 1\nExhale 3: Discard the last card in the story.',
})

class Chant extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    this.retain(1, game, player)
  }

  getCost(player: number, game: GameModel) {
    return Math.max(0, this.cost - game.amtPasses[player])
  }
}
const chant = new Chant({
  name: 'Chant',
  id: 9006,
  cost: 4,
  points: 3,
  text: 'Retain 1\nCosts 1 less for each time you’ve passed this round.',
})

class March extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    // Count before
    for (let i = game.story.resolvedActs.length - 1; i >= 0; i--) {
      const act = game.story.resolvedActs[i]
      if (act.owner === player) {
        bonus += 1
      } else {
        break
      }
    }

    // Count after
    for (let i = 0; i < game.story.acts.length; i++) {
      const act = game.story.acts[i]
      if (act.owner === player) {
        bonus += 1
      } else {
        break
      }
    }

    super.play(player, game, index, bonus)
  }
}
const march = new March({
  name: 'March',
  id: 9007,
  cost: 2,
  points: 1,
  text: 'Worth +1 for each of your cards immediately before or after this.',
})

class Salvage extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    bonus += game.endingBreath[player]
    super.play(player, game, index, bonus)

    super.retain(1, game, player)
  }
}
const salvage = new Salvage({
  name: 'Salvage',
  id: 9008,
  cost: 1,
  text: 'Retain 1\nWorth +1 for each breath you ended the last round with.',
})

class RollingStone extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    if (super.exhale(1, game, player)) {
      bonus += 1
    }

    super.play(player, game, index, bonus)
  }

  onPlay(player: number, game: GameModel) {
    if (game.status[player].retain > 0) {
      // Make the new card
      const s =
        'Fleeting\nWhen played with Retain, Reveal this to create a copy in hand.\nExhale 1: Worth +1.'
      const card = this.copy()
      card.qualities = [Quality.FLEETING]
      card.text = s

      // Create in hand
      game.create(Zone.Hand, player, card)

      // Reveal this act
      game.story.acts[game.story.acts.length - 1].revealed = true
    }
  }
}
const rollingStone = new RollingStone({
  name: 'Rolling Stone',
  id: 9009,
  text: 'When played with Retain, Reveal this to create Fleeting copy in hand.\nExhale 1: Worth +1.',
})

class Solidarity extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    if (game.story.acts.length > 0 && game.story.acts[0].owner === player) {
      this.transform(0, solidarity, game)
    }
  }
}
const solidarity = new Solidarity({
  name: 'Solidarity',
  id: 9010,
  cost: 2,
  points: 2,
  text: 'If the next card in the story is yours, tranform it into Solidarity.',
})

class Earthsong extends Card {
  onPass(playerWhoPassed: number, owner: number, game: GameModel): void {
    if (playerWhoPassed === owner) {
      game.breath[playerWhoPassed] += 1
    }
  }
}
const earthsong = new Earthsong({
  name: 'Earthsong',
  id: 9011,
  cost: 3,
  points: 3,
  text: 'When you pass while this is in the story, gain 1 breath.',
})

export {
  retain,
  cliff,
  chant,
  march,
  salvage,
  rollingStone,
  solidarity,
  earthsong,
}
