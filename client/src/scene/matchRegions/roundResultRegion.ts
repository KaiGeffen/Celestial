import 'phaser'
import GameModel from '@shared/state/gameModel'
import { Depth, Ease } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

/** A set of layers that fade in together, over fadeMs. */
type FadeGroup = { names: string[]; fadeMs: number }

/**
 * A toast announcing the round's result: a backdrop with elements that
 * animate over it. Each result (win / lose / tie) subclasses this with its
 * own layers and animation.
 */
abstract class RoundToast {
  protected scene: MatchScene

  /** Root for this toast's visuals; visible only while playing */
  protected container: Phaser.GameObjects.Container

  /** This toast's layers by asset name, in the order they were added */
  protected layers: Record<string, Phaser.GameObjects.Image> = {}

  /** Constant stagger between each group starting its fade-in. */
  protected static readonly GROUP_DELTA_MS = 200

  /** How long the fully faded-in toast holds before fading out each loop. */
  protected static readonly HOLD_MS = 1800

  /** How long the fade-out at the end of each loop takes. */
  protected static readonly FADE_OUT_MS = 500

  constructor(scene: MatchScene, parent: Phaser.GameObjects.Container) {
    this.scene = scene
    this.container = scene.add.container().setVisible(false)
    parent.add(this.container)

    this.createElements()
  }

  /** Create this toast's layers, bottom to top. */
  protected abstract createElements(): void

  /**
   * Start this toast's animation. When `loop` is true it repeats forever (for
   * testing). Otherwise it plays a single pass — fade in, hold, fade out — and
   * calls `onDone` once that fade-out finishes.
   */
  protected abstract animateElements(loop: boolean, onDone?: () => void): void

  /** Add each named layer image (bottom to top) from this toast's asset dir. */
  protected addLayers(dir: 'Win' | 'Loss' | 'Tie', names: string[]): void {
    for (const name of names) {
      const image = this.scene.add.image(0, 0, `roundResult/${dir}-${name}`)
      this.container.add(image)
      this.layers[name] = image
    }
  }

  /** Stop any running element tweens (e.g. looping animations). */
  protected stopElementTweens(): void {
    Object.values(this.layers).forEach((layer) =>
      this.scene.tweens.killTweensOf(layer),
    )
  }

  /**
   * Fade each group of layers in, one group after another (GROUP_DELTA_MS
   * apart), playing the given sound. Returns when the last piece finishes
   * fading in — not necessarily the last group, since a longer earlier group
   * can finish after it.
   */
  protected fadeInGroups(groups: FadeGroup[], sound: string): number {
    this.scene.playSound(sound)

    let fadeInEndMs = 0
    groups.forEach((group, i) => {
      const startMs = i * RoundToast.GROUP_DELTA_MS
      fadeInEndMs = Math.max(fadeInEndMs, startMs + group.fadeMs)

      const targets = group.names.map((name) => this.layers[name])
      // Start hidden so a delayed group doesn't flash before its fade-in
      targets.forEach((layer) => layer.setAlpha(0))
      this.scene.tweens.add({
        targets,
        alpha: { from: 0, to: 1 },
        delay: startMs,
        duration: group.fadeMs,
        ease: Ease.basic,
      })
    })
    return fadeInEndMs
  }

  /**
   * Show the toast and play its animation once (the toast's own fade in / hold
   * / fade out drives the timing), then hide and call onComplete.
   */
  play(onComplete?: () => void): void {
    this.container.setVisible(true).setAlpha(1)

    this.animateElements(false, () => {
      this.container.setVisible(false)
      // Looping element tweens shouldn't keep running while hidden
      this.stopElementTweens()
      onComplete?.()
    })
  }

  /** TESTING Keep the toast on screen indefinitely, with its animation running. */
  showForTesting(): void {
    this.container.setVisible(true).setAlpha(1)
    this.animateElements(true)
  }
}

