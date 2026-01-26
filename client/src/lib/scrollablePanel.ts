import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'

import { Flags } from '../settings/settings'
import BaseScene, { BaseMenuScene } from '../scene/baseScene'

export default function newScrollablePanel(
  scene: BaseScene | BaseMenuScene,
  config?: ScrollablePanel.IConfig,
): ScrollablePanel {
  let panel = new ScrollablePanel(scene, config)

  const childPanel = config.panel.child as FixWidthSizer
  if (!childPanel) {
    throw new Error('Scrollable panel must have a panel inside it.')
  }
  if (Flags.mobile) {
    // On mobile, allow scrolling to not be stopped by children
    enableMobileScroll(panel, childPanel)
  } else {
    // Update this panel's scroll on mouse-wheel
    updateOnScroll(panel, childPanel)
  }

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
  panel.scene.input.on(
    'wheel',
    (pointer: Phaser.Input.Pointer, gameObject, dx, dy, dz, event) => {
      // Return if the pointer is outside of the panel
      if (!childPanel.getBounds().contains(pointer.x, pointer.y)) {
        return
      }

      // Scroll panel down by amount wheel moved
      panel.childOY -= dx + dy

      // Ensure that panel isn't out bounds (Below 0% or above 100% scroll)
      panel.t = Math.min(0.999999, Math.max(0, panel.t))
    },
  )
}

// Allow clicks that hit children to scroll the panel
function enableMobileScroll(
  panel: ScrollablePanel,
  childPanel: FixWidthSizer,
): void {
  // If image, click. If container, seek recursively to find images
  function clickImagesRecursive(obj: Phaser.GameObjects.GameObject) {
    if (obj instanceof ContainerLite) {
      obj.getChildren().forEach((child) => {
        clickImagesRecursive(child)
      })
    } else if (obj instanceof Phaser.GameObjects.Image) {
      // TODO Check for pointer over image instead of this hack to prevent buttons with multiple images
      if (!obj.input) {
        obj.emit('pointerdown')
      }
    }
  }

  // Allows scroll unless children are tapped
  panel
    .setChildrenInteractive({
      targets: [childPanel],
      tap: { tapInterval: 0 },
    })
    .on('child.click', (child: Phaser.GameObjects.GameObject) => {
      clickImagesRecursive(child)
    })
}
