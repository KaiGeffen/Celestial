import 'phaser'
import { Style, Color, Space } from '../settings/settings'
import BaseScene from './baseScene'
import Buttons from '../lib/buttons/buttons'
import BasicButton from '../lib/buttons/basic'
import UserDataServer from '../network/userDataServer'
import { paymentService } from '../services/paymentService'

const headerHeight = Space.iconSize + Space.pad * 2
const tabHeight = 50

enum Tab {
  Featured = 'Featured',
  Avatars = 'Avatars',
  Borders = 'Borders',
  Pets = 'Pets',
  Cards = 'Cards',
  Cardbacks = 'Cardbacks',
}

export default class StoreScene extends BaseScene {
  private currentTab: Tab = Tab.Featured
  private tabButtons: { [key in Tab]?: BasicButton } = {}
  private contentContainer: Phaser.GameObjects.Container

  constructor() {
    super({ key: 'StoreScene' })
  }

  create(): void {
    this.createHeader()
    this.createTabs()
    this.createContent()
    super.create()
  }

  private createHeader(): void {
    // Make the background header
    let background = this.add
      .rectangle(0, 0, Space.windowWidth, headerHeight, Color.backgroundLight)
      .setOrigin(0)

    this.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 3,
      angle: -90,
      shadowColor: 0x000000,
    })

    // Create back button
    new Buttons.Basic(
      this,
      Space.pad + Space.buttonWidth / 2,
      headerHeight / 2,
      'Back',
      () => {
        this.sound.play('click')
        this.scene.start('HomeScene')
      },
    )

    // Create title back in center
    this.add
      .text(Space.windowWidth / 2, headerHeight / 2, 'SHOP', Style.homeTitle)
      .setOrigin(0.5)

    // Display current gem and coin balance
    const gems = UserDataServer.gems || 0
    const coins = UserDataServer.coins || 0
    this.add
      .text(
        Space.windowWidth - (Space.pad * 2 + Space.iconSize),
        headerHeight / 2,
        `${gems}💎 ${coins}💰`,
        Style.basic,
      )
      .setOrigin(1, 0.5)
  }

  private createTabs(): void {
    // Background
    this.add
      .rectangle(
        0,
        headerHeight,
        Space.windowWidth,
        tabHeight,
        Color.backgroundDark,
      )
      .setOrigin(0)

    // Tab buttons
    const tabWidth = Space.windowWidth / 7
    let x = 0

    // Create tab buttons
    Object.values(Tab).forEach((tab, i) => {
      const button = new Buttons.Basic(
        this,
        x + tabWidth / 2,
        headerHeight + tabHeight / 2,
        tab,
        () => this.switchTab(tab),
      )

      // Store reference to button
      this.tabButtons[tab] = button

      // Update appearance if this is the current tab
      if (this.currentTab === tab) {
        button.glow()
      }

      x += tabWidth
    })

    // Purchase button
    new Buttons.Basic(
      this,
      x + tabWidth / 2,
      headerHeight + tabHeight / 2,
      'Purchase 💎',
      () => {
        // TODO: Implement purchase flow
      },
    )
  }

  private createContent(): void {
    // Create a container for the content that can be cleared when switching tabs
    this.contentContainer = this.add.container(0, 0)

    const startY = headerHeight + tabHeight + Space.pad
    const itemSize = 200
    const padding = Space.pad
    const itemsPerRow = 4

    // Example store items (replace with actual data)
    const items = [
      {
        name: 'Thorn Border',
        price: 100,
        currency: '💎',
        image: 'border-Thorn',
      },
      {
        name: 'Dandelion Relic',
        price: 500,
        currency: '💎',
        image: 'border-Dandelion',
      },
      { name: 'Butterfly', price: 40, currency: '💰', image: 'pet-Butterfly' },
      { name: 'Imani', price: 2000, currency: '💎', image: 'avatar-Imani' },
      {
        name: 'Jade Cardback',
        price: 300,
        currency: '💎',
        image: 'cardback-Jade',
      },
      { name: 'Jules', owned: true, image: 'avatar-Jules' },
    ]

    items.forEach((item, i) => {
      const row = Math.floor(i / itemsPerRow)
      const col = i % itemsPerRow
      const x = Space.pad + col * (itemSize + padding) + itemSize / 2
      const y = startY + row * (itemSize + padding) + itemSize / 2

      // Item container
      const container = this.add.container(x, y)
      this.contentContainer.add(container)

      // Item background for hover effect
      const bg = this.add.rectangle(
        0,
        0,
        itemSize,
        itemSize,
        Color.backgroundLight,
        0,
      )
      container.add(bg)

      // Item image
      const image = this.add.image(0, -30, item.image)
      image.setDisplaySize(160, 160)
      container.add(image)

      // Item name
      const nameText = this.add
        .text(0, 50, item.name, Style.basic)
        .setOrigin(0.5)
      container.add(nameText)

      // Price or owned status
      const priceText = this.add
        .text(
          0,
          70,
          item.owned ? 'Owned' : `${item.price}${item.currency}`,
          Style.basic,
        )
        .setOrigin(0.5)
      container.add(priceText)

      // Make interactive
      bg.setInteractive()
        .on('pointerover', () => {
          bg.setFillStyle(Color.backgroundLight, 0.2)
        })
        .on('pointerout', () => {
          bg.setFillStyle(Color.backgroundLight, 0)
        })
        .on('pointerdown', () => {
          if (!item.owned) {
            this.sound.play('click')
            // TODO: Implement purchase logic
          }
        })
    })
  }

  private switchTab(tab: Tab): void {
    // Update current tab
    this.currentTab = tab

    // Update tab button appearances
    Object.entries(this.tabButtons).forEach(([tabName, button]) => {
      const isCurrentTab = tabName === tab
      if (isCurrentTab) {
        button.glow()
      } else {
        button.stopGlow()
      }
    })

    // Clear and recreate content for the new tab
    this.contentContainer.removeAll(true)
    this.createContent()
  }

  private async initiatePayment(packageId: string): Promise<void> {
    // Show loading state
    const loadingText = this.add
      .text(
        Space.windowWidth / 2,
        Space.windowHeight / 2,
        'Processing payment...',
        Style.basic,
      )
      .setOrigin(0.5)

    try {
      // Create payment session and open checkout
      const result = await paymentService.purchaseGems(packageId)
      if (!result) {
        throw new Error('Failed to create payment session')
      }

      // Open Stripe Checkout
      await paymentService.openCheckout(result.sessionId)

      // Note: Success/failure handling will happen via URL redirects
      loadingText.destroy()
    } catch (error) {
      this.signalError('Payment error: ' + error)
      loadingText.destroy()
    }
  }
}
