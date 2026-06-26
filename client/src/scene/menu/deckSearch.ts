import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import { Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'

const width = 420

// TODO Might make sense to consolidate all menus that have search text + cancel + confirm
export default class DeckSearchMenu extends Menu {
  private searchInput: any

  constructor(
    scene: MenuScene,
    params: {
      search?: string
      callback: (search: string) => void
      exitCallback?: () => void
    },
  ) {
    super(scene, width, params)

    this.createContent(params.search ?? '', params.callback)
    this.layout()
  }

  private createContent(
    search: string,
    callback: (search: string) => void,
  ): void {
    this.createHeader('Search Decks')

    // Input row
    this.searchInput = this.scene.add.rexInputText(
      0,
      0,
      Space.inputTextWidth,
      Space.textboxHeight,
      {
        type: 'text',
        text: search,
        align: 'center',
        placeholder: 'Deck or card name',
        ...Style.inputText,
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
      [this.searchInput, chrome],
    )

    const inputRow = this.scene.rexUI.add.sizer()
    inputRow.addSpace().add(inputContainer).addSpace()

    // Buttons row
    const buttonsRow = this.scene.rexUI.add
      .sizer({ width: width - Space.pad * 2 })
      .add(this.createCancelButton())
      .addSpace()
      .add(this.createSearchButton(callback))

    this.sizer.add(inputRow).add(buttonsRow)
  }

  private createSearchButton(
    callback: (search: string) => void,
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
      text: 'Search',
      f: () => {
        callback(String(this.searchInput.text ?? '').trim())
        this.close()
      },
      returnHotkey: true,
      muteClick: true,
    })

    return container
  }
}
