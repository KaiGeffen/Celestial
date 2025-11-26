import * as birdsCatalog from './catalog/birds'
import * as ashesCatalog from './catalog/ashes'
import * as petCatalog from './catalog/pet'
import * as shadowCatalog from './catalog/shadow'
import * as birthCatalog from './catalog/birth'
import * as visionCatalog from './catalog/vision'
import * as starsCatalog from './catalog/stars'
import * as waterCatalog from './catalog/water'

import Card from './card'

// TODO Make the text for card's include escapes such that it translates for each upgrade from the single string (Ex: "Each player draws ${1 + upgradeVersion} cards.")

// Upgrade registry: maps cardId -> version -> modifications
// Version 0 is base card, 1 and 2 are upgrades
// cost and points are relative changes (e.g., -1 means 1 less, +1 means 1 more)
// text and qualities are absolute replacements
export const cardUpgrades: {
  [cardId: number]: {
    [version: number]: Partial<{
      cost: number
      points: number
      text: string
      qualities: any[]
    }>
  }
} = {
  [birdsCatalog.dove.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birdsCatalog.starling.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birdsCatalog.truth.id]: {
    1: { cost: -1 },
    2: { points: 2 },
  },

  // WATER
  [waterCatalog.mercy.id]: {
    1: { text: 'Each player draws 3 cards.' },
    2: { text: 'Draw a card.' },
  },
}

/**
 * Creates an upgraded version of a card
 * @param baseCard - The base card to upgrade
 * @param version - The version number (0 = base, 1 = upgrade 1, 2 = upgrade 2)
 * @returns A new card instance with the upgrade applied
 */
export function createUpgradedCard(baseCard: Card, version: number): Card {
  if (version === 0) {
    // Return base card as-is
    const card = baseCard.copy()
    card.upgradeVersion = 0
    return card
  }

  // Get upgrade modifications for this card and version
  const upgrades = cardUpgrades[baseCard.id]
  if (!upgrades || !upgrades[version]) {
    // No upgrade defined, return base card
    const card = baseCard.copy()
    card.upgradeVersion = version
    return card
  }

  const modifications = upgrades[version]

  // Create a copy of the base card
  const upgradedCard = baseCard.copy()

  // Apply modifications
  // Cost is relative (add/subtract from base)
  if (modifications.cost !== undefined) {
    upgradedCard.cost = baseCard.cost + modifications.cost
  }
  // Points is relative and affects both points and basePoints
  if (modifications.points !== undefined) {
    upgradedCard.points = baseCard.points + modifications.points
    upgradedCard.basePoints = baseCard.basePoints + modifications.points
  }
  // Text is absolute replacement
  if (modifications.text !== undefined) {
    upgradedCard.text = modifications.text
  }
  // Qualities is absolute replacement
  if (modifications.qualities !== undefined) {
    upgradedCard.qualities = [...modifications.qualities]
  }

  // Set the version
  upgradedCard.upgradeVersion = version

  return upgradedCard
}

/**
 * Gets all available versions of a card (base + upgrades)
 * @param baseCard - The base card
 * @returns Array of cards: [base, version1, version2]
 */
export function getAllCardVersions(baseCard: Card): Card[] {
  return [
    createUpgradedCard(baseCard, 0),
    createUpgradedCard(baseCard, 1),
    createUpgradedCard(baseCard, 2),
  ]
}

/**
 * Converts a card ID and version to a Card object with the correct version
 */
export function getCardWithVersion(
  cardId: number,
  version: number,
  catalog: any,
): Card | null {
  const baseCard = catalog.getCardById(cardId)
  if (!baseCard) return null
  return createUpgradedCard(baseCard, version)
}
