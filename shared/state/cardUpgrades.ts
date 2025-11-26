import * as birdsCatalog from './catalog/birds'
import * as ashesCatalog from './catalog/ashes'
import * as petCatalog from './catalog/pet'
import * as shadowCatalog from './catalog/shadow'
import * as birthCatalog from './catalog/birth'
import * as visionCatalog from './catalog/vision'
import * as starsCatalog from './catalog/stars'
import * as waterCatalog from './catalog/water'
import * as specialCardsCatalog from './catalog/specialCards'

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
  // BIRDS
  [birdsCatalog.dove.id]: {
    1: { cost: -1 },
    2: {
      text:
        birdsCatalog.dove.text +
        '\nPut the top card with base cost 1 from your deck into your hand.',
    },
  },
  [birdsCatalog.starling.id]: {
    1: { text: birdsCatalog.starling.text.replace('the next', 'your next') },
    2: { text: birdsCatalog.starling.text.replace('+1', '+3') },
  },
  [birdsCatalog.secretaryBird.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birdsCatalog.phoenix.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birdsCatalog.heron.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birdsCatalog.fledgling.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birdsCatalog.nest.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birdsCatalog.truth.id]: {
    1: { cost: -1 },
    2: { points: 2 },
  },
  [birdsCatalog.defiance.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birdsCatalog.layBare.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birdsCatalog.vulture.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birdsCatalog.rooster.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birdsCatalog.letGo.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },

  // ASHES
  [ashesCatalog.dash.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [ashesCatalog.impulse.id]: {
    1: { points: 1 },
    2: {
      qualities: [],
      text: ashesCatalog.impulse.text.replace('Fleeting\n', ''),
    },
  },
  [ashesCatalog.mine.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [ashesCatalog.arsonist.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [ashesCatalog.parch.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [ashesCatalog.veteran.id]: {
    1: {
      points: -4,
      cost: 1,
      text: 'Worth +1 for each card in your discard pile.',
    },
    2: {
      text: ashesCatalog.veteran.text.replace('Worth +3', 'Double your points'),
    },
  },
  [ashesCatalog.cling.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [ashesCatalog.death.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [ashesCatalog.fromAshes.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [ashesCatalog.goliath.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [ashesCatalog.firebug.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [ashesCatalog.immolant.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [ashesCatalog.spark.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },

  // PET
  [petCatalog.fruit.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [petCatalog.oak.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [petCatalog.bounty.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [petCatalog.pet.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [petCatalog.hollow.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [petCatalog.holdTight.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [petCatalog.yearn.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [petCatalog.pomegranate.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [petCatalog.abundance.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [petCatalog.rose.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [petCatalog.parade.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [petCatalog.meAndHer.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [petCatalog.sensualist.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },

  // SHADOW
  [shadowCatalog.dagger.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [shadowCatalog.shadow.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [shadowCatalog.imprison.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [shadowCatalog.nightmare.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [shadowCatalog.boa.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [shadowCatalog.hungryGhost.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [shadowCatalog.hurricane.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [shadowCatalog.wingClipping.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [shadowCatalog.sickness.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [shadowCatalog.victim.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [shadowCatalog.lostInShadow.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [shadowCatalog.vampire.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },

  // BIRTH
  [birthCatalog.nascence.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birthCatalog.birth.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birthCatalog.ancestry.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birthCatalog.theFuture.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birthCatalog.posterity.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birthCatalog.rebirth.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birthCatalog.cradle.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birthCatalog.uprising.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birthCatalog.storytime.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birthCatalog.pregnant.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birthCatalog.passOn.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birthCatalog.justLikeDad.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [birthCatalog.hug.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },

  // VISION
  [visionCatalog.dawn.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [visionCatalog.nectar.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [visionCatalog.clearView.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [visionCatalog.awakening.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [visionCatalog.enlightenment.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [visionCatalog.prey.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [visionCatalog.conquer.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [visionCatalog.timid.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [visionCatalog.balance.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [visionCatalog.riddle.id]: {
    1: { points: 1 },
    2: { qualities: [], text: "When played, double this card's points." },
  },
  [visionCatalog.bull.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [visionCatalog.lantern.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [visionCatalog.beggingBowl.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },

  // STARS
  [starsCatalog.stars.id]: {
    1: { text: starsCatalog.stars.text.replace('1', '2') },
    2: { text: starsCatalog.stars.text + '\nDraw a card.' },
  },
  [starsCatalog.cosmos.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [starsCatalog.nightVision.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [starsCatalog.ecology.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [starsCatalog.sun.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [starsCatalog.moon.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [starsCatalog.sunflower.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [starsCatalog.fates.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [starsCatalog.hero.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [starsCatalog.possibility.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [starsCatalog.cloakOfStars.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [starsCatalog.dreamer.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [starsCatalog.pride.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },

  // WATER
  [waterCatalog.mercy.id]: {
    1: { text: 'Each player draws 3 cards.' },
    2: { text: 'Draw a card.' },
  },
  [waterCatalog.excess.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [waterCatalog.fishingBoat.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [waterCatalog.drown.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [waterCatalog.iceberg.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [waterCatalog.dew.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [waterCatalog.gentleRain.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [waterCatalog.refresh.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [waterCatalog.fish.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [waterCatalog.cloud.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [waterCatalog.gainAndLoss.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [waterCatalog.damBreaks.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },
  [waterCatalog.overflow.id]: {
    1: { cost: -1 },
    2: { points: 1 },
  },

  // SPECIAL
  [specialCardsCatalog.paramountcy.id]: {
    1: { cost: -1 },
    2: { points: 1 },
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
