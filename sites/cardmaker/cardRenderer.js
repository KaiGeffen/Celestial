// Shared card renderer for the Card Maker pages (maker + search).
// Draws a card on a <canvas> using the same layer stack + text placement as
// the game's CardImage (client/src/lib/cardImage.ts), at the native 472x672
// asset size. Canvases smaller than native render scaled (crisp, via transform).

// ---------------------------------------------------------------- constants

export const CANVAS_W = 472
export const CANVAS_H = 672

// The game lays text out in display units (card shown at 235.2x336); convert
// to native asset pixels.
const SCALE_X = CANVAS_W / 235.2
const SCALE_Y = CANVAS_H / 336

// Colors from the game (client/src/settings/color.ts + cardImage.ts)
const COLOR_WHITE = '#F5F2EB' // whiteS: title, cost, points, rules text
const COLOR_GOLD_TEXT = '#FABD5D' // keywords + card references in rules text
const COLOR_STROKE = '#000000'

const CARD_FONT = "'Times New Roman', Times, serif"

// ------------------------------------------------------------------- data

// keywords: [{ name, text, hasX }], cards: [{ name, cost, points, text, theme }]
export let gameData = { keywords: [], cards: [], subjects: [] }

let goldPatterns = []
let doveIndex = 0

// Asset URLs resolve relative to this module, so pages in subdirectories
// (e.g. /cardmaker/search/) load the same files
const assetUrl = (path) => new URL(`assets/${path}`, import.meta.url).href

export async function loadGameData() {
  gameData = await (await fetch(assetUrl('gameData.json'))).json()
  doveIndex = Math.max(0, gameData.subjects.indexOf('Dove'))
  buildGoldPatterns()
  return gameData
}

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Give an element a mouse-tracking 3D tilt: while the pointer is over it the
 * element angles toward the cursor (up to `maxDeg` on each axis), resetting
 * flat when the pointer leaves. Mouse-only, so touch taps aren't affected.
 *
 * The element must live inside something with a `perspective` (the `.tilt-scene`
 * wrapper) and carry `transform-style: preserve-3d`, so child layers at
 * different `translateZ` parallax as it rotates.
 */
