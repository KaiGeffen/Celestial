import birds from './birds.json'
import ashes from './ashes.json'
import shadow from './shadow.json'
import pet from './pet.json'
import birth from './birth.json'
import vision from './vision.json'
import water from './water.json'
import { Deck } from '../types/deck'

export const journeyData: JourneyNode[] = [
  ...(birds as JourneyNode[]),
  ...(ashes as JourneyNode[]),
  ...(shadow as JourneyNode[]),
  ...(pet as JourneyNode[]),
  ...(birth as JourneyNode[]),
  ...(vision as JourneyNode[]),
  ...(water as JourneyNode[]),
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
] as const

export const THEME_DISPLAY_NAMES: Record<string, string> = {
  birds: 'Jules Learns to Fly',
  ashes: 'Adonis Blazes a Path',
  shadow: 'Mia Battles her Shadows',
  pet: 'Kitz Finds his Love ',
  birth: 'Imani Births the Future',
  vision: 'Mitra Seeks the Truth',
  water: 'Tales Carried on the Rivers',
}

const THEME_ARRAYS: JourneyNode[][] = [
  birds as JourneyNode[],
  ashes as JourneyNode[],
  shadow as JourneyNode[],
  pet as JourneyNode[],
  birth as JourneyNode[],
  vision as JourneyNode[],
  water as JourneyNode[],
]

export function getMissionsByTheme(): {
  key: string
  displayName: string
  missions: JourneyNode[]
}[] {
  return THEME_KEYS.map((key, i) => ({
    key,
    displayName: THEME_DISPLAY_NAMES[key] || key,
    missions: THEME_ARRAYS[i],
  }))
}

/** Get mission by id; returns undefined if not found or not a mission node (has no deck). */
export function getMissionById(id: number): MissionNode | undefined {
  const node = journeyData.find((n) => n.id === id)
  if (node == null || !('deck' in node)) return undefined
  return node as MissionNode
}

/** Build an AI Deck from a mission's opponent list (for server PvE). */
export function missionToAiDeck(mission: MissionNode): Deck {
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

// Base interface with common properties
interface JourneyBase {
  name: string
  x: number
  y: number
  id: number
  prereq: number[][]
}

export interface MissionNode extends JourneyBase {
  deck: number[]
  opponent: number[]
  storyTitle?: string
  storyText?: string
  cards?: number[]
}

interface TipNode extends JourneyBase {
  tip: string
}

// Journey is the union of all node types (no card nodes; missions unlock cards via .cards)
export type JourneyNode = MissionNode | TipNode
