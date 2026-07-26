// Server-side render of a community card, for the /cardmaker/community
// og:image preview. Mirrors the layer stack and text layout in
// sites/cardmaker/cardRenderer.js (client-only canvas renderer) so the two
// stay visually consistent; see that file if the client layout changes.

import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'
import * as opentype from 'opentype.js'
import { Keywords } from '../../../shared/state/keyword'
import Catalog from '../../../shared/state/catalog'

const CANVAS_W = 472
const CANVAS_H = 672
const SCALE_X = CANVAS_W / 235.2
const SCALE_Y = CANVAS_H / 336

const COLOR_WHITE = '#F5F2EB'
const COLOR_GOLD_TEXT = '#FABD5D'
const COLOR_STROKE = '#000000'

const cardAssetsDir = path.resolve(process.cwd(), '../client/assets/img/card')
const fontsDir = path.resolve(process.cwd(), '../client/assets/fonts')

interface CardFields {
  name: string
  cost: number
  points: number
  text: string
  theme: number
  subject: number
}

let subjectNames: string[] | null = null
// Must match the sorted subject-name list generateAssets.ts builds for the client
function getSubjectNames(): string[] {
  if (!subjectNames) {
    subjectNames = fs
      .readdirSync(path.join(cardAssetsDir, 'subject'))
      .filter((f) => f.endsWith('.webp'))
      .map((f) => f.replace(/\.webp$/, ''))
      .sort()
  }
  return subjectNames
}

let rulesFont: opentype.Font | null = null
function getRulesFont(): opentype.Font {
  if (!rulesFont) {
    // opentype.loadSync is deprecated and returns undefined as of 2.0 despite
    // not throwing — parse the bytes directly instead.
    rulesFont = opentype.parse(fs.readFileSync(path.join(fontsDir, 'LTInternet.ttf')))
  }
  return rulesFont
}

let titleStatsFont: opentype.Font | null = null
function getTitleStatsFont(): opentype.Font {
  if (!titleStatsFont) {
    titleStatsFont = opentype.parse(fs.readFileSync(path.join(fontsDir, 'Helgoland.otf')))
  }
  return titleStatsFont
}

