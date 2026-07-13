import 'phaser'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import { Space } from '../../settings/settings'
import newScrollablePanel from '../../lib/scrollablePanel'
import MenuScene from '../menuScene'

// Visible area of the cosmetics grid (3 avatars per row)
const PANEL_WIDTH = Space.avatarSize * 3 + Space.pad * 4
const PANEL_HEIGHT = 640

/**
 * Scrollable wrapping grid for cosmetics pickers (profile, deck cosmetics):
 * a FixWidthSizer inside a scrollable panel, like the deck editor catalog.
 * Items flow left-to-right and wrap; content taller than the panel scrolls.
 */
export default class CosmeticsGridPanel {
  // Scrollable panel; add this to the menu's sizer
  readonly panel: ScrollablePanel

  // Wrapping sizer holding the current tab's items
  private readonly contentSizer: FixWidthSizer

  constructor(scene: MenuScene) {
    this.contentSizer = scene.rexUI.add.fixWidthSizer({
      space: {
        left: Space.pad,
        right: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        item: Space.pad,
        line: Space.pad,
      },
    })

    this.panel = newScrollablePanel(scene, {
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      panel: {
        child: this.contentSizer,
      },
    })
  }

  add(item: ContainerLite): void {
    this.contentSizer.add(item)
  }

  /**
   * Replace the grid's items on tab change: clear, run populate, re-layout at
   * the top. Selection changes within a tab should not repopulate — toggle
   * the item's selected visual instead.
   */
  repopulate(populate: () => void): void {
    this.contentSizer.clear(true)
    populate()
    this.panel.t = 0
    this.panel.layout()
  }
}
