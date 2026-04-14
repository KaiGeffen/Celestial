/**
 * Central animation and delay timings (milliseconds unless noted).
 * (Previously scaled some recap values with `UserSettings.animationSpeed`; that
 * is removed — tune `MatchTiming` here.)
 *
 * Call sites keep using `Time.*`; import `MatchTiming` when you want a named
 * constant in match code (e.g. `MatchTiming.recapTween`).
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
  /** On the searching scene, how long between when the avatar swaps */
  searchingAvatarSwapIntervalMs: 4000,
  /** On the searching scene when a match is found, how long for text to fade in/out */
  searchingMatchFoundPulseMs: 500,
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
  static playCard(): number {
    return MatchTiming.handToStory
  }

  static recapStateMinimum(): number {
    return MatchTiming.recapStateMinimum
  }

  static recapTween(): number {
    return MatchTiming.recapTween
  }

  static recapTweenWithPause(): number {
    return MatchTiming.recapTweenStaggerStep
  }

  static hintFade(): number {
    return MatchTiming.hintFade
  }

  static textSpeed(): number {
    return SpeedRates.narrativeTextStep
  }

  static vignetteSpeed(): number {
    return SpeedRates.vignetteDriftStep
  }

  static builderSlide(): number {
    return AppUiTiming.builderCatalogSlideMs
  }

  static readonly optionsTabSlide = AppUiTiming.optionsTabSlideMs

  static onscreenMessage = AppUiTiming.centerMessageLingerMs
  static flash = AppUiTiming.attentionFlashMs
  static emote = AppUiTiming.avatarEmoteMs
  static chart = AppUiTiming.chartRevealMs
  static menuTransition = AppUiTiming.menuPanelTransitionMs
  static stillframeScroll = AppUiTiming.journeyStillframeHoldMs
  static stillframeFade = AppUiTiming.journeyStillframeFadeMs
  static avatarSwap = AppUiTiming.searchingAvatarSwapIntervalMs
  static searchFlash = AppUiTiming.searchingMatchFoundPulseMs

  /** Same as {@link MatchTiming.cardFocus}; used by hand layout tweens. */
  static readonly cardFocus = MatchTiming.cardFocus
}

/*
 * Next steps (animation-speed rewrite):
 *
 * 1. Options / history — Remove `animationSpeed` + Speed button in historyRegion
 *    if you no longer want user-controlled recap pacing.
 *
 * 2. Tuning — Edit `MatchTiming` / `AppUiTiming` / `SpeedRates` here; `Time.*`
 *    stays in sync.
 *
 * 3. Optional — Import `MatchTiming` in animator for clearer fractions
 *    (e.g. `MatchTiming.recapTween / 2`).
 */
