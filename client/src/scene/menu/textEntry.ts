import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import { Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import { MechanicsSettings } from '../../../../shared/settings'

const width = 420

// Generous cap that fits the longest expected input (a full deck code, doubled
// to allow for 30-card overfull decks).
const MAX_LENGTH = MechanicsSettings.DECK_SIZE * 4 * 2

export interface TextEntryParams {
  // Header text
  title: string
  // Label on the confirm button (e.g. 'Search', 'Import')
  confirmLabel: string
  // Pre-filled / current value of the field
  text?: string
  placeholder?: string
  // Callback for when main button is used. Returns a string if there was an error.
  callback: (text: string) => string
  exitCallback?: () => void
}

// Generic single-field prompt: header, one text input, Cancel + a confirm button.
export default class TextEntryMenu extends Menu {
  private input: any

  constructor(scene: MenuScene, params: TextEntryParams) {
    super(scene, width, params)

    this.createContent(params)
    this.layout()
  }

  private createContent(params: TextEntryParams): void {
    this.createHeader(params.title)

    // Input row
    this.input = this.scene.add.rexInputText(
      0,
      0,
      Space.inputTextWidth,
      Space.textboxHeight,
      {
        type: 'text',
        text: params.text ?? '',
        align: 'center',
        placeholder: params.placeholder ?? '',
        ...Style.inputText,
        maxLength: MAX_LENGTH,
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

    // Buttons row
    const buttonsRow = this.scene.rexUI.add
      .sizer({ width: width - Space.pad * 2 })
      .add(this.createCancelButton())
      .addSpace()
      .add(this.createConfirmButton(params))

    this.sizer.add(inputRow).add(buttonsRow)
  }

  private createConfirmButton(params: TextEntryParams): ContainerLite {
    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: container,
      text: params.confirmLabel,
      f: () => {
        const value = String(this.input.text ?? '').trim()
        const error = params.callback(value)
        // Non-empty error: leave the menu open and show it here, on the menu
        // scene, rather than on the scene behind it.
        if (error) {
          this.scene.signalError(error)
          return
        }
        this.close()
      },
      returnHotkey: true,
      muteClick: true,
    })

    return container
  }
}
