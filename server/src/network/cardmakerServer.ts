import express from 'express'
import cors from 'cors'
import * as fs from 'fs'
import * as path from 'path'
import { and, count, desc, eq, lt } from 'drizzle-orm'

import { CARDMAKER_PORT } from '../../../shared/network/settings'
import { db } from '../db/db'
import { customCards } from '../db/schema'
import Catalog from '../../../shared/state/catalog'
import { buildSearchBlob, searchConditions } from './cardmakerSearch'
import { renderCardImage, renderGameCardImage, getSubjectNames } from './cardmakerImage'
import { buildCommunityHtml } from './cardmakerCommunityPage'

// --- Field caps (must stay in sync with the DB varchar lengths in schema.ts
//     and the UI caps in sites/cards) ---
const NAME_MAX = 24
const TEXT_MAX = 200
const CREATOR_MAX = 20
// Cost and points may be negative (the game itself ships negative-point cards
// like Wound/Condemnation, and the maker is a toy with no balance rules).
const COST_MIN = -99
const COST_MAX = 99
const POINTS_MIN = -99
const POINTS_MAX = 99
const THEME_MIN = 0
const THEME_MAX = 8

// Publish rate limit per IP.
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// The subject index is an offset into the append-only curated list of subject
// art. Read straight from the same client/ asset directory cardmakerImage.ts
// renders from (shipped in the backend image — see DockerfileServer), so the
// cap is always exact instead of a loose guess: a stale/oversized fallback here
// would let a card publish with an index past the real art, permanently
// rendering with no subject (published cards can't be edited afterward).
const SUBJECT_COUNT = getSubjectNames().length

// Must match slugify + the collectible+token card list in generateAssets.ts
const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const MAX_TOKEN_ID = 2000
let gameCardsBySlug: Map<
  string,
  { name: string; cost: number; points: number; text: string; theme: number }
> | null = null
function getGameCardsBySlug() {
  if (!gameCardsBySlug) {
    const collectibleIds = new Set(
      Catalog.collectibleCardsWithBetaCards.map((c) => c.id),
    )
    const all = [
      ...Catalog.collectibleCards,
      ...Catalog.allCards.filter(
        (c) => !collectibleIds.has(c.id) && c.id <= MAX_TOKEN_ID,
      ),
    ]
    gameCardsBySlug = new Map(
      all.map((c) => [
        slugify(c.name),
        { name: c.name, cost: c.cost, points: c.points, text: c.text, theme: c.theme ?? 0 },
      ]),
    )
  }
  return gameCardsBySlug
}

type CardFields = {
  name: string
  cost: number
  points: number
  text: string
  theme: number
  subject: number
  creator: string | null
}

// Validate + normalize a publish body. Returns the cleaned fields or an error
// string; every cap is enforced here regardless of what the UI allows, so a
// raw curl can't bypass them (acceptance criterion 6).
function validate(body: any): { fields?: CardFields; error?: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be a JSON object' }
  }

  const isInt = (v: any) => typeof v === 'number' && Number.isInteger(v)
  const inRange = (v: number, lo: number, hi: number) => v >= lo && v <= hi

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (name.length < 1 || name.length > NAME_MAX) {
    return { error: `name must be 1–${NAME_MAX} characters` }
  }

  const text = typeof body.text === 'string' ? body.text : ''
  if (text.length > TEXT_MAX) {
    return { error: `text must be at most ${TEXT_MAX} characters` }
  }

  if (!isInt(body.cost) || !inRange(body.cost, COST_MIN, COST_MAX)) {
    return { error: `cost must be an integer ${COST_MIN}–${COST_MAX}` }
  }
  if (!isInt(body.points) || !inRange(body.points, POINTS_MIN, POINTS_MAX)) {
    return { error: `points must be an integer ${POINTS_MIN}–${POINTS_MAX}` }
  }
  if (!isInt(body.theme) || !inRange(body.theme, THEME_MIN, THEME_MAX)) {
    return { error: `theme must be an integer ${THEME_MIN}–${THEME_MAX}` }
  }
  if (!isInt(body.subject) || !inRange(body.subject, 0, SUBJECT_COUNT - 1)) {
    return { error: `subject must be an integer 0–${SUBJECT_COUNT - 1}` }
  }

  let creator: string | null = null
  if (body.creator !== undefined && body.creator !== null) {
    if (typeof body.creator !== 'string') {
      return { error: 'creator must be a string' }
    }
    const trimmed = body.creator.trim()
    if (trimmed.length > CREATOR_MAX) {
      return { error: `creator must be at most ${CREATOR_MAX} characters` }
    }
    creator = trimmed.length > 0 ? trimmed : null
  }

  return {
    fields: {
      name,
      cost: body.cost,
      points: body.points,
      text,
      theme: body.theme,
      subject: body.subject,
      creator,
    },
  }
}

