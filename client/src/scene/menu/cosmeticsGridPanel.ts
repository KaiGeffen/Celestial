import 'phaser'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import { Color, Space } from '../../settings/settings'
import newScrollablePanel from '../../lib/scrollablePanel'
import Buttons from '../../lib/buttons/buttons'
import MenuScene from '../menuScene'
import {
  getUnlockedAvatars,
  getUnlockedBorders,
  getUnlockedCardbacks,
} from '../../utils/cosmetics'
import cardbackNames from '../../data/cardbackNames'

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

  private readonly scene: MenuScene

  constructor(scene: MenuScene) {
    this.scene = scene
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

  // Show the unlocked avatars, each wearing `border`, calling onSelect on click
  showAvatars(border: number, onSelect: (avatarId: number) => void): void {
    this.repopulate(() => {
      getUnlockedAvatars().forEach((avatarId) => {
        const container = new ContainerLite(
          this.scene,
          0,
          0,
          Space.avatarSize,
          Space.avatarSize,
        )
        new Buttons.Avatar({
          within: container,
          avatarId,
          border,
          f: () => onSelect(avatarId),
        })
        this.add(container)
      })
    })
  }

  // Show the unlocked borders, each on `avatar`, calling onSelect on click
  showBorders(avatar: number, onSelect: (borderId: number) => void): void {
    this.repopulate(() => {
      getUnlockedBorders().forEach((borderId) => {
        const container = new ContainerLite(
          this.scene,
          0,
          0,
          Space.avatarSize,
          Space.avatarSize,
        )
        new Buttons.Avatar({
          within: container,
          avatarId: avatar,
          border: borderId,
          f: () => onSelect(borderId),
        })
        this.add(container)
      })
    })
  }

  // Show the unlocked cardbacks, outlining `selected`, calling onSelect on click
  showCardbacks(selected: number, onSelect: (cardbackId: number) => void): void {
    this.repopulate(() => {
      const width = Space.cardWidth * 0.85
      const height = Space.cardHeight * 0.85

      // Outline pipeline on the image marks the selected cardback (same fx as
      // Button's hover glow). Part of the image's render, so unlike a separate
      // rectangle it respects the panel's scroll mask.
      const outlinePlugin = this.scene.plugins.get('rexOutlinePipeline')
      const outlines: any[] = []

      getUnlockedCardbacks().forEach((cardbackId) => {
        const container = new ContainerLite(this.scene, 0, 0, width, height)

        const image = this.scene.add
          .image(0, 0, `cardback-${cardbackNames[cardbackId]}`)
          .setDisplaySize(width, height)
          .setInteractive()

        const outlineFx = outlinePlugin['add'](image, {
          thickness: 5,
          outlineColor: Color.outline,
          quality: 0.3,
        })
        outlineFx.active = selected === cardbackId
        outlines.push(outlineFx)

        image.on('pointerdown', () => {
          this.scene.sound.play('click')
          onSelect(cardbackId)

          // Move the selection outline to this cardback
          outlines.forEach((o) => (o.active = false))
          outlineFx.active = true
        })

        container.add(image)
        this.add(container)
      })
    })
  }
}
