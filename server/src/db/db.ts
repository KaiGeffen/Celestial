import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import type { players } from './schema'
import * as dotenv from 'dotenv'

dotenv.config()

// Define schema type if needed
type Schema = {
  players: typeof players
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export const db = drizzle<Schema>(pool, { schema })
