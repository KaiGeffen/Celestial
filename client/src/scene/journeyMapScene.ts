import 'phaser'
import { THEME_KEYS } from '@shared/journey/journey'

/** Camera center position (x, y) per overlay theme, in theme order: Jules, Adonis, Mia, Kitz, Renata, Mitra, Water, Stars */
const THEME_CAMERA_POSITIONS: { x: number; y: number }[] = [
  { x: 4000, y: 670 }, // birds (Jules)
  { x: 2100, y: 1270 }, // ashes (Adonis)
  { x: 4860, y: 1940 }, // shadow (Mia)
  { x: 1260, y: 2250 }, // pet (Kitz)
  { x: 1590, y: 4140 }, // birth (Renata)
  { x: 4850, y: 4130 }, // vision (Mitra)
  { x: 3180, y: 3100 }, // water
  { x: 3080, y: 2800 }, // stars
]

const DRIFT_RADIUS_X = 150
const DRIFT_RADIUS_Y = 80
const DRIFT_SPEED = 0.0003
const DRIFT_PHASE = 1.3
const THEME_CAMERA_TWEEN_DURATION = 400

export const STARS_THEME_INDEX = THEME_KEYS.indexOf('stars')
const ALT_MAP_FADE_DURATION = 400
const ALT_MAP_SWAY_SPEED = 0.0004
const ALT_MAP_SWAY_PHASE = 1.5
const ALT_MAP_SWAY_RADIUS = 80

/**
 * The panning map behind the journey overlay: owns the drifting camera,
 * theme-to-theme movement, and the alternate (stars) map fade. Runs below
 * JourneyScene, which launches and stops it.
 */
export default class JourneyMapScene extends Phaser.Scene {
  private map: Phaser.GameObjects.Image
  private altMap: Phaser.GameObjects.Image

  /** Center point the camera drifts around (theme position) */
  private driftCenterX = 0
  private driftCenterY = 0
  private isTweeningCamera = false
  private currentThemeIndex = 0

  constructor() {
    super({ key: 'JourneyMapScene' })
  }

  create(params: { themeIndex: number }): void {
    // Render below the journey overlay scene that launched this
    this.scene.sendToBack()

    this.map = this.add.image(0, 0, 'journey-Map').setOrigin(0)

    this.altMap = this.add
      .image(0, 0, 'journey-AltMap')
      .setOrigin(0.5, 0.5)
      .setAlpha(0)
      .setScrollFactor(0)
    this.plugins.get('rexAnchor')['add'](this.altMap, {
      x: '50%',
      y: '50%',
      width: '120%',
      height: '120%',
    })

    this.cameras.main.setBounds(0, 0, this.map.width, this.map.height)

    // Start at the given theme immediately (no transition on open)
    this.currentThemeIndex = params.themeIndex
    this.isTweeningCamera = false
    this.snapToTheme(params.themeIndex)
    if (params.themeIndex === STARS_THEME_INDEX) {
      this.altMap.setAlpha(1)
    }
  }

  update(time: number, _delta: number): void {
    if (this.isTweeningCamera) return
    const camera = this.cameras.main
    const offsetX = Math.sin(time * DRIFT_SPEED) * DRIFT_RADIUS_X
    const offsetY =
      Math.sin(time * DRIFT_SPEED * 0.7 + DRIFT_PHASE) * DRIFT_RADIUS_Y
    camera.scrollX = Phaser.Math.Clamp(
      this.driftCenterX - camera.width / 2 + offsetX,
      0,
      Math.max(0, this.map.width - camera.width),
    )
    camera.scrollY = Phaser.Math.Clamp(
      this.driftCenterY - camera.height / 2 + offsetY,
      0,
      Math.max(0, this.map.height - camera.height),
    )

    // Gentle sway on alt map when visible (stars theme)
    if (this.altMap.alpha > 0) {
      this.altMap.x =
        camera.width / 2 +
        Math.sin(time * ALT_MAP_SWAY_SPEED) * ALT_MAP_SWAY_RADIUS
      this.altMap.y =
        camera.height / 2 +
        Math.sin(time * ALT_MAP_SWAY_SPEED * 0.7 + ALT_MAP_SWAY_PHASE) *
          ALT_MAP_SWAY_RADIUS
    }
  }

  /**
   * Show the given theme: fade the stars map in/out and move the camera.
   * Stars keeps the camera still (the alt map covers it); returning from
   * stars snaps instead of tweening since the pan was hidden anyway.
   */
  selectTheme(themeIndex: number): void {
    const leavingStars = this.currentThemeIndex === STARS_THEME_INDEX
    this.currentThemeIndex = themeIndex
    this.updateAltMapFade()

    if (themeIndex === STARS_THEME_INDEX) return
    if (leavingStars) {
      this.snapToTheme(themeIndex)
    } else {
      this.tweenToTheme(themeIndex)
    }
  }

  private updateAltMapFade(): void {
    const targetAlpha = this.currentThemeIndex === STARS_THEME_INDEX ? 1 : 0
    if (this.altMap.alpha === targetAlpha) return
    this.tweens.add({
      targets: this.altMap,
      alpha: targetAlpha,
      duration: ALT_MAP_FADE_DURATION,
      ease: 'Power2.InOut',
    })
  }

  /** Set camera and drift center to theme position without tweening */
  private snapToTheme(themeIndex: number): void {
    const pos = THEME_CAMERA_POSITIONS[themeIndex]
    if (!pos) return
    this.driftCenterX = pos.x
    this.driftCenterY = pos.y
    const camera = this.cameras.main
    const maxScrollX = Math.max(0, this.map.width - camera.width)
    const maxScrollY = Math.max(0, this.map.height - camera.height)
    camera.scrollX = Phaser.Math.Clamp(pos.x - camera.width / 2, 0, maxScrollX)
    camera.scrollY = Phaser.Math.Clamp(pos.y - camera.height / 2, 0, maxScrollY)
  }

  private tweenToTheme(themeIndex: number): void {
    const pos = THEME_CAMERA_POSITIONS[themeIndex]
    if (!pos) return
    this.driftCenterX = pos.x
    this.driftCenterY = pos.y
    const camera = this.cameras.main
    const maxScrollX = Math.max(0, this.map.width - camera.width)
    const maxScrollY = Math.max(0, this.map.height - camera.height)
    const targetScrollX = Phaser.Math.Clamp(
      pos.x - camera.width / 2,
      0,
      maxScrollX,
    )
    const targetScrollY = Phaser.Math.Clamp(
      pos.y - camera.height / 2,
      0,
      maxScrollY,
    )
    this.tweens.killTweensOf(camera)
    this.isTweeningCamera = true
    this.tweens.add({
      targets: camera,
      scrollX: targetScrollX,
      scrollY: targetScrollY,
      duration: THEME_CAMERA_TWEEN_DURATION,
      ease: 'Power2.Out',
      onComplete: () => {
        this.isTweeningCamera = false
      },
    })
  }
}
