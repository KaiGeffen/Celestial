import BackgroundRegion from './backgroundRegion'
import SearchingRegion from './searchingRegion'
import HistoryRegion from './historyRegion'

import OurBoardRegion from './ourBoardRegion'
import OurStacksRegion from './ourStacksRegion'
import TheirBoardRegion from './theirBoardRegion'
import TheirStacksRegion from './theirStacksRegion'
import StoryRegion from './storyRegion'
import BreathRegion from './breathRegion'
import WinsRegion from './scoreRegion'
import * as Overlay from './pileOverlayRegions'
import PassRegion from './passRegion'
import RoundResultRegion from './roundResultRegion'

import MulliganRegion from './mulliganRegion'
import MatchResultsRegion from './matchResults'
import OurAvatarRegion from './ourAvatarRegion'
import TheirAvatarRegion from './theirAvatarRegion'

export default class Regions {
  static Background = BackgroundRegion

  static Searching = SearchingRegion
  static Story = StoryRegion

  static OurAvatar = OurAvatarRegion
  static TheirAvatar = TheirAvatarRegion

  static OurBoard = OurBoardRegion
  static OurStacks = OurStacksRegion
  static TheirBoard = TheirBoardRegion
  static TheirStacks = TheirStacksRegion

  static Breath = BreathRegion
  static Wins = WinsRegion
  static History = HistoryRegion

  static OurDeck = Overlay.OurDeckOverlay
  static TheirDeck = Overlay.TheirDeckOverlay
  static OurDiscard = Overlay.OurDiscardOverlay
  static TheirDiscard = Overlay.TheirDiscardOverlay
  static OurExpended = Overlay.OurExpendedOverlay
  static TheirExpended = Overlay.TheirExpendedOverlay

  static Pass = PassRegion
  static RoundResult = RoundResultRegion

  // Regions for special periods of the game
  static Mulligan = MulliganRegion
  static MatchResults = MatchResultsRegion
}
