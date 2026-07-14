// Card Search — searches the game's real cards (client-side, using the deck
// editor's search syntax) or the community's published custom cards (via the
// cardmaker API).

import {
  CANVAS_W,
  CANVAS_H,
  gameData,
  loadGameData,
  escapeRegex,
  realCardFields,
  renderCard,
} from '../cardRenderer.js'

const API_BASE = '/cardmaker/api'

const $ = (id) => document.getElementById(id)

let source = 'game' // 'game' | 'community'

// ------------------------------------------------------ query parsing
// Ported from the game's deck editor search
// (client/src/scene/deckEditor/cardSearchFilter.ts), minus the deck-editor
// specific `present` keyword.

function parseSearchQuery(query) {
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

const cardPassesFilters = (card, tokens) =>
  tokens.every((token) => matchesToken(card, token))

// ------------------------------------------------------------- rendering

// Must match slugify in generateAssets.ts
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function resultEntry(fields, { credit = '', onClick = null, href = null } = {}) {
  const wrap = document.createElement(href ? 'a' : onClick ? 'button' : 'div')
  if (href) wrap.href = href
  wrap.className = 'gallery-card'

  // Half-resolution canvas: displayed small, and far lighter in memory
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W / 2
  canvas.height = CANVAS_H / 2
  renderCard(canvas, fields)

  wrap.appendChild(canvas)
  if (credit) {
    const span = document.createElement('span')
    span.className = 'credit'
    span.textContent = credit
    wrap.appendChild(span)
  }
  if (onClick) {
    wrap.title = 'Open this card in the maker'
    wrap.addEventListener('click', onClick)
  }
  return wrap
}

// ---------------------------------------------------------------- search

async function runSearch() {
  const query = $('search-input').value
  const results = $('results')
  const status = $('search-status')
  results.innerHTML = ''

  if (source === 'game') {
    const tokens = parseSearchQuery(query)
    const matches = gameData.cards.filter((c) => cardPassesFilters(c, tokens))
    for (const card of matches) {
      results.appendChild(
        resultEntry(realCardFields(card), {
          href: `../${slugify(card.name)}/`,
        }),
      )
    }
    status.textContent =
      matches.length === 0
        ? 'No cards match.'
        : `${matches.length} of ${gameData.cards.length} cards`
  } else {
    status.textContent = 'Searching…'
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (query.trim()) params.set('q', query.trim())
      const res = await fetch(`${API_BASE}/cards?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const cards = await res.json()
      for (const card of cards) {
        results.appendChild(
          resultEntry(card, {
            credit: card.creator ? `by ${card.creator}` : '',
            onClick: () => (location.href = `../?id=${card.id}`),
          }),
        )
      }
      status.textContent = cards.length === 0 ? 'No cards match.' : ''
    } catch (e) {
      status.textContent = 'Community search is not available right now.'
    }
  }
}

function setSource(next) {
  source = next
  $('tab-game').classList.toggle('selected', source === 'game')
  $('tab-community').classList.toggle('selected', source === 'community')
  // The syntax help only applies to the game-card search
  $('search-help').hidden = source !== 'game'
  runSearch()
}

// ------------------------------------------------------------------- init

let debounceTimer = null

async function init() {
  await loadGameData()

  $('tab-game').addEventListener('click', () => setSource('game'))
  $('tab-community').addEventListener('click', () => setSource('community'))
  $('search-input').addEventListener('input', () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(runSearch, 150)
  })

  runSearch()
}

init()
