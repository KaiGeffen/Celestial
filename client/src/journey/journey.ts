// TODO Delete this and this dir

import birds from './birds.json'
import ashes from './ashes.json'
import shadow from './shadow.json'
import pet from './pet.json'
import birth from './birth.json'
import vision from './vision.json'
import water from './water.json'

import intro from './intro.json'

export const journeyData: journeyNode[] = [
  ...intro,
  ...birds,
  ...ashes,
  ...shadow,
  ...pet,
  ...birth,
  ...vision,
  ...water,
]

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
