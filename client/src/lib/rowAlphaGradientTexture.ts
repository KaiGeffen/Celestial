import 'phaser'

const CANVAS_W = 512
const CANVAS_H = 64

/** Texture key for gold row highlight (leaderboard, online players). */
export const MENU_ROW_HIGHLIGHT_GRADIENT_KEY = 'menu-row-highlight-gradient'

/**
 * Horizontal RGB gradient with alpha fading left → right (match history row convention).
 */
export function ensureRowAlphaGradientTexture(
  scene: Phaser.Scene,
  key: string,
  color: number,
  leftAlpha: number,
  rightAlpha: number,
): void {
  if (scene.textures.exists(key)) {
    return
  }

  const r = (color >>> 16) & 0xff
  const g = (color >>> 8) & 0xff
  const b = color & 0xff

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const grd = ctx.createLinearGradient(0, 0, CANVAS_W, 0)
  grd.addColorStop(0, `rgba(${r},${g},${b},${leftAlpha})`)
  grd.addColorStop(1, `rgba(${r},${g},${b},${rightAlpha})`)
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  scene.textures.addCanvas(key, canvas)
}
