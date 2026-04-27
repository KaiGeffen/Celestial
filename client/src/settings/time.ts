/**
 * Central animation and delay timings (milliseconds unless noted).
 * Tune values on `Time.match` / `Time.general` / `Time.speed` (or the exported
 * `MatchTiming` / `AppUiTiming` / `SpeedRates` objects).
 */

/** Match-only: live play, recap tweens, hint fade (all milliseconds). */
export const MatchTiming = {
  /** How fast cards in hand take to move into focus */
  cardFocus: 150,
  /** How long for either player to play a card (Hand to story). */
  playCard: 200,

  /** Flip over a card in the story. Next card starts halfway through the current reveal. */
  cardReveal: 400,

  /** How long for a card to sink in the water */
  cardSink: 900,

  /** Base duration for anything to happen in the recap (Card flips, discard, etc.) */
  recapTween: 420,
  /** Pause between anything happening in the recap */
  recapPauseBetweenTweens: 50,
  /** A special pause for actions during mulligan */
  mulliganPause: -120,

  /** Round-result stamp fade in/out duration */
  roundResultFade: 200,
  /** Round-result stamp hold at full alpha */
  roundResultHold: 1500,

  // NOTE This applies every step, not just the transition day/night
  // NOTE Therefore, each step must take at least this long
  /** Match background tint transition when entering/exiting recap */
  recapBackgroundTintMs: 400,

  /** TUTORIAL: How long a hint text takes to fade in */
  hintFade: 400,
} as const

/**
 * Non-match scenes: menus, builder, journey, search, toasts.
 * Property names include `Ms` where helpful; comments below match the old `Time` class.
 */
export const AppUiTiming = {
  /** Builder catalogue panel slide (was `builderSlide`) */
  builderCatalogSlideMs: 250,
  /** Options tab strip slide duration (used as a bare number in tweens) */
  optionsTabSlideMs: 250,
  /** How long an onscreen message lingers */
  centerMessageLingerMs: 2500,
  /** How fast components flash to draw attention */
  attentionFlashMs: 100,
  /** How long the avatar emote lasts */
  avatarEmoteMs: 1000,
  /** Time for the charts to display a new dataset */
  chartRevealMs: 600,
  /** Time for menu to open / close */
  menuPanelTransitionMs: 200,
  /** Stillframes in journey mode scrolling */
  journeyStillframeHoldMs: 2000,
  /** Stillframes in journey mode fading out */
  journeyStillframeFadeMs: 500,
  /** Stillframe image pan duration */
  journeyStillframeScrollMs: 6000,
  /** On the searching scene, how long between when the avatar swaps */
  searchingAvatarSwapIntervalMs: 4000,
  /** On the searching scene when a match is found, how long for text to fade in/out */
  searchingMatchFoundPulseMs: 500,
  /** Floating reward text rise/fade */
  rewardFloatMs: 800,
  /** Ready-to-harvest garden pulse cycle */
  gardenReadyPulseMs: 800,
} as const

/**
 * Values that are not milliseconds (scene-specific units).
 * (Original `Time` had no comments on these two.)
 */
export const SpeedRates = {
  narrativeTextStep: 15,
  vignetteDriftStep: 30,
} as const

export class Time {
  static readonly match = MatchTiming
  static readonly general = AppUiTiming
  static readonly speed = SpeedRates
}
