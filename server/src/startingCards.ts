import Card from '../../shared/state/card'
import Catalog from '../../shared/state/catalog'

import * as birdsCatalog from '../../shared/state/catalog/birds'
import * as ashesCatalog from '../../shared/state/catalog/ashes'
import * as petCatalog from '../../shared/state/catalog/pet'
import * as shadowCatalog from '../../shared/state/catalog/shadow'
import * as birthCatalog from '../../shared/state/catalog/birth'
import * as visionCatalog from '../../shared/state/catalog/vision'
import * as starsCatalog from '../../shared/state/catalog/stars'
import * as waterCatalog from '../../shared/state/catalog/water'

// Helper function to get first N non-beta cards from a catalog, sorted by cost
const getFirstNFromTheme = (
  catalog: Record<string, Card>,
  n: number,
): Card[] => {
  const allCards = Object.values(catalog)
    .filter((card) => !card.beta)
    .sort((a, b) => a.cost - b.cost)
  return allCards.slice(0, n)
}

// Get 10 starting cards from each of the 8 themes (80 total)
export const getStartingCardIds = (): number[] => {
  const startingCards: Card[] = [
    ...getFirstNFromTheme(waterCatalog, 10),
    ...getFirstNFromTheme(birdsCatalog, 10),
    ...getFirstNFromTheme(ashesCatalog, 10),
    ...getFirstNFromTheme(petCatalog, 10),
    ...getFirstNFromTheme(shadowCatalog, 10),
    ...getFirstNFromTheme(birthCatalog, 10),
    ...getFirstNFromTheme(visionCatalog, 10),
    ...getFirstNFromTheme(starsCatalog, 10),
  ]

  return startingCards.map((card) => card.id)
}

// Create a bit string representing card ownership
// The string is indexed by card ID, where each position represents whether that card ID is owned
export const getStartingCardInventoryBitString = (): string => {
  const startingCardIds = getStartingCardIds()

  // Find the maximum card ID to determine the array size
  const allCollectibleCards = Catalog.collectibleCards
  const maxCardId = Math.max(...allCollectibleCards.map((card) => card.id))

  // Create array indexed by card ID, initialized to all false
  const inventory = new Array(maxCardId + 1).fill(false)

  // Set owned cards to true
  for (const cardId of startingCardIds) {
    if (cardId <= maxCardId) {
      inventory[cardId] = true
    }
  }

  // Convert to bit string
  return inventory.map((value) => (value ? '1' : '0')).join('')
}
