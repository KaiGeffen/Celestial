import 'phaser'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'

import BaseScene, { BaseMenuScene } from '../scene/baseScene'

export default function newScrollablePanel(
  scene: BaseScene | BaseMenuScene,
  config: ScrollablePanel.IConfig,
): ScrollablePanel {
  let panel = new ScrollablePanel(scene, config)

  const childPanel = config.panel.child as FixWidthSizer
  if (!childPanel) {
    throw new Error('Scrollable panel must have a panel inside it.')
  }
  // Update this panel's scroll on mouse-wheel
  updateOnScroll(panel, childPanel)

  // Add a shadow effect to the background if present
  if (
    config.background &&
    config.background instanceof Phaser.GameObjects.Rectangle
  ) {
    scene.addShadow(config.background)
  }

  // Default to origin 0
  panel.setOrigin(0)

  // Layout this panel
  panel.layout()

  return panel
}

// Update this panel when user scrolls with their mouse wheel
function updateOnScroll(
  panel: ScrollablePanel,
  childPanel: FixWidthSizer,
): void {
  const scene = panel.scene

  const onWheel = (
    pointer: Phaser.Input.Pointer,
    gameObject,
    dx,
    dy,
    dz,
    event,
  ) => {
    // Return if the pointer is outside of the panel
    if (!childPanel.getBounds().contains(pointer.x, pointer.y)) {
      return
    }

    // Scroll panel down by amount wheel moved
    panel.childOY -= dx + dy

    // Ensure that panel isn't out bounds (Below 0% or above 100% scroll)
    panel.t = Math.min(0.999999, Math.max(0, panel.t))
  }

  scene.input.on('wheel', onWheel)

  // Remove the listener when the panel is destroyed. It's registered on the
  // scene's input, so otherwise it would outlive the panel and throw on the
  // next wheel event, blocking scroll for any panels created after it.
  panel.once('destroy', () => {
    scene.input.off('wheel', onWheel)
  })
}
