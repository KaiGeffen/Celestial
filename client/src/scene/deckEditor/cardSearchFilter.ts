import Catalog from '@shared/state/catalog'
import Card from '@shared/state/card'
import { DECK_EDITOR_MAX_COST_FILTER } from './constants'

/** Parsed token from the deck editor search box. */
export interface DeckEditorSearchToken {
  text: string
  isPhrase: boolean
  negated: boolean
  field: string | null
  rangeMin: number | null
  rangeMax: number | null
}

export function parseDeckEditorSearchQuery(
  query: string,
): DeckEditorSearchToken[] {
  const tokens: DeckEditorSearchToken[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < query.length; i++) {
    const char = query[i]
    if (char === '"') {
      if (inQuotes) {
        if (current) {
          tokens.push(createSearchToken(current, true))
          current = ''
        }
        inQuotes = false
      } else {
        if (current.trim()) {
          tokens.push(createSearchToken(current.trim(), false))
          current = ''
        }
        inQuotes = true
      }
    } else if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        tokens.push(createSearchToken(current.trim(), false))
        current = ''
      }
    } else {
      current += char
    }
  }
  if (current.trim()) {
    tokens.push(createSearchToken(current.trim(), inQuotes))
  }
  return tokens
}

function createSearchToken(
  text: string,
  isPhrase: boolean,
): DeckEditorSearchToken {
  const token: DeckEditorSearchToken = {
    text,
    isPhrase,
    negated: false,
    field: null,
    rangeMin: null,
    rangeMax: null,
  }
  if (text.startsWith('!')) {
    token.negated = true
    text = text.substring(1)
    token.text = text
  }
  // Bare keyword: matches cards that are currently in the deck
  if (text.toLowerCase() === 'present') {
    token.field = 'present'
    return token
  }
  const fieldMatch = text.match(/^(cost|points|name|text):(.+)$/i)
  if (fieldMatch) {
    token.field = fieldMatch[1].toLowerCase()
    const value = fieldMatch[2]
    token.text = value
    if (token.field === 'cost' || token.field === 'points') {
      const rangeMatch = value.match(/^(\d+)-(\d+)$/)
      if (rangeMatch) {
        token.rangeMin = parseInt(rangeMatch[1])
        token.rangeMax = parseInt(rangeMatch[2])
      } else if (value.endsWith('+')) {
        token.rangeMin = parseInt(value)
        token.rangeMax = Infinity
      } else if (value.endsWith('-')) {
        token.rangeMin = -Infinity
        token.rangeMax = parseInt(value)
      } else if (/^\d+$/.test(value)) {
        token.rangeMin = parseInt(value)
        token.rangeMax = parseInt(value)
      }
    }
  }
  return token
}

function matchesToken(
  card: Card,
  token: DeckEditorSearchToken,
  deckCardIds: ReadonlySet<number>,
): boolean {
  let matches = false
  if (token.field === 'present') {
    matches = deckCardIds.has(card.id)
  } else if (token.field === 'cost') {
    if (token.rangeMin !== null && token.rangeMax !== null) {
      matches = card.cost >= token.rangeMin && card.cost <= token.rangeMax
    }
  } else if (token.field === 'points') {
    if (token.rangeMin !== null && token.rangeMax !== null) {
      matches = card.points >= token.rangeMin && card.points <= token.rangeMax
    }
  } else if (token.field === 'name') {
    matches = card.name.toLowerCase().includes(token.text.toLowerCase())
  } else if (token.field === 'text') {
    matches = card.text.toLowerCase().includes(token.text.toLowerCase())
  } else {
    matches = searchEverywhere(card, token.text)
  }
  return token.negated ? !matches : matches
}

function searchEverywhere(card: Card, query: string): boolean {
  let searchableText = `${card.name} ${card.text} ${card.cost} ${card.points} ${card.beta ? 'beta' : ''}`
  for (const [keyword] of Catalog.getReferencedKeywords(card)) {
    searchableText += ` ${keyword.text}`
  }
  for (const cardName of Catalog.getReferencedCardNames(card)) {
    const ref = Catalog.getCard(cardName)
    if (ref) searchableText += ` ${ref.text}`
  }
  return searchableText.toLowerCase().includes(query.toLowerCase())
}

/**
 * Combined cost chips + pre-parsed search token predicate for the catalog grid.
 * `deckCardIds` backs the `present` keyword — a snapshot of the deck taken when
 * the filter is applied, not kept in sync with later deck edits.
 */
export function cardPassesDeckEditorFilters(
  card: Card,
  tokens: DeckEditorSearchToken[],
  filterCostAry: boolean[],
  deckCardIds: ReadonlySet<number>,
): boolean {
  if (filterCostAry.includes(true)) {
    if (!filterCostAry[Math.min(card.cost, DECK_EDITOR_MAX_COST_FILTER)]) {
      return false
    }
  }

  for (const token of tokens) {
    if (!matchesToken(card, token, deckCardIds)) return false
  }

  return true
}