class WinToast extends RoundToast {
  /** Fade-in duration for each group (backdrop+sun+text, umbra, sunbeams). */
  private static readonly BACKDROP_SUN_FADE_MS = 600
  private static readonly UMBRA_FADE_MS = 500
  private static readonly SUNBEAMS_FADE_MS = 1000

  /** How far the sun rotates (radians) over the cycle. */
  private static readonly SUN_ROTATION_RAD = Math.PI / 6

  /** Scale the sun grows to once it has faded in. */
  private static readonly SUN_SCALE = 1

  /** Alpha the sunbeams dim to on each pulse. */
  private static readonly PULSE_ALPHA = 0.6

  /** Fade-in order; groups start GROUP_DELTA_MS apart. */
  private static readonly GROUPS: FadeGroup[] = [
    {
      names: ['backdrop', 'sun', 'text'],
      fadeMs: WinToast.BACKDROP_SUN_FADE_MS,
    },
    { names: ['umbra'], fadeMs: WinToast.UMBRA_FADE_MS },
    {
      names: ['sunbeam1', 'sunbeam2', 'sunbeam3', 'sunbeam4'],
      fadeMs: WinToast.SUNBEAMS_FADE_MS,
    },
  ]

  /**
   * Per-sunbeam animation: radians it rotates once faded in, and how many
   * times it pulses (dips to PULSE_ALPHA and back) before the fade-out.
   */
  private static readonly SUNBEAMS: {
    name: string
    rotation: number
    pulseCount: number
  }[] = [
    { name: 'sunbeam1', rotation: 0, pulseCount: 3 },
    { name: 'sunbeam2', rotation: 0, pulseCount: 4 },
    { name: 'sunbeam3', rotation: 0, pulseCount: 2 },
    { name: 'sunbeam4', rotation: 0, pulseCount: 1 },
  ]

  protected createElements(): void {
    this.addLayers('Win', [
      'backdrop',
      'sunbeam1',
      'sunbeam3',
      'sunbeam4',
      'umbra',
      'sunbeam2',
      'text',
      'sun',
    ])

    // Sun is off center in its image size
    this.layers['sun'].setOrigin(0.5, 154 / 500)
    this.layers['sun'].y -= 96
  }

  protected animateElements(loop: boolean, onDone?: () => void): void {
    this.stopElementTweens()
    this.runLoop(loop, onDone)
  }

  // One cycle: groups fade in one after another, hold, all fade out. When
  // looping, the fade-out restarts the cycle; otherwise it plays once and
  // calls onDone.
  private runLoop(loop: boolean, onDone?: () => void): void {
    // Start unrotated/unscaled so the fade-in doesn't show leftover motion
    // from a previous pass (their rotation tweens only begin after a delay)
    this.layers['sun'].setRotation(0).setScale(1)
    WinToast.SUNBEAMS.forEach(({ name }) => this.layers[name].setRotation(0))

    const fadeInEndMs = this.fadeInGroups(WinToast.GROUPS, 'win')

    // Rotations start once their piece has faded in, and finish before
    // fade-out so nothing is mid-rotation as the toast fades away
    const sunFadeEndMs = WinToast.BACKDROP_SUN_FADE_MS
    const sunbeamsGroupIndex = 2
    const sunbeamsFadeEndMs =
      sunbeamsGroupIndex * WinToast.GROUP_DELTA_MS + WinToast.SUNBEAMS_FADE_MS
    const fadeOutStartMs = fadeInEndMs + WinToast.HOLD_MS

    const sunHoldMs = fadeOutStartMs - sunFadeEndMs

    // Sun starts rotating as soon as the fade-in starts (not once it's in),
    // finishing before the toast fades out
    this.scene.tweens.add({
      targets: this.layers['sun'],
      rotation: { from: 0, to: WinToast.SUN_ROTATION_RAD },
      delay: 0,
      duration: fadeOutStartMs,
      ease: 'Linear',
    })

    // Sun scale
    this.scene.tweens.add({
      targets: this.layers['sun'],
      scale: { from: 1, to: WinToast.SUN_SCALE },
      delay: sunFadeEndMs,
      duration: sunHoldMs,
      ease: 'Sine.easeInOut',
    })

    const sunbeamHoldMs = fadeOutStartMs - sunbeamsFadeEndMs

    WinToast.SUNBEAMS.forEach(({ name, rotation, pulseCount }) => {
      this.scene.tweens.add({
        targets: this.layers[name],
        rotation: { from: 0, to: rotation },
        delay: sunbeamsFadeEndMs,
        duration: sunbeamHoldMs,
        ease: 'Sine.easeInOut',
      })

      // Pulse alpha after the initial fade-in; finish before the toast fade-out
      if (pulseCount > 0) {
        const halfPulseMs = sunbeamHoldMs / (pulseCount * 2)
        this.scene.tweens.add({
          targets: this.layers[name],
          alpha: { from: 1, to: WinToast.PULSE_ALPHA },
          delay: sunbeamsFadeEndMs,
          duration: halfPulseMs,
          yoyo: true,
          repeat: pulseCount - 1,
          ease: 'Sine.easeInOut',
        })
      }
    })

    // Fade out once every piece is in, after the hold. Loop mode fades the
    // layers so it can reset and replay; a single pass fades the whole toast.
    this.scene.tweens.add({
      targets: loop ? Object.values(this.layers) : this.container,
      alpha: 0,
      delay: fadeOutStartMs,
      duration: WinToast.FADE_OUT_MS,
      onComplete: () => {
        // (runLoop resets the sun/sunbeam motion at the start of each pass)
        if (loop) this.runLoop(loop, onDone)
        else onDone?.()
      },
    })
  }
}

