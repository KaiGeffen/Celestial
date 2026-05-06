import 'phaser'

/**
 * Scale text down uniformly when wider than `maxWidthPx` (same approach as status value glyphs).
 */
export function fitTextToMaxWidth(
  txt: Phaser.GameObjects.Text | undefined,
  maxWidthPx: number,
): void {
  if (!txt) return
  txt.setScale(1)
  const w = txt.displayWidth
  if (w > maxWidthPx) {
    txt.setScale(maxWidthPx / w)
  }
}
