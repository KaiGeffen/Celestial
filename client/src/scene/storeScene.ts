import 'phaser'
import { Style, Color, Space } from '../settings/settings'
import { BaseSceneWithHeader } from './baseScene'
import Buttons from '../lib/buttons/buttons'
import Server from '../server'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { CardImage } from '../lib/cardImage'
import Catalog from '../../../shared/state/catalog'
import newScrollablePanel from '../lib/scrollablePanel'
import Card from '../../../shared/state/card'
import { UserSettings } from '../settings/userSettings'

export default class StoreScene extends BaseSceneWithHeader {
  private scrollablePanel: any = null

  constructor() {
    super({ key: 'StoreScene' })
  }

  create(): void {
    this.createBackground()
    super.create({ title: 'Store' })
    // this.createPurchaseGemsButton()
    this.createStoreItems()

    // Refresh store when user data is updated (e.g., after purchase)
    this.game.events.on('userDataUpdated', () => {
      this.createStoreItems()
    })
  }

  private createBackground(): void {
    const background = this.add.image(0, 0, 'background-Light').setOrigin(0)

    this.plugins.get('rexAnchor')['add'](background, {
      width: `100%`,
      height: `100%`,
    })
  }

  private createPurchaseGemsButton(): void {
    // Add the purchase gems button to the right of the Back button
    const container = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: container,
      text: 'Purchase 💎',
      f: () => this.scene.launch('MenuScene', { menu: 'purchaseGems' }),
    })

    // Position to the right of the Back button
    // Back button is at Space.pad + Space.buttonWidth / 2
    // So this button's center should be at: Space.pad + Space.buttonWidth + Space.pad + Space.buttonWidth / 2
    container.setPosition(
      Space.pad + Space.buttonWidth + Space.pad + Space.buttonWidth / 2,
      this.headerHeight / 2,
    )
  }

  private createStoreItems() {
    // Remove existing scrollable panel if it exists
    if (this.scrollablePanel) {
      this.scrollablePanel.destroy()

      // Remove previous panels wheel event
      this.input.off('wheel')
    }

    // Create a sizer for the cards
    const sizer = this.rexUI.add.fixWidthSizer({
      width: Space.windowWidth,
      space: {
        item: Space.pad,
        line: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    // Get card inventory (owned cards)
    const cardInventory = UserSettings._get('cardInventory') || []

    // Get all collectible cards that are NOT owned
    const cards = Catalog.collectibleCards.filter((card) => {
      // Check if card is owned (indexed by card ID)
      return !cardInventory[card.id]
    })

    // If all cards are owned, show a message instead
    if (cards.length === 0) {
      // Use a vertical sizer to center the message
      const messageSizer = this.rexUI.add.sizer({
        orientation: 'vertical',
        width: Space.windowWidth,
        height: Space.windowHeight - this.headerHeight,
      })
      const messageText = this.add
        .text(0, 0, 'All cards owned', Style.announcement)
        .setOrigin(0.5)
      messageSizer.addSpace()
      messageSizer.add(messageText)
      messageSizer.addSpace()
      messageSizer.layout()
      sizer.add(messageSizer)
    } else {
      // Create store items for each card
      cards.forEach((card) => {
        sizer.add(this.createCardItem(card))
      })
    }

    sizer.layout()

    // Create scrollable panel
    this.scrollablePanel = newScrollablePanel(this, {
      x: 0,
      y: this.headerHeight,
      width: Space.windowWidth,
      height: Space.windowHeight - this.headerHeight,
      panel: {
        child: sizer,
      },
    })
  }

  private createCardItem(card: Card): Phaser.GameObjects.GameObject {
    // Use CardImage for the card
    const cardImageContainer = new ContainerLite(
      this,
      0,
      0,
      Space.cardWidth,
      Space.cardHeight,
    )
    const cardImage = new CardImage(card, cardImageContainer, true, false)

    // Set click handler on the card image
    cardImage.setOnClick(() => {
      this.sound.play('click')

      // Launch the purchase menu
      this.scene.launch('MenuScene', {
        menu: 'purchaseItem',
        card,
      })
    })

    return cardImageContainer
  }
}
