import GameModel from './gameModel'
import Card from './card'
import { Story } from './story'
import { Quality } from './quality'
import { CosmeticSet } from '../types/cosmeticSet'

// Story with funtionality needed for the special modes
class SpecialStory extends Story {
  enabledModes: number[]

  constructor(enabledModes: number[]) {
    super()
    this.enabledModes = enabledModes
  }

  addAct(card: Card, owner: number, i?: number) {
    // Mode 2: When a card is added to the story, increase its points by 1
    if (this.enabledModes.includes(2)) {
      card = card.copy()
      card.points += 1
    }

    super.addAct(card, owner, i)
  }

  run(game: GameModel) {
    super.run(game)

    // Mode 4: Cards that have been removed from the game are added back to the discard pile
    if (this.enabledModes.includes(4)) {
      for (const player of [0, 1]) {
        // Move all cards from expended to pile
        const allRemovedCards = [...game.expended[player]]
        game.expended[player] = []
        game.pile[player].push(...allRemovedCards)
      }
    }
  }
}

// Special GameModel that handles special modes
export default class SpecialGameModel extends GameModel {
  enabledModes: number[]

  constructor(
    deck1: Card[],
    deck2: Card[],
    cosmeticSet1: CosmeticSet,
    cosmeticSet2: CosmeticSet,
    enabledModes: number[],
  ) {
    super(deck1, deck2, cosmeticSet1, cosmeticSet2, true)

    this.enabledModes = enabledModes

    // Mode 0: Starting breath is 3 instead of 1
    if (this.enabledModes.includes(0)) {
      this.maxBreath = [3, 3]
      this.breath = [3, 3]
    }

    // Replace story with special story
    this.story = new SpecialStory(enabledModes)
  }

  // Mode 3: At the end of each round, discard a card
  // This is called after the story resolves and round count is incremented
  onRoundEnd() {
    if (this.enabledModes.includes(3)) {
      for (const player of [0, 1]) {
        if (this.hand[player].length > 0) {
          // Discard the first card in hand
          this.discard(player, 1)
        }
      }
    }
  }
}
