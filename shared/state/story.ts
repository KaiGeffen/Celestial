import Card from '../../shared/state/card'

import { SoundEffect } from './soundEffect'
import { Quality } from './quality'
import type GameModel from './gameModel'
import getClientGameModel from './clientGameModel'
import Act from './act'

class Story {
  acts: Act[] = []
  resolvedActs: Act[] = []

  // Some effects cause a round to end immediately
  roundEndedForced: boolean = false

  // Add a card to the story with given owner and at given position
  addAct(card: Card, owner: number, i?: number) {
    const act = new Act(card, owner)
    if (i === undefined) {
      this.acts.push(act)
    } else {
      this.acts.splice(i, 0, act)
    }
  }

  // Run the current story
  run(game: GameModel) {
    game.score = [0, 0]
    game.recentModels = [[], []]
    this.resolvedActs = []
    this.roundEndedForced = false

    // Add a model at the start
    game.versionIncr()
    addRecentModels(game)

    let index = 0
    const roundEndEffects: [Function, number][] = []
    while (this.acts.length > 0 && !this.roundEndedForced) {
      const act = this.acts.shift()!

      game.sound = SoundEffect.Resolve

      act.card.play(act.owner, game, index, 0)
      roundEndEffects.push([act.card.onRoundEndIfThisResolved, act.owner])

      // Put in discard pile or remove from game if Fleeting
      if (!act.card.qualities.includes(Quality.FLEETING)) {
        game.pile[act.owner].push(act.card)
      } else {
        game.expended[act.owner].push(act.card)
      }

      // Add to the list of resolved acts
      this.resolvedActs.push(act)

      index++
      addRecentModels(game)
    }

    // Do all round end effects
    for (const [callback, player] of roundEndEffects) {
      callback(player, game)
    }
  }

  // Save the final state of the story resolving, and clear resolved acts
  saveFinalStateAndClearResolved(game: GameModel) {
    addRecentModels(game)

    this.resolvedActs = []

    // Set winner/loser/tie sfx
    if (game.score[0] > game.score[1]) {
      game.recentModels[0][game.recentModels[0].length - 1].sound =
        SoundEffect.Win
      game.recentModels[1][game.recentModels[1].length - 1].sound =
        SoundEffect.Lose
    } else if (game.score[0] < game.score[1]) {
      game.recentModels[0][game.recentModels[0].length - 1].sound =
        SoundEffect.Lose
      game.recentModels[1][game.recentModels[1].length - 1].sound =
        SoundEffect.Win
    } else {
      game.recentModels[0][game.recentModels[0].length - 1].sound =
        SoundEffect.Tie
      game.recentModels[1][game.recentModels[1].length - 1].sound =
        SoundEffect.Tie
    }
  }

  // Remove the act at the given index
  removeAct(index: number): Act {
    if (this.acts.length <= index) {
      throw new Error(
        `Tried to remove act ${index} in a story with only ${this.acts.length} acts.`,
      )
    }

    return this.acts.splice(index, 1)[0]
  }

  // Replace the act at the given index with the given act
  replaceAct(index: number, act: Act) {
    if (this.acts.length <= index) {
      throw new Error(
        `Tried to replace act ${index} in a story with only ${this.acts.length} acts.`,
      )
    }

    this.acts[index] = act
  }

  // Return a full deepcopy of the story
  getDeepCopy(): Story {
    let copy = new Story()

    this.acts.forEach((act) => {
      copy.acts.push({ ...act })
    })

    this.resolvedActs.forEach((act) => {
      copy.resolvedActs.push({ ...act })
    })

    return copy
  }
}

// Add the current state to list of remembered recent states
function addRecentModels(model: GameModel): void {
  // Get a recent model for each and add for that player
  const model0 = getClientGameModel(model, 0, true)
  model0.recentModels = [[], []]
  model0.isRecap = true
  model.recentModels[0].push(model0)

  const model1 = getClientGameModel(model, 1, true)
  model1.recentModels = [[], []]
  model1.isRecap = true
  model.recentModels[1].push(model1)

  // Increment the version
  model.versionIncr()
}

export { Act, Story }
