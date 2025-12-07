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
import * as specialCardsCatalog from './catalog/specialCards'
import { Keyword, Keywords } from './keyword'

const fullCatalog = [
  ...Object.values(birdsCatalog).sort((a, b) => a.cost - b.cost),
  ...Object.values(ashesCatalog).sort((a, b) => a.cost - b.cost),
  ...Object.values(petCatalog).sort((a, b) => a.cost - b.cost),
  ...Object.values(shadowCatalog).sort((a, b) => a.cost - b.cost),
  ...Object.values(birthCatalog).sort((a, b) => a.cost - b.cost),
  ...Object.values(visionCatalog).sort((a, b) => a.cost - b.cost),
  ...Object.values(starsCatalog).sort((a, b) => a.cost - b.cost),
  ...Object.values(waterCatalog).sort((a, b) => a.cost - b.cost),
  ...Object.values(specialCardsCatalog).sort((a, b) => a.cost - b.cost),
]
const nonCollectibles = [...Object.values(tokensCatalog)]
const allCards = [...fullCatalog, ...nonCollectibles]

console.log('Catalog currently has', fullCatalog.length, 'cards')

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
