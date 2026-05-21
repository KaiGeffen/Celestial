import 'phaser'
import { Color, Style, Space } from '../settings/settings'
import { BaseSceneWithHeader } from './baseScene'
import Buttons from '../lib/buttons/buttons'
import Server from '../server'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { CardImage } from '../lib/cardImage'
import Catalog from '../../../shared/state/catalog'
import newScrollablePanel from '../lib/scrollablePanel'
import Card from '../../../shared/state/card'
import { UserSettings } from '../settings/userSettings'
import Button from '../lib/buttons/button'
import allPurchaseables, {
  borders,
  Purchaseable,
} from '../../../shared/purchaseables/index'

export default class StoreScene extends BaseSceneWithHeader {
  private scrollablePanel: any = null
  private userStatsDisplay: Phaser.GameObjects.Text
  private currentTab: 'cards' | 'cosmetics' = 'cards'
  private btnTab: Button

  constructor() {
    super({ key: 'StoreScene' })
  }

  create(): void {
    this.createBackground()
    super.create({ title: 'Store' })
    this.createTabButton()
    this.createUserStatsDisplay()
    this.createStoreItems()

    // Refresh store when user data is updated (e.g., after purchase)
    this.game.events.on('userDataUpdated', () => {
      this.createStoreItems()
    })
  }

  update(time: number, delta: number): void {
    super.update(time, delta)
    this.updateUserStatsDisplay()
  }

  private createUserStatsDisplay(): void {
    this.userStatsDisplay = this.add
      .text(0, this.headerHeight / 2, '', Style.basicStylized)
      .setOrigin(1, 0.5)
      .setDepth(2)

    // Anchor the user stats display to the right
    this.plugins.get('rexAnchor')['add'](this.userStatsDisplay, {
      right: `100%-${Space.pad * 1.5 + Space.iconSize * 2}`,
    })

    this.updateUserStatsDisplay()
  }

  private updateUserStatsDisplay(): void {
    const gems = Server.getUserData().gems ?? 0
    const coins = Server.getUserData().coins ?? 0

    this.userStatsDisplay.setText(
      `💰 ${coins.toLocaleString()}\n💎 ${gems.toLocaleString()}`,
    )
  }

  private createTabButton(): void {
    const x = Space.pad * 2 + Space.buttonWidth + Space.buttonWidth / 2
    const y = Space.padSmall + Space.buttonHeight / 2

    this.btnTab = new Buttons.Basic({
      within: this,
      text: this.currentTab === 'cards' ? 'Cosmetics' : 'Cards',
      x,
      y,
      f: () => {
        this.currentTab = this.currentTab === 'cards' ? 'cosmetics' : 'cards'
        this.btnTab.setText(this.currentTab === 'cards' ? 'Cosmetics' : 'Cards')
        this.createStoreItems()
      },
    })
  }

  private createBackground(): void {
    const background = this.add.image(0, 0, 'chrome-bodyAlt').setOrigin(0)

    this.plugins.get('rexAnchor')['add'](background, {
      width: `100%`,
      height: `100%`,
    })
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
      anchor: {
        width: '100%',
      },
    })

    if (this.currentTab === 'cosmetics') {
      const ownedItems = new Set(Server.getUserData().ownedItems ?? [])
      const unowned = allPurchaseables.filter(
        (item) => !ownedItems.has(item.id),
      )

      if (unowned.length === 0) {
        // Write the "all Owned" message
        const messageSizer = this.rexUI.add.sizer({
          orientation: 'vertical',
          width: Space.windowWidth,
          height: Space.windowHeight - this.headerHeight,
        })
        const messageText = this.add
          .text(0, 0, 'All Cosmetics owned', Style.header)
          .setOrigin(0.5)
        messageSizer.addSpace()
        messageSizer.add(messageText)
        messageSizer.addSpace()
        sizer.add(messageSizer)
      } else {
        unowned.forEach((item) => {
          sizer.add(this.createCosmeticItem(item))
        })
      }
    } else {
      // Get card inventory (owned cards)
      const cardInventory = UserSettings._get('cardInventory') || []

      // Get all collectible cards that are NOT owned
      const cards = Catalog.collectibleCards.filter((card) => {
        // Check if card is owned (indexed by card ID)
        return !cardInventory[card.id]
      })

      // If all cards are owned, show a message instead
      if (cards.length === 0) {
        const messageSizer = this.rexUI.add.sizer({
          orientation: 'vertical',
          width: Space.windowWidth,
          height: Space.windowHeight - this.headerHeight,
        })
        const messageText = this.add
          .text(0, 0, 'All cards owned', Style.header)
          .setOrigin(0.5)
        messageSizer.addSpace()
        messageSizer.add(messageText)
        messageSizer.addSpace()
        sizer.add(messageSizer)
      } else {
        // Create store items for each card
        cards.forEach((card) => {
          sizer.add(this.createCardItem(card))
        })
      }
    }

    // Create scrollable panel
    this.scrollablePanel = newScrollablePanel(this, {
      x: 0,
      y: this.headerHeight,
      panel: {
        child: sizer,
      },
      anchor: {
        height: `100%-${this.headerHeight}`,
      },
    })
  }

  private createCosmeticItem(
    item: Purchaseable,
  ): Phaser.GameObjects.GameObject {
    const isBorder = item.type === 'border'
    const width = isBorder ? Space.avatarSize : Space.cardWidth
    const height = isBorder ? Space.avatarSize : Space.cardHeight

    const image = this.add
      .image(0, 0, item.name)
      .setDisplaySize(width, height)
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => {
        this.scene.launch('MenuScene', {
          menu: 'purchaseItem',
          purchaseable: item,
        })
      })

    const costText = this.add
      .text(0, 0, `💎 ${item.cost.toLocaleString()}`, Style.basic)
      .setOrigin(0.5)

    const sizer = this.rexUI.add
      .sizer({
        orientation: 'vertical',
        space: { item: Space.padSmall },
      })
      .add(image)
      .add(costText)

    return sizer
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
      // Launch the purchase menu
      this.scene.launch('MenuScene', {
        menu: 'purchaseItem',
        card,
      })
    })

    return cardImageContainer
  }
}
