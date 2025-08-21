import Card from './card'
import Catalog from './catalog'
import type GameModel from './gameModel'
import { Zone } from './zone'
import { Visibility } from '../animation'
import { match } from 'assert'

export default function getClientGameModel(
  orig: GameModel,
  player: number,
  isRecap: boolean,
): GameModel {
  // Get the costs before copying this as json
  orig.cardCosts = orig.hand[player].map((card) => orig.getCost(card, player))

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
    'score',
    'roundResults',
    'mulligansComplete',
    'animations',
    'lastShuffle',
    'wins',
    'amtPasses',
    'amtDrawn',
    'cosmeticSets',
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
  model.status[1].vision = 0

  // Hide some of the opponent's animations
  hideHiddenOpponentAnimations(model)

  // Hide the opponent's amtDrawn
  model.amtDrawn[1] = 0

  // Hide opponent's cards in the story (Except the first _vision_ of them)
  if (!model.isRecap) {
    for (let i = model.status[0].vision; i < model.story.acts.length; i++) {
      const act = model.story.acts[i]
      if (act.owner === 1 && !act.card.isVisible()) {
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

function hideHiddenOpponentAnimations(model: GameModel) {
  model.animations[1] = model.animations[1]
    // Hide initial cards drawn for the opponent
    .filter((_) => model.versionNo > 0)
    // Hide mulligan choices
    .filter((animation) => animation.from !== Zone.Mulligan)
    // Obfuscate the cards opponent is drawing
    .map((animation) => {
      if (animation.to === Zone.Hand) {
        switch (animation.visibility) {
          case undefined:
          case Visibility.KnowItOccurred:
            // Know that a card has been drawn but don't know the card
            // e.g., mask the card
            animation.card = Catalog.cardback
            break
          case Visibility.KnowAllDetails:
            // Know that a card has been drawn and know the card
            // e.g., leave the card as is
            // (no action needed)
            break
          case Visibility.FullyUnknown:
            // Don't know the action occurred
            // e.g., maybe remove or hide the animation
            // (handle as needed, e.g., set to null or skip)
            animation.card = null
            break
          default:
            // Optional: handle unexpected values
            break
        }
      }
      return animation
    })
    // Remove any animations that are now null
    .filter((animation) => animation.card !== null)
}