// librsvg (bundled in sharp) doesn't reliably honor dominant-baseline, so
// text renders at the default alphabetic baseline instead of centered —
// compute the baseline y that visually centers text at `centerY` ourselves,
// mirroring what canvas's textBaseline='middle' does in cardRenderer.js.
function centerBaselineY(font: opentype.Font, fontSize: number, centerY: number): number {
  const scale = fontSize / font.unitsPerEm
  return centerY + ((font.ascender + font.descender) * scale) / 2
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Mirrors buildGoldPatterns in cardRenderer.js: keywords (with optional
// trailing number, e.g. "Poise 2") and referenced card/token names render in
// gold. A card whose name is also a keyword name is never a card reference.
let goldPatterns: RegExp[] | null = null
function getGoldPatterns(): RegExp[] {
  if (goldPatterns) return goldPatterns

  const keywords = Keywords.getAll()
  const isKeywordName = (name: string) => keywords.some((k) => k.name === name)

  const patterns = keywords.map(
    (k) => new RegExp(`\\b${k.name}(?:[ ]*(-?\\d+))?(?=\\b|[.,!?;])`, 'g'),
  )

  // Collectible cards + tokens (Ashes, Child, …) — matches the card list
  // generateAssets.ts builds for the client's gameData.json
  const MAX_TOKEN_ID = 2000
  const collectibleIds = new Set(
    Catalog.collectibleCardsWithBetaCards.map((c) => c.id),
  )
  const cardNames = [
    ...Catalog.collectibleCards.map((c) => c.name),
    ...Catalog.allCards
      .filter((c) => !collectibleIds.has(c.id) && c.id <= MAX_TOKEN_ID)
      .map((c) => c.name),
  ]
  for (const name of cardNames) {
    if (isKeywordName(name)) continue
    patterns.push(new RegExp(`\\b${escapeRegex(name)}\\b`, 'g'))
  }

  goldPatterns = patterns
  return patterns
}

// Character ranges [start, end) of `text` that should render gold
function goldRanges(text: string): [number, number][] {
  const ranges: [number, number][] = []
  for (const regex of getGoldPatterns()) {
    regex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      ranges.push([match.index, match.index + match[0].length])
      if (match.index === regex.lastIndex) regex.lastIndex++
    }
  }
  return ranges
}

const inRanges = (ranges: [number, number][], idx: number) =>
  ranges.some(([a, b]) => idx >= a && idx < b)

interface TextRun {
  text: string
  gold: boolean
}

// Mirrors layoutRulesText in cardRenderer.js: hard breaks on \n, then greedy
// word-wrap by measured width against maxWidth, tagging each word gold/white
function layoutRulesText(
  text: string,
  fontSize: number,
  maxWidth: number,
): TextRun[][] {
  const font = getRulesFont()
  const ranges = goldRanges(text)
  const lines: TextRun[][] = []

  for (const paragraph of text.split('\n')) {
    let line: TextRun[] = []
    let lineWidth = 0
    let searchFrom = text.indexOf(paragraph)

    for (const word of paragraph.split(' ')) {
      if (word === '') continue
      const wordIdx = text.indexOf(word, searchFrom)
      searchFrom = wordIdx + word.length

      const gold = inRanges(ranges, wordIdx)
      const wordWidth = font.getAdvanceWidth(word + ' ', fontSize)

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

async function loadLayer(
  kind: 'background' | 'arc' | 'container',
  theme: number,
): Promise<Buffer> {
  const file = path.join(cardAssetsDir, kind, `${theme}.webp`)
  return sharp(file).resize(CANVAS_W, CANVAS_H, { fit: 'fill' }).toBuffer()
}

async function loadSubjectLayer(subjectIndex: number): Promise<Buffer> {
  const name = getSubjectNames()[subjectIndex]
  if (!name) throw new Error(`Invalid subject index: ${subjectIndex}`)
  const file = path.join(cardAssetsDir, 'subject', `${name}.webp`)
  return sharp(file).resize(CANVAS_W, CANVAS_H, { fit: 'fill' }).toBuffer()
}

// `centerY` is where the text should visually center; the baseline passed to
// SVG is computed from real font metrics (see centerBaselineY) since
// dominant-baseline isn't reliably honored by librsvg.
function textEl(
  x: number,
  centerY: number,
  size: number,
  family: string,
  content: string,
): string {
  const y = centerBaselineY(getTitleStatsFont(), size, centerY)
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" fill="${COLOR_WHITE}" stroke="${COLOR_STROKE}" stroke-width="3" stroke-linejoin="round" paint-order="stroke" text-anchor="middle">${escapeXml(content)}</text>`
}

// One <text> per line with a <tspan> per run so each word can carry its own
// gold/white fill — mirrors the per-run ctx.fillStyle draws in drawCardText
function renderRulesLines(
  lines: TextRun[][],
  fontSize: number,
  firstLineY: number,
  lineHeight: number,
): string {
  const font = getRulesFont()
  return lines
    .map((runs, i) => {
      const y = centerBaselineY(font, fontSize, firstLineY + i * lineHeight)
      const lineText = runs.map((r) => r.text).join(' ')
      const totalWidth = font.getAdvanceWidth(lineText, fontSize)
      let x = CANVAS_W / 2 - totalWidth / 2

      const tspans = runs
        .map((run) => {
          const fill = run.gold ? COLOR_GOLD_TEXT : COLOR_WHITE
          const el = `<tspan x="${x}" y="${y}" fill="${fill}">${escapeXml(run.text)}</tspan>`
          x += font.getAdvanceWidth(run.text + ' ', fontSize)
          return el
        })
        .join('')

      return `<text font-family="'LTInternet', serif" font-size="${fontSize}" stroke="${COLOR_STROKE}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${tspans}</text>`
    })
    .join('')
}

function buildTextSvg(card: CardFields): string {
  const titleFontSize = Math.round(20 * SCALE_Y)
  const statFontSize = Math.round(24 * SCALE_Y)
  const rulesFontSize = Math.round(16 * SCALE_Y)
  const maxWidth = 224 * SCALE_X
  const lineHeight = 18 * SCALE_Y

  const statX = 27 * SCALE_X
  const costY = 58 * SCALE_Y
  const pointsY = 102 * SCALE_Y

  const rulesLines = layoutRulesText(card.text, rulesFontSize, maxWidth)
  const blockCenterY = CANVAS_H - 40 * SCALE_Y
  const firstLineY = blockCenterY - ((rulesLines.length - 1) * lineHeight) / 2
  const rulesEls = renderRulesLines(rulesLines, rulesFontSize, firstLineY, lineHeight)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}">
    ${textEl(CANVAS_W / 2, 18 * SCALE_Y, titleFontSize, "'Helgoland', serif", card.name)}
    ${textEl(statX, costY, statFontSize, "'Helgoland', serif", String(card.cost))}
    ${textEl(statX, pointsY, statFontSize, "'Helgoland', serif", String(card.points))}
    ${rulesEls}
  </svg>`
}

export async function renderCardImage(card: CardFields): Promise<Buffer> {
  const [background, subject, arc, container] = await Promise.all([
    loadLayer('background', card.theme),
    loadSubjectLayer(card.subject),
    loadLayer('arc', card.theme),
    loadLayer('container', card.theme),
  ])

  const textSvg = Buffer.from(buildTextSvg(card))

  return sharp(background)
    .composite([{ input: subject }, { input: arc }, { input: container }, { input: textSvg }])
    .png()
    .toBuffer()
}
