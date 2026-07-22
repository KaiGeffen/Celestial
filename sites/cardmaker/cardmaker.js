// Celestial Card Maker — maker page logic.
// Rendering lives in cardRenderer.js (shared with the search page).

import {
  CANVAS_W,
  CANVAS_H,
  gameData,
  loadGameData,
  themeLayer,
  subjectSrc,
  defaultSubjectIndex,
  subjectIndexByName,
  renderCard,
  findReferencedCard,
  keywordReminders,
} from './cardRenderer.js'

const THEME_COUNT = 9
const API_BASE = '/cardmaker/api'

const DEFAULTS = {
  name: 'My Card',
  cost: 1,
  points: 1,
  text: 'Fleeting\nVisible',
  theme: 0,
  subject: null, // set to Dove's index once gameData loads
  creator: '',
}

const state = { ...DEFAULTS }

// ------------------------------------------------------------------- form

const $ = (id) => document.getElementById(id)
const mainCanvas = () => $('card-canvas')

function readFieldsIntoState() {
  state.name = $('field-name').value
  state.cost = clampInt($('field-cost').value, -99, 99)
  state.points = clampInt($('field-points').value, -99, 99)
  state.text = $('field-text').value
  state.creator = $('field-creator').value
}

function writeStateIntoFields() {
  $('field-name').value = state.name
  $('field-cost').value = state.cost
  $('field-points').value = state.points
  $('field-text').value = state.text
  $('field-creator').value = state.creator
  updateThemeSelection()
  updateSubjectSelection()
}

const clampInt = (v, min, max) =>
  Math.max(min, Math.min(max, parseInt(v, 10) || 0))

function rerender() {
  renderCard(mainCanvas(), state)
  updateHints()
}

/** Keyword reminders + referenced-card preview below the card (like the game's hint). */
function updateHints() {
  const refCard = findReferencedCard(state.text)

  const figure = $('ref-card')
  figure.hidden = refCard === null
  if (refCard) {
    renderCard($('ref-canvas'), {
      ...refCard,
      subject: subjectIndexByName(refCard.name),
    })
  }

  const reminders = keywordReminders(state.text, refCard)
  const el = $('reminders')
  el.hidden = reminders.length === 0
  el.innerHTML = reminders.map((r) => `<p>${r}</p>`).join('')
}

function onFieldInput() {
  readFieldsIntoState()
  rerender()
}

// Theme swatches
function buildThemePicker() {
  const picker = $('theme-picker')
  const row = document.createElement('div')
  row.className = 'theme-swatches'
  for (let i = 0; i < THEME_COUNT; i++) {
    const swatch = document.createElement('button')
    swatch.type = 'button'
    swatch.className = 'theme-swatch'
    swatch.dataset.theme = i
    swatch.title = `Theme ${i}`
    swatch.style.backgroundImage = `url(${themeLayer('background', i)})`
    swatch.addEventListener('click', () => {
      state.theme = i
      updateThemeSelection()
      rerender()
    })
    row.appendChild(swatch)
  }
  picker.appendChild(row)
  updateThemeSelection()
}

function updateThemeSelection() {
  document
    .querySelectorAll('.theme-swatch')
    .forEach((el) =>
      el.classList.toggle('selected', Number(el.dataset.theme) === state.theme),
    )
}

// Subject picker
function buildSubjectPicker() {
  const grid = $('subject-grid')
  grid.innerHTML = ''
  const query = $('subject-search').value.trim().toLowerCase()

  gameData.subjects.forEach((name, i) => {
    if (query && !name.toLowerCase().includes(query)) return
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'subject-thumb'
    btn.dataset.subject = i

    const img = document.createElement('img')
    img.loading = 'lazy' // the full set is several MB; only fetch what scrolls into view
    img.src = subjectSrc(i)
    img.alt = name

    const label = document.createElement('span')
    label.className = 'thumb-name'
    label.textContent = name

    btn.append(img, label)
    btn.addEventListener('click', () => {
      state.subject = i
      updateSubjectSelection()
      rerender()
    })
    grid.appendChild(btn)
  })
  updateSubjectSelection()
}

