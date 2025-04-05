import 'phaser'
import { Style, Color, Space } from '../settings/settings'
import BaseScene, { BaseSceneWithHeader } from './baseScene'
import Buttons from '../lib/buttons/buttons'
import BasicButton from '../lib/buttons/basic'
import UserDataServer from '../network/userDataServer'
import { paymentService } from '../store/paymentService'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { STORE_ITEMS, StoreItem } from '../store/items'

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
    ] as const

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

    // Create store items from configuration
    Object.values(STORE_ITEMS).forEach((item) => {
      sizer.add(this.createStoreItem(item))
    })

    sizer.layout()
  }

  private createStoreItem(item: StoreItem): Phaser.GameObjects.GameObject {
    const container = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad },
    })

    // Add image
    const itemImage = this.add.image(0, 0, `store-${item.imageKey}`)
    container.add(itemImage, { align: 'center' })

    // Add name
    container.add(this.add.text(0, 0, item.name, Style.basic), {
      align: 'center',
    })

    // Add price
    container.add(this.add.text(0, 0, `${item.cost} 💎`, Style.basic), {
      align: 'center',
    })

    // Make the container interactive
    container
      .setInteractive()
      .on('pointerover', () => {
        itemImage.setTint(0xcccccc)
      })
      .on('pointerout', () => {
        itemImage.clearTint()
      })
      .on('pointerdown', () => {
        this.sound.play('click')

        // Get user's current balance
        const balance = this.registry.get('gems') || 0

        // Launch the purchase menu
        this.scene.launch('MenuScene', {
          menu: 'purchaseItem',
          item,
          balance,
        })
      })

    return container
  }
}
