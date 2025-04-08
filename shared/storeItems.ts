export interface StoreItem {
  id: number
  name: string
  description: string
  cost: number
  imageKey: string
  category: 'Featured' | 'Avatars' | 'Borders' | 'Pets' | 'Cards' | 'Cardbacks'
}

export const STORE_ITEMS: { [key: string]: StoreItem } = {
  ThornBorder: {
    id: 1,
    name: 'Thorn Border',
    description:
      'A thorny border that frames your avatar with a dark and mysterious edge.',
    cost: 100,
    imageKey: 'ThornBorder',
    category: 'Borders',
  },
  DandelionRelic: {
    id: 2,
    name: 'Dandelion Relic',
    description:
      'A mystical relic infused with the essence of dandelions, bringing fortune to its bearer. Like all things, it ends; blowing its seeds to the wind, and leaving behind a trail of memories.',
    cost: 500,
    imageKey: 'DandelionRelic',
    category: 'Featured',
  },
  Butterfly: {
    id: 3,
    name: 'Butterfly',
    description:
      'A delicate butterfly companion whose graceful movements will bring a touch of elegance to your gameplay.',
    cost: 40,
    imageKey: 'Butterfly',
    category: 'Pets',
  },
  Imani: {
    id: 4,
    name: 'Imani',
    description:
      "Unlock the Doula to a New World: Imani!\n\nCore to Imani is the Birth mechanic, which creates a Child in hand that can grow to any size. However, since many of these cards earn no points the round they are played, you must carefully ration out the points that you do have and efficiently sacrifice rounds that you can't win.\n\nOnce you've stabilized, remove your weakest cards with Mine, grow a Child as large as you can, then chain together cheap copies of The Future to finally win.",
    cost: 2000,
    imageKey: 'Imani',
    category: 'Cards',
  },
  JadeCardback: {
    id: 5,
    name: 'Jade Cardback',
    description:
      'An elegant cardback design featuring intricate jade patterns that shimmer as cards move. Wait that is not true, and also you cannot use this lol. I do not think it looks good but idk.',
    cost: 300,
    imageKey: 'JadeCardback',
    category: 'Cardbacks',
  },
  Jules: {
    id: 6,
    name: 'Jules',
    description:
      'Unlock the Free Spirit: Jules!\n\nJules plays many low-cost birds with Fleeting, that fly away once played. This leaves your deck light as a feather in the late game, making it easy to consistently draw your higher cost cards round after round.\n\nTheir honest and unapologetic nature is reflected in the birds being clearly Visible to your opponent, making it difficult for you to deceive them.',
    cost: 0,
    imageKey: 'Jules',
    category: 'Avatars',
  },
}
