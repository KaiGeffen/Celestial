import { CosmeticSet } from './cosmeticSet'

// Complete deck type
export interface Deck {
  name: string
  // Array of card IDs
  cards: number[]
  // Array of upgrade versions, parallel to cards array (0 = base, 1 = upgrade 1, 2 = upgrade 2)
  // Optional - defaults to all base versions (0) if not provided
  cardUpgrades?: number[]
  cosmeticSet: CosmeticSet
}
