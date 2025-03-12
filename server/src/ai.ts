import { MechanicsSettings } from '../../shared/settings'
import { Status } from '../../shared/state/status'
import { Quality } from '../../shared/state/quality'
import GameModel from '../../shared/state/gameModel'

const TIME_PAUSE = 0

function getPowerset<T>(arr: T[]): T[][] {
  const result: T[][] = [[]]
  for (const value of arr) {
    const length = result.length
    for (let i = 0; i < length; i++) {
      result.push(result[i].concat(value))
    }
  }
  return result
}

function predictPointDifference(model: GameModel): number {
  let ourPoints = 0
  let theirPoints = 0

  let ourNourish =
    model.status[0].filter((s: Status) => s === Status.NOURISH).length -
    model.status[0].filter((s: Status) => s === Status.STARVE).length
  let theirNourish =
    model.status[1].filter((s: Status) => s === Status.NOURISH).length -
    model.status[1].filter((s: Status) => s === Status.STARVE).length

  let theirBreath =
    model.maxBreath[0] +
    model.status[1].filter((s: Status) => s === Status.INSPIRED).length
  let theyPlayedHiddenCards = false

  for (const act of model.story.acts) {
    if (act.owner === 0) {
      ourPoints += ourNourish
      ourNourish = 0
      ourPoints += act.card.points
    } else {
      theirPoints += theirNourish
      theirNourish = 0
      if (act.card.qualities.includes(Quality.VISIBLE)) {
        theirPoints += act.card.points
        theirBreath -= act.card.cost
      } else {
        theyPlayedHiddenCards = true
      }
    }
  }

  if (theyPlayedHiddenCards) {
    theirPoints += theirBreath
  }

  return ourPoints - theirPoints
}

function wantDryRound(model: GameModel): boolean {
  let result = 0
  const weDraw = Math.min(
    2,
    6 - model.hand[0].length,
    model.deck.length + model.pile[0].length,
  )
  result += 2 * weDraw
  const theyDraw = Math.min(
    2,
    6 - model.hand[1].length,
    model.deck[1].length + model.pile[1].length,
  )
  result -= 2 * theyDraw

  result -= model.status[0].filter((s: Status) => s === Status.INSPIRED).length
  result += model.status[1].filter((s: Status) => s === Status.INSPIRED).length

  return result > 0
}

function rateTurn(turn: number[], model: GameModel): number {
  // The speculative model we're predicting
  const predictedModel = model.getDeepCopy()

  // How much breath we have left
  let remainingBreath = predictedModel.breath[0]

  // The total value of this
  let result = 0

  for (const cardNum of turn) {
    const card = predictedModel.hand[0][cardNum]

    if (card === undefined) {
      throw new Error('Card that ai is considering playing is undefined')
    }

    remainingBreath -= card.getCost(0, model)

    // If we have spent more breath than we have, this is impossible
    if (remainingBreath < 0) {
      return -1
    }

    // Add the heuristic value of playing the card with this game state
    result += card.ratePlay(predictedModel)

    // Speculate about adding this act
    predictedModel.story.addAct(card, 0)
  }

  return result
}

function getAIAction(model: GameModel): number {
  // Pause for the set amount of time
  setTimeout(() => {}, TIME_PAUSE)

  // Determine the difference in points
  const pointDifference = predictPointDifference(model)

  // If we are ahead, pass
  if (pointDifference > 0) {
    return MechanicsSettings.PASS
  }

  if (
    // Want no plays to occur
    wantDryRound(model) &&
    // We have less than max breath
    model.maxBreath[0] < MechanicsSettings.BREATH_CAP &&
    // All the cards in the story are from us
    model.story.acts.every((act) => act.owner === 0)
  ) {
    return MechanicsSettings.PASS
  }

  // The best heuristic score we have found
  let highScore = 0
  // The list of cards to play in the best play we have found
  let bestPossible: number[] | null = null
  for (const possibleTurn of getPowerset([
    ...Array(model.hand[0].length).keys(),
  ])) {
    const score = rateTurn(possibleTurn, model)

    // If this is better than the best we've found
    if (score > highScore) {
      highScore = score
      bestPossible = possibleTurn
    }
  }

  // If there is no best, pass
  if (bestPossible === null || bestPossible.length === 0) {
    return MechanicsSettings.PASS
  } else {
    // Sort the list of cards to play for the best play by which are better to play early vs late
    bestPossible.sort(
      (a, b) =>
        model.hand[0][a].rateDelay(model) - model.hand[0][b].rateDelay(model),
    )

    // Return the first play of that best play
    return bestPossible[0]
  }
}

export { getAIAction as getAction }