class LoseToast extends RoundToast {
  /** Fade-in duration for each group. */
  private static readonly BACKDROP_FADE_MS = 600
  private static readonly UMBRA_FADE_MS = 500
  private static readonly CLOUDS_FADE_MS = 1000

  /**
   * The clouds live in one container that fades in with the group. On top of
   * that fade, each cloud drifts from its offset (1 & 3 to the right, 2 to the
   * left) to its home x (0), starting as the fade-in begins so each is moving
   * before it is fully opaque.
   */
  private static readonly CLOUD_DRIFT: { name: string; fromX: number }[] = [
    { name: 'cloud1', fromX: 100 },
    { name: 'cloud2', fromX: -70 },
    { name: 'cloud3', fromX: 45 },
  ]

  /** Container the clouds share, so they fade in together as a unit. */
  private clouds: Phaser.GameObjects.Container

  /** The cloud images (inside `clouds`), by name, for per-cloud drift. */
  private cloudLayers: Record<string, Phaser.GameObjects.Image>

  /**
   * The rain layers live in one container that fades in with the clouds. On
   * top of that fade, each rain layer pulses its own alpha (fully out and back
   * in) this many times across the whole cycle — starting immediately, not
   * waiting for the container's fade-in.
   */
  private static readonly RAIN_PULSE: { name: string; pulseCount: number }[] = [
    { name: 'rainBack', pulseCount: 8 },
    { name: 'rainMid', pulseCount: 7 },
    { name: 'rainClose', pulseCount: 6 },
  ]

  /** Container the rain layers share, so they fade in together as a unit. */
  private rain: Phaser.GameObjects.Container

  /** The rain layer images (inside `rain`), by name, for per-layer pulsing. */
  private rainLayers: Record<string, Phaser.GameObjects.Image>

  /**
   * Plain-layer fade-in order; groups start GROUP_DELTA_MS apart. Two more
   * groups follow these in runLoop: the clouds container (index 2), then the
   * rain container + puddles (index 3).
   */
  private static readonly GROUPS: FadeGroup[] = [
    { names: ['backdrop', 'text'], fadeMs: LoseToast.BACKDROP_FADE_MS },
    { names: ['umbra'], fadeMs: LoseToast.UMBRA_FADE_MS },
  ]

