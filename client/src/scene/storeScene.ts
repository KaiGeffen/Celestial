import 'phaser'
import { Style, Color, Space } from '../settings/settings'
import BaseScene, { BaseSceneWithHeader } from './baseScene'
import Buttons from '../lib/buttons/buttons'
import BasicButton from '../lib/buttons/basic'
import UserDataServer from '../network/userDataServer'
import { paymentService } from '../store/paymentService'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { STORE_ITEMS, StoreItem } from '../../../shared/storeItems'

export default class StoreScene extends BaseSceneWithHeader {
  private currentCategory: string | null = null
  private storeItemsContainer: Phaser.GameObjects.Container | null = null
  private categoryTexts: { [key: string]: Phaser.GameObjects.Text } = {}
  private categoryLine: Phaser.GameObjects.Line | null = null

  constructor() {
    super({ key: 'StoreScene' })
  }

  create(): void {
    this.createBackground()
    super.create({ title: 'Store' })
    this.createCategoriesText()
    this.createStoreItems()

    // Set Featured as the default selected category
    this.currentCategory = 'Featured'
    this.updateCategoryLine()
  }

  private createBackground(): void {
    this.add
      .image(0, 0, 'background-Match')
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
      const txt = this.add
        .text(0, 0, category, Style.basic)
        .setInteractive()
        .on('pointerover', () => {
          txt.setTint(0xcccccc)
        })
        .on('pointerout', () => {
          txt.clearTint()
        })
        .on('pointerdown', () => {
          this.sound.play('click')
          this.filterByCategory(category)
        })

      // Store the text object for later reference
      this.categoryTexts[category] = txt

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
    new Buttons.Basic({
      within: container,
      text: 'Purchase 💎',
      f: () => {
        this.sound.play('click')
        this.scene.launch('MenuScene', { menu: 'purchaseGems' })
      },
    })
    sizer.add(container)

    // Layout the sizer
    sizer.layout()

    // Create a line for the selected category (initially hidden)
    this.categoryLine = this.add
      .line(0, 0, 0, 0, 0, 0, Color.grey)
      .setLineWidth(2)
      .setOrigin(0, 0)
      .setDepth(1)
      .setVisible(false)
  }

  private filterByCategory(category: string): void {
    // If clicking the same category, do nothing (always keep a category selected)
    if (this.currentCategory === category) {
      return
    }

    // Set the new category filter
    this.currentCategory = category
    this.updateCategoryLine()
    this.updateStoreItems()
  }

  private updateCategoryLine(): void {
    if (!this.categoryLine) return

    // Hide the line if no category is selected
    if (!this.currentCategory || !this.categoryTexts[this.currentCategory]) {
      this.categoryLine.setVisible(false)
      return
    }

    // Get the selected category text
    const selectedText = this.categoryTexts[this.currentCategory]

    // Position the line below the text
    const textBounds = selectedText.getBounds()
    const lineY = textBounds.bottom + 2 // 2 pixels below the text

    // Update the line position and make it visible
    this.categoryLine
      .setTo(textBounds.left, lineY, textBounds.right, lineY)
      .setVisible(true)
  }

  private updateStoreItems(): void {
    // Remove existing store items container if it exists
    if (this.storeItemsContainer) {
      this.storeItemsContainer.destroy()
    }

    // Create a new container for store items
    this.storeItemsContainer = this.add.container(0, 0)

    // Create a sizer for the filtered items
    const sizer = this.rexUI.add
      .fixWidthSizer({
        y: this.headerHeight + Space.buttonHeight + Space.pad * 2,
        width: Space.windowWidth,
        space: { item: Space.pad, left: Space.pad, right: Space.pad },
      })
      .setOrigin(0, 0)

    // Convert plural category to singular form for filtering
    const categoryForFilter = this.currentCategory
      ? this.currentCategory === 'Featured'
        ? ('Featured' as const)
        : (this.currentCategory.slice(0, -1) as
            | 'Avatar'
            | 'Border'
            | 'Pet'
            | 'Card'
            | 'Cardback')
      : null

    // Filter items by category if a category is selected
    const filteredItems = categoryForFilter
      ? Object.values(STORE_ITEMS).filter((item) =>
          item.categories.includes(categoryForFilter),
        )
      : Object.values(STORE_ITEMS)

    // Create store items from filtered configuration
    filteredItems.forEach((item) => {
      sizer.add(this.createStoreItem(item))
    })

    sizer.layout()
    this.storeItemsContainer.add(sizer)
  }

  private createStoreItems() {
    // Create a container for store items
    this.storeItemsContainer = this.add.container(0, 0)

    // Create a sizer for the items
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
    this.storeItemsContainer.add(sizer)
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

    // Check if the item is owned
    const userData = UserDataServer.getUserData()
    const isOwned =
      userData && userData.ownedItems && userData.ownedItems.includes(item.id)

    // Add price or "Owned" text
    const priceText = isOwned
      ? this.add.text(0, 0, 'Owned', Style.basic)
      : this.add.text(0, 0, `${item.cost} 💎`, Style.basic)

    container.add(priceText, {
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
        const balance = UserDataServer.getUserData().gems

        // Launch the purchase menu
        this.scene.launch('MenuScene', {
          menu: 'purchaseItem',
          item,
          balance,
          isOwned,
          priceText,
        })
      })

    return container
  }
}
