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
const WIDTH = 600

export default class PurchaseItemMenu extends Menu {
  private card: Card
  private cost: number

  constructor(
    scene: MenuScene,
    params: {
      card: Card
    },
  ) {
    super(scene, WIDTH) // Wider menu to accommodate the image and description

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
    this.createHeader(`Purchase 💰${COST.toLocaleString()}`)

    // Add card image on the left
    const cardImageContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.cardWidth,
      Space.cardHeight,
    )
    const cardImage = new CardImage(this.card, cardImageContainer, false, false)

    // Add the content sizer to the menu
    this.sizer.add(cardImageContainer)

    // Create bottom buttons sizer
    const buttonsSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad * 5 },
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
      muteClick: true,
    })

    buttonsSizer.add(buyContainer)

    // Add buttons to menu
    this.sizer.add(buttonsSizer)
  }
}
