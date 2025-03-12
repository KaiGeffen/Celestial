// Settings for functional aspects of the game
export class MechanicsSettings {
  static readonly DECK_SIZE = 15
  static readonly NUM_MULLIGANS = 3

  static readonly DRAW_PER_TURN = 2
  static readonly START_HAND = 3
  static readonly HAND_CAP = 6

  static readonly BREATH_GAIN_PER_TURN = 1
  static readonly START_BREATH = 1
  static readonly BREATH_CAP = 10

  static readonly TIMER_START = 4000 // 2 minutes
  static readonly TIMER_RECOUP = 10000 // 10 seconds

  // The code to communicate passing, TODO is this a mechanic
  static readonly PASS = 10
}

// Information about the decklists
export class DecklistSettings {
  static readonly MAX_DECK_NAME_LENGTH = 20
  static readonly MAX_DECKS = 50
}

export type Mulligan = [boolean, boolean, boolean]

export const TUTORIAL_LENGTH = 3
