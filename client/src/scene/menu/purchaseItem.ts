import 'phaser'
import { Style, Color, Space } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import BasicButton from '../../lib/buttons/basic'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { StoreItem } from '../../../../shared/storeItems'
import UserDataServer from '../../network/userDataServer'

export default class PurchaseItemMenu extends Menu {
  private item: StoreItem
  private balance: number
  private isOwned: boolean
  // Price text is broader store scene, set to `owned` if we buy it

  private priceText: Phaser.GameObjects.Text
  constructor(
    scene: MenuScene,
    params: {
      item: StoreItem
      balance: number
      isOwned: boolean
      priceText: Phaser.GameObjects.Text
    },
  ) {
    super(scene, 800) // Wider menu to accommodate the image and description

    // Set properties before creating content
    this.item = params.item
    this.balance = params.balance
    this.isOwned = params.isOwned
    this.priceText = params.priceText

    // Now create content with properties set
    this.createContent()
    this.layout()
  }

  private handlePurchase(): void {
    if (!UserDataServer.isLoggedIn()) {
      this.scene.signalError('You must be logged in to make purchases.')
      return
    }

    if (this.balance < this.item.cost) {
      this.scene.signalError('Insufficient gems to make this purchase.')
      return
    }

    // Purchase the item on the server (Updates local igc totals)
    UserDataServer.purchaseItem(this.item.id, this.item.cost)

    // TODO Its sizer in some cases needs layout because different text width
    this.priceText.setText('Owned')

    // Close the menu
    this.close()
  }

  private createContent(): void {
    this.createHeader(this.item.name)

    // Create main content sizer
    const contentSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad * 2 },
    })

    // Add item image on the left
    const image = this.scene.add.image(0, 0, `store-${this.item.imageKey}-full`)
    const imageContainer = new ContainerLite(
      this.scene,
      0,
      0,
      image.width,
      image.height,
    )
    imageContainer.add(image)
    contentSizer.add(imageContainer)

    // Create right side sizer for description and purchase info
    const rightSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad * 2 },
    })

    // Add description text
    const description = this.scene.add.text(0, 0, this.item.description, {
      ...Style.basic,
      wordWrap: { width: 350 },
    })
    rightSizer.add(description)

    // Add cost and balance if not owned
    if (!this.isOwned) {
      // Add cost text or "Owned" text
      const costText = this.scene.add.text(
        0,
        0,
        `Cost: ${this.item.cost} 💎`,
        Style.announcement,
      )
      rightSizer.add(costText)

      // Balance after text, in red if negative
      const balanceAfter = this.balance - this.item.cost
      const balanceText = this.scene.add.text(
        0,
        0,
        `Balance after: ${balanceAfter} 💎`,
        {
          ...Style.basic,
          color: balanceAfter < 0 ? '#ff0000' : '#ffffff',
        },
      )
      rightSizer.add(balanceText)
    }

    // Add right side sizer to main content
    contentSizer.add(rightSizer)

    // Add the content sizer to the menu
    this.sizer.add(contentSizer)

    // Create bottom buttons sizer
    const buttonsSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad * 4 },
    })

    // Add cancel button
    buttonsSizer.add(this.createCancelButton())

    // Add buy button or "Owned" button
    const buyContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )

    if (this.isOwned) {
      // Create a disabled "Owned" button
      new BasicButton(buyContainer, 0, 0, 'Owned', () => {}).disable()
    } else {
      // Create a normal buy button
      new BasicButton(buyContainer, 0, 0, 'Buy', () => {
        this.handlePurchase()
      })
    }

    buttonsSizer.add(buyContainer)

    // Add buttons to menu
    this.sizer.add(buttonsSizer)
  }
}
