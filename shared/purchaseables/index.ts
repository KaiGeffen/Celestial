import borders from './borders'
import cardbacks from './cardbacks'

export type PurchaseableType = 'border' | 'cardback'

export interface Purchaseable {
  id: number
  cost: number
  name: string
  type?: PurchaseableType
}

const taggedBorders: Purchaseable[] = borders.map((b) => ({ ...b, type: 'border' as const }))
const taggedCardbacks: Purchaseable[] = cardbacks.map((c) => ({ ...c, type: 'cardback' as const }))

export { taggedBorders as borders, taggedCardbacks as cardbacks }

const allPurchaseables: Purchaseable[] = [...taggedBorders, ...taggedCardbacks]

export default allPurchaseables
