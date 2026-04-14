/**
 * Central animation and delay timings (milliseconds unless noted).
 * Tune values on `Time.match` / `Time.general` / `Time.speed` (or the exported
 * `MatchTiming` / `AppUiTiming` / `SpeedRates` objects).
 */

/** Match-only: live play, recap tweens, hint fade (all milliseconds). */
export const MatchTiming = {
  cardFocus: 150,
  /**
   * Time for a card to be played from hand to story.
   * (Visible shadow tween uses the same duration.)
   */
  handToStory: 150,
  /** Base duration for a single recap zone tween (card move, flip segment, etc.) */
  recapTween: 400,
  /** Delay between stacked recap steps (multiplied by index in animator) */
  recapTweenStaggerStep: 320,
  /** Minimum time a recap “state beat” may be shown before advancing (reserved / future) */
  recapStateMinimum: 800,
  /** How long a hint text takes to fade in */
  hintFade: 400,
  /** Round-result stamp fade in/out duration */
  roundResultFadeMs: 200,
  /** Round-result stamp hold at full alpha */
  roundResultHoldMs: 2000,
  /** Match background tint transition when entering/exiting recap */
  recapBackgroundTintMs: 600,
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
