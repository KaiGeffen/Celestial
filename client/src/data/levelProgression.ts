export interface LevelData {
  level: number
  expToNext: number
  totalExp: number
}

export const LEVEL_PROGRESSION: LevelData[] = [
  { level: 1, expToNext: 100, totalExp: 0 },
  { level: 2, expToNext: 200, totalExp: 100 },
  { level: 3, expToNext: 300, totalExp: 300 },
  { level: 4, expToNext: 500, totalExp: 600 },
  { level: 5, expToNext: 800, totalExp: 1100 },
  { level: 6, expToNext: 1200, totalExp: 1900 },
  { level: 7, expToNext: 1800, totalExp: 3100 },
  { level: 8, expToNext: 2500, totalExp: 4900 },
  { level: 9, expToNext: 3500, totalExp: 7400 },
  { level: 10, expToNext: 0, totalExp: 10900 }, // MAX level
]

/**
 * Get the level data for a given experience amount
 * @param exp The total experience points
 * @returns The level data for the given experience
 */
export function getLevelFromExp(exp: number): LevelData {
  // Find the highest level where totalExp <= exp
  for (let i = LEVEL_PROGRESSION.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_PROGRESSION[i].totalExp) {
      return LEVEL_PROGRESSION[i]
    }
  }
  return LEVEL_PROGRESSION[0] // Fallback to level 1
}

/**
 * Get the progress toward the next level (0-1)
 * @param exp The total experience points
 * @returns Progress as a number between 0 and 1
 */
export function getLevelProgress(exp: number): number {
  const currentLevel = getLevelFromExp(exp)
  const nextLevel = LEVEL_PROGRESSION.find(
    (l) => l.level === currentLevel.level + 1,
  )

  if (!nextLevel || currentLevel.level === 10) {
    return 1 // Max level or no next level
  }

  const expInCurrentLevel = exp - currentLevel.totalExp
  const expNeededForNextLevel = nextLevel.totalExp - currentLevel.totalExp

  return expInCurrentLevel / expNeededForNextLevel
}

/**
 * Get experience needed to reach the next level
 * @param exp The total experience points
 * @returns Experience needed for next level, or 0 if at max level
 */
export function getExpToNextLevel(exp: number): number {
  const currentLevel = getLevelFromExp(exp)
  const nextLevel = LEVEL_PROGRESSION.find(
    (l) => l.level === currentLevel.level + 1,
  )

  if (!nextLevel || currentLevel.level === 10) {
    return 0 // Max level or no next level
  }

  return nextLevel.totalExp - exp
}

/**
 * Get the maximum level
 */
export const MAX_LEVEL = 10

/**
 * Get the maximum experience needed to reach max level
 */
export const MAX_EXP = 10900