  protected createElements(): void {
    // Added bottom to top (reverse of the intended front-to-back layer order).
    // Rain and clouds each share a container so they fade in as a unit.
    this.addLayers('Loss', ['backdrop', 'text', 'puddles'])

    // Rain container, inserted between puddles and umbra
    this.rain = this.scene.add.container()
    this.container.add(this.rain)
    this.rainLayers = {}
    LoseToast.RAIN_PULSE.forEach(({ name }) => {
      const image = this.scene.add.image(0, 0, `roundResult/Loss-${name}`)
      this.rain.add(image)
      this.rainLayers[name] = image
    })

    this.addLayers('Loss', ['umbra'])

    // Clouds container, front-most (cloud1 on top, so added last)
    this.clouds = this.scene.add.container()
    this.container.add(this.clouds)
    this.cloudLayers = {}
    ;['cloud3', 'cloud2', 'cloud1'].forEach((name) => {
      const image = this.scene.add.image(0, 0, `roundResult/Loss-${name}`)
      this.clouds.add(image)
      this.cloudLayers[name] = image
    })
  }

  protected animateElements(loop: boolean, onDone?: () => void): void {
    this.stopElementTweens()
    this.resetElements()
    this.runLoop(loop, onDone)
  }

  // One cycle: groups fade in one after another, hold, all fade out. When
  // looping, the fade-out restarts the cycle; otherwise it plays once and
  // calls onDone.
  private runLoop(loop: boolean, onDone?: () => void): void {
    // Group fade-in start times (each group starts GROUP_DELTA_MS after the
    // previous). The clouds container fades in one group after the plain
    // layers, then the rain container + puddles fade in the group after that.
    const cloudsStartMs = 2 * LoseToast.GROUP_DELTA_MS
    const rainStartMs = 3 * LoseToast.GROUP_DELTA_MS

    // Fade in the plain layers, then fold in the clouds and rain groups
    const fadeInEndMs = Math.max(
      this.fadeInGroups(LoseToast.GROUPS, 'lose'),
      cloudsStartMs + LoseToast.CLOUDS_FADE_MS,
      rainStartMs + LoseToast.CLOUDS_FADE_MS,
    )

    const fadeOutStartMs = fadeInEndMs + LoseToast.HOLD_MS

    // --- Animations after the fade-in (add more here) ---

    // The clouds container fades in as a unit...
    this.scene.tweens.add({
      targets: this.clouds,
      alpha: { from: 0, to: 1 },
      delay: cloudsStartMs,
      duration: LoseToast.CLOUDS_FADE_MS,
      ease: Ease.basic,
    })

    // ...while each cloud inside drifts from its offset to its home x, starting
    // as the fade-in begins (so it moves before fully opaque) and settling
    // before the toast fades out
    LoseToast.CLOUD_DRIFT.forEach(({ name }) => {
      this.scene.tweens.add({
        targets: this.cloudLayers[name],
        x: 0,
        delay: cloudsStartMs,
        duration: fadeOutStartMs - cloudsStartMs,
        ease: 'Linear',
      })
    })

    // The rain container and puddles fade in together, one group after the
    // clouds...
    this.scene.tweens.add({
      targets: [this.rain, this.layers['puddles']],
      alpha: { from: 0, to: 1 },
      delay: rainStartMs,
      duration: LoseToast.CLOUDS_FADE_MS,
      ease: Ease.basic,
    })

    // ...while each rain layer inside pulses its own alpha (fully out and back
    // in) the whole cycle, starting immediately rather than after the fade-in.
    // Pulses fit into the window before the toast fades out.
    LoseToast.RAIN_PULSE.forEach(({ name, pulseCount }) => {
      if (pulseCount <= 0) return
      const halfPulseMs = fadeOutStartMs / (pulseCount * 2)
      this.scene.tweens.add({
        targets: this.rainLayers[name],
        alpha: { from: 1, to: 0 },
        duration: halfPulseMs,
        yoyo: true,
        repeat: pulseCount - 1,
        ease: 'Sine.easeInOut',
      })
    })

    // Fade out once every piece is in, after the hold. Loop mode fades the
    // layers so it can reset and replay; a single pass fades the whole toast.
    this.scene.tweens.add({
      targets: loop
        ? [...Object.values(this.layers), this.clouds, this.rain]
        : this.container,
      alpha: 0,
      delay: fadeOutStartMs,
      duration: LoseToast.FADE_OUT_MS,
      onComplete: () => {
        if (loop) {
          // Reset motion while hidden, before the next loop
          this.resetElements()
          this.runLoop(loop, onDone)
        } else {
          onDone?.()
        }
      },
    })
  }

