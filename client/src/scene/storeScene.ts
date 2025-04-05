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
    new Buttons.Basic(container, 0, 0, 'Purchase 💎', () => {
      this.sound.play('click')
      this.scene.launch('MenuScene', { menu: 'purchaseGems' })
    })
    sizer.add(container)

    // Layout the sizer
    sizer.layout()
  }

  private createStoreItems() {
    const sizer = this.rexUI.add
      .fixWidthSizer({
        y: this.headerHeight + Space.buttonHeight + Space.pad * 2,
        width: Space.windowWidth,
        space: { item: Space.pad, left: Space.pad, right: Space.pad },
      })
      .setOrigin(0, 0)

    const items = [
      createStoreItem(this, 'Thorn Border', 100, 'ThornBorder'),
      createStoreItem(this, 'Dandelion Relic', 500, 'DandelionRelic'),
      createStoreItem(this, 'Butterfly', 40, 'Butterfly'),
      createStoreItem(this, 'Imani', 2000, 'Imani'),
      createStoreItem(this, 'Jade Cardback', 300, 'JadeCardback'),
      createStoreItem(this, 'Jules', 0, 'Jules'),
    ]

    items.forEach((item) => {
      sizer.add(item)
    })

    sizer.layout()
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
    .add(scene.add.text(0, 0, name, Style.basic), {
      align: 'center',
    })
    .add(scene.add.text(0, 0, `${price} 💎`, Style.basic), {
      align: 'center',
    })
}
