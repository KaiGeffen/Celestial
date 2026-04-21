import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import Buttons from '../../lib/buttons/buttons'
import { Color, Space } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'

const width = 420
const inputTextWidth = 320

/** Simple dialog: one text field to rename a deck. */
export default class EditDeckNameMenu extends Menu {
  private readonly initialName: string
  private nameInput: any

  constructor(
    scene: MenuScene,
    params: {
      deckName: string
      callback: (name: string) => void
      exitCallback?: () => void
    },
  ) {
    super(scene, width, params)
    this.initialName = params.deckName ?? ''
    this.createContent(params.callback)
    this.layout()
    this.nameInput.setFocus()
  }

  private createContent(callback: (name: string) => void): void {
    this.createHeader('Deck name')

    const row = this.scene.rexUI.add.sizer({
      width: width - Space.pad * 2,
    })

    this.nameInput = this.scene.add
      .rexInputText(0, 0, inputTextWidth, Space.textboxHeight, {
        type: 'text',
        text: this.initialName,
        align: 'center',
        placeholder: 'Deck name',
        tooltip: 'Name shown for this deck.',
        fontFamily: 'Mulish',
        fontSize: '24px',
        color: Color.textboxText,
        maxLength: 40,
        id: 'edit-deck-name',
      })

    const chrome = this.scene.add.image(0, 0, 'icon-InputText')
    const inputContainer = new ContainerLite(
      this.scene,
      0,
      0,
      inputTextWidth,
      Space.textboxHeight,
      [this.nameInput, chrome],
    )

    row.addSpace().add(inputContainer).addSpace()
    this.sizer.add(row).addNewLine()

    const buttons = this.scene.rexUI.add.sizer({
      width: width - Space.pad * 2,
    })
    buttons
      .add(this.createCancelButton())
      .addSpace()
      .add(this.createSaveButton(callback))
    this.sizer.add(buttons)
  }

  private createSaveButton(callback: (name: string) => void): ContainerLite {
    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: container,
      text: 'Save',
      f: () => {
        const raw = String(this.nameInput.text ?? '').trim()
        const name = raw.length > 0 ? raw : this.initialName
        callback(name)
        this.close()
      },
      muteClick: true,
      returnHotkey: true,
    })
    return container
  }
}
