import Card from './card'

// Upgrade registry: maps cardId -> version -> modifications
// Version 0 is base card, 1 and 2 are upgrades
export const cardUpgrades: {
  [cardId: number]: {
    [version: number]: Partial<{
      cost: number
      points: number
      basePoints: number
      text: string
      qualities: any[]
    }>
  }
} = {
  // Dove (id: 4)
  4: {
    1: { cost: 0 }, // Version 1: cost becomes 0
    2: { points: 2 }, // Version 2: points becomes 2
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
  if (modifications.cost !== undefined) {
    upgradedCard.cost = modifications.cost
  }
  if (modifications.points !== undefined) {
    upgradedCard.points = modifications.points
  }
  if (modifications.basePoints !== undefined) {
    upgradedCard.basePoints = modifications.basePoints
  }
  if (modifications.text !== undefined) {
    upgradedCard.text = modifications.text
  }
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
