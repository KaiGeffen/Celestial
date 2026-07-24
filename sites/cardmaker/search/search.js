// Card Search — searches the game's real cards or the community's published
// custom cards (fetched from the cardmaker API). Both use the same client-side
// query syntax, ported from the game's deck editor (parseSearchQuery below).

import {
  gameData,
  loadGameData,
  escapeRegex,
  realCardFields,
  createTiltCard,
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

// Every result links to a card page (game cards to their generated page,
// community cards to the read-only community view), so they look and behave
// identically — hover, click, and open-in-place.
function resultEntry(fields, { credit = '', href = '#' } = {}) {
  const item = document.createElement('div')
  item.className = 'gallery-item'

  // Only the card is a link (the hit area), so the credit below stays outside
  const link = document.createElement('a')
  link.href = href
  link.className = 'gallery-card'
  link.title = 'Open this card'

  // Half-resolution layers: displayed small, and far lighter in memory
  link.appendChild(createTiltCard(fields, { width: '100%', half: true }))
  item.appendChild(link)
  if (credit) {
    const span = document.createElement('span')
    span.className = 'credit'
    span.textContent = credit
    item.appendChild(span)
  }
  return item
}

// ---------------------------------------------------------------- search

const renderGameCard = (card) =>
  resultEntry(realCardFields(card), { href: `../${slugify(card.name)}/` })

const renderCommunityCard = (card) =>
  resultEntry(card, {
    credit: card.creator ? `by ${card.creator}` : '',
    href: `../community/?id=${card.id}`,
  })

// Game cards are a fixed ~120-card catalog shipped in gameData.json, so they're
// filtered client-side with the same parser the game uses.
function runGameSearch() {
  const results = $('results')
  const tokens = parseSearchQuery($('search-input').value)
  const matches = gameData.cards.filter((c) => cardPassesFilters(c, tokens))
  results.innerHTML = ''
  for (const card of matches) results.appendChild(renderGameCard(card))
  $('search-status').textContent =
    matches.length === 0
      ? 'No cards match.'
      : `${matches.length} of ${gameData.cards.length} cards`
}

// Community cards can number in the thousands, so search runs server-side (same
// syntax; see cardmakerSearch.ts) and pages in. Each query is one request; the
// "Load more" button fetches the next keyset page. `searchSeq` guards against
// out-of-order responses when the user types quickly.
const COMMUNITY_PAGE = 30
let communityBefore = null // keyset cursor: id to page before, or null for page 1
let communityTotal = 0
let communityShown = 0
let searchSeq = 0

async function fetchCommunityPage(query, before, seq) {
  const params = new URLSearchParams({ limit: String(COMMUNITY_PAGE) })
  if (query.trim()) params.set('q', query.trim())
  if (before !== null) params.set('before', String(before))
  const res = await fetch(`${API_BASE}/cards?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()

  // A stale response (superseded query, or tab switched away) is discarded.
  if (seq !== searchSeq || source !== 'community') return

  const results = $('results')
  for (const card of data.cards) results.appendChild(renderCommunityCard(card))
  communityShown += data.cards.length
  communityTotal = data.total
  if (data.cards.length > 0) {
    communityBefore = data.cards[data.cards.length - 1].id
  }

  $('search-status').textContent =
    communityTotal === 0
      ? 'No cards match.'
      : `Showing ${communityShown} of ${communityTotal}`
  $('load-more').hidden = communityShown >= communityTotal
}

async function runCommunitySearch() {
  const query = $('search-input').value
  const seq = ++searchSeq
  $('results').innerHTML = ''
  $('load-more').hidden = true
  $('search-status').textContent = 'Searching…'
  communityBefore = null
  communityShown = 0
  communityTotal = 0
  try {
    await fetchCommunityPage(query, null, seq)
  } catch (e) {
    if (seq === searchSeq) {
      $('search-status').textContent = 'Community search is not available right now.'
    }
  }
}

async function loadMoreCommunity() {
  const btn = $('load-more')
  btn.disabled = true
  try {
    await fetchCommunityPage($('search-input').value, communityBefore, searchSeq)
  } catch (e) {
    /* leave the button for a retry */
  }
  btn.disabled = false
}

function runSearch() {
  if (source === 'game') {
    $('load-more').hidden = true
    runGameSearch()
  } else {
    runCommunitySearch()
  }
}

function setSource(next) {
  source = next
  $('tab-game').classList.toggle('selected', source === 'game')
  $('tab-community').classList.toggle('selected', source === 'community')
  runSearch()
}

// ------------------------------------------------------------------- init

let debounceTimer = null

async function init() {
  await loadGameData()

  $('tab-game').addEventListener('click', () => setSource('game'))
  $('tab-community').addEventListener('click', () => setSource('community'))
  $('load-more').addEventListener('click', loadMoreCommunity)
  $('search-input').addEventListener('input', () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(runSearch, 150)
  })

  runSearch()
}

init()
