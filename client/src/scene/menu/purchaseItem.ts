import 'phaser'
import { Style, Color, Space } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Buttons from '../../lib/buttons/buttons'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Server from '../../server'
import { CardImage } from '../../lib/cardImage'
import Card from '../../../../shared/state/card'
import { UserSettings } from '../../settings/userSettings'

export default class PurchaseItemMenu extends Menu {
  private card: Card
  private cost: number
  private balance: number
  private isOwned: boolean
  // Price text is broader store scene, set to `owned` if we buy it
  private priceText: Phaser.GameObjects.Text

  constructor(
    scene: MenuScene,
    params: {
      card: Card
      cost: number
      balance: number
      isOwned: boolean
      priceText: Phaser.GameObjects.Text
    },
  ) {
    super(scene, 800) // Wider menu to accommodate the image and description

    // Set properties before creating content
    this.card = params.card
    this.cost = params.cost
    this.balance = params.balance
    this.isOwned = params.isOwned
    this.priceText = params.priceText

    // Now create content with properties set
    this.createContent()
    this.layout()
  }

  private handlePurchase(): void {
    if (this.balance < this.cost) {
      this.scene.signalError('Insufficient coins to make this purchase.')
      return
    }

    // Update coins locally
    Server.getUserData().coins -= this.cost

    // Update inventory to mark card as owned
    const inventory = UserSettings._get('inventory')
    inventory[this.card.id] = true
    UserSettings._set('inventory', inventory)
    Server.sendInventory(inventory)

    // Update price text
    this.priceText.setText('Owned')

    // Close the menu
    this.close()
  }

  private createContent(): void {
    this.createHeader(this.card.name)

    // Create main content sizer
    const contentSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad * 2 },
    })

    // Add card image on the left
    const cardImageContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.cardWidth,
      Space.cardHeight,
    )
    const cardImage = new CardImage(this.card, cardImageContainer, false, false)
    contentSizer.add(cardImageContainer)

    // Create right side sizer for purchase info
    const rightSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad * 2 },
    })

    // Add cost and balance if not owned
    if (!this.isOwned) {
      // Add cost text
      const costText = this.scene.add.text(
        0,
        0,
        `Cost: ${this.cost} 💰`,
        Style.announcement,
      )
      rightSizer.add(costText)

      // Balance after text, in red if negative
      const balanceAfter = this.balance - this.cost
      const balanceText = this.scene.add.text(
        0,
        0,
        `Balance after: ${balanceAfter} 💰`,
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
      new Buttons.Basic({
        within: buyContainer,
        text: 'Owned',
      }).disable()
    } else {
      // Create a normal buy button
      new Buttons.Basic({
        within: buyContainer,
        text: 'Buy',
        f: () => {
          this.handlePurchase()
        },
      })
    }

    buttonsSizer.add(buyContainer)

    // Add buttons to menu
    this.sizer.add(buttonsSizer)
  }
}
