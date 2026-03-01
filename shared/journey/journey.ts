import birds from './birds.json'
import ashes from './ashes.json'
import shadow from './shadow.json'
import pet from './pet.json'
import birth from './birth.json'
import vision from './vision.json'
import water from './water.json'
import stars from './stars.json'
import { Deck } from '../types/deck'

export interface MissionDetails {
  id: number
  name: string
  prereq: number[][]
  deck?: number[]
  opponent?: number[]
  cards?: number[]
  // TODO Remove or support these
  storyTitle?: string
  storyText?: string
}

export const journeyData: MissionDetails[] = [
  ...(birds as MissionDetails[]),
  ...(ashes as MissionDetails[]),
  ...(shadow as MissionDetails[]),
  ...(pet as MissionDetails[]),
  ...(birth as MissionDetails[]),
  ...(vision as MissionDetails[]),
  ...(water as MissionDetails[]),
  ...(stars as MissionDetails[]),
]

// Theme order and display names for the journey overlay (birds = Jules, etc.)
export const THEME_KEYS = [
  'birds',
  'ashes',
  'shadow',
  'pet',
  'birth',
  'vision',
  'water',
  'stars',
] as const

export const THEME_DISPLAY_NAMES: Record<string, string> = {
  birds: 'Jules Learns to Fly',
  ashes: 'Adonis Blazes a Path',
  shadow: 'Mia Battles her Shadows',
  pet: 'Kitz Finds his Love ',
  birth: 'Imani Births the Future',
  vision: 'Mitra Seeks the Truth',
  water: 'Tales Carried on the River',
  stars: 'Written in the Stars',
}

const THEME_ARRAYS: MissionDetails[][] = [
  birds as MissionDetails[],
  ashes as MissionDetails[],
  shadow as MissionDetails[],
  pet as MissionDetails[],
  birth as MissionDetails[],
  vision as MissionDetails[],
  water as MissionDetails[],
  stars as MissionDetails[],
]

export function getMissionsByTheme(): {
  key: string
  displayName: string
  missions: MissionDetails[]
}[] {
  return THEME_KEYS.map((key, i) => ({
    key,
    displayName: THEME_DISPLAY_NAMES[key] || key,
    missions: THEME_ARRAYS[i],
  }))
}

/** Get mission by id; returns undefined if not found or not playable (has no deck). */
export function getMissionById(id: number): MissionDetails | undefined {
  const node = journeyData.find((n) => n.id === id)
  if (node == null || node.deck == null) return undefined
  return node
}

/** Build an AI Deck from a mission's opponent list (for server PvE). */
export function missionToAiDeck(mission: MissionDetails): Deck {
  if (mission.opponent == null) throw new Error('Mission has no opponent')
  return {
    name: 'AI Deck',
    cards: mission.opponent,
    cosmeticSet: {
      avatar: 0,
      border: 0,
      relic: 0,
    },
  }
}
