export interface AchievementMeta {
  title: string
  description: string
  image?: string
  // The progress needed to complete this achievement
  progress?: number
  // The cosmetics this unlocks
  iconUnlock?: number
  borderUnlock?: number
}

export const achievementsMeta: Record<number, AchievementMeta> = {
  0: {
    title: 'Welcome!',
    description: "You've arrived :)",
  },
  1: {
    title: 'Day 2',
    description: 'Log in a second day.',
  },
  2: {
    title: 'Day 3',
    description: 'Log in a third day.',
    image: 'avatar-Imani',
    iconUnlock: 4,
  },
  3: {
    title: 'Day 4',
    description: 'Log in a fourth day.',
  },
  4: {
    title: 'Day 5',
    description: 'Log in a fifth day.',
  },
  5: {
    title: 'Day 6',
    description: 'Log in a sixth day.',
  },
  6: {
    title: 'Day 7',
    description: 'Log in a seventh day.',
    image: 'avatar-Mitra',
    iconUnlock: 5,
  },
  7: {
    title: 'Game Night',
    description: 'Play a PVP game Wednesday between 7-9PM EST.',
    image: 'border-Thorns',
    borderUnlock: 1,
  },
  8: {
    title: 'Getting Started',
    description: 'Play 10 games against the computer.',
    image: 'avatar-Kitz',
    progress: 10,
    iconUnlock: 3,
  },
  9: {
    title: 'Getting Serious',
    description: 'Win 1 game against another player.',
    image: 'avatar-Mia',
    iconUnlock: 2,
  },

  // Fun things
  10: {
    title: 'Big Time',
    description: 'Earn at least 20 points in a single round.',
  },
  11: {
    title: 'Bigger Time',
    description: 'Earn at least 30 points in a single round.',
  },
  12: {
    title: 'Letting Go',
    description:
      'End the game with 6 or fewer cards between your deck, discard pile, and hand.',
  },
  13: {
    title: 'Tower of Babel',
    description: 'Have 15 or more cards in your discard pile.',
  },
  14: {
    title: 'Crawl Away',
    description: 'Win a round in which you earn 0 or fewer points.',
  },
  15: {
    title: 'My Love',
    description: 'Hold a card worth 10 or more points in your hand.',
  },
  16: {
    title: 'The Future is Now',
    description: 'Hold The Future in hand with cost 0.',
  },
  17: {
    title: 'All Things',
    description: 'Have Inspired, Nourish, and Vision at the same time.',
  },
  18: {
    title: 'Torrent of Cards',
    description: 'Draw 6 or more cards in a single round.',
  },
  19: {
    title: 'In Awe',
    description: 'Have 15 or more breath.',
  },
  20: {
    title: 'Secret!!!',
    description: 'Coming soon...',
    image: 'border-Grape',
    borderUnlock: 2,
  },
  21: {
    title: 'Also a secret',
    description: 'Coming soon...',
    image: 'border-Shadow',
    borderUnlock: 3,
  },
}
