export interface GemPackage {
  gems: number
  amount: number // in cents
  id: string
}

export const GEM_PACKAGES: { [key: string]: GemPackage } = {
  small: { gems: 50, amount: 499, id: 'gems-50' },
  medium: { gems: 150, amount: 999, id: 'gems-150' },
  large: { gems: 350, amount: 1999, id: 'gems-350' },
  huge: { gems: 750, amount: 3999, id: 'gems-750' },
}

// Helper function to format price from cents to dollars with 2 decimal places
export function formatPrice(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`
}
