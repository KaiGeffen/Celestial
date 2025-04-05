export interface StoreItem {
  name: string
  description: string
  cost: number
  imageKey: string
  category: 'Featured' | 'Avatars' | 'Borders' | 'Pets' | 'Cards' | 'Cardbacks'
}

export const STORE_ITEMS: { [key: string]: StoreItem } = {
  ThornBorder: {
    name: 'Thorn Border',
    description:
      'A thorny border that frames your avatar with a dark and mysterious edge.',
    cost: 100,
    imageKey: 'ThornBorder',
    category: 'Borders',
  },
  DandelionRelic: {
    name: 'Dandelion Relic',
    description:
      'A mystical relic infused with the essence of dandelions, bringing fortune to its bearer.',
    cost: 500,
    imageKey: 'DandelionRelic',
    category: 'Featured',
  },
  Butterfly: {
    name: 'Butterfly',
    description:
      'A delicate butterfly companion that follows your cursor with graceful movements.',
    cost: 40,
    imageKey: 'Butterfly',
    category: 'Pets',
  },
  Imani: {
    name: 'Imani',
    description:
      "Unlock the Doula to a New World: Imani!\n\nCore to Imani is the Birth mechanic, which creates a Child in hand that can grow to any size. However, since many of these cards earn no points the round they are played, you must carefully ration out the points that you do have and efficiently sacrifice rounds that you can't win.\n\nOnce you've stabilized, remove your weakest cards with Mine, grow a Child as large as you can, then chain together cheap copies of The Future to finally win.",
    cost: 2000,
    imageKey: 'Imani',
    category: 'Cards',
  },
  JadeCardback: {
    name: 'Jade Cardback',
    description:
      'An elegant cardback design featuring intricate jade patterns that shimmer as cards move.',
    cost: 300,
    imageKey: 'JadeCardback',
    category: 'Cardbacks',
  },
  Jules: {
    name: 'Jules',
    description:
      'A friendly character that brings unique strategic options to your gameplay.',
    cost: 0,
    imageKey: 'Jules',
    category: 'Avatars',
  },
}
