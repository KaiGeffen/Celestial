import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import { Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import { decodeShareableDeckCode } from '../../../../shared/codec'
import { MechanicsSettings } from '../../../../shared/settings'

const width = 420

export default class ShareDeckCodeMenu extends Menu {
  private codeInput: any

  constructor(
    scene: MenuScene,
    params: {
      deckCode: string
      callback: (decoded: number[]) => void
      exitCallback?: () => void
    },
  ) {
    super(scene, width, params)

    this.createContent(params.deckCode, params.callback)
    this.layout()
  }

  private createContent(
    deckCode: string,
    callback: (decoded: number[]) => void,
  ): void {
    this.createHeader('Deck Code')

    // Input row
    this.codeInput = this.scene.add.rexInputText(
      0,
      0,
      Space.inputTextWidth,
      Space.textboxHeight,
      {
        type: 'text',
        text: deckCode,
        align: 'center',
        placeholder: 'Deck code',
        ...Style.inputText,
        maxLength: MechanicsSettings.DECK_SIZE * 4,
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
      [this.codeInput, chrome],
    )

    const inputRow = this.scene.rexUI.add.sizer()
    inputRow.addSpace().add(inputContainer).addSpace()

    // Buttons row
    const buttonsRow = this.scene.rexUI.add
      .sizer({ width: width - Space.pad * 2 })
      .add(this.createCancelButton())
      .addSpace()
      .add(this.createImportButton(callback))

    this.sizer.add(inputRow).add(buttonsRow)
  }

  private createImportButton(
    callback: (decoded: number[]) => void,
  ): ContainerLite {
    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: container,
      text: 'Import',
      f: () => {
        const decoded = decodeShareableDeckCode(
          String(this.codeInput.text ?? '').trim(),
        )
        if (!decoded || decoded.length === 0) {
          this.scene.signalError('Invalid deck code.')
          return
        }
        callback(decoded)
        this.close()
      },
      returnHotkey: true,
      muteClick: true,
    })

    return container
  }
}
