import Card from './card'

import * as birdsCatalog from './catalog/birds'
import * as ashesCatalog from './catalog/ashes'
import * as petCatalog from './catalog/pet'
import * as shadowCatalog from './catalog/shadow'
import * as birthCatalog from './catalog/birth'
import * as visionCatalog from './catalog/vision'
import * as starsCatalog from './catalog/stars'
import * as waterCatalog from './catalog/water'
import * as tokensCatalog from './catalog/tokens'
import { Animation } from '../animation'
import { Zone } from './zone'
import { Keyword, Keywords } from './keyword'

// TODO Break out, make settings, and make dry this behavior
class Paramountcy extends Card {
  play(player, game, index, bonus) {
    super.play(player, game, index, bonus)
    const space = 99 - (index + 1 + game.story.acts.length)
    for (let i = 0; i < Math.min(space, 5); i++) {
      if (game.pile[player].length > 0) {
        const card = game.pile[player].pop()
        game.story.addAct(card, player, i)
        game.animations[player].push(
          new Animation({
            from: Zone.Discard,
            to: Zone.Story,
            index2: i,
          }),
        )
      }
    }
  }
}
const paramountcy = new Paramountcy({
  name: 'Paramountcy',
  cost: 9,
  id: 62,
  text: 'Add the top five cards of your discard pile to the story after this.',
})

const fullCatalog = [
  ...Object.values(waterCatalog),
  ...Object.values(birdsCatalog),
  ...Object.values(ashesCatalog),
  ...Object.values(petCatalog),
  ...Object.values(shadowCatalog),
  ...Object.values(birthCatalog),
  ...Object.values(visionCatalog),
  ...Object.values(starsCatalog),
  paramountcy,
]
const nonCollectibles = [...Object.values(tokensCatalog)]
const allCards = [...fullCatalog, ...nonCollectibles]

export default class Catalog {
  static allCards = allCards
  static collectibleCards = fullCatalog.filter((c) => !c.beta)
  static betaCards = fullCatalog.filter((c) => c.beta)
  static cardback = new Card({ name: 'Cardback', id: 1000 })

  static getCard(s: string): Card {
    return allCards.find((c) => c.name === s)
  }
  static getCardById(id: number): Card {
    return allCards.find((c) => c.id === id)
  }

  // Get all card names that are referenced in a given card's text
  static getReferencedCardNames(card: Card): string[] {
    let possibleCards = Catalog.allCards
      .map((card) => card.name)
      .filter(
        (cardName) =>
          !Keywords.getAll()
            .map((kw) => kw.name)
            .includes(cardName),
      )

    // Only return cards that actually appear in the text
    return possibleCards.filter((cardName) => {
      const regex = new RegExp(`\\b${cardName}\\b`, 'g')
      return card.text.match(regex) !== null
    })
  }

  // Get all keywords present in a given card's text
  static getReferencedKeywords(card: Card): [Keyword, number][] {
    const result: [Keyword, number][] = []

    const text =
      card.text +
      Catalog.getReferencedCardNames(card)
        .map((name) => Catalog.getCard(name).text)
        .join(' ')

    // Check each keyword for matches in the text
    for (const keyword of Object.values(Keywords.getAll())) {
      // Create a regex that matches the keyword name followed by optional positive/negative number
      const regex = new RegExp(`\\b${keyword.name}[ ]*(-?\\d+)?\\b`, 'g')

      // Find first match in the text
      const match = regex.exec(text)
      if (match) {
        const amount = match[1] ? parseInt(match[1]) : undefined
        result.push([keyword, amount])
      }
    }

    return result
  }
}
