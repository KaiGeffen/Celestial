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
  protected panel

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

    this.panel.layout()

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
        this.panel.childOY -= dy

        // Ensure that panel isn't out bounds (Below 0% or above 100% scroll)
        this.panel.t = Math.max(0, this.panel.t)
        this.panel.t = Math.min(0.999999, this.panel.t)
      },
    )
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

  private createCard(card: Card): void {
    const container = this.panel.getElement('panel')

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

export class CatalogRegionJourney extends CatalogRegion {
  create(scene: BuilderBase) {
    super.create(scene)

    this.panel
      .setMinSize(Space.windowWidth - Space.cutoutWidth, Space.windowHeight)
      .layout()

    return this.panel
  }
}
