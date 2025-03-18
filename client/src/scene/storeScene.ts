import 'phaser'
import { Style, Color, Space } from '../settings/settings'
import BaseScene from './baseScene'
import Buttons from '../lib/buttons/buttons'
import UserDataServer from '../network/userDataServer'
import { paymentService } from '../services/paymentService'

const headerHeight = Space.iconSize + Space.pad * 2

export default class StoreScene extends BaseScene {
  constructor() {
    super({ key: 'StoreScene' })
  }

  create(): void {
    this.createHeader()
    this.createGemPackages()
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
      .text(
        Space.windowWidth / 2,
        headerHeight / 2,
        'Gem Store',
        Style.homeTitle,
      )
      .setOrigin(0.5)

    // Display current gem balance
    const gems = UserDataServer.gems || 0
    this.add
      .text(
        Space.windowWidth - (Space.pad * 2 + Space.iconSize),
        headerHeight / 2,
        `Balance: ${gems} 💎`,
        Style.basic,
      )
      .setOrigin(1, 0.5)
  }

  private createGemPackages(): void {
    const packages = [
      { id: 'small', gems: 50, price: '$4.99', color: 0x6b8e23 },
      { id: 'medium', gems: 150, price: '$9.99', color: 0x4682b4 },
      { id: 'large', gems: 350, price: '$19.99', color: 0x9932cc },
      { id: 'huge', gems: 750, price: '$39.99', color: 0xb8860b },
    ]

    const startY = headerHeight + Space.pad * 4 // Start below header
    const packageHeight = 100
    const packageWidth = Space.windowWidth - Space.pad * 4

    packages.forEach((pkg, index) => {
      const y = startY + (packageHeight + Space.pad) * index

      // Create package container
      const rect = this.add
        .rectangle(
          Space.windowWidth / 2,
          y,
          packageWidth,
          packageHeight,
          pkg.color,
          0.9,
        )
        .setOrigin(0.5)

      // Add gem icon and amount
      this.add
        .text(
          rect.x - packageWidth / 4,
          y,
          `${pkg.gems} 💎`,
          Style.homeButtonText,
        )
        .setOrigin(0.5)

      // Add price
      this.add
        .text(rect.x + packageWidth / 4, y, pkg.price, Style.homeButtonText)
        .setOrigin(0.5)

      // Make interactive
      rect
        .setInteractive()
        .on('pointerover', () => {
          rect.setAlpha(1)
        })
        .on('pointerout', () => {
          rect.setAlpha(0.9)
        })
        .on('pointerdown', () => {
          this.initiatePayment(pkg.id)
        })
    })
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
