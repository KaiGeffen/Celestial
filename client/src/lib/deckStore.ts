import { UserSettings } from '../settings/userSettings'
import { Deck } from '@shared/types/deck'

/**
 * Owns the persisted deck list and the equipped-deck pointer in UserSettings.
 * Centralizes the add/remove/reorder mutations and the equipped-index remap
 * that follows a deck moving, so callers don't each re-implement that math.
 */
export default class DeckStore {
  static getDecks(): Deck[] {
    return UserSettings._get('decks') || []
  }

  static getDeck(index: number): Deck | undefined {
    return this.getDecks()[index]
  }

  /** Overwrite the deck at `index`. */
  static update(index: number, deck: Deck): void {
    UserSettings._setIndex('decks', index, deck)
  }

  /** Ensure a deck exists at `index`, filling any gaps with `makeDefault(i)`. */
  static ensureAtIndex(index: number, makeDefault: (i: number) => Deck): void {
    const decks = [...this.getDecks()]
    if (decks[index]) return
    while (decks.length <= index) {
      decks.push(makeDefault(decks.length))
    }
    UserSettings._set('decks', decks)
  }

  static getEquippedIndex(): number | undefined {
    return UserSettings._get('equippedDeckIndex')
  }

  static setEquippedIndex(index: number | undefined): void {
    UserSettings._set('equippedDeckIndex', index)
  }

  /** Append a deck; returns its new index. */
  static add(deck: Deck): number {
    UserSettings._push('decks', deck)
    return this.getDecks().length - 1
  }

  /**
   * Remove the deck at `index`, remapping the equipped pointer to follow:
   * the removed deck falls back to 0 (or none if empty), later decks shift down.
   * Returns the equipped index after removal.
   */
  static remove(index: number): number | undefined {
    UserSettings._pop('decks', index)
    const decks = this.getDecks()
    let eq = this.getEquippedIndex()
    if (eq === index) {
      eq = decks.length ? 0 : undefined
    } else if (eq !== undefined && eq > index) {
      eq = eq - 1
    }
    this.setEquippedIndex(eq)
    return eq
  }

  /**
   * Move the deck at `from` to `to`, remapping the equipped pointer to follow
   * the moved deck (or the decks that shift to fill/make room).
   * Returns the equipped index after the move.
   */
  static reorder(from: number, to: number): number | undefined {
    const decks = [...this.getDecks()]
    const [moved] = decks.splice(from, 1)
    decks.splice(to, 0, moved)
    UserSettings._set('decks', decks)

    let eq = this.getEquippedIndex()
    if (eq !== undefined) {
      if (eq === from) {
        eq = to
      } else if (from < to) {
        if (eq > from && eq <= to) eq--
      } else {
        if (eq >= to && eq < from) eq++
      }
      this.setEquippedIndex(eq)
    }
    return eq
  }
}
