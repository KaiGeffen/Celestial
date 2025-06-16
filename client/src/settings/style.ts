// Settings relating to styles of text or bbcode throughout the app
import 'phaser'
import { Space, Color, Flags } from './settings'

// All fonts used
const mainFont = 'Mulish'
const altFont = 'Cinzel'

// Settings for the font sizes
const FontSettings: Record<string, Record<string, string>> = {
  standard: { size: Flags.mobile ? '20px' : '24px' },
  huge: { size: Flags.mobile ? '40px' : '50px' },
  large: { size: Flags.mobile ? '32px' : '44px' },
  title: { size: '128px' },
}

export const Style: Record<string, Phaser.Types.GameObjects.Text.TextStyle> = {
  // When a card resolves in the story, show the points it earns
  cardResolution: {
    fontFamily: mainFont,
    fontSize: FontSettings.huge.size,
    color: Color.whiteS,
  },
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

  // Pass button
  pass: {
    fontFamily: altFont,
    fontSize: Flags.mobile ? '30px' : '40px',
    color: Color.passText,
  },
  // Moon button
  moon: {
    fontFamily: altFont,
    fontSize: Flags.mobile ? '40px' : '60px',
    color: Color.passText,
  },
  // Text on cards that references other cards
  reference: {
    fontFamily: mainFont,
    fontSize: '14px',
    color: '#11223300',
  },
  // Surname for characters in premade deck
  surname: {
    fontFamily: mainFont,
    fontSize: '34px',
    color: Color.basicText,
  },
  // The text saying if you won/lost/tied
  roundResult: {
    fontFamily: altFont,
    fontSize: '60px',
    color: Color.roundResult,
    // stroke: Color.roundResult,
    // strokeThickness: 4
  },
  // Text that plays over the stillframes in journey
  stillframe: {
    fontFamily: altFont,
    fontSize: Flags.mobile ? FontSettings.large.size : FontSettings.huge.size,
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
    color: Color.button,
    stroke: '#000000',
    strokeThickness: 3,
  },
  announcement: {
    fontFamily: altFont,
    fontSize: FontSettings.huge.size,
    color: '#353F4E', //Color.basicText,
    // stroke: '#000',
    // strokeThickness: 1
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
  // Title for menus
  menutitle: {
    fontFamily: mainFont,
    fontSize: FontSettings.title.size,
    color: '#fff',
    stroke: '#000',
    strokeThickness: 6,
  },
  // Title for the home scene
  homeTitle: {
    fontFamily: altFont,
    fontSize: '70px',
    color: '#353F4E',
  },
  homeButtonText: {
    fontFamily: altFont,
    fontSize: '70px',
    color: '#F5F2EB',
  },
  username: {
    fontFamily: mainFont,
    fontSize: '16px',
    color: Color.username,
  },
  usernameElo: {
    fontFamily: mainFont,
    fontSize: '10px',
    color: Color.username,
  },
  todoScore: {
    fontFamily: mainFont,
    fontSize: '24px',
    color: Color.todoScore,
  },
  todoCloud: {
    fontFamily: altFont,
    fontSize: '30px',
    color: Color.passText,
    stroke: '#fff',
    strokeThickness: 2,
  },
  todoSubtext: {
    fontFamily: mainFont,
    fontSize: '12px',
    color: Color.todoSubtext,
  },
  todoBetaCardName: {
    fontFamily: mainFont,
    fontSize: '24px',
    color: Color.cardText,
  },
  homeSceneButton: {
    fontFamily: altFont,
    fontSize: '40px',
    color: Color.goldS,
    stroke: Color.blackS,
    strokeThickness: 3,
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
  // Cost / Points shown above each card
  cardStats: {
    fontFamily: mainFont,
    fontSize: '30px',
    color: Color.cardText,
    // TODO Add letter spacing after at least Phaser 3.6.0
  },
  // The textbox for the card
  cardText: {
    fontFamily: mainFont,
    fontSize: '16px',
    color: 0xffffff,
    backgroundColor: 0x111111a0,
    wrap: {
      mode: 'word',
      width: 180,
    },
    fixedWidth: 190,
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
    wrap: {
      mode: 'word',
      width: Space.maxTextWidth,
    },
    // strokeThickness: 3,
    padding: {
      left: Space.padSmall,
      right: Space.padSmall,
      top: Space.padSmall,
      bottom: Space.padSmall,
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
  // Description for avatars in premade menu
  description: {
    fontFamily: mainFont,
    fontSize: FontSettings.standard.size,
    color: Color.basicText,
    backgroundColor: Color.backgroundLight,
    backgroundCornerRadius: 5,
    // backgroundStrokeColor: Color.outline,
    // backgroundStrokeLineWidth: 2,
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
    underline: {
      color: Color.basicText,
      thickness: 3,
      offset: 7,
    },
  },
  // Blocks of text in the options menu
  optionsBlock: {
    fontFamily: mainFont,
    fontSize: FontSettings.standard.size,
    color: Color.basicText,
    wrap: {
      mode: 'word',
      width: Space.maxTextWidth,
    },
  },
  // Deck names in builder
  deckName: {
    fontFamily: altFont,
    fontSize: FontSettings.huge.size,
    color: '#353F4E',
    halign: 'center',
  },
  // Hints showing which hotkey to press for each stack / card
  hotkeyHint: {
    fontFamily: mainFont,
    fontSize: '50px',

    color: Color.hintFill,
    backgroundColor: Color.hintBackground,
    backgroundStrokeColor: '#0005',
    backgroundStrokeLineWidth: 2,
    backgroundCornerRadius: 5,
    wrap: {
      mode: 'word',
      width: Space.maxTextWidth,
    },
    // strokeThickness: 3,
    padding: {
      left: Space.padSmall,
      right: Space.padSmall,
      top: Space.padSmall,
      bottom: Space.padSmall,
    },
  },
}
