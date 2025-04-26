import { CosmeticSet } from './cosmeticSet'

// Complete deck type
export interface Deck {
  name: string
  // Array of card IDs
  cards: number[]
  cosmeticSet: CosmeticSet
}
