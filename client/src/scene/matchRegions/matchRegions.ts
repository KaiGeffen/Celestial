import SearchingRegion from './searching'
import CommandsRegion from './commands'

import OurHandRegion from './ourHand'
import TheirHandRegion from './theirHand'
import StoryRegion from './story'
import OurScoreRegion from './ourScore'
import TheirScoreRegion from './theirScore'
import * as Overlay from './pileOverlays'
import PassRegion from './pass'
import RoundResultRegion from './roundResult'

import MulliganRegion from './mulliganRegion'
import ResultsRegion from './results'

export default class Regions {
  static Searching = SearchingRegion
  static Commands = CommandsRegion
  static OurHand = OurHandRegion
  static TheirHand = TheirHandRegion
  static Story = StoryRegion
  static OurScore = OurScoreRegion
  static TheirScore = TheirScoreRegion

  static OurDeck = Overlay.OurDeckOverlay
  static TheirDeck = Overlay.TheirDeckOverlay
  static OurDiscard = Overlay.OurDiscardOverlay
  static TheirDiscard = Overlay.TheirDiscardOverlay
  static OurExpended = Overlay.OurExpendedOverlay
  static TheirExpended = Overlay.TheirExpendedOverlay

  static Pass = PassRegion
  static RoundResult = RoundResultRegion

  static Mulligan = MulliganRegion
  static Results = ResultsRegion
}
