import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'

// TODO Update to use the new header method

const width = 400

export default class SearchMenu extends Menu {
  // The textbox
  textboxSearch

  constructor(scene: MenuScene, params) {
    super(scene, width)

    this.createHeader('Search')

    let callback = params.callback
    let start = params.start
    this.createContent(callback, start)

    this.layout()
  }

  private createContent(callback: (string) => void, start: string) {
    this.sizer.add(this.createSearch(start)).addNewLine()

    this.sizer.add(this.createButtons(callback))
  }

  private createSearch(start: string) {
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.textboxWidth,
      Space.textboxHeight,
    )

    this.textboxSearch = this.scene.add['rexInputText'](
      0,
      0,
      Space.textboxWidth,
      Space.textboxHeight,
      {
        type: 'text',
        text: start,
        align: 'center',
        placeholder: 'Search',
        tooltip: 'Search for cards by text.',
        fontFamily: 'Mulish',
        fontSize: '24px',
        color: Color.textboxText,
        maxLength: 40,
        selectAll: true,
        id: 'search-field',
      },
    ).removeInteractive()

    // Reskin for text input
    let icon = this.scene.add.image(
      this.textboxSearch.x,
      this.textboxSearch.y,
      'icon-InputText',
    )

    container.add([this.textboxSearch, icon])

    return container
  }

  // Create the buttons at the bottom
  private createButtons(callback: (string) => void) {
    let sizer = this.scene.rexUI.add.sizer({
      width: width,
      space: {
        left: Space.pad,
        right: Space.pad,
      },
    })

    sizer
      .add(this.createCancelButton())
      .addSpace()
      .add(
        this.createOkay(() => {
          callback(this.textboxSearch.text)
        }),
      )

    return sizer
  }

  private createOkay(callback: () => void): ContainerLite {
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )

    new Buttons.Basic({
      within: container,
      text: 'Okay',
      f: () => {
        callback()
        this.close()
      },
    })

    return container
  }
}
