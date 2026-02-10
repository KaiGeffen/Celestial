import birds from './birds.json'
import ashes from './ashes.json'
import shadow from './shadow.json'
import pet from './pet.json'
import birth from './birth.json'
import vision from './vision.json'
import water from './water.json'

export const journeyData: journeyNode[] = [
  ...birds,
  ...ashes,
  ...shadow,
  ...pet,
  ...birth,
  ...vision,
  ...water,
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

const THEME_ARRAYS: journeyNode[][] = [
  birds,
  ashes,
  shadow,
  pet,
  birth,
  vision,
  water,
]

export function getMissionsByTheme(): {
  key: string
  displayName: string
  missions: journeyNode[]
}[] {
  return THEME_KEYS.map((key, i) => ({
    key,
    displayName: THEME_DISPLAY_NAMES[key] || key,
    missions: THEME_ARRAYS[i],
  }))
}

// Base interface with common properties
interface JourneyBase {
  name: string
  x: number
  y: number
  id: number
  prereq: number[][]
}

interface MissionNode extends JourneyBase {
  deck: number[]
  opponent: number[]
  storyTitle?: string
  storyText?: string
}

interface CardNode extends JourneyBase {
  card: number
}

interface TipNode extends JourneyBase {
  tip: string
}

// Journey is the union of all node types
export type journeyNode = MissionNode | CardNode | TipNode
