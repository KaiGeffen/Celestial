// Server-side card search for the community gallery. Mirrors the game's deck
// editor search (client/src/scene/deckEditor/cardSearchFilter.ts) and the card
// maker's client port (sites/cardmaker/search/search.js) so community search
// behaves identically to game-card search — but runs in SQL, so it scales to
// tens of thousands of rows without shipping the whole set to the browser.
//
// Free-text/phrase terms match a precomputed `search_blob` (buildSearchBlob);
// field terms (name:/text:/cost:/points:, ranges, !negation) map to columns.

import { and, gte, ilike, lte, not, or, SQL, sql } from 'drizzle-orm'

import { Keywords } from '../../../shared/state/keyword'
import Catalog from '../../../shared/state/catalog'
import { customCards } from '../db/schema'

// ------------------------------------------------------- search blob

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Referenced-text sources, built once: every keyword and every catalog card a
// custom card's text might name. Matching the maker's own reference resolution.
const KEYWORDS = Keywords.getAll().map((k) => ({ name: k.name, text: k.text }))
const CARDS = Catalog.allCards.map((c) => ({ name: c.name, text: c.text }))

// The searchable text for a card: its own fields plus the reminder text of any
// keyword it names and the text of any card it references — same expansion as
// the game's searchEverywhere. Precomputed at publish time and stored, so
// free-text search is a single ILIKE instead of a per-row scan of the catalog.
export function buildSearchBlob(fields: {
  name: string
  text: string
  cost: number
  points: number
}): string {
  let blob = `${fields.name} ${fields.text} ${fields.cost} ${fields.points}`
  for (const keyword of KEYWORDS) {
    if (new RegExp(`\\b${escapeRegex(keyword.name)}\\b`).test(fields.text)) {
      blob += ` ${keyword.text}`
    }
  }
  for (const card of CARDS) {
    if (
      card.name !== fields.name &&
      new RegExp(`\\b${escapeRegex(card.name)}\\b`).test(fields.text)
    ) {
      blob += ` ${card.text}`
    }
  }
  return blob.toLowerCase()
}

// ------------------------------------------------------- query parsing

interface SearchToken {
  text: string
  isPhrase: boolean
  negated: boolean
  field: string | null
  rangeMin: number | null
  rangeMax: number | null
}

function createSearchToken(text: string, isPhrase: boolean): SearchToken {
  const token: SearchToken = {
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

function parseSearchQuery(query: string): SearchToken[] {
  const tokens: SearchToken[] = []
  let current = ''
  let inQuotes = false
  for (const char of query) {
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

// ------------------------------------------------------- SQL translation

// Escape LIKE metacharacters so a literal % or _ in the query isn't a wildcard
// (the game matches with String.includes, i.e. always literal).
const likePattern = (s: string) => `%${s.replace(/[\\%_]/g, '\\$&')}%`

// One token → one SQL condition. A cost:/points: token whose value didn't parse
// to a range matches nothing (mirrors the game leaving `matches` false); with
// ! that inverts to matching everything.
function tokenCondition(token: SearchToken): SQL {
  let cond: SQL
  if (token.field === 'cost' || token.field === 'points') {
    const col = token.field === 'cost' ? customCards.cost : customCards.points
    if (token.rangeMin === null || token.rangeMax === null) {
      cond = sql`false`
    } else {
      const parts: SQL[] = []
      if (token.rangeMin !== -Infinity) parts.push(gte(col, token.rangeMin))
      if (token.rangeMax !== Infinity) parts.push(lte(col, token.rangeMax))
      cond = parts.length ? and(...parts)! : sql`true`
    }
  } else if (token.field === 'name') {
    cond = ilike(customCards.name, likePattern(token.text))
  } else if (token.field === 'text') {
    cond = ilike(customCards.text, likePattern(token.text))
  } else {
    cond = ilike(customCards.search_blob, likePattern(token.text.toLowerCase()))
  }
  return token.negated ? not(cond) : cond
}

// Parse a raw query into the AND-ed SQL conditions the gallery filters by.
// Empty query → no conditions (every visible card, newest first).
export function searchConditions(query: string): SQL[] {
  return parseSearchQuery(query).map(tokenCondition)
}
