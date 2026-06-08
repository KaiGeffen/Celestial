// Settings relating to styles of text or bbcode throughout the app
import 'phaser'
import { Space, Color, Flags } from './settings'

// TODO Deprecate
const mainFont = 'Mulish'
const altFont = 'Cinzel'
const cardTextFont = 'Cinzel'

// The only fonts used
const primaryFont = 'Typey McTypeface'
const secondaryFont = 'Berylium'
const sansFont = 'Mulish'

// Font sizes
const largeSize = 40
const size: Record<string, string> = {
  standard: '24px',
  large: largeSize + 'px',
}

// Home screen announcement width
const ANNOUNCEMENT_WIDTH = 500

type StyleDict = Record<string, Phaser.Types.GameObjects.Text.TextStyle>

// General / used everywhere
const StyleGeneral: StyleDict = {
  basic: {
    fontFamily: sansFont,
    fontSize: size.standard,
    color: Color.basicText,
    wordWrap: { width: Space.maxTextWidth },
  },
  /** Status row value numbers — no `wordWrap` so measured width matches the glyph run (for scale-to-fit). */
  statusKeywordValue: {
    fontFamily: sansFont,
    fontSize: size.standard,
    color: Color.basicText,
  },
  basicStylized: {
    fontFamily: secondaryFont,
    fontSize: size.standard,
    color: Color.basicText,
    wordWrap: { width: Space.maxTextWidth },
  },
  // Header for menus, sizers, etc
  header: {
    fontFamily: primaryFont,
    fontSize: size.large,
    color: Color.header,
    stroke: Color.blackS,
    strokeThickness: 1,
  },

  // Text on basic buttons
  button: {
    fontFamily: secondaryFont,
    fontSize: '20px',
    color: '#58291b',
    stroke: '#1e0502',
    strokeThickness: 1,
  },
  // Text for the buttons that are just text
  textButton: {
    fontFamily: sansFont,
    fontSize: size.standard,
    color: Color.textButton,
    stroke: Color.blackS,
    strokeThickness: 1,
  },

  // Input text fields
  inputText: {
    fontFamily: sansFont,
    fontSize: size.standard,
    color: Color.textboxText,
  },

  // Deck thumbnail nameplate
  deckThumbnail: {
    fontFamily: secondaryFont,
    fontSize: size.standard,
    color: Color.basicText,
    fontStyle: 'Bold',
    stroke: Color.whiteS,
    strokeThickness: 1,
  },

  // Count of a card in the deck
  cutoutCardCount: {
    fontFamily: sansFont,
    fontSize: size.standard,
    color: Color.cardCount,
    stroke: '#0009',
    strokeThickness: 3,
  },

  // Any place where header text appears over a dark background
  announcementOverBlack: {
    fontFamily: secondaryFont,
    fontSize: size.large,
    color: Color.whiteS,
    stroke: Color.blackS,
    strokeThickness: 2,
  },

  // Subtitle row in all places
  subtitle: {
    fontFamily: sansFont,
    fontSize: '18px',
    color: Color.whiteS,
    stroke: Color.darkUmberS,
    strokeThickness: 1,
  },

  // FPS counter in debug mode
  fps: {
    fontFamily: sansFont,
    fontSize: '16px',
    color: '#009900',
  },

  // Error text that appears in the center of the screen
  error: {
    fontFamily: mainFont,
    fontSize: size.large,
    color: Color.error,
  },

  // Deck thumbnails: card count on invalid-deck badge (white on red bar)
  thumbnailInvalidCount: {
    fontFamily: sansFont,
    fontSize: '13px',
    color: Color.whiteS,
  },
}

// Used on cards
const StyleCards: StyleDict = {
  cardTitle: {
    fontFamily: altFont,
    fontSize: '20px',
    color: Color.cardText,
    stroke: '#000000',
    strokeThickness: 1,
  },
}

