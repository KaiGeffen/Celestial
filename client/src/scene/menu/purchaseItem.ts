import 'phaser'
import { Style, Color, Space } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Buttons from '../../lib/buttons/buttons'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Server from '../../server'
import { CardImage } from '../../lib/cardImage'
import Card from '../../../../shared/state/card'

const COST = 1000

export default class PurchaseItemMenu extends Menu {
  private card: Card
  private cost: number
  private isOwned: boolean
  // Price text is broader store scene, set to `owned` if we buy it
  private priceText: Phaser.GameObjects.Text

  constructor(
    scene: MenuScene,
    params: {
      card: Card
    },
  ) {
    super(scene, 800) // Wider menu to accommodate the image and description

    // Set properties before creating content
    this.card = params.card

    // Now create content with properties set
    this.createContent()
    this.layout()
  }

  private handlePurchase(): void {
    const balance = Server.getUserData().coins

    if (balance < COST) {
      this.scene.signalError('Insufficient coins to make this purchase.')
      return
    }

    // Send purchase request to server - it will update user data via sendUserData response
    Server.purchaseItem(this.card.id)

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

    // Add cost text
    const costText = this.scene.add.text(
      0,
      0,
      `Cost: ${COST} 💰`,
      Style.announcement,
    )
    rightSizer.add(costText)

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

    // Add buy button
    const buyContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )

    new Buttons.Basic({
      within: buyContainer,
      text: 'Buy',
      f: () => {
        this.handlePurchase()
      },
    })

    buttonsSizer.add(buyContainer)

    // Add buttons to menu
    this.sizer.add(buttonsSizer)
  }
}
