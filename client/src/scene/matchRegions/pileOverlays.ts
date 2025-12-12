import 'phaser'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import GameModel from '../../../../shared/state/gameModel'
import { Color, Depth, Space, Style } from '../../settings/settings'
import { MatchScene } from '../matchScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'
import Buttons from '../../lib/buttons/buttons'

export default class OverlayRegion extends Region {
  txtTitle: Phaser.GameObjects.Text
  cardImages: CardImage[] = []
  hoveredCard: CardImage | null = null
  switchButton: any = null // Store reference to switch button

  create(scene: MatchScene, title: string): OverlayRegion {
    this.scene = scene

    this.container = scene.add
      .container()
      .setDepth(Depth.pileOverlays)
      .setVisible(false)
    this.scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `50%`,
      y: `50%`,
    })

    // Create the background
    let background = scene.add
      .rectangle(0, 0, 1, 1, Color.darken, 0.8)
      .setInteractive()
      .on('pointerdown', () => this.container.setVisible(false))

    // Anchor background
    scene.plugins.get('rexAnchor')['add'](background, {
      width: `100%`,
      height: `100%`,
    })

    // TODO Hide during mulligan, adjust to pile sizes, text specific to each pile
    this.txtTitle = scene.add
      .text(0, Space.cardHeight / 2, title, Style.announcementOverBlack)
      .setOrigin(0.5, 0)

    this.container.add([background, this.txtTitle])

    return this
  }

  displayState(state: GameModel): void {}

  // Set the callback for this overlay switching to another
  setSwitch(callback: () => void): this {
    new Buttons.Basic({
      within: this.container,
      text: 'Other',
      x: -(Space.windowWidth / 2 - Space.pad - Space.buttonWidth / 2),
      y: -(Space.windowHeight / 2 - Space.pad - Space.buttonHeight / 2),
      f: callback,
    })

    return this
  }

  protected displayCards(cards: Card[]): void {
    this.deleteTemp()
    this.cardImages = []
    this.hoveredCard = null

    const total = cards.length
    for (let i = 0; i < total; i++) {
      this.addOverlayCard(cards[i], i, total)
    }

    this.txtTitle.setVisible(total <= 15)
  }

  // Grey out all cards except the hovered one
  private updateCardGreying(): void {
    this.cardImages.forEach((cardImage) => {
      if (cardImage === this.hoveredCard) {
        cardImage.setPlayable(true) // Clear tint
      } else {
        cardImage.setPlayable(false) // Grey out
      }
    })
  }

  // Add a card to this overlay
  private addOverlayCard(card: Card, i: number, total: number): CardImage {
    const titleHeight = this.txtTitle.height
    let position = CardLocation.overlay(this.container, i, total, titleHeight)

    let cardImage = this.addCard(card, position).moveToTopOnHover()

    // Set up hover handlers to track which card is hovered
    cardImage.setOnHover(
      () => {
        this.hoveredCard = cardImage
        this.updateCardGreying()
      },
      () => {
        // Check if pointer is still over any card before clearing hover
        const pointer = this.scene.input.activePointer
        let stillHovering = false

        for (const img of this.cardImages) {
          if (img.image.getBounds().contains(pointer.x, pointer.y)) {
            stillHovering = true
            if (img !== cardImage) {
              this.hoveredCard = img
              this.updateCardGreying()
            }
            break
          }
        }

        if (!stillHovering) {
          this.hoveredCard = null
          this.updateCardGreying()
        }
      },
    )

    // Initially grey out the card
    cardImage.setPlayable(false)

    this.cardImages.push(cardImage)
    this.temp.push(cardImage)

    return cardImage
  }
}

export class OurDeckOverlay extends OverlayRegion {
  create(scene: MatchScene): OverlayRegion {
    return super.create(scene, 'Your Deck')
  }

  displayState(state: GameModel): void {
    this.displayCards(state.deck[0])
  }
}

export class TheirDeckOverlay extends OverlayRegion {
  create(scene: MatchScene): OverlayRegion {
    return super.create(scene, 'Their Last Shuffle')
  }

