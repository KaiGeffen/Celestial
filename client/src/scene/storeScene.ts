import 'phaser'
import { Style, Color, Space } from '../settings/settings'
import BaseScene from './baseScene'
import Buttons from '../lib/buttons/buttons'
import UserDataServer from '../network/userDataServer'
import { paymentService } from '../services/paymentService'

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
    // Similar to your other scenes
    // Create a header with a back button
    // ...
  }

  private createGemPackages(): void {
    const packages = [
      { id: 'small', gems: 50, price: '$4.99', color: 0x6b8e23 },
      { id: 'medium', gems: 150, price: '$9.99', color: 0x4682b4 },
      { id: 'large', gems: 350, price: '$19.99', color: 0x9932cc },
      { id: 'huge', gems: 750, price: '$39.99', color: 0xb8860b },
    ]

    const startY = 300 + Space.pad * 2
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
      // Create payment intent
      const { clientSecret, amount, gems } =
        await paymentService.purchaseGems(packageId)

      // Launch payment modal
      this.scene.pause()

      // Process payment (this would typically be in a modal or popup)
      const success = await paymentService.confirmPayment(clientSecret)

      this.scene.resume()
      loadingText.destroy()

      if (success) {
        // Show success message
        this.add
          .text(
            Space.windowWidth / 2,
            Space.windowHeight / 2,
            `Successfully purchased ${gems} gems!`,
            Style.basic,
          )
          .setOrigin(0.5)

        // The actual gem update will come through WebSocket
      } else {
        // Show error message
        this.add
          .text(
            Space.windowWidth / 2,
            Space.windowHeight / 2,
            'Payment failed. Please try again.',
            Style.basic,
          )
          .setOrigin(0.5)
      }
    } catch (error) {
      this.signalError('Payment error: ' + error)
      loadingText.destroy()
    }
  }
}
