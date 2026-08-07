// Shared card-search query syntax for the Card Maker site (search page +
// deck builder). Ported from the game's deck editor search
// (client/src/scene/deckEditor/cardSearchFilter.ts), minus the deck-editor
// specific `present` keyword.

import { gameData, escapeRegex } from './cardRenderer.js'

export function parseSearchQuery(query) {
  const tokens = []
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

function createSearchToken(text, isPhrase) {
  const token = {
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

function matchesToken(card, token) {
  let matches = false
  if (token.field === 'cost') {
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

// Like the game: free text also searches referenced keywords' reminder text
// and referenced cards' text
function searchEverywhere(card, query) {
  let searchableText = `${card.name} ${card.text} ${card.cost} ${card.points} ${card.token ? 'token' : ''}`
  for (const keyword of gameData.keywords) {
    if (new RegExp(`\\b${keyword.name}\\b`).test(card.text)) {
      searchableText += ` ${keyword.text}`
    }
  }
  for (const other of gameData.cards) {
    if (
      other.name !== card.name &&
      new RegExp(`\\b${escapeRegex(other.name)}\\b`).test(card.text)
    ) {
      searchableText += ` ${other.text}`
    }
  }
  return searchableText.toLowerCase().includes(query.toLowerCase())
}

export const cardPassesFilters = (card, tokens) =>
  tokens.every((token) => matchesToken(card, token))
