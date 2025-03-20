import SearchingRegion from './searching'
import CommandsRegion from './commands'

import OurHandRegion from './ourHand'
import TheirBoard from './theirHand'
import StoryRegion from './story'
import OurScoreRegion from './ourScore'
import DecksRegion from './decks'
import DiscardPilesRegion from './discardPiles'
import TheirScoreRegion from './theirScore'
import * as Overlay from './pileOverlays'
import PassRegion from './pass'
import RoundResultRegion from './roundResult'

import MulliganRegion from './mulliganRegion'
import ResultsRegion from './results'
import TheirAvatarRegion from './theirAvatar'
import OurAvatarRegion from './ourAvatar'

export default class Regions {
  static Searching = SearchingRegion
  static Commands = CommandsRegion
  static OurHand = OurHandRegion
  static TheirBoard = TheirBoard
  static Story = StoryRegion
  static OurScore = OurScoreRegion
  static TheirScore = TheirScoreRegion
  static Decks = DecksRegion
  static DiscardPiles = DiscardPilesRegion

  static TheirAvatar = TheirAvatarRegion
  static OurAvatar = OurAvatarRegion

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
