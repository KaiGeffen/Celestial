import 'phaser'
import { Ease, Time } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

type RexAnchorWithOffset = {
  offsetX: number
  setOffset: (x: number, y: number) => void
}

/** Scale image so it covers the viewport; preserves aspect ratio (no letterboxing). */
function fitBackgroundCover(
  img: Phaser.GameObjects.Image,
  viewportWidth: number,
  viewportHeight: number,
): void {
  const source = img.scene.textures.get(img.texture.key).getSourceImage() as {
    width: number
    height: number
  }
  const scale = Math.max(
    viewportWidth / source.width,
    viewportHeight / source.height,
  )
  img.setScale(scale)
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

/** Full-screen match backdrop; recap darkens the top/bottom chrome and fades in the night layer. */
export default class BackgroundRegion extends Region {
  /** Full-bleed day backdrop under the night overlay and top/bottom chrome. */
  matchDay: Phaser.GameObjects.Image
  /** Night layer over matchDay; alpha follows recap (night) vs round (day). */
  waterNight: Phaser.GameObjects.Image
  matchTop: Phaser.GameObjects.Image
  matchBottom: Phaser.GameObjects.Image

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container().setDepth(-1)

    this.matchDay = scene.add
      .image(0, 0, 'background-matchDay')
      .setOrigin(0)

    this.waterNight = scene.add
      .image(0, 0, 'background-matchNight')
      .setOrigin(0)
      .setAlpha(0)

    this.matchTop = scene.add
      .image(0, 0, 'background-matchTop')
      .setOrigin(0.5, 1)
      .setInteractive()

    this.matchBottom = scene.add
      .image(0, 0, 'background-matchBottom')
      .setOrigin(0.5, 0)
      .setInteractive()

    this.container.add(this.matchDay)
    this.container.add(this.waterNight)
    this.container.add(this.matchTop)
    this.container.add(this.matchBottom)

    const fitDayLayers = (viewport: { width: number; height: number }) => {
      fitBackgroundCover(this.matchDay, viewport.width, viewport.height)
      fitBackgroundCover(this.waterNight, viewport.width, viewport.height)
    }

    scene.plugins.get('rexAnchor')['add'](this.matchDay, {
      x: `0%`,
      y: `0%`,
      onUpdateViewportCallback: (viewport) => fitDayLayers(viewport),
    })

    scene.plugins.get('rexAnchor')['add'](this.waterNight, {
      x: `0%`,
      y: `0%`,
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

  /** Tween tint on top/bottom match art and night layer for recap. */
  tweenTintForRecap(isRecap: boolean): void {
    this.matchDay.clearTint()

    const startTint = this.matchTop.tintTopLeft
    const endTint = isRecap ? 0x888888 : 0xffffff

    const startNightAlpha = this.waterNight.alpha
    const endNightAlpha = isRecap ? 1 : 0

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
        this.matchTop.setTint(tint)
        this.matchBottom.setTint(tint)
        this.waterNight.setAlpha(
          startNightAlpha + (endNightAlpha - startNightAlpha) * t,
        )
      },
      onComplete: () => {
        if (!isRecap) {
          this.matchTop.clearTint()
          this.matchBottom.clearTint()
        }
        this.waterNight.setAlpha(endNightAlpha)
      },
    })
  }
}
