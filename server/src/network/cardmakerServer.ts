import express from 'express'
import cors from 'cors'
import * as fs from 'fs'
import * as path from 'path'
import { and, count, desc, eq, lt } from 'drizzle-orm'

import { CARDMAKER_PORT } from '../../../shared/network/settings'
import { db } from '../db/db'
import { customCards } from '../db/schema'
import { buildSearchBlob, searchConditions } from './cardmakerSearch'

// --- Field caps (must stay in sync with the DB varchar lengths in schema.ts
//     and the UI caps in sites/cardmaker) ---
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
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// The subject index is an offset into the append-only curated list in the card
// maker's generated gameData.json. The backend doesn't ship that file, so we
// read it when present (local dev) and otherwise fall back to a generous cap
// that still rejects nonsense like `subject: 9999`.
const SUBJECT_MAX_FALLBACK = 512
function loadSubjectCount(): number {
  const file = path.resolve(
    process.cwd(),
    '../sites/cardmaker/assets/gameData.json',
  )
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (Array.isArray(data.subjects) && data.subjects.length > 0) {
      return data.subjects.length
    }
  } catch {
    // Not available (e.g. prod backend) — fall through to the cap.
  }
  return SUBJECT_MAX_FALLBACK
}
const SUBJECT_COUNT = loadSubjectCount()

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
function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (publishTimes.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  )
  if (recent.length >= RATE_LIMIT) {
    publishTimes.set(ip, recent)
    return true
  }
  recent.push(now)
  publishTimes.set(ip, recent)
  return false
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

  // POST /cardmaker/api/cards — publish a card, returns { id }
  app.post('/cardmaker/api/cards', async (req, res) => {
    const ip = req.ip || 'unknown'
    if (rateLimited(ip)) {
      return res
        .status(429)
        .json({ error: 'Rate limit reached. Try again later.' })
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

  // GET /cardmaker/api/cards?before={id}&limit={n}&q={query}
  // Newest-first page of visible cards matching the query, plus the total match
  // count. `q` uses the same syntax as game-card search (see cardmakerSearch).
  // `before` is a keyset cursor (the last id of the previous page) for paging.
  app.get('/cardmaker/api/cards', async (req, res) => {
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

  // GET /cardmaker/api/cards/{id} — one card's fields
  app.get('/cardmaker/api/cards/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }
    try {
      const [row] = await db
        .select()
        .from(customCards)
        .where(and(eq(customCards.id, id), eq(customCards.hidden, false)))
        .limit(1)
      if (!row) {
        return res.status(404).json({ error: 'Card not found' })
      }
      res.json(toPublicCard(row))
    } catch (e) {
      console.error('Error fetching custom card:', e)
      res.status(500).json({ error: 'Failed to fetch card' })
    }
  })

  // Local-dev convenience: also serve the static card maker site from this
  // origin, so the same-origin `/cardmaker/api` calls resolve without a
  // separate proxy. In production nginx serves these files instead; the
  // directory simply won't exist in the backend container, so this is skipped.
  const siteDir = path.resolve(process.cwd(), '../sites/cardmaker')
  if (fs.existsSync(siteDir)) {
    app.use('/cardmaker', express.static(siteDir))
  }

  app.listen(CARDMAKER_PORT, () => {
    console.log('Card maker server is running on port:', CARDMAKER_PORT)
  })
}
