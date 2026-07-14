import 'phaser'
import GameModel from '@shared/state/gameModel'
import { Depth, Time } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

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

  constructor(scene: MatchScene, parent: Phaser.GameObjects.Container) {
    this.scene = scene
    this.container = scene.add.container().setVisible(false)
    parent.add(this.container)

    this.createElements()
  }

  /** Create this toast's layers, bottom to top. */
  protected abstract createElements(): void

  /** Start this toast's animation; runs while the toast fades in/out. */
  protected abstract animateElements(): void

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

  /** Show the toast, run its animation, then hide and call onComplete. */
  play(onComplete?: () => void): void {
    this.container.setVisible(true).setAlpha(0)

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: Time.match.roundResultFade,
      hold: Time.match.roundResultHold,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onStart: () => this.animateElements(),
      onComplete: () => {
        this.container.setVisible(false)
        // Looping element tweens shouldn't keep running while hidden
        this.stopElementTweens()
        onComplete?.()
      },
    })
  }

  /** TESTING Keep the toast on screen indefinitely, with its animation running. */
  showForTesting(): void {
    this.container.setVisible(true).setAlpha(1)
    this.animateElements()
  }
}

class WinToast extends RoundToast {
  /** How long the fully faded-in toast holds before fading out. */
  private static readonly HOLD_MS = 1200

  /** Constant stagger between each group starting its fade-in. */
  private static readonly GROUP_DELTA_MS = 200

  /** How long the fade-out at the end of each loop takes. */
  private static readonly FADE_OUT_MS = 500

  /** Fade-in duration for each group (backdrop+sun, umbra, sunbeams, text). */
  private static readonly BACKDROP_SUN_FADE_MS = 600
  private static readonly UMBRA_FADE_MS = 500
  private static readonly SUNBEAMS_FADE_MS = 1000
  private static readonly TEXT_FADE_MS = 400

  /** How far the sun rotates (radians) once it has faded in. */
  private static readonly SUN_ROTATION_RAD = Math.PI / 6

  /** Scale the sun grows to once it has faded in. */
  private static readonly SUN_SCALE = 1

  /** How far each sunbeam rotates (radians) once it has faded in. */
  private static readonly SUNBEAM1_ROTATION_RAD = 0
  private static readonly SUNBEAM2_ROTATION_RAD = 0
  private static readonly SUNBEAM3_ROTATION_RAD = 0
  private static readonly SUNBEAM4_ROTATION_RAD = 0 //-Math.PI / 22

  /** How many times each sunbeam fades out and back in after its first fade-in. */
  private static readonly PULSE_ALPHA = 0.9
  private static readonly SUNBEAM1_PULSE_COUNT = 1
  private static readonly SUNBEAM2_PULSE_COUNT = 0
  private static readonly SUNBEAM3_PULSE_COUNT = 2
  private static readonly SUNBEAM4_PULSE_COUNT = 0

  /** Fade-in order; groups start GROUP_DELTA_MS apart. */
  private static readonly GROUPS: { names: string[]; fadeMs: number }[] = [
    {
      names: ['backdrop', 'sun'],
      fadeMs: WinToast.BACKDROP_SUN_FADE_MS,
    },
    { names: ['umbra'], fadeMs: WinToast.UMBRA_FADE_MS },
    {
      names: ['sunbeam1', 'sunbeam2', 'sunbeam3', 'sunbeam4'],
      fadeMs: WinToast.SUNBEAMS_FADE_MS,
    },
    { names: ['text'], fadeMs: WinToast.TEXT_FADE_MS },
  ]

  private static readonly SUNBEAMS: {
    name: string
    rotation: number
    pulseCount: number
  }[] = [
    {
      name: 'sunbeam1',
      rotation: WinToast.SUNBEAM1_ROTATION_RAD,
      pulseCount: WinToast.SUNBEAM1_PULSE_COUNT,
    },
    {
      name: 'sunbeam2',
      rotation: WinToast.SUNBEAM2_ROTATION_RAD,
      pulseCount: WinToast.SUNBEAM2_PULSE_COUNT,
    },
    {
      name: 'sunbeam3',
      rotation: WinToast.SUNBEAM3_ROTATION_RAD,
      pulseCount: WinToast.SUNBEAM3_PULSE_COUNT,
    },
    {
      name: 'sunbeam4',
      rotation: WinToast.SUNBEAM4_ROTATION_RAD,
      pulseCount: WinToast.SUNBEAM4_PULSE_COUNT,
    },
  ]

