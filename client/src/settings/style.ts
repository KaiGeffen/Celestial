// Settings relating to styles of text or bbcode throughout the app
import 'phaser'
import { Space, Color, Flags } from './settings'

// All fonts used
const mainFont = 'Mulish'
const altFont = 'Cinzel'
const cardTextFont = 'Cinzel'

const primaryFont = 'Typey McTypeface'
const secondaryFont = 'Berylium'

// Font sizes
const FontSettings: Record<string, Record<string, string>> = {
  standard: { size: '24px' },
  huge: { size: '50px' },
  large: { size: '44px' },
  title: { size: '128px' },
}

// Home screen announcement width
const ANNOUNCEMENT_WIDTH = 500

export const Style: Record<string, Phaser.Types.GameObjects.Text.TextStyle> = {
  // Cost hint text
  builder: {
    fontFamily: mainFont,
    fontSize: '22px',
    color: Color.basicText,
    // fontStyle: "Bold",
  },
  // Count of a card in the deck
  cardCount: {
    fontFamily: mainFont,
    fontSize: '24px', //FontSettings.standard.size,
    color: Color.cardCount,
    stroke: '#0009',
    strokeThickness: 3,
  },
  // Text for the buttons that are just text
  textButton: {
    fontFamily: mainFont,
    fontSize: '20px',
    color: Color.textButton,
  },

  // Sun
  sun: {
    fontFamily: 'OptimusPrinceps',
    fontSize: '32px',
    color: Color.passText,
  },
  // Moon
  moonPoints: {
    fontFamily: altFont,
    fontSize: '48px',
    color: Color.passText,
    stroke: Color.backgroundLightS,
    strokeThickness: 2,
  },
  moonAction: {
    fontFamily: altFont,
    fontSize: '36px',
    color: Color.passText,
    stroke: Color.backgroundLightS,
    strokeThickness: 2,
  },
  // Surname for characters in premade deck
  surname: {
    fontFamily: mainFont,
    fontSize: '34px',
    color: Color.basicText,
  },
  // Text that plays over the stillframes in journey
  stillframe: {
    fontFamily: altFont,
    fontSize: FontSettings.huge.size,
    color: Color.blackS,
  },

  basic: {
    fontFamily: mainFont,
    fontSize: FontSettings.standard.size,
    color: Color.basicText,
    wordWrap: { width: Space.maxTextWidth },
  },
  button: {
    fontFamily: mainFont,
    fontSize: '20px',
    color: '#58291b',
    stroke: '#1e0502',
    strokeThickness: 1,
  },
  stackCountButton: {
    fontFamily: primaryFont,
    fontStyle: 'Bold',
    fontSize: '24px',
    color: Color.whiteS,
    stroke: Color.darkUmberS,
    strokeThickness: 4,
  },
  // Header text in all places (Menus, sizers, etc)
  header: {
    fontFamily: primaryFont,
    fontSize: '40px',
    color: Color.goldS,
    stroke: Color.blackS,
    strokeThickness: 4,
    shadow: {
      offsetX: 2,
      offsetY: 2,
      color: 'rgba(0,0,0,0.5)',
      blur: 4,
      fill: true,
    },
  },
  announcementOverBlack: {
    fontFamily: altFont,
    fontSize: FontSettings.huge.size,
    color: Color.whiteS,
  },
  tutorial: {
    fontFamily: mainFont,
    fontSize: FontSettings.large.size,
    color: '#fff',
    backgroundColor: Color.tutorialBackground,
    wordWrap: { width: Space.windowWidth - 200 },
    fixedWidth: Space.windowWidth - 200,
    padding: { x: 10, y: 5 },
    stroke: '#000',
    strokeThickness: 3,
  },
  // Title for the home scene
  homeTitle: {
    fontFamily: altFont,
    fontSize: '70px',
    color: '#353F4E',
  },
  username: {
    fontFamily: primaryFont,
    fontStyle: 'Bold',
    fontSize: '18px',
    color: Color.whiteS,
    stroke: Color.darkUmberS,
    strokeThickness: 4,
    align: 'center',
  },
  usernameInfo: {
    fontFamily: 'OptimusPrinceps',
    fontSize: '14px',
    color: Color.darkUmberS,
  },
  todoScore: {
    fontFamily: primaryFont,
    fontStyle: 'Bold',
    fontSize: '30px',
    color: Color.blackS,
  },
  todoCloud: {
    fontFamily: altFont,
    fontSize: '24px',
    color: Color.passText,
    stroke: '#fff',
    strokeThickness: 2,
  },
  cardTitle: {
    fontFamily: altFont,
    fontSize: '20px',
    color: Color.cardText,
    stroke: '#000000',
    strokeThickness: 1,
  },
  homeSceneButton: {
    fontFamily: altFont,
    fontSize: '40px',
    color: Color.goldS,
    stroke: Color.blackS,
    strokeThickness: 3,
  },
  // FPS counter in debug mode
  fps: {
    fontFamily: mainFont,
    fontSize: '16px',
    color: '#009900',
  },
  // Input text fields (rexInputText)
  inputText: {
    fontFamily: mainFont,
    fontSize: '24px',
    color: Color.textboxText,
  },
  // In-match avatar nameplate rows
  matchUsername: {
    fontFamily: primaryFont,
    fontSize: '24px',
    color: Color.whiteS,
    stroke: Color.darkUmberS,
    strokeThickness: 4,
  },
  matchSubtitle: {
    fontFamily: secondaryFont,
    fontSize: '18px',
    color: Color.whiteS,
    stroke: Color.darkUmberS,
    strokeThickness: 2,
  },
  matchTime: {
    fontFamily: mainFont,
    fontSize: '16px',
    color: Color.whiteS,
    stroke: '#000000',
    strokeThickness: 1.5,
  },

  // Home screen announcement subheader
  announcementSubheader: {
    fontFamily: primaryFont,
    fontSize: '24px',
    color: Color.darkUmberS,
    wordWrap: { width: ANNOUNCEMENT_WIDTH },
    align: 'center',
  },
  // Chapter story popup (journeyScene chapterMessage menu)
  chapterHeader: {
    fontFamily: primaryFont,
    fontStyle: 'italic',
    fontSize: '36px',
    color: Color.darkUmberS,
  },
  chapterBody: {
    fontFamily: secondaryFont,
    fontStyle: 'italic',
    fontSize: '22px',
    color: Color.darkUmberS,
  },
  // Journey scene overlay header / navigation arrows
  journeyOverlay: {
    fontFamily: altFont,
    fontSize: '30px',
    color: '#f5f2eb',
  },
  // Locked deck label in journey
  journeyLocked: {
    fontFamily: mainFont,
    fontSize: '16px',
    color: '#555555',
    wordWrap: { width: Space.maxTextWidth },
  },
  // Cost / Points stats shown above each card
  cardCost: {
    fontFamily: altFont,
    fontSize: '24px',
    color: Color.cardCost,
    stroke: '#000000',
    strokeThickness: 1,
  },
  cardPoints: {
    fontFamily: altFont,
    fontSize: '24px',
    color: Color.cardPoints,
    stroke: '#000000',
    strokeThickness: 1,
  },
}

