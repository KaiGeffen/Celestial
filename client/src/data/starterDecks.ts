import { Deck } from '@shared/types/deck'

export interface StarterDeck extends Deck {
  // Shown in the Play menu when the equipped deck's cards exactly match this one
  explainer: string
}

// The default decks a new account starts with (see userSettings.ts)
const starterDecks: StarterDeck[] = [
  {
    name: 'The Pathless Path',
    cards: [50, 27, 27, 27, 27, 25, 88, 88, 31, 39, 11, 13, 91, 45, 45],
    cosmeticSet: {
      avatar: 5,
      border: 0,
    },
    explainer: `Gain Sight of your opponent's cards to know which of your cards is right to play that round, and make informed decisions about what will happen next.`,
  },
  {
    name: 'Kith and Kin',
    cards: [22, 22, 66, 60, 10, 11, 8, 8, 8, 4, 4, 2, 2, 2, 2],
    cosmeticSet: {
      avatar: 4,
      border: 0,
    },
    explainer: `Raise a Child with the Birth mechanic, making The Future much cheaper. Find the right times to play the Child for points.`,
  },
  {
    name: 'Lovesick Cats',
    cards: [0, 0, 4, 4, 4, 33, 33, 33, 33, 34, 34, 11, 11, 11, 71],
    cosmeticSet: {
      avatar: 3,
      border: 0,
    },
    explainer: `It's all about her! Use the Nourish from Fruit to boost up your Pet, then use Hold Tight right after to get her back.`,
  },
  {
    name: 'Lost in Shadow',
    cards: [1, 1, 1, 1, 1, 1, 35, 35, 13, 20, 19, 19, 19, 19, 23],
    cosmeticSet: {
      avatar: 2,
      border: 0,
    },
    explainer:
      "Attack your opponent's hand with Daggers, then play Hurricane and Shadows as let in the round as possible to use them to their fullest.",
  },
  {
    name: 'Path of Ambition',
    cards: [21, 20, 20, 17, 17, 14, 14, 6, 3, 3, 3, 3, 3, 0, 0],
    cosmeticSet: {
      avatar: 1,
      border: 0,
    },
    explainer:
      'Fill up your discard pile with Ashes to empower cards like Veteran and Death, then use Cling to save you from shuffling.',
  },
  {
    name: 'A Simple Dream',
    cards: [0, 9, 61, 12, 12, 7, 7, 7, 7, 4, 4, 4, 4, 4, 4],
    cosmeticSet: {
      avatar: 0,
      border: 0,
    },
    explainer: `Play cheap Fleeting cards early, which remove themselves from the game so that you only draw impactful cards in the late game.`,
  },
]

export default starterDecks

// Whether two card-id lists contain exactly the same cards (order-independent)
function sameCards(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort((x, y) => x - y)
  const sortedB = [...b].sort((x, y) => x - y)
  return sortedA.every((id, i) => id === sortedB[i])
}

// The starter deck whose cards exactly match the given list, if any
export function findMatchingStarterDeck(
  cardIds: number[],
): StarterDeck | undefined {
  return starterDecks.find((deck) => sameCards(deck.cards, cardIds))
}
