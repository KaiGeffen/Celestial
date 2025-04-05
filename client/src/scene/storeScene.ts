import 'phaser'
import { Style, Color, Space } from '../settings/settings'
import BaseScene, { BaseSceneWithHeader } from './baseScene'
import Buttons from '../lib/buttons/buttons'
import BasicButton from '../lib/buttons/basic'
import UserDataServer from '../network/userDataServer'
import { paymentService } from '../services/paymentService'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

export default class StoreScene extends BaseSceneWithHeader {
  constructor() {
    super({ key: 'StoreScene' })
  }

  create(): void {
    this.createBackground()

    super.create({ title: 'Store' })

    this.createCategoriesText()
    this.createStoreItems()
  }

  private createBackground(): void {
    this.add
      .image(0, 0, 'bg-Match')
      .setOrigin(0)
      .setSize(Space.windowWidth, Space.windowHeight)
  }

  private createCategoriesText(): void {
    const categories = [
      'Featured',
      'Avatars',
      'Borders',
      'Pets',
      'Cards',
      'Cardbacks',
    ]

    // Create a sizer that takes up the available horizontal space
    const sizer = this.rexUI.add
      .sizer({
        x: 0,
        y: this.headerHeight + Space.pad + Space.buttonHeight / 2,
        width: Space.windowWidth,
        space: {
          left: Space.pad,
          right: Space.pad,
        },
      })
      .setOrigin(0, 0.5)

    // Add each category to the sizer
    categories.forEach((category) => {
      const txt = this.add.text(0, 0, category, Style.basic)
      sizer.add(txt).addSpace()
    })

    // Add the purchase gems button
    const container = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic(container, 0, 0, 'Purchase 💎', () =>
      // TODO Open menu to select package
      this.initiatePayment('gems'),
    )
    sizer.add(container)

    // Layout the sizer
    sizer.layout()
  }

  private createStoreItems() {
    const sizer = this.rexUI.add
      .fixWidthSizer({
        y: this.headerHeight + Space.buttonHeight + Space.pad * 2,
        width: Space.windowWidth,
        space: { item: Space.pad },
      })
      .setPosition(Space.windowWidth / 2, Space.windowHeight / 2)
      .setOrigin(0.5, 0.5)

    const items = [
      createStoreItem(this, 'Thorn Border', 100, 'ThornBorder'),
      createStoreItem(this, 'Dandelion Relic', 100, 'DandelionRelic'),
      createStoreItem(this, 'Butterfly', 100, 'Butterfly'),
      createStoreItem(this, 'Imani', 100, 'Imani'),
      createStoreItem(this, 'Jade Cardback', 100, 'JadeCardback'),
      createStoreItem(this, 'Jules', 100, 'Jules'),
    ]

    items.forEach((item) => {
      console.log(item)
      sizer.add(item)
    })

    sizer.layout()
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

// A single item to purchase
function createStoreItem(
  scene: BaseScene,
  name: string,
  price: number,
  image: string,
) {
  return scene.rexUI.add
    .sizer({
      orientation: 'vertical',
      space: { item: Space.pad },
    })
    .add(scene.add.image(0, 0, `store-${image}`), { align: 'center' })
    .add(scene.add.text(0, 0, name, Style.basic).setOrigin(0.5), {
      align: 'center',
    })
    .add(scene.add.text(0, 0, `${price} 💎`, Style.basic).setOrigin(0.5), {
      align: 'center',
    })
    .layout()
}
