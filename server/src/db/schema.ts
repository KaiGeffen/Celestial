import { sql, SQL } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  integer,
  varchar,
  date,
  uniqueIndex,
  timestamp,
  index,
  boolean,
  serial,
} from 'drizzle-orm/pg-core'

/*
                                       Table "public.players"
      Column       |        Type         | Collation | Nullable |              Default               
-------------------+---------------------+-----------+----------+------------------------------------
 id                | uuid                |           |          | 
 email             | character varying   |           |          | 
 username          | character varying   |           |          | 

//  Liveness
createdate        | date                |           |          | now()
lastactive        | date                |           |          | now()

// PVP Records
 wins              | integer             |           |          | 0
 losses            | integer             |           |          | 0
 elo               | integer             |           |          | 1000

 // Decks
 decks             | character varying[] |           |          | '{}'::character varying[]

 // Single player
 inventory         | bit varying(1000)   |           |          | '1000101001011100001'::bit varying
 completedmissions | bit varying(1000)   |           |          | ''::bit varying
*/

export const players = pgTable(
  'players',
  {
    id: uuid('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    username: varchar('username', { length: 255 }).notNull(),
    createdate: date('createdate')
      .notNull()
      .default(sql`now()`),
    lastactive: date('lastactive').notNull(),
    wins: integer('wins').notNull(),
    losses: integer('losses').notNull(),
    elo: integer('elo').notNull(),
    decks: varchar('decks', { length: 1000 }).array().notNull(),
    inventory: varchar('inventory', { length: 1000 }).notNull(),
    completedmissions: varchar('completedmissions', { length: 1000 }).notNull(),

    // Currency
    gems: integer('gems').notNull(),
    coins: integer('coins').notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('email_idx').on(table.email),
  }),
)

export const matchHistory = pgTable(
  'match_history',
  {
    // Match identifiers
    id: serial('id').primaryKey(),
    player1_id: uuid('player1_id').references(() => players.id),
    player2_id: uuid('player2_id').references(() => players.id),

    // Player info at time of match
    player1_username: varchar('player1_username', { length: 255 }).notNull(),
    player2_username: varchar('player2_username', { length: 255 }).notNull(),
    player1_elo: integer('player1_elo').notNull(),
    player2_elo: integer('player2_elo').notNull(),

    // Match details
    match_date: timestamp('match_date').notNull().defaultNow(),
    player1_deck: varchar('player1_deck', {
      length: 1000,
    }).notNull(),
    player2_deck: varchar('player2_deck', {
      length: 1000,
    }).notNull(),

    // Round results
    rounds_won: integer('rounds_won').notNull(),
    rounds_lost: integer('rounds_lost').notNull(),
    rounds_tied: integer('rounds_tied').notNull(),
  },
  (table) => ({
    // Index for querying a player's match history
    player1Idx: index('player1_idx').on(table.player1_id),
    player2Idx: index('player2_idx').on(table.player2_id),
    // Index for querying by date
    dateIdx: index('date_idx').on(table.match_date),
  }),
)