export function attachTilt(el, maxDeg = 10) {
  el.addEventListener('mousemove', (e) => {
    const r = el.getBoundingClientRect()
    const rotY = ((e.clientX - r.left) / r.width - 0.5) * 2 * maxDeg
    const rotX = -((e.clientY - r.top) / r.height - 0.5) * 2 * maxDeg
    el.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`
  })
  el.addEventListener('mouseleave', () => {
    el.style.transform = ''
  })
}

/**
 * Build a layered, tiltable 3D card. The background, subject, and frame+text
 * render on three stacked planes at increasing depth, so the hover tilt
 * parallaxes the subject against the frame — it reads as genuine 3D rather than
 * a flat image being angled. Returns the `.tilt-scene` element to append.
 *
 * `width` is any CSS length; `half` renders the layer canvases at half
 * resolution (lighter — use it for grids of many cards).
 */
// Layer canvases per tilt scene, so a live preview (the maker) can redraw them
// in place via redrawTiltCard instead of rebuilding the element each keystroke.
const tiltLayers = new WeakMap()

export function createTiltCard(fields, { width = '100%', half = false } = {}) {
  const scene = document.createElement('div')
  scene.className = 'tilt-scene'
  scene.style.width = width

  const card = document.createElement('div')
  card.className = 'tilt-card'
  scene.appendChild(card)

  const w = half ? CANVAS_W / 2 : CANVAS_W
  const h = half ? CANVAS_H / 2 : CANVAS_H
  const layer = (cls) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.className = `tilt-layer ${cls}`
    card.appendChild(c)
    return c
  }
  const layers = {
    bg: layer('tilt-bg'),
    subject: layer('tilt-subject'),
    frame: layer('tilt-frame'),
  }
  tiltLayers.set(scene, layers)
  renderTiltLayers(fields, layers.bg, layers.subject, layers.frame)

  attachTilt(card)
  return scene
}

/** Re-render an existing tilt card's layers in place (for the live preview). */
export function redrawTiltCard(scene, fields) {
  const l = tiltLayers.get(scene)
  if (l) renderTiltLayers(fields, l.bg, l.subject, l.frame)
}

export const themeLayer = (kind, theme) =>
  assetUrl(`card/${kind}/${theme}.webp`)
export const subjectSrc = (index) =>
  assetUrl(`subjects/${encodeURIComponent(gameData.subjects[index])}.webp`)

/** Index of a subject by name; falls back to Dove like the game does. */
export const subjectIndexByName = (name) => {
  const i = gameData.subjects.indexOf(name)
  return i >= 0 ? i : doveIndex
}

export const defaultSubjectIndex = () => doveIndex

/** Renderable fields for one of the game's real cards. */
export const realCardFields = (card) => ({
  ...card,
  subject: subjectIndexByName(card.name),
})

// ------------------------------------------------------------------ assets

const imageCache = new Map()

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

// ------------------------------------------------- gold text tokenization

// Mirrors CardImage.createText: keywords (with optional trailing number) and
// referenced card names render in gold.
// Like the game's getReferencedCardNames, a card whose name is also a keyword
// name is never treated as a card reference
const isKeywordName = (name) =>
  gameData.keywords.some((k) => k.name === name)

function buildGoldPatterns() {
  goldPatterns = []
  for (const keyword of gameData.keywords) {
    goldPatterns.push(
      new RegExp(`\\b${keyword.name}(?:[ ]*(-?\\d+))?(?=\\b|[.,!?;])`, 'g'),
    )
  }
  for (const card of gameData.cards) {
    if (isKeywordName(card.name)) continue
    goldPatterns.push(new RegExp(`\\b${escapeRegex(card.name)}\\b`, 'g'))
  }
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

// ------------------------------------------- keyword reminders / references

/** Every real card (or token) referenced in the text, in catalog order. */
export function findReferencedCards(text) {
  const found = []
  for (const card of gameData.cards) {
    if (isKeywordName(card.name)) continue
    if (new RegExp(`\\b${escapeRegex(card.name)}\\b`).test(text)) found.push(card)
  }
  return found
}

/**
 * Render each referenced card into `container`, stacked vertically. When
 * `hrefFor` is given each card is wrapped in a link to that URL (the card
 * pages); without it the cards are plain previews (the maker). The container
 * is hidden when the list is empty.
 */
export function renderReferencedCards(container, cards, hrefFor = null) {
  container.innerHTML = ''
  container.hidden = cards.length === 0
  for (const card of cards) {
    const tilt = createTiltCard(realCardFields(card), { width: '236px' })
    if (hrefFor) {
      const link = document.createElement('a')
      link.href = hrefFor(card)
      link.appendChild(tilt)
      container.appendChild(link)
    } else {
      container.appendChild(tilt)
    }
  }
}

/** Turn the keyword's BBCode reminder (trusted, from shared/) into HTML. */
export function bbToHtml(s) {
  return s
    .replace(/\[color=(#[0-9A-Fa-f]{6})\]/g, '<span style="color:$1">')
    .replace(/\[\/color\]/g, '</span>')
}

/**
 * Reminder lines for each keyword in the text — including, like the game's
 * Catalog.getReferencedKeywords, keywords in the referenced cards' text.
 * X is substituted with the written value when present.
 */
export function keywordReminders(text, refCards = []) {
  const fullText = text + refCards.map((c) => ' ' + c.text).join('')
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

// Stale-render cancellation, per canvas: when a newer render for the same
// canvas starts before an older one's images finish loading, the older aborts
const canvasTokens = new WeakMap()

// Draw the card's text (title, cost, points, rules) onto an already-scaled ctx.
function drawCardText(ctx, fields) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Title: game places it 18px (display) from the top, card font 20px
  ctx.font = `${Math.round(20 * SCALE_Y)}px ${CARD_FONT}`
  drawTextWithStroke(ctx, fields.name, CANVAS_W / 2, 18 * SCALE_Y, COLOR_WHITE)

  // Cost / points: 27px from left edge, 58 / 102 from top (display units)
  ctx.font = `${Math.round(24 * SCALE_Y)}px ${CARD_FONT}`
  drawTextWithStroke(ctx, String(fields.cost), 27 * SCALE_X, 58 * SCALE_Y, COLOR_WHITE)
  drawTextWithStroke(ctx, String(fields.points), 27 * SCALE_X, 102 * SCALE_Y, COLOR_WHITE)

  // Rules text: centered block whose center sits 40px (display) above the bottom
  ctx.font = `${Math.round(16 * SCALE_Y)}px ${CARD_FONT}`
  const maxWidth = 224 * SCALE_X
  const lineHeight = 18 * SCALE_Y
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
      drawTextWithStroke(ctx, run.text, x, y, run.gold ? COLOR_GOLD_TEXT : COLOR_WHITE)
      x += ctx.measureText(run.text + ' ').width
    }
    ctx.textAlign = 'center'
  })
}

// Prepare a canvas ctx at the right scale for a native-size (472x672) draw.
function scaledCtx(canvas) {
  const ctx = canvas.getContext('2d')
  const scale = canvas.width / CANVAS_W
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
  return ctx
}

export async function renderCard(canvas, fields) {
  const token = (canvasTokens.get(canvas) ?? 0) + 1
  canvasTokens.set(canvas, token)

  // Load all layers first so the draw is atomic (no flicker)
  const [bg, subject, arc, frame] = await Promise.all([
    loadImage(themeLayer('background', fields.theme)),
    loadImage(subjectSrc(fields.subject)),
    loadImage(themeLayer('arc', fields.theme)),
    loadImage(themeLayer('container', fields.theme)),
  ])
  if (canvasTokens.get(canvas) !== token) return

  const ctx = scaledCtx(canvas)
  ctx.drawImage(bg, 0, 0, CANVAS_W, CANVAS_H)
  ctx.drawImage(subject, 0, 0, CANVAS_W, CANVAS_H)
  ctx.drawImage(arc, 0, 0, CANVAS_W, CANVAS_H)
  ctx.drawImage(frame, 0, 0, CANVAS_W, CANVAS_H)
  drawCardText(ctx, fields)
}

/**
 * Render `fields` to a flat 472x672 PNG and trigger a download. Used by the
 * maker and the card pages so a saved image is always the full-resolution
 * composite (never the tilted display).
 */
export async function downloadCardPng(fields, filename = 'card') {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  await renderCard(canvas, fields)
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${filename || 'card'}.png`
  a.click()
  URL.revokeObjectURL(a.href)
}

// Render a card as three separate planes for the 3D tilt: background, subject,
// and frame+text (the frame's transparent center lets the subject show through).
async function renderTiltLayers(fields, bgCanvas, subjectCanvas, frameCanvas) {
  // Guard against a stale redraw (rapid preview edits) landing after a newer one
  const token = (canvasTokens.get(bgCanvas) ?? 0) + 1
  canvasTokens.set(bgCanvas, token)

  const [bg, subject, arc, frame] = await Promise.all([
    loadImage(themeLayer('background', fields.theme)),
    loadImage(subjectSrc(fields.subject)),
    loadImage(themeLayer('arc', fields.theme)),
    loadImage(themeLayer('container', fields.theme)),
  ])
  if (canvasTokens.get(bgCanvas) !== token) return

  scaledCtx(bgCanvas).drawImage(bg, 0, 0, CANVAS_W, CANVAS_H)
  scaledCtx(subjectCanvas).drawImage(subject, 0, 0, CANVAS_W, CANVAS_H)

  const fctx = scaledCtx(frameCanvas)
  fctx.drawImage(arc, 0, 0, CANVAS_W, CANVAS_H)
  fctx.drawImage(frame, 0, 0, CANVAS_W, CANVAS_H)
  drawCardText(fctx, fields)
}
