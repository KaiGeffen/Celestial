import 'phaser'

import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Space, Time, Scroll, Ease, Flags } from '../../settings/settings'
import Catalog from '../../../../shared/state/catalog'
import { BuilderBase } from '../builderScene'
import newScrollablePanel from '../../lib/scrollablePanel'

// Region where all of the available cards can be scrolled through
export default class CatalogRegion {
  // Overwrite the 'scene' property of container to specifically be a BuilderScene
  scene: BuilderBase

  // The scrollable panel on which the catalog exists
  scrollablePanel

  // Whether the catalog has been shifted to the right
  private shifted = false

  // Full list of all cards in the catalog (Even those invisible)
  cardCatalog: CardImage[]

  // Create this region, offset by the given width
  create(scene: BuilderBase) {
    this.scene = scene
    this.cardCatalog = []

    this.createPanel(scene)

    // Add each card, sorted by cost
    let pool = Flags.devCardsEnabled
      ? [...Catalog.collectibleCards, ...Catalog.betaCards]
      : Catalog.collectibleCards
    pool
      .sort((a, b) => a.cost - b.cost)
      .forEach((card) => {
        this.createCard(card)
      })

    this.scrollablePanel.layout()

    return this
  }

  private createPanel(scene: BuilderBase): void {
    // Make the object
    let panel = scene.rexUI.add.sizer({
      space: {
        left: Space.pad,
        right: Space.pad,
        top: Space.filterBarHeight + Space.pad,
        bottom: Space.pad - 10,
        item: Space.pad,
      },
    })
    this.scrollablePanel = newScrollablePanel(scene, {
      panel: {
        child: panel,
      },

      space: {
        //@ts-ignore
        slider: { top: Space.filterBarHeight },
      },

      slider: Scroll(scene),
    }).setOrigin(1, 0)

    // TODO
    // Update panel when mousewheel scrolls
    scene.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, gameObject, dx, dy, dz, event) => {
        // Return if the pointer is outside of the panel
        if (pointer.x < panel.getLeftCenter().x) {
          return
        }

        // Hide the hint, which might have been scrolled away from
        this.scene.hint.hide()

        // Scroll panel down by amount wheel moved
        this.scrollablePanel.childOY -= dy

        // Ensure that panel isn't out bounds (Below 0% or above 100% scroll)
        this.scrollablePanel.t = Math.max(0, this.scrollablePanel.t)
        this.scrollablePanel.t = Math.min(0.999999, this.scrollablePanel.t)
      },
    )
  }

  // Filter which cards can be selected in the catalog based on current filtering parameters
  filter(filterFunction: (card: Card) => boolean): void {
    let sizer = this.scrollablePanel.getElement('panel')
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
    this.scrollablePanel.t = 0

    this.scrollablePanel.layout()
  }

  private createCard(card: Card): void {
    const container = this.scrollablePanel.getElement('panel')

    const cardImage = new CardImage(card, container)
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
    this.shifted = true

    const x = Flags.mobile
      ? Space.deckPanelWidth
      : Space.decklistPanelWidth + Space.deckPanelWidth
    const width = Space.windowWidth - x

    // Ratio of how much panel has been scrolled
    const ratio = this.scrollablePanel.t

    // Animate shift
    if (this.scrollablePanel.minWidth > width) {
      this.scene.tweens.add({
        targets: this.scrollablePanel,
        minWidth: width,
        duration: Time.builderSlide(),
        ease: Ease.slide,
        onUpdate: () => {
          this.scrollablePanel.layout()
          this.scrollablePanel.t = ratio
        },
      })
    }
  }

  // Shift the catalog to the left to fill the absence of deck panel
  shiftLeft(): void {
    this.shifted = false

    const x = Space.decklistPanelWidth
    const width = Space.windowWidth - x

    // Ratio of how much panel has been scrolled
    const ratio = this.scrollablePanel.t

    // Animate shift
    if (this.scrollablePanel.minWidth < width) {
      this.scene.tweens.add({
        targets: this.scrollablePanel,
        minWidth: width,
        duration: Time.builderSlide(),
        ease: Ease.slide,
        onUpdate: () => {
          this.scrollablePanel.layout()
          this.scrollablePanel.t = ratio
        },
      })
    }
  }

  onWindowResize(): void {
    const width = this.shifted
      ? Space.windowWidth - Space.decklistPanelWidth - Space.deckPanelWidth
      : Space.windowWidth - Space.decklistPanelWidth

    this.scrollablePanel.setMinSize(width, Space.windowHeight)
    this.scrollablePanel.setX(Space.windowWidth)

    this.scrollablePanel.layout()
  }
}

export class CatalogRegionJourney extends CatalogRegion {
  create(scene: BuilderBase) {
    super.create(scene)

    this.scrollablePanel
      .setMinSize(Space.windowWidth - Space.deckPanelWidth, Space.windowHeight)
      .layout()

    return this
  }

  onWindowResize(): void {
    this.scrollablePanel
      .setMinSize(Space.windowWidth - Space.deckPanelWidth, Space.windowHeight)
      .setX(Space.windowWidth)
      .layout()
  }
}
