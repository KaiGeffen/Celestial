import 'phaser'
import { Ease, Time } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

type RexAnchorWithOffset = {
  offsetX: number
  setOffset: (x: number, y: number) => void
}

/** Scale image to `targetWidth`; sync rex anchor Y to keep the avatar in the curved corner. */
function fitBackgroundWidth(
  img: Phaser.GameObjects.Image,
  targetWidth: number,
  anchor: RexAnchorWithOffset,
  edge: 'top' | 'bottom',
): void {
  const source = img.scene.textures.get(img.texture.key).getSourceImage()
  const scale = targetWidth / source.width
  img.setScale(scale)

  // Adjust the y to keep the avatar in the curved corner
  // Space for the avatar in the curved corner
  const avatarHeight = 220

  // Space for the portion of the border above that (Roughly)
  const imageHeight = source.height
  const ratioUpperPortion = 230 / 540
  const heightAboveAvatar = imageHeight * ratioUpperPortion * scale

  const magnitude = avatarHeight + heightAboveAvatar
  const offset = edge === 'top' ? magnitude : -magnitude
  anchor.setOffset(anchor.offsetX, offset)
}

/** Full-screen match backdrop; recap state tints the image. */
export default class BackgroundRegion extends Region {
  water: Phaser.GameObjects.Image
  matchTop: Phaser.GameObjects.Image
  matchBottom: Phaser.GameObjects.Image

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container().setDepth(-1)

    this.water = scene.add.image(0, 0, 'background-water').setOrigin(0)

    this.matchTop = scene.add
      .image(0, 0, 'background-matchTop')
      .setOrigin(0.5, 1)
      .setInteractive()

    this.matchBottom = scene.add
      .image(0, 0, 'background-matchBottom')
      .setOrigin(0.5, 0)
      .setInteractive()

    this.container.add(this.water)
    this.container.add(this.matchTop)
    this.container.add(this.matchBottom)

    scene.plugins.get('rexAnchor')['add'](this.water, {
      width: `100%`,
      height: `100%`,
    })

    const height = 350
    scene.plugins.get('rexAnchor')['add'](this.matchTop, {
      x: `50%`,
      y: `0%+${height}`,
      width: `100%`,
      onResizeCallback: (w, _h, img, anchor) => {
        fitBackgroundWidth(
          img as Phaser.GameObjects.Image,
          w,
          anchor as RexAnchorWithOffset,
          'top',
        )
      },
    })

    scene.plugins.get('rexAnchor')['add'](this.matchBottom, {
      x: `50%`,
      y: `100%-${height}`,
      width: `100%`,
      onResizeCallback: (w, _h, img, anchor) => {
        fitBackgroundWidth(
          img as Phaser.GameObjects.Image,
          w,
          anchor as RexAnchorWithOffset,
          'bottom',
        )
      },
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
      duration: Time.match.recapBackgroundTintMs,
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
