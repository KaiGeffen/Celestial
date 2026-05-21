import borders from './borders'
import cardbacks from './cardbacks'

export interface Purchaseable {
  id: number
  cost: number
  name: string
}

export { borders, cardbacks }

const allPurchaseables = [...borders, ...cardbacks]

export default allPurchaseables