function updateSubjectSelection() {
  document
    .querySelectorAll('.subject-thumb')
    .forEach((el) =>
      el.classList.toggle(
        'selected',
        Number(el.dataset.subject) === state.subject,
      ),
    )
}

// -------------------------------------------------------- export / publish

function downloadCard() {
  mainCanvas().toBlob((blob) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${state.name || 'card'}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  }, 'image/png')
}

async function copyCard() {
  const blob = await new Promise((r) => mainCanvas().toBlob(r, 'image/png'))
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

async function publishCard() {
  const result = $('publish-result')
  result.hidden = false
  result.textContent = 'Publishing…'
  try {
    const res = await fetch(`${API_BASE}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: state.name,
        cost: state.cost,
        points: state.points,
        text: state.text,
        theme: state.theme,
        subject: state.subject,
        creator: state.creator,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { id } = await res.json()
    const link = `${location.origin}/cardmaker/community/?id=${id}`
    result.innerHTML = `Published! <a href="${link}">View your card →</a>`
    loadGallery(true)
  } catch (e) {
    result.textContent = 'Publishing is not available right now.'
  }
}

// ----------------------------------------------------------------- gallery

let oldestSeenId = null

async function loadGallery(reset = false) {
  const grid = $('gallery-grid')
  const status = $('gallery-status')
  const loadMore = $('btn-load-more')
  if (reset) {
    grid.innerHTML = ''
    oldestSeenId = null
  }

  try {
    const params = new URLSearchParams({ limit: '20' })
    if (oldestSeenId !== null) params.set('before', oldestSeenId)
    const res = await fetch(`${API_BASE}/cards?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const cards = await res.json()

    for (const card of cards) {
      grid.appendChild(galleryEntry(card))
      oldestSeenId = card.id
    }
    status.textContent = grid.childElementCount === 0 ? 'No cards yet.' : ''
    loadMore.hidden = cards.length < 20
  } catch (e) {
    status.textContent = 'The gallery is not available right now.'
    loadMore.hidden = true
  }
}

// A gallery card links to its read-only community page (published cards can't
// be edited), matching how game cards link to their own pages. Only the card
// itself is the link; the creator credit sits below it, outside the hit area.
function galleryEntry(card) {
  const item = document.createElement('div')
  item.className = 'gallery-item'

  const link = document.createElement('a')
  link.className = 'gallery-card'
  link.href = `community/?id=${card.id}`
  link.title = 'Open this card'

  // Half-resolution canvas: displayed small, and far lighter in memory
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W / 2
  canvas.height = CANVAS_H / 2
  renderCard(canvas, card)

  link.appendChild(canvas)
  item.appendChild(link)

  if (card.creator) {
    const credit = document.createElement('span')
    credit.className = 'credit'
    credit.textContent = `by ${card.creator}`
    item.appendChild(credit)
  }
  return item
}

// -------------------------------------------------------------------- init

async function init() {
  await loadGameData()

  // Default subject: Dove, the game's own fallback art
  DEFAULTS.subject = defaultSubjectIndex()
  state.subject = DEFAULTS.subject

  buildThemePicker()
  buildSubjectPicker()
  $('subject-search').addEventListener('input', buildSubjectPicker)

  for (const id of [
    'field-name',
    'field-cost',
    'field-points',
    'field-text',
    'field-creator',
  ]) {
    $(id).addEventListener('input', onFieldInput)
  }

  $('btn-download').addEventListener('click', downloadCard)
  if (navigator.clipboard && window.ClipboardItem) {
    $('btn-copy').addEventListener('click', copyCard)
  } else {
    $('btn-copy').hidden = true
  }
  $('btn-publish').addEventListener('click', publishCard)
  $('btn-load-more').addEventListener('click', () => loadGallery(false))

  writeStateIntoFields()
  readFieldsIntoState()
  rerender()

  loadGallery(true)
}

init()
