import { Deck } from '../../../shared/types/deck'
import Server from '../server'

/*
  Serves user a random deck based on their elo
*/

const easyDecks: Deck[] = [
  {
    name: 'Birds easy',
    cards: [4, 4, 4, 4, 4, 59, 59, 59, 33, 33, 33, 7, 7, 12, 12],
    cosmeticSet: {
      avatar: 0,
      border: 0,
    },
  },
  {
    name: 'Ashes easy',
    cards: [0, 3, 3, 3, 3, 3, 3, 15, 15, 15, 14, 14, 14, 17, 17],
    cosmeticSet: {
      avatar: 1,
      border: 0,
    },
  },
  {
    name: 'Shadow easy',
    cards: [0, 1, 1, 5, 5, 5, 31, 31, 11, 11, 11, 13, 13, 57, 57],
    cosmeticSet: {
      avatar: 2,
      border: 0,
    },
  },
  {
    name: 'Pet easy',
    cards: [4, 4, 78, 78, 78, 78, 33, 33, 33, 34, 34, 11, 11, 11, 52],
    cosmeticSet: {
      avatar: 3,
      border: 0,
    },
  },
  {
    name: 'Birth easy',
    cards: [83, 83, 83, 83, 83, 8, 8, 8, 86, 86, 60, 60, 60, 53, 53],
    cosmeticSet: {
      avatar: 4,
      border: 0,
    },
  },
  {
    name: 'Vision easy',
    cards: [50, 50, 25, 25, 25, 25, 89, 89, 89, 39, 39, 39, 66, 66, 52],
    cosmeticSet: {
      avatar: 5,
      border: 0,
    },
  },
]

const mediumDecks: Deck[] = [
  {
    name: 'Birds medium',
    cards: [4, 4, 4, 4, 4, 4, 7, 7, 7, 7, 101, 101, 12, 51, 51],
    cosmeticSet: {
      avatar: 0,
      border: 0,
    },
  },
  {
    name: 'Ashes medium',
    cards: [0, 0, 3, 3, 3, 3, 6, 6, 12, 14, 14, 14, 17, 17, 21],
    cosmeticSet: {
      avatar: 1,
      border: 0,
    },
  },
  {
    name: 'Shadow medium',
    cards: [76, 1, 1, 1, 1, 78, 78, 31, 31, 35, 35, 13, 13, 19, 19],
    cosmeticSet: {
      avatar: 2,
      border: 0,
    },
  },
  {
    name: 'Pet medium',
    cards: [0, 4, 4, 4, 4, 33, 33, 33, 34, 34, 11, 11, 11, 52, 23],
    cosmeticSet: {
      avatar: 3,
      border: 0,
    },
  },
  {
    name: 'Birth medium',
    cards: [2, 2, 105, 105, 105, 8, 8, 8, 8, 60, 60, 11, 11, 66, 66],
    cosmeticSet: {
      avatar: 4,
      border: 0,
    },
  },
  {
    name: 'Vision medium',
    cards: [50, 27, 27, 25, 25, 88, 88, 39, 39, 39, 53, 67, 67, 67, 91],
    cosmeticSet: {
      avatar: 5,
      border: 0,
    },
  },
]

const hardDecks: Deck[] = [
  {
    name: 'Birds hard',
    cards: [56, 65, 96, 51, 12, 12, 7, 7, 7, 4, 4, 4, 4, 4, 4],
    cosmeticSet: {
      avatar: 0,
      border: 0,
    },
  },
  {
    name: 'Ashes hard',
    cards: [21, 20, 20, 17, 17, 14, 14, 6, 3, 3, 3, 3, 3, 0, 0],
    cosmeticSet: {
      avatar: 1,
      border: 0,
    },
  },
  {
    name: 'Shadow hard',
    cards: [1, 1, 1, 1, 63, 6, 6, 43, 35, 35, 20, 19, 19, 19, 23],
    cosmeticSet: {
      avatar: 2,
      border: 0,
    },
  },
  {
    name: 'Pet hard',
    cards: [71, 11, 11, 11, 11, 34, 34, 33, 33, 33, 4, 28, 28, 28, 0],
    cosmeticSet: {
      avatar: 3,
      border: 0,
    },
  },
  {
    name: 'Birth hard',
    cards: [22, 22, 15, 60, 10, 11, 8, 8, 8, 4, 4, 2, 2, 2, 2],
    cosmeticSet: {
      avatar: 4,
      border: 0,
    },
  },
  {
    name: 'Vision hard',
    cards: [50, 27, 27, 27, 27, 25, 88, 88, 31, 39, 11, 13, 91, 45, 45],
    cosmeticSet: {
      avatar: 5,
      border: 0,
    },
  },
]

/** Difficulty from PvE wins: 0–4 easy, 5–14 medium, 15+ hard */
function difficultyFromPveWins(pveWins: number): 0 | 1 | 2 {
  if (pveWins < 10) return 0
  if (pveWins < 20) return 1
  return 2
}

export default function getRandomAiDeck(): Deck {
  const userData = Server.getUserData()
  const pveWins = userData?.pveWins ?? 0
  const difficulty = difficultyFromPveWins(pveWins)
  const decks =
    difficulty === 0 ? easyDecks : difficulty === 1 ? mediumDecks : hardDecks
  return decks[Math.floor(Math.random() * decks.length)]
}
