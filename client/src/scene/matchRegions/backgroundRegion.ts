import 'phaser'
import { Ease } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

/** Full-screen match backdrop; recap state tints the image. */
export default class BackgroundRegion extends Region {
  water: Phaser.GameObjects.Image
  outer: Phaser.GameObjects.Image

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container().setDepth(-1)

    this.water = scene.add.image(0, 0, 'background-water').setOrigin(0)

    this.outer = scene.add
      .image(0, 0, 'background-matchOuter')
      .setOrigin(0)
      .setInteractive()
      .on('pointerover', () => {
        this.scene.hint.hide()
      })

    this.container.add(this.water)
    this.container.add(this.outer)

    scene.plugins.get('rexAnchor')['add'](this.water, {
      width: `100%`,
      height: `100%`,
    })

    scene.plugins.get('rexAnchor')['add'](this.outer, {
      width: `100%`,
      height: `100%`,
    })

    return this
  }

  /** Tween tint between normal and recap (night) look. */
  tweenTintForRecap(isRecap: boolean): void {
    const startTint = this.water.tintTopLeft
    const endTint = isRecap ? 0x666666 : 0xffffff

    const startR = (startTint >> 16) & 0xff
    const startG = (startTint >> 8) & 0xff
    const startB = startTint & 0xff

    const endR = (endTint >> 16) & 0xff
    const endG = (endTint >> 8) & 0xff
    const endB = endTint & 0xff

    this.scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: 600,
      ease: Ease.basic,
      onUpdate: (tween) => {
        const t = tween.getValue()
        const r = Math.round(startR + (endR - startR) * t)
        const g = Math.round(startG + (endG - startG) * t)
        const b = Math.round(startB + (endB - startB) * t)
        const tint = (r << 16) | (g << 8) | b
        this.water.setTint(tint)
      },
      onComplete: () => {
        if (!isRecap) {
          this.water.clearTint()
        }
      },
    })
  }
}
