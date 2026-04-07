import SearchingRegion from './searching'
import TheirScoreRegion from './theirScore'
import MatchPlaybackControlsRegion from './matchPlaybackControlsRegion'

import OurBoardRegion from './ourBoard'
import OurStacksRegion from './ourStacks'
import TheirBoardRegion from './theirBoard'
import TheirStacksRegion from './theirStacks'
import StoryRegion from './story'
import OurScoreRegion from './ourScore'
import WinsRegion from './scoreRegion'
import * as Overlay from './pileOverlays'
import PassRegion from './pass'
import RoundResultRegion from './roundResult'

import MulliganRegion from './mulliganRegion'
import MatchResultsRegion from './matchResults'
import OurAvatarRegion from './ourAvatar'
import TheirAvatarRegion from './theirAvatar'

export default class Regions {
  static Searching = SearchingRegion
  static Story = StoryRegion

  // Avatars and associated statuses
  static OurAvatar = OurAvatarRegion
  static TheirAvatar = TheirAvatarRegion

  // The cards in our / their hands
  static OurBoard = OurBoardRegion
  static OurStacks = OurStacksRegion
  static TheirBoard = TheirBoardRegion
  static TheirStacks = TheirStacksRegion

  // Regions for the scores (Right-side showing wins etc)
  static OurScore = OurScoreRegion
  static TheirScore = TheirScoreRegion
  static Wins = WinsRegion
  static MatchPlaybackControls = MatchPlaybackControlsRegion

  // Overlays of the stacks
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
