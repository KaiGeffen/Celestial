import Card from '../../shared/state/card'
import Catalog from '../../shared/state/catalog'

/* 
  Every card currently in the game, EXCEPT:
  - Phoenix, Secretary Bird, Rooster
  - From Ashes, Goliath, Parch
  - Sensualist, Yearn, Abundance
  - Sickness, Wing Clipping
  - Rebirth, Storytime, Just like Dad
  - Riddle, Timid, Bull
  - Pride, Fates, Hero
  - Refresh, Overflow, Cloud
  - Paramountcy
  */

const STARTING_CARD_NAMES: string[] = [
  // Birds
  'Dove',
  'Starling',
  'Heron',
  'Fledgling',
  'Nest',
  'Truth',
  'Defiance',
  'Lay Bare',
  'Vulture',
  'Let Go',

  // Ashes
  'Dash',
  'Impulse',
  'Mine',
  'Arsonist',
  'Death',
  'Cling',
  'Firebug',
  'Immolant',
  'Veteran',
  'Spark',

  // Pet
  'Fruit',
  'Oak',
  'Bounty',
  'Pet',
  'Hollow',
  'Hold Tight',
  'Rose',
  'Parade',
  'Me and Her',
  'Pomegranate',

  // Shadow
  'Dagger',
  'Shadow',
  'Imprison',
  'Nightmare',
  'Boa',
  'Hungry Ghost',
  'Victim',
  'Lost in Shadow',
  'Vampire',
  'Hurricane',

  // Birth
  'Nascence',
  'Birth',
  'Ancestry',
  'The Future',
  'Posterity',
  'Cradle',
  'Uprising',
  'Pregnant',
  'Pass On',
  'Hug',

  // Vision
  'Dawn',
  'Nectar',
  'Clear View',
  'Awakening',
  'Enlightenment',
  'Prey',
  'Conquer',
  'Balance',
  'Lantern',
  'Begging Bowl',

  // Stars
  'Stars',
  'Cosmos',
  'Night Vision',
  'Ecology',
  'Sun',
  'Moon',
  'Sunflower',
  'Cloak of Stars',
  'Dreamer',
  'Possibility',

  // Water
  'Mercy',
  'Excess',
  'Fishing Boat',
  'Drown',
  'Iceberg',
  'Dew',
  'Gentle Rain',
  'Fish',
  'Gain and Loss',
  'Dam Breaks',
]

// Create a bit string representing card ownership
// The string is indexed by card ID, where each position represents whether that card ID is owned
export const getStartingInventoryBitString = (): string => {
  // Find the maximum card ID to determine the array size
  const allCollectibleCards = Catalog.collectibleCards
  const maxCardId = Math.max(...allCollectibleCards.map((card) => card.id))

  // Create array indexed by card ID, initialized to all false
  const inventory = new Array(maxCardId + 1).fill(false)

  // Set owned cards to true
  STARTING_CARD_NAMES.forEach((name) => {
    const card = Catalog.getCard(name)
    if (!card) {
      throw new Error(`Card not found: ${name}`)
    }
    inventory[card.id] = true
  })

  // Convert to bit string
  return inventory.map((value) => (value ? '1' : '0')).join('')
}
