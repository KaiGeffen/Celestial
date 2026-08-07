// Deck Builder — pick from every collectible card and build a running deck
// list (name + count). No save/publish yet; state lives only in this tab.

import {
  gameData,
  loadGameData,
  realCardFields,
  createTiltCard,
  renderCard,
  CANVAS_W,
  CANVAS_H,
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

// Briefly swaps a button's label to `text`, then reverts to `restoreLabel`.
// Timers are tracked per-button so the copy and import buttons don't clobber
// each other's revert if both are clicked in quick succession.
const labelResetTimers = new WeakMap()
function flashLabel(btn, text, restoreLabel) {
  clearTimeout(labelResetTimers.get(btn))
  btn.textContent = text
  labelResetTimers.set(
    btn,
    setTimeout(() => {
      btn.textContent = restoreLabel
    }, 1500),
  )
}

const COPY_LABEL = 'Copy Deck Code'
const IMPORT_LABEL = 'Import'

// Older/insecure-context fallback for browsers without the async Clipboard
// API (e.g. iOS Safari over plain HTTP on a LAN IP, not localhost/HTTPS) —
// execCommand('copy') has no such restriction, just deprecated.
function legacyCopy(text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(textarea)
  return ok
}

async function copyDeckCode() {
  const code = encodeDeckCode(deckToIds())
  let ok = true
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      ok = legacyCopy(code)
    }
  } else {
    ok = legacyCopy(code)
  }
  flashLabel($('btn-copy-code'), ok ? 'Copied!' : 'Copy failed', COPY_LABEL)
}

// Replaces the whole deck, like the game's paste-to-import (setDeck). Tokens
// in the code are skipped — this page only builds decks from collectible cards.
function importDeckCode() {
  const input = $('deck-code-input')
  const ids = decodeDeckCode(input.value.trim())
  const btn = $('btn-import-code')

  if (!ids) {
    flashLabel(btn, 'Invalid', IMPORT_LABEL)
    return
  }

  deck.clear()
  for (const id of ids) {
    const card = cardById.get(id)
    if (!card || card.token) continue
    deck.set(card.name, (deck.get(card.name) || 0) + 1)
  }
  renderDecklist()
  flashLabel(btn, 'Imported', IMPORT_LABEL)
}

// Restart a CSS animation by re-adding its class (forcing a reflow in between
// so re-adding the same class actually replays it, e.g. clicking a card twice fast).
function restartAnimation(el, className) {
  el.classList.remove(className)
  void el.offsetWidth
  el.classList.add(className)
}

// Click feedback: a faded duplicate of the clicked card rises and fades out
// above it, like it's being lifted into a pile. cloneNode doesn't copy canvas
// pixels, so each layer's content is copied over manually via drawImage.
function spawnGhost(button) {
  const scene = button.querySelector('.tilt-scene')
  if (!scene) return
  const rect = scene.getBoundingClientRect()

  const ghost = scene.cloneNode(true)
  ghost.classList.add('catalog-ghost')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.style.left = `${rect.left}px`
  ghost.style.top = `${rect.top}px`
  ghost.style.width = `${rect.width}px`
  ghost.style.height = `${rect.height}px`

  const sourceCanvases = scene.querySelectorAll('canvas')
  const ghostCanvases = ghost.querySelectorAll('canvas')
  sourceCanvases.forEach((source, i) => {
    ghostCanvases[i].getContext('2d').drawImage(source, 0, 0)
  })

  document.body.appendChild(ghost)
  ghost.addEventListener('animationend', () => ghost.remove())
}

// Hover preview: shows the full card next to whichever deck-list name is
// hovered, like the game's Cutout hint. One shared floating element, moved
// and redrawn per-hover rather than built fresh each time.
const PREVIEW_WIDTH = 200
let previewEl = null
let previewCanvas = null

