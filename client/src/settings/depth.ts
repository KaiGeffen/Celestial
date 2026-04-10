// The depth of each layer in the match scene
export const Depth: Record<string, number> = {
  discardPiles: -1,

  theirAvatar: 1,
  ourAvatar: 1,
  storyAtDay: 0,
  /** Inspire / Nourish / Sight; below {@link ourHand} / {@link theirHand}. */
  matchStatus: 0,
  ourHand: 5,
  theirHand: 1,
  storyAtNight: 2,
  ourScore: 3,
  /** Decorative chrome behind match win counts (see `WinsChromeRegion`). */
  winsChrome: 3,
  matchPlaybackControls: 3,
  mulligan: 4,
  pass: 5,

  // Above all other layers with cards
  aboveOtherCards: 6,

  tutorial: 7,
  pileOverlays: 8,
  searching: 9,
  roundResult: 9,
  results: 10,
}
