import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import { Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Server from '../../server'
import Button from '../../lib/buttons/button'
import Catalog from '@shared/state/catalog'
import messagesToClient from '@shared/network/messagesToClient'

const width = 420

export default class RedeemCodeMenu extends Menu {
  private input: any
  private btnRedeem: Button

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

    const buttonsRow = this.scene.rexUI.add
      .sizer({ width: width - Space.pad * 2 })
      .add(this.createCancelButton())
      .addSpace()
      .add(this.createRedeemButton())

    this.sizer.add(inputRow).add(buttonsRow)

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
          this.scene.signalError('Enter a code.')
          return
        }
        this.btnRedeem.disable()
        Server.redeemCode(code)
      },
      returnHotkey: true,
      muteClick: true,
    })

    return container
  }

  private onResult(data: messagesToClient['redeemCodeResult']): void {
    this.btnRedeem.enable()

    if (!data.success) {
      this.scene.signalError(data.error || 'Invalid code.')
      return
    }

    const parts: string[] = []
    if (data.amountCoins) {
      parts.push(`+${data.amountCoins.toLocaleString()} coins`)
    }
    if (data.amountGems) {
      parts.push(`+${data.amountGems.toLocaleString()} gems`)
    }
    if (data.itemId !== undefined) {
      const card = Catalog.getCardById(data.itemId)
      parts.push(card ? `Unlocked: ${card.name}` : 'Unlocked new item')
    }
    this.scene.showMessage(parts.join('\n') || 'Code redeemed!')
    this.input.text = ''
  }

  close(): void {
    this.scene.game.events.off('redeemCodeResult', this.onResult, this)
    super.close()
  }
}