const StyleMatch: StyleDict = {
  // Count of cards in each stack (deck, discard)
  stackCountButton: {
    fontFamily: primaryFont,
    fontStyle: 'Bold',
    fontSize: size.standard,
    color: Color.whiteS,
    stroke: Color.darkUmberS,
    strokeThickness: 4,
  },

  // Numbers on the breath wheel in match
  breathWheel: {
    fontFamily: primaryFont,
    fontStyle: 'Bold',
    fontSize: '30px',
    color: Color.blackS,
  },

  // PASS REGION
  sun: {
    fontFamily: secondaryFont,
    fontSize: '36px',
    color: Color.passText,
  },
  moonPoints: {
    fontFamily: secondaryFont,
    fontSize: '48px',
    color: Color.passText,
    stroke: Color.backgroundLightS,
    strokeThickness: 2,
  },
  // The action that the moon is expressing instead of the points
  moonAction: {
    fontFamily: secondaryFont,
    fontSize: '36px',
    color: Color.passText,
    stroke: Color.backgroundLightS,
    strokeThickness: 2,
  },
  cloud: {
    fontFamily: secondaryFont,
    fontSize: size.standard,
    color: Color.passText,
    stroke: '#fff',
    strokeThickness: 2,
  },

  // In-match avatar nameplate rows
  matchUsername: {
    fontFamily: primaryFont,
    fontSize: size.standard,
    color: Color.whiteS,
    stroke: Color.darkUmberS,
    strokeThickness: 2,
  },
  matchTime: {
    fontFamily: sansFont,
    fontSize: '16px',
    color: Color.whiteS,
    stroke: '#000000',
    strokeThickness: 1.5,
  },
}

const StyleHome: StyleDict = {
  username: {
    fontFamily: primaryFont,
    fontStyle: 'Bold',
    fontSize: '20px',
    color: Color.whiteS,
    stroke: Color.darkUmberS,
    strokeThickness: 3,
    align: 'center',
  },
  usernameLarge: {
    fontFamily: primaryFont,
    fontStyle: 'Bold',
    fontSize: '30px',
    color: Color.whiteS,
    stroke: Color.darkUmberS,
    strokeThickness: 3,
    align: 'center',
  },
  // Subheader (Copy in BBStyle)
  announcementSubheader: {
    fontFamily: primaryFont,
    fontSize: size.standard,
    color: Color.darkUmberS,
    wordWrap: { width: ANNOUNCEMENT_WIDTH },
    align: 'center',
  },
}

const StyleJourney: StyleDict = {
  // Chapter story popup (journeyScene chapterMessage menu)
  chapterHeader: {
    fontFamily: primaryFont,
    fontStyle: 'italic',
    fontSize: size.large,
    color: Color.darkUmberS,
  },
  chapterBody: {
    fontFamily: secondaryFont,
    // fontStyle: 'italic',
    fontSize: '22px',
    color: Color.darkUmberS,
  },
  // Journey scene overlay header / navigation arrows
  journeyOverlay: {
    fontFamily: altFont,
    fontSize: size.large,
    color: Color.whiteS,
    stroke: Color.goldS,
    strokeThickness: 3,
    shadow: {
      offsetX: 2,
      offsetY: 2,
      color: 'rgba(0,0,0,0.5)',
      blur: 4,
      fill: true,
    },
  },
  // Locked deck label in journey
  journeyLocked: {
    fontFamily: sansFont,
    fontSize: '16px',
    color: Color.greyS,
    wordWrap: { width: Space.maxTextWidth },
  },
  // Journey required/chosen cards headers
  journeyRequiredAndChosenHeader: {
    fontFamily: primaryFont,
    fontSize: size.standard,
    color: Color.basicText,
  },
  // The opening visuals that come before the tutorial
  openingScene: {
    fontFamily: secondaryFont,
    fontSize: '60px',
    color: Color.darkUmberS,
    stroke: Color.whiteS,
    strokeThickness: 2,
  },
  openingReminder: {
    fontFamily: sansFont,
    fontSize: size.standard,
    color: Color.greyS,
  },
}

// Styles that are no longer used in any in-use scenes
const StyleDeprecated: StyleDict = {
  // Surname for characters in premade deck
  surname: {
    fontFamily: mainFont,
    fontSize: '34px',
    color: Color.basicText,
  },
  // Text that plays over the stillframes in journey
  stillframe: {
    fontFamily: altFont,
    fontSize: size.large,
    color: Color.blackS,
  },
}

// Add further `StyleType` consts above, then spread them here.
export const Style: StyleDict = {
  ...StyleDeprecated,
  ...StyleCards,
  ...StyleGeneral,
  ...StyleMatch,
  ...StyleHome,
  ...StyleJourney,
}