// Simple in-memory sliding-window limiter (single process, matches this
// server's scale). Maps client IP -> recent publish timestamps.
const publishTimes = new Map<string, number[]>()
// Returns 0 when a publish is allowed (and records it), otherwise the number of
// seconds until the oldest publish in the window ages out and one frees up.
function rateLimited(ip: string): number {
  const now = Date.now()
  const recent = (publishTimes.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  )
  if (recent.length >= RATE_LIMIT) {
    publishTimes.set(ip, recent)
    return Math.max(1, Math.ceil((recent[0] + RATE_WINDOW_MS - now) / 1000))
  }
  recent.push(now)
  publishTimes.set(ip, recent)
  return 0
}

// Shared by every route that looks up one card by id: not-hidden only, and
// null for a missing/invalid id rather than throwing.
async function getVisibleCard(id: number) {
  if (!Number.isInteger(id)) return null
  const [row] = await db
    .select()
    .from(customCards)
    .where(and(eq(customCards.id, id), eq(customCards.hidden, false)))
    .limit(1)
  return row ?? null
}

// Shape a DB row into the public card fields the client renders from.
function toPublicCard(row: typeof customCards.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    cost: row.cost,
    points: row.points,
    text: row.text,
    theme: row.theme,
    subject: row.subject,
    creator: row.creator ?? '',
  }
}