  /** Restore every animated element to its start state, before a loop. */
  private resetElements(): void {
    // Containers hidden (they fade in); clouds back at their offset x
    this.clouds.setAlpha(0)
    LoseToast.CLOUD_DRIFT.forEach(({ name, fromX }) =>
      this.cloudLayers[name].setX(fromX),
    )
    // Rain container + puddles hidden (they fade in together); rain layers at
    // full alpha, ready to pulse
    this.rain.setAlpha(0)
    this.layers['puddles'].setAlpha(0)
    Object.values(this.rainLayers).forEach((layer) => layer.setAlpha(1))
  }

  // Also stop the containers and their layers, which live outside `layers`
  protected stopElementTweens(): void {
    super.stopElementTweens()
    ;[this.clouds, this.rain].forEach((c) => this.scene.tweens.killTweensOf(c))
    ;[
      ...Object.values(this.cloudLayers),
      ...Object.values(this.rainLayers),
    ].forEach((layer) => this.scene.tweens.killTweensOf(layer))
  }
}

class TieToast extends RoundToast {
  /** Size of the tie layer images, for converting image coords to scene x/y. */
  private static readonly IMG_WIDTH = 600
  private static readonly IMG_HEIGHT = 500

  /** Fade-in duration for each group. */
  private static readonly BACKDROP_FADE_MS = 600
  private static readonly UMBRA_FADE_MS = 500
  private static readonly LEAVES_FADE_MS = 1000

  /**
   * The wind gusts don't move or alpha-fade with a group. Instead each pulses
   * between its low and high alpha this many times via its per-corner edge
   * alpha: the left edge leads and the right edge lags (WIND_DESYNC_MS), so
   * each pulse reads as sweeping left to right across the image. `offsetMs`
   * delays a gust's whole pulse, to stagger the gusts against each other.
   * See https://docs.phaser.io/phaser/concepts/gameobjects#alpha
   */
  private static readonly WIND_PULSE: {
    name: string
    pulseCount: number
    lowAlpha: number
    highAlpha: number
    offsetMs: number
  }[] = [
    {
      name: 'gustBack',
      pulseCount: 3,
      lowAlpha: 0.0,
      highAlpha: 0.3,
      offsetMs: 0,
    },
    {
      name: 'gustMid',
      pulseCount: 2,
      lowAlpha: 0.0,
      highAlpha: 0.4,
      offsetMs: 0,
    },
    {
      name: 'gustClose',
      pulseCount: 1,
      lowAlpha: 0.0,
      highAlpha: 0.5,
      offsetMs: 0,
    },
  ]

  /** How far the right edge lags the left in each pulse (left-to-right desync). */
  private static readonly WIND_DESYNC_MS = 150

  /**
   * Plain-layer fade-in order; groups start GROUP_DELTA_MS apart. Leaves are
   * not here — they fade in per-leaf (with their own fadeDelayMs) in runLoop.
   */
  private static readonly GROUPS: FadeGroup[] = [
    { names: ['backdrop', 'text'], fadeMs: TieToast.BACKDROP_FADE_MS },
    { names: ['umbras'], fadeMs: TieToast.UMBRA_FADE_MS },
  ]