// The styling for BBCode objects, from the rexui module
export const BBStyle: Record<string, any> = {
  basic: {
    fontFamily: mainFont,
    fontSize: FontSettings.standard.size,
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
    fontFamily: mainFont,
    fontSize: FontSettings.standard.size,
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
  }, // Error text that appears in the center of the screen
  error: {
    fontFamily: mainFont,
    fontSize: FontSettings.huge.size,
    color: Color.error,
    backgroundColor: Color.errorBackground,
    backgroundStrokeColor: Color.errorStroke,
    backgroundStrokeLineWidth: 4,
    backgroundCornerRadius: 5,
    backgroundHorizontalGradient: false,
    padding: {
      left: Space.pad,
      right: Space.pad,
      top: Space.pad,
      bottom: Space.pad,
    },
    // strokeThickness: 4,
    wrap: {
      mode: 'word',
      width: Space.windowWidth - Space.pad * 2,
    },
  },
  // Description for avatars in premade menu / daily tip
  description: {
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
  // Journey scene deck-name BBCodeText (basic at 18px)
  journeyDeckName: {
    fontFamily: mainFont,
    fontSize: '18px',
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
  // Match results header (basic at 30px)
  resultsHeader: {
    fontFamily: mainFont,
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
  // Copy for announcement on home screen
  announcementCopy: {
    fontFamily: secondaryFont,
    fontStyle: 'bold',
    fontSize: '20px',
    color: Color.darkUmberS,
    wrap: {
      mode: 'word',
      width: ANNOUNCEMENT_WIDTH,
    },
  },
}
