// Celestial Card Maker
// Renders a card on <canvas> using the same layer stack + text placement as
// the game's CardImage (client/src/lib/cardImage.ts), at the native 472x672
// asset size. Card fields can be published to / browsed from a small API.

'use strict'

// ---------------------------------------------------------------- constants

const CANVAS_W = 472
const CANVAS_H = 672

// The game lays text out in display units (card shown at 235.2x336); convert
// to native asset pixels.
const SCALE_X = CANVAS_W / 235.2
const SCALE_Y = CANVAS_H / 336

// Colors from the game (client/src/settings/color.ts + cardImage.ts)
const COLOR_WHITE = '#F5F2EB' // whiteS: title, cost, rules text
const COLOR_GOLD_POINTS = '#EDAA24' // goldS: points stat
const COLOR_GOLD_TEXT = '#FABD5D' // keywords + card references in rules text
const COLOR_STROKE = '#000000'

const THEME_COUNT = 9
const API_BASE = '/cardmaker/api'

const DEFAULTS = {
  name: 'My Card',
  cost: 2,
  points: 2,
  text: 'When this resolves, Nourish 2.',
  theme: 0,
  subject: null, // set to Dove's index once gameData loads
  creator: '',
}

// ------------------------------------------------------------------- state

const state = { ...DEFAULTS }

// keywords: [{ name, text, hasX }], cards: [{ name, cost, points, text, theme }]
let gameData = { keywords: [], cards: [], subjects: [] }

// Compiled regexes for gold highlighting, built once gameData loads
let goldPatterns = []

const imageCache = new Map()
let renderToken = 0

// ------------------------------------------------------------------ assets

