export interface LevelData {
  level: number
  expToNext: number
  totalExp: number
}

export interface CharacterUnlock {
  level: number
  item: string
  description: string
}

export const CHARACTER_UNLOCKS: CharacterUnlock[][] = [
  // Jules unlocks
  [
    {
      level: 1,
      item: 'Truth Seeker',
      description: 'A compass that always points toward honesty',
    },
    {
      level: 2,
      item: 'Blank Canvas',
      description: 'A pristine canvas waiting for your story',
    },
    {
      level: 3,
      item: 'Rebirth Phoenix',
      description: 'A phoenix feather that symbolizes new beginnings',
    },
    {
      level: 4,
      item: 'Peace Dove',
      description: 'A white dove that brings inner tranquility',
    },
    {
      level: 5,
      item: 'Sun Crown',
      description: 'A golden crown that radiates warmth and light',
    },
    {
      level: 6,
      item: 'Morning Dew',
      description: 'Crystalline dew drops that sparkle with renewal',
    },
    {
      level: 7,
      item: 'Gamecock Spirit',
      description: 'A fierce spirit that never backs down',
    },
    {
      level: 8,
      item: 'Ecology Web',
      description: 'A web showing how everything is connected',
    },
    {
      level: 9,
      item: 'Freedom Wings',
      description: 'Wings that carry you to new horizons',
    },
    {
      level: 10,
      item: 'Jules Essence',
      description: "The pure essence of Jules's journey",
    },
  ],
  // Adonis unlocks
  [
    {
      level: 1,
      item: 'Fire Spark',
      description: 'A tiny spark that ignites great flames',
    },
    {
      level: 2,
      item: 'Inferno Heart',
      description: 'A heart that burns with passion and destruction',
    },
    {
      level: 3,
      item: 'Ash Phoenix',
      description: 'A phoenix that rises from the ashes',
    },
    {
      level: 4,
      item: 'Life Cling',
      description: 'A vine that clings to life despite the flames',
    },
    {
      level: 5,
      item: 'Drown Crystal',
      description: 'A crystal that holds the power of water',
    },
    {
      level: 6,
      item: 'Mine Gem',
      description: 'A precious gem that defends what is yours',
    },
    {
      level: 7,
      item: 'Parch Stone',
      description: 'A stone that brings drought and heat',
    },
    {
      level: 8,
      item: 'Sprout Seed',
      description: 'A seed that grows from destruction',
    },
    {
      level: 9,
      item: 'Flame Master',
      description: 'Mastery over the destructive power of fire',
    },
    {
      level: 10,
      item: 'Adonis Core',
      description: "The burning core of Adonis's being",
    },
  ],
  // Mia unlocks
  [
    {
      level: 1,
      item: 'Shadow Dagger',
      description: 'A blade that cuts through darkness',
    },
    {
      level: 2,
      item: 'Nightmare Mask',
      description: 'A mask that transforms fear into power',
    },
    {
      level: 3,
      item: 'Prison Key',
      description: 'A key that unlocks the shadows within',
    },
    {
      level: 4,
      item: 'Wing Clippers',
      description: 'Tools that keep you grounded in darkness',
    },
    {
      level: 5,
      item: 'Hungry Ghost',
      description: 'A spirit that feeds on shadows and fear',
    },
    {
      level: 6,
      item: 'Sickness Charm',
      description: 'A charm that teaches through illness',
    },
    {
      level: 7,
      item: 'Boa Embrace',
      description: 'A constricting embrace that brings strength',
    },
    {
      level: 8,
      item: 'Shadow Master',
      description: 'Mastery over the darkness and shadows',
    },
    {
      level: 9,
      item: 'Night Vision',
      description: 'The ability to see clearly in darkness',
    },
    {
      level: 10,
      item: 'Mia Shadow',
      description: 'The pure shadow essence of Mia',
    },
  ],
  // Kitz unlocks
  [
    {
      level: 1,
      item: 'Cat Whiskers',
      description: 'Sensitive whiskers that guide your path',
    },
    {
      level: 2,
      item: 'Companion Bond',
      description: 'A bond that connects you to your pet',
    },
    {
      level: 3,
      item: 'Oak Shelter',
      description: 'A strong shelter that protects your companion',
    },
    {
      level: 4,
      item: 'Gentle Rain',
      description: 'Soft rain that nurtures and heals',
    },
    {
      level: 5,
      item: 'Bounty Hunter',
      description: 'The skills of a successful hunter',
    },
    {
      level: 6,
      item: 'Hollow Heart',
      description: 'A heart that can be filled with love',
    },
    {
      level: 7,
      item: 'Night Vision',
      description: 'Cat eyes that see in the darkness',
    },
    {
      level: 8,
      item: 'Sunflower Spirit',
      description: 'A spirit that turns toward the light',
    },
    {
      level: 9,
      item: 'Pet Guardian',
      description: 'The ultimate guardian of your companion',
    },
    {
      level: 10,
      item: 'Kitz Essence',
      description: "The pure essence of Kitz's love",
    },
  ],
  // Imani unlocks
  [
    {
      level: 1,
      item: 'Birth Candle',
      description: 'A candle that lights the way for new life',
    },
    {
      level: 2,
      item: 'Nascence Crystal',
      description: 'A crystal that holds the spark of creation',
    },
    {
      level: 3,
      item: 'Posterity Scroll',
      description: 'A scroll that preserves future generations',
    },
    {
      level: 4,
      item: 'Birth Miracle',
      description: 'The miracle of bringing life into the world',
    },
    {
      level: 5,
      item: 'Cradle of Hope',
      description: 'A cradle that protects new beginnings',
    },
    {
      level: 6,
      item: 'Future Vision',
      description: 'A vision of the world to come',
    },
    {
      level: 7,
      item: 'Ancestry Chain',
      description: 'A chain that connects to your ancestors',
    },
    {
      level: 8,
      item: 'Rebirth Phoenix',
      description: 'A phoenix that symbolizes transformation',
    },
    {
      level: 9,
      item: 'Doula Master',
      description: 'Mastery of the sacred art of birth',
    },
    {
      level: 10,
      item: 'Imani Spirit',
      description: 'The nurturing spirit of Imani',
    },
  ],
  // Mitra unlocks
  [
    {
      level: 1,
      item: "Seeker's Compass",
      description: 'A compass that guides you to truth',
    },
    {
      level: 2,
      item: 'Clear View Lens',
      description: 'A lens that reveals hidden truths',
    },
    {
      level: 3,
      item: 'Enlightenment Pearl',
      description: 'A pearl that holds ancient wisdom',
    },
    {
      level: 4,
      item: 'Awakening Bell',
      description: 'A bell that awakens consciousness',
    },
    {
      level: 5,
      item: 'Nectar Vial',
      description: 'A vial containing the sweet essence of truth',
    },
    {
      level: 6,
      item: "Conqueror's Crown",
      description: 'A crown earned through wisdom',
    },
    {
      level: 7,
      item: 'Prey Instinct',
      description: 'The instinct to learn from being hunted',
    },
    {
      level: 8,
      item: 'Dawn Light',
      description: 'The first light that breaks through darkness',
    },
    {
      level: 9,
      item: 'Seeker Master',
      description: "Mastery of the seeker's path",
    },
    {
      level: 10,
      item: 'Mitra Wisdom',
      description: 'The accumulated wisdom of Mitra',
    },
  ],
]

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
 * Get unlocks for a character at a specific level
 * @param characterId The character ID (0-5)
 * @param level The level to get unlocks for
 * @returns Array of unlocks for that level
 */
export function getUnlocksForLevel(
  characterId: number,
  level: number,
): CharacterUnlock[] {
  const characterUnlocks = CHARACTER_UNLOCKS[characterId] || []
  return characterUnlocks.filter((unlock) => unlock.level <= level)
}

/**
 * Get the next unlock for a character
 * @param characterId The character ID (0-5)
 * @param currentLevel The current level
 * @returns The next unlock, or null if at max level
 */
export function getNextUnlock(
  characterId: number,
  currentLevel: number,
): CharacterUnlock | null {
  const characterUnlocks = CHARACTER_UNLOCKS[characterId] || []
  return (
    characterUnlocks.find((unlock) => unlock.level === currentLevel + 1) || null
  )
}

/**
 * Get the maximum level
 */
export const MAX_LEVEL = 10

/**
 * Get the maximum experience needed to reach max level
 */
export const MAX_EXP = 10900
