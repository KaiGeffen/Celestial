// Settings relating to various timing aspects, based on user's animation speed
import { UserSettings } from './settings'

export class Time {
  // Time for a card to be played from hand to story
  static playCard(): number {
    return 400
  }

  static recapStateMinimum(): number {
    return 1000 / (UserSettings._get('animationSpeed') * 2 + 0.5)
  }

  static recapTween(): number {
    return 500 / (UserSettings._get('animationSpeed') * 2 + 0.5)
  }

  static recapTweenWithPause(): number {
    return 400 / (UserSettings._get('animationSpeed') * 2 + 0.5)
  }

  // How long a hint text takes to fade in
  static hintFade(): number {
    return 500 / (UserSettings._get('animationSpeed') * 2 + 0.5)
  }

  static textSpeed(): number {
    return 15
  }

  static vignetteSpeed(): number {
    return 30
  }

  static builderSlide(): number {
    return 250
  }

  static optionsTabSlide(): number {
    return 250
  }

  // How long an onscreen message lingers
  static onscreenMessage = 2500

  // How fast components flash to draw attention
  static flash = 100

  // How long the avatar emote lasts
  static emote = 1000

  // Time user must pause before hint appears
  static hint = 100

  // Time for the charts to display a new dataset
  static chart = 600

  // Time for menu to open / close
  static menuTransition = 200

  // Stillframes in adventure mode scrolling
  static stillframeScroll = 2000

  // Stillframes in adventure mode fading out
  static stillframeFade = 500

  // On the searching scene, how long between when the avatar swaps
  static avatarSwap = 4000

  // On the searching scene when a match is found, how long for text to fade in/out
  static searchFlash = 500
}
