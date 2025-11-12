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

// Helper function to get all cards from a catalog except the last 3
const getAllButLast3 = (catalog: Record<string, Card>): Card[] => {
  const allCards = Object.values(catalog)
  return allCards.length > 3 ? allCards.slice(0, -3) : []
}

// The starting cards a player has (all cards except the last 3 from each catalog)
export const startingInventory: Card[] = [
  ...getAllButLast3(birdsCatalog),
  ...getAllButLast3(ashesCatalog),
  ...getAllButLast3(petCatalog),
  ...getAllButLast3(shadowCatalog),
  ...getAllButLast3(birthCatalog),
  ...getAllButLast3(visionCatalog),
  ...getAllButLast3(starsCatalog),
  ...getAllButLast3(waterCatalog),
  ...getAllButLast3(tokensCatalog),
  ...getAllButLast3(specialCardsCatalog),
]

/*

Refresh, Overflow, Cloud
Phoenix, Secretary Bird, Rooster
From Ashes, Goliath, Parch
Sensualist, Yearn, Abundance
Sickness, Wing Clipping
Rebirth, Storytime, Just like Dad
Riddle, Timid, Bull
Pride, Fates, Hero
Paramountcy

*/