  /**
   * Per-leaf animation. Each leaf fades in after its own delay, drifts from
   * xDelta away back to its resting x by the end of the hold, and rotates
   * around its origin throughout the whole cycle.
   */
  private static readonly LEAVES: {
    name: string
    /** Resting x (image space, 0..IMG_WIDTH) the leaf drifts to and holds at. */
    x: number
    /** Start offset from the resting x; negative starts the leaf to the left. */
    xDelta: number
    /** Origin of the image = the pivot the leaf rotates around. */
    originX: number
    originY: number
    fadeDelayMs: number
    /** Radians the leaf rotates over the whole cycle. */
    rotations: number
  }[] = [
    {
      name: 'leaves1',
      x: 470,
      originX: 270 / 600,
      originY: 200 / 500,
      fadeDelayMs: 10,
      xDelta: -450,
      rotations: 4 * 6,
    },
    {
      name: 'leaves2',
      x: 150,
      originX: 150 / 600,
      originY: 385 / 500,
      fadeDelayMs: 1700,
      xDelta: -90,
      rotations: 10,
    },
    {
      name: 'leaves3',
      x: 515,
      originX: 515 / 600,
      originY: 320 / 500,
      fadeDelayMs: 0,
      xDelta: -300,
      rotations: 3 * 6,
    },
    {
      name: 'leaves4',
      x: 190,
      originX: 110 / 600,
      originY: 279 / 500,
      fadeDelayMs: 1500,
      xDelta: -160,
      rotations: 14,
    },
    {
      name: 'leaves5',
      x: 327,
      originX: 327 / 600,
      originY: 320 / 500,
      fadeDelayMs: 0,
      xDelta: -300,
      rotations: 3 * 6,
    },
  ]

  protected createElements(): void {
    // Added bottom to top (reverse of the intended front-to-back layer order)
    this.addLayers('Tie', [
      'backdrop',
      'gustBack',
      'gustMid',
      'gustClose',
      'text',
      'leaves1',
      'leaves2',
      'leaves3',
      'leaves4',
      'leaves5',
      'umbras',
    ])
  }

  protected animateElements(loop: boolean, onDone?: () => void): void {
    this.stopElementTweens()
    this.resetElements()
    this.runLoop(loop, onDone)
  }

