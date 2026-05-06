import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Color, Depth } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

/** Shared score chrome height as a fraction of viewport height. */
export const SCORE_CHROME_HEIGHT_RATIO = 0.8

export default class WinsRegion extends Region {
  private imgSundial: Phaser.GameObjects.Image
  private imgOurWins: Phaser.GameObjects.Image
  private imgTheirWins: Phaser.GameObjects.Image

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container(0, 0)

    this.imgSundial = scene.add.image(0, 0, 'chrome-sundial').setOrigin(1, 0.5)
    this.imgOurWins = scene.add.image(0, 0, 'icon-Wins').setOrigin(1, 0.5)
    this.imgTheirWins = scene.add.image(0, 0, 'icon-Wins').setOrigin(1, 0.5)
    this.imgTheirWins.setFlipY(true)
    this.container.add([this.imgSundial, this.imgOurWins, this.imgTheirWins])

    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `100%`,
      y: `50%`,
      onUpdateViewportCallback: (viewport) => {
        const h = viewport.height * SCORE_CHROME_HEIGHT_RATIO
        const sundialAspect =
          this.imgSundial.frame.width / this.imgSundial.frame.height
        this.imgSundial.setDisplaySize(h * sundialAspect, h)

        const aspect =
          this.imgOurWins.frame.width / this.imgOurWins.frame.height
        this.imgOurWins.setDisplaySize(h * aspect, h)
        this.imgTheirWins.setDisplaySize(h * aspect, h)
      },
    })

    return this
  }

  displayState(state: GameModel): void {
    const ourWins = state.wins?.[0] ?? 0
    const theirWins = state.wins?.[1] ?? 0

    // 0..5 round wins map to the 6 frames in icon-Wins.
    this.imgOurWins.setFrame(Math.max(0, Math.min(5, ourWins)))
    this.imgTheirWins.setFrame(Math.max(0, Math.min(5, theirWins)))
  }

  // Tutorial glow is just for tutorial
  private glowTween: Phaser.Tweens.Tween | null = null
  private glowFx: any[] = []

  startTutorialGlow(): void {
    this.stopTutorialGlow()
    if (this.glowFx.length === 0) {
      const plugin = this.scene.plugins.get('rexOutlinePipeline')
      this.glowFx = [this.imgSundial, this.imgOurWins, this.imgTheirWins].map(
        (target) =>
          plugin['add'](target, {
            thickness: 0,
            outlineColor: Color.white,
            quality: 0.3,
          }),
      )
    }
    this.glowFx.forEach((fx) => {
      fx.thickness = 0
      fx.active = true
    })
    this.glowTween = this.scene.tweens.add({
      targets: { v: 0 },
      v: 1,
      duration: 600,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        const v = tween.getValue() as number
        const thickness = 0.2 + 5 * v
        this.glowFx.forEach((fx) => {
          fx.thickness = thickness
        })
      },
    })
  }

  stopTutorialGlow(): void {
    if (this.glowTween) {
      this.glowTween.stop()
      this.glowTween = null
    }
    this.glowFx.forEach((fx) => {
      fx.thickness = 0
      fx.active = false
    })
  }
}
