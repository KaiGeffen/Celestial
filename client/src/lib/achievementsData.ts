export interface AchievementMeta {
  title: string
  description: string
  image: string
  // The progress needed to complete this achievement
  progress?: number
}

export const achievementsMeta: Record<number, AchievementMeta> = {
  0: {
    title: 'First Steps',
    description: 'Log in for the first time.',
    image: 'avatar-Jules',
  },
  1: {
    title: 'Daily Devotee',
    description: 'Log in two days in a row.',
    image: 'avatar-Jules',
    progress: 4,
  },
  2: {
    title: 'Threepeat',
    description: 'Log in three days in a row.',
    image: 'avatar-Mia',
  },
}
