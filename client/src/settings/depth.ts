// The depth of each layer in the match scene
export const Depth: Record<string, number> = {
  discardPiles: -1,

  ourHand: 1,
  theirHand: 1,
  storyAtDay: 2,
  storyAtNight: 3,
  ourScore: 4,
  theirScore: 4,
  mulligan: 5,

  // Above all other layers with cards
  aboveOtherCards: 6,

  commands: 7,
  tutorial: 7,
  pileOverlays: 8,
  searching: 9,
  roundResult: 9,
  results: 10,
}
