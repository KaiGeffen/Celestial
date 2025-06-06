import { BasicButton, BigButton } from './basic'
import AvatarButton from './avatar'
import DecklistButton from './decklist'
import TextButton from './text'
import MissionButton from './mission'
import { DeckButton, DiscardButton } from './stacks'
import { InspireButton, NourishButton, SightButton } from './keywords'
import HomeSceneButton from './homeSceneButton'
import Icon from './icon'
import Sun from './sun'
import Moon from './moon'

// Export all of the available buttons
export default class Buttons {
  static Basic = BasicButton
  static Big = BigButton
  static Avatar = AvatarButton
  static Decklist = DecklistButton
  static Text = TextButton
  static Stacks = {
    Deck: DeckButton,
    Discard: DiscardButton,
  }
  static Keywords = {
    Inspire: InspireButton,
    Nourish: NourishButton,
    Sight: SightButton,
  }
  static Mission = MissionButton
  static HomeScene = HomeSceneButton

  static Sun = Sun
  static Moon = Moon
  static Icon = Icon
}
