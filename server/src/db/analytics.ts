import { analytics } from './schema'
import { db } from './db'
import { eq, and } from 'drizzle-orm'

// Helper to filter out undefined properties
function clean<T>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined),
  ) as T
}

// Log or update tutorial progress (upsert by player_id + funnel_step)
export async function logTutorialProgress(
  player_id: string | null,
  funnel_step: string,
  turn_reached: number,
) {
  // Check if there's already a record for this player and funnel_step
  const existing = await db
    .select()
    .from(analytics)
    .where(
      and(
        eq(analytics.player_id, player_id),
        eq(analytics.event_type, 'tutorial_progress'),
        eq(analytics.funnel_step, funnel_step),
      ),
    )
    .limit(1)
  if (existing.length === 0) {
    await db.insert(analytics).values(
      clean({
        player_id,
        event_type: 'tutorial_progress',
        funnel_step,
        metadata: turn_reached,
        time: new Date(),
      }),
    )
  } else if (turn_reached > (existing[0].metadata || 0)) {
    await db
      .update(analytics)
      .set(
        clean({
          player_id,
          event_type: 'tutorial_progress',
          funnel_step,
          metadata: turn_reached,
          time: new Date(),
        }),
      )
      .where(
        and(
          eq(analytics.player_id, player_id),
          eq(analytics.event_type, 'tutorial_progress'),
          eq(analytics.funnel_step, funnel_step),
        ),
      )
  }
}

// Log a generic funnel event
export async function logFunnelEvent(
  player_id: string | null,
  event_type: string,
  funnel_step: string,
  metadata?: number,
) {
  if (!player_id) player_id = null

  await db.insert(analytics).values(
    clean({
      player_id,
      event_type,
      funnel_step,
      metadata,
      time: new Date(),
    }),
  )
}
