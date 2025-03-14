import SearchingRegion from './searching'
import CommandsRegion from './commands'

import OurAvatarRegion from './ourAvatar'
import TheirAvatarRegion from './theirAvatar'

import OurHandRegion from './ourHand'
import StoryRegion from './story'
import OurScoreRegion from './ourScore'
import * as Overlay from './pileOverlays'
import PassRegion from './pass'
import RoundResultRegion from './roundResult'

import MulliganRegion from './mulliganRegion'
import ResultsRegion from './results'
import ScoreboardRegion from './scoreboard'

export default class Regions {
  static Searching = SearchingRegion
  static Commands = CommandsRegion

  static OurAvatar = OurAvatarRegion
  static TheirAvatar = TheirAvatarRegion

  static OurHand = OurHandRegion
  static Story = StoryRegion
  static OurScore = OurScoreRegion

  static OurDeck = Overlay.OurDeckOverlay
  static TheirDeck = Overlay.TheirDeckOverlay
  static OurDiscard = Overlay.OurDiscardOverlay
  static TheirDiscard = Overlay.TheirDiscardOverlay
  static OurExpended = Overlay.OurExpendedOverlay
  static TheirExpended = Overlay.TheirExpendedOverlay

  static Pass = PassRegion
  static RoundResult = RoundResultRegion
  static Scoreboard = ScoreboardRegion

  static Mulligan = MulliganRegion
  static Results = ResultsRegion
}
