// Re-export from shared so client uses single source of truth for journey data
export {
  journeyData,
  THEME_KEYS,
  THEME_DISPLAY_NAMES,
  getMissionsByTheme,
  getMissionById,
  type MissionNode,
  type JourneyNode,
} from '../../../shared/journey/journey'

import type { JourneyNode } from '../../../shared/journey/journey'

/** Alias for backward compatibility in client code */
export type journeyNode = JourneyNode
