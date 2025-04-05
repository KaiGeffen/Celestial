import 'phaser'
import { Style, Color, Space } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import { paymentService } from '../../services/paymentService'
import BasicButton from '../../lib/buttons/basic'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

interface GemPackage {
  gems: number
  price: number
  id: string
}

const packages: GemPackage[] = [
  { gems: 50, price: 4.99, id: 'gems-50' },
  { gems: 150, price: 9.99, id: 'gems-150' },
  { gems: 350, price: 19.99, id: 'gems-350' },
  { gems: 750, price: 39.99, id: 'gems-750' },
]

export default class PurchaseGemsMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene)
    this.createContent()
    this.layout()
  }

  private createContent(): void {
    this.createHeader('Purchase Gems')

    // Create a sizer for the gem packages
    const sizer = this.scene.rexUI.add.sizer({
      width: this.width,
      orientation: 'vertical',
      space: { item: Space.pad },
    })

    // Add each package option as a BasicButton
    packages.forEach((pkg) => {
      const container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )

      new BasicButton(
        container,
        0,
        0,
        `${pkg.gems} 💎  $${pkg.price}`,
        async () => {
          await this.purchaseGems(pkg.id)
        },
      )

      sizer.add(container)
    })

    // Add cancel button at the bottom with some spacing
    sizer.add(this.createCancelButton())

    this.sizer.add(sizer)
  }

  private async purchaseGems(packageId: string): Promise<void> {
    // Show loading state
    const loadingText = this.scene.add
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
      this.close()
    } catch (error) {
      this.scene.signalError('Payment error: ' + error)
      loadingText.destroy()
    }
  }
}
