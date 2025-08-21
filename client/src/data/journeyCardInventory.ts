import Card from '../../../shared/state/card'
import Catalog from '../../../shared/state/catalog'
import { getCharacterLevel } from './levelProgression'

// The cards you have at the start of the game
const STARTING_CARDS = [
  Catalog.getCard('Dove'),
  Catalog.getCard('Dash'),
  Catalog.getCard('Hurricane'),
  Catalog.getCard('Fruit'),
  Catalog.getCard('Uprising'),
  // Not from the character's
  Catalog.getCard('Stars'),
  Catalog.getCard('Cosmos'),
  Catalog.getCard('Mercy'),
]

// The cards unlocked for each character at each level
const UNLOCKS_PER_CHARACTER = [
  [
    [Catalog.getCard('Starling')],
    [Catalog.getCard('Sun')],
    [Catalog.getCard('Heron')],
    [Catalog.getCard('Phoenix')],
    [Catalog.getCard('Vulture')],
    [Catalog.getCard('Rooster')],
    [Catalog.getCard('Nest')],
    [Catalog.getCard('Let Go')],
    [Catalog.getCard('Truth')],
  ],
  [
    [Catalog.getCard('Impulse'), Catalog.getCard('Veteran')],
    [Catalog.getCard('Arsonist')],
    [Catalog.getCard('Death')],
    [Catalog.getCard('Cling')],
    [Catalog.getCard('Mine')],
    [Catalog.getCard('Firebug')],
    [Catalog.getCard('Immolant')],
    [Catalog.getCard('Parch')],
    [Catalog.getCard('Goliath')],
  ],
  // Mia
  [
    [Catalog.getCard('Dagger'), Catalog.getCard('Shadow')],
    [Catalog.getCard('Hungry Ghost')],
    [Catalog.getCard('Victim')],
    [Catalog.getCard('Nightmare')],
    [Catalog.getCard('Wing Clipping')],
    [Catalog.getCard('Imprison')],
    [Catalog.getCard('Sickness')],
    [Catalog.getCard('Boa')],
    [Catalog.getCard('Lost in Shadow')],
  ],
  // Kitz
  [
    [Catalog.getCard('Pet'), Catalog.getCard('Hold Tight')],
    [Catalog.getCard('Oak')],
    [Catalog.getCard('Rose')],
    [Catalog.getCard('Sunflower')],
    [Catalog.getCard('Hollow')],
    [Catalog.getCard('Yearn')],
    [Catalog.getCard('Sensualist')],
    [Catalog.getCard('Bounty')],
    [Catalog.getCard('Pomegranate')],
  ],
  // Imani
  [
    [Catalog.getCard('Nascence'), Catalog.getCard('Hug')],
    [Catalog.getCard('Birth')],
    [Catalog.getCard('The Future')],
    [Catalog.getCard('Posterity')],
    [Catalog.getCard('Ancestry')],
    [Catalog.getCard('Pregnant')],
    [Catalog.getCard('Cradle')],
    [Catalog.getCard('Pass On')],
    [Catalog.getCard('Rebirth')],
  ],
  // Mitra
  [
    [Catalog.getCard('Dawn'), Catalog.getCard('Conquer')],
    [Catalog.getCard('Prey')],
    [Catalog.getCard('Clear View')],
    [Catalog.getCard('Enlightenment')],
    [Catalog.getCard('Balance')],
    [Catalog.getCard('Awakening')],
    [Catalog.getCard('Timid')],
    [Catalog.getCard('Riddle')],
    [Catalog.getCard('Lantern')],
  ],
]

export default function getUnlockedCards(): Set<Card> {
  const unlockedCards = new Set<Card>()

  // Add starting cards
  STARTING_CARDS.forEach((card) => {
    unlockedCards.add(card)
  })

  // Add each card unlocked by level
  for (
    let character = 0;
    character < UNLOCKS_PER_CHARACTER.length;
    character++
  ) {
    // What level character has achieved
    const characterLevel = getCharacterLevel(character).level

    // Unlock all cards below that level
    for (let level = 0; level < characterLevel - 1; level++) {
      UNLOCKS_PER_CHARACTER[character][level].forEach((card) => {
        unlockedCards.add(card)
      })
    }
  }

  return unlockedCards
}

// Get the unlocks for the given character when they hit the given level
export function getUnlocksAtLevel(character: number, level: number): Card[] {
  return UNLOCKS_PER_CHARACTER[character][level - 2]
}
