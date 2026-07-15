import 'phaser'
import { Style, BBStyle, Space, Color } from '../settings/settings'
import { BaseSceneWithHeader } from './baseScene'
import Buttons from '../lib/buttons/buttons'
import Server from '../server'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { CardImage } from '../lib/cardImage'
import Catalog from '@shared/state/catalog'
import newScrollablePanel from '../lib/scrollablePanel'
import Card from '@shared/state/card'
import { UserSettings } from '../settings/userSettings'
import Button from '../lib/buttons/button'
import allPurchaseables, {
  Purchaseable,
} from '@shared/purchaseables/index'
import { getCosmeticImageKey } from '../utils/cosmetics'
import BBCodeText from 'phaser3-rex-plugins/plugins/bbcodetext'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

export default class StoreScene extends BaseSceneWithHeader {
  private scrollablePanel: ScrollablePanel
  private userStatsDisplay: BBCodeText
  private currentTab: 'cards' | 'cosmetics' = 'cards'
  private btnTab: Button

  constructor() {
    super({ key: 'StoreScene' })
  }

  create(): void {
    this.createBackground()
    super.create({ title: 'Store' })
    this.createTabButton()
    this.createUserStatsDisplay()

    // Currency and item ownership reflect account data and refresh on any change
    // (e.g. after a purchase). bindUserData fires immediately to populate them,
    // then on every subsequent change, and unsubscribes on shutdown.
    this.bindUserData((data) => {
      if (!data) return
      this.updateUserStatsDisplay()
      this.createStoreItems()
    })
  }

  private createUserStatsDisplay(): void {
    const bg = this.add
      .rectangle(
        0,
        this.headerHeight / 2,
        120,
        55,
        Color.currencyBackground,
        0.3,
      )
      .setOrigin(1, 0.5)
    this.userStatsDisplay = this.add
      .rexBBCodeText(0, this.headerHeight / 2, '', BBStyle.currency)
      .setAlign('right')
      .setOrigin(1, 0.5)
      .setPadding(Space.padSmall)

    // Anchor the user stats display to the right
    this.plugins.get('rexAnchor')['add'](this.userStatsDisplay, {
      right: `100%-${Space.padSmall * 3 + Space.iconSize * 2}`,
    })
    this.plugins.get('rexAnchor')['add'](bg, {
      right: `100%-${Space.padSmall * 2 + Space.iconSize * 2}`,
    })
    // Text is populated by bindUserData (see create).
  }

  private updateUserStatsDisplay(): void {
    const gems = Server.getUserData().gems ?? 0
    const coins = Server.getUserData().coins ?? 0

    this.userStatsDisplay.setText(
      `${coins.toLocaleString()} [img=coin]\n${gems.toLocaleString()} [img=gem]`,
    )
  }

  private createTabButton(): void {
    const x = Space.pad * 2 + Space.buttonWidth + Space.buttonWidth / 2
    const y = Space.padSmall + Space.buttonHeight / 2

    this.btnTab = new Buttons.Basic({
      within: this,
      text: this.currentTab === 'cards' ? 'Cosmetics' : 'Cards',
      x,
      y,
      f: () => {
        this.currentTab = this.currentTab === 'cards' ? 'cosmetics' : 'cards'
        this.btnTab.setText(this.currentTab === 'cards' ? 'Cosmetics' : 'Cards')
        this.createStoreItems()
      },
    })
  }

  private createBackground(): void {
    const background = this.add.image(0, 0, 'chrome-bodyAlt').setOrigin(0)

    this.plugins.get('rexAnchor')['add'](background, {
      width: `100%`,
      height: `100%`,
    })
  }

  private createStoreItems() {
    // Remove existing scrollable panel if it exists
    if (this.scrollablePanel) {
      this.scrollablePanel.destroy()
    }

    // Create a sizer for the purchaseable items
    const sizer = this.rexUI.add.fixWidthSizer({
      space: {
        item: Space.pad,
        line: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
      anchor: {
        width: '100%',
      },
    })

    if (this.currentTab === 'cosmetics') {
      const ownedItems = new Set(Server.getUserData().ownedItems ?? [])
      const unowned = allPurchaseables
        .filter((item) => !ownedItems.has(item.id))
        // Show all cardbacks first, then borders (stable within each type)
        .sort(
          (a, b) =>
            Number(b.type === 'cardback') - Number(a.type === 'cardback'),
        )

      if (unowned.length === 0) {
        sizer.add(this.createEmptyMessage('All Cosmetics owned'))
      } else {
        unowned.forEach((item) => {
          sizer.add(this.createCosmeticItem(item))
        })
      }
    } else {
      const cardInventory = UserSettings._get('cardInventory') || []
      const cards = Catalog.collectibleCards.filter(
        (card) => !cardInventory[card.id],
      )

      if (cards.length === 0) {
        sizer.add(this.createEmptyMessage('All cards owned'))
      } else {
        cards.forEach((card) => {
          sizer.add(this.createCardItem(card))
        })
      }
    }

    this.scrollablePanel = newScrollablePanel(this, {
      x: 0,
      y: this.headerHeight,
      panel: {
        child: sizer,
      },
      anchor: {
        height: `100%-${this.headerHeight}`,
      },
    })
  }

  private createEmptyMessage(text: string): Phaser.GameObjects.GameObject {
    const sizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      width: Space.windowWidth,
      height: Space.windowHeight - this.headerHeight,
    })
    const messageText = this.add.text(0, 0, text, Style.header).setOrigin(0.5)
    sizer.addSpace().add(messageText).addSpace()
    return sizer
  }

  private createCosmeticItem(
    item: Purchaseable,
  ): Phaser.GameObjects.GameObject {
    const isBorder = item.type === 'border'
    const width = isBorder ? Space.avatarSize : Space.cardWidth
    const height = isBorder ? Space.avatarSize : Space.cardHeight

    const image = this.add
      .image(0, 0, getCosmeticImageKey(item))
      .setDisplaySize(width, height)
      .setInteractive()
      .on('pointerdown', () => {
        this.scene.launch('MenuScene', {
          menu: 'purchaseItem',
          purchaseable: item,
        })
      })

    const costText = this.add
      .rexBBCodeText(
        0,
        0,
        `${item.cost.toLocaleString()} [img=gem]`,
        BBStyle.currency,
      )
      .setOrigin(0.5)
      .setBackgroundColor()

    const sizer = this.rexUI.add
      .sizer({
        orientation: 'vertical',
        space: { item: Space.padSmall },
      })
      .add(image)
      .add(costText)

    return sizer
  }

  private createCardItem(card: Card): Phaser.GameObjects.GameObject {
    const cardImageContainer = new ContainerLite(
      this,
      0,
      0,
      Space.cardWidth,
      Space.cardHeight,
    )
    // Non-interactive keeps the text elements inert (their hit regions can
    // extend beyond card bounds); setOnClick makes just the subject clickable
    const cardImage = new CardImage(card, cardImageContainer, false, false)

    cardImage.setOnClick(() => {
      this.scene.launch('MenuScene', { menu: 'purchaseItem', card })
    })

    return cardImageContainer
  }
}