function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src)
  const promise = new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${src}`))
    img.src = src
  })
  imageCache.set(src, promise)
  return promise
}

const themeLayer = (kind, theme) => `assets/card/${kind}/${theme}.webp`
const subjectSrc = (index) =>
  `assets/subjects/${encodeURIComponent(gameData.subjects[index])}.webp`

// ------------------------------------------------- gold text tokenization

// Mirrors CardImage.createText: keywords (with optional trailing number) and
// referenced card names render in gold.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function buildGoldPatterns() {
  goldPatterns = []
  for (const keyword of gameData.keywords) {
    goldPatterns.push(
      new RegExp(`\\b${keyword.name}(?:[ ]*(-?\\d+))?(?=\\b|[.,!?;])`, 'g'),
    )
  }
  for (const card of gameData.cards) {
    goldPatterns.push(new RegExp(`\\b${escapeRegex(card.name)}\\b`, 'g'))
  }
}

// ------------------------------------------- keyword reminders / references

/** First real card referenced in the text, or null (like the game's hint). */
function findReferencedCard(text) {
  for (const card of gameData.cards) {
    if (new RegExp(`\\b${escapeRegex(card.name)}\\b`).test(text)) return card
  }
  return null
}

/** Turn the keyword's BBCode reminder (trusted, from shared/) into HTML. */
function bbToHtml(s) {
  return s
    .replace(/\[color=(#[0-9A-Fa-f]{6})\]/g, '<span style="color:$1">')
    .replace(/\[\/color\]/g, '</span>')
}

/**
 * Reminder lines for each keyword in the text — including, like the game's
 * Catalog.getReferencedKeywords, keywords in the referenced card's text.
 * X is substituted with the written value when present.
 */
function keywordReminders(text, refCard) {
  const fullText = text + (refCard ? ' ' + refCard.text : '')
  const reminders = []
  for (const keyword of gameData.keywords) {
    const match = new RegExp(`\\b${keyword.name}[ ]*(-?\\d+)?\\b`).exec(
      fullText,
    )
    if (!match) continue

    let t = keyword.text
    if (match[1] !== undefined) {
      t = t.split(/\bX\b/).join(match[1])
      // +X where X is negative should read -N, not +-N
      t = t.split('+-').join('-')
    }
    reminders.push(bbToHtml(t))
  }
  return reminders
}

const subjectIndexByName = (name) => {
  const i = gameData.subjects.indexOf(name)
  return i >= 0 ? i : DEFAULTS.subject
}

/** Character ranges [start, end) of the text that should render gold. */
function goldRanges(text) {
  const ranges = []
  for (const regex of goldPatterns) {
    regex.lastIndex = 0
    let match
    while ((match = regex.exec(text)) !== null) {
      ranges.push([match.index, match.index + match[0].length])
      if (match.index === regex.lastIndex) regex.lastIndex++
    }
  }
  return ranges
}

const inRanges = (ranges, idx) => ranges.some(([a, b]) => idx >= a && idx < b)

// --------------------------------------------------------------- rendering

/**
 * Word-wrap `text` to `maxWidth`, coloring words that fall inside gold
 * ranges. Returns lines of runs: [{ text, gold }].
 */
function layoutRulesText(ctx, text, maxWidth) {
  const ranges = goldRanges(text)
  const lines = []

  for (const paragraph of text.split('\n')) {
    let line = []
    let lineWidth = 0

    // Track each word's index within the full text for gold lookup
    let searchFrom = text.indexOf(paragraph)
    for (const word of paragraph.split(' ')) {
      if (word === '') continue
      const wordIdx = text.indexOf(word, searchFrom)
      searchFrom = wordIdx + word.length

      const gold = inRanges(ranges, wordIdx)
      const wordWidth = ctx.measureText(word + ' ').width

      if (lineWidth + wordWidth > maxWidth && line.length > 0) {
        lines.push(line)
        line = []
        lineWidth = 0
      }
      line.push({ text: word, gold })
      lineWidth += wordWidth
    }
    lines.push(line)
  }
  return lines
}

function drawTextWithStroke(ctx, text, x, y, color, strokeWidth = 3) {
  ctx.lineWidth = strokeWidth
  ctx.strokeStyle = COLOR_STROKE
  ctx.lineJoin = 'round'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

async function renderCard(canvas, fields) {
  // Only main-canvas renders participate in stale-render cancellation;
  // gallery / referenced-card renders must not clobber the main token
  const isMain = canvas.id === 'card-canvas'
  const token = isMain ? ++renderToken : renderToken
  const ctx = canvas.getContext('2d')

  // Load all layers first so the draw is atomic (no flicker)
  const [bg, subject, arc, frame] = await Promise.all([
    loadImage(themeLayer('background', fields.theme)),
    loadImage(subjectSrc(fields.subject)),
    loadImage(themeLayer('arc', fields.theme)),
    loadImage(themeLayer('container', fields.theme)),
  ])
  if (isMain && token !== renderToken) return

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.drawImage(bg, 0, 0, CANVAS_W, CANVAS_H)
  ctx.drawImage(subject, 0, 0, CANVAS_W, CANVAS_H)
  ctx.drawImage(arc, 0, 0, CANVAS_W, CANVAS_H)
  ctx.drawImage(frame, 0, 0, CANVAS_W, CANVAS_H)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Title: game places it 18px (display) from the top, card font 20px
  ctx.font = `${Math.round(20 * SCALE_Y)}px 'Times New Roman', Times, serif`
  drawTextWithStroke(ctx, fields.name, CANVAS_W / 2, 18 * SCALE_Y, COLOR_WHITE)

  // Cost / points: 27px from left edge, 58 / 102 from top (display units)
  ctx.font = `${Math.round(24 * SCALE_Y)}px 'Times New Roman', Times, serif`
  drawTextWithStroke(
    ctx,
    String(fields.cost),
    27 * SCALE_X,
    58 * SCALE_Y,
    COLOR_WHITE,
  )
  drawTextWithStroke(
    ctx,
    String(fields.points),
    27 * SCALE_X,
    102 * SCALE_Y,
    COLOR_GOLD_POINTS,
  )

  // Rules text: centered block whose center sits 40px (display) above the bottom
  ctx.font = `${Math.round(16 * SCALE_Y)}px 'Times New Roman', Times, serif`
  const maxWidth = 224 * SCALE_X
  const lineHeight = 22 * SCALE_Y
  const lines = layoutRulesText(ctx, fields.text, maxWidth)
  const blockCenterY = CANVAS_H - 40 * SCALE_Y
  const firstLineY = blockCenterY - ((lines.length - 1) * lineHeight) / 2

  lines.forEach((runs, i) => {
    const y = firstLineY + i * lineHeight
    const lineText = runs.map((r) => r.text).join(' ')
    const totalWidth = ctx.measureText(lineText).width
    let x = CANVAS_W / 2 - totalWidth / 2

    ctx.textAlign = 'left'
    for (const run of runs) {
      drawTextWithStroke(
        ctx,
        run.text,
        x,
        y,
        run.gold ? COLOR_GOLD_TEXT : COLOR_WHITE,
      )
      x += ctx.measureText(run.text + ' ').width
    }
    ctx.textAlign = 'center'
  })
}

// ------------------------------------------------------------------- form

const $ = (id) => document.getElementById(id)
const mainCanvas = () => $('card-canvas')

function readFieldsIntoState() {
  state.name = $('field-name').value
  state.cost = clampInt($('field-cost').value, 0, 9)
  state.points = clampInt($('field-points').value, 0, 9)
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
      name: refCard.name,
      cost: refCard.cost,
      points: refCard.points,
      text: refCard.text,
      theme: refCard.theme,
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
    const link = `${location.origin}/cardmaker/?id=${id}`
    result.textContent = `Published! ${link}`
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

function galleryEntry(card) {
  const btn = document.createElement('button')
  btn.className = 'gallery-card'
  btn.title = 'Open this card in the maker'

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  renderCard(canvas, card)

  const credit = document.createElement('span')
  credit.className = 'credit'
  credit.textContent = card.creator ? `by ${card.creator}` : ''

  btn.append(canvas, credit)
  btn.addEventListener('click', () => {
    loadCardIntoMaker(card)
    history.replaceState(null, '', `?id=${card.id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
  return btn
}

function loadCardIntoMaker(card) {
  state.name = card.name
  state.cost = card.cost
  state.points = card.points
  state.text = card.text
  state.theme = card.theme
  state.subject = card.subject
  state.creator = card.creator || ''
  writeStateIntoFields()
  rerender()
}

async function loadDeepLink() {
  const id = new URLSearchParams(location.search).get('id')
  if (!id) return
  try {
    const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(id)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    loadCardIntoMaker(await res.json())
  } catch (e) {
    // Deep link target missing or API down; fall through to the default card
  }
}

// -------------------------------------------------------------------- init

async function init() {
  gameData = await (await fetch('assets/gameData.json')).json()
  buildGoldPatterns()

  // Default subject: Dove, the game's own fallback art
  DEFAULTS.subject = Math.max(0, gameData.subjects.indexOf('Dove'))
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

  $('btn-reset').addEventListener('click', () => {
    Object.assign(state, DEFAULTS)
    writeStateIntoFields()
    rerender()
  })
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

  loadDeepLink()
  loadGallery(true)
}

init()
