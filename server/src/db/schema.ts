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
    email: varchar('email', { length: 255 }),
    // Linked provider identities. An account may have one or both; logins are
    // resolved by looking these up, not by trusting/deriving the id client-side.
    // Null = that provider is not linked. Guests have neither set.
    google_id: varchar('google_id', { length: 255 }),
    steam_id: varchar('steam_id', { length: 255 }),
    username: varchar('username', { length: 255 }).notNull(),
    createdate: date('createdate')
      .notNull()
      .default(sql`now()`),
    lastactive: date('lastactive').notNull(),
    decks: varchar('decks', { length: 1000 }).array().notNull(),

    // PVP Records
    elo: integer('elo').notNull(),
    elo_peak: integer('elo_peak').notNull(),
    pvp_wins_lifetime: integer('pvp_wins_lifetime').notNull(),
    pvp_losses_lifetime: integer('pvp_losses_lifetime').notNull(),
    pvp_wins_month: integer('pvp_wins_month').notNull(),
    pvp_losses_month: integer('pvp_losses_month').notNull(),

    // Single Player Records
    pve_wins: integer('pve_wins').notNull(),
    pve_losses: integer('pve_losses').notNull(),
    inventory: varchar('inventory', { length: 1000 }).notNull(),
    completedmissions: varchar('completedmissions', { length: 1000 }).notNull(),
    missiongoldclaimed: varchar('missiongoldclaimed', {
      length: 1000,
    }).notNull(),

    // Per avatar: null = not chosen, 0 = choice A, 1 = choice B
    journey_choices: integer('journey_choices').array().notNull(),

    // TODO Rename this inventory after the map journey mode is removed
    card_inventory: varchar('card_inventory', { length: 1000 }).notNull(),

    // Garden
    garden: timestamp('garden', { mode: 'date' }).array(),

    // Currency
    gems: integer('gems').notNull(),
    coins: integer('coins').notNull(),

    // Playtime
    playtime: integer('playtime').notNull().default(0),

    // Whether others may spectate this user's matches
    can_be_spectated: boolean('can_be_spectated').notNull().default(true),

    // Cosmetic set
    cosmetic_set: varchar('cosmetic_set', { length: 1000 }).notNull(),

    // Referral
    ref: varchar('ref', { length: 255 }),
  },
  (table) => ({
    emailIdx: uniqueIndex('email_idx').on(table.email),
    googleIdIdx: uniqueIndex('google_id_idx').on(table.google_id),
    steamIdIdx: uniqueIndex('steam_id_idx').on(table.steam_id),
  }),
)

export const approvedRefs = pgTable('approved_refs', {
  code: varchar('code', { length: 255 }).primaryKey(),
})

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

/** Client-reported time (ms) to finish loading all game assets. */
export const loadTimes = pgTable(
  'load_times',
  {
    id: serial('id').primaryKey(),
    // Null when reported before/without a signed-in account
    player_id: uuid('player_id').references(() => players.id, {
      onDelete: 'cascade',
    }),
    load_ms: integer('load_ms').notNull(),
    time: timestamp('time').notNull().defaultNow(),
  },
  (table) => ({
    timeIdx: index('load_times_time_idx').on(table.time),
    playerIdx: index('load_times_player_idx').on(table.player_id),
  }),
)

/** Aggregate PvE mission outcomes across all players (one row per mission id). */
export const missionStats = pgTable('mission_stats', {
  mission_id: integer('mission_id').primaryKey(),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
})

export const matches = pgTable(
  'matches',
  {
    id: serial('id').primaryKey(),
    game_id: uuid('game_id').notNull(),
    p1_id: uuid('p1_id')
      .notNull()
      .references(() => players.id),
    // Nullable for PvE (AI opponent)
    p2_id: uuid('p2_id').references(() => players.id),
    // Serialized GameModel as JSON
    game_state: varchar('game_state', { length: 500000 }).notNull(),
    time: timestamp('time').notNull().defaultNow(),
  },
  (table) => ({
    // Index for finding all states of a specific game
    gameIdIdx: index('matches_game_id_idx').on(table.game_id),
    // Indexes for finding a player's games
    p1Idx: index('matches_p1_idx').on(table.p1_id),
    p2Idx: index('matches_p2_idx').on(table.p2_id),
    // Index for "find most recent game" sorted by time
    timeIdx: index('matches_time_idx').on(table.time),
  }),
)

/**
 * Fan-made cards from the Card Maker site (sites/cardmaker). Owned entirely by
 * that feature — no FK into game tables. Rows are fields-only (a few hundred
 * bytes); clients render the image from these. Lengths are capped here and
 * re-validated in cardmakerServer.ts.
 */
export const customCards = pgTable(
  'custom_cards',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 24 }).notNull(),
    cost: integer('cost').notNull(),
    points: integer('points').notNull(),
    text: varchar('text', { length: 200 }).notNull(),
    theme: integer('theme').notNull(),
    subject: integer('subject').notNull(), // index of the art-subject
    creator: varchar('creator', { length: 20 }), // optional
    created_at: timestamp('created_at').notNull().defaultNow(),
    hidden: boolean('hidden').notNull().default(false), // moderation kill switch
  },
  (table) => ({
    // Gallery pages newest-first, skipping hidden cards
    createdIdx: index('custom_cards_created_idx').on(table.created_at),
  }),
)
