import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import type { players, matchHistory, achievements } from './schema'
import * as dotenv from 'dotenv'

dotenv.config()

type Schema = {
  players: typeof players
  matchHistory: typeof matchHistory
  achievements: typeof achievements
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle<Schema>(pool, { schema })