function ensurePreview() {
  if (previewEl) return
  previewEl = document.createElement('div')
  previewEl.className = 'decklist-preview'
  previewEl.hidden = true
  previewCanvas = document.createElement('canvas')
  previewCanvas.width = CANVAS_W
  previewCanvas.height = CANVAS_H
  previewEl.appendChild(previewCanvas)
  document.body.appendChild(previewEl)
}

function showPreview(anchorEl, card) {
  ensurePreview()
  renderCard(previewCanvas, realCardFields(card))

  const rect = anchorEl.getBoundingClientRect()
  const previewHeight = (PREVIEW_WIDTH * CANVAS_H) / CANVAS_W
  const gap = 12

  // Prefer showing to the left of the name (the deck panel usually sits on
  // the right); fall back to the right if there's no room.
  let left = rect.left - PREVIEW_WIDTH - gap
  if (left < 8) left = rect.right + gap

  const maxTop = window.innerHeight - previewHeight - 8
  const top = Math.min(Math.max(rect.top, 8), Math.max(8, maxTop))

  previewEl.style.left = `${left}px`
  previewEl.style.top = `${top}px`
  previewEl.style.width = `${PREVIEW_WIDTH}px`
  previewEl.hidden = false
}

function hidePreview() {
  if (previewEl) previewEl.hidden = true
}

function addCard(name) {
  deck.set(name, (deck.get(name) || 0) + 1)
  renderDecklist()
  restartAnimation($('deck-count'), 'flash')
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
    button.addEventListener('click', () => {
      spawnGhost(button)
      addCard(card.name)
    })

    item.appendChild(button)
    grid.appendChild(item)
  }

  $('search-status').textContent =
    matches.length === 0 ? 'No cards match.' : `${matches.length} of ${all.length} cards`
}

function decklistEntry(name, count) {
  const card = cardByName.get(name)

  const li = document.createElement('li')
  li.className = 'decklist-row'

  const info = document.createElement('div')
  info.className = 'decklist-entry'

  const left = document.createElement('div')
  left.className = 'decklist-left'

  const stats = document.createElement('span')
  stats.className = 'decklist-stats'

  const costSpan = document.createElement('span')
  costSpan.className = 'decklist-cost'
  costSpan.setAttribute('aria-label', `Cost ${card.cost}`)
  const costValue = document.createElement('span')
  costValue.textContent = card.cost
  costSpan.appendChild(costValue)

  const pointsSpan = document.createElement('span')
  pointsSpan.className = 'decklist-points'
  pointsSpan.textContent = card.points
  pointsSpan.setAttribute('aria-label', `${card.points} points`)

  stats.append(costSpan, pointsSpan)

  const nameSpan = document.createElement('span')
  nameSpan.className = 'decklist-name'
  nameSpan.textContent = name
  nameSpan.addEventListener('mouseenter', () => showPreview(nameSpan, card))
  nameSpan.addEventListener('mouseleave', hidePreview)

  left.append(stats, nameSpan)

  const countSpan = document.createElement('span')
  countSpan.className = 'decklist-count'
  countSpan.textContent = `×${count}`

  info.append(left, countSpan)

  const minusButton = document.createElement('button')
  minusButton.type = 'button'
  minusButton.className = 'decklist-minus'
  minusButton.textContent = '−'
  minusButton.setAttribute('aria-label', `Remove one ${name}`)
  minusButton.addEventListener('click', () => removeCard(name))

  const plusButton = document.createElement('button')
  plusButton.type = 'button'
  plusButton.className = 'decklist-plus'
  plusButton.textContent = '+'
  plusButton.setAttribute('aria-label', `Add another ${name}`)
  plusButton.addEventListener('click', () => addCard(name))

  li.append(info, minusButton, plusButton)
  return li
}

function renderDecklist() {
  // The list is rebuilt wholesale below, which can orphan a hovered name
  // (removing it without a mouseleave), so the preview is force-hidden.
  hidePreview()

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

  $('btn-copy-code').addEventListener('click', copyDeckCode)
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
