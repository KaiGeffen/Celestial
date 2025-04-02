import 'phaser'

import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import {
  Style,
  Color,
  UserSettings,
  Space,
  Time,
  Scroll,
  Ease,
  Flags,
} from '../../settings/settings'
import Catalog from '../../../../shared/state/catalog'
import { BuilderBase } from '../builderScene'
import newScrollablePanel from '../../lib/scrollablePanel'

// Region where all of the available cards can be scrolled through
export default class CatalogRegion {
  // Overwrite the 'scene' property of container to specifically be a BuilderScene
  scene: BuilderBase
  container: ContainerLite

  // The scrollable panel on which the catalog exists
  private scrollablePanel: ScrollablePanel
  panel

  // Full list of all cards in the catalog (Even those invisible)
  cardCatalog: CardImage[]

  // Create this region, offset by the given width
  create(scene: BuilderBase, x: number) {
    this.scene = scene
    this.container = new ContainerLite(scene)

    this.panel = this.createPanel(scene, x)

    this.cardCatalog = []

    // Add each card
    let pool = Flags.devCardsEnabled
      ? [...Catalog.collectibleCards, ...Catalog.betaCards]
      : Catalog.collectibleCards
    pool = pool.sort((a, b) => a.cost - b.cost)

    for (let i = 0; i < pool.length; i++) {
      let cardImage = this.addCardToCatalog(pool[i], i)

      this.panel.getElement('panel').add(cardImage.container)
    }

    this.panel.layout()

    return this
  }

  private createPanel(scene: BuilderBase, x: number) {
    // NOTE Scroller is in both environments
    // x += Mobile ? Space.scrollWidth : 0

    // TODO Rename x

    const width = Space.windowWidth - x
    const height = Space.windowHeight

    // Make the object
    let panel = scene.rexUI.add.fixWidthSizer({
      space: {
        left: Space.pad,
        right: Space.pad,
        top: Space.filterBarHeight + Space.pad,
        bottom: Space.pad - 10,
        item: Space.pad,
        line: Space.pad,
      },
    })
    let superPanel = (this.scrollablePanel = newScrollablePanel(scene, {
      x: Space.windowWidth,
      y: 0,
      width: width,
      height: height,

      scrollMode: 0,

      panel: {
        child: panel,
      },

      space: {
        //@ts-ignore
        slider: { top: Space.filterBarHeight },
      },

      slider: Flags.mobile ? undefined : Scroll(scene),
    }).setOrigin(1, 0))

    // TODO
    // Update panel when mousewheel scrolls
    scene.input.on(
      'wheel',
      function (pointer: Phaser.Input.Pointer, gameObject, dx, dy, dz, event) {
        // Return if the pointer is outside of the panel
        if (pointer.x < panel.getLeftCenter().x) {
          return
        }

        // Hide the hint, which might have been scrolled away from
        this.scene['hint'].hide()

        // Scroll panel down by amount wheel moved
        superPanel.childOY -= dy

        // Ensure that panel isn't out bounds (Below 0% or above 100% scroll)
        superPanel.t = Math.max(0, superPanel.t)
        superPanel.t = Math.min(0.999999, superPanel.t)
      },
    )

    return superPanel
  }

  // Filter which cards can be selected in the catalog based on current filtering parameters
  filter(filterFunction: (card: Card) => boolean): void {
    let sizer = this.panel.getElement('panel')
    sizer.clear()

    // For each card in the catalog, add it to the sizer if it satisfies
    // Otherwise make it invisible
    for (let i = 0; i < this.cardCatalog.length; i++) {
      let cardImage = this.cardCatalog[i]

      // Check if this card is present
      if (filterFunction(cardImage.card)) {
        cardImage.container.setVisible(true)

        // Add the image next, with padding between it and the next card
        sizer.add(cardImage.container)
      } else {
        cardImage.container.setVisible(false)
      }
    }

    // Reset the scroll
    this.panel.t = 0

    this.panel.layout()
  }

  private addCardToCatalog(card: Card, index: number): CardImage {
    let cardImage = new CardImage(card, this.container, !Flags.mobile)
      .setOnClick(this.onClickCatalogCard(card))
      .setFocusOptions(
        'Add',
        () => {
          return this.scene.isOverfull()
        },
        () => {
          return this.scene.getCount(card)
        },
      )

    // Add this cardImage to the maintained list of cardImages in the catalog
    this.cardCatalog.push(cardImage)

    return cardImage
  }

  // Event when a card in the catalog is clicked
  private onClickCatalogCard(card: Card): () => void {
    return () => {
      // NOTE If a new deck is created by clicking this card, the new decklist's button will be clicked and make a sound. In that case, do nothing.
      const muteSound =
        !this.scene['journeyRegion'] &&
        this.scene.decklistsRegion.savedDeckIndex === undefined
      const errorMsg = this.scene.addCardToDeck(card)

      if (errorMsg !== undefined) {
        this.scene.signalError(errorMsg)
      } else if (!muteSound) {
        this.scene.sound.play('click')
      }
    }
  }

  // Shift the catalog to the right to make room for the deck panel
  shiftRight(): void {
    let that = this

    const x = Flags.mobile
      ? Space.deckPanelWidth
      : Space.decklistPanelWidth + Space.deckPanelWidth
    const width = Space.windowWidth - x

    // Ratio of how much panel has been scrolled
    const ratio = this.scrollablePanel.t

    // Animate shift
    if (this.panel.minWidth > width) {
      this.scene.tweens.add({
        targets: this.panel,
        minWidth: width,
        duration: Time.builderSlide(),
        ease: Ease.slide,
        onUpdate: () => {
          that.scrollablePanel.layout()
          that.scrollablePanel.t = ratio
        },
      })
    }
  }

  // Shift the catalog to the left to fill the absence of deck panel
  shiftLeft(): void {
    let that = this

    const x = Space.decklistPanelWidth // + (Flags.mobile ? Space.sliderWidth : 0)
    const width = Space.windowWidth - x

    // Ratio of how much panel has been scrolled
    const ratio = this.scrollablePanel.t

    // Animate shift
    if (this.panel.minWidth < width) {
      this.scene.tweens.add({
        targets: this.panel,
        minWidth: width,
        duration: Time.builderSlide(),
        ease: Ease.slide,
        onUpdate: () => {
          that.scrollablePanel.layout()
          that.scrollablePanel.t = ratio
        },
      })
    }
  }
}
