// The depth of each layer in the match scene
export const Depth: Record<string, number> = {
  storyAtDay: 0,

  theirHand: 1,
  storyAtNight: 2,
  statusIcons: 3,

  mulligan: 4,

  ourHand: 5,

  // Above all other layers with cards
  aboveOtherCards: 6,

  tutorial: 7,

  pileOverlays: 8,

  searching: 9,
  roundResult: 9,

  results: 10,
}
