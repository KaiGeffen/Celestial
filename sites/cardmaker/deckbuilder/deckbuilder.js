// Deck Builder — pick from every collectible card and build a running deck
// list (name + count). No save/publish yet; state lives only in this tab.

import {
  gameData,
  loadGameData,
  realCardFields,
  createTiltCard,
} from '../cardRenderer.js'
import { parseSearchQuery, cardPassesFilters } from '../cardSearch.js'

const $ = (id) => document.getElementById(id)

// card name -> count
const deck = new Map()

// Built once gameData loads (see init)
let cardById = new Map()
let cardByName = new Map()

const byCostThenName = (a, b) => a.cost - b.cost || a.name.localeCompare(b.name)

const collectibleCards = () =>
  gameData.cards.filter((c) => !c.token).sort(byCostThenName)

// ------------------------------------------------------------ deck code
// Ported from shared/codec.ts so codes round-trip with the game's deck
// editor: each card id as a 3-digit uppercase hex, concatenated.
function encodeDeckCode(ids) {
  return ids.map((id) => id.toString(16).toUpperCase().padStart(3, '0')).join('')
}

// Returns null if any chunk isn't a known card id (mirrors decodeShareableDeckCode
// returning undefined on the first invalid id).
function decodeDeckCode(s) {
  if (!s) return null
  const chunks = s.match(/.{1,3}/g) ?? []
  const ids = []
  for (const chunk of chunks) {
    const id = parseInt(chunk, 16)
    if (Number.isNaN(id) || !cardById.has(id)) return null
    ids.push(id)
  }
  return ids
}

function deckToIds() {
  const entries = [...deck.entries()].sort(([a], [b]) =>
    byCostThenName(cardByName.get(a), cardByName.get(b)),
  )
  const ids = []
  for (const [name, count] of entries) {
    const id = cardByName.get(name).id
    for (let i = 0; i < count; i++) ids.push(id)
  }
  return ids
}

// Floating jump button (mobile only, see cardmaker.css): stays fixed on
// screen, points down at the catalog and flips to point up once the deck
// list panel scrolls into view.
function setupJumpButton() {
  const btn = $('jump-btn')
  const catalogColumn = $('catalog-column')
  const decklistPanel = $('decklist-panel')
  let pointingDown = true

  const observer = new IntersectionObserver(
    ([entry]) => {
      pointingDown = !entry.isIntersecting
      btn.textContent = pointingDown ? '▼' : '▲'
      btn.setAttribute(
        'aria-label',
        pointingDown ? 'Jump to your deck' : 'Jump to card search',
      )
    },
    { threshold: 0 },
  )
  observer.observe(decklistPanel)

  btn.addEventListener('click', () => {
    const target = pointingDown ? decklistPanel : catalogColumn
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

let statusTimer = null
function showCodeStatus(text) {
  const el = $('code-status')
  clearTimeout(statusTimer)
  el.textContent = text
  el.hidden = false
  statusTimer = setTimeout(() => {
    el.hidden = true
  }, 2500)
}

async function copyDeckCode() {
  const code = encodeDeckCode(deckToIds())
  await navigator.clipboard.writeText(code)
  showCodeStatus('Copied!')
}

// Replaces the whole deck, like the game's paste-to-import (setDeck). Tokens
// in the code are skipped — this page only builds decks from collectible cards.
function importDeckCode() {
  const input = $('deck-code-input')
  const ids = decodeDeckCode(input.value.trim())
  if (!ids) {
    showCodeStatus('Invalid deck code.')
    return
  }

  deck.clear()
  for (const id of ids) {
    const card = cardById.get(id)
    if (!card || card.token) continue
    deck.set(card.name, (deck.get(card.name) || 0) + 1)
  }
  renderDecklist()
  showCodeStatus('Deck imported.')
}

function addCard(name) {
  deck.set(name, (deck.get(name) || 0) + 1)
  renderDecklist()
}

function removeCard(name) {
  const count = deck.get(name) || 0
  if (count <= 1) deck.delete(name)
  else deck.set(name, count - 1)
  renderDecklist()
}

function renderCatalog() {
  const all = collectibleCards()
  const tokens = parseSearchQuery($('search-input').value)
  const matches = all.filter((c) => cardPassesFilters(c, tokens))

  const grid = $('catalog')
  grid.innerHTML = ''
  for (const card of matches) {
    const item = document.createElement('div')
    item.className = 'gallery-item'

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'gallery-card catalog-card'
    button.appendChild(
      createTiltCard(realCardFields(card), { width: '100%', half: true }),
    )
    button.addEventListener('click', () => addCard(card.name))

    item.appendChild(button)
    grid.appendChild(item)
  }

  $('search-status').textContent =
    matches.length === 0 ? 'No cards match.' : `${matches.length} of ${all.length} cards`
}

function decklistEntry(name, count) {
  const li = document.createElement('li')
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'decklist-entry'
  button.title = `Remove ${name} from your deck`

  const nameSpan = document.createElement('span')
  nameSpan.className = 'decklist-name'
  nameSpan.textContent = name

  const countSpan = document.createElement('span')
  countSpan.className = 'decklist-count'
  countSpan.textContent = `×${count}`

  button.append(nameSpan, countSpan)
  button.addEventListener('click', () => removeCard(name))
  li.appendChild(button)
  return li
}

function renderDecklist() {
  const entries = [...deck.entries()].sort(([a], [b]) =>
    byCostThenName(cardByName.get(a), cardByName.get(b)),
  )

  const list = $('decklist')
  list.innerHTML = ''
  for (const [name, count] of entries) list.appendChild(decklistEntry(name, count))

  $('decklist-empty').hidden = entries.length > 0

  let total = 0
  for (const count of deck.values()) total += count
  $('deck-count').textContent = `${total} / ${gameData.deckSize}`
}

async function init() {
  await loadGameData()
  cardById = new Map(gameData.cards.map((c) => [c.id, c]))
  cardByName = new Map(gameData.cards.map((c) => [c.name, c]))

  renderCatalog()
  renderDecklist()
  setupJumpButton()

  if (navigator.clipboard && navigator.clipboard.writeText) {
    $('btn-copy-code').addEventListener('click', copyDeckCode)
  } else {
    $('btn-copy-code').hidden = true
  }
  $('btn-import-code').addEventListener('click', importDeckCode)
  $('deck-code-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') importDeckCode()
  })

  let debounceTimer = null
  $('search-input').addEventListener('input', () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(renderCatalog, 150)
  })
}

init()
