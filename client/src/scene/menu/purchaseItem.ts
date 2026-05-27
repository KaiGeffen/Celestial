import 'phaser'
import { Style, Color, Space } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Buttons from '../../lib/buttons/buttons'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Server from '../../server'
import { CardImage } from '../../lib/cardImage'
import Card from '../../../../shared/state/card'
import { Purchaseable } from '../../../../shared/purchaseables/index'
import { getCosmeticImageKey } from '../../utils/cosmetics'

const CARD_COST = 1000
const WIDTH = 600

export default class PurchaseItemMenu extends Menu {
  private card: Card | null
  private purchaseable: Purchaseable | null

  constructor(
    scene: MenuScene,
    params: {
      card?: Card
      purchaseable?: Purchaseable
    },
  ) {
    super(scene, WIDTH)

    // Set properties before creating content
    this.card = params.card ?? null
    this.purchaseable = params.purchaseable ?? null

    // Now create content with properties set
    this.createContent()
    this.layout()
  }

  private get cost(): number {
    return this.purchaseable ? this.purchaseable.cost : CARD_COST
  }

  private handlePurchase(): void {
    if (this.purchaseable) {
      const gems = Server.getUserData().gems ?? 0
      if (gems < this.cost) {
        this.scene.signalError('Not enough gems.')
        return
      }
      Server.purchaseItem(this.purchaseable.id)
    } else if (this.card) {
      const coins = Server.getUserData().coins ?? 0
      if (coins < this.cost) {
        this.scene.signalError('Not enough coins.')
        return
      }
      Server.purchaseItem(this.card.id)
    }

    this.close()
  }

  private get currencyIcon(): string {
    return this.purchaseable ? '[img=gem]' : '[img=coin]'
  }

  private createContent(): void {
    this.createHeader(
      `Purchase ${this.currencyIcon}${this.cost.toLocaleString()}`,
    )

    if (this.card) {
      const cardImageContainer = new ContainerLite(
        this.scene,
        0,
        0,
        Space.cardWidth,
        Space.cardHeight,
      )
      new CardImage(this.card, cardImageContainer, false, false)

      // Add the content sizer to the menu
      this.sizer.add(cardImageContainer)
    } else if (this.purchaseable) {
      // Add cosmetic image above the buttons
      const isBorder = this.purchaseable.type === 'border'
      const width = isBorder ? Space.avatarSize : Space.cardWidth
      const height = isBorder ? Space.avatarSize : Space.cardHeight

      const image = this.scene.add
        .image(0, 0, getCosmeticImageKey(this.purchaseable))
        .setDisplaySize(width, height)
      this.sizer.add(image).addNewLine()
    }

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
