import SearchingRegion from './searching'
import TheirScoreRegion from './theirScore'

import OurBoardRegion from './ourBoard'
import TheirBoardRegion from './theirBoard'
import StoryRegion from './story'
import OurScoreRegion from './ourScore'
import * as Overlay from './pileOverlays'
import PassRegion from './pass'
import RoundResultRegion from './roundResult'

import MulliganRegion from './mulliganRegion'
import ResultsRegion from './results'
import OurAvatarRegion from './ourAvatar'
import TheirAvatarRegion from './theirAvatar'

export default class Regions {
  static Searching = SearchingRegion
  static Commands = TheirScoreRegion
  static OurBoard = OurBoardRegion
  static TheirBoard = TheirBoardRegion
  static Story = StoryRegion
  static OurScore = OurScoreRegion
  static TheirScore = TheirScoreRegion

  static OurAvatar = OurAvatarRegion
  static TheirAvatar = TheirAvatarRegion

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
