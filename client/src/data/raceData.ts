import { decodeShareableDeckCode } from '../../../shared/codec'

// Race node types
interface RaceBase {
  x: number
  y: number
}

// Type 1: Shows decklist and lets user confirm to set to that deck
interface DeckNode extends RaceBase {
  deck: number[]
}

// Type 2: Starts a match with current deck (PVE)
interface MatchNode extends RaceBase {
  opponent: number[]
}

// Type 3: Shows choice of 3 random cards, click one to replace a card in deck
interface CardChoiceNode extends RaceBase {
  cardChoices?: number // Number of card choices (default 3)
}

// Type 4: Upgrade a card - select a card from deck, then choose from 3 versions
interface UpgradeCardNode extends RaceBase {}

export type raceNode = DeckNode | MatchNode | CardChoiceNode | UpgradeCardNode

// Example race data - you can customize this
export const raceData: raceNode[] = [
  // Type 1: Three deck nodes in a line
  {
    x: 200,
    y: 300,
    deck: [61, 12, 12, 7, 7, 7, 7, 7, 4, 4, 4, 4, 4, 4, 4],
  },
  {
    x: 400,
    y: 300,
    deck: [17, 17, 17, 14, 14, 6, 6, 3, 3, 3, 3, 3, 3, 0, 0],
  },
  {
    x: 600,
    y: 300,
    deck: [1, 1, 1, 1, 1, 1, 19, 19, 19, 19, 68, 68, 68, 35, 35],
  },
  {
    x: 800,
    y: 300,
    deck: [0, 0, 78, 78, 78, 33, 33, 33, 33, 34, 34, 11, 11, 11, 11],
  },
  // Type 2: One match node
  {
    x: 100,
    y: 400,
    opponent: [],
  },
  {
    x: 100,
    y: 500,
    opponent: decodeShareableDeckCode(
      '00500500500502202202200B00B00B00E00E049049033',
    ),
  },
  {
    x: 200,
    y: 500,
    opponent: [56, 65, 65, 12, 12, 7, 7, 7, 7, 4, 4, 4, 4, 4, 4],
  },
  {
    x: 300,
    y: 500,
    opponent: [21, 20, 20, 17, 17, 14, 14, 6, 3, 3, 3, 3, 3, 0, 0],
  },
  {
    x: 400,
    y: 500,
    opponent: [1, 1, 1, 1, 1, 1, 35, 35, 13, 20, 19, 19, 19, 19, 23],
  },
  {
    x: 500,
    y: 500,
    opponent: [0, 0, 4, 4, 28, 33, 33, 33, 33, 34, 34, 11, 11, 11, 71],
  },
  {
    x: 600,
    y: 500,
    opponent: [22, 22, 66, 60, 10, 11, 8, 8, 8, 4, 4, 2, 2, 2, 2],
  },
  {
    x: 700,
    y: 500,
    opponent: [50, 27, 27, 27, 27, 25, 88, 88, 31, 39, 11, 13, 91, 45, 45],
  },
  // Type 3: Card choice node
  {
    x: 1000,
    y: 300,
    cardChoices: 3,
  },
  // Type 4: Upgrade card node
  {
    x: 1000,
    y: 400,
  },
]
