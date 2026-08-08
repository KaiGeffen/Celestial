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
  renderCard,
  createTiltCard,
  redrawTiltCard,
  downloadCardPng,
  findReferencedCards,
  renderReferencedCards,
  keywordReminders,
} from '../cardRenderer.js'

const THEME_COUNT = 9
// Theme names, in frame order (0-8), shown on swatch hover
const THEME_NAMES = [
  'Sky',
  'Ashes',
  'Shadows',
  'Pet',
  'Birth',
  'Vision',
  'Stars',
  'Water',
  'Special',
]
const API_BASE = '/cards/api'

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

// The live preview is a layered 3D tilt card (created once in init); rerender
// redraws its layers in place.
let previewCard = null

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
  if (previewCard) redrawTiltCard(previewCard, state)
  updateHints()
  resetPublishButton()
}

// After a successful publish the button locks as "Published" so the same card
// can't be spam-published; any edit (which calls rerender) unlocks it so the
// new version can be published.
function resetPublishButton() {
  const btn = $('btn-publish')
  if (btn.dataset.published) {
    btn.disabled = false
    btn.textContent = 'Publish'
    delete btn.dataset.published
  }
}

/** Keyword reminders + referenced-card previews below the card (like the game's hint). */
function updateHints() {
  const refCards = findReferencedCards(state.text)
  renderReferencedCards($('ref-cards'), refCards)

  const reminders = keywordReminders(state.text, refCards)
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
    swatch.title = THEME_NAMES[i] ?? `Theme ${i}`
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

// The preview is layered for the 3D effect, so export renders a fresh flat
// composite at full 472x672 (identical pixels, no tilt).
const downloadCard = () => downloadCardPng(state, state.name)

async function copyCard() {
  const btn = $('btn-copy')
  try {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    await renderCard(canvas, state)
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    btn.textContent = 'Copied!'
  } catch (e) {
    btn.textContent = 'Copy failed'
  }
  setTimeout(() => {
    btn.textContent = 'Copy'
  }, 1500)
}

async function publishCard() {
  const btn = $('btn-publish')
  const result = $('publish-result')
  // Disable immediately so a double-click can't fire two publishes in flight.
  btn.disabled = true

  // Only show "Publishing…" if the request is actually slow. A fast response
  // (e.g. an immediate rate-limit rejection) cancels it, so the final message
  // appears directly instead of flickering behind an intermediate one.
  const pending = setTimeout(() => {
    result.hidden = false
    result.textContent = 'Publishing…'
  }, 300)
  const show = (html) => {
    clearTimeout(pending)
    result.hidden = false
    result.innerHTML = html
  }

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
    if (res.status === 429) {
      const { retryAfter } = await res.json().catch(() => ({}))
      // Two lines so the wait time stays on its own line rather than wrapping mid-phrase.
      show(
        `You've hit the publish limit.<br>` +
          `You can publish again in ${formatWait(retryAfter)}.`,
      )
      btn.disabled = false
      return
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { id } = await res.json()
    const link = `${location.origin}/cards/community/?id=${id}`
    show(`Published! <a href="${link}">View your card →</a>`)
    // Lock it as published until the card is edited (see resetPublishButton).
    btn.textContent = 'Published'
    btn.dataset.published = '1'
  } catch (e) {
    show('Publishing is not available right now.')
    btn.disabled = false // let them retry
  }
}

// Human-friendly wait time from a seconds count (rounded up, coarse on purpose).
function formatWait(seconds) {
  if (!seconds || seconds < 60) return 'a moment'
  const mins = Math.ceil(seconds / 60)
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`
  const hours = Math.ceil(mins / 60)
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

// -------------------------------------------------------------------- init

async function init() {
  await loadGameData()

  // Default subject: Dove, the game's own fallback art
  DEFAULTS.subject = defaultSubjectIndex()
  state.subject = DEFAULTS.subject

  // Live preview: a single layered 3D tilt card, redrawn in place on edits
  previewCard = createTiltCard(state, { width: 'min(354px, 90vw)' })
  $('card-mount').appendChild(previewCard)

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

  writeStateIntoFields()
  readFieldsIntoState()
  rerender()
}

init()
