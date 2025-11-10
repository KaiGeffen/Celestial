import { MAX } from 'uuid'
import { UserSettings } from '../settings/settings'

export interface LevelData {
  level: number
  expToNext: number
  totalExp: number
}

export const LEVEL_PROGRESSION: LevelData[] = [
  { level: 1, expToNext: 100, totalExp: 0 },
  { level: 2, expToNext: 100, totalExp: 100 },
  { level: 3, expToNext: 100, totalExp: 200 },
  { level: 4, expToNext: 200, totalExp: 300 },
  { level: 5, expToNext: 200, totalExp: 500 },
  { level: 6, expToNext: 200, totalExp: 700 },
  { level: 7, expToNext: 300, totalExp: 900 },
  { level: 8, expToNext: 300, totalExp: 1200 },
  { level: 9, expToNext: 300, totalExp: 1500 },
]

export const MAX_LEVEL = LEVEL_PROGRESSION.length

/**
 * Get what level the given character is at
 * @param id The character's ID
 * @returns The level data for the given character
 */
export function getCharacterLevel(id: number): LevelData {
  const exp = UserSettings._get('avatar_experience')[id] || 0

  // Find the highest level where totalExp <= exp
  for (let i = LEVEL_PROGRESSION.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_PROGRESSION[i].totalExp) {
      return LEVEL_PROGRESSION[i]
    }
  }

  // Default to level 1
  return LEVEL_PROGRESSION[0]
}

/**
 * Get the progress toward the next level (0-1)
 * @param id The character's ID
 * @returns Progress as a number between 0 and 1
 */
export function getCharacterLevelProgress(id: number): number {
  const currentLevel = getCharacterLevel(id)
  const nextLevel = LEVEL_PROGRESSION.find(
    (l) => l.level === currentLevel.level + 1,
  )

  if (!nextLevel || currentLevel.level === 10) {
    return 1 // Max level or no next level
  }

  const exp = UserSettings._get('avatar_experience')[id] || 0
  const expInCurrentLevel = exp - currentLevel.totalExp
  const expNeededForNextLevel = nextLevel.totalExp - currentLevel.totalExp

  return expInCurrentLevel / expNeededForNextLevel
}

/**
 * Get experience needed to reach the next level
 * @param id The character's ID
 * @returns Experience needed for next level, or 0 if at max level
 */
export function getCharacterExpToNextLevel(id: number): number {
  const currentLevel = getCharacterLevel(id)
  const nextLevel = LEVEL_PROGRESSION.find(
    (l) => l.level === currentLevel.level + 1,
  )

  if (!nextLevel || currentLevel.level === 10) {
    return 0 // Max level or no next level
  }

  const exp = UserSettings._get('avatar_experience')[id] || 0
  return nextLevel.totalExp - exp
}