export default function createCardmakerServer() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '16kb' }))
  // Behind NPM's reverse proxy, honor X-Forwarded-For so the rate limiter sees
  // the real client IP rather than the proxy's.
  app.set('trust proxy', true)

  // POST /cards/api/cards — publish a card, returns { id }
  app.post('/cards/api/cards', async (req, res) => {
    const ip = req.ip || 'unknown'
    const retryAfter = rateLimited(ip)
    if (retryAfter > 0) {
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({
        error: 'Rate limit reached.',
        limit: RATE_LIMIT,
        retryAfter, // seconds until a publish frees up
      })
    }

    const { fields, error } = validate(req.body)
    if (error) {
      return res.status(400).json({ error })
    }

    try {
      const values = { ...fields!, search_blob: buildSearchBlob(fields!) }
      const [row] = await db
        .insert(customCards)
        .values(values)
        .returning({ id: customCards.id })
      res.json({ id: row.id })
    } catch (e) {
      console.error('Error publishing custom card:', e)
      res.status(500).json({ error: 'Failed to publish card' })
    }
  })

  // GET /cards/api/cards?before={id}&limit={n}&q={query}
  // Newest-first page of visible cards matching the query, plus the total match
  // count. `q` uses the same syntax as game-card search (see cardmakerSearch).
  // `before` is a keyset cursor (the last id of the previous page) for paging.
  app.get('/cards/api/cards', async (req, res) => {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? '20'), 10) || 20, 1),
      50,
    )
    const before = parseInt(String(req.query.before ?? ''), 10)
    const q = typeof req.query.q === 'string' ? req.query.q : ''

    // The query filters (blind to pagination) back both the count and the page;
    // `before` narrows only the page, so the total stays stable as you page.
    const queryFilters = [eq(customCards.hidden, false), ...searchConditions(q)]
    const pageFilters = [...queryFilters]
    if (Number.isInteger(before)) {
      pageFilters.push(lt(customCards.id, before))
    }

    try {
      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(customCards)
          .where(and(...pageFilters))
          .orderBy(desc(customCards.id))
          .limit(limit),
        db
          .select({ total: count() })
          .from(customCards)
          .where(and(...queryFilters)),
      ])
      res.json({ cards: rows.map(toPublicCard), total })
    } catch (e) {
      console.error('Error listing custom cards:', e)
      res.status(500).json({ error: 'Failed to list cards' })
    }
  })

  // GET /cards/api/cards/{id} — one card's fields
  app.get('/cards/api/cards/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }
    try {
      const row = await getVisibleCard(id)
      if (!row) {
        return res.status(404).json({ error: 'Card not found' })
      }
      res.json(toPublicCard(row))
    } catch (e) {
      console.error('Error fetching custom card:', e)
      res.status(500).json({ error: 'Failed to fetch card' })
    }
  })

  // GET /cards/api/cards/{id}/image.png — server-rendered card art, used
  // as the og:image for the community page preview (see cardmakerImage.ts)
  app.get('/cards/api/cards/:id/image.png', async (req, res) => {
    const id = parseInt(req.params.id, 10)
    if (!Number.isInteger(id)) {
      return res.status(400).end()
    }
    try {
      const row = await getVisibleCard(id)
      if (!row) {
        return res.status(404).end()
      }
      const png = await renderCardImage(row)
      res.set('Content-Type', 'image/png')
      res.set('Cache-Control', 'public, max-age=86400, immutable')
      res.send(png)
    } catch (e) {
      console.error('Error rendering custom card image:', e)
      res.status(500).end()
    }
  })

  // GET /cards/api/game-cards/{slug}/image.png — server-rendered art for a
  // real game card's og:image. Static per-card pages can't render anything
  // server-side themselves, so they point here — see generateAssets.ts.
  app.get('/cards/api/game-cards/:slug/image.png', async (req, res) => {
    const card = getGameCardsBySlug().get(req.params.slug)
    if (!card) {
      return res.status(404).end()
    }
    try {
      const png = await renderGameCardImage(card)
      res.set('Content-Type', 'image/png')
      res.set('Cache-Control', 'public, max-age=86400, immutable')
      res.send(png)
    } catch (e) {
      console.error('Error rendering game card image:', e)
      res.status(500).end()
    }
  })

  // GET /cards/community — server-rendered HTML shell with per-card
  // og:title/og:description/og:image, so shared links preview the actual
  // card instead of one generic blurb (link-preview bots don't run JS, so
  // the static file's fixed meta tags can't vary by ?id=). Everything else
  // under /cards/ stays static; this route needs its own NPM custom
  // location pointing at the backend — see sites/README.md.
  app.get('/cards/community', async (req, res) => {
    // Relative asset paths in the rendered page (../viewCard.js, etc.)
    // only resolve correctly with a trailing slash — nginx did this
    // automatically for the old static file; this route has to do it itself.
    if (req.path === '/cards/community') {
      return res.redirect(
        301,
        req.originalUrl.replace('/cards/community', '/cards/community/'),
      )
    }
    const rawId = typeof req.query.id === 'string' ? req.query.id : ''
    const id = parseInt(rawId, 10)
    const row = await getVisibleCard(id)
    const origin = `${req.protocol}://${req.get('host')}`
    res.set('Content-Type', 'text/html; charset=utf-8')
    res.send(buildCommunityHtml(row, origin, rawId))
  })

  // Local-dev convenience: also serve the static card tools site from this
  // origin, so the same-origin `/cards/api` calls resolve without a
  // separate proxy. In production nginx serves these files instead; the
  // directory simply won't exist in the backend container, so this is skipped.
  // Bare /cards has no page of its own — mirrors the redirect in nginx.conf.
  const siteDir = path.resolve(process.cwd(), '../sites/cards')
  if (fs.existsSync(siteDir)) {
    app.get('/cards', (req, res) => res.redirect(301, '/cards/maker/'))
    app.get('/cards/', (req, res) => res.redirect(301, '/cards/maker/'))
    app.use('/cards', express.static(siteDir))
  }

  app.listen(CARDMAKER_PORT, () => {
    console.log('Card maker server is running on port:', CARDMAKER_PORT)
  })
}