  // One cycle: groups fade in one after another, hold, all fade out. When
  // looping, the fade-out restarts the cycle; otherwise it plays once and
  // calls onDone.
  private runLoop(loop: boolean, onDone?: () => void): void {
    const fadeInEndMs = this.fadeInGroups(TieToast.GROUPS, 'tie')
    const fadeOutStartMs = fadeInEndMs + TieToast.HOLD_MS

    // --- Animations after the fade-in (add more here) ---

    // Each gust fades in and out a few times via its edge alpha. The left edge
    // leads and the right edge lags by WIND_DESYNC_MS, so each pulse reads as
    // sweeping left to right across the image. Both edges fit their pulses into
    // the window before the toast fades out.
    TieToast.WIND_PULSE.forEach(
      ({ name, pulseCount, lowAlpha, highAlpha, offsetMs }) => {
        if (pulseCount <= 0) return
        const image = this.layers[name]

        // Left edge leads, starting after this gust's offset
        this.scene.tweens.add({
          targets: image,
          alphaTopLeft: { from: lowAlpha, to: highAlpha },
          alphaTopRight: { from: lowAlpha, to: highAlpha },
          alphaBottomLeft: { from: lowAlpha, to: highAlpha },
          alphaBottomRight: { from: lowAlpha, to: highAlpha },
          delay: offsetMs,
          duration: (fadeOutStartMs - offsetMs) / (pulseCount * 2),
          yoyo: true,
          repeat: pulseCount - 1,
          ease: 'Sine.easeInOut',
        })

        // Right edge lags by the desync, but still lands by fadeOutStartMs
        this.scene.tweens.add({
          targets: image,
          alphaTopRight: { from: lowAlpha, to: highAlpha },
          alphaBottomRight: { from: lowAlpha, to: highAlpha },
          delay: offsetMs + TieToast.WIND_DESYNC_MS,
          duration:
            (fadeOutStartMs - offsetMs - TieToast.WIND_DESYNC_MS) /
            (pulseCount * 2),
          yoyo: true,
          repeat: pulseCount - 1,
          ease: 'Sine.easeInOut',
        })
      },
    )

    // Each leaf rotates throughout the whole cycle, fades in after its own
    // delay, and drifts from its start offset to its resting x by the end of
    // the hold. (Leaves are kept out of GROUPS so they aren't faded in twice.)
    TieToast.LEAVES.forEach((leaf) => {
      const image = this.layers[leaf.name]

      // Set origin, and start the leaf xDelta away from its resting x. Start
      // hidden so a delayed fade-in doesn't flash at full alpha first.
      image.setOrigin(leaf.originX, leaf.originY)
      image.setX(leaf.x - TieToast.IMG_WIDTH / 2 + leaf.xDelta)
      image.setY((leaf.originY - 0.5) * TieToast.IMG_HEIGHT)
      image.setAlpha(0)

      // Rotate throughout the whole cycle
      this.scene.tweens.add({
        targets: image,
        rotation: { from: 0, to: leaf.rotations },
        duration: fadeOutStartMs + TieToast.FADE_OUT_MS,
        ease: 'Linear',
      })

      // Fade in after this leaf's delay
      this.scene.tweens.add({
        targets: image,
        alpha: { from: 0, to: 1 },
        delay: leaf.fadeDelayMs,
        duration: TieToast.LEAVES_FADE_MS,
        ease: Ease.basic,
      })

      // Drift from its start offset to its resting x by the end of the hold
      this.scene.tweens.add({
        targets: image,
        x: leaf.x - TieToast.IMG_WIDTH / 2,
        delay: leaf.fadeDelayMs,
        duration: fadeOutStartMs - leaf.fadeDelayMs,
        ease: 'Linear',
      })
    })

    // Fade out once every piece is in, after the hold. Loop mode fades the
    // layers so it can reset and replay; a single pass fades the whole toast.
    this.scene.tweens.add({
      targets: loop ? Object.values(this.layers) : this.container,
      alpha: 0,
      delay: fadeOutStartMs,
      duration: TieToast.FADE_OUT_MS,
      onComplete: () => {
        if (loop) {
          // Reset motion while hidden, before the next loop
          this.resetElements()
          this.runLoop(loop, onDone)
        } else {
          onDone?.()
        }
      },
    })
  }

  /** Restore every animated element to its start state, before a loop. */
  private resetElements(): void {
    // Wind starts at its low alpha; its edge-alpha pulses swing it to high
    TieToast.WIND_PULSE.forEach(({ name, lowAlpha }) =>
      this.layers[name].setAlpha(lowAlpha),
    )

    // Leaves start unrotated (runLoop re-hides and repositions them itself)
    TieToast.LEAVES.forEach((leaf) => this.layers[leaf.name].setRotation(0))
  }
}

// Shows the result of the round that just resolved (win / lose / tie)
export default class RoundResultRegion extends Region {
  onAnimationComplete: () => void

  private toasts: { win: RoundToast; lose: RoundToast; tie: RoundToast }

  create(scene: MatchScene): RoundResultRegion {
    this.scene = scene
    this.container = scene.add.container().setDepth(Depth.roundResult)
    this.scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `50%`,
      y: `50%`,
    })

    this.toasts = {
      win: new WinToast(scene, this.container),
      lose: new LoseToast(scene, this.container),
      tie: new TieToast(scene, this.container),
    }

    // TESTING Remove: keep the win toast visible while iterating on its art
    // this.toasts.tie.showForTesting()

    return this
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

    // On the final state of the recap, announce the round's result
    const isRecapEnd = ['win', 'lose', 'tie'].includes(state.sound)
    if (state.isRecap && isRecapEnd) {
      this.getToast(state).play(() => this.onAnimationComplete?.())
    }
  }

  // Which toast to show, based on the round's score
  private getToast(state: GameModel): RoundToast {
    if (state.score[0] > state.score[1]) {
      return this.toasts.win
    } else if (state.score[0] < state.score[1]) {
      return this.toasts.lose
    } else {
      return this.toasts.tie
    }
  }
}
