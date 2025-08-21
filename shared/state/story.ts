import Card from '../../shared/state/card'

import { SoundEffect } from './soundEffect'
import type GameModel from './gameModel'
import getClientGameModel from './clientGameModel'
import Act from './act'

class Story {
  acts: Act[] = []

  // The index in the story of the current act
  currentIndex: number = 0

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

    // Add a model at the start
    game.versionIncr()
    addRecentModels(game)

    const roundEndEffects: [Function, number][] = []
    for (
      this.currentIndex = 0;
      this.currentIndex < this.acts.length;
      this.currentIndex++
    ) {
      const act = this.acts[this.currentIndex]

      // Reset the sound, changed if the card sets it
      game.sound = SoundEffect.Resolve
      act.card.play(act.owner, game, this.currentIndex, 0)

      // Add any card end effects the card may have
      // TODO Just scan at the end before discarding the card
      roundEndEffects.push([act.card.onRoundEndIfThisResolved, act.owner])

      addRecentModels(game)
    }

    // Do all round end effects
    for (const [callback, player] of roundEndEffects) {
      callback(player, game)
    }
  }

  // Save the final state of the story resolving, and clear the story
  saveFinalStateAndClear(game: GameModel) {
    addRecentModels(game)

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

    // Clear the story
    this.acts = []
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

    copy.currentIndex = this.currentIndex

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