  displayState(state: GameModel): void {
    this.displayCards(state.lastShuffle[1])
  }
}

export class OurDiscardOverlay extends OverlayRegion {
  create(scene: MatchScene): OverlayRegion {
    super.create(scene, 'Your Discard Pile')

    return this
  }

  // Override setSwitch to position button below title and update text
  setSwitch(callback: () => void): this {
    // Position button below title text, with more spacing
    const titleY = Space.cardHeight / 2
    const titleHeight = this.txtTitle.height
    const buttonY = titleY + titleHeight + Space.pad * 2

    this.switchButton = new Buttons.Basic({
      within: this.container,
      text: 'Removed (0)', // Will be updated in displayState
      x: 0, // Centered horizontally
      y: buttonY,
      f: callback,
    })

    return this
  }

  displayState(state: GameModel): void {
    this.displayCards(state.pile[0])
    
    // Update button text with expended card count
    if (this.switchButton) {
      const expendedCount = state.expended[0]?.length || 0
      this.switchButton.setText(`Removed (${expendedCount})`)
    }
  }
}

export class TheirDiscardOverlay extends OverlayRegion {
  create(scene: MatchScene): OverlayRegion {
    return super.create(scene, 'Their Discard Pile')
  }

  // Override setSwitch to position button below title and update text
  setSwitch(callback: () => void): this {
    // Position button below title text, with more spacing
    const titleY = Space.cardHeight / 2
    const titleHeight = this.txtTitle.height
    const buttonY = titleY + titleHeight + Space.pad * 2

    this.switchButton = new Buttons.Basic({
      within: this.container,
      text: 'Removed (0)', // Will be updated in displayState
      x: 0, // Centered horizontally
      y: buttonY,
      f: callback,
    })

    return this
  }

  displayState(state: GameModel): void {
    this.displayCards(state.pile[1])
    
    // Update button text with expended card count
    if (this.switchButton) {
      const expendedCount = state.expended[1]?.length || 0
      this.switchButton.setText(`Removed (${expendedCount})`)
    }
  }
}

export class OurExpendedOverlay extends OverlayRegion {
  create(scene: MatchScene): OverlayRegion {
    super.create(scene, 'Your Removed From Game Cards')

    return this
  }

  // Override setSwitch to position button below title and update text
  setSwitch(callback: () => void): this {
    // Position button below title text, with more spacing
    const titleY = Space.cardHeight / 2
    const titleHeight = this.txtTitle.height
    const buttonY = titleY + titleHeight + Space.pad * 2

    this.switchButton = new Buttons.Basic({
      within: this.container,
      text: 'Discard (0)', // Will be updated in displayState
      x: 0, // Centered horizontally
      y: buttonY,
      f: callback,
    })

    return this
  }

  displayState(state: GameModel): void {
    this.displayCards(state.expended[0])
    
    // Update button text with discard card count
    if (this.switchButton) {
      const discardCount = state.pile[0]?.length || 0
      this.switchButton.setText(`Discard (${discardCount})`)
    }
  }
}

export class TheirExpendedOverlay extends OverlayRegion {
  create(scene: MatchScene): OverlayRegion {
    return super.create(scene, 'Their Removed From Game Cards')
  }

  // Override setSwitch to position button below title and update text
  setSwitch(callback: () => void): this {
    // Position button below title text, with more spacing
    const titleY = Space.cardHeight / 2
    const titleHeight = this.txtTitle.height
    const buttonY = titleY + titleHeight + Space.pad * 2

    this.switchButton = new Buttons.Basic({
      within: this.container,
      text: 'Discard (0)', // Will be updated in displayState
      x: 0, // Centered horizontally
      y: buttonY,
      f: callback,
    })

    return this
  }

  displayState(state: GameModel): void {
    this.displayCards(state.expended[1])
    
    // Update button text with discard card count
    if (this.switchButton) {
      const discardCount = state.pile[1]?.length || 0
      this.switchButton.setText(`Discard (${discardCount})`)
    }
  }
}
