import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import { Space, Style, BBStyle } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Server from '../../server'
import Button from '../../lib/buttons/button'
import Catalog from '@shared/state/catalog'
import allPurchaseables from '@shared/purchaseables/index'
import { CardImage } from '../../lib/cardImage'
import { getCosmeticImageKey } from '../../utils/cosmetics'
import messagesToClient from '@shared/network/messagesToClient'

const width = 420

export default class RedeemCodeMenu extends Menu {
  private input: any
  private btnRedeem: Button
  // Vertical area below the textbox: an item image (only when a redemption
  // grants one) above the status text. Cleared and rebuilt on each attempt.
  private rewardSizer: any
  private currentCardImage: CardImage | null = null

  constructor(scene: MenuScene, params: { exitCallback?: () => void }) {
    super(scene, width, params)

    this.createContent()
    this.layout()
  }

  private createContent(): void {
    this.createHeader('Redeem Code')

    this.input = this.scene.add.rexInputText(
      0,
      0,
      Space.inputTextWidth,
      Space.textboxHeight,
      {
        type: 'text',
        text: '',
        align: 'center',
        placeholder: 'Code',
        ...Style.inputText,
        maxLength: 32,
        selectAll: true,
      },
    )

    const chrome = this.scene.add.image(0, 0, 'icon-InputText')
    const inputContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.inputTextWidth,
      Space.textboxHeight,
      [this.input, chrome],
    )

    const inputRow = this.scene.rexUI.add.sizer()
    inputRow.addSpace().add(inputContainer).addSpace()

    this.rewardSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      width: width - Space.pad * 2,
      space: { item: Space.padSmall },
    })

    const buttonsRow = this.scene.rexUI.add
      .sizer({ width: width - Space.pad * 2 })
      .add(this.createCancelButton())
      .addSpace()
      .add(this.createRedeemButton())

    this.sizer
      .add(inputRow)
      .addNewLine()
      .add(this.rewardSizer)
      .addNewLine()
      .add(buttonsRow)

    this.renderReward('Insert code above')

    this.scene.game.events.on('redeemCodeResult', this.onResult, this)
  }

  private createRedeemButton(): ContainerLite {
    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )

    this.btnRedeem = new Buttons.Basic({
      within: container,
      text: 'Redeem',
      f: () => {
        const code = String(this.input.text ?? '').trim()
        if (!code) {
          this.renderReward('Enter a code.')
          return
        }
        this.renderReward(' ')
        this.btnRedeem.disable()
        Server.redeemCode(code)
      },
      returnHotkey: true,
      muteClick: true,
    })

    return container
  }

  // Rebuilds the reward area: the item's image (only if itemId is given)
  // centered horizontally above the status text
  private renderReward(text: string, itemId?: number): void {
    this.currentCardImage?.destroy()
    this.currentCardImage = null
    this.rewardSizer.clear(true)

    if (itemId !== undefined) {
      const imageContainer = new ContainerLite(
        this.scene,
        0,
        0,
        Space.cardWidth,
        Space.cardHeight,
      )

      const card = Catalog.getCardById(itemId)
      if (card) {
        this.currentCardImage = new CardImage(card, imageContainer, true, false)
      } else {
        const cosmeticItem = allPurchaseables.find((p) => p.id === itemId)
        if (cosmeticItem) {
          const image = this.scene.add
            .image(
              Space.cardWidth / 2,
              Space.cardHeight / 2,
              getCosmeticImageKey(cosmeticItem),
            )
            .setDisplaySize(Space.cardWidth, Space.cardHeight)
          imageContainer.add(image)
        }
      }

      this.rewardSizer.add(imageContainer, { align: 'center' })
    }

    const txtStatus = this.scene.add
      .rexBBCodeText(0, 0, text, {
        ...BBStyle.basicStylized,
        wordWrap: { width: width - Space.pad * 2 },
        align: 'center',
      })
      .setOrigin(0.5)
    this.rewardSizer.add(txtStatus, { align: 'center' })

    this.layout()
  }

  private onResult(data: messagesToClient['redeemCodeResult']): void {
    this.btnRedeem.enable()

    if (!data.success) {
      this.renderReward(data.error || 'Invalid code.')
      return
    }

    const currencyParts: string[] = []
    if (data.amountCoins) {
      currencyParts.push(`+${data.amountCoins.toLocaleString()}[img=coin]`)
    }
    if (data.amountGems) {
      currencyParts.push(`+${data.amountGems.toLocaleString()}[img=gem]`)
    }

    const lines: string[] = []
    if (currencyParts.length > 0) lines.push(currencyParts.join(' '))
    if (data.itemId !== undefined) {
      const card = Catalog.getCardById(data.itemId)
      lines.push(card ? `Unlocked: ${card.name}` : 'Unlocked new item')
    }
    this.renderReward(lines.join('\n') || 'Code redeemed!', data.itemId)
    this.input.text = ''
  }

  close(): void {
    this.scene.game.events.off('redeemCodeResult', this.onResult, this)
    super.close()
  }
}
