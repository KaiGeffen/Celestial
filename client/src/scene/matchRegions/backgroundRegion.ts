import 'phaser'
import { Ease, Flags, Time } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

/** Peak opacity when pulsing the tile layer. */
export const MATCH_TILE_ALPHA_MAX = 0.16
export const MATCH_TILE_ALPHA_MIN = 0.02

/**
 * Seconds per full sine cycle of opacity: fades {@link MATCH_TILE_ALPHA_MIN} → {@link MATCH_TILE_ALPHA_MAX} → repeat.
 * Set to `0` for a constant alpha of {@link MATCH_TILE_ALPHA_MAX} (no oscillation).
 */
export const MATCH_TILE_ALPHA_PULSE_PERIOD_SEC = 7

/** Horizontal / vertical drift speed for the tiled texture (pixels per second). Phaser shifts UVs via `tilePosition`. */
export const MATCH_TILE_DRIFT_X_PX_PER_SEC = 92
export const MATCH_TILE_DRIFT_Y_PX_PER_SEC = 0

/**
 * Scale factor for each repeat of `background-matchTile` (Phaser {@link Phaser.GameObjects.TileSprite#setTileScale}).
 * `1` is the baseline; larger values stretch each tile (fewer repeats across the screen), smaller values tile more densely.
 */
export const MATCH_TILE_PATTERN_SCALE = 1

/**
 * Compositing for the full-screen `matchTile` layer. Phaser 3: `Phaser.BlendModes` (e.g. `NORMAL`, `ADD`,
 * `MULTIPLY`, `SCREEN`, `OVERLAY` — some are WebGL- or canvas-only; see Phaser docs).
 * Tweak to taste: `SCREEN` / `ADD` often read well over day+night; `MULTIPLY` darkens the stack.
 */
export const MATCH_TILE_BLEND_MODE: number = Phaser.BlendModes.NORMAL

/** Set `?matchTileDebug` on the URL or run on local dev port to log TileSprite sizing. */
function matchTileDebugEnabled(): boolean {
  return (
    Flags.local ||
    (typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('matchTileDebug'))
  )
}

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

/**
 * Full-viewport tile layer: same footprint as `matchDay`; repeats the texture with uniform
 * `tileScale` so each tile keeps its aspect ratio.
 */
function fitMatchTileFullscreen(
  tile: Phaser.GameObjects.TileSprite,
  viewportWidth: number,
  viewportHeight: number,
): void {
  const tex = tile.scene.textures.get(tile.texture.key)
  const frame = tex.get()
  const source = tex.getSourceImage() as {
    width: number
    height: number
  }

  tile.setScale(1)
  tile.setSize(viewportWidth, viewportHeight)
  tile.setTileScale(MATCH_TILE_PATTERN_SCALE, MATCH_TILE_PATTERN_SCALE)
  syncMatchTileVisibility(tile)

  if (matchTileDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.info('[BackgroundRegion matchTile]', {
      textureKey: tile.texture.key,
      viewport: { w: viewportWidth, h: viewportHeight },
      sourceImg: { w: source.width, h: source.height },
      frame: {
        cutW: frame.cutWidth,
        cutH: frame.cutHeight,
        w: frame.width,
        h: frame.height,
      },
      tileComputed: {
        width: tile.width,
        height: tile.height,
        scaleX: tile.scaleX,
        scaleY: tile.scaleY,
        displayWidth: tile.displayWidth,
        displayHeight: tile.displayHeight,
      },
    })
  }
}

/** Show/hide the tile layer only; animated alpha runs in {@link BackgroundRegion.update}. */
function syncMatchTileVisibility(tile: Phaser.GameObjects.TileSprite): void {
  if (MATCH_TILE_ALPHA_MAX <= 0) {
    tile.setVisible(false)
    tile.setAlpha(0)
  } else {
    tile.setVisible(true)
  }
}

/** Current pulsed opacity between {@link MATCH_TILE_ALPHA_MIN} and peak; `nowMs` is scene `update(time)` ms. */
function computeMatchTileAlpha(nowMs: number): number {
  if (MATCH_TILE_ALPHA_MAX <= 0) return 0
  if (MATCH_TILE_ALPHA_PULSE_PERIOD_SEC <= 0) return MATCH_TILE_ALPHA_MAX
  const tSec = nowMs / 1000
  const w = (2 * Math.PI) / MATCH_TILE_ALPHA_PULSE_PERIOD_SEC
  const low = Math.min(MATCH_TILE_ALPHA_MIN, MATCH_TILE_ALPHA_MAX)
  const high = Math.max(MATCH_TILE_ALPHA_MIN, MATCH_TILE_ALPHA_MAX)
  return low + (high - low) * (0.5 + 0.5 * Math.sin(w * tSec))
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
  /** Full-screen tiled layer on top of the day backdrop. */
  matchTile: Phaser.GameObjects.TileSprite
  /** Night layer over matchDay; alpha follows recap (night) vs round (day). */
  waterNight: Phaser.GameObjects.Image
  matchTop: Phaser.GameObjects.Image
  matchBottom: Phaser.GameObjects.Image

  /** Same `time` (ms) passed to `Scene.update`; used after plugins run via `postupdate`. */
  private pulseMsForAlpha = 0

  private readonly flushMatchTileAlphaPost = (): void => {
    if (MATCH_TILE_ALPHA_MAX <= 0 || !this.matchTile.visible) return
    this.matchTile.setAlpha(computeMatchTileAlpha(this.pulseMsForAlpha))
  }

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container().setDepth(-1)

    this.matchDay = scene.add.image(0, 0, 'background-matchDay').setOrigin(0)

    this.waterNight = scene.add
      .image(0, 0, 'background-matchNight')
      .setOrigin(0)
      .setAlpha(0)

    // After day + night so add order stacks the tile above them without touching depth values.
    // Width/height 0 → Phaser sizes from texture frame (avoids a 1×1 canvas until resize).
    this.matchTile = scene.add
      .tileSprite(0, 0, 0, 0, 'background-matchTile')
      .setOrigin(0, 0)
      .setBlendMode(MATCH_TILE_BLEND_MODE)
    syncMatchTileVisibility(this.matchTile)

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
    this.container.add(this.matchTile)
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

    scene.plugins.get('rexAnchor')['add'](this.matchTile, {
      x: `0%`,
      y: `0%`,
      width: `100%`,
      height: `100%`,
      onResizeCallback: (w, h, obj) => {
        fitMatchTileFullscreen(obj as Phaser.GameObjects.TileSprite, w, h)
        ;(obj as Phaser.GameObjects.TileSprite).setAlpha(
          computeMatchTileAlpha(scene.game.loop.time),
        )
      },
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

    // Alpha must run after rex anchor / layout for the frame (`postupdate`), or it gets reset to 1.
    scene.events.on('postupdate', this.flushMatchTileAlphaPost, this)

    return this
  }

  update(time: number, delta: number): void {
    super.update(time, delta)
    this.pulseMsForAlpha = time
    if (MATCH_TILE_ALPHA_MAX <= 0 || !this.matchTile.visible) return

    const dt = delta / 1000
    this.matchTile.tilePositionX += MATCH_TILE_DRIFT_X_PX_PER_SEC * dt
    this.matchTile.tilePositionY += MATCH_TILE_DRIFT_Y_PX_PER_SEC * dt
  }

  /** Tween tint on top/bottom match chrome and night layer for recap (`matchTile` unchanged). */
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
