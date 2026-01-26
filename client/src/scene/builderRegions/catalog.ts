import 'phaser'

import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Space, Time, Scroll, Ease, Flags } from '../../settings/settings'
import Catalog from '../../../../shared/state/catalog'
import { BuilderBase } from '../builderScene'
import newScrollablePanel from '../../lib/scrollablePanel'
import { UserSettings } from '../../settings/userSettings'

// Region where all of the available cards can be scrolled through
export default class CatalogRegion {
  // Overwrite the 'scene' property of container to specifically be a BuilderScene
  scene: BuilderBase

  // The scrollable panel on which the catalog exists
  panel

  // Full list of all cards in the catalog (Even those invisible)
  cardCatalog: CardImage[]

  // Create this region, offset by the given width
  create(scene: BuilderBase) {
    this.scene = scene
    this.cardCatalog = []

    this.createPanel(scene)

    // In dev mode, show beta cards and cards you don't own
    let pool = []
    if (Flags.devCardsEnabled) {
      pool = [...Catalog.collectibleCards, ...Catalog.betaCards]
    } else {
      pool = Catalog.collectibleCards

      // Only show owned cards
      const cardInventory = UserSettings._get('cardInventory') || []
      pool = pool.filter((card) => cardInventory[card.id] === true)
    }

    // Create all the cards in pool
    pool.forEach((card) => {
      this.createCard(card)
    })

    this.toggleOrdering()

    return this
  }

  private createPanel(scene: BuilderBase): void {
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
    this.panel = newScrollablePanel(scene, {
      x: Space.windowWidth,
      y: 0,
      width: Space.windowWidth - Space.decklistPanelWidth,
      height: Space.windowHeight,

      panel: {
        child: panel,
      },

      space: {
        //@ts-ignore
        slider: { top: Space.filterBarHeight },
      },

      slider: Scroll(scene),
    }).setOrigin(1, 0)


  }

  // Filter which cards can be selected in the catalog based on current filtering parameters
  filter(filterFunction: (card: Card) => boolean): void {
    let sizer = this.panel.getElement('panel')
    sizer.clear()

    // Get the catalog sorted by currently selected criteria
    const sortedCatalog = [...this.cardCatalog]
    if (this.orderedByCost) {
      // Sort by cost, maintaining color order as secondary sort
      sortedCatalog.sort((a, b) => a.card.cost - b.card.cost)
    }

    // For each card in the sorted catalog, add it to the sizer if it satisfies
    // Otherwise make it invisible
    for (let i = 0; i < sortedCatalog.length; i++) {
      let cardImage = sortedCatalog[i]

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

  // Toggle between ordering by cost or color
  orderedByCost: boolean = false
  toggleOrdering() {
    // Toggle the ordering mode
    this.orderedByCost = !this.orderedByCost

    // Get the panel sizer
    const sizer = this.panel.getElement('panel')

    // Clear the current panel
    sizer.clear()

    // Create a copy of the catalog to sort
    let sortedCatalog = [...this.cardCatalog]

    if (this.orderedByCost) {
      // Sort by cost, maintaining color order as secondary sort
      sortedCatalog.sort((a, b) => a.card.cost - b.card.cost)
    }
    // If not ordered by cost, use the original catalog order (by color)

    // Re-add all cards in the new order (except ones excluded by filter)
    for (let cardImage of sortedCatalog) {
      if (cardImage.container.visible) {
        sizer.add(cardImage.container)
      }
    }

    // Reset the scroll position
    this.panel.t = 0

    // Re-layout the panel
    this.panel.layout()
  }

  private createCard(card: Card): void {
    const container = this.panel.getElement('panel')

    const cardImage = new CardImage(card, container, true, false)
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
      // const muteSound =
      //   !this.scene['journeyRegion'] &&
      //   this.scene.decklistsRegion.savedDeckIndex === undefined
      this.scene.addCardToDeck(card)

      // const errorMsg = '' // TODO fix

      // if (errorMsg !== undefined) {
      // this.scene.signalError(errorMsg)
      // } else if (!muteSound) {
      this.scene.sound.play('click')
      // }
    }
  }

  // Shift the catalog to the right to make room for the deck panel
  shiftRight(): void {
    const x = Flags.mobile
      ? Space.cutoutWidth
      : Space.decklistPanelWidth + Space.cutoutWidth
    const width = Space.windowWidth - x

    // Ratio of how much panel has been scrolled
    const ratio = this.panel.t

    // Animate shift
    if (this.panel.minWidth > width) {
      this.scene.tweens.add({
        targets: this.panel,
        minWidth: width,
        duration: Time.builderSlide(),
        ease: Ease.slide,
        onUpdate: () => {
          this.panel.layout()
          this.panel.t = ratio
        },
      })
    }
  }

  // Shift the catalog to the left to fill the absence of deck panel
  shiftLeft(): void {
    const x = Space.decklistPanelWidth
    const width = Space.windowWidth - x

    // Ratio of how much panel has been scrolled
    const ratio = this.panel.t

    // Animate shift
    if (this.panel.minWidth < width) {
      this.scene.tweens.add({
        targets: this.panel,
        minWidth: width,
        duration: Time.builderSlide(),
        ease: Ease.slide,
        onUpdate: () => {
          this.panel.layout()
          this.panel.t = ratio
        },
      })
    }
  }

  resize(occupiedWidth: number): void {
    const width = Space.windowWidth - occupiedWidth
    const ratio = this.panel.t

    this.panel
      .setMinSize(width, Space.windowHeight)
      .setX(Space.windowWidth)
      .layout()

    // Ensure that panel is within scroll bounds
    this.panel.t = Math.min(0.999999, ratio)
  }
}
