import Card from './card'
import GameModel from './gameModel'

class ClientGameModel extends GameModel {}

export default function getClientGameModel(
  orig: GameModel,
  player: number,
  isRecap: boolean,
): ClientGameModel {
  // Get the costs before copying this as json
  orig.cardCosts = orig.hand[player].map((card) => card.getCost(player, orig))

  // Create a new copy of the model
  const model = orig.getDeepCopy()

  // Set this as a recap
  model.isRecap = isRecap

  // Reverse the attributes
  if (player === 1) {
    reverseAttributes(model)
  }

  // Hide information player doesn't have
  hideHiddenInformation(model)

  return model
}

// Reverse the attributes of the given game model

function reverseAttributes(model: GameModel): void {
  // Reverse the order of these lists
  const listAttributes = [
    'hand',
    'deck',
    'pile',
    'expended',
    'breath',
    'maxBreath',
    'status',
    'vision',
    'score',
    'roundResults',
    'mulligansComplete',
    'animations',
    'lastShuffle',
    'wins',
    'amtPasses',
    'amtDrawn',
    'avatars',
  ]

  for (const attr of listAttributes) {
    model[attr].reverse()
  }

  // Flip these attributes
  const flipAttributes = ['priority', 'lastPlayerWhoPlayed']

  for (const attr of flipAttributes) {
    model[attr] = model[attr] === 1 ? 0 : 1
  }

  // Flip winner if there is one
  if (model.winner === 0) model.winner = 1
  else if (model.winner === 1) model.winner = 0

  // Flip the story
  for (const act of model.story.acts) {
    act.owner = act.owner === 1 ? 0 : 1
  }
  for (const act of model.story.resolvedActs) {
    act.owner = act.owner === 1 ? 0 : 1
  }
}

function setClientSideInformation(model: GameModel): void {
  // Set costs of cards
  for (let i = 0; i < model.hand[0].length; i++) {
    model.cardCosts[i] = model.hand[0][i].getCost(0, model)
  }
}

function hideHiddenInformation(model: GameModel) {
  const hiddenCard = new Card({ name: 'Cardback', id: 1000 })

  // Hide the ordering of player's deck
  hideDeckOrder(model)

  // Hide the opponent's hand
  model.hand[1] = model.hand[1].map(() => hiddenCard)

  // Hide the opponent's deck
  model.deck[1] = model.deck[1].map(() => hiddenCard)

  // Hide the opponent's breath
  model.breath[1] = 0

  // Hide the opponent's vision
  model.vision[1] = 0

  // Hide the opponent's animations
  model.animations[1] = []

  // Hide the opponent's amtDrawn
  model.amtDrawn[1] = 0

  // Hide opponent's cards in the story (Except the first _vision_ of them)
  if (!model.isRecap) {
    for (let i = model.vision[0]; i < model.story.acts.length; i++) {
      if (model.story.acts[i].owner === 1) {
        model.story.acts[i].card = hiddenCard
      }
    }
  }
}

function hideDeckOrder(model: GameModel) {
  model.deck[0].sort((card1: Card, card2: Card) => {
    // For even cost, sort based on name
    if (card1.cost === card2.cost) {
      return card1.name.localeCompare(card2.name)
    } else {
      return card1.cost - card2.cost
    }
  })
}
