import Catalog from './state/catalog'

// Encode / decode a string for deck's code such that user can copy / paste it
function encodeShareableDeckCode(deck: number[]): string {
  return deck
    .map((id) => {
      let hexString = id.toString(16).toUpperCase()
      let padded = hexString.padStart(3, '0')
      return padded
    })
    .join('')
}
function decodeShareableDeckCode(s: string): number[] {
  if (!s) return []
  try {
    return (s.match(/.{1,3}/g) ?? []).map((charTuple) => {
      const id = parseInt(charTuple, 16)

      // Check if each card id is valid
      if (Catalog.getCardById(id) === undefined) {
        throw new Error('Invalid card id')
      }

      return id
    })
  } catch (error) {
    return undefined
  }
}

export { encodeShareableDeckCode, decodeShareableDeckCode }
