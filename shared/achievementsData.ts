export interface AchievementMeta {
  title: string
  description: string
  image?: string
  // The progress needed to complete this achievement
  progress?: number
}

export const achievementsMeta: Record<number, AchievementMeta> = {
  0: {
    title: 'Welcome!',
    description: "You've arrived :)",
  },
  1: {
    title: 'Day 2',
    description: 'Log in a second day.',
    image: 'avatar-Imani',
  },
  2: {
    title: 'Day 3',
    description: 'Log in a third day.',
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
  },
  7: {
    title: 'Game Night',
    description: 'Play a PVP match Wednesday between 7-8PM EST.',
    image: 'border-Thorns',
  },
  8: {
    title: 'Getting Started',
    description: 'Play 10 games against the computer.',
    image: 'avatar-Kitz',
    progress: 10,
  },
  9: {
    title: 'Getting Serious',
    description: 'Win 1 game against another player.',
    image: 'avatar-Mia',
  },
}
