import { Flags } from './settings'

export var Space = getSpace()

export function refreshSpace() {
  Space = getSpace()
}

function getSpace() {
  let width = Math.floor(window.innerWidth)
  let height = Math.floor(window.innerHeight)
  console.log(`Screen dimensions: ${width} x ${height}`)

  return {
    windowWidth: width,
    windowHeight: height,
    cardSize: 100,
    padSmall: Flags.mobile ? 7 : 10,
    pad: Flags.mobile ? 14 : 20,
    rowsPerPage: 4,
    cardsPerPage: 8 * 4,
    stackOffset: 30,
    stackOverlap: 40,
    // How far from the left announcement text should start (Passed!, Mulliganing, etc)
    announceOffset: width - 300 - 20,
    scoresOffset: width - 300 + 50,
    stackX: width - 300,
    highlightWidth: 5,
    iconSeparation: 180,
    stackIconHeight: 60,
    // The maximum height that something can be and still fit within the standard 780 browser height
    maxHeight: Flags.mobile ? 375 : 750,
    textAreaHeight: 60,

    // These values are experimental and related to the 3/15 gui pass
    cardWidth: Flags.mobile ? 196 * 0.7 : (336 * 7) / 10,
    cardHeight: Flags.mobile ? 280 * 0.7 : 336,
    fullCardWidth: (336 * 7) / 10,
    fullCardHeight: 336,
    storyXOverlap: 30,
    // If this is more than half of cardHeight, mistake
    storyYOverlap: Flags.mobile ? 80 : 120,
    // Dimensions of the hand regions
    handHeight: Flags.mobile ? 80 : 160,
    // Standard corner width for rounded rectangles
    corner: 10,
    // For basic text
    maxTextWidth: 500, // Note must be more than twice cardWidth for hints

    // Height of the filter bar in the deck editor
    filterBarHeight: Flags.mobile ? 0 : 80,

    decklistPanelWidth: 240,
    // NOTE cutout width is 350
    deckPanelWidth: 350 + (Flags.mobile ? 0 : 10),

    // Textbox text in the tutorial that plays while stillframes show
    stillframeTextWidth: width - 120,

    // Dimensions for common buttons
    buttonWidth: 150,
    buttonHeight: 58,
    textboxWidth: 296,
    textboxHeight: 58,

    cutoutHeight: 49,

    avatarWidth: Flags.mobile ? 200 : 400,
    avatarHeight: Flags.mobile ? 300 : 600,
    avatarSize: Flags.mobile ? 80 : 130,
    iconSize: 32,

    sliderWidth: 40,

    // TODO In ui rework, the height that cards in hand are offset from bottom of screen
    get todoHandOffset(): number {
      return calculateHandOffset()
    },
  }
}

// Linear interpolation function
function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t
}

// Calculate hand offset based on screen height
function calculateHandOffset(): number {
  const minHeight = 700
  const maxHeight = 1000
  const minOffset = 100
  const maxOffset = 168

  // Get current window height
  const height = window.innerHeight

  // Clamp height between min and max
  const clampedHeight = Math.max(minHeight, Math.min(maxHeight, height))

  // Calculate interpolation factor (0 to 1)
  const t = (clampedHeight - minHeight) / (maxHeight - minHeight)

  // Interpolate between min and max offset
  return Math.round(lerp(minOffset, maxOffset, t))
}
