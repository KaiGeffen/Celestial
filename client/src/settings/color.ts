import { USERNAME_AVAILABILITY_PORT } from '../../../shared/network/settings'

// The base colors used throughout this app
const CoreColors: Record<string, number | string> = {
  white: 0xf5f2eb,
  whiteS: '#F5F2EB',

  black: 0x353f4e,
  blackS: '#353F4E',

  gold: 0xfabd5d,
  goldS: '#FABD5D',

  blue: 0x5f99dc,
  blueS: '#5F99DC',

  brown: 0x664930,
  brownS: '#664930',

  grey: 0x555555,
  greyA: 0x555555e0,
  lightGrey: 0x888888,

  backgroundDark: 0xcbc1a8,
  backgroundLight: 0xf5f2eb,

  darken: 0x333333,

  buttonSelected: 0xbcb4b4,
}

// The colors for each component of the app (Ex: Slider)
export const Color: Record<string, any> = {
  // CORE COLORS
  black: CoreColors.black,
  blackS: CoreColors.blackS,
  white: CoreColors.white,
  whiteS: CoreColors.whiteS,
  gold: CoreColors.gold,
  goldS: CoreColors.goldS,
  grey: CoreColors.grey,

  // GENERAL
  header: CoreColors.brown,
  basicText: CoreColors.brownS,
  border: CoreColors.brown,
  outline: CoreColors.gold,
  darken: CoreColors.darken,

  // Backgrounds
  backgroundDark: CoreColors.backgroundDark,
  backgroundLight: CoreColors.backgroundLight,

  // Error messages
  error: CoreColors.whiteS,
  errorBackground: CoreColors.blackS,
  errorStroke: CoreColors.gold,

  // Button
  button: CoreColors.whiteS,
  buttonHighlight: 0xaaaaaa,
  buttonSelected: CoreColors.buttonSelected,
  filterSelected: CoreColors.gold,
  buttonTxtSelected: CoreColors.whiteS,
  textButton: '#817467',

  // Input text
  textboxText: '#ffffff',

  // Line
  line: CoreColors.black,

  // Slider
  sliderTrack: CoreColors.backgroundDark,
  sliderIndicator: CoreColors.gold,

  // Hint text fill and background (What shows when you hover something that has an explanation)
  hintFill: CoreColors.white,
  hintBackground: CoreColors.greyA,

  // TODO Refactor dynamic card displays, remove the background color
  // Card Image
  cardGreyed: CoreColors.lightGrey,
  // The color of either stat if it has been changed
  cardText: CoreColors.goldS,
  cardStatChanged: CoreColors.blueS,
  cardTextBackground: 0x000000,

  // Charts
  radar: CoreColors.goldS,
  bar: CoreColors.brownS + '99',
  barBorder: CoreColors.goldS,

  // SCENES
  // Builder
  cardCount: CoreColors.goldS,

  // Preload
  progressBackground: CoreColors.backgroundDark,
  progressFill: CoreColors.white,
  avatarDeselected: CoreColors.grey,

  // Match
  passText: CoreColors.blackS,
  roundResult: CoreColors.blackS,

  // Adventure
  mapIndicator: CoreColors.blue,

  // Tutorial
  tutorialBackground: '#aace',
  // A translucent background that draws attention to one element on the screen
  focusBackground: CoreColors.grey,

  // TODO Organize
  username: CoreColors.blackS,
  todoScore: CoreColors.blackS,
  todoSubtext: CoreColors.blackS,

  rowHighlight: CoreColors.gold,
}
