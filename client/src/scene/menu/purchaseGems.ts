import 'phaser'
import { Style, Color, Space } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import { paymentService } from '../../store/paymentService'
import BasicButton from '../../lib/buttons/basic'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import {
  GEM_PACKAGES,
  formatPrice,
  GemPackage,
} from '../../../../shared/config/gemPackages'

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
    Object.values(GEM_PACKAGES).forEach((pkg: GemPackage) => {
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
        `${pkg.gems} 💎  ${formatPrice(pkg.amount)}`,
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
