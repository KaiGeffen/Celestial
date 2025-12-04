export interface AchievementMeta {
  title: string
  description: string
  image?: string
  // The progress needed to complete this achievement
  progress?: number
  // The cosmetics this unlocks
  iconUnlock?: number
  borderUnlock?: number
  goldReward?: number
}

export const achievementsMeta: Record<number, AchievementMeta> = {
  0: {
    title: 'Welcome!',
    description: "You've arrived :)",
    goldReward: 200,
  },
  1: {
    title: 'Day 2',
    description: 'Log in a second day.',
    goldReward: 200,
  },
  2: {
    title: 'Day 3',
    description: 'Log in a third day.',
    goldReward: 200,
  },
  3: {
    title: 'Day 4',
    description: 'Log in a fourth day.',
    goldReward: 300,
  },
  4: {
    title: 'Day 5',
    description: 'Log in a fifth day.',
    goldReward: 200,
  },
  5: {
    title: 'Day 6',
    description: 'Log in a sixth day.',
    goldReward: 200,
  },
  6: {
    title: 'Day 7',
    description: 'Log in a seventh day.',
    goldReward: 700,
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
    progress: 10,
    goldReward: 400,
  },
  9: {
    title: 'Getting Serious',
    description: 'Win 1 game against another player.',
    goldReward: 200,
  },

  // Fun things
  10: {
    title: 'Big Time',
    description: 'Earn at least 20 points in a single round.',
    goldReward: 200,
  },
  11: {
    title: 'Bigger Time',
    description: 'Earn at least 30 points in a single round.',
    goldReward: 300,
  },
  12: {
    title: 'Letting Go',
    description:
      'End the game with 6 or fewer cards between your deck, discard pile, and hand.',
    goldReward: 200,
  },
  13: {
    title: 'Tower of Babel',
    description: 'Have 15 or more cards in your discard pile.',
    goldReward: 200,
  },
  14: {
    title: 'Crawl Away',
    description: 'Win a round in which you earn 0 or fewer points.',
    goldReward: 200,
  },
  15: {
    title: 'My Love',
    description: 'Hold a card worth 10 or more points in your hand.',
    goldReward: 200,
  },
  16: {
    title: 'The Future is Now',
    description: 'Hold The Future in hand with cost 0.',
    goldReward: 300,
  },
  17: {
    title: 'All Things',
    description: 'Have Inspired, Nourish, and Vision at the same time.',
    goldReward: 300,
  },
  18: {
    title: 'Torrent of Cards',
    description: 'Draw 6 or more cards in a single round.',
    goldReward: 300,
  },
  19: {
    title: 'In Awe',
    description: 'Have 15 or more breath.',
    goldReward: 300,
  },
  20: {
    title: 'An Epic',
    description: 'Have 8 or more cards in the story.',
    goldReward: 400,
  },

  // Manually unlocked
  1001: {
    title: 'Secret Garden',
    description: 'A special prize for those who seek it...',
    image: 'border-Grape',
    borderUnlock: 2,
  },
  1002: {
    title: 'Grasping Shadows',
    description: 'Terrifying. Who knows where it comes from?',
    image: 'border-Shadow',
    borderUnlock: 3,
  },
  1003: {
    title: 'Community',
    description: 'Access the Discord server.',
    goldReward: 7500,
  },
  1004: {
    title: 'Birds Border',
    description: 'Let go',
    image: 'border-Birds',
    borderUnlock: 4,
  },
  1005: {
    title: 'Ashes Border',
    description: 'It all burns down',
    image: 'border-Ashes',
    borderUnlock: 5,
  },
  1006: {
    title: 'Birth Border',
    description: 'Ancestor above watch over me',
    image: 'border-Birth',
    borderUnlock: 6,
  },
  1007: {
    title: 'Vision Border',
    description: 'All four season',
    image: 'border-Vision',
    borderUnlock: 7,
  },
  1008: {
    title: 'Water Border',
    description: 'Splash!',
    image: 'border-Water',
    borderUnlock: 8,
  },
  1009: {
    title: 'Stars Border',
    description: 'The constellations',
    image: 'border-Stars',
    borderUnlock: 9,
  },
}
