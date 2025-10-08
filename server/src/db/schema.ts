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
  serial,
  boolean,
} from 'drizzle-orm/pg-core'
import { JourneySettings } from '../../../shared/settings'

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

    // Single Player Records
    pve_wins: integer('pve_wins').notNull(),
    pve_losses: integer('pve_losses').notNull(),
    inventory: varchar('inventory', { length: 1000 }).notNull(),
    completedmissions: varchar('completedmissions', { length: 1000 }).notNull(),
    avatar_experience: integer('avatar_experience').array().notNull(),
    energy: integer('energy').notNull().default(JourneySettings.ENERGY_MAX),

    // Garden
    garden: timestamp('garden', { mode: 'date' }).array(),

    // Currency
    gems: integer('gems').notNull(),
    coins: integer('coins').notNull(),

    // Cosmetic set
    cosmetic_set: varchar('cosmetic_set', { length: 1000 }).notNull(),
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

export const cosmeticsTransactions = pgTable(
  'cosmetics_transactions',
  {
    id: serial('id').primaryKey(),
    player_id: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    item_id: integer('item_id').notNull(),
    transaction_time: timestamp('transaction_time').notNull().defaultNow(),
    transaction_type: varchar('transaction_type', { length: 20 })
      .notNull()
      .$type<'purchase' | 'reward' | 'refund'>(),
  },
  (table) => ({
    // Index for querying a player's transactions
    playerTransactionsIdx: index('player_transactions_idx').on(table.player_id),
    // Index for querying by transaction time
    transactionTimeIdx: index('transaction_time_idx').on(
      table.transaction_time,
    ),
  }),
)

export const achievements = pgTable(
  'achievements',
  {
    id: serial('id').primaryKey(),
    player_id: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    achievement_id: integer('achievement_id').notNull(),
    progress: integer('progress').notNull(),
    seen: boolean('seen').notNull(),
    date_unlocked: timestamp('date_unlocked').notNull().defaultNow(),
  },
  (table) => ({
    playerIdx: index('achievement_player_idx').on(table.player_id),
    achievementIdx: index('achievement_achievement_idx').on(
      table.achievement_id,
    ),
    uniquePlayerAchievement: uniqueIndex('unique_player_achievement').on(
      table.player_id,
      table.achievement_id,
    ),
  }),
)

export const analytics = pgTable(
  'analytics',
  {
    id: serial('id').primaryKey(),
    player_id: uuid('player_id').references(() => players.id, {
      onDelete: 'cascade',
    }),
    time: timestamp('time').notNull().defaultNow(),
    event_type: varchar('event_type', { length: 64 }).notNull(), // e.g., 'register', 'tutorial_progress', 'play_click', etc.
    funnel_step: varchar('funnel_step', { length: 64 }).notNull(), // e.g., 'register', 'tutorial1_start', etc.
    metadata: integer('metadata'), // Amount for things like what turn they got to, etc. based on the event type
  },
  (table) => ({
    playerEventIdx: index('analytics_player_event_idx').on(
      table.player_id,
      table.event_type,
    ),
    eventTypeIdx: index('analytics_event_type_idx').on(
      table.player_id,
      table.event_type,
    ),
    funnelStepIdx: index('analytics_funnel_step_idx').on(
      table.player_id,
      table.funnel_step,
    ),
  }),
)