  protected createElements(): void {
    this.addLayers('Win', [
      'backdrop',
      'sunbeam1',
      'sunbeam2',
      'sunbeam3',
      'sunbeam4',
      'sun',
      'umbra',
      'text',
    ])
    // NOTE Sun sits above the beams but below umbra/text; move 'sun' last if
    // it should instead render on top of everything

    // Sun is off center in its image size
    this.layers['sun'].setOrigin(0.5, 154 / 500)
    this.layers['sun'].y -= 96
  }

  protected animateElements(): void {
    this.stopElementTweens()
    this.runLoop()
  }

  // One cycle: groups fade in one after another, hold, all fade out,
  // then the cycle repeats (until the toast's tweens are stopped)
  private runLoop(): void {
    const groups = WinToast.GROUPS

    // Track when the last piece finishes fading in. It isn't necessarily the
    // last group — a longer earlier group (e.g. sunbeams) can finish after it.
    let fadeInEndMs = 0
    groups.forEach((group, i) => {
      this.scene.playSound('win')

      const startMs = i * WinToast.GROUP_DELTA_MS
      fadeInEndMs = Math.max(fadeInEndMs, startMs + group.fadeMs)

      this.scene.tweens.add({
        targets: group.names.map((name) => this.layers[name]),
        alpha: { from: 0, to: 1 },
        delay: startMs,
        duration: group.fadeMs,
        ease: 'Quad.InOut',
      })
    })

    // Rotations start once their piece has faded in, and finish before
    // fade-out so nothing is mid-rotation as the toast fades away
    const sunFadeEndMs = WinToast.BACKDROP_SUN_FADE_MS
    const sunbeamsGroupIndex = 2
    const sunbeamsFadeEndMs =
      sunbeamsGroupIndex * WinToast.GROUP_DELTA_MS + WinToast.SUNBEAMS_FADE_MS
    const fadeOutStartMs = fadeInEndMs + WinToast.HOLD_MS

    const sunHoldMs = fadeOutStartMs - sunFadeEndMs

    this.scene.tweens.add({
      targets: this.layers['sun'],
      rotation: { from: 0, to: WinToast.SUN_ROTATION_RAD },
      delay: sunFadeEndMs,
      duration: sunHoldMs,
      ease: 'Sine.easeInOut',
    })

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

    // Fade-out starts once every piece is in, after the hold
    this.scene.tweens.add({
      targets: Object.values(this.layers),
      alpha: 0,
      delay: fadeOutStartMs,
      duration: WinToast.FADE_OUT_MS,
      onComplete: () => {
        // Reset motion while hidden, before the next loop
        this.layers['sun'].setRotation(0).setScale(1)
        WinToast.SUNBEAMS.forEach(({ name }) =>
          this.layers[name].setRotation(0),
        )
        this.runLoop()
      },
    })
  }
}

class LoseToast extends RoundToast {
  protected createElements(): void {
    this.addLayers('Loss', [
      'LOSS_Backdrop',
      'LOSS_Cloud1',
      'LOSS_Cloud2',
      'LOSS_Cloud3',
      'LOSS_Rain_back',
      'LOSS_Rain_mid',
      'LOSS_Rain_close',
      'LOSS_Puddles',
      'LOSS_Umbras',
      'LOSS_Text',
    ])
  }

  protected animateElements(): void {
    // TODO Animate the rain / clouds
  }
}

class TieToast extends RoundToast {
  protected createElements(): void {
    this.addLayers('Tie', [
      'DRAW_backdrop',
      'DRAW_gust_back',
      'DRAW_gust_mid',
      'DRAW_gust_close',
      'DRAW_leaves1',
      'DRAW_leaves2',
      'DRAW_leaves3',
      'DRAW_leaves4',
      'DRAW_leaves5',
      'DRAW_umbras',
      'DRAW_text',
    ])
  }

  protected animateElements(): void {
    // TODO Animate the gusts / leaves
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
    this.toasts.win.showForTesting()

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