// The styling for BBCode objects, from the rexui module
export const BBStyle: Record<string, any> = {
  basicStylized: {
    ...Style.basicStylized,
    underline: {
      color: Color.basicText,
      thickness: 3,
      offset: 7,
    },
    halign: 'center',
    // wrap: {
    //   mode: 'word',
    //   width: Space.maxTextWidth,
    // },
    images: {
      coin: { key: 'icon-coin', height: 24 },
      gem: { key: 'icon-gem', height: 24 },
    },
  },
  // The textbox for the card
  cardText: {
    fontFamily: cardTextFont,
    fontSize: '16px',
    color: Color.whiteS,
    strokeThickness: 1,
    wrap: {
      mode: 'word',
      width: 224,
    },
    fixedWidth: 232,
    halign: 'center',
    padding: {
      left: 5,
      right: 5,
      top: 5,
      bottom: 5,
    },
  },
  // Hint text shown when something onscreen is hovered
  hint: {
    fontFamily: sansFont,
    fontSize: size.standard,
    color: Color.hintFill,
    backgroundColor: Color.hintBackground,
    backgroundStrokeColor: '#0005',
    backgroundStrokeLineWidth: 2,
    backgroundCornerRadius: 5,
    stroke: '#000000',
    strokeThickness: 1,
    wrap: {
      mode: 'word',
      width: Space.maxTextWidth,
    },
    padding: {
      left: 20,
      right: 20,
      top: 20,
      bottom: 20,
    },
    // lineSpacing: Space.cardHeight - Space.pad,
  },
  // Menu header chrome bar
  header: {
    fontFamily: primaryFont,
    fontSize: size.large,
    color: Color.header,
    stroke: Color.blackS,
    strokeThickness: 1,
    images: {
      coin: { key: 'icon-coin', height: largeSize },
      gem: { key: 'icon-gem', height: largeSize },
    },
  },
  // Daily Hint on home screen
  dailyHint: {
    fontFamily: secondaryFont,
    fontSize: '20px',
    color: Color.blueS,
    backgroundColor: Color.backgroundLight,
    backgroundCornerRadius: 5,
    padding: {
      left: Space.padSmall,
      right: Space.padSmall,
      top: Space.padSmall,
      bottom: Space.padSmall,
    },
    wrap: {
      mode: 'word',
      width: Space.maxTextWidth,
    },
  },
  // Last screen of match
  matchResultsHeader: {
    fontFamily: primaryFont,
    fontSize: '30px',
    color: Color.basicText,
    wordWrap: { width: Space.maxTextWidth },
    underline: {
      color: Color.basicText,
      thickness: 3,
      offset: 7,
    },
    halign: 'center',
    wrap: {
      mode: 'word',
      width: Space.maxTextWidth,
    },
  },
  // Writing for announcements on home screen
  announcementCopy: {
    fontFamily: secondaryFont,
    fontStyle: 'bold',
    fontSize: '20px',
    color: Color.darkUmberS,
    lineSpacing: 2,
    wrap: {
      mode: 'word',
      width: ANNOUNCEMENT_WIDTH,
    },
    strokeThickness: 2,
    images: {
      coin: { key: 'icon-coin', height: 24 },
      gem: { key: 'icon-gem', height: 24 },
    },
  },
  missionName: {
    fontFamily: secondaryFont,
    fontSize: size.standard,
    color: Color.basicText,
    fixedHeight: largeSize,
    valign: 'center',
    images: {
      card: { key: 'icon-cardIcon', height: largeSize },
    },
  },
  cardCost: {
    fontFamily: altFont,
    fontSize: size.standard,
    color: Color.cardCost,
    stroke: '#000000',
    strokeThickness: 1,
  },
  cardPoints: {
    fontFamily: altFont,
    fontSize: size.standard,
    color: Color.cardPoints,
    stroke: '#000000',
    strokeThickness: 1,
  },
  deckBuilderTitle: {
    ...Style.header,
    halign: 'center',
  },
  storyResolveBubble: {
    fontFamily: altFont,
    fontSize: size.standard,
    color: Color.cardCost,
    stroke: '#ffffff',
    strokeThickness: 1,
  },
  deckname: {
    ...Style.deckThumbnail,
    fontSize: size.large,
    halign: 'center',
    fixedHeight: 50,
  },
  // Floating reward text (gold/gem gain animations)
  reward: {
    fontFamily: primaryFont,
    fontSize: size.large,
    color: Color.goldS,
    stroke: Color.blackS,
    strokeThickness: 3,
    images: {
      coin: { key: 'icon-coin', height: largeSize },
      gem: { key: 'icon-gem', height: 40 },
    },
  },
  // Basic display that includes currency
  currency: {
    fontFamily: secondaryFont,
    fontSize: size.standard,
    color: Color.basicText,
    images: {
      coin: { key: 'icon-coin', height: 24 },
      gem: { key: 'icon-gem', height: 24 },
    },
  },
}
